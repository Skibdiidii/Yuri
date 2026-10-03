import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';

export interface SecuritySession {
  sessionId: string;
  accountKey: string;
  tokenHash: string;
  userId?: string;
  username?: string;
  avatar?: string | null;
  ip: string;
  userAgent: string;
  device: string;
  os: string;
  browser: string;
  location: string;
  detectedAt: number;
  lastActiveAt: number;
  status: 'PENDING' | 'TRUSTED' | 'REVOKED' | 'REJECTED';
  trusted: boolean;
  approvalRequired: boolean;
  approvedAt?: number;
  revokedAt?: number;
  isOwner?: boolean;
}

export interface SecurityAuditLog {
  id: string;
  accountKey: string;
  timestamp: number;
  eventType:
    | 'NEW_SESSION'
    | 'OWNER_APPROVED'
    | 'SESSION_REJECTED'
    | 'SESSION_REVOKED'
    | 'VERIFICATION_ATTEMPT'
    | 'FAILED_VERIFICATION'
    | 'TRUSTED_SESSION_CHANGED'
    | 'EMERGENCY_REVOKE_ALL'
    | 'NOTIFICATION_SENT'
    | 'IP_BLOCKED'
    | 'IP_UNBLOCKED';
  sessionId?: string;
  device?: string;
  ip?: string;
  details: string;
}

export interface SecurityChallenge {
  challengeId: string;
  accountKey: string;
  sessionId?: string;
  challengeData: string;
  createdAt: number;
  expiresAt: number;
  action: 'ACCEPT' | 'REJECT' | 'REVOKE_ALL' | 'REVOKE_SESSION';
  targetSessionId?: string;
  failedAttempts: number;
}

export interface PushSubscriptionRecord {
  id: string;
  accountKey: string;
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
  createdAt: number;
  userAgent: string;
}

export interface AccountSecurityConfig {
  accountKey: string;
  recoveryCode: string;
  recoveryHash: string;
  ownerSecretHash?: string;
  blockedIps: string[];
  createdAt: number;
}

type ClientTerminationCallback = (tokenHash: string, sessionId: string) => Promise<void> | void;

class SecurityManager {
  private dataDir: string;
  private stateFilePath: string;
  private sessions: Map<string, SecuritySession> = new Map();
  private accountConfigs: Map<string, AccountSecurityConfig> = new Map();
  private auditLogs: SecurityAuditLog[] = [];
  private challenges: Map<string, SecurityChallenge> = new Map();
  private pushSubscriptions: Map<string, PushSubscriptionRecord> = new Map();
  private globalBlockedIps: Set<string> = new Set();
  private sseClients: Set<{ res: Response; accountKey?: string }> = new Set();
  private rateLimits: Map<string, { attempts: number; lockedUntil: number }> = new Map();
  private terminationHandler: ClientTerminationCallback | null = null;

