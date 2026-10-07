import {
  GuildMember,
  PermissionsBitField,
  PermissionResolvable,
  ChatInputCommandInteraction,
  Message,
} from 'discord.js';

export class PermissionService {
  /**
   * Checks if a member possesses specific Discord permission bits.
   * NEVER uses hardcoded developer or owner IDs. Uses purely Discord's native hierarchy.
   */
  public static hasPermission(
    member: GuildMember | null | undefined,
    permission: PermissionResolvable
  ): boolean {
    if (!member) return false;
    // Native Discord Administrator check
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return true;
    }
    return member.permissions.has(permission);
  }

  /**
   * Checks if member has Admin authority (Administrator or ManageGuild)
   */
  public static requireAdmin(member: GuildMember | null | undefined): boolean {
    if (!member) return false;
    return (
      member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    );
  }

  /**
   * Checks if member has Moderator authority (ModerateMembers, KickMembers, BanMembers, or ManageMessages)
   */
  public static requireModerator(member: GuildMember | null | undefined): boolean {
    if (!member) return false;
    return (
      member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
      member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
      member.permissions.has(PermissionsBitField.Flags.KickMembers) ||
      member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
      member.permissions.has(PermissionsBitField.Flags.ManageMessages)
    );
  }

  /**
   * Checks if member has voice management permissions
   */
  public static requireVoicePermission(member: GuildMember | null | undefined): boolean {
    if (!member) return false;
    return (
      member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
      member.permissions.has(PermissionsBitField.Flags.MoveMembers) ||
      member.permissions.has(PermissionsBitField.Flags.MuteMembers)
    );
  }

  /**
   * Validates command invocation from either Message or Interaction
   */
  public static validatePermissions(
    target: Message | ChatInputCommandInteraction,
    permission: PermissionResolvable | 'ADMIN' | 'MOD' | 'VOICE'
  ): { allowed: boolean; message?: string } {
    const member = target.member as GuildMember | null;
    if (!member) {
      return { allowed: false, message: 'This command can only be executed in a server.' };
    }

    if (permission === 'ADMIN') {
      if (!this.requireAdmin(member)) {
        return {
          allowed: false,
          message: 'You need the **Administrator** or **Manage Server** permission to use this command.',
        };
      }
      return { allowed: true };
    }

    if (permission === 'MOD') {
      if (!this.requireModerator(member)) {
        return {
          allowed: false,
          message: 'You need moderator permissions (Moderate Members, Manage Messages, Kick/Ban) to use this command.',
        };
      }
      return { allowed: true };
    }

    if (permission === 'VOICE') {
      if (!this.requireVoicePermission(member)) {
        return {
          allowed: false,
          message: 'You need Voice Management or Manage Channels permissions to use this command.',
        };
      }
      return { allowed: true };
    }

    if (!this.hasPermission(member, permission)) {
      return {
        allowed: false,
        message: `You are missing the required permission: **${String(permission)}**`,
      };
    }

    return { allowed: true };
  }
}
