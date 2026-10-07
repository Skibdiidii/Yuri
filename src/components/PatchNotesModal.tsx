import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Sparkles, Shield, Rocket, Info, Eye, Layers, RefreshCw, Cpu, Globe, Lock, Key, Bell, Monitor, Mic, Music, Radio, CheckCircle, Bot, Server } from 'lucide-react';

interface PatchNotesModalProps {
  onClose: () => void;
}

export default function PatchNotesModal({ onClose }: PatchNotesModalProps) {
  const patchHistory = [
    {
      version: "v1.4.4-stable",
      date: "October 2026",
      updates: [
        {
          title: "Discord Gateway Authentication & Token Refresh",
          icon: <Bot className="w-5 h-5 text-emerald-400" />,
          description: "Updated Discord Gateway authentication pipeline with refreshed credentials, ensuring 24/7 background uptime and instant gateway handshakes."
        },
        {
          title: "Render Allowed Hosts & Security Whitelist",
          icon: <Server className="w-5 h-5 text-cyan-400" />,
          description: "Configured allowed host validation for yuri-bfwg.onrender.com domain and wildcards, eliminating host blockades and maintaining continuous HTTP/WebSocket proxying."
        }
      ]
    },
    {
      version: "v1.4.3-stable",
      date: "October 2026",
      updates: [
        {
          title: "App Detection & Background Music Scrobbler",
          icon: <Music className="w-5 h-5 text-emerald-400" />,
          description: "Dedicated App Detection tab with live Last.fm scrobbler integration to auto-detect whatever music is playing (Spotify, YouTube Music, Apple Music, Tidal, Desktop players) and sync real-time rich presence to Discord even when browser is closed."
        },
        {
          title: "Comprehensive Application RPC Presets",
          icon: <Radio className="w-5 h-5 text-indigo-400" />,
          description: "Instant 1-click rich presence profiles for Visual Studio Code, IntelliJ, Roblox, Minecraft, VALORANT, Counter-Strike 2, Twitch, Netflix, and Crunchyroll with official verified badges and high-res icons."
        },
        {
          title: "Realtime Discord Screen Live Preview Monitor",
          icon: <Monitor className="w-5 h-5 text-purple-400" />,
          description: "Live Discord-style viewport monitor displaying current video and image streams with real-time FPS counter, resolution badge, volume level, and Discord LIVE broadcast overlays."
        },
        {
          title: "VC Microphone Audio Dispatch Engine Fix",
          icon: <Mic className="w-5 h-5 text-cyan-400" />,
          description: "Enhanced raw PCM transcode pipeline with converted Opus framing, automatic unmuting, and active speaking packets for crisp, zero-latency microphone audio transmission in Discord voice channels."
        },
        {
          title: "Owner Designation: Chanya Amara",
          icon: <CheckCircle className="w-5 h-5 text-amber-400" />,
          description: "Updated verified owner badges, community presets, and platform designations under Chanya Amara."
        }
      ]
    },
    {
      version: "v1.4.2-stable",
      date: "October 2026",
      updates: [
        {
          title: "Cloud Stream Runtime & Sharp Native Compatibility",
          icon: <Cpu className="w-5 h-5 text-cyan-400" />,
          description: "Implemented headless sharp and native video decoder shims ensuring 100% deployment reliability on Linux cloud containers and Render runtimes."
        },
        {
          title: "Discord Account User App Authorization",
          icon: <Zap className="w-5 h-5 text-purple-400" />,
          description: "Fixed installation type errors by switching Russian Controller Bot OAuth to direct account user installation (integration_type=1), enabling instant authorization inside user accounts."
        },
        {
          title: "Native Discord UDP Screenshare Protocol",
          icon: <Monitor className="w-5 h-5 text-indigo-400" />,
          description: "Integrated @gabrielmaialva33/discord-video-stream with native Discord UDP packetization, H.264/VP8 video encoding, and preview thumbnails so viewers can watch high-res screen streams with zero blank screens."
        },
        {
          title: "VC Mic Audio File Transmitter",
          icon: <Mic className="w-5 h-5 text-emerald-400" />,
          description: "Upload any audio file (MP3, WAV, OGG, M4A), preview sound locally in-browser, and broadcast directly through your voice channel microphone with loop and interval repeat controls."
        },
        {
          title: "Intelligent AI Website Architect & Live Preview",
          icon: <Sparkles className="w-5 h-5 text-amber-400" />,
          description: "Separated AI chat explanations from production code generation, automatically injecting styled Tailwind websites into the browser preview tab."
        }
      ]
    },
    {
      version: "v1.4.1-stable",
      date: "October 2026",
      updates: [
        {
          title: "Discord Remote Session Kick Engine",
          icon: <Zap className="w-5 h-5 text-indigo-400" />,
          description: "Direct Discord API integration to kick remote phones, tablets, and computers immediately out of your Discord account."
        },
        {
          title: "Auto-Kick Untrusted Discord Logins",
          icon: <Shield className="w-5 h-5 text-emerald-400" />,
          description: "Real-time daemon that automatically evicts unrecognized Discord logins in milliseconds before unauthorized activity can occur."
        },
        {
          title: "Multi-User Security Profile Isolation",
          icon: <Key className="w-5 h-5 text-amber-400" />,
          description: "Every user account receives isolated device inventories, emergency recovery keys, and independent firewall controls."
        }
      ]
    },
    {
      version: "v1.4.0-stable",
      date: "October 2026",
      updates: [
        {
          title: "Owner Security & Session Protection",
          icon: <Shield className="w-5 h-5 text-amber-400" />,
          description: "Full owner verification challenge workflow with WebAuthn Passkeys, Recovery Codes, and unauthorized session lockdown."
        },
        {
          title: "Multi-Platform Web Push Alerts",
          icon: <Bell className="w-5 h-5 text-purple-400" />,
          description: "Instant native push alerts on iOS, Android, macOS, Linux, and Windows whenever an unknown device connects."
        },
        {
          title: "Session Inventory & Emergency Revocation",
          icon: <Lock className="w-5 h-5 text-red-400" />,
          description: "One-click emergency revocation to terminate all other active sessions and tamper-evident audit logging."
        }
      ]
    },
    {
      version: "v1.3.2-stable",
      date: "September 2026",
      updates: [
        {
          title: "Terminal & Cyber Engine AI",
          icon: <Sparkles className="w-5 h-5 text-emerald-400" />,
          description: "Full interactive Linux PTY shell with real-time xterm streaming and completely unrestricted Cyber Engine AI agent."
        },
        {
          title: "Hardened Account Access Security",
          icon: <Shield className="w-5 h-5 text-purple-400" />,
          description: "Strict administrator control lockdown enforcing verification exclusively for authorized owner account."
        }
      ]
    },
    {
      version: "v1.3.1-stable",
      date: "September 2026",
      updates: [
        {
          title: "Cloud Node & Virtualization Protocol Optimization",
          icon: <Cpu className="w-5 h-5 text-emerald-400" />,
          description: "Refactored background Linux execution runtimes with zero-latency socket streaming and instant health diagnostics."
        },
        {
          title: "Advanced Tunnel Gateway Reliability",
          icon: <Globe className="w-5 h-5 text-blue-400" />,
          description: "Enhanced reverse relay tunneling pipelines with auto-reconnection and seamless TCP socket multiplexing."
        },
        {
          title: "Multi-Layered Interface Polish",
          icon: <Sparkles className="w-5 h-5 text-purple-400" />,
          description: "Upgraded real-time terminal telemetry monitors and synchronized cross-device control states."
        }
      ]
    },
    {
      version: "v1.3.0-stable",
      date: "September 2026",
      updates: [
        {
          title: "High-Performance Session Synchronization",
          icon: <RefreshCw className="w-5 h-5 text-red-500" />,
          description: "Refactored active session synchronization pipelines for instantaneous telemetry updates and persistent background health monitoring."
        },
        {
          title: "Workspace Architecture Hardening",
          icon: <Shield className="w-5 h-5 text-purple-400" />,
          description: "Enhanced multi-environment workspace navigation, verified token authentication persistence, and optimized daemon state rendering."
        },
        {
          title: "Ultra HD Visuals & Smooth Motion Physics",
          icon: <Rocket className="w-5 h-5 text-blue-400" />,
          description: "Fine-tuned cinematic backdrop responsiveness, glassmorphic layout depth, and buttery 60 FPS scroll transitions across all views."
        }
      ]
    },
    {
      version: "v1.2.9-stable",
      date: "September 2026",
      updates: [
        {
          title: "Transparent Glass Minimalist Architecture",
          icon: <Layers className="w-5 h-5 text-red-500" />,
          description: "Applied comprehensive transparency and backdrop blur to all headers, buttons, cards, tickers, modals, and interactive consoles."
        },
        {
          title: "Lightened Ultra HD Visual Background",
          icon: <Eye className="w-5 h-5 text-emerald-400" />,
          description: "Elevated background GIF brightness and eliminated heavy dark masks for a luminous, crisp, and high-visibility canvas."
        },
        {
          title: "Optimized High-Framerate Scroll Physics",
          icon: <Rocket className="w-5 h-5 text-blue-400" />,
          description: "Re-engineered viewport animation triggers with single-pass GPU acceleration to eliminate scroll stutter and provide 60 FPS motion."
        }
      ]
    },
    {
      version: "v1.2.8-stable",
      date: "September 2026",
      updates: [
        {
          title: "Mr. Robot Ultra HD Atmosphere",
          icon: <Sparkles className="w-5 h-5 text-red-500" />,
          description: "Integrated full-fidelity Mr. Robot visual atmosphere with high-contrast cinematic rendering and dynamic stream toggling."
        },
        {
          title: "Continuous Audio Soundscape",
          icon: <Zap className="w-5 h-5 text-purple-400" />,
          description: "Embedded seamless looping background audio with tactile volume controls and equalizer HUD."
        },
        {
          title: "Landing Viewport Optimization",
          icon: <Rocket className="w-5 h-5 text-blue-400" />,
          description: "Refined scroll-driven component animations and zero-latency audio playback triggers across all screen profiles."
        }
      ]
    },
    {
      version: "v1.2.7-stable",
      date: "September 2026",
      updates: [
        {
          title: "OAuth2 Core Integration",
          icon: <Rocket className="w-5 h-5 text-blue-400" />,
          description: "Implemented server-side persistence for OAuth2 tokens, enabling seamless account recovery and advanced fleet management."
        },
        {
          title: "Status Synchronization",
          icon: <Shield className="w-5 h-5 text-emerald-400" />,
          description: "Fixed presence overlap conflicts between global admin overrides and individual RPC rotation cycles."
        },
        {
          title: "Dashboard Metrics",
          icon: <Zap className="w-5 h-5 text-purple-400" />,
          description: "Integrated real-time tracking for authorized identities and active daemon sessions."
        }
      ]
    },
    {
      version: "v1.2.6-stable",
      date: "August 2026",
      updates: [
        {
          title: "Session Persistence Fix",
          icon: <Shield className="w-5 h-5 text-emerald-400" />,
          description: "Resolved an asynchronous race condition during system logout that previously caused database query errors."
        },
        {
          title: "Database Reliability",
          icon: <Zap className="w-5 h-5 text-blue-400" />,
          description: "Standardized Supabase operation patterns with improved error handling for bulk data pruning."
        }
      ]
    },
    {
      version: "v1.2.5-stable",
      date: "July 2026",
      updates: [
        {
          title: "Voice Gateway Architecture",
          icon: <Zap className="w-5 h-5 text-red-400" />,
          description: "Initial rollout of the Voice Channel (VC) soundboard and neural stream injection engine."
        }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="bg-black/35 border border-white/15 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] backdrop-blur-2xl"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02] backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-tight">System Patch Notes</h2>
              <p className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">Version v1.4.4-stable</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-12 overflow-y-auto custom-scrollbar bg-transparent">
          {patchHistory.map((patch) => (
            <div key={patch.version} className="space-y-6 relative">
              <div className="flex items-center gap-4 sticky top-0 bg-black/40 backdrop-blur-md py-2 z-10 rounded-lg px-2">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-mono font-bold text-zinc-300 px-3 py-1 rounded-full border border-white/10 bg-black/30 uppercase tracking-[0.2em]">
                  {patch.version} — {patch.date}
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid grid-cols-1 gap-4">
                {patch.updates.map((update, idx) => (
                  <div 
                    key={idx}
                    className="p-5 rounded-2xl bg-black/20 border border-white/10 hover:border-emerald-500/30 transition-all group backdrop-blur-md"
                  >
                    <div className="flex gap-5">
                      <div className="flex-shrink-0 mt-0.5 transition-transform group-hover:scale-110">
                        {update.icon}
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-sm font-bold text-zinc-100 tracking-tight group-hover:text-emerald-400 transition-colors uppercase">
                          {update.title}
                        </h3>
                        <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                          {update.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 bg-transparent border-t border-white/10 flex items-center justify-center backdrop-blur-md">
            <button 
              onClick={onClose}
              className="px-12 py-3 bg-transparent hover:bg-white/10 text-white border border-white/20 hover:border-emerald-500/60 text-[10px] font-black rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)] uppercase tracking-[0.2em] active:scale-95 cursor-pointer backdrop-blur-md"
            >
              Acknowledge Update
            </button>
        </div>
      </motion.div>
    </div>
  );
}
