import { EmbedBuilder } from 'discord.js';

export class ErrorService {
  /**
   * Sanitizes any text to strictly prevent leakage of tokens, credentials, or file paths
   */
  public static sanitize(text: string): string {
    if (!text) return '';
    const secretKey = 'B4uCaEJo9ZCuZo5Am6BpAwt30lP86WMu';
    return text
      .replace(new RegExp(secretKey, 'gi'), '[REDACTED_CREDENTIAL]')
      .replace(/([a-zA-Z0-9_-]{24}\.[a-zA-Z0-9_-]{6}\.[a-zA-Z0-9_-]{27})/g, '[REDACTED_TOKEN]')
      .replace(/\/[a-zA-Z0-9_./-]+\.(ts|js|json|prisma|db)/g, '[internal path]');
  }

  /**
   * Builds a polished, user-friendly Discord error embed
   */
  public static createErrorEmbed(title: string, description: string): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0xef4444) // Bright red
      .setTitle(`✕  ${this.sanitize(title)}`)
      .setDescription(this.sanitize(description))
      .setFooter({ text: 'Harumi Safety & Error Protection' })
      .setTimestamp();
  }

  /**
   * Formats a standard rate-limit error
   */
  public static createRateLimitEmbed(secondsRemaining: number, actionName = 'command'): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0xf59e0b) // Amber
      .setTitle('⏱  Rate Limit Exceeded')
      .setDescription(
        `Please wait **${secondsRemaining}s** before using this ${actionName} again. This prevents spam and protects server resources.`
      )
      .setFooter({ text: 'Harumi Cooldown Engine' });
  }
}
