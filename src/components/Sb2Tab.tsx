import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  ExternalLink, 
  Copy, 
  Check, 
  BookOpen, 
  ShieldCheck, 
  Terminal, 
  Code, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  Bot,
  UserCheck,
  Zap,
  Info
} from 'lucide-react';

interface Sb2TabProps {
  onBack: () => void;
}

export default function Sb2Tab({ onBack }: Sb2TabProps) {
  const [copiedAuth, setCopiedAuth] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activePage, setActivePage] = useState<1 | 2>(1);
  const [simulatedCommand, setSimulatedCommand] = useState('');
  const [simulatedChat, setSimulatedChat] = useState<Array<{ id: string; user: string; content?: string; isEmbed?: boolean; page?: number; embedDesc?: string; isBot?: boolean }>>([
    {
      id: 'init-msg',
      user: 'You',
      content: '/help',
      isBot: false,
    },
    {
      id: 'bot-reply',
      user: 'Corrupt-Ware',
      isEmbed: true,
      page: 1,
      isBot: true,
    }
  ]);
  const [whitelistUsers, setWhitelistUsers] = useState<string[]>(['1545389998315143229']);
  const [newWhitelistId, setNewWhitelistId] = useState('');

  const AUTH_URL = 'https://discord.com/oauth2/authorize?client_id=1545467399493521478';
  const OWNER_ID = '1545389998315143229';
  const GIF_URL = 'https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif';

  const pythonScript = `import json
import os
import random

import discord
from discord import app_commands
from discord.ext import tasks


TOKEN = os.getenv("DISCORD_BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
OWNER_ID = 1545389998315143229

WHITELIST_FILE = "whitelist.json"

statuses = [
    "Corrupt-Ware",
    "Corrupt-Ware",
    "Corrupt-Ware",
]


def load_users():
    if not os.path.isfile(WHITELIST_FILE):
        return {OWNER_ID}

    try:
        with open(WHITELIST_FILE, "r", encoding="utf-8") as file:
            return set(json.load(file))
    except (OSError, json.JSONDecodeError):
        return {OWNER_ID}


def save_users():
    with open(WHITELIST_FILE, "w", encoding="utf-8") as file:
        json.dump(list(whitelist), file, indent=2)


whitelist = load_users()


class Client(discord.Client):
    def __init__(self):
        intents = discord.Intents.default()
        intents.guilds = True
        intents.messages = True
        intents.dm_messages = True

        super().__init__(intents=intents)

        self.tree = app_commands.CommandTree(self)

    async def setup_hook(self):
        self.tree.allowed_contexts = app_commands.AppCommandContext(
            guild=True,
            dm_channel=True,
            private_channel=True,
        )

        await self.tree.sync()


bot = Client()


def is_owner(user_id):
    return user_id == OWNER_ID


def is_allowed(user_id):
    return user_id in whitelist or is_owner(user_id)


@bot.event
async def on_ready():
    print(f"Logged in as {bot.user} ({bot.user.id})")

    if not update_status.is_running():
        update_status.start()


@tasks.loop(seconds=10)
async def update_status():
    try:
        await bot.change_presence(
            activity=discord.Game(random.choice(statuses))
        )
    except discord.HTTPException:
        pass


@bot.tree.command(
    name="say",
    description="Send a message as the bot.",
)
@app_commands.describe(message="Message to send")
async def say(interaction: discord.Interaction, message: str):
    if not is_allowed(interaction.user.id):
        await interaction.response.send_message(
            "You don't have permission to use this.",
            ephemeral=True,
        )
        return

    await interaction.response.send_message(
        "Notification sent.",
        ephemeral=True,
    )

    await interaction.followup.send(message)


@bot.tree.command(
    name="embed",
    description="Send an embed.",
)
@app_commands.describe(message="Message to put in the embed")
async def embed(interaction: discord.Interaction, message: str):
    if not is_allowed(interaction.user.id):
        await interaction.response.send_message(
            "You don't have permission to use this.",
            ephemeral=True,
        )
        return

    message_embed = discord.Embed(
        description=message,
        color=discord.Color.red(),
    )

    await interaction.response.send_message(
        "Notification sent.",
        ephemeral=True,
    )

    await interaction.followup.send(embed=message_embed)


@bot.tree.command(
    name="whitelist",
    description="Whitelist a user.",
)
@app_commands.describe(user="User to whitelist")
async def add_whitelist(
    interaction: discord.Interaction,
    user: discord.User,
):
    if not is_owner(interaction.user.id):
        await interaction.response.send_message(
            "You don't have permission to use this.",
            ephemeral=True,
        )
        return

    whitelist.add(user.id)
    save_users()

    await interaction.response.send_message(
        f"{user.mention} has been whitelisted.",
        ephemeral=True,
    )


@bot.tree.command(
    name="unwhitelist",
    description="Remove a user from the whitelist.",
)
@app_commands.describe(user="User to remove")
async def remove_whitelist(
    interaction: discord.Interaction,
    user: discord.User,
):
    if not is_owner(interaction.user.id):
        await interaction.response.send_message(
            "You don't have permission to use this.",
            ephemeral=True,
        )
        return

    if user.id == OWNER_ID:
        await interaction.response.send_message(
            "You can't remove the owner.",
            ephemeral=True,
        )
        return

    whitelist.discard(user.id)
    save_users()

    await interaction.response.send_message(
        f"{user.mention} has been removed from the whitelist.",
        ephemeral=True,
    )


@bot.tree.command(
    name="whitelisted",
    description="List whitelisted users.",
)
async def show_whitelist(interaction: discord.Interaction):
    if not is_owner(interaction.user.id):
        await interaction.response.send_message(
            "You don't have permission to use this.",
            ephemeral=True,
        )
        return

    if not whitelist:
        await interaction.response.send_message(
            "The whitelist is empty.",
            ephemeral=True,
        )
        return

    users = "\\n".join(
        f"<@{user_id}> (\`{user_id}\`)"
        for user_id in sorted(whitelist)
    )

    await interaction.response.send_message(
        users,
        ephemeral=True,
    )


bot.run(TOKEN)`;

  const handleCopyAuth = async () => {
    try {
      await navigator.clipboard.writeText(AUTH_URL);
      setCopiedAuth(true);
      setTimeout(() => setCopiedAuth(false), 2000);
    } catch (e) {}
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(pythonScript);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {}
  };

  const handleExecuteSimulatedCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = simulatedCommand.trim();
    if (!cmd) return;

    const userEntry = {
      id: String(Date.now()),
      user: 'You',
      content: cmd,
      isBot: false,
    };

    const newChat = [...simulatedChat, userEntry];

    if (cmd === '/help' || cmd === '.help' || cmd === 'help') {
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Corrupt-Ware',
        isEmbed: true,
        page: 1,
        isBot: true,
      });
      setActivePage(1);
    } else if (cmd === '/help 2' || cmd === '.help 2') {
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Corrupt-Ware',
        isEmbed: true,
        page: 2,
        isBot: true,
      });
      setActivePage(2);
    } else if (cmd.startsWith('/say ') || cmd.startsWith('.say ')) {
      const text = cmd.replace(/^(\/|\.)say\s+/, '');
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Corrupt-Ware',
        content: text,
        isBot: true,
      });
    } else if (cmd.startsWith('/embed ') || cmd.startsWith('.embed ')) {
      const text = cmd.replace(/^(\/|\.)embed\s+/, '');
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Corrupt-Ware',
        isEmbed: false,
        embedDesc: text,
        isBot: true,
      });
    } else if (cmd === '/whitelisted' || cmd === '.whitelisted') {
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Corrupt-Ware',
        content: `Whitelisted users (${whitelistUsers.length}):\n${whitelistUsers.map(id => `• <@${id}> (\`${id}\`)`).join('\n')}`,
        isBot: true,
      });
    } else if (cmd.startsWith('/whitelist ') || cmd.startsWith('.whitelist ')) {
      const id = cmd.replace(/^(\/|\.)whitelist\s+/, '').trim();
      if (id && !whitelistUsers.includes(id)) {
        setWhitelistUsers(prev => [...prev, id]);
      }
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Corrupt-Ware',
        content: `✅ <@${id}> has been added to the whitelist.`,
        isBot: true,
      });
    } else {
      newChat.push({
        id: String(Date.now() + 1),
        user: 'Corrupt-Ware',
        content: `Unknown command "${cmd}". Try \`/help\` to inspect all registered commands.`,
        isBot: true,
      });
    }

    setSimulatedChat(newChat);
    setSimulatedCommand('');
  };

  const handleAddWhitelist = (e: React.FormEvent) => {
    e.preventDefault();
    const id = newWhitelistId.trim();
    if (id && !whitelistUsers.includes(id)) {
      setWhitelistUsers(prev => [...prev, id]);
      setNewWhitelistId('');
    }
  };

  const handleRemoveWhitelist = (id: string) => {
    if (id === OWNER_ID) return;
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
            <span className="hidden sm:inline">Back to Chooser</span>
          </button>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20 rounded-md">
              2. sb 2
            </span>
            <h1 className="text-sm font-semibold text-white tracking-wide">
              Corrupt-Ware App-Commands Method
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={AUTH_URL}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-medium text-xs rounded-lg transition-all flex items-center gap-2 shadow-sm shadow-red-900/30"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Authorize Bot</span>
          </a>
          <button
            onClick={handleCopyAuth}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs rounded-lg border border-white/5 transition-colors flex items-center gap-1.5"
            title="Copy Authorization URL"
          >
            {copiedAuth ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copiedAuth ? 'Copied' : 'Copy Link'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 pt-8 space-y-10">
        
        {/* Banner Card */}
        <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-b from-red-950/20 via-zinc-900/40 to-zinc-950 p-8 shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Terminal className="w-64 h-64 text-red-500" />
          </div>
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
              <Zap className="w-3 h-3" />
              <span>Dedicated App-Commands & Slash Automation</span>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Selfbot 2 (Corrupt-Ware) Setup & Execution
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              This secondary method operates as an authorized Discord App Command Bot using Discord&apos;s native interactions API. It operates across server guilds and direct messages with an Owner-controlled whitelist, automatic activity rotation to <span className="text-red-400 font-mono font-medium">Corrupt-Ware</span>, and dynamic multi-page command embeds.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a 
                href={AUTH_URL} 
                target="_blank" 
                rel="noreferrer" 
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Authorize Bot (Client ID 1545467399493521478)</span>
              </a>
              <button 
                onClick={handleCopyAuth}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-white/5 flex items-center gap-2 transition-all"
              >
                {copiedAuth ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAuth ? 'Invite Link Copied!' : 'Copy OAuth2 Link'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4-Step Visual Tutorial */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-white font-medium text-lg">
            <BookOpen className="w-5 h-5 text-red-400" />
            <h3>How It Works & Setup Tutorial</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-5 flex flex-col justify-between hover:border-white/10 transition-colors">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center font-mono font-bold text-xs">
                  01
                </div>
                <h4 className="text-sm font-semibold text-white">Bot Authorization</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Open the authorization link to add the App into your Discord account, allowing it to execute in servers, group chats, and DMs.
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
                <h4 className="text-sm font-semibold text-white">Owner Whitelist</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Hardcoded owner <code className="text-red-300 font-mono text-[10px] bg-red-950/40 px-1 py-0.5 rounded">{OWNER_ID}</code> holds master permissions to whitelist or ban user execution.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-white/5">
                <span className="text-[10px] font-mono text-zinc-500">File: whitelist.json</span>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-5 flex flex-col justify-between hover:border-white/10 transition-colors">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center font-mono font-bold text-xs">
                  03
                </div>
                <h4 className="text-sm font-semibold text-white">Status Cycling</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Bot maintains an asynchronous task loop rotating status presence every 10 seconds to display <span className="text-zinc-200 font-medium">Corrupt-Ware</span>.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-white/5">
                <span className="text-[10px] font-mono text-zinc-500">Loop: 10s Presence</span>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-5 flex flex-col justify-between hover:border-white/10 transition-colors">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center font-mono font-bold text-xs">
                  04
                </div>
                <h4 className="text-sm font-semibold text-white">Interactive /help</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Saying <code className="text-zinc-200 bg-white/10 px-1 rounded">/help</code> produces a rich embed with Title, Commands list, the custom animated GIF, and Page Navigation.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-white/5">
                <span className="text-[10px] font-mono text-zinc-500">Embed + Media GIF</span>
              </div>
            </div>
          </div>
        </section>

        {/* /help Discord Interactive Embed Showcase */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-medium text-lg">
              <Sparkles className="w-5 h-5 text-red-400" />
              <h3>Interactive /help Embed & GIF Simulator</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActivePage(1)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${activePage === 1 ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
              >
                Page 1
              </button>
              <button
                onClick={() => setActivePage(2)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${activePage === 2 ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
              >
                Page 2
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
                    Corrupt-Ware
                  </span>
                  <span className="bg-[#5865F2] text-white text-[9px] font-bold px-1.5 py-0.5 rounded leading-none flex items-center gap-0.5 uppercase tracking-wide">
                    ✓ BOT
                  </span>
                  <span className="text-zinc-400 text-xs">Today at 12:00 PM</span>
                  <span className="text-zinc-500 text-xs italic ml-2">used /help</span>
                </div>

                {/* Discord Embed Box */}
                <div className="max-w-2xl bg-[#2B2D31] rounded-lg border-l-4 border-[#ED4245] p-5 shadow-lg space-y-4">
                  
                  {/* Title */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-bold text-base tracking-wide flex items-center gap-2">
                      <span>Corrupt-Ware | Commands Reference</span>
                    </h4>
                    <span className="text-zinc-400 text-xs font-mono">
                      Page {activePage} of 2
                    </span>
                  </div>

                  {/* Commands content based on active page */}
                  <div className="space-y-3 pt-1">
                    {activePage === 1 ? (
                      <div className="space-y-2.5">
                        <div className="bg-[#1E1F22] p-3 rounded border border-white/5">
                          <div className="font-mono text-xs text-red-400 font-semibold mb-0.5">
                            /say &lt;message&gt;
                          </div>
                          <div className="text-xs text-zinc-300">
                            Send a raw message broadcast directly through the bot client.
                          </div>
                        </div>

                        <div className="bg-[#1E1F22] p-3 rounded border border-white/5">
                          <div className="font-mono text-xs text-red-400 font-semibold mb-0.5">
                            /embed &lt;message&gt;
                          </div>
                          <div className="text-xs text-zinc-300">
                            Broadcast a formatted crimson Discord Embed containing your custom message.
                          </div>
                        </div>

                        <div className="bg-[#1E1F22] p-3 rounded border border-white/5">
                          <div className="font-mono text-xs text-red-400 font-semibold mb-0.5">
                            /help
                          </div>
                          <div className="text-xs text-zinc-300">
                            Display this interactive commands documentation and media showcase.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="bg-[#1E1F22] p-3 rounded border border-white/5">
                          <div className="font-mono text-xs text-red-400 font-semibold mb-0.5">
                            /whitelist &lt;user&gt;
                          </div>
                          <div className="text-xs text-zinc-300">
                            Grants user permission to invoke commands (Owner Only).
                          </div>
                        </div>

                        <div className="bg-[#1E1F22] p-3 rounded border border-white/5">
                          <div className="font-mono text-xs text-red-400 font-semibold mb-0.5">
                            /unwhitelist &lt;user&gt;
                          </div>
                          <div className="text-xs text-zinc-300">
                            Revokes user command permissions (Owner Only).
                          </div>
                        </div>

                        <div className="bg-[#1E1F22] p-3 rounded border border-white/5">
                          <div className="font-mono text-xs text-red-400 font-semibold mb-0.5">
                            /whitelisted
                          </div>
                          <div className="text-xs text-zinc-300">
                            Lists all authorized user mentions and Discord IDs.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* The Requested GIF */}
                  <div className="pt-2">
                    <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/40">
                      <img 
                        src={GIF_URL} 
                        alt="Corrupt-Ware showcase animation" 
                        className="w-full max-h-72 object-cover object-center rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  {/* Embed Footer and Next Page control */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span>Status: Playing Corrupt-Ware</span>
                    </div>

                    {/* Interactive Next Page buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActivePage(1)}
                        disabled={activePage === 1}
                        className="px-2.5 py-1 text-xs bg-[#1E1F22] hover:bg-[#35373c] disabled:opacity-30 disabled:cursor-not-allowed rounded text-zinc-300 flex items-center gap-1 transition-all"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </button>
                      <span className="text-xs font-mono text-zinc-400 px-1">
                        {activePage}/2
                      </span>
                      <button
                        onClick={() => setActivePage(2)}
                        disabled={activePage === 2}
                        className="px-2.5 py-1 text-xs bg-[#1E1F22] hover:bg-[#35373c] disabled:opacity-30 disabled:cursor-not-allowed rounded text-zinc-300 flex items-center gap-1 transition-all"
                      >
                        <span>Next Page</span>
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
              <h3>Live Command Sandbox Simulator</h3>
            </div>
            <span className="text-xs text-zinc-500 font-mono">Simulate executing slash commands</span>
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
                      <div className="font-bold text-white">Corrupt-Ware | Commands Reference (Page {msg.page || 1} of 2)</div>
                      <div className="text-zinc-300 space-y-1">
                        <div>• <code className="text-red-300">/say &lt;message&gt;</code> - Send message</div>
                        <div>• <code className="text-red-300">/embed &lt;message&gt;</code> - Send red embed</div>
                        <div>• <code className="text-red-300">/whitelist &lt;user&gt;</code> - Whitelist a user</div>
                        <div>• <code className="text-red-300">/whitelisted</code> - View whitelisted IDs</div>
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
                placeholder="Try /help, /say hello, /embed message, /whitelisted..."
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

        {/* Whitelist Manager */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-medium text-lg">
              <UserCheck className="w-5 h-5 text-red-400" />
              <h3>Whitelist Manager (whitelist.json)</h3>
            </div>
            <span className="text-xs text-zinc-500 font-mono">Owner ID: {OWNER_ID}</span>
          </div>

          <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-5 space-y-4">
            <form onSubmit={handleAddWhitelist} className="flex gap-2">
              <input
                type="text"
                value={newWhitelistId}
                onChange={e => setNewWhitelistId(e.target.value)}
                placeholder="Enter Discord User ID to whitelist..."
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-white/5 transition-colors"
              >
                Add User ID
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {whitelistUsers.map(id => (
                <div key={id} className="flex items-center justify-between bg-black/30 border border-white/5 rounded-lg px-3.5 py-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-3.5 h-3.5 ${id === OWNER_ID ? 'text-amber-400' : 'text-red-400'}`} />
                    <span className="text-xs font-mono text-zinc-300">{id}</span>
                    {id === OWNER_ID && (
                      <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 py-0.5 rounded font-mono">
                        OWNER
                      </span>
                    )}
                  </div>
                  {id !== OWNER_ID && (
                    <button
                      onClick={() => handleRemoveWhitelist(id)}
                      className="text-zinc-500 hover:text-red-400 text-xs px-1.5 py-0.5 rounded transition-colors"
                      title="Remove user"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Python Source Script Viewer */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-medium text-lg">
              <Code className="w-5 h-5 text-red-400" />
              <h3>Full Python Selfbot Code</h3>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg border border-white/5 flex items-center gap-1.5 transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied Python Script!' : 'Copy Python Code'}</span>
            </button>
          </div>

          <div className="relative rounded-xl border border-white/10 bg-black/80 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/90 border-b border-white/5 text-xs text-zinc-400 font-mono">
              <span>bot.py (discord.py app_commands)</span>
              <span>Python 3.10+</span>
            </div>
            <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed max-h-96 custom-scrollbar">
              <code>{pythonScript}</code>
            </pre>
          </div>
        </section>

      </main>
    </div>
  );
}
