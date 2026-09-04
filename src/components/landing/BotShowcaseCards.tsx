import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Bot, Radio, Shield, Zap } from 'lucide-react';
import { cyberSound } from './FuturisticEffects';

interface BotInfo {
  id: string;
  name: string;
  tag: string;
  status: 'ONLINE' | 'STANDBY';
  ping: number;
  guildsCount: number;
  avatarUrl: string;
  badge: string;
  description: string;
  inviteUrl: string;
}

export function BotShowcaseCards() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const BOTS: BotInfo[] = [
    {
      id: '1545467399493521478',
      name: 'Бог добр Service',
      tag: 'Бог добр#5735',
      status: 'ONLINE',
      ping: 18,
      guildsCount: 1,
      avatarUrl: 'https://cdn.discordapp.com/embed/avatars/1.png',
      badge: 'PRIMARY COMPANION',
      description: 'Dedicated 24/7 companion delivering crimson embed parity, slash commands (/giverole, /whois, /snipe), and live guild moderation.',
      inviteUrl: 'https://discord.com/oauth2/authorize?client_id=1545467399493521478&permissions=8&integration_type=1&scope=applications.commands'
    }
  ];

  const handleCopyLink = async (url: string, id: string) => {
    cyberSound.playClick();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {}
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {BOTS.map((bot) => (
        <div
          key={bot.id}
          className="relative rounded-2xl border border-red-500/20 bg-gradient-to-b from-zinc-950 via-black to-zinc-950 p-6 shadow-xl space-y-5 overflow-hidden group hover:border-red-500/40 transition-all"
        >
          {/* Top corner cyber accent */}
          <div className="absolute top-0 right-0 p-3 text-[9px] font-mono text-red-500/40 select-none">
            [ 0x{bot.id.slice(-4)} // NET_AUTH ]
          </div>

          <div className="flex items-start gap-4">
            <div className="relative">
              <img
                src={bot.avatarUrl}
                alt={bot.name}
                className="w-14 h-14 rounded-2xl border border-red-500/30 object-cover bg-zinc-900"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                }}
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-black animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate">{bot.name}</h3>
                <span className="text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded">
                  {bot.badge}
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">{bot.tag}</p>
              <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500 mt-2">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {bot.status}
                </span>
                <span className="flex items-center gap-1">
                  <Radio className="w-3 h-3 text-red-400" />
                  {bot.ping}ms
                </span>
                <span>ID: {bot.id}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            {bot.description}
          </p>

          <div className="flex items-center gap-3 pt-1">
            <a
              href={bot.inviteUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => cyberSound.playBlip()}
              className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Authorize &amp; Invite Bot</span>
            </a>

            <button
              onClick={() => handleCopyLink(bot.inviteUrl, bot.id)}
              className="p-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl border border-white/10 transition-colors flex items-center justify-center cursor-pointer"
              title="Copy OAuth2 Link"
            >
              {copiedId === bot.id ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
