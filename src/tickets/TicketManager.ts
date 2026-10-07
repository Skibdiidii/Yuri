import {
  Guild,
  GuildMember,
  TextChannel,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { prisma } from '../database/db';
import { LogService } from '../services/LogService';

export class TicketManager {
  private static instance: TicketManager;

  private constructor() {}

  public static getInstance(): TicketManager {
    if (!TicketManager.instance) {
      TicketManager.instance = new TicketManager();
    }
    return TicketManager.instance;
  }

  /**
   * Posts interactive Ticket Panel with creation button
   */
  public async createPanel(channel: TextChannel, title = '🎫 Support & Inquiries', description = 'Click the button below to open a private ticket with staff.'): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: 'Harumi Multi-Server Ticket System' });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_create')
        .setLabel('Open Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📩')
    );

    await channel.send({ embeds: [embed], components: [row] });
  }

  /**
   * Creates a private ticket channel for member
   */
  public async createTicket(guild: Guild, creator: GuildMember, reason = 'General Support'): Promise<TextChannel | null> {
    const lastTicket = await prisma.tickets.findFirst({
      where: { guildId: guild.id },
      orderBy: { ticketNumber: 'desc' },
    });
    const ticketNumber = (lastTicket?.ticketNumber || 0) + 1;
    const channelName = `ticket-${ticketNumber.toString().padStart(4, '0')}`;

    try {
      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.roles.everyone,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: creator.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.AttachFiles,
            ],
          },
          {
            id: guild.members.me?.id || creator.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ManageChannels,
            ],
          },
        ],
      });

      const ticket = await prisma.tickets.create({
        data: {
          guildId: guild.id,
          ticketNumber,
          channelId: channel.id,
          creatorId: creator.id,
          status: 'OPEN',
          reason,
        },
      });

      const embed = new EmbedBuilder()
        .setColor(0x3b82f6)
        .setTitle(`🎫 Ticket #${ticketNumber}`)
        .setDescription(`Hello <@${creator.id}>, staff will be with you shortly.\nPlease describe your inquiry in detail below.`)
        .addFields({ name: 'Reason', value: reason })
        .setTimestamp();

      const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_claim_${ticket.id}`)
          .setLabel('Claim Ticket')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✋'),
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticket.id}`)
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒')
      );

      await channel.send({ content: `<@${creator.id}>`, embeds: [embed], components: [controls] });
      return channel;
    } catch (err) {
      LogService.error('TicketManager', 'Failed to create ticket channel', err);
      return null;
    }
  }

  /**
   * Claims ticket by staff member
   */
  public async claimTicket(ticketId: string, staff: GuildMember): Promise<boolean> {
    const ticket = await prisma.tickets.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.status !== 'OPEN') return false;

    await prisma.tickets.update({
      where: { id: ticketId },
      data: {
        claimedById: staff.id,
        status: 'CLAIMED',
      },
    });

    return true;
  }

  /**
   * Closes ticket channel and generates transcript summary
   */
  public async closeTicket(ticketId: string, closer: GuildMember, channel: TextChannel): Promise<void> {
    await prisma.tickets.update({
      where: { id: ticketId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedById: closer.id,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('🔒 Ticket Closed')
      .setDescription(`This ticket was closed by <@${closer.id}>.\nChannel will be deleted in 10 seconds.`);

    await channel.send({ embeds: [embed] });
    setTimeout(() => channel.delete().catch(() => {}), 10000);
  }
}

export const ticketManager = TicketManager.getInstance();
