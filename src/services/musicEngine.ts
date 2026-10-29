import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
  type AudioPlayer,
  type VoiceConnection,
  type AudioResource,
} from "@discordjs/voice";
import play from "play-dl";
import ffmpegPath from "ffmpeg-static";
import { spawn, type ChildProcess } from "child_process";
import ytSearch from "yt-search";

export interface GuildVoiceState {
  connection: VoiceConnection;
  player: AudioPlayer;
  currentResource: AudioResource | null;
  ffmpegProcess?: ChildProcess | null;
  currentSong: {
    title: string;
    url: string;
    requestedBy: string;
    thumbnail?: string;
    duration?: string;
    source?: string;
  } | null;
  loop: boolean;
  volume: number; // 0.0 - 1.5
  channelId: string;
}

export const guildVoiceStates = new Map<string, GuildVoiceState>();

let soundCloudInitialized = false;

export async function ensurePlayDlReady(): Promise<void> {
  if (soundCloudInitialized) return;
  try {
    const clientId = await play.getFreeClientID();
    if (clientId) {
      await play.setToken({ soundcloud: { client_id: clientId } });
      soundCloudInitialized = true;
      console.log("[MUSIC ENGINE] SoundCloud client initialized successfully.");
    }
  } catch (err: any) {
    console.warn("[MUSIC ENGINE] SoundCloud token init notice:", err?.message || err);
  }
}

export const RADIO_STATIONS: Record<string, { name: string; url: string; genre: string; thumb: string }> = {
  lofi: {
    name: "24/7 Lofi Chillhop Beats",
    url: "https://stream.zeno.fm/f3wvbbqmdg8uv",
    genre: "Lofi / Relax",
    thumb: "https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif",
  },
  synthwave: {
    name: "Nightride FM • Chillsynth",
    url: "https://stream.nightride.fm/chillsynth.mp3",
    genre: "Synthwave / Cyberpunk",
    thumb: "https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif",
  },
  nightride: {
    name: "Nightride FM • Retrowave",
    url: "https://stream.nightride.fm/nightride.mp3",
    genre: "Synthwave / Retrowave",
    thumb: "https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif",
  },
  anime: {
    name: "Anime Radio 24/7",
    url: "https://cast1.torontocast.com:2170/stream",
    genre: "J-Pop / Anime OST",
    thumb: "https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif",
  },
  rock: {
    name: "Hard Rock 24/7 Radio",
    url: "https://stream.zeno.fm/1f0r8c2cnd0uv",
    genre: "Rock / Metal",
    thumb: "https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif",
  },
  phonk: {
    name: "Phonk Live 24/7 Stream",
    url: "https://stream.nightride.fm/nightride.mp3",
    genre: "Drift Phonk / EDM",
    thumb: "https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif",
  },
};

export async function resolveTrack(query: string): Promise<{
  title: string;
  url: string;
  thumbnail: string;
  duration: string;
  isRadio?: boolean;
} | null> {
  const clean = query.trim().toLowerCase();

  // Check preset radio stations
  if (RADIO_STATIONS[clean]) {
    const st = RADIO_STATIONS[clean];
    return {
      title: st.name,
      url: st.url,
      thumbnail: st.thumb,
      duration: "Live 24/7",
      isRadio: true,
    };
  }

  // Direct Audio URL
  if (query.startsWith("http://") || query.startsWith("https://")) {
    if (query.includes("soundcloud.com")) {
      await ensurePlayDlReady();
      try {
        const info: any = await play.soundcloud(query);
        return {
          title: info.name || "SoundCloud Track",
          url: query,
          thumbnail: info.thumbnail || "",
          duration: info.durationInSec ? `${Math.floor(info.durationInSec / 60)}:${String(info.durationInSec % 60).padStart(2, "0")}` : "Audio",
        };
      } catch {}
    }

    if (query.endsWith(".mp3") || query.endsWith(".ogg") || query.endsWith(".wav") || query.includes("stream") || query.includes("cast")) {
      return {
        title: "Direct Audio Stream",
        url: query,
        thumbnail: "https://i.pinimg.com/originals/5f/a0/e3/5fa0e3e226de58362578fd5e28caabf1.gif",
        duration: "Live Stream",
        isRadio: true,
      };
    }
  }

  // Search SoundCloud first for guaranteed bot-free playback
  await ensurePlayDlReady();
  try {
    const scResults = await play.search(query, {
      source: { soundcloud: "tracks" },
      limit: 1,
    });
    if (scResults && scResults[0]) {
      const track: any = scResults[0];
      return {
        title: track.name || track.title || query,
        url: track.url,
        thumbnail: track.thumbnail || "",
        duration: track.durationInSec ? `${Math.floor(track.durationInSec / 60)}:${String(track.durationInSec % 60).padStart(2, "0")}` : "Audio",
      };
    }
  } catch (err) {
    console.warn("[MUSIC ENGINE] SoundCloud search fallback:", err);
  }

  // Search YouTube as fallback / info provider
  try {
    const ytRes = await ytSearch(query);
    if (ytRes && ytRes.videos && ytRes.videos.length > 0) {
      const topVid = ytRes.videos[0];
      // Try searching SoundCloud with top video title for high reliability
      try {
        const scMatch = await play.search(topVid.title, {
          source: { soundcloud: "tracks" },
          limit: 1,
        });
        if (scMatch && scMatch[0]) {
          const track: any = scMatch[0];
          return {
            title: topVid.title,
            url: track.url,
            thumbnail: topVid.thumbnail || track.thumbnail || "",
            duration: topVid.timestamp || "Audio",
          };
        }
      } catch {}

      return {
        title: topVid.title,
        url: topVid.url,
        thumbnail: topVid.thumbnail,
        duration: topVid.timestamp,
      };
    }
  } catch (err) {
    console.error("[MUSIC ENGINE] YouTube search error:", err);
  }

  return null;
}

