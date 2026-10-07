import {
  Guild,
  GuildMember,
  VoiceBasedChannel,
  ChannelType,
  PermissionsBitField,
  VoiceState,
} from 'discord.js';
import {
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  AudioPlayer,
  AudioPlayerStatus,
  entersState,
} from '@discordjs/voice';
import { prisma } from '../database/db';
import { harumiAI } from '../ai/HarumiAI';
import { LogService } from '../services/LogService';
import { cooldownService } from '../services/CooldownService';
import { TTSAudioService } from '../services/TTSAudioService';

export interface SpeakerMessage {
  speaker: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface LiveTalkSession {
  guildId: string;
  voiceChannelId: string;
  connection: VoiceConnection;
  player: AudioPlayer;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessingUtterance: boolean;
  lastBotSpokeTimestamp: number;
  history: SpeakerMessage[];
  ttsQueue: string[];
  reconnectAttempts: number;
  lastReconnectTimestamp: number;
  debounceTimers: Map<string, NodeJS.Timeout>;
  activeUtterances: Map<string, { speakerName: string; startTime: number }>;
}

export class LiveTalkManager {
  private static instance: LiveTalkManager;
  private sessions = new Map<string, LiveTalkSession>();
  private readonly MAX_RECONNECT_RATE_PER_MINUTE = 5;

  private constructor() {}

  public static getInstance(): LiveTalkManager {
    if (!LiveTalkManager.instance) {
      LiveTalkManager.instance = new LiveTalkManager();
    }
    return LiveTalkManager.instance;
  }

  public isLiveTalkActive(guildId: string): boolean {
    return this.sessions.has(guildId);
  }

  public getSession(guildId: string): LiveTalkSession | undefined {
    return this.sessions.get(guildId);
  }

  /**
   * Automatic Voice Channel Selection:
   * 1. Checks permissions for bot (Connect and Speak).
   * 2. Prefers channels containing active human participants.
   * 3. Falls back to first accessible voice channel.
   */
  public findBestVoiceChannel(guild: Guild): VoiceBasedChannel | null {
    const me = guild.members.me;
    if (!me) return null;

    const accessible = guild.channels.cache
      .filter((c): c is VoiceBasedChannel => {
        if (!c.isVoiceBased()) return false;
        const perms = c.permissionsFor(me);
        return perms ? perms.has(PermissionsBitField.Flags.Connect) && perms.has(PermissionsBitField.Flags.Speak) : false;
      })
      .map((c) => c);

    if (accessible.length === 0) return null;

    // Sort by count of human members (descending)
    accessible.sort((a, b) => {
      const humansA = a.members.filter((m) => !m.user.bot).size;
      const humansB = b.members.filter((m) => !m.user.bot).size;
      return humansB - humansA;
    });

    return accessible[0] || null;
  }

  /**
   * Enables Live Talk Mode for a guild (.setuptalk)
   * Automatically targets caller's voice channel or creates one if none exist.
   */
  public async enableLiveTalk(
    guild: Guild,
    preferredChannelId?: string,
    callerMember?: GuildMember
  ): Promise<{ success: boolean; channelName?: string; message: string }> {
    let targetChannel: VoiceBasedChannel | null = null;

    // 1. If explicit preferred channel passed
    if (preferredChannelId) {
      const ch = guild.channels.cache.get(preferredChannelId);
      if (ch && ch.isVoiceBased()) {
        targetChannel = ch as VoiceBasedChannel;
      }
    }

    // 2. If the user who called .setuptalk is in a voice channel, join THEM!
    if (!targetChannel && callerMember?.voice?.channel) {
      targetChannel = callerMember.voice.channel;
    }

    // 3. Look for best populated/accessible voice channel
    if (!targetChannel) {
      targetChannel = this.findBestVoiceChannel(guild);
    }

    // 4. If STILL no voice channel exists in server, automatically create one!
    if (!targetChannel) {
      try {
        const me = guild.members.me;
        const perms = [
          {
            id: guild.roles.everyone.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
          },
        ];

        if (me) {
          perms.push({
            id: me.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.Speak,
            ],
          });
        }

        targetChannel = (await guild.channels.create({
          name: '🔊 Harumi Voice Lounge',
          type: ChannelType.GuildVoice,
          reason: 'Harumi Live Talk Auto-Creation',
          permissionOverwrites: perms,
        })) as VoiceBasedChannel;
        LogService.info('LiveTalk', `Created new voice channel in ${guild.name} for Live Talk`);
      } catch (err) {
        LogService.error('LiveTalk', 'Could not create voice channel for Live Talk', err);
      }
    }

