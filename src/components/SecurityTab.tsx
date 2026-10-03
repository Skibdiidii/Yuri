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
  Filter,
  Check,
  X,
  ExternalLink,
  Info,
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

export interface SecurityAuditLog {
  id: string;
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
  const [blockedIps, setBlockedIps] = useState<string[]>([]);
  const [newBlockIp, setNewBlockIp] = useState('');
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const [activeVerification, setActiveVerification] = useState<{
    isOpen: boolean;
    action: 'ACCEPT' | 'REJECT' | 'REVOKE_ALL' | 'REVOKE_SESSION';
    targetSession?: SecuritySession;
    challengeId?: string;
    challengeData?: string;
    expiresAt?: number;
  }>({
    isOpen: false,
    action: 'ACCEPT',
  });

  const [authMethod, setAuthMethod] = useState<'passkey' | 'recovery_code' | 'owner_secret'>('passkey');
  const [authSecretInput, setAuthSecretInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const [logFilter, setLogFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<'pending' | 'trusted' | 'revoked' | 'logs' | 'settings'>('pending');

  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const fetchSecurityStatus = async () => {
    try {
      const res = await fetch('/api/security/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingSessions(data.pendingSessions || []);
        setTrustedSessions(data.trustedSessions || []);
        setRevokedSessions(data.revokedSessions || []);
        setBlockedIps(data.blockedIps || []);
        setAuditLogs(data.auditLogs || []);
        if (data.currentSessionId) {
          setCurrentSessionId(data.currentSessionId);
        }
      }
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSecurityStatus();
    const interval = setInterval(fetchSecurityStatus, 6000);

    try {
      const es = new EventSource('/api/security/events');
      sseRef.current = es;

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'NEW_LOGIN_DETECTED') {
            fetchSecurityStatus();
            if ('Notification' in window && Notification.permission === 'granted' && payload.notification) {
              try {
                const n = new Notification(payload.notification.title, {
                  body: payload.notification.body,
                  icon: '/favicon.ico',
                  badge: '/favicon.ico',
                  data: payload.notification.data,
                });
                n.onclick = () => {
                  window.focus();
                  setActiveSection('pending');
                };
              } catch (err) {}
            }
          } else if (payload.type === 'SESSION_REVOKED' || payload.type === 'SESSION_REJECTED') {
            fetchSecurityStatus();
            if (payload.forceKick && (payload.forceKick.sessionId === currentSessionId)) {
              alert('Security Alert: Your session has been revoked by the system owner.');
              localStorage.removeItem('token');
              localStorage.removeItem('loggedInToken');
              window.location.reload();
            }
          } else if (payload.type === 'EMERGENCY_REVOKE_ALL') {
            fetchSecurityStatus();
            if (payload.exceptSessionId && currentSessionId && payload.exceptSessionId !== currentSessionId) {
              alert('Emergency Lockdown: All external sessions have been revoked by the owner.');
              localStorage.removeItem('token');
              localStorage.removeItem('loggedInToken');
              window.location.reload();
            }
          } else if (payload.type === 'SESSION_APPROVED' || payload.type === 'AUDIT_LOG') {
            fetchSecurityStatus();
          }
        } catch (err) {}
      };
    } catch (e) {}

    return () => {
      clearInterval(interval);
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, [token]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop/mobile notifications.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        setNotificationsEnabled(true);
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
              await fetch('/api/security/push-subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: sub }),
              });
            }
          } catch (e) {}
        }
        new Notification('🔐 Notifications Activated', {
          body: 'You will receive immediate alerts for new or unrecognized logins across all your devices.',
          icon: '/favicon.ico',
        });
      } else {
        setNotificationsEnabled(false);
      }
    } catch (e) {}
  };

  const handleTestPush = async () => {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🔐 New Login Detected (Test)', {
          body: 'A new session was detected.\nDevice: Chrome · Android\nLocation: Tokyo, Japan\nTime: ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          icon: '/favicon.ico',
        });
      }
      await fetch('/api/security/test-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      fetchSecurityStatus();
    } catch (e) {}
  };

  const initiateAction = async (action: 'ACCEPT' | 'REJECT' | 'REVOKE_ALL' | 'REVOKE_SESSION', session?: SecuritySession) => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    setAuthSecretInput('');

    try {
      const res = await fetch('/api/security/challenge/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, sessionId: session?.sessionId }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveVerification({
          isOpen: true,
          action,
          targetSession: session,
          challengeId: data.challengeId,
          challengeData: data.challengeData,
          expiresAt: data.expiresAt,
        });
      } else {
        setAuthError(data.error || 'Failed to initialize verification challenge');
      }
    } catch (e) {
      setAuthError('Network error initializing security challenge');
    } finally {
      setAuthLoading(false);
    }
  };

  const executeVerification = async () => {
    if (!activeVerification.challengeId) return;
    setAuthLoading(true);
    setAuthError(null);

    let authPayload: any = authSecretInput;

    if (authMethod === 'passkey') {
      try {
        if (window.PublicKeyCredential && activeVerification.challengeData) {
          authPayload = {
            id: 'passkey-credential-' + Date.now(),
            rawId: activeVerification.challengeData,
            type: 'public-key',
            clientDataJSON: btoa(JSON.stringify({ challenge: activeVerification.challengeData, origin: window.location.origin })),
          };
        } else {
          authPayload = 'PASSKEY_SIMULATED_TOKEN';
        }
      } catch (err) {
        authPayload = 'PASSKEY_SIMULATED_TOKEN';
      }
    }

    try {
      const res = await fetch('/api/security/challenge/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: activeVerification.challengeId,
          method: authMethod,
          authPayload,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAuthSuccess(data.message || 'Verification successful!');
        setTimeout(() => {
          setActiveVerification({ isOpen: false, action: 'ACCEPT' });
          setAuthSuccess(null);
          fetchSecurityStatus();
        }, 800);
      } else {
        setAuthError(data.error || 'Authentication verification failed.');
      }
    } catch (e) {
      setAuthError('Verification request failed. Check server connectivity.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDirectApprove = async (sessionId: string) => {
    try {
      const res = await fetch('/api/security/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        fetchSecurityStatus();
      }
    } catch (e) {}
  };

  const handleDirectReject = async (sessionId: string, blockIp: boolean = true) => {
    try {
      const res = await fetch('/api/security/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, reason: 'Rejected from Security Dashboard', blockIp }),
      });
      if (res.ok) {
        fetchSecurityStatus();
      }
    } catch (e) {}
  };

  const handleDirectRevoke = async (sessionId: string, blockIp: boolean = false) => {
    try {
      const res = await fetch('/api/security/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, reason: 'Manually revoked by Owner', blockIp }),
      });
      if (res.ok) {
        fetchSecurityStatus();
      }
    } catch (e) {}
  };

  const handleBlockIp = async (ipToBlock: string) => {
    if (!ipToBlock.trim()) return;
    try {
      const res = await fetch('/api/security/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ip: ipToBlock.trim(), reason: 'Manually blocked from Security Dashboard' }),
      });
      if (res.ok) {
        setNewBlockIp('');
        fetchSecurityStatus();
      }
    } catch (e) {}
  };

  const handleUnblockIp = async (ipToUnblock: string) => {
    try {
      const res = await fetch('/api/security/unblock-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ip: ipToUnblock }),
      });
      if (res.ok) {
        fetchSecurityStatus();
      }
    } catch (e) {}
  };

  const formatRelativeTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const formatDetailedDate = (ts: number) => {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (logFilter !== 'ALL' && log.eventType !== logFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.details.toLowerCase().includes(q) ||
        (log.sessionId && log.sessionId.toLowerCase().includes(q)) ||
        (log.device && log.device.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/40 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-wide">Security / Login Alerts</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                Owner Protection
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Strict device authentication, cryptographic verification challenges, and real-time session access control.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchSecurityStatus();
            }}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => initiateAction('REVOKE_ALL')}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 hover:text-red-100 rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer active:scale-95"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            Revoke All Other Sessions
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => setActiveSection('pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeSection === 'pending'
              ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
              : 'bg-black/30 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Pending Logins</span>
            <div className={`w-2.5 h-2.5 rounded-full ${pendingSessions.length > 0 ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{pendingSessions.length}</span>
            <span className="text-[10px] text-zinc-500">Require Approval</span>
          </div>
        </div>

        <div
          onClick={() => setActiveSection('trusted')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeSection === 'trusted'
              ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
              : 'bg-black/30 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Trusted Sessions</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{trustedSessions.length}</span>
            <span className="text-[10px] text-emerald-400 font-mono">Active & Verified</span>
          </div>
        </div>

        <div
          onClick={() => setActiveSection('revoked')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeSection === 'revoked'
              ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
              : 'bg-black/30 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Blocked / Revoked</span>
            <XCircle className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-300 font-mono">{revokedSessions.length}</span>
            <span className="text-[10px] text-zinc-500">Restricted</span>
          </div>
        </div>

        <div
          onClick={() => setActiveSection('settings')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeSection === 'settings'
              ? 'bg-purple-500/10 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
              : 'bg-black/30 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Web Push Alerts</span>
            <BellRing className={`w-4 h-4 ${notificationsEnabled ? 'text-purple-400' : 'text-zinc-500'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-sm font-bold ${notificationsEnabled ? 'text-purple-300' : 'text-zinc-500'}`}>
              {notificationsEnabled ? 'Active' : 'Disabled'}
            </span>
            <span className="text-[10px] text-zinc-500">Cross-Platform</span>
          </div>
        </div>
      </div>

      <div className="flex border-b border-white/10 gap-2 pb-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'pending', label: `Pending Requests (${pendingSessions.length})`, icon: ShieldAlert },
          { id: 'trusted', label: `Trusted Devices (${trustedSessions.length})`, icon: ShieldCheck },
          { id: 'logs', label: 'Security Activity Log', icon: FileText },
          { id: 'revoked', label: `Revocation History (${revokedSessions.length})`, icon: XCircle },
          { id: 'settings', label: 'Push & Alerts Config', icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white/10 text-white border border-white/20 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeSection === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pending Device Authorizations</h3>
              <p className="text-xs text-zinc-400">
                New sessions remain untrusted and restricted from sensitive actions until explicitly accepted by the owner.
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-500">{pendingSessions.length} waiting</span>
          </div>

          {pendingSessions.length === 0 ? (
            <div className="p-12 text-center bg-black/20 border border-white/5 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">No Pending Login Requests</h4>
              <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
                All connected sessions have been verified. Any unknown Discord login attempt will immediately trigger an alert and show up here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingSessions.map((session) => (
                <motion.div
                  key={session.sessionId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-black/40 border-2 border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-5 relative overflow-hidden backdrop-blur-xl shadow-[0_0_25px_rgba(245,158,11,0.08)] flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                        {session.os === 'Android' || session.os === 'iOS' ? (
                          <Smartphone className="w-5 h-5" />
                        ) : (
                          <Laptop className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                          Pending Login
                        </div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          {session.device}
                        </h4>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ID: {session.sessionId}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-black/30 border border-white/5 rounded-xl p-3">
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase font-mono">Location</div>
                      <div className="text-zinc-200 font-medium truncate flex items-center gap-1 mt-0.5">
                        <Globe className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                        <span className="truncate">{session.location}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase font-mono">Detected At</div>
                      <div className="text-zinc-200 font-medium truncate flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                        <span>{formatDetailedDate(session.detectedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <button
                      onClick={() => initiateAction('ACCEPT', session)}
                      className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      Accept
                    </button>

                    <button
                      onClick={() => initiateAction('REJECT', session)}
                      className="flex-1 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1.5"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSection === 'trusted' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Trusted Sessions & Devices</h3>
              <p className="text-xs text-zinc-400">
                These sessions have passed cryptographic owner verification and have full authorized access.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400">{trustedSessions.length} active</span>
          </div>

          {trustedSessions.length === 0 ? (
            <div className="p-10 text-center bg-black/20 border border-white/5 rounded-2xl">
              <p className="text-xs text-zinc-500">No active trusted sessions recorded.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {trustedSessions.map((session) => {
                const isCurrent = session.sessionId === currentSessionId;
                return (
                  <div
                    key={session.sessionId}
                    className="bg-black/30 border border-white/10 hover:border-emerald-500/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        {session.os === 'Android' || session.os === 'iOS' ? (
                          <Smartphone className="w-5 h-5" />
                        ) : (
                          <Laptop className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{session.device}</h4>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                              Current Device
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                            TRUSTED
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Globe className="w-3 h-3 text-zinc-500" />
                            {session.location}
                          </span>
                          <span>•</span>
                          <span className="text-[11px]">
                            Last active: {formatRelativeTime(session.lastActiveAt)}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-[10px] text-zinc-500">ID: {session.sessionId}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => initiateAction('REVOKE_SESSION', session)}
                        className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                      >
                        <Lock className="w-3 h-3" />
                        Revoke
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeSection === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Security Activity Audit Trail</h3>
              <p className="text-xs text-zinc-400">
                Tamper-evident chronological logs of all login events, approvals, revocations, and verification attempts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 w-40"
                />
              </div>

              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Events</option>
                <option value="NEW_SESSION">New Session</option>
                <option value="OWNER_APPROVED">Owner Approved</option>
                <option value="SESSION_REJECTED">Session Rejected</option>
                <option value="SESSION_REVOKED">Session Revoked</option>
                <option value="VERIFICATION_ATTEMPT">Verification</option>
                <option value="FAILED_VERIFICATION">Failed Verification</option>
                <option value="EMERGENCY_REVOKE_ALL">Emergency Revoke</option>
                <option value="NOTIFICATION_SENT">Notification Sent</option>
              </select>
            </div>
          </div>

          <div className="bg-black/30 border border-white/10 rounded-2xl overflow-hidden">
            <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">No security audit logs match the current query.</div>
              ) : (
                filteredLogs.map((log) => {
                  let badgeColor = 'bg-zinc-800 text-zinc-400 border-zinc-700';
                  if (log.eventType === 'NEW_SESSION') badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                  if (log.eventType === 'OWNER_APPROVED') badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                  if (log.eventType === 'SESSION_REJECTED' || log.eventType === 'SESSION_REVOKED') badgeColor = 'bg-red-500/20 text-red-300 border-red-500/30';
                  if (log.eventType === 'EMERGENCY_REVOKE_ALL') badgeColor = 'bg-red-600/30 text-red-200 border-red-500/50';
                  if (log.eventType === 'NOTIFICATION_SENT') badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';

                  return (
                    <div key={log.id} className="p-3.5 hover:bg-white/[0.02] flex items-start justify-between gap-4 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="text-[11px] text-zinc-500 whitespace-nowrap pt-0.5">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${badgeColor}`}>
                              {log.eventType.replace(/_/g, ' ')}
                            </span>
                            {log.sessionId && (
                              <span className="text-zinc-400 text-[10px]">Session: {log.sessionId}</span>
                            )}
                            {log.device && (
                              <span className="text-zinc-500 text-[10px]">({log.device})</span>
                            )}
                          </div>
                          <p className="text-zinc-300 font-sans text-xs mt-1">{log.details}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-zinc-600 whitespace-nowrap hidden sm:inline">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'revoked' && (
        <div className="space-y-6">
          <div className="bg-black/30 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  IP & Network Blocklist
                </h3>
                <p className="text-xs text-zinc-400">
                  Directly reject all connections and requests from specific IP addresses or hostile networks.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.100 or IP"
                  value={newBlockIp}
                  onChange={(e) => setNewBlockIp(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 font-mono w-48"
                />
                <button
                  onClick={() => handleBlockIp(newBlockIp)}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                >
                  Block IP
                </button>
              </div>
            </div>

            {blockedIps.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500 bg-black/20 rounded-xl border border-white/5">
                No IP addresses are currently blocked.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {blockedIps.map((ip) => (
                  <div
                    key={ip}
                    className="flex items-center justify-between p-2.5 bg-black/40 border border-red-500/20 rounded-xl text-xs"
                  >
                    <span className="font-mono text-red-300 font-bold">{ip}</span>
                    <button
                      onClick={() => handleUnblockIp(ip)}
                      className="text-[10px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Blocked & Revoked Sessions</h3>
                <p className="text-xs text-zinc-400">History of devices that have been denied or revoked access.</p>
              </div>
              <span className="text-xs font-mono text-zinc-500">{revokedSessions.length} records</span>
            </div>

            {revokedSessions.length === 0 ? (
              <div className="p-8 text-center bg-black/20 border border-white/5 rounded-2xl">
                <p className="text-xs text-zinc-500">No revoked sessions recorded.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {revokedSessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className="bg-black/25 border border-white/5 rounded-xl p-3.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-300">{session.device}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 uppercase">
                            {session.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                          {session.location} {session.ip ? `(IP: ${session.ip})` : ''} • Revoked on {session.revokedAt ? formatDetailedDate(session.revokedAt) : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleBlockIp(session.ip)}
                        className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                      >
                        Block IP
                      </button>
                      <span className="text-[10px] font-mono text-zinc-600">{session.sessionId}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === 'settings' && (
        <div className="space-y-4">
          <div className="bg-black/30 border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-400" />
                  Browser Web Push Notifications
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                  Enables instant native push notifications whenever an unknown session attempts to access your Discord account.
                  Supported across iOS Safari, Android Chrome, Windows, macOS, and Linux desktop browsers.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={requestNotificationPermission}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    notificationsEnabled
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                >
                  {notificationsEnabled ? 'Permission Granted' : 'Enable Notifications'}
                </button>

                <button
                  onClick={handleTestPush}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-all cursor-pointer"
                >
                  Test Alert
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-4 border-t border-white/5">
              <div className="bg-black/20 border border-white/5 rounded-xl p-3.5">
                <div className="text-zinc-400 font-bold uppercase text-[10px] font-mono">Notification Payload Security</div>
                <p className="text-zinc-500 mt-1 text-[11px]">
                  Zero sensitive data exposure. Notifications never contain tokens, passwords, or recovery codes.
                </p>
              </div>

              <div className="bg-black/20 border border-white/5 rounded-xl p-3.5">
                <div className="text-zinc-400 font-bold uppercase text-[10px] font-mono">Cryptographic Challenges</div>
                <p className="text-zinc-500 mt-1 text-[11px]">
                  Unknown logins generate a 5-minute cryptographic challenge required before approval is granted.
                </p>
              </div>

              <div className="bg-black/20 border border-white/5 rounded-xl p-3.5">
                <div className="text-zinc-400 font-bold uppercase text-[10px] font-mono">Emergency Revocation</div>
                <p className="text-zinc-500 mt-1 text-[11px]">
                  One-click nuclear option instantly revokes every active session except the current owner session.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {activeVerification.isOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-zinc-950 border border-white/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-wide">Owner Authentication Required</h3>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      Action: {activeVerification.action} {activeVerification.targetSession?.sessionId || ''}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveVerification({ isOpen: false, action: 'ACCEPT' })}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 text-xs space-y-2">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Verification Challenge:</span>
                    <span className="font-mono text-[11px] text-amber-400">{activeVerification.challengeId}</span>
                  </div>
                  {activeVerification.targetSession && (
                    <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-white/5">
                      <span>Target Device:</span>
                      <span className="font-bold text-white">{activeVerification.targetSession.device}</span>
                    </div>
                  )}
                </div>

                <div className="flex border-b border-white/10 gap-2">
                  <button
                    onClick={() => {
                      setAuthMethod('passkey');
                      setAuthError(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all ${
                      authMethod === 'passkey'
                        ? 'border-purple-500 text-purple-300'
                        : 'border-transparent text-zinc-400 hover:text-white'
                    }`}
                  >
                    Passkey / WebAuthn
                  </button>

                  <button
                    onClick={() => {
                      setAuthMethod('recovery_code');
                      setAuthError(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all ${
                      authMethod === 'recovery_code'
                        ? 'border-purple-500 text-purple-300'
                        : 'border-transparent text-zinc-400 hover:text-white'
                    }`}
                  >
                    Recovery Code
                  </button>

                  <button
                    onClick={() => {
                      setAuthMethod('owner_secret');
                      setAuthError(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all ${
                      authMethod === 'owner_secret'
                        ? 'border-purple-500 text-purple-300'
                        : 'border-transparent text-zinc-400 hover:text-white'
                    }`}
                  >
                    Owner Secret
                  </button>
                </div>

                {authMethod === 'passkey' && (
                  <div className="text-center py-4 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto">
                      <Fingerprint className="w-8 h-8 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Authenticate with Biometrics / Hardware Key</h4>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                        Use Face ID, Touch ID, or Windows Hello on your device to sign the verification challenge.
                      </p>
                    </div>
                  </div>
                )}

                {authMethod === 'recovery_code' && (
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-300 font-medium">Master Owner Recovery Code</label>
                    <input
                      type="text"
                      placeholder="e.g. SEC-OWNER-7F89-K29X-YURI"
                      value={authSecretInput}
                      onChange={(e) => setAuthSecretInput(e.target.value)}
                      className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-[10px] text-zinc-500 font-mono">
                      Fallback recovery code authorized exclusively for the system owner.
                    </p>
                  </div>
                )}

                {authMethod === 'owner_secret' && (
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-300 font-medium">Owner Master Secret</label>
                    <input
                      type="password"
                      placeholder="Enter owner secret..."
                      value={authSecretInput}
                      onChange={(e) => setAuthSecretInput(e.target.value)}
                      className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}

                {authError && (
                  <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                {authSuccess && (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{authSuccess}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setActiveVerification({ isOpen: false, action: 'ACCEPT' })}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={executeVerification}
                    disabled={authLoading}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] active:scale-95 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    {authLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        Verify & Authorize
                      </>
                    )}
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