export function getOrCreateGuildVoice(guild: any, channelId: string): GuildVoiceState {
  let state = guildVoiceStates.get(guild.id);
  if (state && state.connection && state.connection.state.status !== VoiceConnectionStatus.Destroyed) {
    return state;
  }

  const connection = joinVoiceChannel({
    channelId,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false,
  });

  const player = createAudioPlayer();

  state = {
    connection,
    player,
    currentResource: null,
    ffmpegProcess: null,
    currentSong: null,
    loop: false,
    volume: 1.0,
    channelId,
  };

  player.on(AudioPlayerStatus.Idle, () => {
    if (state.ffmpegProcess) {
      try {
        state.ffmpegProcess.kill();
      } catch {}
      state.ffmpegProcess = null;
    }

    if (state.loop && state.currentSong) {
      playAudioStream(guild, state.channelId, state.currentSong.url, state.currentSong.requestedBy, state.currentSong.title);
    } else {
      state.currentSong = null;
    }
  });

  player.on("error", (error) => {
    console.error(`[MUSIC ENGINE] Player error in ${guild.id}:`, error.message);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      try {
        connection.destroy();
      } catch {}
      guildVoiceStates.delete(guild.id);
    }
  });

  guildVoiceStates.set(guild.id, state);
  return state;
}

export async function playAudioStream(
  guild: any,
  channelId: string,
  queryOrUrl: string,
  requestedBy: string,
  forceTitle?: string
): Promise<{ success: boolean; track?: any; error?: string }> {
  try {
    const track = await resolveTrack(queryOrUrl);
    if (!track) {
      return { success: false, error: `Could not locate playable audio for: \`${queryOrUrl}\`` };
    }

    const state = getOrCreateGuildVoice(guild, channelId);

    // Ensure connection is fully ready before streaming
    if (state.connection.state.status !== VoiceConnectionStatus.Ready) {
      try {
        await entersState(state.connection, VoiceConnectionStatus.Ready, 20_000);
      } catch {
        console.warn("[MUSIC ENGINE] Connection ready wait timeout, proceeding anyway");
      }
    }

    // Clean previous ffmpeg process if running
    if (state.ffmpegProcess) {
      try {
        state.ffmpegProcess.kill();
      } catch {}
      state.ffmpegProcess = null;
    }

    let resource: AudioResource;

    if (track.isRadio || track.url.endsWith(".mp3") || track.url.includes("stream.zeno.fm") || track.url.includes("nightride.fm") || track.url.includes("torontocast")) {
      // Spawn direct ffmpeg audio pipeline for radio / live mp3
      const ff = spawn(ffmpegPath as string, [
        "-reconnect", "1",
        "-reconnect_streamed", "1",
        "-reconnect_delay_max", "5",
        "-i", track.url,
        "-analyzeduration", "0",
        "-loglevel", "0",
        "-f", "s16le",
        "-ar", "48000",
        "-ac", "2",
        "pipe:1"
      ]);
      state.ffmpegProcess = ff;
      resource = createAudioResource(ff.stdout, {
        inputType: StreamType.Raw,
        inlineVolume: true,
      });
    } else {
      // Stream via play-dl
      await ensurePlayDlReady();
      const s = await play.stream(track.url);
      resource = createAudioResource(s.stream, {
        inputType: s.type,
        inlineVolume: true,
      });
    }

    resource.volume?.setVolume(state.volume);
    state.currentResource = resource;

    state.currentSong = {
      title: forceTitle || track.title,
      url: track.url,
      requestedBy,
      thumbnail: track.thumbnail,
      duration: track.duration,
    };

    state.player.play(resource);
    state.connection.subscribe(state.player);

    return { success: true, track: state.currentSong };
  } catch (err: any) {
    console.error("[MUSIC ENGINE] Play stream exception:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

export function pauseAudio(guildId: string): boolean {
  const state = guildVoiceStates.get(guildId);
  if (!state || !state.player) return false;
  return state.player.pause();
}

export function resumeAudio(guildId: string): boolean {
  const state = guildVoiceStates.get(guildId);
  if (!state || !state.player) return false;
  return state.player.unpause();
}

export function stopAudio(guildId: string): boolean {
  const state = guildVoiceStates.get(guildId);
  if (!state) return false;
  if (state.ffmpegProcess) {
    try {
      state.ffmpegProcess.kill();
    } catch {}
    state.ffmpegProcess = null;
  }
  state.player?.stop();
  state.currentSong = null;
  return true;
}

export function setVolume(guildId: string, percent: number): boolean {
  const state = guildVoiceStates.get(guildId);
  if (!state) return false;
  const clamped = Math.max(1, Math.min(150, percent));
  state.volume = clamped / 100;
  if (state.currentResource?.volume) {
    state.currentResource.volume.setVolume(state.volume);
  }
  return true;
}

export function toggleLoop(guildId: string): boolean | null {
  const state = guildVoiceStates.get(guildId);
  if (!state || !state.currentSong) return null;
  state.loop = !state.loop;
  return state.loop;
}

export function leaveVoice(guildId: string): boolean {
  const state = guildVoiceStates.get(guildId);
  if (!state) return false;
  if (state.ffmpegProcess) {
    try {
      state.ffmpegProcess.kill();
    } catch {}
    state.ffmpegProcess = null;
  }
  state.player?.stop();
  try {
    state.connection?.destroy();
  } catch {}
  guildVoiceStates.delete(guildId);
  return true;
}
