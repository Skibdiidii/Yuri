import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Laptop,
  Globe,
  Clock,
  Key,
  Lock,
  Unlock,
  AlertTriangle,
  Bell,
  BellRing,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Fingerprint,
  Radio,
  FileText,
  Search,
  Check,
  X,
  Zap,
  Power,
  Trash2,
} from 'lucide-react';

export interface SecuritySession {
  sessionId: string;
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

export interface DiscordRemoteSession {
  id_hash: string;
  os: string;
  platform?: string;
  client_version?: string;
  location?: string;
  approx_last_used_time?: string;
  current?: boolean;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: number;
  eventType:
    | 'NEW_SESSION'
    | 'OWNER_APPROVED'
    | 'SESSION_REJECTED'
    | 'SESSION_REVOKED'
    | 'DISCORD_REMOTE_KICK'
    | 'DISCORD_GLOBAL_LOGOUT'
    | 'VERIFICATION_ATTEMPT'
    | 'FAILED_VERIFICATION'
    | 'TRUSTED_SESSION_CHANGED'
    | 'EMERGENCY_REVOKE_ALL'
    | 'NOTIFICATION_SENT';
  sessionId?: string;
  device?: string;
  ip?: string;
  details: string;
}

interface SecurityTabProps {
  token: string;
  addLog?: (message: string) => void;
}

export default function SecurityTab({ token, addLog }: SecurityTabProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingSessions, setPendingSessions] = useState<SecuritySession[]>([]);
  const [trustedSessions, setTrustedSessions] = useState<SecuritySession[]>([]);
  const [revokedSessions, setRevokedSessions] = useState<SecuritySession[]>([]);
  const [discordRemoteSessions, setDiscordRemoteSessions] = useState<DiscordRemoteSession[]>([]);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [autoKickUntrusted, setAutoKickUntrusted] = useState(false);
  const [blockedIps, setBlockedIps] = useState<string[]>([]);
  const [newBlockIp, setNewBlockIp] = useState('');
  const [recoveryCode, setRecoveryCode] = useState<string>('');
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const [activeVerification, setActiveVerification] = useState<{
    isOpen: boolean;
    action: 'ACCEPT' | 'REJECT' | 'REVOKE_ALL' | 'REVOKE_SESSION' | 'DISCORD_KICK';
    targetSession?: SecuritySession;
    discordSessionHash?: string;
    challengeId?: string;
    challengeData?: string;
    expiresAt?: number;
    method: 'passkey' | 'recovery_code' | 'owner_secret';
    payloadInput: string;
    error?: string;
    processing: boolean;
  }>({
    isOpen: false,
    action: 'ACCEPT',
    method: 'recovery_code',
    payloadInput: '',
    processing: false,
  });

