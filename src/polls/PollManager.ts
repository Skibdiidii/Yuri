import {
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  User,
} from 'discord.js';
import { prisma } from '../database/db';

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // User IDs who voted
}

export class PollManager {
  private static instance: PollManager;

  private constructor() {}

  public static getInstance(): PollManager {
    if (!PollManager.instance) {
      PollManager.instance = new PollManager();
    }
    return PollManager.instance;
  }

  public async createPoll(
    channel: TextChannel,
    author: User,
    question: string,
    optionsList: string[] = ['Yes', 'No'],
    anonymous = false,
    durationMinutes = 60
  ) {
    const options: PollOption[] = optionsList.map((text, idx) => ({
      id: String(idx + 1),
      text,
      votes: [],
    }));

    const endsAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle(`📊 Poll: ${question}`)
      .setDescription(
        options.map((opt) => `**[${opt.id}]** ${opt.text} — **0 votes (0%)**`).join('\n\n') +
        `\n\nMode: ${anonymous ? '🕵️ Anonymous' : 'Public'} · Ends: <t:${Math.floor(endsAt.getTime() / 1000)}:R>`
      )
      .setFooter({ text: `Asked by ${author.tag}` });

    const buttons = options.slice(0, 5).map((opt) =>
      new ButtonBuilder()
        .setCustomId(`poll_vote_${opt.id}`)
        .setLabel(opt.text.slice(0, 50))
        .setStyle(ButtonStyle.Secondary)
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
    const msg = await channel.send({ embeds: [embed], components: [row] });

    return prisma.polls.create({
      data: {
        guildId: channel.guild.id,
        channelId: channel.id,
        messageId: msg.id,
        question,
        options: JSON.stringify(options),
        anonymous,
        endsAt,
      },
    });
  }

  public async castVote(messageId: string, userId: string, optionId: string): Promise<{ success: boolean; message: string }> {
    const poll = await prisma.polls.findFirst({
      where: { messageId, closed: false },
    });

    if (!poll) {
      return { success: false, message: 'This poll has already ended or does not exist.' };
    }

    const options: PollOption[] = JSON.parse(poll.options);
    // Remove previous vote if any (one vote per member)
    for (const opt of options) {
      opt.votes = opt.votes.filter((id) => id !== userId);
    }

    const targetOpt = options.find((opt) => opt.id === optionId);
    if (targetOpt) {
      targetOpt.votes.push(userId);
    }

    await prisma.polls.update({
      where: { id: poll.id },
      data: { options: JSON.stringify(options) },
    });

    return { success: true, message: `Your vote for **${targetOpt?.text}** has been registered!` };
  }
}

export const pollManager = PollManager.getInstance();
