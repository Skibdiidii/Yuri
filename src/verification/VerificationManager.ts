import {
  Guild,
  GuildMember,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Role,
  PermissionsBitField,
  ChannelType,
} from 'discord.js';
import { prisma, getOrCreateGuildSettings } from '../database/db';
import { LogService } from '../services/LogService';

export class VerificationManager {
  private static instance: VerificationManager;

  private constructor() {}

  public static getInstance(): VerificationManager {
    if (!VerificationManager.instance) {
      VerificationManager.instance = new VerificationManager();
    }
    return VerificationManager.instance;
  }

  /**
   * Finds or automatically creates the "Member" verification role in the guild.
   */
  public async ensureMemberRole(guild: Guild): Promise<Role | null> {
    try {
      const settings = await prisma.guildSettings.findUnique({
        where: { guildId: guild.id },
      });

      // 1. Check if configured verified role already exists
      if (settings?.verifiedRoleId) {
        const existing = guild.roles.cache.get(settings.verifiedRoleId);
        if (existing) return existing;
      }

      // 2. Look for an existing role named "Member", "Verified", or "Members"
      const found = guild.roles.cache.find(
        (r) =>
          !r.managed &&
          (r.name.toLowerCase() === 'member' ||
            r.name.toLowerCase() === 'verified' ||
            r.name.toLowerCase() === 'members')
      );
      if (found) {
        await prisma.guildSettings.upsert({
          where: { guildId: guild.id },
          create: {
            guildId: guild.id,
            verifiedRoleId: found.id,
            verificationEnabled: true,
          },
          update: {
            verifiedRoleId: found.id,
            verificationEnabled: true,
          },
        });
        return found;
      }

      // 3. Automatically create the "Member" role with proper permissions
      const botMember = guild.members.me;
      const botHighestRole = botMember?.roles.highest;
      const position = botHighestRole ? Math.max(1, botHighestRole.position - 1) : 1;

      const createdRole = await guild.roles.create({
        name: 'Member',
        color: 0x5865f2,
        hoist: true,
        mentionable: false,
        position,
        permissions: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AddReactions,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks,
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.Speak,
          PermissionsBitField.Flags.UseVAD,
        ],
        reason: 'Harumi Auto-Setup: Verification & Welcome Member Role',
      });

      await prisma.guildSettings.upsert({
        where: { guildId: guild.id },
        create: {
          guildId: guild.id,
          verifiedRoleId: createdRole.id,
          verificationEnabled: true,
        },
        update: {
          verifiedRoleId: createdRole.id,
          verificationEnabled: true,
        },
      });

      LogService.info('VerificationManager', `Created 'Member' role (${createdRole.id}) in ${guild.name}`);
      return createdRole;
    } catch (err) {
      LogService.error('VerificationManager', `Failed ensuring Member role in ${guild.name}`, err);
      return null;
    }
  }

  /**
   * Adjusts welcome setup and executes full server lockdown:
   * - Ensures "Member" role exists (automatically creates if not found)
   * - Locks all existing server channels for @everyone (ViewChannel: false, SendMessages: false)
   * - Unlocks all server channels for the "Member" role
   * - Configures Welcome Voice and Text channels so @everyone can join/see to get verified 24/7
   */
  public async lockdownChannelsForVerification(
    guild: Guild,
    options?: { welcomeVoiceChannelId?: string; welcomeTextChannelId?: string }
  ): Promise<{
    success: boolean;
    lockedCount: number;
    memberRole: Role | null;
    welcomeVoiceChannelId?: string;
    welcomeTextChannelId?: string;
    message: string;
  }> {
    try {
      const memberRole = await this.ensureMemberRole(guild);
      if (!memberRole) {
        return {
          success: false,
          lockedCount: 0,
          memberRole: null,
          message: 'Failed to find or create the Member role.',
        };
      }

      // Fetch or ensure welcome channels
      const { voiceWelcomeManager } = await import('../voice/VoiceWelcomeManager');
      const ensured = await voiceWelcomeManager.ensureWelcomeChannels(guild);

      const voiceChannelId = options?.welcomeVoiceChannelId || ensured.voiceChannel?.id;
      const textChannelId = options?.welcomeTextChannelId || ensured.textChannel?.id;

      let lockedCount = 0;
      const everyoneRole = guild.roles.everyone;

      // Iterate through all guild channels to apply lockdown
      for (const [, channel] of guild.channels.cache) {
        if (!channel || !('permissionOverwrites' in channel) || !channel.permissionOverwrites) continue;

        try {
          const isWelcomeVoice = voiceChannelId && channel.id === voiceChannelId;
          const isWelcomeText = textChannelId && channel.id === textChannelId;

          if (isWelcomeVoice) {
            // Welcome voice channel: @everyone can view & connect to hear the TTS
            await channel.permissionOverwrites.edit(everyoneRole, {
              ViewChannel: true,
              Connect: true,
              Speak: true,
            });
            await channel.permissionOverwrites.edit(memberRole, {
              ViewChannel: true,
              Connect: true,
              Speak: true,
            });
          } else if (isWelcomeText) {
            // Welcome text channel: @everyone can view and read instructions
            await channel.permissionOverwrites.edit(everyoneRole, {
              ViewChannel: true,
              SendMessages: false,
              ReadMessageHistory: true,
            });
            await channel.permissionOverwrites.edit(memberRole, {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true,
            });
          } else {
            // All other channels: Lock for @everyone, grant access to Member role
            await channel.permissionOverwrites.edit(everyoneRole, {
              ViewChannel: false,
              SendMessages: false,
              Connect: false,
            });
            await channel.permissionOverwrites.edit(memberRole, {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true,
              Connect: true,
              Speak: true,
            });
            lockedCount++;
          }
        } catch (chErr) {
          LogService.warn('VerificationManager', `Could not update overwrites for channel ${channel.name}`, chErr);
        }
      }

      // Update guild settings in database
      await prisma.guildSettings.upsert({
        where: { guildId: guild.id },
        create: {
          guildId: guild.id,
          verificationEnabled: true,
          verifiedRoleId: memberRole.id,
        },
        update: {
          verificationEnabled: true,
          verifiedRoleId: memberRole.id,
        },
      });

      LogService.recordGuildLog(
        guild.id,
        'CONFIG',
        'LOCKDOWN_SETUP',
        `Welcome lockdown completed: ${lockedCount} channels locked for @everyone, verified role: ${memberRole.name}`
      );

      return {
        success: true,
        lockedCount,
        memberRole,
        welcomeVoiceChannelId: voiceChannelId,
        welcomeTextChannelId: textChannelId,
        message: `Locked ${lockedCount} channels. Created/assigned '${memberRole.name}' role. Welcome voice & text channels configured!`,
      };
    } catch (err: any) {
      LogService.error('VerificationManager', `Lockdown setup error in ${guild.name}`, err);
      return {
        success: false,
        lockedCount: 0,
        memberRole: null,
        message: `Error during server lockdown: ${err?.message || err}`,
      };
    }
  }

  /**
   * Automatically verifies a member upon finishing the voice welcome TTS audio announcement.
   * Gives them the Member role 24/7 and unlocks the whole server.
   */
  public async verifyMemberOnTTSComplete(
    guild: Guild,
    userId: string
  ): Promise<{ success: boolean; message: string; roleName?: string }> {
    try {
      if (!userId) return { success: false, message: 'No user ID provided.' };

      let member: GuildMember | null = null;
      try {
        member = guild.members.cache.get(userId) || (await guild.members.fetch(userId));
      } catch {
        member = null;
      }

      if (!member || member.user.bot) {
        return { success: false, message: 'Member not found or is a bot.' };
      }

      const role = await this.ensureMemberRole(guild);
      if (!role) {
        return { success: false, message: 'Could not resolve Member verification role.' };
      }

      // Check if already has the role
      if (member.roles.cache.has(role.id)) {
        return { success: true, message: 'Member already has verification role.', roleName: role.name };
      }

      // Add the Member role
      await member.roles.add(role, 'Harumi 24/7 Voice Welcome TTS Verification Completed');

      // Remove unverified role if present
      const settings = await prisma.guildSettings.findUnique({ where: { guildId: guild.id } });
      if (settings?.unverifiedRoleId && member.roles.cache.has(settings.unverifiedRoleId)) {
        await member.roles.remove(settings.unverifiedRoleId).catch(() => {});
      }

      LogService.info('VerificationManager', `Auto-verified member ${member.user.tag} after voice TTS playback!`);

      // Post celebration in text welcome channel
      const voiceSettings = await prisma.voiceWelcomeSettings.findUnique({ where: { guildId: guild.id } });
      const textChannelId = voiceSettings?.welcomeChannelId || settings?.starboardChannelId;
      if (textChannelId) {
        const ch = guild.channels.cache.get(textChannelId);
        if (ch && ch.isTextBased() && 'send' in ch) {
          const embed = new EmbedBuilder()
            .setColor(0x10b981)
            .setTitle('🎉 Member Verified!')
            .setDescription(
              `**<@${member.id}>** has finished hearing the voice welcome announcement and is now **Verified** with the **${role.name}** role!\nAll server channels are now unlocked for them 24/7.`
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ text: 'Harumi 24/7 Voice Welcome & Auto-Verification Gateway' })
            .setTimestamp();

          (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
        }
      }

      await LogService.recordGuildLog(
        guild.id,
        'MEMBER',
        'VERIFY_TTS',
        `Member ${member.user.tag} automatically verified upon completing voice welcome TTS`,
        undefined,
        member.id
      );

      return {
        success: true,
        message: `Member ${member.displayName} was granted the '${role.name}' role 24/7!`,
        roleName: role.name,
      };
    } catch (err: any) {
      LogService.error('VerificationManager', `Error auto-verifying user ${userId} on TTS complete`, err);
      return { success: false, message: `Failed to verify: ${err?.message || err}` };
    }
  }

  /**
   * Posts interactive verification gate message
   */
  public async postVerificationPanel(
    channel: TextChannel,
    title = '🛡️ Server Member Verification',
    description = 'Welcome to the server! Listen to the welcome voice announcement in 🔊 **welcome-voice** or click below to verify your account and gain full server access.'
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle(title)
      .setDescription(description)
      .addFields(
        { name: '🔊 24/7 Voice Welcome Gate', value: 'Join 🔊 **welcome-voice** to hear the personalized TTS greeting and automatically get verified.', inline: false },
        { name: '🔒 Security', value: 'Channels are locked until verification is completed.', inline: false }
      )
      .setFooter({ text: 'Harumi Security & 24/7 Voice Verification Gateway' });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('harumi_verify_btn')
        .setLabel('Verify Account')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );

    await channel.send({ embeds: [embed], components: [row] });
  }

  /**
   * Handles verification click
   */
  public async handleVerify(member: GuildMember): Promise<{ success: boolean; message: string }> {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: member.guild.id },
    });

    // Account age check
    if (settings && settings.minAccountAgeDays > 0) {
      const ageDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
      if (ageDays < settings.minAccountAgeDays) {
        return {
          success: false,
          message: `Your Discord account must be at least ${settings.minAccountAgeDays} days old to verify on this server (currently ${Math.floor(ageDays)}d).`,
        };
      }
    }

    try {
      const role = await this.ensureMemberRole(member.guild);
      if (!role) {
        return { success: false, message: 'Could not find or create the Member role.' };
      }

      await member.roles.add(role);
      if (settings?.unverifiedRoleId) {
        await member.roles.remove(settings.unverifiedRoleId).catch(() => {});
      }

      LogService.recordGuildLog(
        member.guild.id,
        'MEMBER',
        'VERIFY',
        `Member ${member.user.tag} completed verification.`,
        undefined,
        member.id
      );

      return { success: true, message: `✅ You have been verified and given the **${role.name}** role! Welcome to the server!` };
    } catch (err) {
      LogService.error('VerificationManager', 'Error assigning verification roles', err);
      return { success: false, message: 'Failed to assign role. Ensure the bot role is positioned above the Member role in Server Settings -> Roles.' };
    }
  }
}

export const verificationManager = VerificationManager.getInstance();
