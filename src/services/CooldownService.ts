export class CooldownService {
  private static instance: CooldownService;
  // Key format: `${type}:${guildId}:${userId}:${commandName}`
  private cooldowns = new Map<string, number>();

  private constructor() {
    // Periodic sweep of expired cooldowns every 60 seconds
    setInterval(() => this.sweep(), 60000).unref();
  }

  public static getInstance(): CooldownService {
    if (!CooldownService.instance) {
      CooldownService.instance = new CooldownService();
    }
    return CooldownService.instance;
  }

  /**
   * Check if an action is cooling down.
   * Returns remaining seconds if on cooldown, or 0 if allowed.
   */
  public getRemaining(type: 'user' | 'guild' | 'command' | 'ai' | 'voice', guildId: string, userId: string, commandName = ''): number {
    const key = `${type}:${guildId}:${userId}:${commandName}`;
    const expiresAt = this.cooldowns.get(key);
    if (!expiresAt) return 0;

    const now = Date.now();
    if (now >= expiresAt) {
      this.cooldowns.delete(key);
      return 0;
    }

    return Math.ceil((expiresAt - now) / 1000);
  }

  /**
   * Sets a cooldown for duration in seconds.
   */
  public set(type: 'user' | 'guild' | 'command' | 'ai' | 'voice', guildId: string, userId: string, durationSeconds: number, commandName = ''): void {
    if (durationSeconds <= 0) return;
    const key = `${type}:${guildId}:${userId}:${commandName}`;
    this.cooldowns.set(key, Date.now() + durationSeconds * 1000);
  }

  /**
   * Clears a cooldown
   */
  public clear(type: 'user' | 'guild' | 'command' | 'ai' | 'voice', guildId: string, userId: string, commandName = ''): void {
    const key = `${type}:${guildId}:${userId}:${commandName}`;
    this.cooldowns.delete(key);
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, expiresAt] of this.cooldowns.entries()) {
      if (now >= expiresAt) {
        this.cooldowns.delete(key);
      }
    }
  }
}

export const cooldownService = CooldownService.getInstance();
