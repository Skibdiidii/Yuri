import {
  Guild,
  GuildMember,
  VoiceBasedChannel,
  EmbedBuilder,
  TextChannel,
  ChannelType,
  PermissionsBitField,
} from 'discord.js';
import {
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
  entersState,
} from '@discordjs/voice';
import { prisma, getOrCreateGuildSettings } from '../database/db';
import { LogService } from '../services/LogService';
import { ttsQueue } from './TTSQueue';
import { verificationManager } from '../verification/VerificationManager';

export class VoiceWelcomeManager {
  private static instance: VoiceWelcomeManager;
  private connections = new Map<string, VoiceConnection>();
  private intentionalDisconnects = new Set<string>();

  private constructor() {}

  public static getInstance(): VoiceWelcomeManager {
    if (!VoiceWelcomeManager.instance) {
      VoiceWelcomeManager.instance = new VoiceWelcomeManager();
    }
    return VoiceWelcomeManager.instance;
  }

  /**
   * Retrieves the current server owner's display name dynamically.
   * Specification 12: Never hardcode server owner's name.
   */
  public async getOwnerDisplayName(guild: Guild): Promise<string> {
    try {
      if (!guild.ownerId) return 'Owner';
      let ownerMember = guild.members.cache.get(guild.ownerId);
      if (!ownerMember) {
        ownerMember = await guild.members.fetch(guild.ownerId).catch(() => undefined);
      }
      return ownerMember?.displayName || ownerMember?.user.username || 'Owner';
    } catch {
      return 'Owner';
    }
  }

  /**
   * Formats the welcome message replacing all variables dynamically
   * Specification 13: {user}, {username}, {display}, {mention}, {server}, {owner}, {memberCount}, {createdAt}
   */
  public formatWelcomeMessage(
    template: string,
    member: {
      user: { username: string; id: string; createdAt?: Date };
      displayName: string;
    },
    guild: { name: string; memberCount: number },
    ownerDisplayName: string
  ): string {
    const createdAtStr = member.user.createdAt
      ? member.user.createdAt.toLocaleDateString()
      : new Date().toLocaleDateString();

    return template
      .replace(/{user}/g, member.user.username)
      .replace(/{username}/g, member.user.username)
      .replace(/{display}/g, member.displayName)
      .replace(/{mention}/g, `<@${member.user.id}>`)
      .replace(/{server}/g, guild.name)
      .replace(/{owner}/g, ownerDisplayName)
      .replace(/{memberCount}/g, String(guild.memberCount))
      .replace(/{createdAt}/g, createdAtStr);
  }

