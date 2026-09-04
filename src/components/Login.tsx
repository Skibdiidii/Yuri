import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { Globe, MapPin, Search, Shield, ShieldAlert, X, Copy, Check, MessageSquare } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

const VPN_COUNTRIES = [
  { id: 'us', name: 'United States', flag: '🇺🇸', latency: '42ms' },
  { id: 'gb', name: 'United Kingdom', flag: '🇬🇧', latency: '18ms' },
  { id: 'ca', name: 'Canada', flag: '🇨🇦', latency: '55ms' },
  { id: 'de', name: 'Germany', flag: '🇩🇪', latency: '12ms' },
  { id: 'fr', name: 'France', flag: '🇫🇷', latency: '15ms' },
  { id: 'nl', name: 'Netherlands', flag: '🇳🇱', latency: '14ms' },
  { id: 'jp', name: 'Japan', flag: '🇯🇵', latency: '210ms' },
  { id: 'sg', name: 'Singapore', flag: '🇸🇬', latency: '180ms' },
  { id: 'au', name: 'Australia', flag: '🇦🇺', latency: '240ms' },
  { id: 'br', name: 'Brazil', flag: '🇧🇷', latency: '145ms' },
  { id: 'in', name: 'India', flag: '🇮🇳', latency: '160ms' },
  { id: 'kr', name: 'South Korea', flag: '🇰🇷', latency: '195ms' },
  { id: 'se', name: 'Sweden', flag: '🇸🇪', latency: '22ms' },
  { id: 'ch', name: 'Switzerland', flag: '🇨🇭', latency: '19ms' },
];

