import {
  Guild,
  GuildMember,
  TextChannel,
  EmbedBuilder,
  PermissionsBitField,
} from 'discord.js';
import { prisma } from '../database/db';
import { LogService } from '../services/LogService';

export class ModerationManager {
  private static instance: ModerationManager;

  private constructor() {}

  public static getInstance(): ModerationManager {
    if (!ModerationManager.instance) {
      ModerationManager.instance = new ModerationManager();
    }
    return ModerationManager.instance;
  }

  /**
   * Generates next sequential case number for the guild
   */
  private async getNextCaseNumber(guildId: string): Promise<number> {
    const lastCase = await prisma.cases.findFirst({
      where: { guildId },
      orderBy: { caseNumber: 'desc' },
    });
    return (lastCase?.caseNumber || 0) + 1;
  }

  /**
   * Records a moderation case and broadcasts to mod-log channel if configured
   */
  public async recordCase(
    guild: Guild,
    type: 'WARN' | 'KICK' | 'BAN' | 'UNBAN' | 'TIMEOUT' | 'UNTIMEOUT' | 'MUTE' | 'UNMUTE' | 'PURGE' | 'LOCK',
    target: { id: string; tag: string },
    moderator: { id: string; tag: string },
    reason: string,
    duration?: string
  ) {
    const caseNumber = await this.getNextCaseNumber(guild.id);

    const modCase = await prisma.cases.create({
      data: {
        guildId: guild.id,
        caseNumber,
        type,
        targetId: target.id,
        targetTag: target.tag,
        moderatorId: moderator.id,
        moderatorTag: moderator.tag,
        reason,
        duration,
      },
    });

    // Mod log broadcast
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: guild.id },
    });

    if (settings?.modLogChannelId) {
      const channel = guild.channels.cache.get(settings.modLogChannelId) as TextChannel | undefined;
      if (channel && channel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setColor(
            type === 'BAN' ? 0xdc2626 : type === 'KICK' ? 0xea580c : type === 'TIMEOUT' ? 0xf59e0b : 0x3b82f6
          )
          .setTitle(`🛡️ Case #${caseNumber} | ${type}`)
          .addFields(
            { name: 'Target', value: `${target.tag} (\`${target.id}\`)`, inline: true },
            { name: 'Moderator', value: `${moderator.tag}`, inline: true },
            { name: 'Reason', value: reason, inline: false }
          )
          .setTimestamp();

        if (duration) {
          embed.addFields({ name: 'Duration', value: duration, inline: true });
        }

        channel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    LogService.recordGuildLog(
      guild.id,
      'MOD',
      type,
      `Case #${caseNumber}: ${target.tag} by ${moderator.tag} for "${reason}"`,
      moderator.id,
      target.id
    );

    return modCase;
  }

  public async warnUser(guild: Guild, target: GuildMember, moderator: GuildMember, reason: string) {
    await prisma.warnings.create({
      data: {
        guildId: guild.id,
        userId: target.id,
        moderatorId: moderator.id,
        reason,
      },
    });

    const c = await this.recordCase(
      guild,
      'WARN',
      { id: target.id, tag: target.user.tag },
      { id: moderator.id, tag: moderator.user.tag },
      reason
    );

    // DM notification to warned member
    target.send(`⚠️ You were warned in **${guild.name}** for: "${reason}"`).catch(() => {});
    return c;
  }

  public async getWarnings(guildId: string, userId: string) {
    return prisma.warnings.findMany({
      where: { guildId, userId },
      orderBy: { timestamp: 'desc' },
    });
  }

  public async timeoutMember(guild: Guild, target: GuildMember, moderator: GuildMember, durationMinutes: number, reason: string) {
    const ms = durationMinutes * 60 * 1000;
    await target.timeout(ms, reason);
    return this.recordCase(
      guild,
      'TIMEOUT',
      { id: target.id, tag: target.user.tag },
      { id: moderator.id, tag: moderator.user.tag },
      reason,
      `${durationMinutes} minutes`
    );
  }

  public async kickMember(guild: Guild, target: GuildMember, moderator: GuildMember, reason: string) {
    await target.kick(reason);
    return this.recordCase(
      guild,
      'KICK',
      { id: target.id, tag: target.user.tag },
      { id: moderator.id, tag: moderator.user.tag },
      reason
    );
  }

  public async banMember(guild: Guild, targetId: string, targetTag: string, moderator: GuildMember, reason: string) {
    await guild.members.ban(targetId, { reason });
    return this.recordCase(
      guild,
      'BAN',
      { id: targetId, tag: targetTag },
      { id: moderator.id, tag: moderator.user.tag },
      reason
    );
  }

  public async unbanMember(guild: Guild, targetId: string, moderator: GuildMember, reason: string) {
    await guild.members.unban(targetId, reason);
    return this.recordCase(
      guild,
      'UNBAN',
      { id: targetId, tag: targetId },
      { id: moderator.id, tag: moderator.user.tag },
      reason
    );
  }

  public async purgeMessages(channel: TextChannel, amount: number): Promise<number> {
    const messages = await channel.bulkDelete(Math.min(amount, 100), true);
    return messages.size;
  }

  public async lockChannel(channel: TextChannel, reason = 'Channel locked by staff'): Promise<void> {
    await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
      SendMessages: false,
    });
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('🔒 Channel Locked')
      .setDescription(reason);
    await channel.send({ embeds: [embed] });
  }

  public async unlockChannel(channel: TextChannel): Promise<void> {
    await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
      SendMessages: null,
    });
    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle('🔓 Channel Unlocked')
      .setDescription('Channel is now open for messaging.');
    await channel.send({ embeds: [embed] });
  }
}

export const moderationManager = ModerationManager.getInstance();
