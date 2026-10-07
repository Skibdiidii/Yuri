import { Message, TextChannel, EmbedBuilder, PermissionsBitField } from 'discord.js';
import { prisma } from '../database/db';
import { harumiAI, AIImageInput, HarumiAI } from './HarumiAI';
import { LogService } from '../services/LogService';

export class AIChannelManager {
  private static instance: AIChannelManager;
  private channelCache = new Set<string>(); // Set of channelIds
  private replyOnlyChannels = new Set<string>(); // Set of channelIds with reply-only mode
  private guildReplyOnly = new Map<string, boolean>(); // Set of guildId -> replyOnly
  private globalReplyOnly = true; // Bot-wide reply-only mode (only talks if replied to or pinged)
  private cacheLoaded = false;

  private constructor() {
    this.refreshCache();
  }

  public static getInstance(): AIChannelManager {
    if (!AIChannelManager.instance) {
      AIChannelManager.instance = new AIChannelManager();
    }
    return AIChannelManager.instance;
  }

  public setGlobalReplyOnly(enabled: boolean): void {
    this.globalReplyOnly = enabled;
    LogService.info('AIChannel', `Global AI Reply-Only mode set to: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  public isGlobalReplyOnly(): boolean {
    return this.globalReplyOnly;
  }

  public setGuildReplyOnly(guildId: string, enabled: boolean): void {
    this.guildReplyOnly.set(guildId, enabled);
    LogService.info('AIChannel', `Guild ${guildId} AI Reply-Only mode set to: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  public isGuildReplyOnly(guildId: string): boolean {
    if (this.guildReplyOnly.has(guildId)) {
      return Boolean(this.guildReplyOnly.get(guildId));
    }
    return this.globalReplyOnly;
  }

  public setReplyOnly(channelId: string, enabled: boolean): void {
    if (enabled) {
      this.replyOnlyChannels.add(channelId);
    } else {
      this.replyOnlyChannels.delete(channelId);
    }
    LogService.info('AIChannel', `Reply-only mode ${enabled ? 'ENABLED' : 'DISABLED'} for channel ${channelId}`);
  }

  public isReplyOnly(channelId: string): boolean {
    return this.replyOnlyChannels.has(channelId) || this.globalReplyOnly;
  }

  public async refreshCache(): Promise<void> {
    try {
      const channels = await prisma.aIChannel.findMany({
        select: { channelId: true },
      });
      this.channelCache.clear();
      for (const ch of channels) {
        this.channelCache.add(ch.channelId);
      }
      this.cacheLoaded = true;
    } catch (err) {
      LogService.error('AIChannelManager', 'Failed to load AI channel cache', err);
    }
  }

  public async isAIChannel(guildId: string, channelId: string): Promise<boolean> {
    if (!this.cacheLoaded) {
      await this.refreshCache();
    }
    return this.channelCache.has(channelId);
  }

  public async setAIChannel(
    guildId: string,
    channelId: string,
    channelName: string,
    setBy: string
  ): Promise<{ success: boolean; message: string; channelId: string }> {
    try {
      await prisma.aIChannel.upsert({
        where: { channelId },
        create: {
          guildId,
          channelId,
          channelName,
          setBy,
        },
        update: {
          channelName,
          setBy,
        },
      });

      this.channelCache.add(channelId);
      LogService.info('AIChannel', `24/7 AI Chat Channel set: #${channelName} (${channelId}) in guild ${guildId}`);

      return {
        success: true,
        message: `Channel <#${channelId}> is now set as a **24/7 Harumi AI Chat Channel**! Harumi is waiting and listening for anyone to chat.`,
        channelId,
      };
    } catch (err: any) {
      LogService.error('AIChannel', 'Failed to set AI channel', err);
      return {
        success: false,
        message: `Failed to set AI channel: ${err.message}`,
        channelId,
      };
    }
  }

  public async removeAIChannel(
    guildId: string,
    channelId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const existing = await prisma.aIChannel.findUnique({
        where: { channelId },
      });

      if (!existing) {
        return {
          success: false,
          message: `<#${channelId}> is not currently configured as a 24/7 AI chat channel.`,
        };
      }

      await prisma.aIChannel.delete({
        where: { channelId },
      });

      this.channelCache.delete(channelId);
      LogService.info('AIChannel', `24/7 AI Chat Channel removed: ${channelId}`);

      return {
        success: true,
        message: `24/7 AI Chat Mode **Disabled** for <#${channelId}>.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to remove AI channel: ${err.message}`,
      };
    }
  }

  public async getAIChannels(guildId: string) {
    return prisma.aIChannel.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Automatically handles any message sent in a 24/7 AI channel
   */
  public async handleMessage(message: Message): Promise<boolean> {
    if (message.author.bot || !message.guild) return false;

    const isDedicated = await this.isAIChannel(message.guild.id, message.channel.id);
    const botId = message.client.user?.id;
    const isMentioned = botId ? message.mentions.users.has(botId) : false;

    let isReplyToBot = false;
    if (message.reference && message.reference.messageId && botId) {
      try {
        const refMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (refMsg && refMsg.author.id === botId) {
          isReplyToBot = true;
        }
      } catch {}
    }

    const isReplyOnlyMode =
      this.isReplyOnly(message.channel.id) ||
      (message.guild && this.isGuildReplyOnly(message.guild.id)) ||
      this.isGlobalReplyOnly();

    // In reply-only mode: ONLY talk if user replies to the bot or pings/mentions the bot!
    if (isReplyOnlyMode) {
      if (!isMentioned && !isReplyToBot) {
        return false;
      }
    } else if (!isDedicated && !isMentioned && !isReplyToBot) {
      return false;
    }

    // Show typing
    if (message.channel.isTextBased() && 'sendTyping' in message.channel) {
      await (message.channel as TextChannel).sendTyping().catch(() => {});
    }

    // Extract attached images (multimodal vision)
    const images: AIImageInput[] = [];
    if (message.attachments && message.attachments.size > 0) {
      for (const [, att] of message.attachments) {
        const ct = att.contentType || '';
        const isImg =
          ct.startsWith('image/') ||
          att.url.endsWith('.png') ||
          att.url.endsWith('.jpg') ||
          att.url.endsWith('.jpeg') ||
          att.url.endsWith('.webp') ||
          att.url.endsWith('.gif');

        if (isImg) {
          images.push({
            url: att.url,
            mimeType: ct || 'image/png',
          });
        }
      }
    }

    // Also look for image URLs inside text
    const imageUrlRegex = /(https?:\/\/[^\s]+?\.(?:png|jpg|jpeg|webp|gif)(?:\?[^\s]*)?)/gi;
    const matchedUrls = message.content.match(imageUrlRegex);
    if (matchedUrls) {
      for (const url of matchedUrls) {
        if (!images.some((img) => img.url === url)) {
          images.push({
            url,
            mimeType: 'image/png',
          });
        }
      }
    }

    // Clean user prompt to remove raw Discord mention tags
    let promptText = message.content;
    if (botId) {
      promptText = promptText.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim();
    }
    if (!promptText && images.length === 0) {
      promptText = 'Hello Harumi!';
    }

    try {
      const res = await harumiAI.generateResponse(
        message.guild.id,
        message.channel.id,
        message.author.id,
        promptText,
        {
          member: message.member,
          user: message.author,
          images,
        }
      );

      const chunks = HarumiAI.splitResponse(res.text);
      for (let i = 0; i < chunks.length; i++) {
        if (i === 0) {
          await message.reply({ content: chunks[i] }).catch(async () => {
            await (message.channel as TextChannel).send({ content: chunks[i] });
          });
        } else {
          await (message.channel as TextChannel).send({ content: chunks[i] });
        }
      }

      return true;
    } catch (err) {
      LogService.error('AIChannel', 'Failed to handle AI channel message', err);
      return false;
    }
  }
}

export const aiChannelManager = AIChannelManager.getInstance();
