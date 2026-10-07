import {
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  User,
} from 'discord.js';
import { prisma } from '../database/db';

export class GiveawayManager {
  private static instance: GiveawayManager;

  private constructor() {}

  public static getInstance(): GiveawayManager {
    if (!GiveawayManager.instance) {
      GiveawayManager.instance = new GiveawayManager();
    }
    return GiveawayManager.instance;
  }

  public async startGiveaway(
    channel: TextChannel,
    host: User,
    prize: string,
    durationMinutes: number,
    winnerCount = 1,
    minLevel = 0,
    requiredRoleId?: string
  ) {
    const endsAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const embed = new EmbedBuilder()
      .setColor(0xec4899)
      .setTitle(`🎉 GIVEAWAY: ${prize}`)
      .setDescription(
        `Click the button below to enter!\n\n` +
        `**Prize:** ${prize}\n` +
        `**Winners:** ${winnerCount}\n` +
        `**Hosted By:** <@${host.id}>\n` +
        `**Ends:** <t:${Math.floor(endsAt.getTime() / 1000)}:R> (<t:${Math.floor(endsAt.getTime() / 1000)}:f>)\n` +
        (minLevel > 0 ? `**Minimum Level:** ${minLevel}\n` : '') +
        (requiredRoleId ? `**Required Role:** <@&${requiredRoleId}>\n` : '')
      )
      .setFooter({ text: 'Harumi Giveaway System' });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('giveaway_enter')
        .setLabel('Enter Giveaway (0)')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎉')
    );

    const msg = await channel.send({ embeds: [embed], components: [row] });

    return prisma.giveaways.create({
      data: {
        guildId: channel.guild.id,
        channelId: channel.id,
        messageId: msg.id,
        prize,
        winnerCount,
        endsAt,
        hostId: host.id,
        minLevel,
        requiredRoleId,
        entries: '[]',
        winners: '[]',
      },
    });
  }

  public async enterGiveaway(messageId: string, userId: string): Promise<{ success: boolean; count: number; message: string }> {
    const ga = await prisma.giveaways.findFirst({
      where: { messageId, ended: false },
    });

    if (!ga) {
      return { success: false, count: 0, message: 'This giveaway is not active or has already ended.' };
    }

    const entries: string[] = JSON.parse(ga.entries || '[]');
    if (entries.includes(userId)) {
      // Remove entry (toggle)
      const updated = entries.filter((id) => id !== userId);
      await prisma.giveaways.update({
        where: { id: ga.id },
        data: { entries: JSON.stringify(updated) },
      });
      return { success: true, count: updated.length, message: 'You have left the giveaway.' };
    } else {
      entries.push(userId);
      await prisma.giveaways.update({
        where: { id: ga.id },
        data: { entries: JSON.stringify(entries) },
      });
      return { success: true, count: entries.length, message: 'You entered the giveaway! Good luck! 🎉' };
    }
  }

  public async pickWinners(giveawayId: string): Promise<string[]> {
    const ga = await prisma.giveaways.findUnique({ where: { id: giveawayId } });
    if (!ga) return [];

    const entries: string[] = JSON.parse(ga.entries || '[]');
    if (entries.length === 0) return [];

    // Shuffle and select
    const shuffled = [...entries].sort(() => 0.5 - Math.random());
    const winners = shuffled.slice(0, ga.winnerCount);

    await prisma.giveaways.update({
      where: { id: giveawayId },
      data: {
        ended: true,
        winners: JSON.stringify(winners),
      },
    });

    return winners;
  }
}

export const giveawayManager = GiveawayManager.getInstance();
