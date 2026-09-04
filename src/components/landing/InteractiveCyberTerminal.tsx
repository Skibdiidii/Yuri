import React, { useState } from 'react';
import { Terminal, Send, Zap, User, Image, Shield, Radio, Check, Copy } from 'lucide-react';
import { cyberSound } from './FuturisticEffects';

interface TerminalLog {
  id: string;
  command: string;
  timestamp: string;
  type: 'embed' | 'text' | 'error';
  title?: string;
  description?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  color?: string;
  author?: { name: string; icon?: string };
}

export function InteractiveCyberTerminal() {
  const [inputVal, setInputVal] = useState('.help');
  const [logs, setLogs] = useState<TerminalLog[]>([
    {
      id: 'init-1',
      command: '.whois @harumi',
      timestamp: '12:00:04',
      type: 'embed',
      title: '👤 Discord Identity Protocol • @harumi',
      description: 'Account verified under Yuri Master Ring 0 security tier.',
      author: { name: 'Yuri Companion 24/7' },
      color: '#ef4444',
      fields: [
        { name: 'User ID', value: '1545389998315143229', inline: true },
        { name: 'Global Tag', value: 'harumi#0001', inline: true },
        { name: 'Badges', value: '💎 Nitro Booster • 🛡️ Yuri Developer', inline: false },
        { name: 'Created', value: '2 years ago', inline: true },
        { name: 'Security Ring', value: 'AUTHENTICATED', inline: true }
      ]
    },
    {
      id: 'init-2',
      command: '.ping',
      timestamp: '12:00:18',
      type: 'embed',
      title: '⚡ WebSocket Gateway Latency',
      description: 'Discord Gateway: **18ms** | Daemon Loop: **0.4ms** | Status: **Optimum Zero-Lag**',
      color: '#10b981',
      fields: [
        { name: 'Shard ID', value: '0 / 1', inline: true },
        { name: 'Memory', value: '42.8 MB', inline: true },
        { name: 'Uptime', value: '99.98%', inline: true }
      ]
    }
  ]);

  const runCommand = (cmdText: string) => {
    cyberSound.playBlip();
    const cleanCmd = cmdText.trim();
    if (!cleanCmd) return;

    const timeStr = new Date().toTimeString().split(' ')[0];
    const lower = cleanCmd.toLowerCase();

    if (lower.startsWith('.help') || lower === '/help') {
      setLogs((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          command: cleanCmd,
          timestamp: timeStr,
          type: 'embed',
          title: '📖 Yuri Command Manifest (Category Index)',
          description: 'Selfbot runs raw text while 24/7 Companion renders in rich crimson embeds.',
          color: '#ef4444',
          fields: [
            { name: '1. General', value: '`.help`, `.ping`, `.uptime`, `.status`, `.whois`', inline: true },
            { name: '2. Media', value: '`.avatar`, `.banner`, `.soundboard`, `.stream`', inline: true },
            { name: '3. Moderation', value: '`.giverole`, `.kick`, `.ban`, `.purge`, `.snipe`', inline: true },
            { name: '4. Voice', value: '`.joinvc`, `.leavevc`, `.tts`, `.spamsb`', inline: true },
          ]
        }
      ]);
    } else if (lower.startsWith('.whois') || lower.startsWith('/whois') || lower.startsWith('.ui')) {
      setLogs((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          command: cleanCmd,
          timestamp: timeStr,
          type: 'embed',
          title: '👤 Discord Identity Profile',
          description: 'Resolved target entity on Discord Gateway v10.',
          color: '#ef4444',
          fields: [
            { name: 'Username', value: 'Discord User', inline: true },
            { name: 'Status', value: '🟢 Online', inline: true },
            { name: 'Roles', value: '@Verified, @Yuri Enthusiast', inline: false }
          ]
        }
      ]);
    } else if (lower.startsWith('.avatar') || lower.startsWith('.av')) {
      setLogs((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          command: cleanCmd,
          timestamp: timeStr,
          type: 'embed',
          title: '🖼️ Avatar Inspection Matrix',
          description: 'Extracted high-definition avatar URL in WebP / PNG 1024x1024 resolution.',
          color: '#3b82f6',
          fields: [
            { name: 'Format', value: 'WEBP / GIF (Animated)', inline: true },
            { name: 'Dimensions', value: '1024 x 1024 px', inline: true }
          ]
        }
      ]);
    } else if (lower.startsWith('.ping')) {
      setLogs((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          command: cleanCmd,
          timestamp: timeStr,
          type: 'embed',
          title: '⚡ Real-time Latency Diagnostic',
          description: 'Discord WS Heartbeat: **14ms** | REST Proxy: **22ms**',
          color: '#10b981',
          fields: [
            { name: 'Gateway', value: 'gateway.discord.gg', inline: true },
            { name: 'Packet Drop', value: '0.00%', inline: true }
          ]
        }
      ]);
    } else if (lower.startsWith('.snipe')) {
      setLogs((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          command: cleanCmd,
          timestamp: timeStr,
          type: 'embed',
          title: '🎯 Sniped Deleted Payload',
          description: '"Wait don\'t tell anyone the secret token is safe with Yuri"',
          author: { name: 'Anonymous User' },
          color: '#f59e0b',
          fields: [{ name: 'Channel', value: '#general', inline: true }, { name: 'Deleted', value: '2 minutes ago', inline: true }]
        }
      ]);
    } else {
      setLogs((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          command: cleanCmd,
          timestamp: timeStr,
          type: 'embed',
          title: `⚡ Command Executed • ${cleanCmd}`,
          description: `Dispatched instruction to Discord Gateway with verified Yuri credential envelope.`,
          color: '#ef4444',
          fields: [{ name: 'Status', value: 'Dispatched successfully', inline: true }]
        }
      ]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    runCommand(inputVal);
    setInputVal('');
  };

  const PRESETS = [
    { label: '.help', cmd: '.help' },
    { label: '.whois @target', cmd: '.whois @harumi' },
    { label: '.ping', cmd: '.ping' },
    { label: '.snipe', cmd: '.snipe' },
    { label: '.avatar @target', cmd: '.avatar' }
  ];

  return (
    <div className="rounded-2xl border border-red-500/25 bg-black/85 shadow-2xl overflow-hidden font-mono text-xs flex flex-col h-[460px]">
      {/* Terminal Title Bar */}
      <div className="px-4 py-3 bg-zinc-950/90 border-b border-white/5 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-[11px] text-zinc-400 font-bold ml-2 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-red-500" />
            Yuri Live Command Console [Interactive Preview]
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
            ONLINE
          </span>
          <span className="text-[10px] text-zinc-500 hidden sm:inline">PORT: 3000</span>
        </div>
      </div>

      {/* Quick Action Preset Chips */}
      <div className="px-4 py-2 bg-[#09090d] border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] text-red-400/80 font-bold whitespace-nowrap">QUICK EXECUTE:</span>
        {PRESETS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              setInputVal(p.cmd);
              runCommand(p.cmd);
            }}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-red-500/20 text-zinc-300 hover:text-red-300 border border-white/5 hover:border-red-500/30 text-[11px] whitespace-nowrap transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Terminal Output Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#050508]">
        {logs.map((log) => (
          <div key={log.id} className="space-y-1.5 animate-fadeIn">
            {/* Input Line */}
            <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
              <span className="text-zinc-600">[{log.timestamp}]</span>
              <span className="text-red-400 font-bold">$</span>
              <span className="text-zinc-200">{log.command}</span>
            </div>

            {/* Embed Presentation */}
            {log.type === 'embed' && (
              <div
                className="ml-4 pl-3.5 py-2.5 pr-3 bg-zinc-950/90 rounded-r-xl border-l-[3px] space-y-2 border-white/5 shadow-md"
                style={{ borderLeftColor: log.color || '#ef4444' }}
              >
                {log.author && (
                  <div className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    {log.author.name}
                  </div>
                )}
                {log.title && (
                  <div className="text-xs font-bold text-white tracking-tight">
                    {log.title}
                  </div>
                )}
                {log.description && (
                  <div className="text-[11px] text-zinc-300 leading-relaxed">
                    {log.description}
                  </div>
                )}
                {log.fields && log.fields.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {log.fields.map((f, fi) => (
                      <div key={fi} className="bg-black/40 p-2 rounded border border-white/5">
                        <div className="text-[9px] text-zinc-500 uppercase tracking-wider">{f.name}</div>
                        <div className="text-[11px] text-zinc-200 font-mono mt-0.5">{f.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Terminal Command Input Form */}
      <form onSubmit={handleSubmit} className="p-3 bg-zinc-950 border-t border-white/5 flex items-center gap-2">
        <span className="text-red-500 font-bold select-none text-sm">$</span>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Type command (e.g. .help, .ping, .whois)..."
          className="flex-1 bg-transparent text-zinc-100 placeholder:text-zinc-700 outline-none text-xs font-mono"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition-all"
        >
          <span>Run</span>
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
}
