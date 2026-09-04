import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ExternalLink, 
  Copy, 
  Check, 
  BookOpen, 
  ShieldCheck, 
  Terminal, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  Bot,
  UserCheck,
  Zap,
  Activity,
  RefreshCw,
  Clock,
  Server,
  Radio
} from 'lucide-react';

interface Sb2TabProps {
  onBack: () => void;
}

interface BotStatus {
  online: boolean;
  tag: string;
  id: string;
  avatar: string;
  ping: number;
  uptime: number;
  guildsCount: number;
  authorizedUsers: string[];
}

export default function Sb2Tab({ onBack }: Sb2TabProps) {
  const [copiedAuth, setCopiedAuth] = useState(false);
  const [activePage, setActivePage] = useState<1 | 2 | 3>(1);
  const [simulatedCommand, setSimulatedCommand] = useState('');
  const [simulatedChat, setSimulatedChat] = useState<Array<{ 
    id: string; 
    user: string; 
    content?: string; 
    isEmbed?: boolean; 
    page?: number; 
    embedDesc?: string; 
    isBot?: boolean 
  }>>([
    {
      id: 'init-msg',
      user: 'You (Selfbot)',
      content: '.help',
      isBot: false,
    },
    {
      id: 'bot-reply',
      user: 'Yuri Selfbot Companion',
      isEmbed: true,
      page: 1,
      isBot: true,
    }
  ]);

  const [whitelistUsers, setWhitelistUsers] = useState<string[]>(['1545389998315143229']);
  const [newWhitelistId, setNewWhitelistId] = useState('');
  const [botStatus, setBotStatus] = useState<BotStatus>({
    online: true,
    tag: 'Бог добр#5735',
    id: '1545467399493521478',
    avatar: '',
    ping: 38,
    uptime: 120,
    guildsCount: 1,
    authorizedUsers: ['1545389998315143229']
  });
  const [isRestarting, setIsRestarting] = useState(false);

  const AUTH_URL = 'https://discord.com/oauth2/authorize?client_id=1545467399493521478';
  const GIF_URL = 'https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif';

  // Fetch live Yuri Bot status from backend
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/yuri-bot/status');
      if (res.ok) {
        const data = await res.json();
        setBotStatus(data);
        if (Array.isArray(data.authorizedUsers) && data.authorizedUsers.length > 0) {
          setWhitelistUsers(data.authorizedUsers);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyAuth = async () => {
    try {
      await navigator.clipboard.writeText(AUTH_URL);
      setCopiedAuth(true);
      setTimeout(() => setCopiedAuth(false), 2000);
    } catch (e) {}
  };

  const handleRestartBot = async () => {
    setIsRestarting(true);
    try {
      await fetch('/api/yuri-bot/restart', { method: 'POST' });
      setTimeout(() => {
        fetchStatus();
        setIsRestarting(false);
      }, 1500);
    } catch (e) {
      setIsRestarting(false);
    }
  };

  const formatUptime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const handleExecuteSimulatedCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = simulatedCommand.trim();
    if (!cmd) return;

    const userEntry = {
      id: String(Date.now()),
      user: 'You (Selfbot)',
      content: cmd,
      isBot: false,
    };

    const newChat = [...simulatedChat, userEntry];

    if (cmd === '.help' || cmd === '/help' || cmd === 'help') {
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Yuri Selfbot Companion',
        isEmbed: true,
        page: 1,
        isBot: true,
      });
      setActivePage(1);
    } else if (cmd === '.help 2' || cmd === '/help 2') {
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Yuri Selfbot Companion',
        isEmbed: true,
        page: 2,
        isBot: true,
      });
      setActivePage(2);
    } else if (cmd === '.help 3' || cmd === '/help 3') {
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Yuri Selfbot Companion',
        isEmbed: true,
        page: 3,
        isBot: true,
      });
      setActivePage(3);
    } else if (cmd === '.uptime' || cmd === '/uptime') {
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Yuri Selfbot Companion',
        content: `> 🚀 **Uptime:** \`${formatUptime(botStatus.uptime)}\` (Running 24/7)`,
        isBot: true,
      });
    } else if (cmd === '.ping' || cmd === '/ping') {
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Yuri Selfbot Companion',
        content: `> 🏓 **Pong!** Gateway WebSocket: \`${botStatus.ping || 42}ms\``,
        isBot: true,
      });
    } else if (cmd.startsWith('.whois') || cmd.startsWith('.ui')) {
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Yuri Selfbot Companion',
        content: `> 👤 **User Information**\n> **Username:** \`You#0000\`\n> **Display Name:** **Yuri Selfbot Master**\n> **User ID:** \`1545389998315143229\`\n> **Account Created:** \`2024-01-15\` (415d ago)\n> **Joined Server:** \`2024-03-10\` (361d ago)\n> **Roles:** \`Master\` \`Developer\`\n> **Avatar:** https://cdn.discordapp.com/embed/avatars/0.png`,
        isBot: true,
      });
    } else if (cmd.startsWith('.avatar') || cmd.startsWith('.pfp') || cmd.startsWith('.av')) {
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Yuri Selfbot Companion',
        content: `> 🖼️ **Avatar**\n> **User ID:** \`1545389998315143229\`\n> **Direct Link:** https://cdn.discordapp.com/embed/avatars/0.png`,
        isBot: true,
      });
    } else if (cmd === '.serverinfo' || cmd === '.si') {
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Yuri Selfbot Companion',
        content: `> 🏰 **Server Information**\n> **Server Name:** **Yuri HQ**\n> **Server ID:** \`987654321098765432\`\n> **Owner:** <@1545389998315143229>\n> **Members:** \`128\`\n> **Channels:** \`24\` (Text: \`18\` | Voice: \`6\`)\n> **Created:** \`2023-11-20\` (472d ago)`,
        isBot: true,
      });
    } else if (cmd.startsWith('.afk')) {
      const msg = cmd.replace(/^(\.|\/)afk\s*/, '') || 'AFK currently.';
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Yuri Selfbot Companion',
        content: `> 💤 **AFK Status Enabled:** \`${msg}\`\n> Automatically replying to direct mentions and replies.`,
        isBot: true,
      });
    } else if (cmd.startsWith('.say ') || cmd.startsWith('/say ')) {
      const text = cmd.replace(/^(\/|\.)say\s+/, '');
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Yuri Selfbot Companion',
        content: text,
        isBot: true,
      });
    } else if (cmd.startsWith('.embed ') || cmd.startsWith('/embed ')) {
      const text = cmd.replace(/^(\/|\.)embed\s+/, '');
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Yuri Selfbot Companion',
        isEmbed: false,
        embedDesc: text,
        isBot: true,
      });
    } else if (cmd === '.whitelisted' || cmd === '.selfbots') {
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Yuri Selfbot Companion',
        content: `> 🛡️ **Authorized Selfbot Accounts (${whitelistUsers.length})**\n> Yuri Bot is strictly restricted to these selfbot accounts:\n${whitelistUsers.map(id => `> • <@${id}> (\`${id}\`)`).join('\n')}`,
        isBot: true,
      });
    } else {
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Yuri Selfbot Companion',
        content: `> ❌ Unknown command "${cmd}". Try \`.help\` to view all original Yuri Selfbot commands.`,
        isBot: true,
      });
    }

    setSimulatedChat(newChat);
    setSimulatedCommand('');
  };

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = newWhitelistId.trim().replace(/[^0-9]/g, '');
    if (id && id.length >= 15 && !whitelistUsers.includes(id)) {
      try {
        const res = await fetch('/api/yuri-bot/whitelist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: id })
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.authorizedUsers)) {
            setWhitelistUsers(data.authorizedUsers);
          } else {
            setWhitelistUsers(prev => [...prev, id]);
          }
        }
      } catch (e) {
        setWhitelistUsers(prev => [...prev, id]);
      }
      setNewWhitelistId('');
    }
  };

  const handleRemoveWhitelist = async (id: string) => {
    try {
      const res = await fetch(`/api/yuri-bot/whitelist/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.authorizedUsers)) {
          setWhitelistUsers(data.authorizedUsers);
          return;
        }
      }
    } catch (e) {}
    setWhitelistUsers(prev => prev.filter(u => u !== id));
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 font-sans pb-24 selection:bg-red-500/20">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20 rounded-md flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              24/7 ACTIVE
            </span>
            <h1 className="text-sm font-semibold text-white tracking-wide">
              Yuri Companion Service
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRestartBot}
            disabled={isRestarting}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs rounded-lg border border-white/5 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Restart 24/7 Companion Service"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRestarting ? 'animate-spin text-red-400' : ''}`} />
            <span className="hidden md:inline">{isRestarting ? 'Restarting...' : 'Restart Companion'}</span>
          </button>
          <a
            href={AUTH_URL}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-medium text-xs rounded-lg transition-all flex items-center gap-2 shadow-sm shadow-red-900/30"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Authorize Companion</span>
          </a>
          <button
            onClick={handleCopyAuth}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs rounded-lg border border-white/5 transition-colors flex items-center gap-1.5"
            title="Copy Authorization URL"
          >
            {copiedAuth ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
            <span className="hidden md:inline">{copiedAuth ? 'Copied' : 'Copy Link'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 pt-8 space-y-10">
        
        {/* Banner Card with Real 24/7 Stats */}
        <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-b from-red-950/20 via-zinc-900/40 to-zinc-950 p-8 shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Terminal className="w-64 h-64 text-red-500" />
          </div>
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
              <Zap className="w-3 h-3" />
              <span>Dedicated 24/7 Online Automation Service</span>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Yuri Companion Service
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Operating 24/7 in the background with full Slash Command parity (`/giverole`, `/whois`, `/avatar`, `/banner`, `/serverinfo`, `/afk`, etc.). While selfbot commands output straight-line text, this companion delivers pure crimson Discord embed presentations and is strictly restricted to verified Yuri Selfbot users.
            </p>

            {/* Live Stats Pill Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Status</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-400">Online (24/7)</span>
                </div>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Bot Tag</span>
                <span className="text-xs font-mono font-medium text-zinc-200 mt-1 truncate">
                  {botStatus.tag || 'Бог добр#5735'}
                </span>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">WebSocket Ping</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Radio className="w-3 h-3 text-red-400" />
                  <span className="text-xs font-mono font-medium text-zinc-200">{botStatus.ping || 42}ms</span>
                </div>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Uptime</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-3 h-3 text-red-400" />
                  <span className="text-xs font-mono font-medium text-zinc-200">{formatUptime(botStatus.uptime)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a 
                href={AUTH_URL} 
                target="_blank" 
                rel="noreferrer" 
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Invite Yuri Bot to Servers / DMs</span>
              </a>
              <button 
                onClick={handleCopyAuth}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-white/5 flex items-center gap-2 transition-all"
              >
                {copiedAuth ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAuth ? 'OAuth2 Link Copied!' : 'Copy OAuth2 Link'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4-Card Feature Highlights */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-white font-medium text-lg">
            <BookOpen className="w-5 h-5 text-red-400" />
            <h3>Architecture & Security Features</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-5 flex flex-col justify-between hover:border-white/10 transition-colors">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center font-mono font-bold text-xs">
                  01
                </div>
                <h4 className="text-sm font-semibold text-white">24/7 Background Runner</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  The bot client runs uninterruptedly 24/7 on the server with automated heartbeat renewals, voice handling, and WebSocket reconnect loops.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-white/5">
                <span className="text-[10px] font-mono text-zinc-500">ID: 1545467399493521478</span>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-5 flex flex-col justify-between hover:border-white/10 transition-colors">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center font-mono font-bold text-xs">
                  02
                </div>
                <h4 className="text-sm font-semibold text-white">Selfbot Users Only</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  No hardcoded owner ID. Access is strictly granted to your active selfbot user accounts and whitelisted IDs. Non-selfbot users are automatically rejected.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-white/5">
                <span className="text-[10px] font-mono text-zinc-500">Access: Whitelist + Sessions</span>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-5 flex flex-col justify-between hover:border-white/10 transition-colors">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center font-mono font-bold text-xs">
                  03
                </div>
                <h4 className="text-sm font-semibold text-white">Real Selfbot Commands</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  All original Yuri Selfbot commands are implemented directly: <code className="text-red-300">.whois</code>, <code className="text-red-300">.avatar</code>, <code className="text-red-300">.serverinfo</code>, <code className="text-red-300">.uptime</code>, and more.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-white/5">
                <span className="text-[10px] font-mono text-zinc-500">Straight-line Design (&gt; )</span>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-5 flex flex-col justify-between hover:border-white/10 transition-colors">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center font-mono font-bold text-xs">
                  04
                </div>
                <h4 className="text-sm font-semibold text-white">Presence & Media</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Maintains playing status <span className="text-red-400 font-medium font-mono">Yuri Selfbot</span> and responds with rich embeds including the custom media GIF.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-white/5">
                <span className="text-[10px] font-mono text-zinc-500">Brand: Yuri Selfbot</span>
              </div>
            </div>
          </div>
        </section>

        {/* Yuri Selfbot .help Interactive Commands Reference */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-medium text-lg">
              <Sparkles className="w-5 h-5 text-red-400" />
              <h3>Original Yuri Selfbot Commands Reference</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActivePage(1)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${activePage === 1 ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
              >
                Page 1: Profile & Users
              </button>
              <button
                onClick={() => setActivePage(2)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${activePage === 2 ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
              >
                Page 2: Server & Utility
              </button>
              <button
                onClick={() => setActivePage(3)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${activePage === 3 ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
              >
                Page 3: Automation & Selfbot
              </button>
            </div>
          </div>

          {/* Discord Message Shell */}
          <div className="bg-[#313338] rounded-xl p-6 border border-white/10 shadow-2xl font-sans text-sm">
            
            {/* Discord message author info */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold shrink-0 shadow-inner">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-white hover:underline cursor-pointer">
                    Yuri Selfbot Companion
                  </span>
                  <span className="bg-[#5865F2] text-white text-[9px] font-bold px-1.5 py-0.5 rounded leading-none flex items-center gap-0.5 uppercase tracking-wide">
                    ✓ BOT
                  </span>
                  <span className="text-zinc-400 text-xs">Today at 12:00 PM</span>
                  <span className="text-zinc-500 text-xs italic ml-2">used .help</span>
                </div>

                {/* Discord Embed Box */}
                <div className="max-w-2xl bg-[#2B2D31] rounded-lg border-l-4 border-[#ED4245] p-5 shadow-lg space-y-4">
                  
                  {/* Title */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-bold text-base tracking-wide flex items-center gap-2">
                      <span>Yuri Selfbot | Commands Reference</span>
                    </h4>
                    <span className="text-zinc-400 text-xs font-mono">
                      Page {activePage} of 3
                    </span>
                  </div>

                  {/* Commands content based on active page */}
                  <div className="space-y-3 pt-1">
                    {activePage === 1 && (
                      <div className="space-y-2.5">
                        <div className="bg-[#1E1F22] p-3 rounded border border-white/5">
                          <div className="font-mono text-xs text-red-400 font-semibold mb-0.5">
                            .whois [user] / .ui [user]
                          </div>
                          <div className="text-xs text-zinc-300">
                            Full profile inspection with registration date, join timestamp, roles, badges, banner, and high-res avatar.
                          </div>
                        </div>

                        <div className="bg-[#1E1F22] p-3 rounded border border-white/5">
                          <div className="font-mono text-xs text-red-400 font-semibold mb-0.5">
                            .avatar [user] / .pfp / .av
                          </div>
                          <div className="text-xs text-zinc-300">
                            Extract high-resolution 4096px direct avatar link with straight-line (&gt; ) formatting.
                          </div>
                        </div>

                        <div className="bg-[#1E1F22] p-3 rounded border border-white/5">
                          <div className="font-mono text-xs text-red-400 font-semibold mb-0.5">
                            .banner [user]
                          </div>
                          <div className="text-xs text-zinc-300">
                            Extract maximum resolution user profile banner link and image preview.
                          </div>
                        </div>

                        <div className="bg-[#1E1F22] p-3 rounded border border-white/5">
                          <div className="font-mono text-xs text-red-400 font-semibold mb-0.5">
                            .id [user] / .createdat [user] / .joinedat [user]
                          </div>
                          <div className="text-xs text-zinc-300">
                            Retrieve raw Snowflake IDs, account creation age in days, and server tenure.
                          </div>
                        </div>
                      </div>
                    )}

                    {activePage === 2 && (
                      <div className="space-y-2.5">
                        <div className="bg-[#1E1F22] p-3 rounded border border-white/5">
                          <div className="font-mono text-xs text-red-400 font-semibold mb-0.5">
                            .serverinfo / .si
                          </div>
                          <div className="text-xs text-zinc-300">
                            Detailed server metrics, owner tag &amp; ID, member count, channel stats, and nitro boost level.
                          </div>
                        </div>

                        <div className="bg-[#1E1F22] p-3 rounded border border-white/5">
                          <div className="font-mono text-xs text-red-400 font-semibold mb-0.5">
                            .uptime / .ping
                          </div>
                          <div className="text-xs text-zinc-300">
                            Real-time 24/7 service uptime counter and Gateway WebSocket roundtrip latency.
                          </div>
                        </div>

                        <div className="bg-[#1E1F22] p-3 rounded border border-white/5">
                          <div className="font-mono text-xs text-red-400 font-semibold mb-0.5">
                            .say &lt;message&gt; / .embed &lt;message&gt;
                          </div>
                          <div className="text-xs text-zinc-300">
                            Send raw un-prefixed text or formatted crimson embed broadcast.
                          </div>
                        </div>

                        <div className="bg-[#1E1F22] p-3 rounded border border-white/5">
                          <div className="font-mono text-xs text-red-400 font-semibold mb-0.5">
                            .roles / .perms
                          </div>
                          <div className="text-xs text-zinc-300">
                            Inspect your assigned server roles and active administrative permission bitfields.
                          </div>
                        </div>
                      </div>
                    )}

                    {activePage === 3 && (
                      <div className="space-y-2.5">
                        <div className="bg-[#1E1F22] p-3 rounded border border-white/5">
                          <div className="font-mono text-xs text-red-400 font-semibold mb-0.5">
                            .afk [message]
                          </div>
                          <div className="text-xs text-zinc-300">
                            Set smart AFK status. Automatically responds to incoming mentions and replies while you are away.
                          </div>
                        </div>

                        <div className="bg-[#1E1F22] p-3 rounded border border-white/5">
                          <div className="font-mono text-xs text-red-400 font-semibold mb-0.5">
                            .purge [amount] / .cleardm [amount]
                          </div>
                          <div className="text-xs text-zinc-300">
                            Clean recent own messages in guild channels or private direct messages.
                          </div>
                        </div>

                        <div className="bg-[#1E1F22] p-3 rounded border border-white/5">
                          <div className="font-mono text-xs text-red-400 font-semibold mb-0.5">
                            .snipe / .editsnipe
                          </div>
                          <div className="text-xs text-zinc-300">
                            Capture recently deleted messages and reveal previously edited content in current channel.
                          </div>
                        </div>

                        <div className="bg-[#1E1F22] p-3 rounded border border-white/5">
                          <div className="font-mono text-xs text-red-400 font-semibold mb-0.5">
                            .whitelisted / .selfbots / .whitelist &lt;id&gt;
                          </div>
                          <div className="text-xs text-zinc-300">
                            View or modify authorized selfbot user accounts permitted to invoke Yuri Bot commands.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Media GIF */}
                  <div className="pt-2">
                    <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/40">
                      <img 
                        src={GIF_URL} 
                        alt="Yuri Selfbot showcase animation" 
                        className="w-full max-h-72 object-cover object-center rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  {/* Embed Footer and Next Page control */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span>Status: Playing Yuri Selfbot | .help</span>
                    </div>

                    {/* Interactive Next Page buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActivePage((prev) => (prev > 1 ? ((prev - 1) as any) : 1))}
                        disabled={activePage === 1}
                        className="px-2.5 py-1 text-xs bg-[#1E1F22] hover:bg-[#35373c] disabled:opacity-30 disabled:cursor-not-allowed rounded text-zinc-300 flex items-center gap-1 transition-all"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </button>
                      <span className="text-xs font-mono text-zinc-400 px-1">
                        {activePage}/3
                      </span>
                      <button
                        onClick={() => setActivePage((prev) => (prev < 3 ? ((prev + 1) as any) : 3))}
                        disabled={activePage === 3}
                        className="px-2.5 py-1 text-xs bg-[#1E1F22] hover:bg-[#35373c] disabled:opacity-30 disabled:cursor-not-allowed rounded text-zinc-300 flex items-center gap-1 transition-all"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* Live Command Testing Simulator */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-medium text-lg">
              <Terminal className="w-5 h-5 text-red-400" />
              <h3>Live Command Sandbox (Straight-Line &gt; Design)</h3>
            </div>
            <span className="text-xs text-zinc-500 font-mono">Test Yuri Selfbot original commands</span>
          </div>

          <div className="bg-[#18191c] rounded-xl border border-white/10 p-5 space-y-4">
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
              {simulatedChat.map(msg => (
                <div key={msg.id} className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${msg.isBot ? 'text-red-400' : 'text-indigo-400'}`}>
                      {msg.user}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">Just now</span>
                  </div>

                  {msg.content && (
                    <div className="text-zinc-200 bg-white/5 px-3 py-2 rounded-md font-mono text-xs whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  )}

                  {msg.isEmbed && (
                    <div className="bg-[#2B2D31] border-l-4 border-red-500 p-3 rounded text-xs space-y-2">
                      <div className="font-bold text-white">Yuri Selfbot | Commands Reference (Page {msg.page || 1} of 3)</div>
                      <div className="text-zinc-300 space-y-1">
                        <div>• <code className="text-red-300">.whois [user]</code> - Profile inspection with straight-line layout</div>
                        <div>• <code className="text-red-300">.avatar [user]</code> - High-res avatar direct link</div>
                        <div>• <code className="text-red-300">.serverinfo</code> - Server details &amp; boost metrics</div>
                        <div>• <code className="text-red-300">.uptime</code> - 24/7 service runtime check</div>
                        <div>• <code className="text-red-300">.afk [msg]</code> - Smart away auto-responder</div>
                      </div>
                      <img src={GIF_URL} alt="Embed Media" className="w-48 rounded mt-2 border border-white/10" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  {msg.embedDesc && (
                    <div className="bg-[#2B2D31] border-l-4 border-red-500 p-3 rounded text-xs">
                      <div className="text-zinc-200">{msg.embedDesc}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleExecuteSimulatedCommand} className="flex gap-2">
              <input
                type="text"
                value={simulatedCommand}
                onChange={e => setSimulatedCommand(e.target.value)}
                placeholder="Try .whois, .avatar, .serverinfo, .uptime, .ping, .afk, .help..."
                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </section>

        {/* Authorized Selfbot Accounts Manager */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-medium text-lg">
              <UserCheck className="w-5 h-5 text-red-400" />
              <h3>Authorized Selfbot Accounts Access Control</h3>
            </div>
            <span className="text-xs text-zinc-500 font-mono">
              Saved in: whitelist.json &amp; active selfbot sessions
            </span>
          </div>

          <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-5 space-y-4">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Yuri Bot is strictly locked to your selfbot accounts. Only the accounts listed below and active selfbot sessions can issue commands to Yuri Bot. No other Discord users can trigger execution.
            </p>

            <form onSubmit={handleAddWhitelist} className="flex gap-2">
              <input
                type="text"
                value={newWhitelistId}
                onChange={e => setNewWhitelistId(e.target.value)}
                placeholder="Enter Discord User ID of your selfbot account..."
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-white/5 transition-colors"
              >
                Authorize Selfbot ID
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {whitelistUsers.map(id => (
                <div key={id} className="flex items-center justify-between bg-black/30 border border-white/5 rounded-lg px-3.5 py-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-xs font-mono text-zinc-300">{id}</span>
                    <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1 py-0.5 rounded font-mono">
                      SELFBOT
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveWhitelist(id)}
                    className="text-zinc-500 hover:text-red-400 text-xs px-1.5 py-0.5 rounded transition-colors"
                    title="Remove user"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
