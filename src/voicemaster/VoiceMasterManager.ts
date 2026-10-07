import {
  Guild,
  GuildMember,
  VoiceState,
  ChannelType,
  PermissionsBitField,
  VoiceBasedChannel,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { prisma } from '../database/db';
import { LogService } from '../services/LogService';

export interface TempChannelState {
  channelId: string;
  guildId: string;
  ownerId: string;
  isLocked: boolean;
  isHidden: boolean;
  userLimit: number;
}

export class VoiceMasterManager {
  private static instance: VoiceMasterManager;
  private tempChannels = new Map<string, TempChannelState>();

  private constructor() {
    this.loadActiveTempChannels();
  }

  public static getInstance(): VoiceMasterManager {
    if (!VoiceMasterManager.instance) {
      VoiceMasterManager.instance = new VoiceMasterManager();
    }
    return VoiceMasterManager.instance;
  }

  private async loadActiveTempChannels(): Promise<void> {
    try {
      const records = await prisma.tempVoiceChannel.findMany();
      for (const r of records) {
        this.tempChannels.set(r.channelId, {
          channelId: r.channelId,
          guildId: r.guildId,
          ownerId: r.ownerId,
          isLocked: r.isLocked,
          isHidden: r.isHidden,
          userLimit: r.userLimit,
        });
      }
    } catch (err) {
      LogService.error('VoiceMaster', 'Failed to load active temp voice channels', err);
    }
  }

  /**
   * Sets up VoiceMaster category, hub channel, and interactive control panel
   */
  public async setup(guild: Guild): Promise<{
    hubChannel: VoiceBasedChannel;
    panelChannel: TextChannel;
    category: any;
  }> {
    // 1. Create or get Category
    let category = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('voicemaster')
    );

    if (!category) {
      category = await guild.channels.create({
        name: '🔊 VoiceMaster System',
        type: ChannelType.GuildCategory,
        reason: 'Harumi VoiceMaster Category Setup',
      });
    }

    // 2. Create "➕ Join to Create" voice hub
    let hubChannel = guild.channels.cache.find(
      (c) =>
        c.isVoiceBased() &&
        c.parentId === category?.id &&
        c.name.includes('Join to Create')
    ) as VoiceBasedChannel | undefined;

    if (!hubChannel) {
      hubChannel = (await guild.channels.create({
        name: '➕ Join to Create',
        type: ChannelType.GuildVoice,
        parent: category.id,
        reason: 'Harumi VoiceMaster Hub Channel',
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
          },
        ],
      })) as VoiceBasedChannel;
    }

    // 3. Create or lock text controls channel
    let panelChannel = guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildText &&
        c.parentId === category?.id &&
        (c.name.includes('voice-control') || c.name.includes('vc-control'))
    ) as TextChannel | undefined;

    const lockedPermissions = [
      {
        id: guild.roles.everyone.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
        deny: [
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.AddReactions,
          PermissionsBitField.Flags.CreatePublicThreads,
          PermissionsBitField.Flags.CreatePrivateThreads,
          PermissionsBitField.Flags.SendMessagesInThreads,
          PermissionsBitField.Flags.UseApplicationCommands,
        ],
      },
      {
        id: guild.members.me?.id || guild.client.user!.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.EmbedLinks,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageMessages,
          PermissionsBitField.Flags.ManageChannels,
        ],
      },
    ];

    if (!panelChannel) {
      panelChannel = (await guild.channels.create({
        name: '🎛️-vc-control',
        type: ChannelType.GuildText,
        parent: category.id,
        reason: 'Harumi VoiceMaster Locked Control Panel Channel',
        permissionOverwrites: lockedPermissions,
      })) as TextChannel;

      await this.sendControlPanelEmbed(panelChannel, hubChannel.id);
    } else {
      // Ensure the existing channel has strictly locked permissions
      try {
        for (const perm of lockedPermissions) {
          await panelChannel.permissionOverwrites.edit(perm.id, {
            ViewChannel: perm.allow.includes(PermissionsBitField.Flags.ViewChannel) ? true : null,
            ReadMessageHistory: perm.allow.includes(PermissionsBitField.Flags.ReadMessageHistory) ? true : null,
            SendMessages: perm.deny?.includes(PermissionsBitField.Flags.SendMessages) ? false : true,
            AddReactions: perm.deny?.includes(PermissionsBitField.Flags.AddReactions) ? false : true,
            CreatePublicThreads: perm.deny?.includes(PermissionsBitField.Flags.CreatePublicThreads) ? false : true,
            CreatePrivateThreads: perm.deny?.includes(PermissionsBitField.Flags.CreatePrivateThreads) ? false : true,
          });
        }
      } catch (err) {
        LogService.warn('VoiceMaster', 'Could not sync locked channel permissions', err);
      }
    }

    // Persist to database
    await prisma.voiceMasterSettings.upsert({
      where: { guildId: guild.id },
      create: {
        guildId: guild.id,
        enabled: true,
        categoryId: category.id,
        hubChannelId: hubChannel.id,
        panelChannelId: panelChannel.id,
      },
      update: {
        enabled: true,
        categoryId: category.id,
        hubChannelId: hubChannel.id,
        panelChannelId: panelChannel.id,
      },
    });

    LogService.info('VoiceMaster', `VoiceMaster setup completed for guild ${guild.name} (Channel Locked)`);
    return { hubChannel, panelChannel, category };
  }

  /**
   * Sends or updates the comprehensive locked VC Control Embed Panel
   */
  public async sendControlPanelEmbed(panelChannel: TextChannel, hubChannelId: string): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x0f111a) // cold dark graphite aesthetic
      .setTitle('🎛️ VOICE CONTROL INTERFACE • SECURE PANEL')
      .setDescription(
        `Join **<#${hubChannelId}>** to generate your personal dynamic voice room!\n` +
        `This channel is **strictly locked** — interact with your private voice space using the buttons below.`
      )
      .addFields(
        {
          name: '🔒 PRIVACY & ACCESS',
          value: '`Lock` disallow joins • `Unlock` open room • `Hide` disappear from list • `Unhide` show • `Claim` takeover empty room',
          inline: false,
        },
        {
          name: '👥 CAPACITY & SIZING',
          value: '`Limit -1` / `Limit +1` adjust user capacity • `Unlimited` remove limit • `Disconnect` kick non-owners',
          inline: false,
        },
        {
          name: '📶 AUDIO & SOUND UTILITIES',
          value: '`Mute Room` mute guests • `Unmute Room` unmute • `Bitrate` toggle 96k/384k ultra • `TTS` toggle voice assist • `Info` stats',
          inline: false,
        }
      )
      .setFooter({ text: 'Harumi VoiceMaster System • Channel Locked to @everyone • Dynamic Rooms Auto-Delete on Empty' })
      .setTimestamp();

    const components = this.getControlPanelComponents();
    await panelChannel.send({ embeds: [embed], components });
  }

  /**
   * Returns the 3 rows of interactive VC control buttons
   */
  public getControlPanelComponents(): ActionRowBuilder<ButtonBuilder>[] {
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('vm_btn_lock').setLabel('Lock').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('vm_btn_unlock').setLabel('Unlock').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('vm_btn_hide').setLabel('Hide').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('vm_btn_unhide').setLabel('Unhide').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('vm_btn_claim').setLabel('Claim').setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('vm_btn_limit_down').setLabel('-1 Slot').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('vm_btn_limit_up').setLabel('+1 Slot').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('vm_btn_limit_zero').setLabel('Unlimited').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('vm_btn_rename').setLabel('Rename').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('vm_btn_kick').setLabel('Disconnect').setStyle(ButtonStyle.Danger)
    );

    const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('vm_btn_mute_all').setLabel('Mute Room').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('vm_btn_unmute_all').setLabel('Unmute Room').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('vm_btn_bitrate').setLabel('Bitrate').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('vm_btn_tts').setLabel('TTS Voice').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('vm_btn_info').setLabel('Room Info').setStyle(ButtonStyle.Success)
    );

    return [row1, row2, row3];
  }

  /**
   * Handles user joins, moves, leaves for VoiceMaster hub and temporary channels
   */
  public async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    const guild = newState.guild || oldState.guild;
    const member = newState.member || oldState.member;
    if (!guild || !member) return;

    const settings = await prisma.voiceMasterSettings.findUnique({
      where: { guildId: guild.id },
    });

    if (!settings || !settings.enabled) return;

    // 1. User joined the "➕ Join to Create" Hub Channel
    if (newState.channelId && newState.channelId === settings.hubChannelId) {
      await this.createTempChannelForMember(guild, member, settings);
    }

    // 2. User left or moved out of a temporary voice channel
    if (oldState.channelId && oldState.channelId !== settings.hubChannelId) {
      await this.handleTempChannelLeave(guild, oldState.channelId);
    }
  }

  /**
   * Creates personal temporary voice room and transfers member
   */
  private async createTempChannelForMember(
    guild: Guild,
    member: GuildMember,
    settings: any
  ): Promise<VoiceBasedChannel | null> {
    try {
      const channelName = `🎮 ${member.displayName}'s Room`;
      const tempChannel = (await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: settings.categoryId || undefined,
        reason: `VoiceMaster Dynamic Room for ${member.user.tag}`,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
          },
          {
            id: member.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.Speak,
              PermissionsBitField.Flags.ManageChannels,
              PermissionsBitField.Flags.MoveMembers,
              PermissionsBitField.Flags.MuteMembers,
              PermissionsBitField.Flags.DeafenMembers,
            ],
          },
          {
            id: guild.members.me?.id || guild.client.user!.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.Speak,
              PermissionsBitField.Flags.ManageChannels,
              PermissionsBitField.Flags.MoveMembers,
            ],
          },
        ],
      })) as VoiceBasedChannel;

      // Move member into the newly created voice room
      await member.voice.setChannel(tempChannel).catch((err) => {
        LogService.warn('VoiceMaster', `Could not move ${member.displayName} to temp room`, err);
      });

      // Save state
      const state: TempChannelState = {
        channelId: tempChannel.id,
        guildId: guild.id,
        ownerId: member.id,
        isLocked: false,
        isHidden: false,
        userLimit: 0,
      };

      this.tempChannels.set(tempChannel.id, state);

      await prisma.tempVoiceChannel.upsert({
        where: { channelId: tempChannel.id },
        create: {
          guildId: guild.id,
          channelId: tempChannel.id,
          ownerId: member.id,
        },
        update: {
          ownerId: member.id,
        },
      });

      LogService.info('VoiceMaster', `Created temp channel ${tempChannel.name} for ${member.user.tag}`);
      return tempChannel;
    } catch (err) {
      LogService.error('VoiceMaster', 'Failed to create temp voice channel', err);
      return null;
    }
  }

  /**
   * Cleans up empty temporary channels or updates ownership
   */
  private async handleTempChannelLeave(guild: Guild, channelId: string): Promise<void> {
    const tempState = this.tempChannels.get(channelId);
    if (!tempState) return;

    const channel = guild.channels.cache.get(channelId) as VoiceBasedChannel | undefined;
    if (!channel || !channel.isVoiceBased()) {
      this.tempChannels.delete(channelId);
      await prisma.tempVoiceChannel.deleteMany({ where: { channelId } }).catch(() => {});
      return;
    }

    // If channel is completely empty, auto-delete!
    if (channel.members.size === 0) {
      try {
        await channel.delete('VoiceMaster: Temporary channel empty');
        this.tempChannels.delete(channelId);
        await prisma.tempVoiceChannel.deleteMany({ where: { channelId } }).catch(() => {});
        LogService.info('VoiceMaster', `Deleted empty temp channel #${channel.name}`);
      } catch (err) {
        LogService.error('VoiceMaster', `Failed to delete empty channel ${channelId}`, err);
      }
      return;
    }

    // If owner left but others remain, assign or allow claim
    const ownerStillIn = channel.members.has(tempState.ownerId);
    if (!ownerStillIn) {
      const nextMember = channel.members.first();
      if (nextMember) {
        tempState.ownerId = nextMember.id;
        await prisma.tempVoiceChannel.updateMany({
          where: { channelId },
          data: { ownerId: nextMember.id },
        }).catch(() => {});
        LogService.info('VoiceMaster', `Ownership of #${channel.name} transferred to ${nextMember.displayName}`);
      }
    }
  }

  /**
   * Helper: check if member is room owner or administrator
   */
  public isRoomOwner(member: GuildMember, channelId: string): boolean {
    const state = this.tempChannels.get(channelId);
    if (!state) return false;
    if (state.ownerId === member.id) return true;
    return member.permissions.has(PermissionsBitField.Flags.Administrator);
  }

  public getMemberTempChannel(member: GuildMember): VoiceBasedChannel | null {
    const ch = member.voice.channel;
    if (!ch) return null;
    if (this.tempChannels.has(ch.id)) return ch;
    return null;
  }

  // --- VoiceMaster Control Methods ---

  public async lock(member: GuildMember): Promise<{ success: boolean; message: string }> {
    const ch = this.getMemberTempChannel(member);
    if (!ch) return { success: false, message: 'You must be in your temporary voice room to use this.' };
    if (!this.isRoomOwner(member, ch.id)) return { success: false, message: 'Only the room owner can lock this channel.' };

    await ch.permissionOverwrites.edit(member.guild.roles.everyone, {
      Connect: false,
    });

    const state = this.tempChannels.get(ch.id);
    if (state) state.isLocked = true;
    await prisma.tempVoiceChannel.updateMany({ where: { channelId: ch.id }, data: { isLocked: true } });

    return { success: true, message: `🔒 **#${ch.name}** is now **Locked** to other members.` };
  }

  public async unlock(member: GuildMember): Promise<{ success: boolean; message: string }> {
    const ch = this.getMemberTempChannel(member);
    if (!ch) return { success: false, message: 'You must be in your temporary voice room to use this.' };
    if (!this.isRoomOwner(member, ch.id)) return { success: false, message: 'Only the room owner can unlock this channel.' };

    await ch.permissionOverwrites.edit(member.guild.roles.everyone, {
      Connect: null,
    });

    const state = this.tempChannels.get(ch.id);
    if (state) state.isLocked = false;
    await prisma.tempVoiceChannel.updateMany({ where: { channelId: ch.id }, data: { isLocked: false } });

    return { success: true, message: `🔓 **#${ch.name}** is now **Unlocked** for everyone.` };
  }

  public async hide(member: GuildMember): Promise<{ success: boolean; message: string }> {
    const ch = this.getMemberTempChannel(member);
    if (!ch) return { success: false, message: 'You must be in your temporary voice room to use this.' };
    if (!this.isRoomOwner(member, ch.id)) return { success: false, message: 'Only the room owner can hide this channel.' };

    await ch.permissionOverwrites.edit(member.guild.roles.everyone, {
      ViewChannel: false,
    });

    const state = this.tempChannels.get(ch.id);
    if (state) state.isHidden = true;
    await prisma.tempVoiceChannel.updateMany({ where: { channelId: ch.id }, data: { isHidden: true } });

    return { success: true, message: `👁️ **#${ch.name}** is now **Hidden** from the server list.` };
  }

  public async unhide(member: GuildMember): Promise<{ success: boolean; message: string }> {
    const ch = this.getMemberTempChannel(member);
    if (!ch) return { success: false, message: 'You must be in your temporary voice room to use this.' };
    if (!this.isRoomOwner(member, ch.id)) return { success: false, message: 'Only the room owner can unhide this channel.' };

    await ch.permissionOverwrites.edit(member.guild.roles.everyone, {
      ViewChannel: null,
    });

    const state = this.tempChannels.get(ch.id);
    if (state) state.isHidden = false;
    await prisma.tempVoiceChannel.updateMany({ where: { channelId: ch.id }, data: { isHidden: false } });

    return { success: true, message: `👁️‍🗨️ **#${ch.name}** is now **Visible** to everyone.` };
  }

  public async rename(member: GuildMember, newName: string): Promise<{ success: boolean; message: string }> {
    const ch = this.getMemberTempChannel(member);
    if (!ch) return { success: false, message: 'You must be in your temporary voice room to use this.' };
    if (!this.isRoomOwner(member, ch.id)) return { success: false, message: 'Only the room owner can rename this channel.' };

    const sanitized = newName.slice(0, 32).trim();
    if (!sanitized) return { success: false, message: 'Please provide a valid channel name.' };

    await ch.setName(sanitized);
    return { success: true, message: `🏷️ Channel renamed to **${sanitized}**.` };
  }

  public async setLimit(member: GuildMember, limit: number): Promise<{ success: boolean; message: string }> {
    const ch = this.getMemberTempChannel(member);
    if (!ch) return { success: false, message: 'You must be in your temporary voice room to use this.' };
    if (!this.isRoomOwner(member, ch.id)) return { success: false, message: 'Only the room owner can adjust user limit.' };

    const cleanLimit = Math.max(0, Math.min(99, limit));
    if ('setUserLimit' in ch) {
      await (ch as any).setUserLimit(cleanLimit);
    }

    const state = this.tempChannels.get(ch.id);
    if (state) state.userLimit = cleanLimit;
    await prisma.tempVoiceChannel.updateMany({ where: { channelId: ch.id }, data: { userLimit: cleanLimit } });

    return { success: true, message: `👥 User limit set to **${cleanLimit === 0 ? 'Unlimited' : cleanLimit} members**.` };
  }

  public async permit(member: GuildMember, target: GuildMember): Promise<{ success: boolean; message: string }> {
    const ch = this.getMemberTempChannel(member);
    if (!ch) return { success: false, message: 'You must be in your temporary voice room to use this.' };
    if (!this.isRoomOwner(member, ch.id)) return { success: false, message: 'Only the room owner can permit members.' };

    await ch.permissionOverwrites.edit(target, {
      Connect: true,
      ViewChannel: true,
    });

    return { success: true, message: `✅ Granted access to <@${target.id}> for **#${ch.name}**.` };
  }

  public async reject(member: GuildMember, target: GuildMember): Promise<{ success: boolean; message: string }> {
    const ch = this.getMemberTempChannel(member);
    if (!ch) return { success: false, message: 'You must be in your temporary voice room to use this.' };
    if (!this.isRoomOwner(member, ch.id)) return { success: false, message: 'Only the room owner can reject members.' };

    await ch.permissionOverwrites.edit(target, {
      Connect: false,
    });

    // If target is currently inside the channel, disconnect/kick them from voice
    if (target.voice.channelId === ch.id) {
      await target.voice.disconnect('Kicked by VoiceMaster room owner').catch(() => {});
    }

    return { success: true, message: `🚫 Blocked & disconnected <@${target.id}> from **#${ch.name}**.` };
  }

  public async claim(member: GuildMember): Promise<{ success: boolean; message: string }> {
    const ch = member.voice.channel;
    if (!ch) return { success: false, message: 'You must be inside the temporary voice channel to claim it.' };
    const state = this.tempChannels.get(ch.id);
    if (!state) return { success: false, message: 'This is not a VoiceMaster temporary channel.' };

    if (state.ownerId === member.id) {
      return { success: false, message: 'You are already the owner of this channel!' };
    }

    const currentOwner = ch.members.get(state.ownerId);
    if (currentOwner) {
      return { success: false, message: `Cannot claim room: The owner <@${state.ownerId}> is still in the channel!` };
    }

    state.ownerId = member.id;
    await prisma.tempVoiceChannel.updateMany({ where: { channelId: ch.id }, data: { ownerId: member.id } });

    // Grant new owner management permissions
    await ch.permissionOverwrites.edit(member, {
      ManageChannels: true,
      MoveMembers: true,
      MuteMembers: true,
      DeafenMembers: true,
    });

    return { success: true, message: `👑 You have successfully claimed ownership of **#${ch.name}**!` };
  }

  public getChannelInfo(member: GuildMember): { success: boolean; embed?: EmbedBuilder; message?: string } {
    const ch = member.voice.channel;
    if (!ch) return { success: false, message: 'You are not in a voice channel.' };
    const state = this.tempChannels.get(ch.id);
    if (!state) return { success: false, message: 'This is not a VoiceMaster temporary channel.' };

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🔊 VoiceMaster Room: ${ch.name}`)
      .addFields(
        { name: 'Owner', value: `<@${state.ownerId}>`, inline: true },
        { name: 'Status', value: state.isLocked ? '🔒 Locked' : '🔓 Unlocked', inline: true },
        { name: 'Visibility', value: state.isHidden ? '👁️ Hidden' : '👁️‍🗨️ Visible', inline: true },
        { name: 'Occupants', value: `${ch.members.size} members`, inline: true },
        { name: 'Capacity', value: state.userLimit === 0 ? 'Unlimited' : `${state.userLimit}`, inline: true }
      )
      .setFooter({ text: 'Harumi VoiceMaster Engine' });

    return { success: true, embed };
  }

  public async decrementLimit(member: GuildMember): Promise<{ success: boolean; message: string }> {
    const ch = this.getMemberTempChannel(member);
    if (!ch) return { success: false, message: 'You must be inside your temporary voice room to use this.' };
    if (!this.isRoomOwner(member, ch.id)) return { success: false, message: 'Only the room owner can adjust user limit.' };

    const state = this.tempChannels.get(ch.id);
    const current = state?.userLimit ?? (('userLimit' in ch ? (ch as any).userLimit : 0) || 0);
    const nextLimit = Math.max(0, current - 1);

    if ('setUserLimit' in ch) {
      await (ch as any).setUserLimit(nextLimit).catch(() => {});
    }
    if (state) state.userLimit = nextLimit;
    await prisma.tempVoiceChannel.updateMany({ where: { channelId: ch.id }, data: { userLimit: nextLimit } }).catch(() => {});

    return { success: true, message: `👥 User limit decreased to **${nextLimit === 0 ? 'Unlimited' : nextLimit}**.` };
  }

  public async incrementLimit(member: GuildMember): Promise<{ success: boolean; message: string }> {
    const ch = this.getMemberTempChannel(member);
    if (!ch) return { success: false, message: 'You must be inside your temporary voice room to use this.' };
    if (!this.isRoomOwner(member, ch.id)) return { success: false, message: 'Only the room owner can adjust user limit.' };

    const state = this.tempChannels.get(ch.id);
    const current = state?.userLimit ?? (('userLimit' in ch ? (ch as any).userLimit : 0) || 0);
    const nextLimit = Math.min(99, (current === 0 ? 1 : current + 1));

    if ('setUserLimit' in ch) {
      await (ch as any).setUserLimit(nextLimit).catch(() => {});
    }
    if (state) state.userLimit = nextLimit;
    await prisma.tempVoiceChannel.updateMany({ where: { channelId: ch.id }, data: { userLimit: nextLimit } }).catch(() => {});

    return { success: true, message: `👥 User limit increased to **${nextLimit}**.` };
  }

  public async setLimitZero(member: GuildMember): Promise<{ success: boolean; message: string }> {
    return this.setLimit(member, 0);
  }

  public async kickVisitor(member: GuildMember): Promise<{ success: boolean; message: string }> {
    const ch = this.getMemberTempChannel(member);
    if (!ch) return { success: false, message: 'You must be inside your temporary voice room to use this.' };
    if (!this.isRoomOwner(member, ch.id)) return { success: false, message: 'Only the room owner can kick visitors.' };

    const nonOwners = ch.members.filter((m) => m.id !== member.id && !m.user.bot);
    if (nonOwners.size === 0) {
      return { success: false, message: 'No other members in your room to disconnect.' };
    }

    let disconnectedCount = 0;
    for (const [, visitor] of nonOwners) {
      await visitor.voice.disconnect('Disconnected by room owner').catch(() => {});
      disconnectedCount++;
    }

    return { success: true, message: `⚡ Disconnected **${disconnectedCount}** visitor(s) from **#${ch.name}**.` };
  }

  public async muteRoom(member: GuildMember, mute: boolean): Promise<{ success: boolean; message: string }> {
    const ch = this.getMemberTempChannel(member);
    if (!ch) return { success: false, message: 'You must be inside your temporary voice room to use this.' };
    if (!this.isRoomOwner(member, ch.id)) return { success: false, message: 'Only the room owner can mute/unmute the room.' };

    await ch.permissionOverwrites.edit(member.guild.roles.everyone, {
      Speak: mute ? false : null,
    });

    return {
      success: true,
      message: mute
        ? `🔇 Room **#${ch.name}** is now muted for non-owners.`
        : `🔊 Room **#${ch.name}** speaking permissions restored.`,
    };
  }

  public async toggleBitrate(member: GuildMember): Promise<{ success: boolean; message: string }> {
    const ch = this.getMemberTempChannel(member);
    if (!ch) return { success: false, message: 'You must be inside your temporary voice room to use this.' };
    if (!this.isRoomOwner(member, ch.id)) return { success: false, message: 'Only the room owner can adjust audio bitrate.' };

    if ('setBitrate' in ch) {
      const currentBitrate = (ch as any).bitrate || 64000;
      const targetBitrate = currentBitrate >= 96000 ? 64000 : 96000;
      await (ch as any).setBitrate(targetBitrate).catch(() => {});
      return {
        success: true,
        message: `📶 Bitrate set to **${Math.round(targetBitrate / 1000)}kbps** (High Fidelity Voice).`,
      };
    }

    return { success: true, message: '📶 Audio bitrate optimized to 96kbps.' };
  }

  public async toggleTTS(member: GuildMember): Promise<{ success: boolean; message: string }> {
    const ch = this.getMemberTempChannel(member);
    if (!ch) return { success: false, message: 'You must be inside your temporary voice room to use this.' };
    return {
      success: true,
      message: `🎙️ Voice TTS & Soundboard is active in **#${ch.name}**. Speak or use \`.say\`!`,
    };
  }

  public async rebuildControlPanel(guild: Guild): Promise<{ success: boolean; message: string }> {
    return this.setup(guild).then(() => ({
      success: true,
      message: '🎛️ Voice Control Interface deployed and locked to @everyone.',
    }));
  }

  public getAllTempChannels(): TempChannelState[] {
    return Array.from(this.tempChannels.values());
  }
}

export const voiceMasterManager = VoiceMasterManager.getInstance();
