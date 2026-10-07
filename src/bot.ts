import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from './config';
import { registerEventHandlers } from './events';
import { LogService } from './services/LogService';

export class HarumiBot {
  private static instance: HarumiBot;
  public client: Client;
  private isStarted = false;

  private constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildInvites,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    });

    registerEventHandlers(this.client);
  }

  public static getInstance(): HarumiBot {
    if (!HarumiBot.instance) {
      HarumiBot.instance = new HarumiBot();
    }
    return HarumiBot.instance;
  }

  public async start(): Promise<void> {
    if (this.isStarted) return;
    this.isStarted = true;

    const token = process.env.DISCORD_TOKEN || config.token;
    if (!token) {
      LogService.warn(
        'HarumiBot',
        'DISCORD_TOKEN is not set in .env. Bot engine running in active simulation/dashboard mode. Set DISCORD_TOKEN to connect directly to Discord gateway.'
      );
      return;
    }

    try {
      LogService.info('HarumiBot', 'Connecting to Discord Gateway...');
      await this.client.login(token);
      LogService.info('HarumiBot', `Successfully connected to Discord Gateway as ${this.client.user?.tag}`);
    } catch (err: any) {
      LogService.error('HarumiBot', 'Failed to connect to Discord Gateway', err?.message || err);
    }
  }

  public async connectWithToken(
    token: string,
    clientId?: string
  ): Promise<{ success: boolean; message: string; bot?: { tag: string; id: string; avatar: string | null; guildsCount: number } }> {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      return { success: false, message: 'Please provide a valid Discord Bot token.' };
    }

    try {
      if (this.client.isReady()) {
        await this.client.destroy();
      }

      // Re-create client to ensure fresh event listeners and gateway state
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMembers,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildVoiceStates,
          GatewayIntentBits.GuildPresences,
          GatewayIntentBits.GuildMessageReactions,
          GatewayIntentBits.GuildInvites,
        ],
        partials: [Partials.Message, Partials.Channel, Partials.Reaction],
      });

      registerEventHandlers(this.client);

      LogService.info('HarumiBot', 'Authenticating with custom Discord Bot token...');
      await this.client.login(trimmedToken);

      // Save token in memory
      process.env.DISCORD_TOKEN = trimmedToken;
      config.token = trimmedToken;
      if (clientId) {
        process.env.DISCORD_CLIENT_ID = clientId.trim();
        config.clientId = clientId.trim();
      } else if (this.client.user?.id) {
        process.env.DISCORD_CLIENT_ID = this.client.user.id;
        config.clientId = this.client.user.id;
      }

      const botUser = this.client.user;
      LogService.info('HarumiBot', `Successfully connected as ${botUser?.tag} (${this.client.guilds.cache.size} guilds)`);

      return {
        success: true,
        message: `Successfully connected to Discord as ${botUser?.tag}!`,
        bot: {
          tag: botUser?.tag || 'Discord Bot',
          id: botUser?.id || '',
          avatar: botUser?.displayAvatarURL() || null,
          guildsCount: this.client.guilds.cache.size,
        },
      };
    } catch (err: any) {
      LogService.error('HarumiBot', 'Connection error with custom token', err?.message || err);
      return {
        success: false,
        message: `Failed to connect to Discord: ${err?.message || 'Invalid token or missing Privileged Gateway Intents (Message Content / Server Members).'}`
      };
    }
  }

  public async disconnectBot(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.client.isReady()) {
        await this.client.destroy();
      }
      process.env.DISCORD_TOKEN = '';
      config.token = '';
      this.isStarted = false;

      // Re-create client in clean unauthenticated state
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMembers,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildVoiceStates,
          GatewayIntentBits.GuildPresences,
          GatewayIntentBits.GuildMessageReactions,
          GatewayIntentBits.GuildInvites,
        ],
        partials: [Partials.Message, Partials.Channel, Partials.Reaction],
      });
      registerEventHandlers(this.client);

      return { success: true, message: 'Bot disconnected. Harumi is now running in simulator mode.' };
    } catch (err: any) {
      return { success: false, message: `Disconnection error: ${err.message}` };
    }
  }

  public async reconnect(customToken?: string): Promise<{ success: boolean; message: string }> {
    const token = customToken || process.env.DISCORD_TOKEN || config.token;
    if (!token) {
      return { success: false, message: 'No Discord token configured.' };
    }

    try {
      if (this.client.isReady()) {
        this.client.destroy();
      }
      LogService.info('HarumiBot', 'Re-authenticating with Discord Gateway...');
      await this.client.login(token);
      return { success: true, message: `Connected to Discord as ${this.client.user?.tag}!` };
    } catch (err: any) {
      LogService.error('HarumiBot', 'Reconnection failed', err?.message || err);
      return { success: false, message: `Login failed: ${err?.message || 'Invalid token or intent error'}` };
    }
  }

  public getStatus() {
    return {
      connected: this.client.isReady(),
      uptimeMs: this.client.uptime || 0,
      ping: this.client.ws?.ping || 28,
      guildsCount: this.client.guilds?.cache.size || 0,
      usersCount: this.client.users?.cache.size || 0,
      tag: this.client.user?.tag || 'Harumi#0001 (Simulation)',
    };
  }

  public updatePresence(
    status: 'online' | 'idle' | 'dnd' | 'invisible' = 'online',
    activityType: number = 2,
    activityName: string = 'Listening to .help | Harumi AI'
  ): boolean {
    if (this.client.user) {
      try {
        this.client.user.setPresence({
          status,
          activities: [{ name: activityName, type: activityType }],
        });
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }
}

export const harumiBot = HarumiBot.getInstance();
