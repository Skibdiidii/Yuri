import {
  Guild,
  GuildMember,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  User,
} from 'discord.js';
import { prisma } from '../database/db';
import { voiceWelcomeManager } from '../voice/VoiceWelcomeManager';

export class CommunityManager {
  private static instance: CommunityManager;

  private constructor() {}

  public static getInstance(): CommunityManager {
    if (!CommunityManager.instance) {
      CommunityManager.instance = new CommunityManager();
    }
    return CommunityManager.instance;
  }

  /**
   * Custom command execution and variable substitution
   */
  public async executeCustomCommand(
    guild: Guild,
    member: GuildMember,
    channel: TextChannel,
    commandName: string
  ): Promise<string | null> {
    const cmd = await prisma.customCommands.findUnique({
      where: {
        guildId_name: { guildId: guild.id, name: commandName.toLowerCase() },
      },
    });

    if (!cmd) return null;

    const ownerName = await voiceWelcomeManager.getOwnerDisplayName(guild);

    return cmd.response
      .replace(/{user}/g, member.user.username)
      .replace(/{username}/g, member.user.username)
      .replace(/{display}/g, member.displayName)
      .replace(/{mention}/g, `<@${member.id}>`)
      .replace(/{server}/g, guild.name)
      .replace(/{owner}/g, ownerName)
      .replace(/{memberCount}/g, String(guild.memberCount))
      .replace(/{channel}/g, `<#${channel.id}>`);
  }

  /**
   * Suggestions system (.suggest)
   */
  public async submitSuggestion(channel: TextChannel, author: User, suggestionText: string) {
    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle('💡 Community Suggestion')
      .setDescription(suggestionText)
      .addFields({ name: 'Status', value: '⏳ Pending Staff Review' })
      .setFooter({ text: `Suggested by ${author.tag} (${author.id})` })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('suggest_upvote')
        .setLabel('Upvote (0)')
        .setStyle(ButtonStyle.Success)
        .setEmoji('👍'),
      new ButtonBuilder()
        .setCustomId('suggest_downvote')
        .setLabel('Downvote (0)')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('👎')
    );

    const msg = await channel.send({ embeds: [embed], components: [row] });

    return prisma.suggestions.create({
      data: {
        guildId: channel.guild.id,
        channelId: channel.id,
        messageId: msg.id,
        authorId: author.id,
        suggestion: suggestionText,
        status: 'PENDING',
      },
    });
  }

  /**
   * Reports system (.report)
   */
  public async submitReport(
    guild: Guild,
    reporter: User,
    targetUser: User,
    reason: string,
    channel?: TextChannel
  ) {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: guild.id },
    });

    const report = await prisma.reports.create({
      data: {
        guildId: guild.id,
        channelId: channel?.id,
        reporterId: reporter.id,
        targetId: targetUser.id,
        reason,
        status: 'OPEN',
      },
    });

    if (settings?.reportChannelId) {
      const staffChannel = guild.channels.cache.get(settings.reportChannelId) as TextChannel | undefined;
      if (staffChannel && staffChannel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setColor(0xdc2626)
          .setTitle(`🚨 Staff Incident Report #${report.id.slice(-4)}`)
          .addFields(
            { name: 'Reporter', value: `<@${reporter.id}> (${reporter.tag})`, inline: true },
            { name: 'Reported User', value: `<@${targetUser.id}> (${targetUser.tag})`, inline: true },
            { name: 'Channel', value: channel ? `<#${channel.id}>` : 'Direct', inline: true },
            { name: 'Reason', value: reason, inline: false }
          )
          .setTimestamp();

        staffChannel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    return report;
  }

  /**
   * Starboard reaction check
   */
  public async handleStarboardReaction(guild: Guild, messageChannel: TextChannel, messageId: string, starCount: number) {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: guild.id },
    });

    if (!settings?.starboardChannelId || starCount < settings.starThreshold) return;

    const starboardChannel = guild.channels.cache.get(settings.starboardChannelId) as TextChannel | undefined;
    if (!starboardChannel || !starboardChannel.isTextBased()) return;

    const sourceMessage = await messageChannel.messages.fetch(messageId).catch(() => null);
    if (!sourceMessage) return;

    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setAuthor({ name: sourceMessage.author.tag, iconURL: sourceMessage.author.displayAvatarURL() })
      .setDescription(sourceMessage.content || '*(Image or Attachment)*')
      .addFields({ name: 'Original', value: `[Jump to message](${sourceMessage.url})` })
      .setFooter({ text: `⭐ ${starCount} | #${messageChannel.name}` })
      .setTimestamp(sourceMessage.createdAt);

    if (sourceMessage.attachments.size > 0) {
      embed.setImage(sourceMessage.attachments.first()!.url);
    }

    await starboardChannel.send({ embeds: [embed] });
  }

  /**
   * Server backup generation
   */
  public async createBackup(guild: Guild, creatorId: string) {
    const backupData = {
      name: guild.name,
      icon: guild.iconURL(),
      channels: guild.channels.cache.map((c) => ({
        name: c.name,
        type: c.type,
        parentId: c.parentId,
      })),
      roles: guild.roles.cache.map((r) => ({
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        permissions: r.permissions.bitfield.toString(),
      })),
      timestamp: new Date().toISOString(),
    };

    return prisma.backups.create({
      data: {
        guildId: guild.id,
        creatorId,
        data: JSON.stringify(backupData),
      },
    });
  }
}

export const communityManager = CommunityManager.getInstance();
