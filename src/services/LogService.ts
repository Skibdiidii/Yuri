import { prisma } from '../database/db';
import { ErrorService } from './ErrorService';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class LogService {
  private static formatMessage(level: LogLevel, context: string, message: string): string {
    const timestamp = new Date().toISOString();
    const cleanMsg = ErrorService.sanitize(message);
    return `[${timestamp}] [${level}] [${context}]: ${cleanMsg}`;
  }

  public static info(context: string, message: string, meta?: unknown): void {
    console.log(this.formatMessage(LogLevel.INFO, context, message), meta || '');
  }

  public static warn(context: string, message: string, meta?: unknown): void {
    console.warn(this.formatMessage(LogLevel.WARN, context, message), meta || '');
  }

  public static error(context: string, message: string, error?: unknown): void {
    console.error(this.formatMessage(LogLevel.ERROR, context, message), error ? ErrorService.sanitize(String(error)) : '');
  }

  public static debug(context: string, message: string, meta?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage(LogLevel.DEBUG, context, message), meta || '');
    }
  }

  /**
   * Records an audit event to the database for guild-level audit logs
   */
  public static async recordGuildLog(
    guildId: string,
    category: 'MOD' | 'MEMBER' | 'VOICE' | 'ROLE' | 'CHANNEL' | 'MESSAGE' | 'CONFIG' | 'AUTOMOD',
    action: string,
    details: string,
    executorId?: string,
    targetId?: string
  ): Promise<void> {
    try {
      await prisma.logs.create({
        data: {
          guildId,
          category,
          action,
          details: ErrorService.sanitize(details),
          executorId,
          targetId,
        },
      });
    } catch (err) {
      console.error('[LogService] Failed to persist guild audit log:', err);
    }
  }
}
