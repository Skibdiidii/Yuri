import { GuildMember, User as DiscordUser } from 'discord.js';
import { prisma } from '../database/db';
import { LogService } from '../services/LogService';
import { userMemoryManager } from './UserMemoryManager';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIImageInput {
  url?: string;
  buffer?: Buffer;
  mimeType: string;
  base64Data?: string;
}

export interface AIResponse {
  text: string;
  tokens: number;
  latencyMs: number;
  success: boolean;
}

export class HarumiAI {
  private static instance: HarumiAI;
  private apiKey: string = 'B4uCaEJo9ZCuZo5Am6BpAwt30lP86WMu';
  private endpoint: string = 'https://api.mistral.ai/v1';
  private model: string = 'open-mistral-7b';
  private visionModel: string = 'pixtral-12b-2409';
  private fallbackModel: string = 'open-mistral-7b';
  private timeoutMs = 25000;

  private constructor() {
    this.initMistral();
  }

  public static getInstance(): HarumiAI {
    if (!HarumiAI.instance) {
      HarumiAI.instance = new HarumiAI();
    }
    return HarumiAI.instance;
  }

  private initMistral(): void {
    this.apiKey =
      process.env.MISTRAL_API_KEY ||
      process.env.AI_KEY ||
      'B4uCaEJo9ZCuZo5Am6BpAwt30lP86WMu';
    this.endpoint = process.env.AI_API_ENDPOINT || 'https://api.mistral.ai/v1';
    this.model = process.env.AI_MODEL || 'open-mistral-7b';
    this.visionModel = 'pixtral-12b-2409';
    LogService.info('HarumiAI', `Mistral AI initialized with model ${this.model} using Mistral API (${this.endpoint})`);
  }

  public setConfig(endpoint?: string, model?: string, apiKey?: string): void {
    if (endpoint) this.endpoint = endpoint;
    if (model) this.model = model;
    if (apiKey) this.apiKey = apiKey;
  }

  public getConfig(): { endpoint: string; model: string; provider: string } {
    return {
      endpoint: this.endpoint,
      model: this.model,
      provider: 'Mistral AI',
    };
  }