  /**
   * Ensures that dedicated welcome voice and text channels exist in the guild.
   * If missing or not configured, automatically creates them with proper permissions.
   */
  public async ensureWelcomeChannels(
    guild: Guild
  ): Promise<{
    voiceChannel: VoiceBasedChannel | null;
    textChannel: TextChannel | null;
    createdVoice: boolean;
    createdText: boolean;
  }> {
    let settings = await prisma.voiceWelcomeSettings.findUnique({
      where: { guildId: guild.id },
    });
    const { welcomeSettings } = await getOrCreateGuildSettings(guild.id, guild.name, guild.ownerId);

    let voiceChannel: VoiceBasedChannel | null = null;
    let createdVoice = false;

    // 1. Check if configured voice channel exists
    if (settings?.voiceChannelId) {
      const ch = guild.channels.cache.get(settings.voiceChannelId);
      if (ch && ch.isVoiceBased()) {
        voiceChannel = ch as VoiceBasedChannel;
      }
    }

    // 2. Look for any voice channel named welcome or lounge
    if (!voiceChannel) {
      const found = guild.channels.cache.find(
        (c) => c.isVoiceBased() && (c.name.includes('welcome') || c.name.includes('lounge'))
      );
      if (found && found.isVoiceBased()) {
        voiceChannel = found as VoiceBasedChannel;
      }
    }

    // 3. If still no voice channel, automatically create 🔊 welcome-voice!
    if (!voiceChannel) {
      try {
        const me = guild.members.me;
        const perms = [
          {
            id: guild.roles.everyone.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak],
          },
        ];

        if (me) {
          perms.push({
            id: me.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.Speak,
            ],
          });
        }

        voiceChannel = (await guild.channels.create({
          name: '🔊 welcome-voice',
          type: ChannelType.GuildVoice,
          reason: 'Harumi Automated Voice Welcome Channel Creation',
          permissionOverwrites: perms,
        })) as VoiceBasedChannel;
        createdVoice = true;
        LogService.info('VoiceWelcome', `Created welcome voice channel in ${guild.name}`);
      } catch (err) {
        LogService.warn('VoiceWelcome', `Could not create voice channel, fallback to existing`, err);
        const fallback = guild.channels.cache.find((c) => c.isVoiceBased());
        if (fallback && fallback.isVoiceBased()) {
          voiceChannel = fallback as VoiceBasedChannel;
        }
      }
    }

    // 4. Check text welcome channel
    let textChannel: TextChannel | null = null;
    let createdText = false;

    if (welcomeSettings?.welcomeChannelId) {
      const ch = guild.channels.cache.get(welcomeSettings.welcomeChannelId);
      if (ch && ch.isTextBased() && ch.type === ChannelType.GuildText) {
        textChannel = ch as TextChannel;
      }
    }

    if (!textChannel) {
      const foundText = guild.channels.cache.find(
        (c) => c.isTextBased() && c.type === ChannelType.GuildText && c.name.includes('welcome')
      );
      if (foundText && foundText.type === ChannelType.GuildText) {
        textChannel = foundText as TextChannel;
      }
    }

    // If still no text welcome channel, create 💬 welcome
    if (!textChannel) {
      try {
        textChannel = (await guild.channels.create({
          name: '💬 welcome',
          type: ChannelType.GuildText,
          reason: 'Harumi Automated Text Welcome Channel Creation',
        })) as TextChannel;
        createdText = true;
        LogService.info('VoiceWelcome', `Created welcome text channel in ${guild.name}`);
      } catch (err) {
        LogService.warn('VoiceWelcome', `Could not create text welcome channel`, err);
        const fallbackText = guild.channels.cache.find(
          (c) => c.isTextBased() && c.type === ChannelType.GuildText
        );
        if (fallbackText && fallbackText.type === ChannelType.GuildText) {
          textChannel = fallbackText as TextChannel;
        }
      }
    }

    // Persist channel mappings to database
    if (voiceChannel) {
      await prisma.voiceWelcomeSettings.upsert({
        where: { guildId: guild.id },
        create: {
          guildId: guild.id,
          enabled: true,
          voiceChannelId: voiceChannel.id,
          welcomeChannelId: textChannel?.id || null,
          ttsEnabled: true,
        },
        update: {
          enabled: true,
          voiceChannelId: voiceChannel.id,
          welcomeChannelId: textChannel?.id || null,
          ttsEnabled: true,
        },
      });
    }

    if (textChannel) {
      await prisma.welcomeSettings.upsert({
        where: { guildId: guild.id },
        create: {
          guildId: guild.id,
          enabled: true,
          welcomeChannelId: textChannel.id,
        },
        update: {
          enabled: true,
          welcomeChannelId: textChannel.id,
        },
      });
    }

    return {
      voiceChannel,
      textChannel,
      createdVoice,
      createdText,
    };
  }

  /**
   * Complete Welcome & Channel Lockdown Setup:
   * 1. Creates 'Member' role if missing
   * 2. Creates 🔊 welcome-voice and 💬 welcome if missing
   * 3. Locks all other server channels for @everyone
   * 4. Unlocks all server channels for Member role
   * 5. Activates 24/7 TTS Voice Welcome + Auto-Verification
   */
  public async setupWelcomeWithLockdown(guild: Guild): Promise<{
    success: boolean;
    lockedCount: number;
    memberRoleName: string;
    voiceChannelName: string;
    textChannelName: string;
    message: string;
  }> {
    const ensured = await this.ensureWelcomeChannels(guild);
    const lockdownRes = await verificationManager.lockdownChannelsForVerification(guild, {
      welcomeVoiceChannelId: ensured.voiceChannel?.id,
      welcomeTextChannelId: ensured.textChannel?.id,
    });

    return {
      success: lockdownRes.success,
      lockedCount: lockdownRes.lockedCount,
      memberRoleName: lockdownRes.memberRole?.name || 'Member',
      voiceChannelName: ensured.voiceChannel?.name || 'welcome-voice',
      textChannelName: ensured.textChannel?.name || 'welcome',
      message: lockdownRes.message,
    };
  }

  /**
   * Handles human member joining a voice channel or server.
   * Plays TTS welcome and triggers 24/7 automatic verification upon playback completion!
   */
  public async handleMemberJoin(member: GuildMember): Promise<void> {
    let settings = await prisma.voiceWelcomeSettings.findUnique({
      where: { guildId: member.guild.id },
    });

    if (!settings || !settings.enabled) return;
    if (settings.ignoreBots && member.user.bot) return;

    const ownerName = await this.getOwnerDisplayName(member.guild);
    const spokenText = this.formatWelcomeMessage(
      settings.template,
      member,
      member.guild,
      ownerName
    );

    // Check if member is actually connected to voice
    const memberVoiceChannel = member.voice?.channel;
    if (!memberVoiceChannel) {
      // Member not in voice yet; text welcome only
      return;
    }

    // Strict designated welcome channel check
    let targetChannel: VoiceBasedChannel | null = null;
    if (settings.voiceChannelId) {
      const ch = member.guild.channels.cache.get(settings.voiceChannelId);
      if (ch && ch.isVoiceBased() && ch.id === memberVoiceChannel.id) {
        targetChannel = ch as VoiceBasedChannel;
      }
    }

    if (!targetChannel && memberVoiceChannel.name.toLowerCase().includes('welcome')) {
      targetChannel = memberVoiceChannel;
    }

    // If member is not in the designated welcome channel, do not join random VCs!
    if (!targetChannel) {
      return;
    }

    // Enqueue TTS audio with onComplete auto-verification and auto-leave callback
    const { queued } = ttsQueue.enqueue(
      member.guild.id,
      spokenText,
      settings.volume,
      member.id,
      async (guildId, userId) => {
        if (userId) {
          LogService.info('VoiceWelcome', `TTS completed for user ${userId}. Auto-verifying...`);
          await verificationManager.verifyMemberOnTTSComplete(member.guild, userId);
        }
        // Automatically leave voice channel after finishing welcome message
        setTimeout(() => {
          this.leaveVoice(member.guild.id);
          LogService.info('VoiceWelcome', `Auto-left welcome voice channel in ${member.guild.name} after announcement.`);
        }, 800);
      }
    );

    if (!queued) return;

    if (settings.ttsEnabled) {
      const connection = await this.getOrCreateConnection(targetChannel);
      if (connection) {
        ttsQueue.playNext(member.guild.id, connection);
      }
    }

    // Optional text welcome channel announcement
    const textChannelId = settings.welcomeChannelId;
    if (textChannelId) {
      const textChannel = member.guild.channels.cache.get(textChannelId) as TextChannel | undefined;
      if (textChannel && textChannel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setColor(0x3b82f6)
          .setTitle('👋 Voice Welcome Announcement')
          .setDescription(
            `Spoke in voice: "${spokenText}"\n\n` +
            `🔒 *Listen to the full audio message in <#${targetChannel?.id}> to automatically receive the **Member** role and unlock all channels!*`
          )
          .setFooter({ text: 'Harumi 24/7 Voice Welcome & Verification' })
          .setTimestamp();

        textChannel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  }

  /**
   * Generates a test welcome speech and tests auto-verification upon TTS completion
   */
  public async testWelcome(
    guild: Guild,
    member: GuildMember
  ): Promise<{ text: string; success: boolean; channelName?: string }> {
    const settings = await prisma.voiceWelcomeSettings.findUnique({
      where: { guildId: guild.id },
    });

    const template =
      settings?.template || 'Hello {display}. Welcome to the server. Make sure you add {owner}.';
    const ownerName = await this.getOwnerDisplayName(guild);
    const text = this.formatWelcomeMessage(template, member, guild, ownerName);

    let targetChannel: VoiceBasedChannel | null = null;

    // 1. If admin is currently in a voice channel, prioritize their active channel!
    if (member.voice.channel) {
      targetChannel = member.voice.channel;
    }

    // 2. If configured voice channel exists
    if (!targetChannel && settings?.voiceChannelId) {
      const ch = guild.channels.cache.get(settings.voiceChannelId);
      if (ch && ch.isVoiceBased()) {
        targetChannel = ch as VoiceBasedChannel;
      }
    }

    // 3. If still no channel, automatically create or ensure welcome channels!
    if (!targetChannel) {
      const ensured = await this.ensureWelcomeChannels(guild);
      targetChannel = ensured.voiceChannel;
    }

    let channelName: string | undefined;
    if (targetChannel) {
      channelName = targetChannel.name;
      const connection = await this.getOrCreateConnection(targetChannel);
      ttsQueue.enqueue(
        guild.id,
        text,
        settings?.volume || 1.0,
        member.id,
        async (guildId, userId) => {
          if (userId) {
            await verificationManager.verifyMemberOnTTSComplete(guild, userId);
          }
          setTimeout(() => {
            this.leaveVoice(guild.id);
          }, 1200);
        }
      );
      if (connection) {
        ttsQueue.playNext(guild.id, connection);
      }
    }

    return { text, success: true, channelName };
  }

  /**
   * Returns current preview configuration for .welcpreview
   */
  public async getPreview(guild: Guild) {
    let settings = await prisma.voiceWelcomeSettings.findUnique({
      where: { guildId: guild.id },
    });

    if (!settings) {
      settings = await prisma.voiceWelcomeSettings.create({
        data: {
          guildId: guild.id,
        },
      });
    }

    const ownerName = await this.getOwnerDisplayName(guild);
    const voiceChannel = settings.voiceChannelId
      ? guild.channels.cache.get(settings.voiceChannelId)?.name || 'Not Configured'
      : 'Not Configured';
    const textChannel = settings.welcomeChannelId
      ? guild.channels.cache.get(settings.welcomeChannelId)?.name || 'Not Configured'
      : 'Not Configured';

    return {
      enabled: settings.enabled,
      voiceChannel,
      textChannel,
      ttsEnabled: settings.ttsEnabled,
      volume: `${Math.round(settings.volume * 100)}%`,
      template: settings.template,
      currentOwnerDisplayName: ownerName,
      ignoreBots: settings.ignoreBots,
      autoReconnect: settings.autoReconnect,
    };
  }

  /**
   * Connects to a voice channel with robust reconnect handling
   */
  public async getOrCreateConnection(
    channel: VoiceBasedChannel
  ): Promise<VoiceConnection | null> {
    const guildId = channel.guild.id;
    let connection = this.connections.get(guildId);

    if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
      return connection;
    }

    try {
      this.intentionalDisconnects.delete(guildId);

      connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false,
      });

      this.connections.set(guildId, connection);

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        if (this.intentionalDisconnects.has(guildId)) {
          this.intentionalDisconnects.delete(guildId);
          return;
        }

        try {
          await Promise.race([
            entersState(connection!, VoiceConnectionStatus.Signalling, 5000),
            entersState(connection!, VoiceConnectionStatus.Connecting, 5000),
          ]);
        } catch {
          if (!this.intentionalDisconnects.has(guildId)) {
            LogService.warn('VoiceWelcomeManager', `Voice disconnected in ${guildId}, cleaning up.`);
            connection?.destroy();
            this.connections.delete(guildId);
          }
        }
      });

      connection.on(VoiceConnectionStatus.Ready, () => {
        LogService.info('VoiceWelcomeManager', `Voice connection ready in guild ${guildId}`);
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 10000).catch((err) => {
        LogService.warn('VoiceWelcomeManager', `entersState Ready wait: ${err}`);
      });
      return connection;
    } catch (err) {
      LogService.error('VoiceWelcomeManager', `Failed to connect to voice in guild ${guildId}`, err);
      connection?.destroy();
      this.connections.delete(guildId);
      return null;
    }
  }

  public leaveVoice(guildId: string): void {
    this.intentionalDisconnects.add(guildId);
    const connection = this.connections.get(guildId);
    if (connection) {
      try {
        connection.destroy();
      } catch {}
      this.connections.delete(guildId);
    }
    ttsQueue.clearQueue(guildId);
  }
}

export const voiceWelcomeManager = VoiceWelcomeManager.getInstance();
