import { Router, Request, Response, NextFunction } from 'express';
import { securityManager } from './securityManager';
import crypto from 'crypto';

const router = Router();

export function securityEnforcementMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const accountKey = token ? securityManager.resolveAccountKey(token) : undefined;

  if (securityManager.isIpBlocked(ip, accountKey)) {
    return res.status(403).json({
      error: 'IP_BLOCKED',
      message: 'Access from this IP address or network has been blocked by the account owner.',
    });
  }

  const p = req.path;
  if (
    p.startsWith('/api/security') ||
    p.startsWith('/api/auth/login') ||
    p.startsWith('/api/auth/discord') ||
    p.startsWith('/api/health') ||
    p === '/catalystcord.lua' ||
    p === '/raw/catalystcord.lua'
  ) {
    return next();
  }

  if (token && token !== 'guest' && token !== 'undefined') {
    const check = securityManager.isTokenAllowed(token, req);
    if (!check.allowed) {
      return res.status(403).json({
        error: check.status,
        message: check.reason || 'This device session is not authorized by the account owner.',
        status: check.status,
      });
    }
  }

  next();
}

router.get('/status', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const status = securityManager.getStatus(token);
  res.json({ success: true, ...status });
});

router.get('/events', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || (req.query.token as string) || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const accountKey = token ? securityManager.resolveAccountKey(token) : undefined;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  securityManager.addSseClient(res, accountKey);

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (e) {
      clearInterval(heartbeat);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    securityManager.removeSseClient(res);
  });
});

router.get('/discord/sessions', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const remoteSessions = await securityManager.fetchDiscordRemoteSessions(token);
    res.json({ success: true, sessions: remoteSessions });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to fetch Discord remote sessions' });
  }
});

router.post('/discord/kick-session', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const { sessionIdHash } = req.body;

  if (!token || !sessionIdHash) {
    return res.status(400).json({ error: 'Missing token or sessionIdHash' });
  }

  const result = await securityManager.kickDiscordRemoteSession(token, sessionIdHash);
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

router.post('/discord/emergency-kick-all', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  const result = await securityManager.emergencyKickAllDiscordSessions(token);
  res.json(result);
});

router.post('/settings', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const { autoKickUntrustedDiscord, allowedCountries } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  const accountKey = securityManager.resolveAccountKey(token);
  const updated = securityManager.updateAccountConfig(accountKey, {
    autoKickUntrustedDiscord,
    allowedCountries,
  });

  res.json({ success: true, config: updated });
});

router.get('/check-session', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  const session = securityManager.getSessionByToken(token);
  if (!session) {
    const registered = securityManager.registerSession(token, req);
    return res.json({
      success: true,
      session: registered.session,
      isTrusted: registered.session.trusted,
      isPending: registered.session.status === 'PENDING',
    });
  }

  return res.json({
    success: true,
    session,
    isTrusted: session.status === 'TRUSTED' && session.trusted,
    isPending: session.status === 'PENDING',
    isRevoked: session.status === 'REVOKED' || session.status === 'REJECTED',
  });
});

router.post('/challenge/create', (req: Request, res: Response) => {
  const { action, sessionId } = req.body;
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const accountKey = securityManager.resolveAccountKey(token);

  if (!action) {
    return res.status(400).json({ error: 'Action is required' });
  }

  const challenge = securityManager.createChallenge(accountKey, action, sessionId);
  res.json({
    success: true,
    challengeId: challenge.challengeId,
    challengeData: challenge.challengeData,
    expiresAt: challenge.expiresAt,
    supportedMethods: ['passkey', 'recovery_code', 'owner_secret'],
  });
});

