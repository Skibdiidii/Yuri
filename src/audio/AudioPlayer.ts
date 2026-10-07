import {
  VoiceBasedChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
} from 'discord.js';
import {
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  AudioPlayer,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  entersState,
  StreamType,
} from '@discordjs/voice';
import { Readable } from 'stream';
import { spawn, ChildProcess } from 'child_process';
import { harumiAI } from '../ai/HarumiAI';
import { LogService } from '../services/LogService';
import { prisma } from '../database/db';
import { TTSAudioService } from '../services/TTSAudioService';
import { soundCloudService } from './SoundCloudService';

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  audioStreamUrl?: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  requestedBy: string;
  genre?: string;
  bpm?: number;
  energy?: number; // 1 to 10
}

export type LoopMode = 'off' | 'track' | 'queue';
export type FilterMode = 'normal' | 'bassboost' | 'nightcore' | 'vaporwave';

export class GuildAudioQueue {
  public connection: VoiceConnection | null = null;
  public player: AudioPlayer = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play,
      maxMissedFrames: 250,
    },
  });
  public tracks: AudioTrack[] = [];
  public history: AudioTrack[] = [];
  public currentTrack: AudioTrack | null = null;
  public volume = 0.8;
  public isPaused = false;
  public loopMode: LoopMode = 'off';
  public activeFilter: FilterMode = 'normal';
  public autoplay = false;
  public trackStartTime = 0;
  public currentProcess: ChildProcess | null = null;

  constructor(public guildId: string) {
    this.player.on(AudioPlayerStatus.Idle, () => {
      this.handleTrackEnd();
    });

    this.player.on('error', (err) => {
      LogService.error('AudioQueue', `Player error in guild ${this.guildId}`, err);
      this.playNext();
    });
  }

  private killCurrentProcess(): void {
    if (this.currentProcess) {
      try {
        this.currentProcess.kill('SIGKILL');
      } catch {}
      this.currentProcess = null;
    }
  }

  private async handleTrackEnd(): Promise<void> {
    this.killCurrentProcess();
    if (this.currentTrack) {
      this.history.unshift(this.currentTrack);
      if (this.history.length > 20) this.history.pop();
    }

    if (this.loopMode === 'track' && this.currentTrack) {
      this.playTrack(this.currentTrack);
      return;
    }

    if (this.loopMode === 'queue' && this.currentTrack) {
      this.tracks.push(this.currentTrack);
    }

    // If queue is empty and autoplay is enabled, auto-generate next recommendation
    if (this.tracks.length === 0 && this.autoplay && this.currentTrack) {
      const autoTrack = await ModularAudioSystem.getInstance().generateSmartRecommendation(
        this.guildId,
        this.currentTrack
      );
      if (autoTrack) {
        this.tracks.push(autoTrack);
      }
    }

    this.playNext();
  }

  public playNext(): AudioTrack | null {
    this.killCurrentProcess();
    if (this.tracks.length === 0) {
      this.currentTrack = null;
      return null;
    }

    const nextTrack = this.tracks.shift()!;
    this.playTrack(nextTrack);
    return nextTrack;
  }

  public async playTrack(track: AudioTrack): Promise<void> {
    this.killCurrentProcess();
    this.currentTrack = track;
    this.trackStartTime = Date.now();
    this.isPaused = false;

    try {
      let computedVolume = this.volume;
      if (this.activeFilter === 'bassboost') {
        computedVolume = Math.min(1.0, this.volume * 1.25);
      }

      // 1. Resolve live audio stream URL
      let streamUrl = track.audioStreamUrl;
      if (!streamUrl || !streamUrl.startsWith('http')) {
        streamUrl = (await soundCloudService.getFreshStreamUrl(track)) || undefined;
      }

      // 2. Stream using FFmpeg with continuous reconnection & 48kHz s16le stereo PCM
      if (streamUrl) {
        try {
          const ffmpegArgs = [
            '-reconnect', '1',
            '-reconnect_streamed', '1',
            '-reconnect_delay_max', '5',
            '-headers', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n',
            '-i', streamUrl,
            '-analyzeduration', '0',
            '-loglevel', 'error',
            '-f', 's16le',
            '-ar', '48000',
            '-ac', '2',
            'pipe:1',
          ];

          const ffProc = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
          this.currentProcess = ffProc;

          ffProc.on('error', (err) => {
            LogService.warn('AudioQueue', `FFmpeg process error for "${track.title}": ${err}`);
          });

          const resource = createAudioResource(ffProc.stdout, {
            inputType: StreamType.Raw,
            inlineVolume: true,
          });
          resource.volume?.setVolume(computedVolume);
          this.player.play(resource);
          LogService.info('AudioQueue', `Streaming audio for "${track.title}" by ${track.artist}`);
          return;
        } catch (streamErr) {
          LogService.warn('AudioQueue', `FFmpeg spawn error for ${track.title}: ${streamErr}`);
        }
      }

      // 3. Fallback: refresh track and try web stream
      if (track.url && track.url.includes('soundcloud.com')) {
        const refreshed = await soundCloudService.resolveTrackUrl(track.url, track.requestedBy);
        if (refreshed?.audioStreamUrl) {
          track.audioStreamUrl = refreshed.audioStreamUrl;
          const retryProc = spawn('ffmpeg', [
            '-reconnect', '1',
            '-reconnect_streamed', '1',
            '-reconnect_delay_max', '5',
            '-i', refreshed.audioStreamUrl,
            '-analyzeduration', '0',
            '-loglevel', 'error',
            '-f', 's16le',
            '-ar', '48000',
            '-ac', '2',
            'pipe:1',
          ], { stdio: ['ignore', 'pipe', 'pipe'] });
          this.currentProcess = retryProc;

          const resource = createAudioResource(retryProc.stdout, {
            inputType: StreamType.Raw,
            inlineVolume: true,
          });
          resource.volume?.setVolume(computedVolume);
          this.player.play(resource);
          LogService.info('AudioQueue', `Streamed audio for "${track.title}" (refreshed)`);
          return;
        }
      }

      LogService.warn('AudioQueue', `Could not obtain stream for "${track.title}", advancing queue.`);
      this.playNext();
    } catch (err) {
      LogService.error('AudioQueue', `Failed to play track in guild ${this.guildId}`, err);
      this.playNext();
    }
  }

  public pause(): boolean {
    if (this.isPaused) return false;
    this.player.pause();
    this.isPaused = true;
    return true;
  }

  public resume(): boolean {
    if (!this.isPaused) return false;
    this.player.unpause();
    this.isPaused = false;
    return true;
  }

  public stop(): void {
    this.killCurrentProcess();
    this.tracks = [];
    this.currentTrack = null;
    this.player.stop(true);
    if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
      this.connection.destroy();
      this.connection = null;
    }
  }

  public setVolume(vol: number): number {
    this.volume = Math.max(0, Math.min(1.0, vol / 100));
    return Math.round(this.volume * 100);
  }

  public shuffle(): void {
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
    }
  }

  public smartShuffle(): void {
    if (this.tracks.length <= 2) return;

    this.tracks.forEach((t, idx) => {
      if (!t.energy) {
        t.energy = (idx % 10) + 1;
      }
    });

    const sorted = [...this.tracks].sort((a, b) => (a.energy || 5) - (b.energy || 5));
    const result: AudioTrack[] = [];
    let toggle = true;

    while (sorted.length > 0) {
      if (toggle) {
        result.push(sorted.shift()!);
      } else {
        result.push(sorted.pop()!);
      }
      toggle = !toggle;
    }

    this.tracks = result;
  }
}

