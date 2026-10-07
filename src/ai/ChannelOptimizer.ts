import {
  Guild,
  GuildMember,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  NonThreadGuildBasedChannel,
} from 'discord.js';
import { LogService } from '../services/LogService';
import { PermissionService } from '../services/PermissionService';

export interface ChannelProposal {
  id: string;
  guildId: string;
  createdAt: number;
  channelsToDelete: Array<{
    id: string;
    name: string;
    type: string;
    reason: string;
  }>;
  addedChannels: string[];
}

export class ChannelOptimizer {
  private static instance: ChannelOptimizer;
  private proposals = new Map<string, ChannelProposal>();

  private constructor() {
    // Periodically clean up proposals older than 15 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [id, prop] of this.proposals.entries()) {
        if (now - prop.createdAt > 15 * 60 * 1000) {
          this.proposals.delete(id);
        }
      }
    }, 60000);
  }

  public static getInstance(): ChannelOptimizer {
    if (!ChannelOptimizer.instance) {
      ChannelOptimizer.instance = new ChannelOptimizer();
    }
    return ChannelOptimizer.instance;
  }

  /**
   * Scans server channels, adds missing recommended basic channels,
   * and proposes deletion of duplicate/redundant channels with interactive confirmation.
   */
  public async optimizeChannels(
    guild: Guild,
    member: GuildMember,
    _promptText = ''
  ): Promise<{
    embed: EmbedBuilder;
    components: ActionRowBuilder<ButtonBuilder>[];
    addedChannels: string[];
    duplicates: Array<{ id: string; name: string; type: string; reason: string }>;
  }> {
    const channels = Array.from(guild.channels.cache.values());
    const textChannels = channels.filter((c) => c.type === ChannelType.GuildText);
    const voiceChannels = channels.filter((c) => c.isVoiceBased() && c.type === ChannelType.GuildVoice);
    const categories = channels.filter((c) => c.type === ChannelType.GuildCategory);

    let addedChannels: string[] = [];
    const duplicates: Array<{ id: string; name: string; type: string; reason: string }> = [];

    // 1. Detect duplicates among text channels
    const textNameMap = new Map<string, NonThreadGuildBasedChannel>();
    for (const ch of textChannels) {
      const normalized = ch.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const baseName = normalized.replace(/\d+$/, ''); // Strip trailing numbers (e.g. general1 -> general)

      if (textNameMap.has(normalized) || (baseName.length > 2 && textNameMap.has(baseName) && normalized !== baseName)) {
        duplicates.push({
          id: ch.id,
          name: ch.name,
          type: 'Text',
          reason: `Duplicate of #${textNameMap.get(normalized)?.name || textNameMap.get(baseName)?.name}`,
        });
      } else {
        textNameMap.set(normalized, ch);
        if (baseName.length > 2) textNameMap.set(baseName, ch);
      }
    }

    // 2. Detect duplicates among voice channels
    const voiceNameMap = new Map<string, NonThreadGuildBasedChannel>();
    for (const vch of voiceChannels) {
      // Don't flag VoiceMaster Join-to-Create as a duplicate
      if (vch.name.includes('Join to Create')) continue;

      const normalized = vch.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const baseName = normalized.replace(/\d+$/, '');

      if (voiceNameMap.has(normalized) || (baseName.length > 2 && voiceNameMap.has(baseName) && normalized !== baseName)) {
        duplicates.push({
          id: vch.id,
          name: vch.name,
          type: 'Voice',
          reason: `Duplicate of voice channel "${voiceNameMap.get(normalized)?.name || voiceNameMap.get(baseName)?.name}"`,
        });
      } else {
        voiceNameMap.set(normalized, vch);
        if (baseName.length > 2) voiceNameMap.set(baseName, vch);
      }
    }

    // 3. Recommended Basic Community Channels
    const recommendedBasics: Array<{ name: string; type: ChannelType.GuildText; category: string; topic: string }> = [
      { name: 'rules', type: ChannelType.GuildText, category: 'INFORMATION', topic: 'Server rules & guidelines' },
      { name: 'announcements', type: ChannelType.GuildText, category: 'INFORMATION', topic: 'Official server news' },
      { name: 'general', type: ChannelType.GuildText, category: 'COMMUNITY', topic: 'Main server discussion' },
      { name: 'media', type: ChannelType.GuildText, category: 'COMMUNITY', topic: 'Photos, videos, and artwork' },
      { name: 'bot-commands', type: ChannelType.GuildText, category: 'COMMUNITY', topic: 'Bot commands & interaction' },
    ];

    const newlyCreated: string[] = [];

    // Only create channels if administrator or manage channels
    const canManageChannels =
      member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      member.permissions.has(PermissionsBitField.Flags.ManageChannels);

    if (canManageChannels) {
      // Check if Information category exists
      let infoCat = categories.find((c) => c.name.toLowerCase().includes('information') || c.name.toLowerCase().includes('welcome'));
      let commCat = categories.find((c) => c.name.toLowerCase().includes('community') || c.name.toLowerCase().includes('text channels') || c.name.toLowerCase().includes('chat'));

      for (const rec of recommendedBasics) {
        const exists = channels.some(
          (c) => c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === rec.name.replace(/[^a-z0-9]/g, '')
        );

        if (!exists) {
          try {
            let parentId: string | undefined;
            if (rec.category === 'INFORMATION') {
              if (!infoCat) {
                infoCat = await guild.channels.create({
                  name: '📌 INFORMATION',
                  type: ChannelType.GuildCategory,
                  reason: 'AI Channel Improvement',
                });
              }
              parentId = infoCat.id;
            } else {
              if (!commCat) {
                commCat = await guild.channels.create({
                  name: '💬 TEXT CHANNELS',
                  type: ChannelType.GuildCategory,
                  reason: 'AI Channel Improvement',
                });
              }
              parentId = commCat.id;
            }

            const created = await guild.channels.create({
              name: rec.name,
              type: rec.type,
              parent: parentId,
              topic: rec.topic,
              reason: 'AI Channel Improvement: Adding standard community channel',
            });
            newlyCreated.push(`#${created.name}`);
          } catch (createErr) {
            LogService.warn('ChannelOptimizer', `Could not create recommended channel ${rec.name}`, createErr);
          }
        }
      }
    }

    addedChannels = newlyCreated;

    // Create deletion proposal if duplicates found
    const proposalId = Math.random().toString(36).substring(2, 10);
    if (duplicates.length > 0) {
      this.proposals.set(proposalId, {
        id: proposalId,
        guildId: guild.id,
        createdAt: Date.now(),
        channelsToDelete: duplicates,
        addedChannels,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('🏛️ AI Server Channel Optimization Report')
      .setDescription(
        `Harumi AI analyzed **${channels.length} channels** in **${guild.name}** to streamline server structure.\n\n` +
        `**Added Basic Channels:**\n` +
        (addedChannels.length > 0
          ? addedChannels.map((c) => `• ✨ **${c}** (Created standard community space)`).join('\n')
          : `• *All standard community channels are already in place.*`) +
        `\n\n` +
        `**Duplicate / Redundant Channels Found (${duplicates.length}):**\n` +
        (duplicates.length > 0
          ? duplicates
              .map(
                (d, idx) =>
                  `\`${idx + 1}.\` **${d.type === 'Text' ? '#' : '🔊 '}${d.name}** — *${d.reason}*`
              )
              .join('\n') +
            `\n\n⚠️ **Would you like to delete these redundant duplicate channels?**\nClick the button below to confirm or cancel.`
          : `• *Zero duplicate or redundant channels detected. Server layout is clean!*`)
      )
      .setFooter({ text: 'AI Server Architect • Safe interactive confirmation required for channel deletion' })
      .setTimestamp();

    const components: ActionRowBuilder<ButtonBuilder>[] = [];
    if (duplicates.length > 0) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`ai_del_chan_${proposalId}`)
          .setLabel('Yes, Delete Duplicate Channels')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`ai_keep_chan_${proposalId}`)
          .setLabel('No, Keep All Channels')
          .setStyle(ButtonStyle.Secondary)
      );
      components.push(row);
    }

    return {
      embed,
      components,
      addedChannels,
      duplicates,
    };
  }

  /**
   * Executes deletion of confirmed duplicate channels upon user button click
   */
  public async executeProposalDeletion(
    proposalId: string,
    guild: Guild,
    member: GuildMember
  ): Promise<{ success: boolean; message: string; deletedCount: number; embed: EmbedBuilder }> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.guildId !== guild.id) {
      const errEmbed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('✕ Proposal Expired or Not Found')
        .setDescription('This channel cleanup proposal has expired. Run `.ai improve channels` to generate a fresh audit.');
      return { success: false, message: 'Proposal expired', deletedCount: 0, embed: errEmbed };
    }

    if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels) && !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      const noPermEmbed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('✕ Permission Denied')
        .setDescription('You need **Manage Channels** or **Administrator** permissions to delete channels.');
      return { success: false, message: 'Permission denied', deletedCount: 0, embed: noPermEmbed };
    }

    const deletedNames: string[] = [];
    for (const item of proposal.channelsToDelete) {
      try {
        const ch = guild.channels.cache.get(item.id);
        if (ch && 'delete' in ch && typeof (ch as any).delete === 'function') {
          await (ch as any).delete(`AI Channel Optimization confirmed by ${member.user.tag}`);
          deletedNames.push(`${item.type === 'Text' ? '#' : '🔊 '}${item.name}`);
        }
      } catch (err) {
        LogService.warn('ChannelOptimizer', `Could not delete channel ${item.name} (${item.id})`, err);
      }
    }

    this.proposals.delete(proposalId);

    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle('✅ Duplicate Channels Successfully Removed')
      .setDescription(
        `Cleaned up **${deletedNames.length} duplicate channels** confirmed by <@${member.id}>:\n\n` +
        deletedNames.map((n) => `• 🗑️ **${n}** (Deleted)`).join('\n') +
        `\n\n✨ Your server channel structure has been organized and optimized!`
      )
      .setFooter({ text: 'AI Server Channel Optimization Completed' })
      .setTimestamp();

    return {
      success: true,
      message: `Deleted ${deletedNames.length} duplicate channels.`,
      deletedCount: deletedNames.length,
      embed,
    };
  }

  /**
   * Cancels a pending deletion proposal
   */
  public cancelProposal(
    proposalId: string,
    member: GuildMember
  ): { success: boolean; embed: EmbedBuilder } {
    this.proposals.delete(proposalId);
    const embed = new EmbedBuilder()
      .setColor(0x71717a)
      .setTitle('✕ Channel Deletion Cancelled')
      .setDescription(`Channel cleanup was cancelled by <@${member.id}>. All existing channels have been preserved untouched.`)
      .setFooter({ text: 'No channels were modified or deleted' });

    return { success: true, embed };
  }
}

export const channelOptimizer = ChannelOptimizer.getInstance();