    if (!targetChannel) {
      return {
        success: false,
        message: 'No accessible voice channel found. Please create a voice channel and grant Harumi Connect permissions.',
      };
    }

    // Stop existing session if any
    await this.disableLiveTalk(guild.id);

    try {
      const connection = joinVoiceChannel({
        channelId: targetChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false, // Must not be deafened to detect speech
        selfMute: false,
      });

      const player = createAudioPlayer();
      connection.subscribe(player);

      // Wait for voice gateway to be fully Ready
      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
      } catch (waitErr) {
        LogService.warn('LiveTalk', `Voice connection ready state wait: ${waitErr}`);
      }

      const session: LiveTalkSession = {
        guildId: guild.id,
        voiceChannelId: targetChannel.id,
        connection,
        player,
        isListening: true,
        isSpeaking: false,
        isProcessingUtterance: false,
        lastBotSpokeTimestamp: Date.now(),
        history: [],
        ttsQueue: [],
        reconnectAttempts: 0,
        lastReconnectTimestamp: Date.now(),
        debounceTimers: new Map(),
        activeUtterances: new Map(),
      };

      this.sessions.set(guild.id, session);

      // Persist to database
      await prisma.liveTalkSettings.upsert({
        where: { guildId: guild.id },
        create: {
          guildId: guild.id,
          enabled: true,
          currentVoiceChannelId: targetChannel.id,
          preferredVoiceChannelId: preferredChannelId || targetChannel.id,
          reconnectEnabled: true,
        },
        update: {
          enabled: true,
          currentVoiceChannelId: targetChannel.id,
          reconnectEnabled: true,
        },
      });

      // Setup Player Event Listeners
      player.on(AudioPlayerStatus.Idle, () => {
        session.isSpeaking = false;
        session.lastBotSpokeTimestamp = Date.now();
        this.playNextTts(guild.id);
      });

      player.on('error', (err) => {
        LogService.error('LiveTalk', `AudioPlayer error in guild ${guild.id}`, err);
        session.isSpeaking = false;
        session.lastBotSpokeTimestamp = Date.now();
        this.playNextTts(guild.id);
      });

      // Attach voice receiver with loop talk prevention
      this.attachVoiceReceiver(session, guild);

      // Initial friendly greeting
      const greeting = `Live Talk Mode active. Hello everyone! I am Harumi. How can I help today?`;
      await this.enqueueTts(guild.id, greeting);

      LogService.info('LiveTalk', `Live Talk Mode enabled in ${guild.name} (channel: #${targetChannel.name})`);