router.post('/challenge/verify', async (req: Request, res: Response) => {
  const { challengeId, method, authPayload } = req.body;
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';

  if (!challengeId || !method || authPayload === undefined) {
    return res.status(400).json({ error: 'Missing required challenge parameters' });
  }

  const challenge = securityManager.getChallenge(challengeId);
  if (!challenge) {
    return res.status(400).json({ error: 'Challenge expired or invalid. Please request a new one.' });
  }

  if (Date.now() > challenge.expiresAt) {
    securityManager.deleteChallenge(challengeId);
    return res.status(400).json({ error: 'Verification challenge has expired.' });
  }

  const isValid = securityManager.verifyOwnerAuth(challenge.accountKey, method, authPayload, ip);
  if (!isValid) {
    securityManager.addAuditLog(
      challenge.accountKey,
      'FAILED_VERIFICATION',
      `Failed owner verification attempt using ${method}`,
      challenge.targetSessionId,
      undefined,
      ip
    );
    return res.status(401).json({ error: 'Verification failed. Invalid authentication credential.' });
  }

  securityManager.addAuditLog(
    challenge.accountKey,
    'VERIFICATION_ATTEMPT',
    `Successful owner verification using ${method}`,
    challenge.targetSessionId,
    undefined,
    ip
  );

  securityManager.deleteChallenge(challengeId);

  if (challenge.action === 'ACCEPT' && challenge.targetSessionId) {
    const ok = securityManager.approveSession(challenge.targetSessionId, `Owner ${method}`);
    return res.json({ success: ok, message: 'Session approved and marked as trusted.' });
  }

  if (challenge.action === 'REJECT' && challenge.targetSessionId) {
    const ok = await securityManager.rejectSession(challenge.targetSessionId, `Rejected by owner via ${method}`);
    return res.json({ success: ok, message: 'Session rejected and immediately kicked.' });
  }

  if (challenge.action === 'REVOKE_SESSION' && challenge.targetSessionId) {
    const ok = await securityManager.revokeSession(challenge.targetSessionId, `Revoked by owner via ${method}`);
    return res.json({ success: ok, message: 'Session revoked and kicked from server.' });
  }

  if (challenge.action === 'REVOKE_ALL') {
    const count = await securityManager.emergencyRevokeAll(challenge.accountKey, challenge.sessionId, ip);
    return res.json({ success: true, count, message: `Successfully revoked and kicked ${count} sessions.` });
  }

  return res.json({ success: true, verified: true });
});

router.post('/approve-session', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  const ok = securityManager.approveSession(sessionId);
  if (ok) {
    res.json({ success: true, message: 'Session approved.' });
  } else {
    res.status(404).json({ error: 'Session not found.' });
  }
});

router.post('/reject-session', async (req: Request, res: Response) => {
  const { sessionId, reason } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  const ok = await securityManager.rejectSession(sessionId, reason || 'Rejected by account owner');
  if (ok) {
    res.json({ success: true, message: 'Session rejected and kicked.' });
  } else {
    res.status(404).json({ error: 'Session not found.' });
  }
});

router.post('/revoke-session', async (req: Request, res: Response) => {
  const { sessionId, reason } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  const ok = await securityManager.revokeSession(sessionId, reason || 'Revoked by account owner');
  if (ok) {
    res.json({ success: true, message: 'Session revoked and terminated.' });
  } else {
    res.status(404).json({ error: 'Session not found.' });
  }
});

router.post('/emergency-revoke-all', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const { currentSessionId } = req.body;
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';

  const accountKey = securityManager.resolveAccountKey(token);
  const count = await securityManager.emergencyRevokeAll(accountKey, currentSessionId, ip);

  res.json({ success: true, count, message: `Emergency revocation completed: ${count} sessions revoked.` });
});

router.post('/block-ip', (req: Request, res: Response) => {
  const { ip, reason } = req.body;
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const accountKey = token ? securityManager.resolveAccountKey(token) : undefined;

  if (!ip) {
    return res.status(400).json({ error: 'IP address is required' });
  }

  securityManager.blockIp(ip, accountKey, reason);
  res.json({ success: true, message: `IP ${ip} has been blocked.` });
});

router.post('/unblock-ip', (req: Request, res: Response) => {
  const { ip } = req.body;
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const accountKey = token ? securityManager.resolveAccountKey(token) : undefined;

  if (!ip) {
    return res.status(400).json({ error: 'IP address is required' });
  }

  securityManager.unblockIp(ip, accountKey);
  res.json({ success: true, message: `IP ${ip} has been unblocked.` });
});

router.post('/push/subscribe', (req: Request, res: Response) => {
  const { subscription } = req.body;
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const userAgent = req.headers['user-agent'] || 'Unknown';

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  const accountKey = securityManager.resolveAccountKey(token);
  const record = securityManager.addPushSubscription(subscription, accountKey, userAgent);

  res.json({ success: true, record });
});

router.post('/test-push', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const accountKey = securityManager.resolveAccountKey(token);

  securityManager.broadcastEvent(accountKey, {
    type: 'TEST_NOTIFICATION',
    notification: {
      title: '🛡️ Yuri Security Shield Active',
      body: 'Real-time login detection, instant Discord session kicking, and multi-user protection are active.',
      data: { url: '/#security', timestamp: Date.now() },
    },
  });

  res.json({ success: true, message: 'Test alert dispatched via SSE and Push channel.' });
});

export default router;