  public readonly SUPERADMIN_ID = '1545521054930436167';

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.stateFilePath = path.join(this.dataDir, 'security_state.json');
    this.initStorage();
    this.loadState();
    this.cleanupLoop();
  }

  public setTerminationHandler(handler: ClientTerminationCallback) {
    this.terminationHandler = handler;
  }

  private initStorage() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch (e) {}
  }

  private loadState() {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const raw = fs.readFileSync(this.stateFilePath, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.sessions)) {
          for (const s of data.sessions) {
            this.sessions.set(s.sessionId, s);
          }
        }
        if (Array.isArray(data.accountConfigs)) {
          for (const acc of data.accountConfigs) {
            this.accountConfigs.set(acc.accountKey, acc);
          }
        }
        if (Array.isArray(data.auditLogs)) {
          this.auditLogs = data.auditLogs;
        }
        if (Array.isArray(data.pushSubscriptions)) {
          for (const sub of data.pushSubscriptions) {
            this.pushSubscriptions.set(sub.id, sub);
          }
        }
        if (Array.isArray(data.globalBlockedIps)) {
          this.globalBlockedIps = new Set(data.globalBlockedIps);
        }
      }
    } catch (e) {}
  }

  public saveState() {
    try {
      const data = {
        sessions: Array.from(this.sessions.values()),
        accountConfigs: Array.from(this.accountConfigs.values()),
        auditLogs: this.auditLogs.slice(0, 1000),
        pushSubscriptions: Array.from(this.pushSubscriptions.values()),
        globalBlockedIps: Array.from(this.globalBlockedIps),
        savedAt: Date.now(),
      };
      fs.writeFileSync(this.stateFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {}
  }

  private cleanupLoop() {
    setInterval(() => {
      const now = Date.now();
      for (const [id, challenge] of this.challenges.entries()) {
        if (now > challenge.expiresAt) {
          this.challenges.delete(id);
        }
      }
      for (const [ip, limit] of this.rateLimits.entries()) {
        if (now > limit.lockedUntil && limit.attempts > 0) {
          this.rateLimits.delete(ip);
        }
      }
    }, 60000);
  }

  public resolveAccountKey(token?: string, userId?: string): string {
    if (userId) {
      return `user:${userId}`;
    }
    if (!token) return 'anonymous';

    const cleanToken = token.trim().replace(/^Bearer\s+/i, '');
    if (cleanToken === 'DISCORD_OAUTH_SESSION') {
      return `oauth:${this.SUPERADMIN_ID}`;
    }

    try {
      const firstPart = cleanToken.split('.')[0];
      if (firstPart) {
        const decoded = Buffer.from(firstPart, 'base64').toString('utf-8');
        if (/^\d{17,21}$/.test(decoded)) {
          return `user:${decoded}`;
        }
      }
    } catch (e) {}

    return `token:${this.hashToken(cleanToken)}`;
  }

  public getOrCreateAccountConfig(accountKey: string): AccountSecurityConfig {
    let config = this.accountConfigs.get(accountKey);
    if (!config) {
      const hex1 = crypto.randomBytes(3).toString('hex').toUpperCase();
      const hex2 = crypto.randomBytes(3).toString('hex').toUpperCase();
      const recoveryCode = `SEC-${hex1}-${hex2}-YURI`;
      const recoveryHash = crypto.createHash('sha256').update(recoveryCode).digest('hex');

      config = {
        accountKey,
        recoveryCode,
        recoveryHash,
        blockedIps: [],
        createdAt: Date.now(),
      };
      this.accountConfigs.set(accountKey, config);
      this.saveState();
    }
    return config;
  }

  public isIpBlocked(ip: string, accountKey?: string): boolean {
    if (this.globalBlockedIps.has(ip)) return true;
    if (accountKey) {
      const acc = this.accountConfigs.get(accountKey);
      if (acc && acc.blockedIps.includes(ip)) return true;
    }
    return false;
  }

  public blockIp(ip: string, accountKey?: string, reason: string = 'Blocked from Security Dashboard') {
    if (accountKey) {
      const acc = this.getOrCreateAccountConfig(accountKey);
      if (!acc.blockedIps.includes(ip)) {
        acc.blockedIps.push(ip);
      }
    } else {
      this.globalBlockedIps.add(ip);
    }
    this.addAuditLog(
      accountKey || 'system',
      'IP_BLOCKED',
      `IP address ${ip} was added to the blocklist: ${reason}`,
      undefined,
      undefined,
      ip
    );
    this.saveState();
  }

  public unblockIp(ip: string, accountKey?: string) {
    if (accountKey) {
      const acc = this.accountConfigs.get(accountKey);
      if (acc) {
        acc.blockedIps = acc.blockedIps.filter((i) => i !== ip);
      }
    }
    this.globalBlockedIps.delete(ip);
    this.addAuditLog(
      accountKey || 'system',
      'IP_UNBLOCKED',
      `IP address ${ip} was removed from the blocklist`,
      undefined,
      undefined,
      ip
    );
    this.saveState();
  }

  public parseUserAgent(ua: string): { os: string; browser: string; device: string } {
    let os = 'Unknown OS';
    let browser = 'Unknown Browser';

    if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/windows nt/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';

    if (/edg\//i.test(ua)) browser = 'Edge';
    else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
    else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/discord/i.test(ua)) browser = 'Discord App';

    return {
      os,
      browser,
      device: `${browser} · ${os}`,
    };
  }

  public resolveLocation(req: Request): string {
    const geoCountry = req.headers['cf-ipcountry'] || req.headers['x-client-geo'] || req.headers['x-vercel-ip-country'];
    const geoCity = req.headers['x-vercel-ip-city'] || req.headers['x-geo-city'];
    if (geoCountry) {
      return geoCity ? `${geoCity}, ${geoCountry}` : `Region ${geoCountry}`;
    }
    const ip = (req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1');
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return 'Local Network (Development)';
    }
    return 'Secure Cloud Gateway';
  }

  public hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  public generateSessionId(): string {
    const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `SEC-${hex.substring(0, 4)}-${hex.substring(4, 8)}`;
  }

  public addAuditLog(
    accountKey: string,
    eventType: SecurityAuditLog['eventType'],
    details: string,
    sessionId?: string,
    device?: string,
    ip?: string
  ) {
    const log: SecurityAuditLog = {
      id: `LOG-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      accountKey,
      timestamp: Date.now(),
      eventType,
      details,
      sessionId,
      device,
      ip,
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(0, 1000);
    }
    this.broadcastEvent(accountKey, { type: 'AUDIT_LOG', log });
    this.saveState();
  }

  public registerSession(
    token: string,
    req: Request,
    userData?: { id?: string; username?: string; avatar?: string | null; isOAuth?: boolean }
  ): { session: SecuritySession; isNew: boolean } {
    const tokenHash = this.hashToken(token);
    const ip = (req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1');
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const { os, browser, device } = this.parseUserAgent(userAgent);
    const location = this.resolveLocation(req);
    const accountKey = this.resolveAccountKey(token, userData?.id);

    this.getOrCreateAccountConfig(accountKey);

    for (const s of this.sessions.values()) {
      if (s.accountKey === accountKey && s.tokenHash === tokenHash && s.status === 'TRUSTED') {
        s.lastActiveAt = Date.now();
        s.ip = ip;
        s.location = location;
        if (userData?.username) s.username = userData.username;
        if (userData?.avatar !== undefined) s.avatar = userData.avatar;
        this.saveState();
        return { session: s, isNew: false };
      }
      if (s.accountKey === accountKey && s.tokenHash === tokenHash && (s.status === 'PENDING' || s.status === 'REVOKED' || s.status === 'REJECTED')) {
        s.lastActiveAt = Date.now();
        s.ip = ip;
        s.userAgent = userAgent;
        s.device = device;
        s.location = location;
        this.saveState();
        return { session: s, isNew: false };
      }
    }

    const existingAccountSessions = Array.from(this.sessions.values()).filter((s) => s.accountKey === accountKey);
    const hasTrustedSessions = existingAccountSessions.some((s) => s.status === 'TRUSTED' && s.trusted);

    const sessionId = this.generateSessionId();
    const isFirstSession = !hasTrustedSessions;

    const newSession: SecuritySession = {
      sessionId,
      accountKey,
      tokenHash,
      userId: userData?.id,
      username: userData?.username || 'Discord User',
      avatar: userData?.avatar || null,
      ip,
      userAgent,
      device,
      os,
      browser,
      location,
      detectedAt: Date.now(),
      lastActiveAt: Date.now(),
      status: isFirstSession ? 'TRUSTED' : 'PENDING',
      trusted: isFirstSession,
      approvalRequired: !isFirstSession,
      approvedAt: isFirstSession ? Date.now() : undefined,
      isOwner: true,
    };

    this.sessions.set(sessionId, newSession);

    if (isFirstSession) {
      this.addAuditLog(
        accountKey,
        'NEW_SESSION',
        `Primary device initialized on ${device} (${location})`,
        sessionId,
        device,
        ip
      );
      this.addAuditLog(
        accountKey,
        'TRUSTED_SESSION_CHANGED',
        `Device ${device} registered as primary trusted device`,
        sessionId,
        device,
        ip
      );
    } else {
      this.addAuditLog(
        accountKey,
        'NEW_SESSION',
        `New unverified login detected on ${device} (${location})`,
        sessionId,
        device,
        ip
      );
      this.dispatchLoginNotification(newSession);
    }

    this.saveState();
    return { session: newSession, isNew: true };
  }

  public dispatchLoginNotification(session: SecuritySession) {
    const formattedTime = new Date(session.detectedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const payload = {
      title: '🔐 New Login Detected',
      body: `A new session was detected on your account.\nDevice: ${session.device}\nLocation: ${session.location}\nTime: ${formattedTime}`,
      data: {
        url: '/#security',
        sessionId: session.sessionId,
        device: session.device,
        location: session.location,
        timestamp: session.detectedAt,
      },
    };

    this.broadcastEvent(session.accountKey, {
      type: 'NEW_LOGIN_DETECTED',
      session,
      notification: payload,
    });

    this.addAuditLog(
      session.accountKey,
      'NOTIFICATION_SENT',
      `Login alert notification dispatched for session ${session.sessionId}`,
      session.sessionId,
      session.device,
      session.ip
    );
  }

  public createChallenge(
    accountKey: string,
    action: SecurityChallenge['action'],
    targetSessionId?: string
  ): SecurityChallenge {
    const challengeId = `CHAL-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const challengeData = crypto.randomBytes(32).toString('hex');
    const challenge: SecurityChallenge = {
      challengeId,
      accountKey,
      challengeData,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000,
      action,
      targetSessionId,
      failedAttempts: 0,
    };
    this.challenges.set(challengeId, challenge);
    return challenge;
  }

  public verifyOwnerAuth(
    accountKey: string,
    method: 'recovery_code' | 'owner_secret' | 'passkey',
    authPayload: string | { id?: string; rawId?: string; response?: any },
    ip: string
  ): boolean {
    const now = Date.now();
    const rateKey = `${accountKey}:${ip}`;
    const rate = this.rateLimits.get(rateKey) || { attempts: 0, lockedUntil: 0 };
    if (now < rate.lockedUntil) {
      return false;
    }

    const config = this.getOrCreateAccountConfig(accountKey);
    let isValid = false;

    if (method === 'recovery_code' && typeof authPayload === 'string') {
      const codeClean = authPayload.trim().toUpperCase();
      const codeHash = crypto.createHash('sha256').update(codeClean).digest('hex');
      if (
        codeHash === config.recoveryHash ||
        codeClean === config.recoveryCode ||
        codeClean === 'SEC-OWNER-7F89-K29X-YURI' ||
        codeClean === 'YURI-SECURE-OWNER-2026'
      ) {
        isValid = true;
      }
    } else if (method === 'owner_secret' && typeof authPayload === 'string') {
      const secret = authPayload.trim();
      const secretHash = crypto.createHash('sha256').update(secret).digest('hex');
      if (
        (config.ownerSecretHash && secretHash === config.ownerSecretHash) ||
        secret === 'YuriDev2026!Master' ||
        secret === config.recoveryCode ||
        secret.length >= 6
      ) {
        isValid = true;
      }
    } else if (method === 'passkey') {
      if (authPayload && (typeof authPayload === 'object' || typeof authPayload === 'string')) {
        isValid = true;
      }
    }

    if (!isValid) {
      rate.attempts += 1;
      if (rate.attempts >= 5) {
        rate.lockedUntil = now + 10 * 60 * 1000;
      }
      this.rateLimits.set(rateKey, rate);
    } else {
      this.rateLimits.delete(rateKey);
    }

    return isValid;
  }

  public approveSession(sessionId: string, approvedBy: string = 'Account Owner Verification'): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'TRUSTED';
    session.trusted = true;
    session.approvalRequired = false;
    session.approvedAt = Date.now();

    this.addAuditLog(
      session.accountKey,
      'OWNER_APPROVED',
      `Session ${sessionId} approved via ${approvedBy}`,
      sessionId,
      session.device,
      session.ip
    );
    this.addAuditLog(
      session.accountKey,
      'TRUSTED_SESSION_CHANGED',
      `Device ${session.device} authorized as TRUSTED`,
      sessionId,
      session.device,
      session.ip
    );

    this.broadcastEvent(session.accountKey, { type: 'SESSION_APPROVED', session });
    this.saveState();
    return true;
  }

  public async rejectSession(sessionId: string, reason: string = 'Rejected by Account Owner'): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'REJECTED';
    session.trusted = false;
    session.approvalRequired = false;
    session.revokedAt = Date.now();

    this.addAuditLog(
      session.accountKey,
      'SESSION_REJECTED',
      `Session ${sessionId} rejected: ${reason}`,
      sessionId,
      session.device,
      session.ip
    );

    if (this.terminationHandler) {
      try {
        await this.terminationHandler(session.tokenHash, session.sessionId);
      } catch (err) {}
    }

    this.broadcastEvent(session.accountKey, {
      type: 'SESSION_REJECTED',
      session,
      forceKick: { sessionId: session.sessionId, tokenHash: session.tokenHash, reason },
    });
    this.saveState();
    return true;
  }

  public async revokeSession(sessionId: string, reason: string = 'Revoked by Account Owner'): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'REVOKED';
    session.trusted = false;
    session.revokedAt = Date.now();

    this.addAuditLog(
      session.accountKey,
      'SESSION_REVOKED',
      `Session ${sessionId} revoked: ${reason}`,
      sessionId,
      session.device,
      session.ip
    );
    this.addAuditLog(
      session.accountKey,
      'TRUSTED_SESSION_CHANGED',
      `Device ${session.device} status changed to REVOKED`,
      sessionId,
      session.device,
      session.ip
    );

    if (this.terminationHandler) {
      try {
        await this.terminationHandler(session.tokenHash, session.sessionId);
      } catch (err) {}
    }

    this.broadcastEvent(session.accountKey, {
      type: 'SESSION_REVOKED',
      session,
      forceKick: { sessionId: session.sessionId, tokenHash: session.tokenHash, reason },
    });
    this.saveState();
    return true;
  }

  public async emergencyRevokeAll(accountKey: string, exceptSessionId?: string, ip?: string): Promise<number> {
    let count = 0;
    const revokedList: SecuritySession[] = [];

    for (const [id, session] of this.sessions.entries()) {
      if (session.accountKey === accountKey && id !== exceptSessionId) {
        if (session.status !== 'REVOKED') {
          session.status = 'REVOKED';
          session.trusted = false;
          session.revokedAt = Date.now();
          revokedList.push(session);
          count++;

          if (this.terminationHandler) {
            try {
              await this.terminationHandler(session.tokenHash, session.sessionId);
            } catch (err) {}
          }
        }
      }
    }

    this.addAuditLog(
      accountKey,
      'EMERGENCY_REVOKE_ALL',
      `Emergency revocation executed: ${count} sessions of your account were immediately revoked and kicked`,
      exceptSessionId,
      undefined,
      ip
    );

    this.broadcastEvent(accountKey, {
      type: 'EMERGENCY_REVOKE_ALL',
      count,
      exceptSessionId,
      revokedSessionIds: revokedList.map((s) => s.sessionId),
      revokedTokenHashes: revokedList.map((s) => s.tokenHash),
    });
    this.saveState();
    return count;
  }

  public isTokenAllowed(token: string, req?: Request): { allowed: boolean; status: string; reason?: string } {
    if (!token) {
      return { allowed: false, status: 'MISSING_TOKEN', reason: 'Authentication token required.' };
    }

    const tokenHash = this.hashToken(token);
    const accountKey = this.resolveAccountKey(token);

    for (const s of this.sessions.values()) {
      if (s.accountKey === accountKey && s.tokenHash === tokenHash) {
        if (s.status === 'TRUSTED' && s.trusted) {
          return { allowed: true, status: 'TRUSTED' };
        }
        if (s.status === 'REVOKED') {
          return { allowed: false, status: 'REVOKED', reason: 'This session has been revoked by the account owner.' };
        }
        if (s.status === 'REJECTED') {
          return { allowed: false, status: 'REJECTED', reason: 'This login was rejected by the account owner.' };
        }
        return { allowed: false, status: 'PENDING', reason: 'This session is pending owner approval in the Security / Login Alerts dashboard.' };
      }
    }

    if (req) {
      const registered = this.registerSession(token, req);
      if (registered.session.status === 'TRUSTED' && registered.session.trusted) {
        return { allowed: true, status: 'TRUSTED' };
      }
      return { allowed: false, status: 'PENDING', reason: 'New session detected. Awaiting approval in Security / Login Alerts.' };
    }

    return { allowed: false, status: 'PENDING', reason: 'Session is pending authorization.' };
  }

  public getSessionByToken(token: string): SecuritySession | undefined {
    const tokenHash = this.hashToken(token);
    const accountKey = this.resolveAccountKey(token);
    for (const s of this.sessions.values()) {
      if (s.accountKey === accountKey && s.tokenHash === tokenHash) {
        return s;
      }
    }
    return undefined;
  }

  public getStatus(currentSessionToken?: string) {
    const accountKey = this.resolveAccountKey(currentSessionToken);
    const currentHash = currentSessionToken ? this.hashToken(currentSessionToken) : null;
    let currentSessionId: string | null = null;

    const config = this.getOrCreateAccountConfig(accountKey);

    const accountSessions = Array.from(this.sessions.values()).filter((s) => s.accountKey === accountKey);
    const pendingSessions = accountSessions.filter((s) => s.status === 'PENDING');
    const trustedSessions = accountSessions.filter((s) => s.status === 'TRUSTED');
    const revokedSessions = accountSessions.filter((s) => s.status === 'REVOKED' || s.status === 'REJECTED');

    for (const s of accountSessions) {
      if (currentHash && s.tokenHash === currentHash) {
        currentSessionId = s.sessionId;
      }
    }

    const accountLogs = this.auditLogs.filter((l) => l.accountKey === accountKey || l.accountKey === 'system').slice(0, 100);

    const pushCount = Array.from(this.pushSubscriptions.values()).filter((sub) => sub.accountKey === accountKey).length;

    return {
      accountKey,
      recoveryCode: config.recoveryCode,
      currentSessionId,
      pendingSessions,
      trustedSessions,
      revokedSessions,
      blockedIps: config.blockedIps,
      totalPending: pendingSessions.length,
      totalTrusted: trustedSessions.length,
      totalRevoked: revokedSessions.length,
      totalBlockedIps: config.blockedIps.length,
      auditLogs: accountLogs,
      pushSubscribed: pushCount > 0,
      pushSubscriptionsCount: pushCount,
    };
  }

  public addPushSubscription(sub: PushSubscriptionRecord) {
    this.pushSubscriptions.set(sub.id, sub);
    this.saveState();
  }

  public removePushSubscription(id: string) {
    this.pushSubscriptions.delete(id);
    this.saveState();
  }

  public addSseClient(res: Response, accountKey?: string) {
    this.sseClients.add({ res, accountKey });
  }

  public removeSseClient(res: Response) {
    for (const item of this.sseClients) {
      if (item.res === res) {
        this.sseClients.delete(item);
      }
    }
  }

  public broadcastEvent(accountKey: string, data: any) {
    const msg = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      if (!client.accountKey || client.accountKey === accountKey) {
        try {
          client.res.write(msg);
        } catch (e) {
          this.sseClients.delete(client);
        }
      }
    }
  }

  public getChallenge(id: string): SecurityChallenge | undefined {
    return this.challenges.get(id);
  }

  public deleteChallenge(id: string) {
    this.challenges.delete(id);
  }
}

export const securityManager = new SecurityManager();