export default function Login({ onLoginSuccess }: LoginProps) {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'login' | 'email' | 'getToken' | 'oauth'>('login');
  
  
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(() => localStorage.getItem('yuri_tos_accepted') === 'true');
  const handleAcceptTerms = (checked: boolean) => {
    setTermsAccepted(checked);
    if (checked) localStorage.setItem('yuri_tos_accepted', 'true');
    else localStorage.removeItem('yuri_tos_accepted');
  };
  
  
  const [showVpnModal, setShowVpnModal] = useState(false);
  const [vpnEnabled, setVpnEnabled] = useState(false);
  const [vpnCountry, setVpnCountry] = useState(VPN_COUNTRIES[0]);
  const [vpnSearch, setVpnSearch] = useState('');
  
  const [showCommunityModal, setShowCommunityModal] = useState(true);
  const [communityCopied, setCommunityCopied] = useState(false);
  const handleCopyCommunityLink = async () => {
    const inviteLink = 'https://discord.gg/z5BwKZwtVe';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inviteLink);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = inviteLink;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCommunityCopied(true);
      setTimeout(() => setCommunityCopied(false), 2500);
      window.open(inviteLink, '_blank');
    } catch (err) {
      console.error('Failed to copy community link:', err);
    }
  };
  
  const [discordUser, setDiscordUser] = useState<any>(() => {
    const saved = localStorage.getItem('discord_user');
    return saved ? JSON.parse(saved) : null;
  });

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data.user) {
        const user = event.data.user;
        setDiscordUser(user);
        localStorage.setItem('discord_user', JSON.stringify(user));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleDiscordLogin = async () => {
    if (!termsAccepted) {
      setError('You must accept the Terms of Service and Privacy Policy to continue.');
      return;
    }
    try {
      const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/discord/callback`);
      const res = await fetch(`/api/auth/discord/url?redirect_uri=${redirectUri}&client_id=1545409686164086834`);
      const data = await res.json();
      if (data?.url) {
        window.open(data.url, 'discord_auth', 'width=600,height=700');
      } else {
        throw new Error('No OAuth URL returned');
      }
    } catch (e) {
      const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/discord/callback`);
      const directUrl = `https://discord.com/api/oauth2/authorize?client_id=1545409686164086834&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email%20guilds.join`;
      window.open(directUrl, 'discord_auth', 'width=600,height=700');
    }
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError('You must accept the Terms of Service and Privacy Policy to continue.');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const res = await api.login(token);
      localStorage.setItem('token', res.session.token);
      localStorage.setItem('catalystcord_user_token', res.session.token);
      localStorage.setItem('token_user', JSON.stringify(res.session));
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid token or connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const [copiedToken, setCopiedToken] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError('You must accept the Terms of Service and Privacy Policy to continue.');
      return;
    }
    setLoading(true);
    setError('');
    setCopySuccess(false);
    
    try {
      const res = await fetch('/api/auth/extract-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract token');
      }
      
      
      if (data.token) {
        setCopiedToken(data.token);
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(data.token);
          } else {
            const textarea = document.createElement('textarea');
            textarea.value = data.token;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
          }
          setCopySuccess(true);
        } catch (err) {
          console.error('Failed to copy token:', err);
        }
      }

      
      const loginRes = await api.login(data.token);
      localStorage.setItem('token', loginRes.session.token);
      localStorage.setItem('catalystcord_user_token', loginRes.session.token);
      localStorage.setItem('token_user', JSON.stringify(loginRes.session));
      
      
      setTimeout(() => {
        onLoginSuccess();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-start md:justify-center font-sans overflow-y-auto py-8 px-4 custom-scrollbar">
      <div className="absolute inset-0 z-0 bg-black/80 backdrop-blur-2xl fixed" />
      <div className="absolute inset-0 z-0 bg-gradient-to-tr from-indigo-900/20 via-black to-blue-900/10 fixed" />

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[460px] p-6 sm:p-8 md:p-10 bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-[2rem] shadow-2xl z-10 relative my-auto max-h-[88vh] overflow-y-auto custom-scrollbar"
      >
        <div className="mb-8 text-center">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#5865F2]/20 border border-[#5865F2]/50 mb-6 shadow-inner cursor-pointer"
            onClick={() => window.open('https://discord.com/login', '_blank')}
          >
            <svg className="w-8 h-8 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
          </motion.div>
          
          <h1 className="text-3xl font-medium tracking-tight text-white mb-2">Welcome to Yuri</h1>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-2 relative">
              <span className="text-zinc-400 font-medium tracking-wide">Yuri Dashboard</span>
            </div>
            
            <div className="w-px h-6 bg-white/10" />
            
            <button
              onClick={() => setShowVpnModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                vpnEnabled 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-zinc-800/50 border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Shield className={`w-4 h-4 ${vpnEnabled ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {vpnEnabled ? vpnCountry.id : 'VPN'}
              </span>
            </button>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mt-6 border-b border-white/5 pb-4">
            <button 
              onClick={() => setActiveTab('login')}
              className={`text-sm font-medium transition-all duration-300 relative ${activeTab === 'login' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Token Login
              {activeTab === 'login' && <motion.div layoutId="indicator" className="absolute -bottom-2 left-0 right-0 h-0.5 bg-white rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('email')}
              className={`text-sm font-medium transition-all duration-300 relative ${activeTab === 'email' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Email Login
              {activeTab === 'email' && <motion.div layoutId="indicator" className="absolute -bottom-2 left-0 right-0 h-0.5 bg-white rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('oauth')}
              className={`text-sm font-medium transition-all duration-300 relative ${activeTab === 'oauth' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              OAuth
              {activeTab === 'oauth' && <motion.div layoutId="indicator" className="absolute -bottom-2 left-0 right-0 h-0.5 bg-white rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('getToken')}
              className={`text-sm font-medium transition-all duration-300 relative ${activeTab === 'getToken' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Guide
              {activeTab === 'getToken' && <motion.div layoutId="indicator" className="absolute -bottom-2 left-0 right-0 h-0.5 bg-white rounded-full" />}
            </button>
            <button 
              type="button"
              onClick={() => {
                window.history.pushState({}, '', '/console');
                window.dispatchEvent(new Event('popstate'));
              }}
              className={`text-sm font-medium transition-all duration-300 relative text-zinc-500 hover:text-zinc-300`}
            >
              Terminal
            </button>
          </div>
        </div>

        {activeTab === 'oauth' ? (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed">
              <p className="font-semibold text-amber-400 mb-1">⚠️ Important Note on OAuth:</p>
              <p>
                OAuth authentication is ONLY for accessing the web dashboard interface. Full Discord client automation, RPC customization, voice channel tools, and gateway operations require providing an account user Token.
              </p>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-sm text-zinc-300">Dashboard UI & Monitoring Access</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-sm text-zinc-300">Secure OAuth Identity Verification</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-sm text-zinc-300">Requires Token for Active Features</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-3.5 py-2.5 rounded-lg border border-white/5">
              <span>OAuth Client ID:</span>
              <span className="text-indigo-400 select-all font-bold tracking-wider">1545409686164086834</span>
            </div>

            <button
              onClick={handleDiscordLogin}
              className="w-full py-4 bg-indigo-600/90 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
              <svg className="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              <span className="relative z-10">Continue with Discord OAuth</span>
            </button>
            {error && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-sm text-center font-medium bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</motion.div>
            )}
          </div>
        ) : activeTab === 'login' ? (
          <motion.form 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
            onSubmit={handleTokenSubmit} className="space-y-5"
          >
            <div>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Authentication Token"
                className="w-full px-5 py-4 bg-zinc-900 border border-white/10 rounded-xl focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all placeholder:text-zinc-600 text-white text-sm"
                required
              />
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-sm text-center font-medium bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-white text-zinc-900 font-semibold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:hover:bg-white"
            >
              {loading ? 'Authenticating...' : 'Enter Dashboard'}
            </button>
          </motion.form>
        ) : activeTab === 'email' ? (
          <motion.form 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
            onSubmit={handleEmailSubmit} className="space-y-5"
          >
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-200">
              <ShieldAlert className="w-5 h-5 shrink-0 text-red-400" />
              <div className="text-sm">
                <p className="font-semibold text-red-400 mb-1">Warning:</p>
                <p>You must enable VPN to prevent discord from disabling your account and before using this.</p>
              </div>
            </div>

            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Discord Email"
                className="w-full px-5 py-4 bg-zinc-900 border border-white/10 rounded-xl focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all placeholder:text-zinc-600 text-white text-sm"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-5 py-4 bg-zinc-900 border border-white/10 rounded-xl focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all placeholder:text-zinc-600 text-white text-sm"
                required
              />
            </div>

            {copySuccess && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-emerald-400 text-xs text-center font-medium bg-emerald-500/10 py-2.5 px-3 rounded-lg border border-emerald-500/20 flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                <span>Token automatically extracted & copied to clipboard! Logging in...</span>
              </motion.div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-sm text-center font-medium bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-white text-zinc-900 font-semibold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:hover:bg-white flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-zinc-900/20 border-t-zinc-900 rounded-full animate-spin"/>}
              {loading ? 'Processing...' : 'Secure Login'}
            </button>
          </motion.form>
        ) : (
          <motion.div 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
            className="space-y-5 text-sm text-zinc-400 bg-black/20 p-6 rounded-xl border border-white/5"
          >
            <p className="font-medium text-white mb-2 text-base">How to get your token:</p>
            <ol className="list-decimal list-outside ml-4 space-y-3">
              <li>Open Discord in your browser.</li>
              <li>Press <code className="bg-zinc-800 text-zinc-200 px-1.5 py-0.5 rounded font-mono text-xs">Ctrl + Shift + I</code> to open Developer Tools.</li>
              <li>Navigate to the <span className="text-zinc-200 font-medium">Network</span> tab.</li>
              <li>Refresh the page (<code className="bg-zinc-800 text-zinc-200 px-1.5 py-0.5 rounded font-mono text-xs">F5</code>).</li>
              <li>Filter by <code className="bg-zinc-800 text-zinc-200 px-1.5 py-0.5 rounded font-mono text-xs text-blue-300">/api/v9/users/@me</code>.</li>
              <li>Select the request and find <span className="text-zinc-200 font-medium whitespace-nowrap">Authorization</span> in Headers.</li>
            </ol>
          </motion.div>
        )}
        
                <div className="mt-8 pt-6 border-t border-white/5">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={termsAccepted}
                onChange={(e) => handleAcceptTerms(e.target.checked)}
              />
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${termsAccepted ? 'bg-indigo-500 border-indigo-500' : 'bg-black/40 border-white/20 group-hover:border-white/40'}`}>
                {termsAccepted && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 select-none">
              I have read and agree to Yuri's <button type="button" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }} className="text-zinc-300 hover:text-white underline underline-offset-2 transition-colors">Terms of Service</button> and <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }} className="text-zinc-300 hover:text-white underline underline-offset-2 transition-colors">Privacy Policy</button>.
            </p>
          </label>
        </div>

        <div className="mt-6 text-center text-xs text-zinc-500 font-mono flex items-center justify-center gap-1">
          <span>©️ {new Date().getFullYear()} Yuri. All rights reserved. Proprietary design & architecture.</span>
        </div>
      </motion.div>

      <AnimatePresence>
        {showTermsModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Terms of Service</h3>
                <button onClick={() => setShowTermsModal(false)} className="p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto text-sm text-zinc-300 leading-relaxed custom-scrollbar space-y-4">
                <p>
                  <strong>1. Acceptance of Terms:</strong> By accessing or using Yuri, you confirm that you have read, understood, and agreed to be bound by these Terms of Service. These terms apply to all visitors, users, and others who access the service. If you disagree with any part of the terms, you may not access the service. Usage of this software implies you fully understand the consequences and the risks associated with third-party Discord clients. <strong>You agree that you will not use Yuri to engage in harassment, abuse, spam, or malicious acts toward Discord users, communities, or infrastructure. You must respect the Discord platform and its users at all times.</strong>
                </p>
                <p>
                  <strong>2. Use of Service:</strong> Yuri is provided as a third-party application dashboard. You agree to use the service responsibly and in compliance with all applicable local, national, and international laws and regulations. You represent that your account credential usage is authorized by you for the purposes intended by Yuri. This software is geared towards advanced users who wish to automate, manage, or expand their Discord experience without adhering entirely to the constraints of the standard web or desktop client. <strong>Any abusive use of Yuri, including unauthorized token access or large-scale disruption (e.g. nuking, raiding, or automated harassment), constitutes a strict violation of these Terms.</strong>
                </p>
                <p>
                  <strong>3. Interaction with Discord API and Potential Risks:</strong> Our service utilizes methods to authenticate and interact with your Discord account via the official REST API and WebSocket gateway. Although we incorporate anti-detection spoofing features to minimize risks, using third-party clients and automation functionalities is strictly against Discord's Terms of Service. By utilizing this software, you intentionally override standard permissions and engage with the API in an unapproved manner. Discord actively monitors anomalous behaviors. You acknowledge that you use Yuri at your entirely own personal risk. We are not responsible for any account suspensions, bans, terminations, shadowbans, or other punitive actions taken by Discord as a result of using this service. If your account is flagged by Discord's automated Trust and Safety systems, no liability falls upon the creators or maintainers of Yuri.
                </p>
                <p>
                  <strong>4. IP Masking and Virtual Private Networks (VPN):</strong> Yuri offers built-in routing mechanisms designed to spoof metadata or tunnel traffic to mitigate tracking. However, no system is perfectly secure. Users relying on our email/password automated login flow heavily increase the risk of Discord's security verification triggering, particularly if connecting from anomalous datacenter IP ranges instead of residential ones. We strongly advise using the built-in spoofing or providing your own residential proxy routes when available. The VPN feature exists as an architectural layer, but its efficacy depends entirely on the routing infrastructure backing it.
                </p>
                <p>
                  <strong>5. Intellectual Property and Licensing:</strong> The Yuri client interface, original dashboard designs, bespoke code features, and branding assets are exclusive intellectual properties of the Yuri developers. Reverse engineering the client or attempting to strip safeguards out of the dashboard is prohibited. We do not claim ownership of the Discord platform, trademark, or its proprietary API wrappers.
                </p>
                <p>
                  <strong>6. Disclaimer of Warranty:</strong> The service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, either express or implied, regarding the reliability, security, or availability of the service. We disclaim all warranties of merchantability, fitness for a particular purpose, non-infringement, and any warranties arising out of course of dealing or usage of trade.
                </p>
                <p>
                  <strong>7. Limitation of Liability:</strong> In no event shall Yuri, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the service; (ii) any conduct or content of any third party on the service; (iii) any content obtained from the service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage, and even if a remedy set forth herein is found to have failed of its essential purpose.
                </p>
                <p>
                  <strong>8. User Responsibilities and Conduct:</strong> You are solely responsible for your conduct and any data, text, files, information, usernames, images, graphics, photos, profiles, audio and video clips, sounds, musical works, works of authorship, applications, links and other content or materials that you submit, post or display on or via the service. You must not interfere or disrupt the service or servers or networks connected to the service, including by transmitting any worms, viruses, spyware, malware or any other code of a destructive or disruptive nature. You may not inject content or code or otherwise alter or interfere with the way any Yuri page is rendered or displayed in a user's browser or device. You agree not to use the service for illegal purposes, harassment, spam, unsolicited promotional materials, or to distribute malicious payloads through the Discord API via our client interfaces. We do not police user behavior on Discord; your ethics and actions remain completely your burden.
                </p>
                <p>
                  <strong>9. Support and Maintenance:</strong> Yuri is provided as a hobbyist tool. There is no guaranteed Service Level Agreement (SLA) for uptime, nor any obligation on the part of the developers to provide customer support, bug fixes, or functionality updates. The platform relies on undocumented API endpoints that can change without warning, potentially breaking functionality instantly. If such an event occurs, you accept that Yuri may cease to function entirely, with no scheduled timeline for recovery.
                </p>
                <p>
                  <strong>10. Modification of Terms:</strong> We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, in whole or in part, please stop using the website and the service.
                </p>
                <p>
                  <strong>11. Service Interruption and Termination:</strong> We may terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the service will immediately cease. We do not guarantee that our service, or any content on it, will always be available or be uninterrupted. We may suspend or withdraw or restrict the availability of all or any part of our service for business and operational reasons. Repeated abuse of our servers (such as attempting rate-limit bypasses) will result in permanent hardware ID and IP bans from the dashboard.
                </p>
                <p>
                  <strong>12. Governing Law:</strong> These Terms shall be governed and construed in accordance with the laws of the applicable jurisdiction, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect. These Terms constitute the entire agreement between us regarding our service, and supersede and replace any prior agreements we might have between us regarding the service. By clicking below, interacting with the application, or passing authentication credentials into our system, you mathematically and legally signify your agreement with these entire constraints.
                </p>

                <div className="mt-6 pt-6 border-t border-indigo-500/30 bg-indigo-500/10 p-4 rounded-xl border">
                  <h4 className="font-semibold text-indigo-300 text-base mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    6 Core Rules of TOS (Updated Guidelines)
                  </h4>
                  <ul className="space-y-2 text-xs text-zinc-300 list-disc list-inside">
                    <li><strong>Rule 1 - Platform Rate Limits:</strong> All automated commands must strictly observe rate limits to protect server infrastructure.</li>
                    <li><strong>Rule 2 - Account Accountability:</strong> You maintain sole responsibility for all actions performed using your authentication token.</li>
                    <li><strong>Rule 3 - Anti-Exploitation:</strong> Using script execution endpoints for reverse engineering or malicious payloads is strictly prohibited.</li>
                    <li><strong>Rule 4 - Anti-Spam Policy:</strong> Mass DM, automated channel spamming, or harassment is strictly forbidden and results in an immediate ban.</li>
                    <li><strong>Rule 5 - Local Token Processing:</strong> Tokens are processed locally in your browser session and never stored on third-party remote databases.</li>
                    <li><strong>Rule 6 - Key Termination:</strong> Any detected abuse or attempts to bypass security controls will result in permanent hardware and IP key termination.</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showPrivacyModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Privacy Policy</h3>
                <button onClick={() => setShowPrivacyModal(false)} className="p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto text-sm text-zinc-300 leading-relaxed custom-scrollbar space-y-4">
                <p>
                  <strong>1. Data Collection:</strong> We respect your privacy and are committed to protecting it. When you use Yuri and log in using your Discord credentials (whether via token or email), we handle your authentication data securely. Your Discord token is stored entirely locally on your device within your browser's local storage or memory. We do not transmit your Discord token to any external databases or remote third-party servers.
                </p>
                <p>
                  <strong>2. Data Usage:</strong> Your tokens are strictly used to authenticate your session directly with the Discord API to enable the features within the Yuri dashboard. Local storage ensures your session persists without needing to log in constantly, but you maintain full control.
                </p>
                <p>
                  <strong>3. Third-Party Access:</strong> We do not sell, trade, or rent your personal identification information to others. The only communications made are directly between your client (the browser) and Discord's active endpoints. The internal VPN function routes requests safely to hide your original IP from Discord's telemetry.
                </p>
                <p>
                  <strong>4. User Rights:</strong> You have the right to clear your local storage at any time to remove your tokens or simply use the "Logout" button provided within the dashboard, which immediately wipes stored authentication data from your device.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showVpnModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Yuri VPN</h3>
                    <p className="text-xs text-zinc-400">Secure your connection</p>
                  </div>
                </div>
                <button onClick={() => setShowVpnModal(false)} className="p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-200">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400" />
                  <div className="text-xs leading-relaxed space-y-2">
                    <p>
                      Use this to prevent discord from harming your account, this is useful for the email login when you don't know how to get your token and when you login discord detects you simply enable this VPN and choose a country then login via email if you don't have your token.
                    </p>
                    <p className="text-emerald-400 font-medium pt-1 border-t border-amber-500/20 mt-2">
                      🛡️ All VPN nodes provided are built into Yuri. This serves to protect your client connection and hide your IP from malicious actors.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={vpnSearch}
                    onChange={(e) => setVpnSearch(e.target.value)}
                    placeholder="Search locations..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-zinc-500 tracking-wider mb-2">Available Locations</h4>
                  {VPN_COUNTRIES.filter(c => c.name.toLowerCase().includes(vpnSearch.toLowerCase()) || c.id.toLowerCase().includes(vpnSearch.toLowerCase())).map((country) => (
                    <button
                      key={country.id}
                      onClick={() => setVpnCountry(country)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                        vpnCountry.id === country.id 
                          ? 'bg-indigo-500/10 border-indigo-500/30' 
                          : 'bg-zinc-900 border-transparent hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{country.flag}</span>
                        <span className="text-sm font-medium text-zinc-200">{country.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">{country.latency}</span>
                        <div className={`w-3 h-3 rounded-full border-2 ${vpnCountry.id === country.id ? 'border-indigo-500 bg-indigo-500' : 'border-zinc-700'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-white/5 bg-zinc-900/50">
                <button
                  onClick={() => {
                    setVpnEnabled(!vpnEnabled);
                    if (!vpnEnabled) {
                      setTimeout(() => setShowVpnModal(false), 500);
                    }
                  }}
                  className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                    vpnEnabled 
                      ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-500'
                  }`}
                >
                  <Shield className="w-5 h-5" />
                  {vpnEnabled ? 'Connected to ' + vpnCountry.name : 'Connect to VPN'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showCommunityModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 120 }}
              className="w-full max-w-md bg-zinc-950 border border-[#5865F2]/20 rounded-3xl shadow-[0_0_50px_rgba(88,101,242,0.15)] overflow-hidden flex flex-col relative"
            >
              <button 
                onClick={() => setShowCommunityModal(false)} 
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-8 text-center flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-[#5865F2]/20 blur-xl rounded-full" />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-[#5865F2]/30 to-[#5865F2]/10 border border-[#5865F2]/40 flex items-center justify-center text-white shadow-lg shadow-[#5865F2]/15">
                    <MessageSquare className="w-10 h-10 text-[#5865F2]" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                  Join our Community Server
                </h3>
                
                <p className="text-sm text-zinc-400 leading-relaxed max-w-[320px] mb-8">
                  Get the latest updates, premium scripts, live support, and connect with other users in our official server.
                </p>

                <button
                  onClick={handleCopyCommunityLink}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all active:scale-98 cursor-pointer ${
                    communityCopied 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-[#5865F2] text-white hover:bg-[#4752C4] hover:shadow-lg hover:shadow-[#5865F2]/20'
                  }`}
                >
                  {communityCopied ? (
                    <>
                      <Check className="w-5 h-5 text-emerald-400 animate-bounce" />
                      <span>Copied & Opening Server!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 text-white/90" />
                      <span>Copy Link & Join Now</span>
                    </>
                  )}
                </button>

                <div className="w-full mt-4 bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-mono text-zinc-500">
                  <span className="truncate">discord.gg/z5BwKZwtVe</span>
                  <button 
                    onClick={handleCopyCommunityLink}
                    className="text-[#5865F2] hover:text-[#4752C4] font-bold px-2 py-1 bg-[#5865F2]/5 hover:bg-[#5865F2]/10 rounded transition-colors"
                  >
                    Copy
                  </button>
                </div>

                <button
                  onClick={() => setShowCommunityModal(false)}
                  className="mt-6 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest cursor-pointer py-1 px-3"
                >
                  Continue to Login
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute bottom-2 left-0 right-0 text-center text-[8px] text-zinc-800/20 select-none tracking-widest opacity-20 hover:opacity-100 transition-opacity z-10 pointer-events-auto">
        crafted by harumi (@myeyesaregoingdownx)
      </div>
    </div>
  );
}
