import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, VoiceConnection } from '@discordjs/voice';
import { LogService } from '../services/LogService';
import { TTSAudioService } from '../services/TTSAudioService';

export interface TTSMessage {
  id: string;
  guildId: string;
  text: string;
  volume: number;
  userId?: string;
  timestamp: number;
  retries: number;
  onComplete?: (guildId: string, userId?: string) => Promise<void> | void;
}

export class TTSQueue {
  private static instance: TTSQueue;
  // Queue per guild to prevent overlapping audio
  private queues = new Map<string, TTSMessage[]>();
  private players = new Map<string, AudioPlayer>();
  private isPlaying = new Map<string, boolean>();
  private lastAnnouncedMember = new Map<string, { userId: string; timestamp: number }>();

  private constructor() {}

  public static getInstance(): TTSQueue {
    if (!TTSQueue.instance) {
      TTSQueue.instance = new TTSQueue();
    }
    return TTSQueue.instance;
  }

  /**
   * Enqueues a TTS welcome message with optional onComplete callback for auto-verification
   */
  public enqueue(
    guildId: string,
    text: string,
    volume = 1.0,
    userId = '',
    onComplete?: (guildId: string, userId?: string) => Promise<void> | void
  ): { queued: boolean; position: number } {
    // Duplicate & spam prevention: check if same user was announced in last 5s
    if (userId) {
      const last = this.lastAnnouncedMember.get(guildId);
      if (last && last.userId === userId && Date.now() - last.timestamp < 5000) {
        return { queued: false, position: -1 };
      }
      this.lastAnnouncedMember.set(guildId, { userId, timestamp: Date.now() });
    }

    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, []);
    }

    const queue = this.queues.get(guildId)!;
    // Limit queue size to 25 items to prevent unbounded memory growth
    if (queue.length >= 25) {
      LogService.warn('TTSQueue', `Queue overflow for guild ${guildId}, dropping oldest item`);
      queue.shift();
    }

    const item: TTSMessage = {
      id: Math.random().toString(36).substring(2, 9),
      guildId,
      text,
      volume,
      userId,
      timestamp: Date.now(),
      retries: 0,
      onComplete,
    };

    queue.push(item);
    return { queued: true, position: queue.length };
  }

  /**
   * Processes next message in guild queue and triggers onComplete on playback finish
   */
  public async playNext(guildId: string, connection?: VoiceConnection): Promise<void> {
    if (this.isPlaying.get(guildId)) {
      return; // Already playing audio sequentially
    }

    const queue = this.queues.get(guildId);
    if (!queue || queue.length === 0) {
      return;
    }

    const item = queue.shift()!;
    this.isPlaying.set(guildId, true);

    try {
      LogService.info('TTSQueue', `Playing TTS for guild ${guildId}: "${item.text}"`);

      // If a real VoiceConnection is provided in Discord runtime
      if (connection) {
        let player = this.players.get(guildId);
        if (!player) {
          player = createAudioPlayer();
          this.players.set(guildId, player);
        }
        connection.subscribe(player);

        // Generate robust TTS audio resource with buffer
        const resource = await TTSAudioService.createTTSResource(item.text, item.volume);
        if (resource) {
          player.play(resource);

          await new Promise<void>((resolve) => {
            const idleListener = () => {
              cleanup();
              resolve();
            };
            const errorListener = (err: any) => {
              LogService.error('TTSQueue', 'AudioPlayer error occurred', err);
              cleanup();
              resolve();
            };
            // 15 seconds max speech duration guard
            const timeout = setTimeout(() => {
              cleanup();
              resolve();
            }, 15000);

            const cleanup = () => {
              player?.off(AudioPlayerStatus.Idle, idleListener);
              player?.off('error', errorListener);
              clearTimeout(timeout);
            };

            player?.once(AudioPlayerStatus.Idle, idleListener);
            player?.once('error', errorListener);
          });
        }
      } else {
        // Simulation or headless mode delay
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Execute onComplete callback (e.g. automatically granting Member role 24/7)
      if (item.onComplete) {
        try {
          await item.onComplete(item.guildId, item.userId);
        } catch (cbErr) {
          LogService.error('TTSQueue', `Error in onComplete callback for user ${item.userId}`, cbErr);
        }
      }
    } catch (err) {
      LogService.error('TTSQueue', `Failed playing TTS message for guild ${guildId}`, err);
      // Retry once if retries < 1
      if (item.retries < 1) {
        item.retries++;
        queue.unshift(item);
      }
    } finally {
      this.isPlaying.set(guildId, false);
      // Continue queue
      if (queue && queue.length > 0) {
        setImmediate(() => this.playNext(guildId, connection));
      }
    }
  }

  public getQueueLength(guildId: string): number {
    return this.queues.get(guildId)?.length || 0;
  }

  public clearQueue(guildId: string): void {
    this.queues.delete(guildId);
    const player = this.players.get(guildId);
    if (player) {
      player.stop();
    }
    this.isPlaying.set(guildId, false);
  }
}

export const ttsQueue = TTSQueue.getInstance();
