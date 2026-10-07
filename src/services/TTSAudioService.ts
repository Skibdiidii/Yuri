import { Readable } from 'stream';
import { createAudioResource, AudioResource, StreamType } from '@discordjs/voice';
import ffmpegStatic from 'ffmpeg-static';
import { LogService } from './LogService';

// Ensure FFMPEG_PATH is available globally for prism-media and @discordjs/voice
if (ffmpegStatic) {
  process.env.FFMPEG_PATH = ffmpegStatic;
}

export class TTSAudioService {
  private static readonly USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  private static ttsCache = new Map<string, { buffer: Buffer; timestamp: number }>();

  /**
   * Generates a 48kHz Stereo PCM WAV audio buffer matching Discord Voice specifications
   */
  public static generateSyntheticChimeBuffer(durationSeconds = 2.5): Buffer {
    const sampleRate = 48000;
    const numChannels = 2; // Stereo for Discord voice native compatibility
    const bitsPerSample = 16;
    const totalSamples = Math.floor(sampleRate * durationSeconds);
    const dataSize = totalSamples * numChannels * (bitsPerSample / 8);
    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF identifier
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // fmt subchunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
    buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // ByteRate
    buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // BlockAlign
    buffer.writeUInt16LE(bitsPerSample, 34);

    // data subchunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Synthesize pleasant voice notification harmonic tones (C5 -> E5 -> G5 major triad)
    const baseFreq = 523.25; // C5
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const freq = t < 0.7 ? baseFreq : t < 1.4 ? baseFreq * 1.25 : baseFreq * 1.5;
      const envelope = Math.exp(-2.5 * (t % 0.7));
      const sample = Math.sin(2 * Math.PI * freq * t) * envelope * 0.4;
      const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
      
      const offset = 44 + i * 4;
      buffer.writeInt16LE(intSample, offset);     // Left channel
      buffer.writeInt16LE(intSample, offset + 2); // Right channel
    }

    return buffer;
  }

  /**
   * Fetches TTS audio buffer from multi-tiered high-availability providers.
   */
  public static async getTTSBuffer(text: string, lang = 'en'): Promise<Buffer | null> {
    const cleanText = text.replace(/[*_#`~>]/g, '').trim();
    if (!cleanText) return null;

    const cacheKey = `${lang}:${cleanText.slice(0, 100)}`;
    const cached = this.ttsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return cached.buffer;
    }

    const truncated = cleanText.length > 200 ? cleanText.slice(0, 195) + '...' : cleanText;

    // --- TIER 1: Google Translate GTX Endpoint ---
    try {
      const gtxUrl = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${encodeURIComponent(
        lang
      )}&q=${encodeURIComponent(truncated)}`;

      const response = await fetch(gtxUrl, {
        headers: {
          'User-Agent': this.USER_AGENT,
          Accept: '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: 'https://translate.google.com/',
        },
        signal: AbortSignal.timeout(3500),
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > 200) {
          const buf = Buffer.from(arrayBuffer);
          this.ttsCache.set(cacheKey, { buffer: buf, timestamp: Date.now() });
          return buf;
        }
      }
    } catch {
      // Fall through to Tier 2
    }

    // --- TIER 2: Google Translate tw-ob Endpoint ---
    try {
      const twobUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(
        lang
      )}&q=${encodeURIComponent(truncated.slice(0, 150))}`;

      const response = await fetch(twobUrl, {
        headers: {
          'User-Agent': this.USER_AGENT,
          Accept: '*/*',
          Referer: 'https://translate.google.com/',
        },
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > 200) {
          const buf = Buffer.from(arrayBuffer);
          this.ttsCache.set(cacheKey, { buffer: buf, timestamp: Date.now() });
          return buf;
        }
      }
    } catch {
      // Fall through to Tier 3
    }

    // --- TIER 3: Streamlabs AWS Polly Voice Endpoint ---
    try {
      const pollyRes = await fetch(
        `https://streamlabs.com/polly/talk?voice=Brian&text=${encodeURIComponent(truncated)}`,
        {
          headers: {
            'User-Agent': this.USER_AGENT,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(3500),
        }
      );

      if (pollyRes.ok) {
        const pollyData: any = await pollyRes.json();
        if (pollyData && pollyData.speak_url) {
          const audioRes = await fetch(pollyData.speak_url, {
            headers: { 'User-Agent': this.USER_AGENT },
            signal: AbortSignal.timeout(4000),
          });
          if (audioRes.ok) {
            const arr = await audioRes.arrayBuffer();
            if (arr.byteLength > 100) {
              const buf = Buffer.from(arr);
              this.ttsCache.set(cacheKey, { buffer: buf, timestamp: Date.now() });
              return buf;
            }
          }
        }
      }
    } catch {
      // Fall through to Tier 4
    }

    // --- TIER 4: Infallible 48kHz Stereo Synthetic Harmonic Audio ---
    LogService.info('TTSAudioService', 'Generating synthetic voice notification audio fallback');
    const fallbackBuf = this.generateSyntheticChimeBuffer(Math.max(2, Math.min(5, Math.ceil(cleanText.length / 15))));
    return fallbackBuf;
  }

  /**
   * Creates an audio resource for @discordjs/voice with volume adjustment.
   */
  public static async createTTSResource(
    text: string,
    volume = 1.0,
    lang = 'en'
  ): Promise<AudioResource | null> {
    try {
      const buffer = await this.getTTSBuffer(text, lang);
      if (buffer && buffer.length > 0) {
        const stream = Readable.from(buffer);
        const resource = createAudioResource(stream, {
          inputType: StreamType.Arbitrary,
          inlineVolume: true,
        });
        resource.volume?.setVolume(volume);
        return resource;
      }

      // Emergency synthetic buffer fallback
      const fallbackBuffer = this.generateSyntheticChimeBuffer(3);
      const stream = Readable.from(fallbackBuffer);
      const resource = createAudioResource(stream, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      });
      resource.volume?.setVolume(volume);
      return resource;
    } catch (err) {
      LogService.error('TTSAudioService', 'Failed to create TTS audio resource', err);
      return null;
    }
  }

  /**
   * Generates public TTS URL for web browser audio playback.
   */
  public static getBrowserTTSUrl(text: string, lang = 'en'): string {
    const clean = text.replace(/[*_#`~>]/g, '').trim();
    return `/api/tts?text=${encodeURIComponent(clean)}&lang=${encodeURIComponent(lang)}`;
  }
}
