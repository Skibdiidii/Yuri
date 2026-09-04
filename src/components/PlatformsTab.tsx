import React, { useState } from 'react';
import { Smartphone, Monitor, Terminal, Apple, Disc as LinuxIcon, Download, ExternalLink, Check, Shield, Zap, Globe } from 'lucide-react';

export default function PlatformsTab() {
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2500);
  };

  const linuxBashCommand = `curl -sSL https://yuri-bfwg.onrender.com/linux-desktop.sh | bash`;
  const sshSetupCommand = `curl -sSL https://yuri-bfwg.onrender.com/linux-ssh.sh | bash`;

  return (
    <div className="flex-1 flex flex-col bg-zinc-950/20 h-full text-zinc-150 p-6 lg:p-10 overflow-y-auto no-scrollbar">
      <div className="max-w-5xl w-full mx-auto space-y-8">
        
        {/* Header */}
        <div className="p-8 rounded-[2rem] bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-zinc-900 border border-white/5 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4">
            <Globe className="w-3.5 h-3.5" />
            <span>Universal Cross-Platform Hub</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Yuri on All Your Devices</h1>
          <p className="text-sm text-zinc-400 mt-2 max-w-2xl leading-relaxed">
            Run Yuri, CatalystCord, automated bot runners, and live voice utilities seamlessly across iOS, Android, macOS, and Linux environments.
          </p>
        </div>

        {/* Platform Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* iOS */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-white/15 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-white border border-white/5">
                  <Apple className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  PWA Supported
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">iOS (iPhone & iPad)</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Enjoy full real-time chat, voice channels, and self-bot management directly from Safari on iOS.
              </p>
              <ul className="space-y-2 text-xs text-zinc-300 font-medium">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                  <span>Open <b className="text-white">https://yuri-bfwg.onrender.com</b> in Safari</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                  <span>Tap the <b className="text-white">Share</b> button in the bottom menu</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                  <span>Select <b className="text-white">"Add to Home Screen"</b> for app mode</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
              <span>Requires iOS 15+</span>
              <span className="text-indigo-400 font-bold">Safari PWA</span>
            </div>
          </div>

          {/* Android */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-white/15 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-emerald-400 border border-white/5">
                  <Smartphone className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Native APK / PWA
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Android Devices</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Full hardware audio routing, background WebSocket persistence, and soundboard audio playback.
              </p>
              <ul className="space-y-2 text-xs text-zinc-300 font-medium">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  <span>Open in <b className="text-white">Google Chrome</b></span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  <span>Tap menu (3 dots) &rarr; <b className="text-white">"Install App"</b></span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  <span>Runs as an independent standalone app window</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
              <span>Android 10+</span>
              <span className="text-emerald-400 font-bold">Chrome WebAPK</span>
            </div>
          </div>

          {/* macOS */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-white/15 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-white border border-white/5">
                  <Monitor className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Desktop App
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">macOS Desktop</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Optimized web app wrapper or native browser tab with hardware GPU acceleration and global hotkeys.
              </p>
              <ul className="space-y-2 text-xs text-zinc-300 font-medium">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                  <span>Open <b className="text-white">Safari</b> or <b className="text-white">Chrome</b></span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                  <span>File &rarr; <b className="text-white">Add to Dock</b></span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                  <span>Full access to RPC & voice synthesis engine</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
              <span>macOS Monterey+</span>
              <span className="text-purple-400 font-bold">Native Dock Mode</span>
            </div>
          </div>

          {/* Linux */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-white/15 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-amber-400 border border-white/5">
                  <LinuxIcon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Automated Bash / VPS
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Linux & VPS Nodes</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Deploy desktop GUI environments, SSH tunneling, and background bot workers with single-command scripts.
              </p>
              
              <div className="space-y-3 mt-4">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
                    <span>Desktop Setup Script</span>
                    <button 
                      onClick={() => copyToClipboard(linuxBashCommand, 'linux')}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedScript === 'linux' ? <Check className="w-3 h-3 text-emerald-400" /> : <Download className="w-3 h-3" />}
                      <span>{copiedScript === 'linux' ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-black/60 rounded-xl border border-white/5 font-mono text-[10px] text-zinc-300 overflow-x-auto select-all">
                    {linuxBashCommand}
                  </div>
                </div>
              </div>

            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
              <span>Ubuntu / Debian / Arch</span>
              <span className="text-amber-400 font-bold">XFCE + VNC + SSH</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
