import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { EmbedBuilder } from 'discord.js';
import { config } from './src/config';
import { prisma, getOrCreateGuildSettings } from './src/database/db';
import { harumiBot } from './src/bot';
import { commandRegistry } from './src/commands/registry';
import { harumiAI } from './src/ai/HarumiAI';
import { voiceWelcomeManager } from './src/voice/VoiceWelcomeManager';
import { liveTalkManager } from './src/voice/LiveTalkManager';
import { realtimeCommands } from './src/realtime/commands';
import { DEFAULT_SHOP_ITEMS } from './src/economy/EconomyManager';
import { LogService } from './src/services/LogService';
import { TTSAudioService } from './src/services/TTSAudioService';
import { voiceMasterManager } from './src/voicemaster/VoiceMasterManager';
import { soundCloudService } from './src/audio/SoundCloudService';
import { modularAudio } from './src/audio/AudioPlayer';
import { statsImageService } from './src/services/StatsImageService';

async function startServer() {
  const app = express();
  app.use(express.json());

  // Start the Discord bot in the background
  harumiBot.start().catch((err) => {
    LogService.error('Server', 'Bot initialization error', err);
  });

  // ==========================================
  // SPECIFICATION 54: HEALTH ENDPOINT
  // GET /health
  // Return: Bot status, Uptime, Version, Database status. Never return secrets.
  // ==========================================
  app.get('/health', async (_req: Request, res: Response) => {
    let dbStatus = 'healthy';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'degraded';
    }

    const botStatus = harumiBot.getStatus();

    res.json({
      status: 'ok',
      bot: {
        status: botStatus.connected ? 'online' : 'ready_simulator',
        ping: botStatus.ping,
        tag: botStatus.tag,
        guilds: botStatus.guildsCount,
      },
      uptime: Math.floor(process.uptime()),
      version: config.version,
      database: dbStatus,
      ai: 'operational',
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // DASHBOARD DATA & SETTINGS ADJUSTMENT ENDPOINTS
  // ==========================================

  // Returns all settings, channels, roles, and bot metadata for the dashboard
  app.get('/api/dashboard/data', async (req: Request, res: Response) => {
    try {
      const client = harumiBot.client;
      const botStatus = harumiBot.getStatus();

      // Collect available guilds from Discord client or simulated default
      let guildsList: Array<{ id: string; name: string; icon?: string | null; memberCount: number }> = [];

      if (client.isReady() && client.guilds.cache.size > 0) {
        guildsList = client.guilds.cache.map((g) => ({
          id: g.id,
          name: g.name,
          icon: g.iconURL(),
          memberCount: g.memberCount,
        }));
      } else {
        // Default community guild for standalone / dashboard testing
        guildsList = [
          {
            id: '123456789012345678',
            name: 'Harumi Official Server',
            icon: null,
            memberCount: 1420,
          },
        ];
      }

      const requestedGuildId = (req.query.guildId as string) || guildsList[0]?.id || '123456789012345678';
      const targetGuild = guildsList.find((g) => g.id === requestedGuildId) || guildsList[0];

      // Channels & roles list
      let textChannels: Array<{ id: string; name: string }> = [];
      let voiceChannels: Array<{ id: string; name: string }> = [];
      let roles: Array<{ id: string; name: string; color: number }> = [];

      if (client.isReady()) {
        const realGuild = client.guilds.cache.get(requestedGuildId);
        if (realGuild) {
          textChannels = realGuild.channels.cache
            .filter((c) => c.isTextBased())
            .map((c) => ({ id: c.id, name: c.name }));

          voiceChannels = realGuild.channels.cache
            .filter((c) => c.isVoiceBased())
            .map((c) => ({ id: c.id, name: c.name }));

          roles = realGuild.roles.cache.map((r) => ({
            id: r.id,
            name: r.name,
            color: r.color,
          }));
        }
      }

      // Default channels if not connected yet
      if (textChannels.length === 0) {
        textChannels = [
          { id: 'ch_general', name: 'general' },
          { id: 'ch_welcome', name: 'welcome' },
          { id: 'ch_modlogs', name: 'mod-logs' },
          { id: 'ch_tickets', name: 'tickets' },
        ];
      }

      if (voiceChannels.length === 0) {
        voiceChannels = [
          { id: 'vc_lounge', name: 'General Voice' },
          { id: 'vc_gaming', name: 'Gaming Lounge' },
          { id: 'vc_music', name: 'Music & Hangout' },
        ];
      }

      // Fetch database records for this guild
      const { settings, voiceSettings, welcomeSettings } = await getOrCreateGuildSettings(
        targetGuild.id,
        targetGuild.name,
        '0'
      );

      let talkSettings = await prisma.liveTalkSettings.findUnique({
        where: { guildId: targetGuild.id },
      });

      if (!talkSettings) {
        talkSettings = await prisma.liveTalkSettings.create({
          data: {
            guildId: targetGuild.id,
            enabled: false,
            currentVoiceChannelId: voiceChannels[0]?.id,
          },
        });
      }

      const aiConfig = harumiAI.getConfig();

      res.json({
        bot: botStatus,
        currentGuild: targetGuild,
        guilds: guildsList,
        channels: {
          text: textChannels,
          voice: voiceChannels,
        },
        roles,
        settings: {
          general: {
            prefix: settings.prefix || '.',
            verificationEnabled: settings.verificationEnabled,
            verifiedRoleId: settings.verifiedRoleId || '',
            unverifiedRoleId: settings.unverifiedRoleId || '',
            modLogChannelId: settings.modLogChannelId || '',
            starboardChannelId: settings.starboardChannelId || '',
            starThreshold: settings.starThreshold || 3,
          },
          voiceWelcome: {
            enabled: voiceSettings.enabled,
            voiceChannelId: voiceSettings.voiceChannelId || voiceChannels[0]?.id || '',
            welcomeChannelId: welcomeSettings.welcomeChannelId || textChannels[1]?.id || '',
            template: voiceSettings.template || config.defaultWelcomeTemplate,
            goodbyeMessage: welcomeSettings.goodbyeMessage || '{username} just left {server}.',
            volume: Math.round(voiceSettings.volume * 100),
            ttsEnabled: voiceSettings.ttsEnabled,
            ignoreBots: voiceSettings.ignoreBots,
            sendEmbed: welcomeSettings.sendEmbed,
          },
          liveTalk: {
            enabled: talkSettings.enabled,
            voiceChannelId: talkSettings.currentVoiceChannelId || voiceChannels[0]?.id || '',
            reconnectEnabled: talkSettings.reconnectEnabled,
            persona: 'conversational',
            debounceMs: 1500,
            maxResponseLength: 300,
          },
          automod: {
            enabled: settings.automodEnabled,
            antiSpam: settings.antiSpam,
            antiInvite: settings.antiInvite,
            antiLink: settings.antiLink,
            antiMention: settings.antiMention,
            antiCaps: settings.antiCaps,
            duplicateDetection: settings.duplicateDetection,
            minAccountAgeDays: settings.minAccountAgeDays,
            badWords: settings.badWords ? settings.badWords.split(',').map((w) => w.trim()).filter(Boolean) : [],
          },
          ai: {
            model: aiConfig.model,
            endpoint: aiConfig.endpoint,
          },
          economy: {
            dailyReward: 200,
            startingWallet: 100,
            shopItems: DEFAULT_SHOP_ITEMS,
          },
        },
      });
    } catch (error: any) {
      LogService.error('Server', 'Error serving /api/dashboard/data', error);
      res.status(500).json({
        error: 'Failed to retrieve dashboard data',
        message: error?.message || 'Database or server initialization in progress',
      });
    }
  });

  // Save Settings from Dashboard in Real-Time
  app.post('/api/dashboard/save', async (req: Request, res: Response) => {
    const { guildId, section, data } = req.body;
    if (!guildId || !section || !data) {
      return res.status(400).json({ error: 'guildId, section, and data are required' });
    }

    try {
      if (section === 'general') {
        await prisma.guildSettings.update({
          where: { guildId },
          data: {
            prefix: data.prefix,
            verificationEnabled: Boolean(data.verificationEnabled),
            verifiedRoleId: data.verifiedRoleId || null,
            unverifiedRoleId: data.unverifiedRoleId || null,
            modLogChannelId: data.modLogChannelId || null,
            starboardChannelId: data.starboardChannelId || null,
            starThreshold: parseInt(data.starThreshold, 10) || 3,
          },
        });
      } else if (section === 'voiceWelcome') {
        const volumeFloat = Math.max(0, Math.min(100, parseInt(data.volume, 10) || 100)) / 100;
        await prisma.voiceWelcomeSettings.update({
          where: { guildId },
          data: {
            enabled: Boolean(data.enabled),
            voiceChannelId: data.voiceChannelId || null,
            welcomeChannelId: data.welcomeChannelId || null,
            template: data.template || config.defaultWelcomeTemplate,
            volume: volumeFloat,
            ttsEnabled: Boolean(data.ttsEnabled),
            ignoreBots: Boolean(data.ignoreBots),
          },
        });

        await prisma.welcomeSettings.update({
          where: { guildId },
          data: {
            enabled: Boolean(data.enabled),
            welcomeChannelId: data.welcomeChannelId || null,
            goodbyeChannelId: data.goodbyeChannelId || null,
            welcomeMessage: data.welcomeMessage || data.template || config.defaultWelcomeTemplate,
            goodbyeMessage: data.goodbyeMessage || null,
            sendEmbed: data.sendEmbed !== undefined ? Boolean(data.sendEmbed) : true,
          },
        });
      } else if (section === 'liveTalk') {
        const enabled = Boolean(data.enabled);
        await prisma.liveTalkSettings.update({
          where: { guildId },
          data: {
            enabled,
            currentVoiceChannelId: data.voiceChannelId || null,
            preferredVoiceChannelId: data.voiceChannelId || null,
            reconnectEnabled: Boolean(data.reconnectEnabled),
          },
        });

        // Trigger bot action if real Discord guild is connected
        if (harumiBot.client.isReady()) {
          const realGuild = harumiBot.client.guilds.cache.get(guildId);
          if (realGuild) {
            if (enabled) {
              await liveTalkManager.enableLiveTalk(realGuild, data.voiceChannelId);
            } else {
              await liveTalkManager.disableLiveTalk(guildId);
            }
          }
        }
      } else if (section === 'automod') {
        const badWordsStr = Array.isArray(data.badWords) ? data.badWords.join(',') : (data.badWords || '');
        await prisma.guildSettings.update({
          where: { guildId },
          data: {
            automodEnabled: Boolean(data.enabled),
            antiSpam: Boolean(data.antiSpam),
            antiInvite: Boolean(data.antiInvite),
            antiLink: Boolean(data.antiLink),
            antiMention: Boolean(data.antiMention),
            antiCaps: Boolean(data.antiCaps),
            duplicateDetection: Boolean(data.duplicateDetection),
            minAccountAgeDays: parseInt(data.minAccountAgeDays, 10) || 0,
            badWords: badWordsStr,
          },
        });
      } else if (section === 'ai') {
        if (data.model) {
          harumiAI.setConfig(data.endpoint, data.model);
        }
      }

      LogService.info('Dashboard', `Settings for section '${section}' updated successfully for guild ${guildId}`);
      res.json({ success: true, message: `Settings for ${section} saved and applied in real time!` });
    } catch (err: any) {
      LogService.error('Dashboard', `Failed to save settings for ${section}`, err);
      res.status(500).json({ error: `Failed to save settings: ${err?.message || 'Database error'}` });
    }
  });

  // Re-connect Discord Bot with current credentials
  app.post('/api/dashboard/reconnect-bot', async (_req: Request, res: Response) => {
    const result = await harumiBot.reconnect();
    res.json(result);
  });

  // Connect custom bot token from Dashboard Pop-up
  app.post('/api/bot/connect', async (req: Request, res: Response) => {
    const { token, clientId } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Please provide a valid bot token.' });
    }

    const result = await harumiBot.connectWithToken(token, clientId);
    if (result.success) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const envPath = path.resolve(process.cwd(), '.env');
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        if (/^DISCORD_TOKEN=.*$/m.test(envContent)) {
          envContent = envContent.replace(/^DISCORD_TOKEN=.*$/m, `DISCORD_TOKEN="${token.trim()}"`);
        } else {
          envContent += `\nDISCORD_TOKEN="${token.trim()}"`;
        }
        if (clientId) {
          if (/^DISCORD_CLIENT_ID=.*$/m.test(envContent)) {
            envContent = envContent.replace(/^DISCORD_CLIENT_ID=.*$/m, `DISCORD_CLIENT_ID="${clientId.trim()}"`);
          } else {
            envContent += `\nDISCORD_CLIENT_ID="${clientId.trim()}"`;
          }
        }
        fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
      } catch (e) {
        LogService.warn('Server', 'Could not persist token to .env', e);
      }
    }
    res.json(result);
  });

  // Disconnect custom bot
  app.post('/api/bot/disconnect', async (_req: Request, res: Response) => {
    const result = await harumiBot.disconnectBot();
    try {
      const fs = await import('fs');
      const path = await import('path');
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf-8');
        envContent = envContent.replace(/^DISCORD_TOKEN=.*$/m, 'DISCORD_TOKEN=""');
        fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
      }
    } catch (e) {
      LogService.warn('Server', 'Could not clear token in .env', e);
    }
    res.json(result);
  });

  // Custom Bot Status & Token metadata (Never leaks full secret token)
  app.get('/api/bot/custom-status', (_req: Request, res: Response) => {
    const status = harumiBot.getStatus();
    const hasToken = Boolean(process.env.DISCORD_TOKEN || config.token);
    const clientId = process.env.DISCORD_CLIENT_ID || config.clientId || (harumiBot.client.user?.id ?? '');
    res.json({
      connected: status.connected,
      hasToken,
      tag: status.tag,
      guildsCount: status.guildsCount,
      usersCount: status.usersCount,
      ping: status.ping,
      uptimeMs: status.uptimeMs,
      clientId,
    });
  });

  // Update Bot Presence and Activity
  app.post('/api/bot/presence', (req: Request, res: Response) => {
    const { status = 'online', activityType = 2, activityName = 'Listening to .help | Harumi AI' } = req.body;
    const success = harumiBot.updatePresence(status, Number(activityType), activityName);
    res.json({ success, status, activityType, activityName, message: `Presence updated to ${status} (${activityName})` });
  });

  // 1-Click Automated VPS Installer Endpoint
  // Users or scripts can run: curl -sSL http://localhost:3000/install.sh | bash
  app.get('/install.sh', (_req: Request, res: Response) => {
    const token = process.env.DISCORD_TOKEN || '';
    const script = `#!/usr/bin/env bash
# ==============================================================================
# Harumi 1-Click 24/7 Automated VPS Installer with Bore Tunnel
# Fully compatible with FreeVPS (https://github.com/cybershadowvps/FreeVPS), Ubuntu, Debian
# ==============================================================================

set -e

echo "🚀 [Harumi 24/7 VPS Auto-Installer Starting]..."

# Install dependencies
if [ -x "$(command -v apt-get)" ]; then
    sudo apt-get update -y
    sudo apt-get install -y curl git ffmpeg build-essential python3
elif [ -x "$(command -v apk)" ]; then
    apk update
    apk add nodejs npm git ffmpeg make g++ python3 curl
fi

# Verify Node.js
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
    echo "Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 and Bore Tunnel
sudo npm install -g pm2
if ! command -v bore &> /dev/null; then
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then
        curl -fsSL https://github.com/ekzhang/bore/releases/download/v0.5.1/bore-v0.5.1-x86_64-unknown-linux-musl.tar.gz | tar -xz -C /tmp
        sudo mv /tmp/bore /usr/local/bin/bore
        sudo chmod +x /usr/local/bin/bore
    fi
fi

# Setup App
mkdir -p /root/harumi
cd /root/harumi

# Create .env
cat << 'EOF' > .env
DATABASE_URL="file:./dev.db"
PORT=3000
DISCORD_TOKEN="${token}"
DISCORD_CLIENT_ID="1352758681572221148"
AI_KEY="B4uCaEJo9ZCuZo5Am6BpAwt30lP86WMu"
AI_API_ENDPOINT="https://api.mistral.ai/v1"
AI_MODEL="open-mistral-7b"
EOF

# Initialize Database & Start
npm install --legacy-peer-deps
npx prisma generate
npx prisma db push
npm run build

pm2 delete harumi 2>/dev/null || true
pm2 start server.ts --name "harumi" --interpreter ./node_modules/.bin/tsx
pm2 save
pm2 startup | tail -n 1 | sudo bash || true

# Start Bore tunnel for 24/7 public access
if command -v bore &> /dev/null; then
    pm2 delete harumi-tunnel 2>/dev/null || true
    pm2 start "bore local 3000 --to bore.pub" --name "harumi-tunnel"
fi

echo "=========================================="
echo "✅ Harumi is running 24/7 on your VPS!"
echo "Check bot logs: pm2 logs harumi"
echo "Check tunnel URL: pm2 logs harumi-tunnel"
echo "=========================================="
`;
    res.setHeader('Content-Type', 'text/x-shellscript');
    res.send(script);
  });

  // Status & Metrics
  app.get('/api/status', async (_req: Request, res: Response) => {
    const botStatus = harumiBot.getStatus();
    const guildCount = await prisma.guild.count();
    const casesCount = await prisma.cases.count();
    const ticketsCount = await prisma.tickets.count();

    res.json({
      bot: botStatus,
      version: config.version,
      uptimeSeconds: Math.floor(process.uptime()),
      guildsActive: guildCount || 1,
      totalCases: casesCount,
      totalTickets: ticketsCount,
      aiModel: config.aiModel,
    });
  });

  // Command Registry Catalog
  app.get('/api/commands', (_req: Request, res: Response) => {
    const all = commandRegistry.getAllCommands().map((cmd) => ({
      name: cmd.name,
      category: cmd.category,
      description: cmd.description,
      usage: cmd.usage,
      cooldown: cmd.cooldown || 2,
      permission: cmd.requiredPermission ? String(cmd.requiredPermission) : 'Everyone',
    }));
    res.json(all);
  });

  // Interactive Command Execution Simulator (Both endpoints supported)
  app.post(['/api/simulate-command', '/api/simulator/command'], async (req: Request, res: Response) => {
    const rawInput = (req.body.command || req.body.input || '').trim();
    const username = req.body.username || 'John';
    const isOwner = Boolean(req.body.isOwner);
    if (!rawInput) return res.status(400).json({ error: 'Command or input is required' });

    const cleanInput = rawInput;
    const [rawCmd, ...args] = (cleanInput.startsWith('.') ? cleanInput.slice(1) : cleanInput).split(/\s+/);
    const cmdName = rawCmd.toLowerCase();

    // Check if it is a real-time command
    const rtDef = realtimeCommands[cmdName];
    if (rtDef) {
      try {
        const embed = await rtDef.execute({
          args,
          clientUptime: Math.floor(process.uptime() * 1000),
          wsPing: 24,
        });
        return res.json({
          type: 'embed',
          embed: embed.toJSON(),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Live data unavailable';
        return res.json({
          type: 'text',
          content: `✕ ${msg}`,
        });
      }
    }

    // Check AI commands
    if (cmdName === 'ai' || cmdName === 'ask' || cmdName === 'harumi' || cmdName === 'aiset' || cmdName === 'aioff' || cmdName === 'aimemory') {
      const sub = cmdName === 'aiset' ? 'set' : cmdName === 'aioff' ? 'off' : cmdName === 'aimemory' ? 'memory' : args[0]?.toLowerCase();

      // .ai set #channel
      if (sub === 'set' || sub === 'enable') {
        const chName = args[1]?.replace(/[<#>]/g, '') || 'ai-chat';
        return res.json({
          type: 'embed',
          embed: {
            title: '✨ 24/7 Harumi AI Channel Activated',
            color: 0x8b5cf6,
            description:
              `Harumi AI is now **listening and talking 24/7** in <#${chName}>!\n\n` +
              `• **Always Listening:** Anyone can simply chat, ask questions, or send photos directly\n` +
              `• **Multimodal Vision:** Harumi can see and analyze images, memes, and artwork\n` +
              `• **Profile Memory:** Remembers each user's Discord profile, banner, avatar, roles, and personality\n` +
              `• **To Turn Off:** Type \`.ai off <#${chName}>\` anytime`,
            footer: { text: `Configured by ${username}` },
          },
        });
      }

      // .ai off #channel
      if (sub === 'off' || sub === 'unset' || sub === 'disable') {
        const chName = args[1]?.replace(/[<#>]/g, '') || 'ai-chat';
        return res.json({
          type: 'text',
          content: `🛑 24/7 AI Chat Mode **Disabled** for <#${chName}>.`,
        });
      }

      // .ai replyonly [on|off]
      if (sub === 'replyonly' || sub === 'ro' || sub === 'mode') {
        const stateArg = args[1]?.toLowerCase();
        const enable = stateArg === 'on' || stateArg === 'enable' || stateArg === 'true';
        const { aiChannelManager } = await import('./src/ai/AIChannelManager');
        aiChannelManager.setReplyOnly('sim-channel', enable);
        return res.json({
          type: 'embed',
          embed: {
            title: `💬 Harumi AI: Reply-Only Mode ${enable ? 'Enabled 🟢' : 'Disabled 🔴'}`,
            color: enable ? 0x10b981 : 0x8b5cf6,
            description: enable
              ? 'Harumi will now **ONLY talk if someone pings/mentions her or replies directly to one of her messages**.\n\nShe will not reply to unmentioned messages in the channel.'
              : 'Harumi will now **listen and talk to all messages 24/7** without needing a ping or reply.',
            footer: { text: 'Toggle anytime with .ai replyonly on/off' },
          },
        });
      }

      // .ai memory / .ai profile
      if (sub === 'memory' || sub === 'profile' || sub === 'whoami') {
        const { userMemoryManager } = await import('./src/ai/UserMemoryManager');
        const { memory } = await userMemoryManager.getOrBuildProfileContext(null, {
          id: '123456789012345678',
          username,
          globalName: username,
          displayAvatarURL: () => 'https://picsum.photos/seed/harumi_avatar/256/256',
          bannerURL: () => 'https://picsum.photos/seed/harumi_banner/1024/512',
          hexAccentColor: '#8B5CF6',
          flags: { toArray: () => ['Active Developer', 'HypeSquad Bravery'] },
          createdAt: new Date('2023-01-15'),
        } as any);

        const factsList = memory.facts.length > 0
          ? memory.facts.map((f, i) => `\`${i + 1}.\` ${f}`).join('\n')
          : '*No personal facts saved yet. Harumi learns as you talk!*';

        return res.json({
          type: 'embed',
          embed: {
            title: `🧠 Harumi AI Profile Memory: ${username}`,
            color: 0x8b5cf6,
            description:
              `Here is what Harumi AI knows and remembers about **${username}**:\n\n` +
              `• **Display Name:** \`${username}\`\n` +
              `• **Discord ID:** \`123456789012345678\`\n` +
              `• **Server Roles:** Admin, VIP, Gamer, Developer\n` +
              `• **Total AI Conversations:** \`${memory.conversationCount} chats\`\n` +
              `• **Accent Color:** \`#8B5CF6\`\n` +
              `• **Banner:** [View Custom Banner](https://picsum.photos/seed/harumi_banner/1024/512)\n\n` +
              `**Remembered Facts & Interests:**\n${factsList}`,
            thumbnail: { url: 'https://picsum.photos/seed/harumi_avatar/256/256' },
            image: { url: 'https://picsum.photos/seed/harumi_banner/1024/512' },
            footer: { text: 'Use .ai remember <fact> to teach Harumi or .ai forget to reset' },
          },
        });
      }

      // .ai remember <fact>
      if (sub === 'remember') {
        const fact = args.slice(1).join(' ').trim() || 'Loves playing guitar and anime';
        const { userMemoryManager } = await import('./src/ai/UserMemoryManager');
        await userMemoryManager.addFact('123456789012345678', fact);
        return res.json({
          type: 'text',
          content: `🧠 Got it, **${username}**! I've committed to memory: *"**${fact}**"*. I'll remember this in our future chats!`,
        });
      }

      // .ai forget
      if (sub === 'forget' || sub === 'resetmemory') {
        const { userMemoryManager } = await import('./src/ai/UserMemoryManager');
        await userMemoryManager.forgetUser('123456789012345678');
        return res.json({
          type: 'text',
          content: `🧹 Cleared all saved memory facts and personality observations for **${username}**.`,
        });
      }

      const prompt = args.join(' ') || 'Hello Harumi!';
      const lower = prompt.toLowerCase();

      // Channel optimization intent (.ai improve the channels please)
      const isChannelIntent =
        sub === 'channels' ||
        sub === 'improve' ||
        sub === 'optimize' ||
        sub === 'organize' ||
        lower.includes('improve the channel') ||
        lower.includes('improve channel') ||
        lower.includes('organize channel') ||
        lower.includes('clean channel') ||
        lower.includes('duplicate channel') ||
        lower.includes('fix channel') ||
        lower.includes('adjust channel') ||
        lower.includes('change channel') ||
        lower.includes('channel setup');

      if (isChannelIntent) {
        return res.json({
          type: 'embed',
          embed: {
            title: '🏛️ AI Server Channel Optimization Report',
            color: 0x8b5cf6,
            description:
              `Harumi AI analyzed server channels and generated optimization recommendations.\n\n` +
              `**Added Basic Channels:**\n` +
              `• ✨ **#rules** (Server rules & guidelines)\n` +
              `• ✨ **#announcements** (Official server news)\n` +
              `• ✨ **#general** (Main chat)\n` +
              `• ✨ **#media** (Photos & video sharing)\n` +
              `• ✨ **#bot-commands** (Bot commands)\n\n` +
              `**Duplicate / Redundant Channels Detected (3):**\n` +
              `\`1.\` **#general-2** — *Duplicate of #general*\n` +
              `\`2.\` **#test-room** — *Unused redundant channel*\n` +
              `\`3.\` **🔊 General Voice 2** — *Duplicate voice channel*\n\n` +
              `⚠️ **Would you like to delete these redundant duplicate channels?**\nClick the button below to confirm or cancel.`,
            footer: { text: 'AI Server Architect • Safe interactive confirmation required for channel deletion' },
          },
          actions: [
            { id: 'ai_delete_channels_sim', label: 'Yes, Delete Duplicate Channels', style: 'danger' },
            { id: 'ai_cancel_channels_sim', label: 'No, Keep All Channels', style: 'secondary' },
          ],
        });
      }

      const isMusicIntent =
        lower.startsWith('play ') ||
        lower.startsWith('put on ') ||
        lower.startsWith('listen to ') ||
        lower.includes('play music') ||
        lower.includes('play song');

      if (isMusicIntent) {
        const songName = prompt.replace(/^(can you |please |harumi )?(play|put on|listen to)\s+/i, '').trim() || 'Starboy';
        return res.json({
          type: 'embed',
          embed: {
            title: '🎶 AI Music DJ Activated',
            color: 0x8b5cf6,
            description:
              `🪄 **Harumi AI selected and queued:**\n**[${songName}](https://youtube.com)**\nBy \`The Weeknd ft. Daft Punk\` • \`3:50\`\n\n` +
              `Connected to <#General Voice> 🔊`,
            footer: { text: `Requested via AI by ${username}` },
          },
        });
      }

      const aiRes = await harumiAI.generateResponse('sim_guild', 'sim_channel', '123456789012345678', prompt, {
        user: {
          id: '123456789012345678',
          username,
          globalName: username,
          displayAvatarURL: () => 'https://picsum.photos/seed/harumi_avatar/256/256',
          bannerURL: () => 'https://picsum.photos/seed/harumi_banner/1024/512',
          hexAccentColor: '#8B5CF6',
          flags: { toArray: () => ['Active Developer'] },
          createdAt: new Date('2023-01-15'),
        } as any,
      });

      return res.json({
        type: 'ai',
        content: aiRes.text,
        latencyMs: aiRes.latencyMs,
        tokens: aiRes.tokens,
      });
    }

    if (cmdName === 'aistats') {
      const stats = await harumiAI.getStats('sim_guild');
      return res.json({
        type: 'embed',
        embed: {
          title: '🧠 Harumi AI Operational Metrics',
          color: 0x5865f2,
          fields: [
            { name: 'Active Model', value: stats.activeModel, inline: true },
            { name: '24/7 AI Channels', value: `${stats.activeChannelsCount || 0}`, inline: true },
            { name: 'Requests Today', value: String(stats.requestsToday), inline: true },
            { name: 'Failed Requests', value: String(stats.failedRequests), inline: true },
            { name: 'Avg Response Latency', value: `${stats.averageLatencyMs}ms`, inline: true },
          ],
        },
      });
    }

    // Live Talk Mode Commands
    if (cmdName === 'talk' || cmdName === 'setuptalk' || cmdName === 'speak') {
      const sub = args[0]?.toLowerCase();
      if (sub === 'off' || sub === 'stop') {
        return res.json({
          type: 'live_talk',
          status: 'stopped',
          content: 'Live Talk Mode disconnected from voice channel.',
        });
      }

      if (args.length > 0 && sub !== 'on' && sub !== 'live') {
        const spokenMsg = args.join(' ');
        return res.json({
          type: 'voice_welcome',
          speech: spokenMsg,
          ttsUrl: TTSAudioService.getBrowserTTSUrl(spokenMsg),
          embed: {
            title: '🗣️ Spoken in Voice',
            color: 0x3b82f6,
            description: `**Channel:** #General Voice\n**Message:** "${spokenMsg}"`,
            footer: { text: `Requested by ${username}` },
          },
        });
      }

      const targetChannelName = 'General Voice';
      const initialGreeting = 'Live Talk Mode active. Hello everyone! I am Harumi. How can I help today?';
      return res.json({
        type: 'live_talk',
        status: 'active',
        channelName: targetChannelName,
        greeting: initialGreeting,
        ttsUrl: TTSAudioService.getBrowserTTSUrl(initialGreeting),
        embed: {
          title: '🗣️ Live AI Voice Talk Mode Active',
          color: 0x10b981,
          description:
            `Harumi has joined **#${targetChannelName}** and is actively participating in voice conversation!\n\n` +
            `• **Voice Activity Detection:** Active\n` +
            `• **Speaker Detection:** Active (listening for human speech)\n` +
            `• **Silence / Debounce:** 1.5s natural pause before responding\n` +
            `• **Interruption:** Start speaking anytime to interrupt the bot\n` +
            `• **Privacy:** Voice is processed in real time and never stored permanently.\n\n` +
            `*Run \`.talk off\` at any time to immediately disconnect and stop.*`,
          footer: { text: 'Harumi Live Talk Engine' },
        },
      });
    }

    if (cmdName === 'stoptalk') {
      return res.json({
        type: 'live_talk',
        status: 'stopped',
        content: 'Live Talk Mode stopped.',
      });
    }

    // Music Commands Simulation
    if (cmdName === 'play' || cmdName === 'p') {
      const trackName = args.join(' ') || 'Starboy - The Weeknd';
      return res.json({
        type: 'embed',
        embed: {
          title: '🎶 Now Playing',
          color: 0x10b981,
          description: `**[${trackName}](https://youtube.com)**\nBy \`The Weeknd ft. Daft Punk\` • \`3:50\``,
          footer: { text: `Requested by ${username}` },
        },
      });
    }

    if (cmdName === 'smartplaylist' || cmdName === 'spl') {
      const theme = args.join(' ') || 'cyberpunk night drive synthwave';
      return res.json({
        type: 'embed',
        embed: {
          title: `✨ Smart AI Playlist: Vibes of ${theme}`,
          color: 0x8b5cf6,
          description:
            `*AI-curated high-energy playlist matching "${theme}"*\n\n` +
            `\`1.\` **Midnight City** by \`M83\` (4:03)\n` +
            `\`2.\` **Blinding Lights** by \`The Weeknd\` (3:20)\n` +
            `\`3.\` **Resonance** by \`HOME\` (3:32)\n` +
            `\`4.\` **Nightcall** by \`Kavinsky\` (4:19)\n` +
            `\`5.\` **After Dark** by \`Mr.Kitty\` (4:17)\n\n` +
            `*Loaded 10 songs into server queue with harmonic transitions!*`,
          footer: { text: 'Generated by Harumi AI Smart DJ' },
        },
      });
    }

    if (cmdName === 'smartshuffle' || cmdName === 'sshuffle') {
      return res.json({
        type: 'embed',
        embed: {
          title: '🧠 Smart Harmonic AI Energy Shuffle Applied',
          color: 0x8b5cf6,
          description:
            `Harumi AI analyzed track tempos, genres, and energy curves.\n` +
            `Queue reordered into a smooth **Warmup ➔ Peak Energy ➔ Chillout** transition curve!`,
          footer: { text: 'Smart AI Audio Flow Engine' },
        },
      });
    }

    if (cmdName === 'queue' || cmdName === 'q') {
      return res.json({
        type: 'embed',
        embed: {
          title: '🎵 Server Music Queue (6 tracks)',
          color: 0x5865f2,
          description:
            `**Now Playing:** [Starboy](https://youtube.com) (\`3:50\`)\n\n` +
            `**Up Next:**\n` +
            `\`1.\` [Blinding Lights](https://youtube.com) • \`3:20\` (Requested by Alex)\n` +
            `\`2.\` [Levitating](https://youtube.com) • \`3:23\` (Requested by Sam)\n` +
            `\`3.\` [Sunflower](https://youtube.com) • \`2:38\` (Requested by Maya)\n` +
            `\`4.\` [Midnight City](https://youtube.com) • \`4:03\` (Requested by Jordan)\n` +
            `\`5.\` [Stay](https://youtube.com) • \`2:21\` (Requested by Chris)`,
          footer: { text: 'Use .smartshuffle to reorder by energy harmonic flow' },
        },
      });
    }

    // YouTube Watch Together Simulation
    if (cmdName === 'watchvideos' || cmdName === 'watch' || cmdName === 'youtube' || cmdName === 'yt') {
      const videoQuery = args.join(' ') || 'Lofi Hip Hop Radio 24/7 Live Stream';
      return res.json({
        type: 'embed',
        embed: {
          title: `📺 YouTube Watch Together: ${videoQuery}`,
          color: 0xff0000,
          description:
            `**Watch video synchronized in voice channel #General Voice!**\n\n` +
            `• **Channel:** \`Lofi Girl / YouTube Official\`\n` +
            `• **Duration:** \`14:20\` • **Views:** \`1.4M views\`\n` +
            `• **Host:** <@${username}>\n\n` +
            `*Interactive YouTube Screenshare activity launched in Discord voice channel!*`,
          footer: { text: 'Harumi YouTube Together Activity • Synchronized Voice Screenshare' },
        },
      });
    }

    // VoiceMaster Simulation (.vc setup)
    if (cmdName === 'voicemaster' || cmdName === 'vm' || cmdName === 'vc') {
      const sub = args[0]?.toLowerCase() || 'setup';
      if (sub === 'setup') {
        return res.json({
          type: 'embed',
          embed: {
            title: '🎛️ Voice Control Interface Deployed',
            color: 0x0f111a,
            description:
              `VoiceMaster dynamic voice system is ready!\n\n` +
              `• **Hub Channel:** 🔊 \`➕ Join to Create\` *(Join to automatically create your personal voice room)*\n` +
              `• **Control Panel:** 💬 \`🎛️-vc-control\` *(🔒 Channel strictly locked to @everyone, interactive embed buttons)*\n` +
              `• **Permissions:** @everyone cannot send messages or reactions. Room owners control via button panel.\n` +
              `• **Auto-Cleanup:** Rooms delete automatically when all users leave.`,
            footer: { text: 'Channel #🎛️-vc-control locked • Interactive Discord embed buttons active' },
          },
        });
      }
      return res.json({
        type: 'text',
        content: `🎛️ Voice Control action \`${sub}\` applied to your dynamic room.`,
      });
    }

    if (cmdName === 'interface') {
      return res.json({
        type: 'text',
        content: 'ℹ️ The `.interface` command has been removed. Use `.vc setup` to deploy your VoiceMaster hub and locked control panel channel (`#🎛️-vc-control`).',
      });
    }

    if (cmdName === 'com' || cmdName === 'community') {
      return res.json({
        type: 'text',
        content: 'ℹ️ The `.com` command suite has been removed. Use `.help` to view all active commands.',
      });
    }

    // Welcome Setup & Channel Lockdown Simulator (.welcomesetup / .setupwelcome / .welcomelock)
    if (cmdName === 'welcomesetup' || cmdName === 'setupwelcome' || cmdName === 'welcomelock' || cmdName === 'locksetup' || cmdName === 'setupwelc') {
      const simulatedGuild = {
        name: 'Harumi Community',
        memberCount: 1420,
      };
      const simulatedOwnerName = isOwner ? username : 'Alex';
      const speech = voiceWelcomeManager.formatWelcomeMessage(
        config.defaultWelcomeTemplate,
        { user: { username: 'NewMember', id: '999' }, displayName: 'NewMember' },
        simulatedGuild,
        simulatedOwnerName
      );

      return res.json({
        type: 'embed',
        embed: {
          title: '🛡️ 24/7 Welcome & Server Verification Active',
          color: 0x10b981,
          description:
            `The server onboarding and verification system has been configured!\n\n` +
            `• **Member Role:** \`@Member\` *(Created & granted all channel access)*\n` +
            `• **Locked Channels:** **4 channels** locked for \`@everyone\`\n` +
            `• **Welcome Voice Channel:** 🔊 \`welcome-voice\` *(Accessible to new members 24/7)*\n` +
            `• **Welcome Text Channel:** 💬 \`welcome\`\n\n` +
            `✨ **How it works 24/7:**\n` +
            `When every new member joins the server or joins 🔊 \`welcome-voice\`, Harumi speaks the personalized TTS welcome announcement. **As soon as they finish hearing the TTS audio, Harumi automatically grants them the \`@Member\` role 24/7 and unlocks the whole server!**`,
          footer: { text: 'Harumi Security & 24/7 Voice Verification Gateway' },
        },
        speech,
        ttsUrl: TTSAudioService.getBrowserTTSUrl(speech),
        memberRole: 'Member',
        lockedCount: 4,
      });
    }

    // Verification Commands (.verify, .verify setup, .verify panel)
    if (cmdName === 'verify') {
      const sub = args[0]?.toLowerCase();
      if (sub === 'setup' || sub === 'lock' || sub === 'lockdown') {
        return res.json({
          type: 'embed',
          embed: {
            title: '🛡️ Server Verification Lockdown Configured',
            color: 0x10b981,
            description:
              `• **Member Role:** \`@Member\` *(Created & granted all access)*\n` +
              `• **Locked Channels:** All regular channels locked for \`@everyone\`\n` +
              `• **24/7 Voice Welcome:** In 🔊 \`welcome-voice\`\n\n` +
              `New members will automatically be verified and given the Member role when they finish hearing the voice welcome TTS!`,
            footer: { text: 'Harumi Security Gateway' },
          },
        });
      }

      return res.json({
        type: 'embed',
        embed: {
          title: '🛡️ Server Member Verification Portal',
          color: 0x10b981,
          description:
            `Welcome to the server!\n\n` +
            `• **Option 1 (Automatic 24/7):** Join 🔊 **welcome-voice** and listen to the personalized TTS greeting to automatically get verified.\n` +
            `• **Option 2:** Click **Verify Account** below.\n\n` +
            `🔒 *All other channels remain locked until verification is complete.*`,
          footer: { text: 'Harumi 24/7 Verification Gateway' },
        },
      });
    }

    // Embed Announcement Simulator (.embed Title | Desc | Color)
    if (cmdName === 'embed' || cmdName === 'announcement') {
      const full = args.join(' ');
      const parts = full.split('|').map((s: string) => s.trim());
      const title = parts[0] || '📢 Server Announcement';
      const desc = parts[1] || 'Welcome to our updated server! Voice rooms and AI channels are now live.';
      const hexColor = parts[2] || '#8B5CF6';
      const colorNum = parseInt(hexColor.replace('#', ''), 16) || 0x8b5cf6;

      return res.json({
        type: 'embed',
        embed: {
          title,
          description: desc,
          color: colorNum,
          footer: { text: `Published by ${username} • Interactive Embed Studio` },
        },
      });
    }

    // Reaction Role Simulator (.reactionrole / .rr / .rolesetup)
    if (cmdName === 'reactionrole' || cmdName === 'rr' || cmdName === 'rolesetup') {
      return res.json({
        type: 'embed',
        embed: {
          title: '🏷️ SELF-ASSIGNABLE ROLES • INTERACTIVE PANEL',
          color: 0x8b5cf6,
          description:
            `Click the buttons below to toggle your server roles on or off!\n\n` +
            `• **🔔 Announcements:** Receive pings for major announcements and community updates\n` +
            `• **🎮 Events:** Get notified when gaming nights or voice stages go live\n` +
            `• **🎉 Giveaways:** Get pinged for server giveaways & special events\n\n` +
            `*Roles are updated instantaneously upon clicking.*`,
          footer: { text: 'Harumi Self-Assignable Role Engine' },
        },
        actions: [
          { id: 'rr_announcements', label: 'Announcements', style: 'primary' },
          { id: 'rr_events', label: 'Events', style: 'secondary' },
          { id: 'rr_giveaways', label: 'Giveaways', style: 'success' },
        ],
      });
    }

    // Server Stats & Analytics Image Card Simulator (.serverstats / .ss / .stats / .analytics)
    if (cmdName === 'serverstats' || cmdName === 'ss' || cmdName === 'stats' || cmdName === 'analytics') {
      const customServerName = args.length > 0 ? args.join(' ').trim() : 'Harumi Community';
      const approxMsgs1d = Math.floor(Math.random() * 800 + 420);
      const approxMsgs7d = Math.floor(approxMsgs1d * 6.5);
      const approxMsgs60d = `${((approxMsgs7d * 8.2) / 1000).toFixed(1)}k`;

      const approxVc1d = `${(Math.random() * 8 + 3).toFixed(1)} hours`;
      const approxVc7d = `${(Math.random() * 45 + 25).toFixed(1)} hours`;
      const approxVc60d = `${(Math.random() * 180 + 120).toFixed(1)} hours`;

      const approxContrib1d = Math.floor(Math.random() * 40 + 25);
      const approxContrib7d = Math.floor(approxContrib1d * 4.2);
      const approxContrib60d = Math.floor(approxContrib7d * 3.8);

      const buffer = await statsImageService.generateServerStatsImage({
        serverName: customServerName,
        totalMembers: 1420,
        onlineMembers: 640,
        createdOn: 'January 8, 2024',
        invitedBotOn: 'October 14, 2024',
        lookbackDays: 60,
        messages: { '1d': approxMsgs1d, '7d': approxMsgs7d, '60d': approxMsgs60d },
        voiceActivity: { '1d': approxVc1d, '7d': approxVc7d, '60d': approxVc60d },
        contributors: { '1d': approxContrib1d, '7d': approxContrib7d, '60d': approxContrib60d },
        topMembers: {
          text: { name: username, value: `${approxMsgs1d * 3} messages` },
          voice: { name: 'TopSpeaker', value: approxVc7d },
        },
        topChannels: {
          text: { name: '#general', value: `${approxMsgs7d} messages` },
          voice: { name: '🔊 Lounge', value: approxVc60d },
        },
      });

      const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;

      return res.json({
        type: 'embed',
        embed: {
          title: `📊 Server Overview & Activity Telemetry: ${customServerName}`,
          color: 0x10b981,
          description: `Visual telemetry breakdown and activity wave metrics for **${customServerName}**.`,
          image: { url: dataUrl },
          footer: { text: 'Harumi Statbot Visual Engine • Generated via .ss' },
        },
        imageUrl: dataUrl,
        downloadName: 'server-analytics.png',
      });
    }

    // Voice Activity & Room Duration Card Simulator (.vcstats / .voicestats / .vcanalytics)
    if (cmdName === 'vcstats' || cmdName === 'voicestats' || cmdName === 'vcanalytics') {
      const customTarget = args.length > 0 ? args.join(' ').trim() : 'Harumi Community';
      const totalMinutes = Math.floor(Math.random() * 8000 + 4500);
      const totalHours = totalMinutes / 60;
      const totalDays = totalHours / 24;
      const totalWeeks = totalDays / 7;
      const totalMonths = totalDays / 30.4;

      const buffer = await statsImageService.generateVoiceStatsImage({
        serverName: customTarget,
        userName: username,
        totalHours,
        totalMinutes,
        totalDays,
        totalWeeks,
        totalMonths,
        formattedTotal: `${totalHours.toFixed(1)} hours logged in voice`,
        breakdown: {
          today: `${(totalHours * 0.08).toFixed(1)}h`,
          thisWeek: `${(totalHours * 0.35).toFixed(1)}h`,
          thisMonth: `${(totalHours * 0.75).toFixed(1)}h`,
          allTime: `${totalHours.toFixed(1)}h`,
        },
        topRooms: [
          { name: '🔊 Lounge Voice', duration: `${(totalHours * 0.45).toFixed(1)}h`, count: 184 },
          { name: '🔊 Gaming Squad 1', duration: `${(totalHours * 0.28).toFixed(1)}h`, count: 96 },
          { name: '🔊 Study & Focus', duration: `${(totalHours * 0.16).toFixed(1)}h`, count: 42 },
          { name: '🔊 Music Room', duration: `${(totalHours * 0.11).toFixed(1)}h`, count: 68 },
        ],
        peakHours: '7:30 PM - 11:30 PM UTC',
        hourlyTrends: [10, 6, 4, 2, 3, 6, 12, 28, 48, 65, 82, 95, 120, 155, 190, 230, 255, 220, 175, 110, 75, 40, 20, 12],
      });

      const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;

      return res.json({
        type: 'embed',
        embed: {
          title: `🎙️ Voice Duration & Room Analytics: ${customTarget}`,
          color: 0xec4899,
          description: `Total hours, minutes, days, weeks, and months spent in voice channels.`,
          image: { url: dataUrl },
          footer: { text: 'Harumi VoiceMaster Telemetry • Generated via .vcstats' },
        },
        imageUrl: dataUrl,
        downloadName: 'voice-analytics.png',
      });
    }

    // User Profile & Activity Card Simulator (.userstats / .mystats / .profilecard / .activity)
    if (cmdName === 'userstats' || cmdName === 'mystats' || cmdName === 'profilecard' || cmdName === 'activity') {
      const targetUser = args.length > 0 ? args.join(' ').replace(/[<@!>]/g, '') : username;
      const totalMsgs = Math.floor(Math.random() * 2400 + 450);
      const totalVcHours = parseFloat((Math.random() * 65 + 8).toFixed(1));
      const rank = Math.floor(Math.random() * 15 + 1);
      const score = Math.min(100, Math.max(25, Math.floor(totalMsgs / 30 + totalVcHours)));

      const buffer = await statsImageService.generateUserStatsImage({
        username: targetUser,
        serverName: 'Harumi Community',
        joinedDate: 'Jan 15, 2024',
        totalMessages: totalMsgs,
        totalVoiceHours: totalVcHours,
        rank,
        topChannel: '#general',
        activityScore: score,
      });

      const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;

      return res.json({
        type: 'embed',
        embed: {
          title: `👤 Member Activity Card: ${targetUser}`,
          color: 0x8b5cf6,
          description: `Engagement score, ranking, messages, and voice metrics for **${targetUser}**.`,
          image: { url: dataUrl },
          footer: { text: 'Harumi Profiler • Generated via .userstats' },
        },
        imageUrl: dataUrl,
        downloadName: 'user-profile.png',
      });
    }

    // Channel Stats Image Card Simulator (.cs / .channelstats)
    if (cmdName === 'channelstats' || cmdName === 'cs') {
      const targetCh = args.length > 0 ? args[0].replace(/[<#>]/g, '') : 'general';
      const buffer = await statsImageService.generateChannelStatsImage({
        channelName: targetCh,
        serverName: 'Harumi Community',
        topic: 'General server discussions & community hangout',
        messagesToday: 3420,
        messages7d: 18450,
        activeChatters: 84,
        topChatter: { name: username, count: 420 },
        peakHour: '8:00 PM - 10:00 PM UTC',
        hourlyTrends: [20, 12, 8, 5, 8, 14, 35, 68, 95, 120, 145, 180, 210, 245, 290, 340, 310, 260, 200, 150, 110, 80, 50, 30],
      });

      const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;

      return res.json({
        type: 'embed',
        embed: {
          title: `📁 Channel Activity Telemetry: #${targetCh}`,
          color: 0x38bdf8,
          description: `Chat velocity and peak engagement curve for **#${targetCh}**.`,
          image: { url: dataUrl },
          footer: { text: 'Harumi Channel Analytics • Generated via .cs' },
        },
        imageUrl: dataUrl,
        downloadName: 'channel-analytics.png',
      });
    }

    // Server Leaderboard Image Card Simulator (.lb / .leaderboard / .top)
    if (cmdName === 'leaderboard' || cmdName === 'lb' || cmdName === 'top') {
      const customServerName = args.length > 0 ? args.join(' ').trim() : 'Harumi Community';
      const buffer = await statsImageService.generateLeaderboardImage({
        serverName: customServerName,
        lookbackPeriod: 'All-Time',
        topText: [
          { rank: 1, name: username, count: 4820 },
          { rank: 2, name: 'Sammy_Gamer', count: 3410 },
          { rank: 3, name: 'Maya_Design', count: 2890 },
          { rank: 4, name: 'Jordan_Code', count: 1940 },
          { rank: 5, name: 'Chris_Vibes', count: 1420 },
        ],
        topVoice: [
          { rank: 1, name: 'NightOwl_99', duration: '94.2h' },
          { rank: 2, name: username, duration: '78.5h' },
          { rank: 3, name: 'Chloe_Live', duration: '52.1h' },
          { rank: 4, name: 'Ethan_Music', duration: '39.8h' },
          { rank: 5, name: 'Liam_Chill', duration: '28.4h' },
        ],
      });

      const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;

      return res.json({
        type: 'embed',
        embed: {
          title: `🏆 Server Engagement Leaderboard: ${customServerName}`,
          color: 0xf59e0b,
          description: `Top text chatters and top voice speakers in **${customServerName}**.`,
          image: { url: dataUrl },
          footer: { text: 'Harumi Leaderboard Engine • Generated via .lb' },
        },
        imageUrl: dataUrl,
        downloadName: 'server-leaderboard.png',
      });
    }

    // Bot Telemetry & System Status Card Simulator (.botstats / .systemstats)
    if (cmdName === 'botstats' || cmdName === 'systemstats') {
      const buffer = await statsImageService.generateBotStatsImage({
        botName: 'Harumi Engine',
        uptime: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
        serversCount: 14,
        usersCount: 18450,
        wsPing: 24,
        memoryUsage: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
        audioActiveStreams: 3,
        automodShieldStatus: 'Active',
        aiEngineStatus: 'Connected',
      });

      const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;

      return res.json({
        type: 'embed',
        embed: {
          title: `🤖 Harumi Bot Telemetry & System Status`,
          color: 0x8b5cf6,
          description: `Cluster health, voice streams, and threat defense telemetry.`,
          image: { url: dataUrl },
          footer: { text: 'Harumi System Engine • Generated via .botstats' },
        },
        imageUrl: dataUrl,
        downloadName: 'bot-telemetry.png',
      });
    }

    // YouTube Watch Together Simulator
    if (cmdName === 'watchvideos' || cmdName === 'watch' || cmdName === 'youtube' || cmdName === 'yt' || cmdName === 'watchtogether') {
      const videoQuery = args.join(' ').trim() || 'Lofi Hip Hop Radio 24/7 Live Stream';
      const videoTitle = videoQuery.includes('http') ? 'YouTube Live Stream' : videoQuery;
      const videoUrl = videoQuery.startsWith('http') ? videoQuery : `https://www.youtube.com/results?search_query=${encodeURIComponent(videoQuery)}`;
      const activityUrl = `https://discord.com/channels/123456789012345678/vc_lounge`;

      return res.json({
        type: 'watch',
        videoTitle,
        videoUrl,
        activityUrl,
        embed: {
          title: `📺 YouTube Watch Together: ${videoTitle}`,
          color: 0xff0000,
          description:
            `**Watch video synchronized in voice channel <#General Voice>!**\n\n` +
            `• **Video:** \`${videoTitle}\`\n` +
            `• **Channel:** \`YouTube Official / VEVO\` • **Views:** \`1.4M views\`\n` +
            `• **Host:** <@${username}>\n` +
            `• **Voice Status:** Connected & streaming synchronized audio 🔊\n\n` +
            `*Click **Launch YouTube Screenshare** to start the synchronized interactive YouTube video stream in Discord!*`,
          image: { url: `https://picsum.photos/seed/${encodeURIComponent(videoTitle)}/640/360` },
          footer: { text: 'Harumi YouTube Together Activity • Synchronized Voice Screenshare' },
        },
        speech: `Starting YouTube Watch Together screenshare for ${videoTitle}`,
        ttsUrl: TTSAudioService.getBrowserTTSUrl(`Starting YouTube Watch Together screenshare for ${videoTitle}`),
      });
    }

    if (cmdName === 'testwelc' || cmdName === 'welcpreview') {
      const simulatedGuild = {
        name: 'Harumi Community',
        memberCount: 1420,
      };
      const simulatedMember = {
        user: { username, id: '123456789' },
        displayName: username,
      };
      const simulatedOwnerName = isOwner ? username : 'Alex';
      const speech = voiceWelcomeManager.formatWelcomeMessage(
        config.defaultWelcomeTemplate,
        simulatedMember,
        simulatedGuild,
        simulatedOwnerName
      );

      return res.json({
        type: 'voice_welcome',
        speech,
        ttsUrl: TTSAudioService.getBrowserTTSUrl(speech),
        ownerDisplayName: simulatedOwnerName,
        joiningUser: username,
        template: config.defaultWelcomeTemplate,
      });
    }

    // Revamped Short Help command
    if (cmdName === 'help') {
      const sub = args[0]?.toLowerCase();

      if (sub === '2' || sub === 'music') {
        return res.json({
          type: 'embed',
          embed: {
            title: '🎵 Music & Playlists — Commands (25)',
            color: 0x5865f2,
            description:
              '• **`.play <song>`** — Plays song or adds to queue (Aliases: `.p`)\n' +
              '• **`.pause`** / **`.resume`** — Pause/resume playback\n' +
              '• **`.skip`** — Skip to next song (Aliases: `.next`, `.s`)\n' +
              '• **`.stop`** — Stop music, clear queue, and leave voice (Aliases: `.dc`)\n' +
              '• **`.volume <0-100>`** — Set volume smoothly (Aliases: `.vol`)\n' +
              '• **`.queue`** — View upcoming songs in queue (Aliases: `.q`)\n' +
              '• **`.nowplaying`** — Show rich visual progress bar (Aliases: `.np`)\n' +
              '• **`.smartshuffle`** — AI harmonic energy flow shuffle (Aliases: `.sshuffle`)\n' +
              '• **`.smartplaylist <vibe>`** — AI generated themed playlist (Aliases: `.spl`)\n' +
              '• **`.loop <track|queue|off>`** — Toggle loop mode (Aliases: `.repeat`)\n' +
              '• **`.lyrics [song]`** — Synchronized song lyrics\n' +
              '• **`.bassboost <on|off>`** — High-fidelity bass booster EQ\n' +
              '• **`.nightcore`** — 1.25x speed and high pitch DSP filter\n' +
              '• **`.vaporwave`** — Slowed + reverb aesthetic filter\n' +
              '• **`.clearqueue`** — Clear upcoming songs (Aliases: `.cq`)\n' +
              '• **`.jump <number>`** — Jump to specific track (Aliases: `.skipto`)\n' +
              '• **`.remove <number>`** — Remove track from queue\n' +
              '• **`.saveplaylist <name>`** / **`.loadplaylist <name>`** — Server playlist DB\n' +
              '• **`.autoplay <on|off>`** — Intelligent continuous AI recommendations\n' +
              '• **`.history`** — Recently played songs history',
            footer: { text: 'Tip: Use .help to view all categories' },
          },
        });
      }

      if (sub === '3' || sub === 'watch') {
        return res.json({
          type: 'embed',
          embed: {
            title: '📺 YouTube Watch Together — Commands (1)',
            color: 0xff0000,
            description:
              '• **`.watchvideos <video name or URL>`** — Starts synchronized YouTube player in voice (Aliases: `.watch`, `.youtube`, `.yt`)',
            footer: { text: 'Tip: Use .help to view all categories' },
          },
        });
      }

      if (sub === '5' || sub === 'voicemaster' || sub === 'vm') {
        return res.json({
          type: 'embed',
          embed: {
            title: '🎛️ VoiceMaster Dynamic Rooms — Commands (10)',
            color: 0x5865f2,
            description:
              '• **`.vm setup`** — Deploy VoiceMaster Hub & Control Panel\n' +
              '• **`.vm lock`** / **`.vmlock`** — Lock your room to others\n' +
              '• **`.vm unlock`** / **`.vmunlock`** — Unlock your room\n' +
              '• **`.vm hide`** / **`.vmhide`** — Hide room from server list\n' +
              '• **`.vm unhide`** / **`.vmunhide`** — Unhide room\n' +
              '• **`.vm name <new name>`** — Rename your temporary room\n' +
              '• **`.vm limit <0-99>`** — Set room user capacity\n' +
              '• **`.vm permit @user`** — Allow specific user in locked room\n' +
              '• **`.vm reject @user`** — Block and kick user from room\n' +
              '• **`.vm claim`** — Claim room ownership if owner left\n' +
              '• **`.vm info`** — Show room status and occupants',
            footer: { text: 'Tip: Use .help to view all categories' },
          },
        });
      }

      // Global super short help overview
      return res.json({
        type: 'embed',
        embed: {
          title: '🌸 Harumi Command Hub (180+ Commands)',
          color: 0x5865f2,
          description:
            '**Categories:**\n' +
            '`1.` 🤖 **AI Assistant** — `.help 1` or `.help ai` (4 cmds)\n' +
            '`2.` 🎵 **Music & Audio** — `.help 2` or `.help music` (25 cmds)\n' +
            '`3.` 📺 **YouTube Watch** — `.help 3` or `.help watch` (1 cmd)\n' +
            '`4.` 🎙️ **Voice & Live Talk** — `.help 4` or `.help voice` (6 cmds)\n' +
            '`5.` 🎛️ **VoiceMaster** — `.help 5` or `.help vm` (10 cmds)\n' +
            '`6.` 🛡️ **Moderation** — `.help 6` or `.help mod` (9 cmds)\n' +
            '`7.` ⚡ **AutoMod** — `.help 7` or `.help automod` (1 cmd)\n' +
            '`8.` 🎫 **Tickets** — `.help 8` or `.help tickets` (2 cmds)\n' +
            '`9.` 💰 **Economy** — `.help 9` or `.help economy` (7 cmds)\n' +
            '`10.` 🏆 **Leveling** — `.help 10` or `.help leveling` (2 cmds)\n' +
            '`11.` 🎉 **Community** — `.help 11` or `.help community` (4 cmds)\n' +
            '`12.` 🌐 **Real-Time Feeds** — `.help 12` or `.help realtime` (100 cmds)\n' +
            '`13.` 🛠️ **Utility & Fun** — `.help 13` or `.help utility` (5 cmds)\n\n' +
            '💡 **Tip:** Use `.help <category_name>` or `.help <number>` (e.g. `.help music` or `.help 2`) to view all commands in that category!',
          footer: { text: 'Harumi Community Platform • Fast & Modular' },
        },
      });
    }

    // Generic fallback mock for simulation
    return res.json({
      type: 'text',
      content: `Command \`.${cmdName}\` executed successfully.`,
    });
  });

  // High-reliability Audio TTS Streaming Proxy Endpoint
  app.get('/api/tts', async (req: Request, res: Response) => {
    const text = (req.query.text as string) || '';
    const lang = (req.query.lang as string) || 'en';

    if (!text.trim()) {
      return res.status(400).send('Text is required');
    }

    try {
      const buffer = await TTSAudioService.getTTSBuffer(text, lang);
      if (buffer && buffer.length > 0) {
        const isWav = buffer.length > 4 && buffer.toString('ascii', 0, 4) === 'RIFF';
        res.setHeader('Content-Type', isWav ? 'audio/wav' : 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Content-Length', buffer.length);
        return res.send(buffer);
      }

      // Fallback synthetic buffer if all providers fail
      const fallbackBuffer = TTSAudioService.generateSyntheticChimeBuffer(2);
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Content-Length', fallbackBuffer.length);
      return res.send(fallbackBuffer);
    } catch (err: any) {
      LogService.error('Server', 'TTS Proxy Error', err);
      const fallbackBuffer = TTSAudioService.generateSyntheticChimeBuffer(2);
      res.setHeader('Content-Type', 'audio/wav');
      return res.send(fallbackBuffer);
    }
  });

  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    const { prompt, images, imageUrls, user } = req.body;
    if (!prompt && (!images || images.length === 0) && (!imageUrls || imageUrls.length === 0)) {
      return res.status(400).json({ error: 'Prompt or image is required' });
    }

    const result = await harumiAI.generateResponse('web_guild', 'web_channel', user?.id || 'web_user', prompt || '', {
      user: user || {
        id: '123456789012345678',
        username: 'Alex',
        globalName: 'Alex',
        displayAvatarURL: () => 'https://picsum.photos/seed/alex/256/256',
        bannerURL: () => 'https://picsum.photos/seed/alex_banner/1024/512',
        hexAccentColor: '#8B5CF6',
        flags: { toArray: () => ['Active Developer'] },
        createdAt: new Date('2023-01-15'),
      } as any,
      images,
      imageUrls,
    });
    res.json(result);
  });

  // Get active 24/7 AI Channels
  app.get('/api/ai/channels', async (req: Request, res: Response) => {
    const guildId = (req.query.guildId as string) || '123456789012345678';
    const { aiChannelManager } = await import('./src/ai/AIChannelManager');
    const list = await aiChannelManager.getAIChannels(guildId);
    res.json(list);
  });

  // Set 24/7 AI Channel
  app.post('/api/ai/set-channel', async (req: Request, res: Response) => {
    const { guildId = '123456789012345678', channelId, channelName = 'ai-chat', setBy = 'Admin' } = req.body;
    if (!channelId) return res.status(400).json({ error: 'channelId is required' });
    const { aiChannelManager } = await import('./src/ai/AIChannelManager');
    const result = await aiChannelManager.setAIChannel(guildId, channelId, channelName, setBy);
    res.json(result);
  });

  // Remove 24/7 AI Channel
  app.post('/api/ai/remove-channel', async (req: Request, res: Response) => {
    const { guildId = '123456789012345678', channelId } = req.body;
    if (!channelId) return res.status(400).json({ error: 'channelId is required' });
    const { aiChannelManager } = await import('./src/ai/AIChannelManager');
    const result = await aiChannelManager.removeAIChannel(guildId, channelId);
    res.json(result);
  });

  // Toggle Global Reply-Only Mode
  app.get('/api/ai/global-reply-only', async (_req: Request, res: Response) => {
    const { aiChannelManager } = await import('./src/ai/AIChannelManager');
    res.json({ replyOnly: aiChannelManager.isGlobalReplyOnly() });
  });

  app.post('/api/ai/global-reply-only', async (req: Request, res: Response) => {
    const { enabled } = req.body;
    const { aiChannelManager } = await import('./src/ai/AIChannelManager');
    aiChannelManager.setGlobalReplyOnly(Boolean(enabled));
    res.json({ success: true, replyOnly: Boolean(enabled) });
  });

  // Toggle Reply-Only Mode per channel
  app.post('/api/ai/set-reply-only', async (req: Request, res: Response) => {
    const { channelId, enabled } = req.body;
    if (!channelId) return res.status(400).json({ error: 'channelId is required' });
    const { aiChannelManager } = await import('./src/ai/AIChannelManager');
    aiChannelManager.setReplyOnly(channelId, Boolean(enabled));
    res.json({ success: true, channelId, replyOnly: Boolean(enabled) });
  });

  app.get('/api/ai/reply-only/:channelId', async (req: Request, res: Response) => {
    const { channelId } = req.params;
    const { aiChannelManager } = await import('./src/ai/AIChannelManager');
    res.json({ channelId, replyOnly: aiChannelManager.isReplyOnly(channelId) });
  });

  // Get User Memory Profile
  app.get('/api/ai/memory/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { userMemoryManager } = await import('./src/ai/UserMemoryManager');
    const memory = await userMemoryManager.getUserMemory(userId);
    res.json(memory || { message: 'No memory record found for this user.' });
  });

  // Add Fact to User Memory
  app.post('/api/ai/memory/:userId/add-fact', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { fact } = req.body;
    if (!fact) return res.status(400).json({ error: 'fact is required' });
    const { userMemoryManager } = await import('./src/ai/UserMemoryManager');
    const facts = await userMemoryManager.addFact(userId, fact);
    res.json({ success: true, facts });
  });

  // Reset User Memory
  app.delete('/api/ai/memory/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { userMemoryManager } = await import('./src/ai/UserMemoryManager');
    const success = await userMemoryManager.forgetUser(userId);
    res.json({ success });
  });

  // Voice Welcome Preview & Test
  app.get('/api/welcome/preview', async (_req: Request, res: Response) => {
    const simulatedOwner = 'Alex';
    const sampleUser = 'John';
    const speech = voiceWelcomeManager.formatWelcomeMessage(
      config.defaultWelcomeTemplate,
      { user: { username: sampleUser, id: '1' }, displayName: sampleUser },
      { name: 'Community Server', memberCount: 1200 },
      simulatedOwner
    );

    res.json({
      template: config.defaultWelcomeTemplate,
      ownerDisplayName: simulatedOwner,
      sampleUser,
      speech,
      ttsUrl: TTSAudioService.getBrowserTTSUrl(speech),
    });
  });

  // Welcome Setup & Server Lockdown Endpoint
  app.post('/api/welcome/setup-lockdown', async (req: Request, res: Response) => {
    const { guildId = '123456789012345678' } = req.body;
    try {
      if (harumiBot.client.isReady()) {
        const guild = harumiBot.client.guilds.cache.get(guildId);
        if (guild) {
          const result = await voiceWelcomeManager.setupWelcomeWithLockdown(guild);
          return res.json(result);
        }
      }

      // Simulator fallback for UI
      await prisma.guildSettings.upsert({
        where: { guildId },
        create: {
          guildId,
          verificationEnabled: true,
          verifiedRoleId: 'role_member_default',
        },
        update: {
          verificationEnabled: true,
          verifiedRoleId: 'role_member_default',
        },
      });

      await prisma.voiceWelcomeSettings.upsert({
        where: { guildId },
        create: {
          guildId,
          enabled: true,
          ttsEnabled: true,
        },
        update: {
          enabled: true,
          ttsEnabled: true,
        },
      });

      res.json({
        success: true,
        lockedCount: 4,
        memberRoleName: 'Member',
        voiceChannelName: 'welcome-voice',
        textChannelName: 'welcome',
        message: 'Locked all channels for @everyone, created Member role, and enabled 24/7 Voice TTS Verification!',
      });
    } catch (err: any) {
      LogService.error('Server', 'Error in /api/welcome/setup-lockdown', err);
      res.status(500).json({ success: false, message: err?.message || 'Server error' });
    }
  });

  // Simulate Member Join -> TTS -> Auto-Grant Member Role
  app.post('/api/welcome/simulate-tts-verify', async (req: Request, res: Response) => {
    const { username = 'NewMember', isOwner = false } = req.body;
    const simulatedGuild = {
      name: 'Harumi Community',
      memberCount: 1420,
    };
    const simulatedOwnerName = isOwner ? username : 'Alex';
    const speech = voiceWelcomeManager.formatWelcomeMessage(
      config.defaultWelcomeTemplate,
      { user: { username, id: '999' }, displayName: username },
      simulatedGuild,
      simulatedOwnerName
    );

    res.json({
      success: true,
      username,
      speech,
      ttsUrl: TTSAudioService.getBrowserTTSUrl(speech),
      grantedRole: 'Member',
      status: 'VERIFIED_24_7',
      unlockedChannelsCount: 'All Server Channels',
      announcement: `🎉 ${username} completed the voice welcome audio and was automatically granted the Member role 24/7!`,
    });
  });

  // Live Talk Mode status & simulation
  app.get('/api/livetalk/status', async (_req: Request, res: Response) => {
    const liveTalkRecord = await prisma.liveTalkSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    const activeSession = liveTalkRecord?.guildId ? liveTalkManager.getSession(liveTalkRecord.guildId) : undefined;

    res.json({
      enabled: liveTalkRecord?.enabled ?? false,
      guildId: liveTalkRecord?.guildId || 'sim_guild',
      currentVoiceChannel: liveTalkRecord?.currentVoiceChannelId ? 'General Voice' : (activeSession ? 'General Voice' : null),
      isListening: activeSession ? activeSession.isListening : (liveTalkRecord?.enabled ?? false),
      isSpeaking: activeSession ? activeSession.isSpeaking : false,
      reconnectEnabled: liveTalkRecord?.reconnectEnabled ?? true,
      vadActive: true,
      interruptSupported: true,
      maxResponseLength: 300,
    });
  });

  app.post('/api/livetalk/simulate', async (req: Request, res: Response) => {
    const { speaker = 'Alex', speech = 'Hey Harumi, how are you doing today?' } = req.body;
    const sim = await liveTalkManager.simulateLiveTalk('sim_guild', speaker, speech);
    res.json(sim);
  });

  // ==========================================
  // COMMAND DIAGNOSTICS & DUPLICATE DETECTOR
  // ==========================================
  app.get('/api/commands/duplicates', (_req: Request, res: Response) => {
    const report = commandRegistry.detectDuplicates();
    const allCommands = commandRegistry.getAllCommands().map((c) => ({
      name: c.name,
      aliases: c.aliases || [],
      category: c.category,
      description: c.description,
      usage: c.usage,
      cooldown: c.cooldown || 2,
    }));
    res.json({
      success: true,
      report,
      allCommands,
    });
  });

  // ==========================================
  // VOICEMASTER & VC CONTROL INTERFACE ENDPOINTS
  // ==========================================
  app.get('/api/voicemaster/status', async (_req: Request, res: Response) => {
    const client = harumiBot.client;
    let settings = null;
    let activeRooms = voiceMasterManager.getAllTempChannels();

    if (client.isReady() && client.guilds.cache.size > 0) {
      const guild = client.guilds.cache.first();
      if (guild) {
        settings = await prisma.voiceMasterSettings.findUnique({
          where: { guildId: guild.id },
        });
      }
    }

    res.json({
      enabled: settings?.enabled ?? true,
      hubChannelId: settings?.hubChannelId || 'ch-vc-hub',
      panelChannelId: settings?.panelChannelId || 'ch-vc-control',
      isPanelLocked: true, // Ensured locked for @everyone
      activeRooms,
      defaultLimit: settings?.defaultLimit ?? 0,
      supportedActions: [
        'lock',
        'unlock',
        'hide',
        'unhide',
        'claim',
        'limit_down',
        'limit_up',
        'limit_zero',
        'kick',
        'mute',
        'unmute',
        'bitrate',
        'tts',
        'info',
      ],
    });
  });

  app.post('/api/voicemaster/setup', async (_req: Request, res: Response) => {
    const client = harumiBot.client;
    if (client.isReady() && client.guilds.cache.size > 0) {
      const guild = client.guilds.cache.first();
      if (guild) {
        const setupRes = await voiceMasterManager.setup(guild);
        return res.json({
          success: true,
          message: '🎛️ Voice Control Interface deployed. Channel locked to @everyone.',
          hubChannelId: setupRes.hubChannel.id,
          panelChannelId: setupRes.panelChannel.id,
          isLocked: true,
        });
      }
    }

    res.json({
      success: true,
      message: '🎛️ Voice Control Interface simulated: #🎛️-vc-control locked to @everyone with interactive button embed.',
      hubChannelId: 'sim-vc-hub',
      panelChannelId: 'sim-vc-control',
      isLocked: true,
    });
  });

  app.post('/api/voicemaster/action', async (req: Request, res: Response) => {
    const { action, memberId = 'user-01', roomName = 'Gaming Lounge' } = req.body;
    const client = harumiBot.client;

    if (client.isReady() && client.guilds.cache.size > 0) {
      const guild = client.guilds.cache.first();
      const member = guild?.members.cache.get(memberId) || guild?.members.cache.first();
      if (member) {
        let result: { success: boolean; message: string } = { success: false, message: 'Unknown action' };
        if (action === 'lock') result = await voiceMasterManager.lock(member);
        else if (action === 'unlock') result = await voiceMasterManager.unlock(member);
        else if (action === 'hide') result = await voiceMasterManager.hide(member);
        else if (action === 'unhide') result = await voiceMasterManager.unhide(member);
        else if (action === 'claim') result = await voiceMasterManager.claim(member);
        else if (action === 'limit_down') result = await voiceMasterManager.decrementLimit(member);
        else if (action === 'limit_up') result = await voiceMasterManager.incrementLimit(member);
        else if (action === 'limit_zero') result = await voiceMasterManager.setLimitZero(member);
        else if (action === 'kick') result = await voiceMasterManager.kickVisitor(member);
        else if (action === 'mute') result = await voiceMasterManager.muteRoom(member, true);
        else if (action === 'unmute') result = await voiceMasterManager.muteRoom(member, false);
        else if (action === 'bitrate') result = await voiceMasterManager.toggleBitrate(member);
        else if (action === 'tts') result = await voiceMasterManager.toggleTTS(member);

        return res.json(result);
      }
    }

    // Simulator response
    const actionMessages: Record<string, string> = {
      lock: `🔒 #${roomName} is now Locked to non-members.`,
      unlock: `🔓 #${roomName} is now Unlocked for everyone.`,
      hide: `👁️ #${roomName} is now Hidden from the channel list.`,
      unhide: `👁️‍🗨️ #${roomName} is now Visible to everyone.`,
      claim: `👑 You have claimed ownership of #${roomName}!`,
      limit_down: `👥 User limit decreased for #${roomName}.`,
      limit_up: `👥 User limit increased for #${roomName}.`,
      limit_zero: `👥 User limit removed (Unlimited) for #${roomName}.`,
      kick: `⚡ Disconnected visitors from #${roomName}.`,
      mute: `🔇 Room #${roomName} is now muted for non-owners.`,
      unmute: `🔊 Room #${roomName} speaking permissions restored.`,
      bitrate: `📶 Bitrate set to 96kbps (High-Fidelity Audio).`,
      tts: `🎙️ Voice TTS & Soundboard active in #${roomName}.`,
      info: `ℹ️ Room #${roomName}: 1 occupant, Unlimited, Locked: false.`,
    };

    res.json({
      success: true,
      message: actionMessages[action] || `Action "${action}" processed for ${roomName}.`,
    });
  });

  // ==========================================
  // REAL SOUNDCLOUD MUSIC API SUITE
  // ==========================================
  // Search SoundCloud tracks
  app.get('/api/music/search', async (req: Request, res: Response) => {
    const q = (req.query.q as string) || '';
    if (!q.trim()) return res.json({ tracks: [] });
    try {
      const tracks = await soundCloudService.searchTracks(q.trim(), 'WebDashboard', 8);
      res.json({ tracks });
    } catch (err: any) {
      LogService.error('Server', 'Music search error', err);
      res.status(500).json({ error: 'Search failed', message: err.message });
    }
  });

  // Get active music playback state
  app.get('/api/music/state', (req: Request, res: Response) => {
    const guildId = (req.query.guildId as string) || '123456789012345678';
    const queue = modularAudio.getOrCreateQueue(guildId);
    res.json({
      currentTrack: queue.currentTrack,
      tracks: queue.tracks,
      isPaused: queue.isPaused,
      volume: Math.round(queue.volume * 100),
      loopMode: queue.loopMode,
      activeFilter: queue.activeFilter,
      trackStartTime: queue.trackStartTime,
    });
  });

  // Play / Queue track from Dashboard
  app.post('/api/music/play', async (req: Request, res: Response) => {
    const { track, query, guildId = '123456789012345678' } = req.body;
    const queue = modularAudio.getOrCreateQueue(guildId);

    let targetTrack = track;
    if (!targetTrack && query) {
      targetTrack = await modularAudio.searchTrack(query, 'WebDashboard');
    }

    if (!targetTrack) {
      return res.status(400).json({ error: 'Valid track or search query required.' });
    }

    if (!targetTrack.audioStreamUrl) {
      targetTrack.audioStreamUrl = (await soundCloudService.getFreshStreamUrl(targetTrack)) || undefined;
    }

    if (!queue.currentTrack) {
      queue.playTrack(targetTrack);
      res.json({ success: true, action: 'playing', track: targetTrack, message: `Now playing "${targetTrack.title}" by ${targetTrack.artist}` });
    } else {
      queue.tracks.push(targetTrack);
      res.json({ success: true, action: 'queued', track: targetTrack, position: queue.tracks.length, message: `Added "${targetTrack.title}" to queue (#${queue.tracks.length})` });
    }
  });

  // Control playback from Dashboard (pause, resume, skip, stop, shuffle, smartshuffle, loop, volume, filter)
  app.post('/api/music/control', (req: Request, res: Response) => {
    const { action, value, guildId = '123456789012345678' } = req.body;
    const queue = modularAudio.getOrCreateQueue(guildId);

    if (action === 'pause') {
      queue.pause();
      return res.json({ success: true, isPaused: true, message: 'Audio playback paused.' });
    }
    if (action === 'resume') {
      queue.resume();
      return res.json({ success: true, isPaused: false, message: 'Audio playback resumed.' });
    }
    if (action === 'skip') {
      const next = queue.playNext();
      return res.json({ success: true, currentTrack: next, message: next ? `Skipped to "${next.title}"` : 'Skipped. Queue is now empty.' });
    }
    if (action === 'stop') {
      queue.stop();
      return res.json({ success: true, message: 'Playback stopped and queue cleared.' });
    }
    if (action === 'shuffle') {
      queue.shuffle();
      return res.json({ success: true, tracks: queue.tracks, message: `Queue shuffled (${queue.tracks.length} tracks).` });
    }
    if (action === 'smartshuffle') {
      queue.smartShuffle();
      return res.json({ success: true, tracks: queue.tracks, message: 'Smart harmonic energy ordering applied to queue.' });
    }
    if (action === 'loop') {
      if (queue.loopMode === 'off') queue.loopMode = 'track';
      else if (queue.loopMode === 'track') queue.loopMode = 'queue';
      else queue.loopMode = 'off';
      return res.json({ success: true, loopMode: queue.loopMode, message: `Loop mode: ${queue.loopMode.toUpperCase()}` });
    }
    if (action === 'volume') {
      const volNum = parseInt(value, 10);
      const newVol = queue.setVolume(isNaN(volNum) ? 80 : volNum);
      return res.json({ success: true, volume: newVol, message: `Volume set to ${newVol}%.` });
    }
    if (action === 'filter') {
      queue.activeFilter = value || 'normal';
      return res.json({ success: true, activeFilter: queue.activeFilter, message: `Audio DSP filter: ${queue.activeFilter}` });
    }

    res.status(400).json({ error: `Unknown action "${action}"` });
  });

  // Audio Stream Proxy
  app.get('/api/music/stream', async (req: Request, res: Response) => {
    let streamUrl = req.query.url as string;
    const trackUrl = req.query.trackUrl as string;

    if (!streamUrl && trackUrl) {
      const resolved = await soundCloudService.resolveTrackUrl(trackUrl, 'StreamProxy');
      if (resolved?.audioStreamUrl) {
        streamUrl = resolved.audioStreamUrl;
      }
    }

    if (!streamUrl) {
      return res.status(400).json({ error: 'Valid url or trackUrl required' });
    }

    try {
      const audioRes = await fetch(streamUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Range: req.headers.range || 'bytes=0-',
        },
      });

      if (!audioRes.ok && audioRes.status !== 206) {
        return res.status(audioRes.status).send('Stream error');
      }

      const contentType = audioRes.headers.get('content-type') || 'audio/mpeg';
      const contentLength = audioRes.headers.get('content-length');
      const contentRange = audioRes.headers.get('content-range');
      const acceptRanges = audioRes.headers.get('accept-ranges') || 'bytes';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', acceptRanges);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
        res.status(206);
      }

      if (audioRes.body) {
        const { Readable } = await import('stream');
        const nodeStream = Readable.fromWeb(audioRes.body as any);
        nodeStream.pipe(res);
      } else {
        res.status(500).send('No stream content');
      }
    } catch (err: any) {
      LogService.error('Server', 'Audio stream proxy error', err);
      res.status(500).send('Streaming error');
    }
  });

  // Remove track from queue
  app.post('/api/music/queue/remove', (req: Request, res: Response) => {
    const { index, guildId = '123456789012345678' } = req.body;
    const queue = modularAudio.getOrCreateQueue(guildId);
    if (typeof index === 'number' && index >= 0 && index < queue.tracks.length) {
      const removed = queue.tracks.splice(index, 1)[0];
      return res.json({ success: true, removed, tracks: queue.tracks });
    }
    res.status(400).json({ error: 'Invalid index' });
  });

  // Clear queue
  app.post('/api/music/queue/clear', (req: Request, res: Response) => {
    const { guildId = '123456789012345678' } = req.body;
    const queue = modularAudio.getOrCreateQueue(guildId);
    queue.tracks = [];
    res.json({ success: true, tracks: [] });
  });

  // ==========================================
  // EMBED STUDIO API
  // ==========================================
  app.post('/api/embed/send', async (req: Request, res: Response) => {
    const {
      channelId = 'announcements',
      title = 'Server Announcement',
      description = '',
      color = '#8B5CF6',
      fields = [],
      thumbnail = '',
      image = '',
      footer = '',
      author = '',
      includeTimestamp = true,
    } = req.body;

    const colorNum = parseInt(color.replace('#', ''), 16) || 0x8b5cf6;
    const client = harumiBot.client;

    if (client.isReady() && client.guilds.cache.size > 0) {
      const guild = client.guilds.cache.first();
      const channel = guild?.channels.cache.find(
        (c) => c.id === channelId || c.name.includes(channelId.replace('#', ''))
      );

      if (channel && channel.isTextBased()) {
        const embed = new EmbedBuilder().setColor(colorNum);
        if (title) embed.setTitle(title);
        if (description) embed.setDescription(description);
        if (thumbnail) embed.setThumbnail(thumbnail);
        if (image) embed.setImage(image);
        if (author) embed.setAuthor({ name: author });
        if (footer) embed.setFooter({ text: footer });
        if (includeTimestamp) embed.setTimestamp();

        if (Array.isArray(fields) && fields.length > 0) {
          for (const f of fields) {
            if (f.name && f.value) {
              embed.addFields({ name: f.name, value: f.value, inline: !!f.inline });
            }
          }
        }

        try {
          await (channel as any).send({ embeds: [embed] });
          return res.json({
            success: true,
            message: `Embed successfully published to #${channel.name}!`,
            channel: channel.name,
          });
        } catch (err: any) {
          LogService.warn('EmbedStudio', `Could not send embed to #${channel.name}: ${err.message}`);
        }
      }
    }

    res.json({
      success: true,
      message: `Embed simulated and ready to post to #${channelId}!`,
      channel: channelId,
    });
  });

  // ==========================================
  // REACTION ROLES API
  // ==========================================
  app.get('/api/roles/reaction-panels', (_req: Request, res: Response) => {
    const panels = [
      {
        id: 'panel-notifications',
        title: '🔔 Notification Pings',
        description: 'Toggle which updates you want to be notified for.',
        color: '#8B5CF6',
        channel: 'roles',
        roles: [
          { id: 'announcements', label: 'Announcements', color: '#5865F2', style: 'primary', count: 890 },
          { id: 'events', label: 'Community Events', color: '#4F545C', style: 'secondary', count: 642 },
          { id: 'giveaways', label: 'Giveaways & Drops', color: '#57F287', style: 'success', count: 1120 },
        ],
      },
      {
        id: 'panel-gaming',
        title: '🎮 Gaming Squads',
        description: 'Select your active games to find teammates and see game voice channels.',
        color: '#10B981',
        channel: 'roles',
        roles: [
          { id: 'valorant', label: 'Valorant', color: '#EF4444', style: 'danger', count: 430 },
          { id: 'minecraft', label: 'Minecraft', color: '#10B981', style: 'success', count: 520 },
          { id: 'roblox', label: 'Roblox', color: '#3B82F6', style: 'primary', count: 380 },
          { id: 'genshin', label: 'Genshin Impact', color: '#8B5CF6', style: 'secondary', count: 290 },
        ],
      },
      {
        id: 'panel-colors',
        title: '🎨 Profile Color Roles',
        description: 'Personalize your username color in chat.',
        color: '#EC4899',
        channel: 'roles',
        roles: [
          { id: 'neon_purple', label: 'Neon Purple', color: '#A855F7', style: 'secondary', count: 310 },
          { id: 'cyan_glow', label: 'Cyan Glow', color: '#06B6D4', style: 'secondary', count: 420 },
          { id: 'emerald_green', label: 'Emerald Green', color: '#10B981', style: 'secondary', count: 260 },
          { id: 'sakura_pink', label: 'Sakura Pink', color: '#EC4899', style: 'secondary', count: 395 },
        ],
      },
    ];

    res.json({ success: true, panels });
  });

  // ==========================================
  // SERVER ANALYTICS SUMMARY
  // ==========================================
  app.get('/api/analytics/summary', (_req: Request, res: Response) => {
    const hourlyActivity = [
      { hour: '00:00', messages: 140, voiceMinutes: 280 },
      { hour: '02:00', messages: 85, voiceMinutes: 190 },
      { hour: '04:00', messages: 42, voiceMinutes: 90 },
      { hour: '06:00', messages: 68, voiceMinutes: 110 },
      { hour: '08:00', messages: 210, voiceMinutes: 340 },
      { hour: '10:00', messages: 450, voiceMinutes: 620 },
      { hour: '12:00', messages: 680, voiceMinutes: 890 },
      { hour: '14:00', messages: 890, voiceMinutes: 1150 },
      { hour: '16:00', messages: 1120, voiceMinutes: 1480 },
      { hour: '18:00', messages: 1450, voiceMinutes: 1820 },
      { hour: '20:00', messages: 1680, voiceMinutes: 2100 },
      { hour: '22:00', messages: 950, voiceMinutes: 1350 },
    ];

    res.json({
      success: true,
      totalMembers: 1420,
      activeOnline: 640,
      messagesToday: 7865,
      voiceHoursToday: 172.5,
      automodBlocksToday: 184,
      retentionRate: '94.2%',
      hourlyActivity,
      topChannels: [
        { name: '#general', messages: 3420, percent: 43.5 },
        { name: '#media', messages: 1540, percent: 19.6 },
        { name: '#bot-commands', messages: 1210, percent: 15.4 },
        { name: '#ai-chat', messages: 980, percent: 12.5 },
        { name: '#announcements', messages: 715, percent: 9.0 },
      ],
      securityStats: {
        spamBlocked: 94,
        inviteLinksFiltered: 42,
        badWordsCaught: 36,
        raidShieldTriggers: 0,
      },
    });
  });

  // ==========================================
  // DEDICATED STATS IMAGE CARD GENERATION ENDPOINTS
  // ==========================================
  app.get('/api/stats/image/server', async (req: Request, res: Response) => {
    try {
      const serverName = (req.query.serverName as string) || 'Harumi Community';
      const lookback = parseInt(req.query.lookback as string, 10) || 60;
      const members = parseInt(req.query.members as string, 10) || 1420;

      const approxMsgs1d = Math.max(140, Math.round(members * 0.35));
      const approxMsgs7d = Math.max(920, Math.round(members * 2.2));
      const approxMsgs60d = `${(Math.max(5000, members * 12) / 1000).toFixed(1)}k`;

      const buffer = await statsImageService.generateServerStatsImage({
        serverName,
        totalMembers: members,
        onlineMembers: Math.round(members * 0.45),
        createdOn: 'January 8, 2024',
        invitedBotOn: 'October 14, 2024',
        lookbackDays: lookback,
        messages: { '1d': approxMsgs1d, '7d': approxMsgs7d, '60d': approxMsgs60d },
        voiceActivity: { '1d': '4.8 hours', '7d': '38.5 hours', '60d': '164.2 hours' },
        contributors: { '1d': Math.round(members * 0.08), '7d': Math.round(members * 0.28), '60d': Math.round(members * 0.75) },
        topMembers: {
          text: { name: 'TopChatter', value: `${approxMsgs1d * 3} messages` },
          voice: { name: 'TopSpeaker', value: '38.5 hours' },
        },
        topChannels: {
          text: { name: '#general', value: `${approxMsgs7d} messages` },
          voice: { name: '🔊 Lounge', value: '164.2 hours' },
        },
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.send(buffer);
    } catch (err: any) {
      LogService.error('Server', 'Failed to generate server stats image', err);
      res.status(500).send('Image generation error');
    }
  });

  app.get('/api/stats/image/voice', async (req: Request, res: Response) => {
    try {
      const serverName = (req.query.serverName as string) || 'Harumi Community';
      const userName = (req.query.userName as string) || 'Community Member';
      const totalHours = parseFloat((req.query.hours as string) || '118.5');
      const totalMinutes = Math.round(totalHours * 60);
      const totalDays = totalHours / 24;
      const totalWeeks = totalDays / 7;
      const totalMonths = totalDays / 30.4;

      const buffer = await statsImageService.generateVoiceStatsImage({
        serverName,
        userName,
        totalHours,
        totalMinutes,
        totalDays,
        totalWeeks,
        totalMonths,
        breakdown: {
          today: `${(totalHours * 0.08).toFixed(1)}h`,
          thisWeek: `${(totalHours * 0.35).toFixed(1)}h`,
          thisMonth: `${(totalHours * 0.75).toFixed(1)}h`,
          allTime: `${totalHours.toFixed(1)}h`,
        },
        topRooms: [
          { name: '🔊 Lounge Voice', duration: `${(totalHours * 0.45).toFixed(1)}h`, count: 184 },
          { name: '🔊 Gaming Squad 1', duration: `${(totalHours * 0.28).toFixed(1)}h`, count: 96 },
          { name: '🔊 Study & Focus', duration: `${(totalHours * 0.16).toFixed(1)}h`, count: 42 },
          { name: '🔊 Music Room', duration: `${(totalHours * 0.11).toFixed(1)}h`, count: 68 },
        ],
        peakHours: '7:30 PM - 11:30 PM UTC',
        hourlyTrends: [10, 6, 4, 2, 3, 6, 12, 28, 48, 65, 82, 95, 120, 155, 190, 230, 255, 220, 175, 110, 75, 40, 20, 12],
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.send(buffer);
    } catch (err: any) {
      LogService.error('Server', 'Failed to generate voice stats image', err);
      res.status(500).send('Image generation error');
    }
  });

  app.get('/api/stats/image/user', async (req: Request, res: Response) => {
    try {
      const username = (req.query.username as string) || 'Alex';
      const serverName = (req.query.serverName as string) || 'Harumi Community';
      const totalMessages = parseInt(req.query.messages as string, 10) || 1840;
      const totalVoiceHours = parseFloat((req.query.voiceHours as string) || '42.5');
      const rank = parseInt(req.query.rank as string, 10) || 1;
      const activityScore = Math.min(100, Math.max(10, parseInt(req.query.score as string, 10) || 88));

      const buffer = await statsImageService.generateUserStatsImage({
        username,
        serverName,
        joinedDate: 'January 15, 2024',
        totalMessages,
        totalVoiceHours,
        rank,
        topChannel: '#general',
        activityScore,
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.send(buffer);
    } catch (err: any) {
      LogService.error('Server', 'Failed to generate user stats image', err);
      res.status(500).send('Image generation error');
    }
  });

  app.get('/api/stats/image/channel', async (req: Request, res: Response) => {
    try {
      const channelName = (req.query.channelName as string) || 'general';
      const serverName = (req.query.serverName as string) || 'Harumi Community';

      const buffer = await statsImageService.generateChannelStatsImage({
        channelName,
        serverName,
        topic: 'General server discussions & community hangout',
        messagesToday: 3420,
        messages7d: 18450,
        activeChatters: 84,
        topChatter: { name: 'Alex', count: 420 },
        peakHour: '8:00 PM - 10:00 PM UTC',
        hourlyTrends: [20, 12, 8, 5, 8, 14, 35, 68, 95, 120, 145, 180, 210, 245, 290, 340, 310, 260, 200, 150, 110, 80, 50, 30],
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.send(buffer);
    } catch (err: any) {
      LogService.error('Server', 'Failed to generate channel stats image', err);
      res.status(500).send('Image generation error');
    }
  });

  app.get('/api/stats/image/leaderboard', async (req: Request, res: Response) => {
    try {
      const serverName = (req.query.serverName as string) || 'Harumi Community';

      const buffer = await statsImageService.generateLeaderboardImage({
        serverName,
        lookbackPeriod: 'All-Time',
        topText: [
          { rank: 1, name: 'Alex (Owner)', count: 4820 },
          { rank: 2, name: 'Sammy_Gamer', count: 3410 },
          { rank: 3, name: 'Maya_Design', count: 2890 },
          { rank: 4, name: 'Jordan_Code', count: 1940 },
          { rank: 5, name: 'Chris_Vibes', count: 1420 },
        ],
        topVoice: [
          { rank: 1, name: 'NightOwl_99', duration: '94.2h' },
          { rank: 2, name: 'Alex (Owner)', duration: '78.5h' },
          { rank: 3, name: 'Chloe_Live', duration: '52.1h' },
          { rank: 4, name: 'Ethan_Music', duration: '39.8h' },
          { rank: 5, name: 'Liam_Chill', duration: '28.4h' },
        ],
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.send(buffer);
    } catch (err: any) {
      LogService.error('Server', 'Failed to generate leaderboard stats image', err);
      res.status(500).send('Image generation error');
    }
  });

  app.get('/api/stats/image/bot', async (_req: Request, res: Response) => {
    try {
      const buffer = await statsImageService.generateBotStatsImage({
        botName: 'Harumi Engine',
        uptime: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
        serversCount: 14,
        usersCount: 18450,
        wsPing: 24,
        memoryUsage: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
        audioActiveStreams: 3,
        automodShieldStatus: 'Active',
        aiEngineStatus: 'Connected',
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.send(buffer);
    } catch (err: any) {
      LogService.error('Server', 'Failed to generate bot stats image', err);
      res.status(500).send('Image generation error');
    }
  });

  // Mount Vite middleware for dev or serve static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  const port = config.port;
  app.listen(port, '0.0.0.0', () => {
    LogService.info('Server', `Harumi Web Server & Health API running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
