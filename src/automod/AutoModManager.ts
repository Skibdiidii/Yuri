import { Message, GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { prisma } from '../database/db';
import { LogService } from '../services/LogService';

export interface AutoModViolation {
  rule: string;
  reason: string;
  action: 'DELETE' | 'TIMEOUT' | 'WARN';
}

export class AutoModManager {
  private static instance: AutoModManager;
  // Per-guild/user message rate cache
  private userMessageHistory = new Map<string, { content: string; timestamp: number }[]>();

  private constructor() {
    setInterval(() => this.cleanHistory(), 60000).unref();
  }

  public static getInstance(): AutoModManager {
    if (!AutoModManager.instance) {
      AutoModManager.instance = new AutoModManager();
    }
    return AutoModManager.instance;
  }

  private cleanHistory(): void {
    const now = Date.now();
    for (const [key, history] of this.userMessageHistory.entries()) {
      const filtered = history.filter((h) => now - h.timestamp < 15000);
      if (filtered.length === 0) {
        this.userMessageHistory.delete(key);
      } else {
        this.userMessageHistory.set(key, filtered);
      }
    }
  }

  /**
   * Evaluates message against active AutoMod rules
   */
  public async inspectMessage(message: Message): Promise<AutoModViolation | null> {
    if (!message.guild || message.author.bot || !message.member) return null;

    // Ignore administrators and members with ManageMessages
    if (message.member.permissions.has('Administrator') || message.member.permissions.has('ManageMessages')) {
      return null;
    }

    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: message.guild.id },
    });

    if (!settings || !settings.automodEnabled) return null;

    const content = message.content;
    const userId = message.author.id;
    const guildId = message.guild.id;
    const trackingKey = `${guildId}:${userId}`;

    // 1. Account Age Protection
    if (settings.minAccountAgeDays > 0) {
      const accountAgeDays = (Date.now() - message.author.createdTimestamp) / (1000 * 60 * 60 * 24);
      if (accountAgeDays < settings.minAccountAgeDays) {
        return {
          rule: 'Account Age Protection',
          reason: `Account created less than ${settings.minAccountAgeDays} days ago (${Math.floor(accountAgeDays)}d)`,
          action: 'DELETE',
        };
      }
    }

    // 2. Anti-Invite
    if (settings.antiInvite) {
      const discordInviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/i;
      if (discordInviteRegex.test(content)) {
        return {
          rule: 'Anti-Invite',
          reason: 'Posting external Discord invite links is prohibited.',
          action: 'DELETE',
        };
      }
    }

    // 3. Anti-Link
    if (settings.antiLink) {
      const linkRegex = /https?:\/\/[^\s]+/i;
      if (linkRegex.test(content)) {
        return {
          rule: 'Anti-Link',
          reason: 'Unapproved URLs are not permitted in this channel.',
          action: 'DELETE',
        };
      }
    }

    // 4. Anti-Mention Spam (> 4 mentions)
    if (settings.antiMention) {
      const mentionsCount = message.mentions.users.size + message.mentions.roles.size;
      if (mentionsCount >= 4) {
        return {
          rule: 'Anti-Mention Spam',
          reason: `Mentioned ${mentionsCount} users/roles simultaneously.`,
          action: 'TIMEOUT',
        };
      }
    }

    // 5. Anti-Caps (> 70% uppercase on long messages)
    if (settings.antiCaps && content.length >= 15) {
      const letters = content.replace(/[^a-zA-Z]/g, '');
      if (letters.length >= 10) {
        const uppercase = letters.replace(/[^A-Z]/g, '').length;
        if (uppercase / letters.length >= 0.75) {
          return {
            rule: 'Anti-Caps',
            reason: 'Excessive uppercase / screaming text.',
            action: 'DELETE',
          };
        }
      }
    }

    // 6. Bad Words Filtering
    if (settings.badWords) {
      const badWordsList = settings.badWords.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
      const lowerContent = content.toLowerCase();
      for (const word of badWordsList) {
        if (lowerContent.includes(word)) {
          return {
            rule: 'Bad-Word Filtering',
            reason: 'Message contains prohibited terminology.',
            action: 'DELETE',
          };
        }
      }
    }

    // Message History for Spam & Flooding
    if (!this.userMessageHistory.has(trackingKey)) {
      this.userMessageHistory.set(trackingKey, []);
    }
    const history = this.userMessageHistory.get(trackingKey)!;
    history.push({ content, timestamp: Date.now() });

    // 7. Anti-Spam & Flood (> 5 messages in 4 seconds)
    if (settings.antiSpam || settings.antiFlood) {
      const recent = history.filter((h) => Date.now() - h.timestamp < 4000);
      if (recent.length >= 5) {
        return {
          rule: 'Anti-Spam / Anti-Flood',
          reason: 'Sent 5+ messages in under 4 seconds.',
          action: 'TIMEOUT',
        };
      }
    }

    // 8. Duplicate Message Detection (same text sent 3 times in a row)
    if (settings.duplicateDetection && history.length >= 3) {
      const lastThree = history.slice(-3);
      if (lastThree[0].content === content && lastThree[1].content === content && lastThree[2].content === content) {
        return {
          rule: 'Duplicate Message Detection',
          reason: 'Repeated identical messages.',
          action: 'DELETE',
        };
      }
    }

    return null;
  }

  /**
   * Executes violation actions and alerts moderators
   */
  public async handleViolation(message: Message, violation: AutoModViolation): Promise<void> {
    try {
      if (violation.action === 'DELETE') {
        await message.delete().catch(() => {});
      }

      if (violation.action === 'TIMEOUT' && message.member) {
        await message.delete().catch(() => {});
        // 5 minute automatic timeout
        await message.member.timeout(5 * 60 * 1000, `AutoMod: ${violation.rule}`).catch(() => {});
      }

      // Notify user in channel briefly
      let alert = null;
      if (message.channel.isTextBased() && 'send' in message.channel) {
        alert = await (message.channel as TextChannel).send(
          `🛡️ <@${message.author.id}>, your message was intercepted by AutoMod (**${violation.rule}**).`
        ).catch(() => null);
      }

      if (alert) {
        setTimeout(() => alert.delete().catch(() => {}), 5000);
      }

      // Moderator Alert Channel
      const settings = await prisma.guildSettings.findUnique({
        where: { guildId: message.guild!.id },
      });

      if (settings?.modLogChannelId) {
        const channel = message.guild!.channels.cache.get(settings.modLogChannelId) as TextChannel | undefined;
        if (channel && channel.isTextBased()) {
          const embed = new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle('🚨 AutoMod Triggered')
            .addFields(
              { name: 'User', value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
              { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
              { name: 'Rule', value: violation.rule, inline: true },
              { name: 'Reason', value: violation.reason, inline: false },
              { name: 'Content Sample', value: `\`${message.content.slice(0, 200)}\``, inline: false }
            )
            .setTimestamp();

          channel.send({ embeds: [embed] }).catch(() => {});
        }
      }

      LogService.recordGuildLog(
        message.guild!.id,
        'AUTOMOD',
        violation.rule,
        violation.reason,
        undefined,
        message.author.id
      );
    } catch (err) {
      LogService.error('AutoModManager', 'Error handling AutoMod violation', err);
    }
  }
}

export const autoModManager = AutoModManager.getInstance();