      return {
        success: true,
        channelName: targetChannel.name,
        message: `Live Talk Mode active! Joined **#${targetChannel.name}**. Ready to talk!`,
      };
    } catch (err) {
      LogService.error('LiveTalk', `Failed to enable Live Talk in guild ${guild.id}`, err);
      return {
        success: false,
        message: 'Failed to establish voice connection. Please ensure Harumi has Connect and Speak permissions.',
      };
    }
  }

  /**
   * Stops Live Talk Mode (.stoptalk)
   */
  public async disableLiveTalk(guildId: string): Promise<boolean> {
    const session = this.sessions.get(guildId);
    if (!session) {
      await prisma.liveTalkSettings.updateMany({
        where: { guildId },
        data: { enabled: false, currentVoiceChannelId: null },
      }).catch(() => {});
      return false;
    }

    session.isListening = false;
    session.isSpeaking = false;
    session.isProcessingUtterance = false;
    session.ttsQueue = [];

    // Clear active timers
    for (const timer of session.debounceTimers.values()) {
      clearTimeout(timer);
    }
    session.debounceTimers.clear();
    session.activeUtterances.clear();

    try {
      session.player.stop(true);
      session.connection.destroy();
    } catch {
      // Ignored if already destroyed
    }
    this.sessions.delete(guildId);

    await prisma.liveTalkSettings.upsert({
      where: { guildId },
      create: { guildId, enabled: false, currentVoiceChannelId: null },
      update: { enabled: false, currentVoiceChannelId: null },
    });

    LogService.info('LiveTalk', `Live Talk Mode stopped for guild ${guildId}`);
    return true;
  }

  /**
   * Attaches Discord Voice Receiver with VAD and Anti-Loop Protection:
   * 1. Strictly ignores the bot itself and all other bots.
   * 2. Ignores speech when the bot is playing audio or within 3.5s after playback.
   * 3. Requires at least 600ms of speech to prevent mic pops.
   * 4. Enforces minimum 8s cooldown between conversational AI turns.
   */
  private attachVoiceReceiver(session: LiveTalkSession, guild: Guild): void {
    const receiver = session.connection.receiver;
    const botId = guild.members.me?.id || guild.client.user?.id;

    receiver.speaking.on('start', (userId) => {
      // 1. STRICTLY IGNORE SELF AND BOTS
      if (!session.isListening) return;
      if (userId === botId) return;

      const member = guild.members.cache.get(userId);
      if (member?.user.bot || guild.client.users.cache.get(userId)?.bot) return;

      // 2. Interrupt handling: If a human starts speaking, interrupt bot playback
      if (session.isSpeaking) {
        this.interruptBotSpeech(session.guildId);
      }

      // If bot just spoke within 3500ms, ignore residual echo
      if (Date.now() - session.lastBotSpokeTimestamp < 3500) {
        return;
      }

      const speakerName = member?.displayName || 'Friend';

      // Record active speech start
      session.activeUtterances.set(userId, {
        speakerName,
        startTime: Date.now(),
      });

      // Clear any pending debounce timer for this user
      const existingTimer = session.debounceTimers.get(userId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
    });

    receiver.speaking.on('end', (userId) => {
      if (!session.isListening) return;
      if (userId === botId) return; // STRICTLY IGNORE SELF

      const utterance = session.activeUtterances.get(userId);
      if (!utterance) return;
      session.activeUtterances.delete(userId);

      const duration = Date.now() - utterance.startTime;

      // Filter out short pops/clicks (<600ms) or speech during bot talking
      if (duration < 600) return;
      if (session.isSpeaking || Date.now() - session.lastBotSpokeTimestamp < 3500) return;
      if (session.isProcessingUtterance) return;

      // Clear previous debounce timer
      const existingTimer = session.debounceTimers.get(userId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Silence Debounce Window: Wait 1500ms of silence before responding
      const timer = setTimeout(async () => {
        session.debounceTimers.delete(userId);

        if (!session.isListening || session.isSpeaking || session.isProcessingUtterance) return;
        if (Date.now() - session.lastBotSpokeTimestamp < 4000) return;

        // Anti-Loop / Cooldown: At least 8 seconds between conversational replies in voice
        const cd = cooldownService.getRemaining('ai', session.guildId, 'live_talk_cooldown', 'voice');
        if (cd > 0) return;
        cooldownService.set('ai', session.guildId, 'live_talk_cooldown', 8, 'voice');

        session.isProcessingUtterance = true;
        try {
          await this.handleUserUtterance(session.guildId, utterance.speakerName);
        } finally {
          session.isProcessingUtterance = false;
        }
      }, 1500);

      session.debounceTimers.set(userId, timer);
    });
  }

  /**
   * Handles user speech utterance, queries Harumi AI, and triggers TTS response.
   * Completely avoids self-referential loops.
   */
  public async handleUserUtterance(guildId: string, speakerName: string, speechText?: string): Promise<string> {
    const session = this.sessions.get(guildId);
    if (!session || !session.isListening) return '';

    // Record user interaction in session conversation history
    const userStatement = speechText || `${speakerName} spoke in voice channel.`;
    session.history.push({
      speaker: speakerName,
      role: 'user',
      content: userStatement,
      timestamp: Date.now(),
    });

    if (session.history.length > 6) {
      session.history = session.history.slice(-6);
    }

    const recentContext = session.history
      .map((h) => `${h.speaker}: ${h.content}`)
      .join('\n');

    const voicePrompt = `You are Harumi participating in a live Discord voice chat.
Respond politely and conversationally to ${speakerName}.
Keep your response short, conversational, and direct (1 to 2 sentences, maximum 30 words).
Do NOT use markdown, code blocks, or bullet points because this will be spoken aloud via text-to-speech.
Recent context:
${recentContext}`;

    try {
      const aiResponse = await harumiAI.generateResponse(
        guildId,
        session.voiceChannelId,
        'voice_session',
        voicePrompt
      );

      let cleanReply = aiResponse.text
        .replace(/[*_#`~>]/g, '')
        .replace(/\n+/g, ' ')
        .trim();

      if (cleanReply.length > 250) {
        cleanReply = cleanReply.slice(0, 240) + '.';
      }

      session.history.push({
        speaker: 'Harumi',
        role: 'assistant',
        content: cleanReply,
        timestamp: Date.now(),
      });

      // Enqueue speech
      await this.enqueueTts(guildId, cleanReply);
      return cleanReply;
    } catch (err) {
      LogService.error('LiveTalk', 'Error generating AI voice response', err);
      return '';
    }
  }

  /**
   * Enqueues TTS audio and triggers sequential playback
   */
  public async enqueueTts(guildId: string, text: string): Promise<void> {
    const session = this.sessions.get(guildId);
    if (!session) return;

    session.ttsQueue.push(text);

    if (!session.isSpeaking) {
      this.playNextTts(guildId);
    }
  }

  /**
   * Plays the next item in the guild's TTS queue
   */
  private async playNextTts(guildId: string): Promise<void> {
    const session = this.sessions.get(guildId);
    if (!session || session.ttsQueue.length === 0) {
      if (session) {
        session.isSpeaking = false;
        session.lastBotSpokeTimestamp = Date.now();
      }
      return;
    }

    session.isSpeaking = true;
    const text = session.ttsQueue.shift()!;

    try {
      const resource = await TTSAudioService.createTTSResource(text, 1.0);
      if (resource) {
        session.player.play(resource);
      } else {
        session.isSpeaking = false;
        session.lastBotSpokeTimestamp = Date.now();
        this.playNextTts(guildId);
      }
    } catch (err) {
      LogService.error('LiveTalk', `Failed to play TTS in guild ${guildId}`, err);
      session.isSpeaking = false;
      session.lastBotSpokeTimestamp = Date.now();
      this.playNextTts(guildId);
    }
  }

  /**
   * Interruption: Halts current speech immediately when human interrupts
   */
  public interruptBotSpeech(guildId: string): void {
    const session = this.sessions.get(guildId);
    if (!session || !session.isSpeaking) return;

    LogService.info('LiveTalk', `Human speaker interrupted bot speech in guild ${guildId}`);
    session.player.stop();
    session.ttsQueue = []; // Clear pending backlog
    session.isSpeaking = false;
    session.lastBotSpokeTimestamp = Date.now();
  }

  /**
   * Disconnect / Kick Recovery Logic:
   * Handles bot being disconnected, moved, or kicked from voice channel.
   */
  public async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    const guild = newState.guild;
    const session = this.sessions.get(guild.id);
    if (!session) return;

    const botId = guild.members.me?.id;
    if (!botId) return;

    if (newState.member?.id === botId) {
      // 1. Bot was disconnected or kicked
      if (oldState.channelId && !newState.channelId) {
        LogService.warn('LiveTalk', `Harumi was disconnected from voice in guild ${guild.id}`);

        const now = Date.now();
        if (now - session.lastReconnectTimestamp > 60000) {
          session.reconnectAttempts = 0;
        }

        if (session.reconnectAttempts >= this.MAX_RECONNECT_RATE_PER_MINUTE) {
          LogService.error('LiveTalk', `Max reconnect rate reached for ${guild.id}. Stopping Live Talk.`);
          await this.disableLiveTalk(guild.id);
          return;
        }

        session.reconnectAttempts++;
        session.lastReconnectTimestamp = now;

        setTimeout(async () => {
          if (!this.sessions.has(guild.id)) return;
          const bestChannel = this.findBestVoiceChannel(guild);
          if (bestChannel) {
            LogService.info('LiveTalk', `Recovering: Reconnecting to #${bestChannel.name} in guild ${guild.id}`);
            await this.enableLiveTalk(guild, bestChannel.id);
          }
        }, 2500);
      }

      // 2. Bot was moved to a different channel
      if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        session.voiceChannelId = newState.channelId;
        LogService.info('LiveTalk', `Harumi was moved to channel #${newState.channel?.name} in guild ${guild.id}`);
      }
    }
  }

  /**
   * Simulation helper for Web Dashboard and interactive testing
   */
  public async simulateLiveTalk(
    guildId: string,
    speakerName: string,
    userInput: string
  ): Promise<{ response: string; ttsUrl: string }> {
    const voicePrompt = `You are Harumi participating in a live Discord voice chat.
Respond naturally to ${speakerName} who said: "${userInput}".
Keep your response short, conversational, and friendly (1 to 2 sentences).
No markdown or bullet points.`;

    const aiResponse = await harumiAI.generateResponse(
      guildId,
      'voice_live_talk',
      speakerName,
      voicePrompt
    );

    const clean = aiResponse.text.replace(/[*_#`~>]/g, '').trim();
    const ttsUrl = TTSAudioService.getBrowserTTSUrl(clean);

    return {
      response: clean,
      ttsUrl,
    };
  }
}

export const liveTalkManager = LiveTalkManager.getInstance();