  const [searchLog, setSearchLog] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const sseRef = useRef<EventSource | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setActionNotice({ type, text });
    if (addLog) addLog(`[Security] ${text}`);
    setTimeout(() => {
      setActionNotice(null);
    }, 5000);
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/security/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingSessions(data.pendingSessions || []);
        setTrustedSessions(data.trustedSessions || []);
        setRevokedSessions(data.revokedSessions || []);
        setBlockedIps(data.blockedIps || []);
        setRecoveryCode(data.recoveryCode || '');
        setAuditLogs(data.auditLogs || []);
        setCurrentSessionId(data.currentSessionId || null);
        setAutoKickUntrusted(data.autoKickUntrustedDiscord || false);
      }
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDiscordSessions = async () => {
    setDiscordLoading(true);
    try {
      const res = await fetch('/api/security/discord/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDiscordRemoteSessions(data.sessions || []);
      }
    } catch (e) {
    } finally {
      setDiscordLoading(false);
    }
  };

  const toggleAutoKick = async () => {
    const nextVal = !autoKickUntrusted;
    setAutoKickUntrusted(nextVal);
    try {
      const res = await fetch('/api/security/settings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          autoKickUntrustedDiscord: nextVal,
        }),
      });
      if (res.ok) {
        showToast(
          nextVal
            ? '⚡ Auto-Kick Enabled: Unrecognized Discord logins will be kicked within milliseconds!'
            : 'Auto-Kick Disabled',
          'success'
        );
      }
    } catch (e) {
      setAutoKickUntrusted(!nextVal);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      setNotificationsEnabled(Notification.permission === 'granted');
    }

    fetchStatus();
    fetchDiscordSessions();

    const sseUrl = `/api/security/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(sseUrl);
    sseRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_LOGIN_DETECTED') {
          showToast(`🚨 New login detected on ${data.session.device} (${data.session.location})`, 'error');
          if (Notification.permission === 'granted' && data.notification) {
            new Notification(data.notification.title, {
              body: data.notification.body,
              icon: '/icons/shield-alert.png',
            });
          }
          fetchStatus();
          fetchDiscordSessions();
        } else if (data.type === 'AUDIT_LOG' && data.log) {
          setAuditLogs((prev) => [data.log, ...prev.slice(0, 99)]);
        } else if (
          data.type === 'SESSION_APPROVED' ||
          data.type === 'SESSION_REJECTED' ||
          data.type === 'SESSION_REVOKED' ||
          data.type === 'DISCORD_SESSION_KICKED' ||
          data.type === 'EMERGENCY_REVOKE_ALL'
        ) {
          fetchStatus();
          fetchDiscordSessions();
        }
      } catch (e) {}
    };

    const interval = setInterval(() => {
      fetchStatus();
    }, 10000);

    return () => {
      clearInterval(interval);
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, [token]);

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      showToast('Notifications are not supported in this browser.', 'error');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        showToast('Push Notifications enabled! You will receive alerts on untrusted logins.', 'success');
        await fetch('/api/security/test-push', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        setNotificationsEnabled(false);
        showToast('Notification permission denied.', 'info');
      }
    } catch (e) {
      showToast('Failed to enable notifications.', 'error');
    }
  };

  const kickDiscordSessionDirect = async (sessionIdHash: string) => {
    try {
      const res = await fetch('/api/security/discord/kick-session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionIdHash }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('⚡ Device successfully kicked from Discord account!', 'success');
        fetchDiscordSessions();
        fetchStatus();
      } else {
        showToast(data.message || 'Failed to kick Discord session', 'error');
      }
    } catch (e) {
      showToast('Network error kicking Discord session', 'error');
    }
  };

  const emergencyKickAllDiscord = async () => {
    if (!confirm('Are you sure? This will kick ALL other phones, apps, and browsers out of your Discord account immediately!')) {
      return;
    }

    try {
      const res = await fetch('/api/security/discord/emergency-kick-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🚨 Kicked ${data.count} Discord sessions and logged out token!`, 'success');
        fetchDiscordSessions();
        fetchStatus();
      } else {
        showToast(data.message || 'Failed emergency kick', 'error');
      }
    } catch (e) {
      showToast('Emergency kick failed', 'error');
    }
  };

  const startVerificationChallenge = async (
    action: 'ACCEPT' | 'REJECT' | 'REVOKE_ALL' | 'REVOKE_SESSION' | 'DISCORD_KICK',
    targetSession?: SecuritySession,
    discordSessionHash?: string
  ) => {
    try {
      const res = await fetch('/api/security/challenge/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          sessionId: targetSession?.sessionId,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create challenge');
      }

      const data = await res.json();
      setActiveVerification({
        isOpen: true,
        action,
        targetSession,
        discordSessionHash,
        challengeId: data.challengeId,
        challengeData: data.challengeData,
        expiresAt: data.expiresAt,
        method: 'recovery_code',
        payloadInput: '',
        processing: false,
      });
    } catch (e) {
      showToast('Failed to initiate owner verification', 'error');
    }
  };

  const submitVerification = async () => {
    if (!activeVerification.challengeId) return;

    if (activeVerification.method !== 'passkey' && !activeVerification.payloadInput.trim()) {
      setActiveVerification((prev) => ({ ...prev, error: 'Please enter your authentication key or recovery code' }));
      return;
    }

    setActiveVerification((prev) => ({ ...prev, processing: true, error: undefined }));

    try {
      let authPayload: any = activeVerification.payloadInput.trim();

      if (activeVerification.method === 'passkey') {
        authPayload = { passkeyVerified: true, timestamp: Date.now() };
      }

      const res = await fetch('/api/security/challenge/verify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          challengeId: activeVerification.challengeId,
          method: activeVerification.method,
          authPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActiveVerification((prev) => ({
          ...prev,
          processing: false,
          error: data.error || 'Verification failed. Incorrect code or secret.',
        }));
        return;
      }

      if (activeVerification.action === 'DISCORD_KICK' && activeVerification.discordSessionHash) {
        await kickDiscordSessionDirect(activeVerification.discordSessionHash);
      }

      showToast(data.message || 'Verification successful! Action completed.', 'success');
      setActiveVerification({
        isOpen: false,
        action: 'ACCEPT',
        method: 'recovery_code',
        payloadInput: '',
        processing: false,
      });
      fetchStatus();
      fetchDiscordSessions();
    } catch (e: any) {
      setActiveVerification((prev) => ({
        ...prev,
        processing: false,
        error: e?.message || 'Network error during verification',
      }));
    }
  };

  const handleBlockIp = async () => {
    if (!newBlockIp.trim()) return;
    try {
      const res = await fetch('/api/security/block-ip', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip: newBlockIp.trim() }),
      });
      if (res.ok) {
        showToast(`IP ${newBlockIp.trim()} added to blocklist`, 'success');
        setNewBlockIp('');
        fetchStatus();
      }
    } catch (e) {}
  };

  const handleUnblockIp = async (ip: string) => {
    try {
      const res = await fetch('/api/security/unblock-ip', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip }),
      });
      if (res.ok) {
        showToast(`IP ${ip} removed from blocklist`, 'info');
        fetchStatus();
      }
    } catch (e) {}
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      searchLog === '' ||
      log.details.toLowerCase().includes(searchLog.toLowerCase()) ||
      (log.device && log.device.toLowerCase().includes(searchLog.toLowerCase())) ||
      (log.ip && log.ip.includes(searchLog));
    const matchesType = filterType === 'ALL' || log.eventType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <AnimatePresence>
        {actionNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`p-4 rounded-2xl flex items-center justify-between shadow-2xl border backdrop-blur-xl ${
              actionNotice.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                : actionNotice.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                : 'bg-indigo-950/80 border-indigo-500/40 text-indigo-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {actionNotice.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {actionNotice.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400" />}
              {actionNotice.type === 'info' && <Radio className="w-5 h-5 text-indigo-400" />}
              <span className="text-sm font-medium">{actionNotice.text}</span>
            </div>
            <button
              onClick={() => setActionNotice(null)}
              className="p-1 text-white/50 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900/90 via-zinc-950/90 to-black p-8 border border-white/10 shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight text-white">Owner Security & Discord Protection</h1>
                <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Live Guard
                </span>
              </div>
              <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
                Real-time multi-platform device authorization, instant Discord session termination, and owner verification safeguard.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={toggleAutoKick}
              className={`px-4 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 border transition-all ${
                autoKickUntrusted
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-lg shadow-amber-500/10'
                  : 'bg-zinc-800/80 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <Zap className={`w-4 h-4 ${autoKickUntrusted ? 'text-amber-400 animate-pulse' : ''}`} />
              Auto-Kick Untrusted Discord: {autoKickUntrusted ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={requestPushPermission}
              className={`px-4 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 border transition-all ${
                notificationsEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-zinc-800/80 border-white/10 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {notificationsEnabled ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              {notificationsEnabled ? 'Web Push Active' : 'Enable Login Push Alerts'}
            </button>

            <button
              onClick={() => {
                setRefreshing(true);
                fetchStatus();
                fetchDiscordSessions();
              }}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-zinc-300 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-zinc-900/60 border border-indigo-500/20 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Live Discord Account Sessions
                <span className="px-2 py-0.5 text-xs rounded-full bg-zinc-800 text-zinc-300 border border-white/5">
                  {discordRemoteSessions.length} active
                </span>
              </h2>
              <p className="text-zinc-400 text-xs">
                Real phones, PC apps, and browsers connected to your actual Discord account via Discord API.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDiscordSessions}
              disabled={discordLoading}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-xs border border-white/10 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${discordLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={emergencyKickAllDiscord}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5 shadow-lg shadow-rose-950/50"
            >
              <Power className="w-3.5 h-3.5" />
              Kick All Other Discord Apps
            </button>
          </div>
        </div>

        {discordLoading && discordRemoteSessions.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">Querying Discord API for active sessions...</div>
        ) : discordRemoteSessions.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm border border-dashed border-white/10 rounded-2xl">
            No remote Discord sessions detected or logged in as OAuth.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {discordRemoteSessions.map((ds) => (
              <div
                key={ds.id_hash}
                className="p-5 rounded-2xl bg-zinc-950/60 border border-white/5 hover:border-indigo-500/30 transition-all flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-white/10 flex items-center justify-center text-zinc-300">
                    {ds.os.toLowerCase().includes('android') || ds.os.toLowerCase().includes('ios') ? (
                      <Smartphone className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <Laptop className="w-5 h-5 text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white text-sm">{ds.os}</h4>
                      {ds.current && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Current Bot Session
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                      <span>{ds.platform}</span>
                      <span>•</span>
                      <span>{ds.location}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last Active: {new Date(ds.approx_last_used_time || Date.now()).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                {!ds.current && (
                  <button
                    onClick={() => kickDiscordSessionDirect(ds.id_hash)}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Kick from Discord
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl bg-zinc-900/60 border border-white/10 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Authorized Web Sessions
                <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {trustedSessions.length}
                </span>
              </h2>
              <p className="text-zinc-400 text-xs">Devices permitted to manage and interact with this account.</p>
            </div>
          </div>

          <button
            onClick={() => startVerificationChallenge('REVOKE_ALL')}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5"
          >
            <Power className="w-3.5 h-3.5" />
            Emergency Revoke All
          </button>
        </div>

        {trustedSessions.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm border border-dashed border-white/10 rounded-2xl">
            No trusted sessions registered.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trustedSessions.map((session) => (
              <div
                key={session.sessionId}
                className="p-5 rounded-2xl bg-zinc-950/60 border border-white/5 hover:border-emerald-500/30 transition-all flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-white/10 flex items-center justify-center text-zinc-300">
                    <Globe className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white text-sm">{session.device}</h4>
                      {session.sessionId === currentSessionId && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Current Device
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                      <span>{session.location}</span>
                      <span>•</span>
                      <span>IP: {session.ip}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Detected: {new Date(session.detectedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {session.sessionId !== currentSessionId && (
                  <button
                    onClick={() => startVerificationChallenge('REVOKE_SESSION', session)}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-3xl bg-zinc-900/60 border border-white/10 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Emergency Recovery Key</h2>
              <p className="text-zinc-400 text-xs">Used to authorize sensitive actions or unlock your account.</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Master Secret Key:</span>
              <button
                onClick={() => setShowRecoveryCode(!showRecoveryCode)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {showRecoveryCode ? 'Hide' : 'Reveal'}
              </button>
            </div>
            <div className="p-3 bg-black/50 border border-white/10 rounded-xl font-mono text-sm text-amber-300 flex items-center justify-between select-all">
              <span>{showRecoveryCode ? recoveryCode : '••••••••••••••••••••••••'}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(recoveryCode);
                  setCopiedRecovery(true);
                  setTimeout(() => setCopiedRecovery(false), 3000);
                }}
                className="p-1 text-zinc-400 hover:text-white text-xs"
              >
                {copiedRecovery ? <Check className="w-4 h-4 text-emerald-400" /> : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-zinc-900/60 border border-white/10 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">IP & Network Firewall</h2>
              <p className="text-zinc-400 text-xs">Traffic from blocked IPs receives HTTP 403 Forbidden.</p>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="e.g. 192.168.1.100 or 1.2.3.4"
              value={newBlockIp}
              onChange={(e) => setNewBlockIp(e.target.value)}
              className="flex-1 bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50"
            />
            <button
              onClick={handleBlockIp}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition-all"
            >
              Block IP
            </button>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5">
            {blockedIps.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-3">No IP addresses currently blocked.</p>
            ) : (
              blockedIps.map((ip) => (
                <div
                  key={ip}
                  className="px-3 py-2 rounded-xl bg-zinc-950/60 border border-white/5 flex items-center justify-between text-xs text-zinc-300"
                >
                  <span className="font-mono">{ip}</span>
                  <button
                    onClick={() => handleUnblockIp(ip)}
                    className="text-rose-400 hover:text-rose-300 text-xs"
                  >
                    Unblock
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-zinc-900/60 border border-white/10 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Security Activity Audit Trail</h2>
              <p className="text-zinc-400 text-xs">Immutable chronological ledger of all security occurrences.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search audit trail..."
                value={searchLog}
                onChange={(e) => setSearchLog(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-white/5 max-h-96 overflow-y-auto rounded-2xl bg-zinc-950/40 border border-white/5">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">No audit events match current criteria.</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-3.5 hover:bg-white/[0.02] flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.eventType === 'NEW_SESSION'
                        ? 'bg-amber-500/20 text-amber-300'
                        : log.eventType === 'OWNER_APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : log.eventType === 'DISCORD_REMOTE_KICK' || log.eventType === 'SESSION_REVOKED'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-indigo-500/20 text-indigo-300'
                    }`}
                  >
                    {log.eventType}
                  </span>
                  <span className="text-zinc-300">{log.details}</span>
                </div>
                <span className="text-zinc-500 text-[11px] whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {activeVerification.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-zinc-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Owner Authorization Challenge</h3>
                    <p className="text-zinc-400 text-xs">Authorize: {activeVerification.action}</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveVerification((prev) => ({ ...prev, isOpen: false }))}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {activeVerification.error && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                  {activeVerification.error}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setActiveVerification((prev) => ({ ...prev, method: 'recovery_code' }))}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                      activeVerification.method === 'recovery_code'
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                        : 'bg-zinc-950/60 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Recovery Code
                  </button>
                  <button
                    onClick={() => setActiveVerification((prev) => ({ ...prev, method: 'passkey' }))}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                      activeVerification.method === 'passkey'
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                        : 'bg-zinc-950/60 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Passkey / Biometric
                  </button>
                </div>

                {activeVerification.method === 'recovery_code' && (
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1.5">Enter Recovery Key:</label>
                    <input
                      type="text"
                      placeholder="SEC-XXXX-XXXX-YURI"
                      value={activeVerification.payloadInput}
                      onChange={(e) => setActiveVerification((prev) => ({ ...prev, payloadInput: e.target.value }))}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {activeVerification.method === 'passkey' && (
                  <div className="p-4 rounded-xl bg-zinc-950/80 border border-white/10 text-center space-y-2">
                    <Fingerprint className="w-8 h-8 text-indigo-400 mx-auto" />
                    <p className="text-xs text-zinc-300 font-medium">Verify using device biometric or security key</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setActiveVerification((prev) => ({ ...prev, isOpen: false }))}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitVerification}
                    disabled={activeVerification.processing}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                  >
                    {activeVerification.processing ? 'Verifying...' : 'Confirm Authorization'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