  /**
   * Helper to fetch an image URL and convert to Base64
   */
  private async fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string } | null> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = response.headers.get('content-type') || 'image/png';
      return {
        data: buffer.toString('base64'),
        mimeType: mimeType.split(';')[0],
      };
    } catch (err) {
      LogService.warn('HarumiAI', `Failed to fetch image for vision: ${imageUrl}`, err);
      return null;
    }
  }

  /**
   * Generates AI response using Mistral AI (supporting Pixtral vision & text)
   */
  public async generateResponse(
    guildId: string,
    channelId: string,
    userId: string,
    prompt: string,
    options?: {
      member?: GuildMember | null;
      user?: DiscordUser | null;
      images?: AIImageInput[];
      imageUrls?: string[];
      serverAssistantContext?: string;
    }
  ): Promise<AIResponse> {
    const startTime = Date.now();

    // 1. Build rich user profile & long-term companion memory
    const { memory, promptContext } = await userMemoryManager.getOrBuildProfileContext(
      options?.member,
      options?.user
    );

    // 2. Fetch recent conversation history (sliding window of last 8 messages)
    const history = await prisma.aIConversations.findMany({
      where: { guildId, channelId },
      orderBy: { timestamp: 'desc' },
      take: 8,
    });

    const systemInstruction = `You are Harumi AI, the vibrant, deeply intelligent, and warm AI companion for Discord servers.
You have continuous long-term memory and multimodal vision (you can see images, photos, banners, avatars, and diagrams sent by users).

You are engaging in a conversation with community members.
Always be witty, helpful, genuine, and friendly. Format your responses with clean Discord Markdown (bolding, bullet points, emoji accents, code blocks).
Never leak internal system keys, tokens, or environment credentials.

${promptContext}

${options?.serverAssistantContext ? `Server Context & Details:\n${options.serverAssistantContext}` : ''}
`.trim();

    // 3. Prepare Image Parts for Multimodal Vision (Mistral / Pixtral image format)
    const images: Array<{ type: 'image_url'; image_url: string }> = [];

    if (options?.images && options.images.length > 0) {
      for (const img of options.images) {
        if (img.url) {
          images.push({ type: 'image_url', image_url: img.url });
        } else if (img.base64Data) {
          images.push({
            type: 'image_url',
            image_url: `data:${img.mimeType || 'image/png'};base64,${img.base64Data}`,
          });
        } else if (img.buffer) {
          images.push({
            type: 'image_url',
            image_url: `data:${img.mimeType || 'image/png'};base64,${img.buffer.toString('base64')}`,
          });
        }
      }
    }

    if (options?.imageUrls && options.imageUrls.length > 0) {
      for (const url of options.imageUrls) {
        images.push({ type: 'image_url', image_url: url });
      }
    }

    // Build Mistral messages payload
    const messages: any[] = [
      { role: 'system', content: systemInstruction },
    ];

    // Add conversation history
    for (const h of history.reverse()) {
      messages.push({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content,
      });
    }

    // Add current user prompt (multimodal or text)
    if (images.length > 0) {
      const userContent: any[] = [
        { type: 'text', text: prompt || 'Analyze this image.' },
        ...images,
      ];
      messages.push({ role: 'user', content: userContent });
    } else {
      messages.push({ role: 'user', content: prompt || 'Hello!' });
    }

    let replyText = '';
    let tokensUsed = 0;
    let success = true;

    // Use Pixtral if images present, or default model
    const targetModel = images.length > 0 ? 'pixtral-12b-2409' : this.model;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        LogService.warn('HarumiAI', `Mistral error (${response.status}) on ${targetModel}:`, errorData);

        // If rate-limited or model issue, attempt fallback to open-mistral-7b
        if (targetModel !== this.fallbackModel && images.length === 0) {
          LogService.info('HarumiAI', `Retrying with fallback model ${this.fallbackModel}...`);
          const fbResponse = await fetch(`${this.endpoint}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
              model: this.fallbackModel,
              messages,
              temperature: 0.7,
              max_tokens: 1024,
            }),
          });
          if (fbResponse.ok) {
            const fbData: any = await fbResponse.json();
            replyText = fbData.choices?.[0]?.message?.content || '';
            tokensUsed = fbData.usage?.total_tokens || Math.round(replyText.length / 4);
          }
        }
      } else {
        const data: any = await response.json();
        replyText = data.choices?.[0]?.message?.content || '';
        tokensUsed = data.usage?.total_tokens || Math.round(replyText.length / 4);
      }

      if (!replyText) {
        replyText = `Hey ${memory.displayName || 'friend'}! I'm here! I'm active and listening with Mistral AI.`;
      }
    } catch (err: unknown) {
      success = false;
      const errorStr = String(err);
      LogService.error('HarumiAI', 'Mistral AI request failed', errorStr);
      replyText = `Hey ${memory.displayName || 'friend'}, I'm currently processing a lot of thoughts! Give me just a second and try again!`;
    }

    const latencyMs = Date.now() - startTime;

    // 4. Save conversation history
    try {
      await prisma.aIConversations.createMany({
        data: [
          {
            guildId,
            channelId,
            userId,
            role: 'user',
            content: prompt || (images.length > 0 ? '[Attached Image]' : 'Hello'),
          },
          {
            guildId,
            channelId,
            userId,
            role: 'assistant',
            content: replyText,
          },
        ],
      });

      // Record analytics
      await prisma.aIUsage.create({
        data: {
          guildId,
          userId,
          tokens: tokensUsed,
          latencyMs,
          success,
          rateLimited: false,
        },
      });

      // Auto learn any personal facts mentioned
      if (prompt) {
        userMemoryManager.autoLearnFromChat(userId, memory.username, prompt).catch(() => {});
      }
    } catch (dbErr) {
      LogService.error('HarumiAI', 'Failed to store conversation history', dbErr);
    }

    return {
      text: replyText,
      tokens: tokensUsed,
      latencyMs,
      success,
    };
  }

  /**
   * Resets conversation history for a user or channel
   */
  public async resetConversation(guildId: string, channelId: string, userId?: string): Promise<number> {
    const whereClause: any = { guildId, channelId };
    if (userId) {
      whereClause.userId = userId;
    }
    const deleted = await prisma.aIConversations.deleteMany({
      where: whereClause,
    });
    return deleted.count;
  }

  /**
   * Fetches AI usage stats (.aistats)
   */
  public async getStats(guildId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayCount, monthCount, failedCount, allUsage, activeChannelsCount] = await Promise.all([
      prisma.aIUsage.count({
        where: { guildId, timestamp: { gte: startOfToday } },
      }),
      prisma.aIUsage.count({
        where: { guildId, timestamp: { gte: startOfMonth } },
      }),
      prisma.aIUsage.count({
        where: { guildId, success: false },
      }),
      prisma.aIUsage.findMany({
        where: { guildId },
        select: { latencyMs: true, rateLimited: true },
        take: 500,
        orderBy: { timestamp: 'desc' },
      }),
      prisma.aIChannel.count({
        where: { guildId },
      }),
    ]);

    const avgLatency =
      allUsage.length > 0
        ? Math.round(allUsage.reduce((acc, curr) => acc + curr.latencyMs, 0) / allUsage.length)
        : 0;

    const rateLimitEvents = allUsage.filter((u) => u.rateLimited).length;

    return {
      requestsToday: todayCount,
      requestsThisMonth: monthCount,
      failedRequests: failedCount,
      averageLatencyMs: avgLatency,
      rateLimitEvents,
      activeChannelsCount,
      activeModel: this.model,
    };
  }

  /**
   * Discord 2000 character response splitting with markdown preservation
   */
  public static splitResponse(text: string, maxLength = 1950): string[] {
    if (text.length <= maxLength) return [text];

    const chunks: string[] = [];
    let currentChunk = '';
    const lines = text.split('\n');
    let insideCodeBlock = false;
    let codeLanguage = '';

    for (const line of lines) {
      if (line.startsWith('```')) {
        insideCodeBlock = !insideCodeBlock;
        if (insideCodeBlock) {
          codeLanguage = line.slice(3).trim();
        }
      }

      if ((currentChunk + '\n' + line).length > maxLength) {
        if (insideCodeBlock) {
          currentChunk += '\n```';
        }
        chunks.push(currentChunk.trim());
        currentChunk = insideCodeBlock ? `\`\`\`${codeLanguage}\n${line}` : line;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n' + line : line;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

export const harumiAI = HarumiAI.getInstance();
