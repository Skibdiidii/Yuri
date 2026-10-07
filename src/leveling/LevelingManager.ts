import { GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { prisma } from '../database/db';
import { cooldownService } from '../services/CooldownService';

export class LevelingManager {
  private static instance: LevelingManager;

  private constructor() {}

  public static getInstance(): LevelingManager {
    if (!LevelingManager.instance) {
      LevelingManager.instance = new LevelingManager();
    }
    return LevelingManager.instance;
  }

  /**
   * Standard quadratic leveling formula: XP needed for next level
   */
  public getXpForLevel(level: number): number {
    return 5 * level * level + 50 * level + 100;
  }

  /**
   * Adds random 15-25 XP upon chat message with 60s cooldown to prevent spam
   */
  public async handleMessageXp(member: GuildMember, channel: TextChannel): Promise<void> {
    if (member.user.bot) return;

    const remaining = cooldownService.getRemaining('user', member.guild.id, member.id, 'xp');
    if (remaining > 0) return;

    cooldownService.set('user', member.guild.id, member.id, 60, 'xp');

    const xpEarned = Math.floor(Math.random() * 11) + 15; // 15 to 25

    let record = await prisma.xP.findUnique({
      where: {
        guildId_userId: { guildId: member.guild.id, userId: member.id },
      },
    });

    if (!record) {
      record = await prisma.xP.create({
        data: {
          guildId: member.guild.id,
          userId: member.id,
          xp: xpEarned,
          level: 0,
        },
      });
      return;
    }

    const nextLevelReq = this.getXpForLevel(record.level);
    const newXp = record.xp + xpEarned;

    if (newXp >= nextLevelReq) {
      // Level Up!
      const newLevel = record.level + 1;
      await prisma.xP.update({
        where: { id: record.id },
        data: { xp: newXp - nextLevelReq, level: newLevel, lastXpEarned: new Date() },
      });

      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle('🎉 Level Up!')
        .setDescription(`Congratulations <@${member.id}>! You just reached **Level ${newLevel}**!`)
        .setFooter({ text: 'Harumi Leveling Engine' });

      channel.send({ embeds: [embed] }).catch(() => {});
    } else {
      await prisma.xP.update({
        where: { id: record.id },
        data: { xp: newXp, lastXpEarned: new Date() },
      });
    }
  }

  /**
   * Retrieves member rank and leaderboard position
   */
  public async getRank(guildId: string, userId: string) {
    const userRecord = await prisma.xP.findUnique({
      where: { guildId_userId: { guildId, userId } },
    });

    const level = userRecord?.level || 0;
    const currentXp = userRecord?.xp || 0;
    const requiredXp = this.getXpForLevel(level);

    const higherXpCount = await prisma.xP.count({
      where: {
        guildId,
        OR: [
          { level: { gt: level } },
          { level, xp: { gt: currentXp } },
        ],
      },
    });

    const leaderboardPosition = higherXpCount + 1;

    return {
      level,
      currentXp,
      requiredXp,
      leaderboardPosition,
    };
  }

  /**
   * Top 10 XP Leaderboard
   */
  public async getLeaderboard(guildId: string, limit = 10) {
    return prisma.xP.findMany({
      where: { guildId },
      orderBy: [{ level: 'desc' }, { xp: 'desc' }],
      take: limit,
    });
  }
}

export const levelingManager = LevelingManager.getInstance();