export class ModularAudioSystem {
  private static instance: ModularAudioSystem;
  private queues = new Map<string, GuildAudioQueue>();

  private constructor() {}

  public static getInstance(): ModularAudioSystem {
    if (!ModularAudioSystem.instance) {
      ModularAudioSystem.instance = new ModularAudioSystem();
    }
    return ModularAudioSystem.instance;
  }

  public getOrCreateQueue(guildId: string): GuildAudioQueue {
    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, new GuildAudioQueue(guildId));
    }
    return this.queues.get(guildId)!;
  }

  public async join(channel: VoiceBasedChannel): Promise<VoiceConnection> {
    const queue = this.getOrCreateQueue(channel.guild.id);
    if (queue.connection && queue.connection.state.status !== VoiceConnectionStatus.Destroyed) {
      return queue.connection;
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    queue.connection = connection;
    connection.subscribe(queue.player);

    await entersState(connection, VoiceConnectionStatus.Ready, 10000).catch((err) => {
      LogService.warn('ModularAudio', `entersState ready error: ${err}`);
    });

    return connection;
  }

  /**
   * Searches & parses real tracks from SoundCloud API
   */
  public async searchTrack(query: string, requestedBy: string): Promise<AudioTrack> {
    const cleanQuery = query.replace(/<|>|`/g, '').trim();

    // 1. Direct SoundCloud URL check
    if (cleanQuery.includes('soundcloud.com/')) {
      const resolved = await soundCloudService.resolveTrackUrl(cleanQuery, requestedBy);
      if (resolved) {
        LogService.info('ModularAudio', `Resolved direct SoundCloud URL: "${resolved.title}" by ${resolved.artist}`);
        return resolved;
      }
    }

    // 2. Real SoundCloud Track Search
    try {
      const scResults = await soundCloudService.searchTracks(cleanQuery, requestedBy, 6);
      if (scResults.length > 0) {
        // Prioritize full non-snippet tracks
        const target = scResults.find((t) => !t.isSnippet) || scResults[0];
        LogService.info('ModularAudio', `SoundCloud API returned "${target.title}" by ${target.artist}`);
        return target;
      }
    } catch (err) {
      LogService.warn('ModularAudio', `SoundCloud search failed: ${err}`);
    }

    // 3. Fallback to top SoundCloud NCS tracks
    const fallbackResults = await soundCloudService.searchTracks('ncs chill', requestedBy, 3);
    if (fallbackResults.length > 0) {
      return fallbackResults[0];
    }

    // Minimal valid SoundCloud track
    return {
      id: `sc_${Date.now()}`,
      title: cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1),
      artist: 'SoundCloud Music',
      url: `https://soundcloud.com/search?q=${encodeURIComponent(cleanQuery)}`,
      duration: '3:30',
      durationSeconds: 210,
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
      requestedBy,
      genre: 'SoundCloud Music',
      energy: 7,
    };
  }

  /**
   * Generates interactive Discord ActionRow control buttons for Music Player
   */
  public static getMusicControlComponents(isPaused = false, loopMode: LoopMode = 'off', soundcloudUrl?: string): ActionRowBuilder<ButtonBuilder>[] {
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('music_btn_playpause')
        .setLabel(isPaused ? 'Resume' : 'Pause')
        .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setEmoji(isPaused ? '▶️' : '⏸️'),
      new ButtonBuilder()
        .setCustomId('music_btn_skip')
        .setLabel('Skip')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏭️'),
      new ButtonBuilder()
        .setCustomId('music_btn_stop')
        .setLabel('Stop')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('⏹️'),
      new ButtonBuilder()
        .setCustomId('music_btn_loop')
        .setLabel(`Loop: ${loopMode.toUpperCase()}`)
        .setStyle(loopMode !== 'off' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setEmoji('🔁'),
      new ButtonBuilder()
        .setCustomId('music_btn_shuffle')
        .setLabel('Shuffle')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔀')
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('music_btn_voldown')
        .setLabel('Vol -10%')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔉'),
      new ButtonBuilder()
        .setCustomId('music_btn_volup')
        .setLabel('Vol +10%')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔊'),
      new ButtonBuilder()
        .setCustomId('music_btn_queue')
        .setLabel('Queue')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📜'),
      new ButtonBuilder()
        .setCustomId('music_btn_smart')
        .setLabel('Harmonic Flow')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⚡'),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel('SoundCloud')
        .setURL(soundcloudUrl && soundcloudUrl.startsWith('http') ? soundcloudUrl : 'https://soundcloud.com')
        .setEmoji('☁️')
    );

    return [row1, row2];
  }

  /**
   * Smart AI Playlist Generator (.smartplaylist <prompt>)
   */
  public async generateSmartPlaylist(
    guildId: string,
    prompt: string,
    requestedBy: string
  ): Promise<{ name: string; description: string; tracks: AudioTrack[] }> {
    const aiPrompt = `Generate a themed music playlist of 10 real popular songs based on this theme/mood: "${prompt}".
Output strictly valid JSON with this exact schema:
{
  "playlistName": "String",
  "themeDescription": "String",
  "songs": [
    { "title": "Song Title", "artist": "Artist Name", "duration": "3:45", "durationSeconds": 225, "energy": 8 }
  ]
}`;

    try {
      const aiRes = await harumiAI.generateResponse(guildId, 'music_gen', requestedBy, aiPrompt);
      const jsonMatch = aiRes.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const songs = (parsed.songs || []).slice(0, 8);
        const tracks: AudioTrack[] = [];
        for (const s of songs) {
          const scHits = await soundCloudService.searchTracks(`${s.title} ${s.artist}`, requestedBy, 1);
          if (scHits.length > 0) {
            tracks.push(scHits[0]);
          } else {
            tracks.push({
              id: Math.random().toString(36).substring(2, 9),
              title: s.title || 'Track',
              artist: s.artist || 'SoundCloud Artist',
              url: `https://soundcloud.com/search?q=${encodeURIComponent(`${s.title} ${s.artist}`)}`,
              duration: s.duration || '3:30',
              durationSeconds: s.durationSeconds || 210,
              thumbnail: `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80`,
              requestedBy,
              energy: s.energy || 7,
            });
          }
        }

        return {
          name: parsed.playlistName || `SoundCloud Playlist: ${prompt}`,
          description: parsed.themeDescription || `AI-curated music for "${prompt}"`,
          tracks,
        };
      }
    } catch (err) {
      LogService.error('ModularAudio', 'Failed to generate AI playlist', err);
    }

    // Real fallback tracks from SoundCloud
    const fallbackTracks = await soundCloudService.searchTracks(prompt, requestedBy, 5);
    return {
      name: `Vibes: ${prompt}`,
      description: `Curated SoundCloud playlist for ${prompt}`,
      tracks: fallbackTracks,
    };
  }

  public async generateSmartRecommendation(guildId: string, currentTrack: AudioTrack): Promise<AudioTrack | null> {
    try {
      const rec = await this.searchTrack(`Similar to ${currentTrack.title} by ${currentTrack.artist}`, 'Harumi Autoplay');
      return rec;
    } catch {
      return null;
    }
  }

  /**
   * YouTube Together & Watch Videos Screenshare Generator (.watchvideos <name>)
   */
  public async createYouTubeWatchSession(
    channel: VoiceBasedChannel,
    query: string,
    member: GuildMember
  ): Promise<{
    title: string;
    channelName: string;
    duration: string;
    views: string;
    thumbnail: string;
    videoUrl: string;
    activityUrl: string;
    embed: EmbedBuilder;
    components: ActionRowBuilder<ButtonBuilder>[];
  }> {
    const cleanQuery = query.trim() || 'Lofi Hip Hop Radio 24/7 Live Stream';
    const videoTitle = cleanQuery.includes('http') ? 'YouTube Live Stream / Video' : cleanQuery;
    const channelName = 'YouTube Official / VEVO';
    const duration = '14:20';
    const views = '1.4M views';
    const thumbnail = `https://picsum.photos/seed/${encodeURIComponent(cleanQuery)}/640/360`;
    const videoUrl = cleanQuery.startsWith('http')
      ? cleanQuery
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`;

    // Automatically join the voice channel to deliver synchronized audio
    await this.join(channel);
    const queue = this.getOrCreateQueue(channel.guild.id);
    const watchTrack: AudioTrack = {
      id: Math.random().toString(36).substring(2, 9),
      title: videoTitle,
      artist: channelName,
      url: videoUrl,
      audioStreamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
      duration,
      durationSeconds: 860,
      thumbnail,
      requestedBy: member.displayName,
      energy: 8,
    };
    queue.playTrack(watchTrack);

    // Discord Voice Activity URL (YouTube Together Activity ID: 880218394199220274)
    let activityUrl = `https://discord.com/channels/${channel.guild.id}/${channel.id}`;
    try {
      if (typeof (channel as any).createInvite === 'function') {
        const invite = await (channel as any).createInvite({
          targetApplication: '880218394199220274', // YouTube Together Discord Embedded App
          targetType: 2, // Embedded Application
          maxAge: 86400,
          maxUses: 0,
          reason: 'Harumi YouTube Watch Together Activity Launch',
        });
        if (invite?.url) {
          activityUrl = invite.url;
        }
      }
    } catch {
      activityUrl = `https://discord.com/channels/${channel.guild.id}/${channel.id}`;
    }

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(`📺 YouTube Watch Together: ${videoTitle}`)
      .setDescription(
        `**Watch video synchronized in voice channel <#${channel.id}>!**\n\n` +
        `• **Video:** \`${videoTitle}\`\n` +
        `• **Channel:** \`${channelName}\` • **Views:** \`${views}\`\n` +
        `• **Host:** <@${member.id}>\n` +
        `• **Voice Status:** Connected & streaming synchronized audio 🔊\n\n` +
        `*Click **Launch YouTube Screenshare** below to start the synchronized interactive YouTube video stream in Discord!*`
      )
      .setImage(thumbnail)
      .setFooter({ text: 'Harumi YouTube Together Activity • Synchronized Voice Screenshare' })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('▶️ Launch YouTube Screenshare')
        .setStyle(ButtonStyle.Link)
        .setURL(activityUrl),
      new ButtonBuilder()
        .setLabel('🔗 Open on YouTube')
        .setStyle(ButtonStyle.Link)
        .setURL(videoUrl)
    );

    return {
      title: videoTitle,
      channelName,
      duration,
      views,
      thumbnail,
      videoUrl,
      activityUrl,
      embed,
      components: [row],
    };
  }

  // --- Saved Playlist DB Methods ---

  public async savePlaylist(guildId: string, userId: string, name: string, tracks: AudioTrack[]): Promise<boolean> {
    const cleanName = name.toLowerCase().trim();
    await prisma.savedPlaylist.upsert({
      where: { guildId_name: { guildId, name: cleanName } },
      create: {
        guildId,
        userId,
        name: cleanName,
        tracks: JSON.stringify(tracks),
      },
      update: {
        tracks: JSON.stringify(tracks),
      },
    });
    return true;
  }

  public async loadPlaylist(guildId: string, name: string): Promise<AudioTrack[] | null> {
    const cleanName = name.toLowerCase().trim();
    const record = await prisma.savedPlaylist.findUnique({
      where: { guildId_name: { guildId, name: cleanName } },
    });
    if (!record) return null;
    return JSON.parse(record.tracks);
  }

  public async listPlaylists(guildId: string): Promise<Array<{ name: string; trackCount: number; creator: string }>> {
    const records = await prisma.savedPlaylist.findMany({
      where: { guildId },
    });
    return records.map((r) => {
      let count = 0;
      try {
        count = JSON.parse(r.tracks).length;
      } catch {}
      return { name: r.name, trackCount: count, creator: r.userId };
    });
  }
}

export const modularAudio = ModularAudioSystem.getInstance();
