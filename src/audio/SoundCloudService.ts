import { LogService } from '../services/LogService';

export interface SoundCloudTrack {
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
  energy?: number;
  isSnippet?: boolean;
}

export class SoundCloudService {
  private static instance: SoundCloudService;
  // Multiple verified working SoundCloud v2 client IDs
  private clientIds: string[] = [
    'pmagYZKQF6mRtNmtRzPkXSQJ76jYHLN8',
    'b44bb0b51010372df3b050cfdc699052',
    'iZIs9mchVcX5lhVR1HNjwtAwyoUlvKQX',
    'a3e059563d7fd3372b49b37f00a00bcf',
  ];
  private currentClientIdIndex = 0;
  private clientIdExpiresAt: number = Date.now() + 12 * 60 * 60 * 1000;
  private isRefreshingClientId = false;

  private constructor() {
    this.refreshClientId().catch(() => {});
  }

  public static getInstance(): SoundCloudService {
    if (!SoundCloudService.instance) {
      SoundCloudService.instance = new SoundCloudService();
    }
    return SoundCloudService.instance;
  }

  public getActiveClientId(): string {
    return this.clientIds[this.currentClientIdIndex] || 'pmagYZKQF6mRtNmtRzPkXSQJ76jYHLN8';
  }

  /**
   * Dynamically retrieves live SoundCloud client_id by scraping soundcloud.com script assets
   */
  public async refreshClientId(): Promise<string> {
    if (this.isRefreshingClientId) return this.getActiveClientId();
    this.isRefreshingClientId = true;

    try {
      const html = await fetch('https://soundcloud.com', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(6000),
      }).then((r) => r.text());

      const scriptUrls = html.match(/https:\/\/a-v2\.sndcdn\.com\/assets\/[a-zA-Z0-9-]+\.js/g) || [];
      for (const scriptUrl of scriptUrls.slice(-8)) {
        try {
          const js = await fetch(scriptUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            signal: AbortSignal.timeout(4000),
          }).then((r) => r.text());

          const match = js.match(/client_id[:=]"([a-zA-Z0-9]{32})"/);
          if (match && match[1]) {
            const freshKey = match[1];
            if (!this.clientIds.includes(freshKey)) {
              this.clientIds.unshift(freshKey);
            }
            this.currentClientIdIndex = 0;
            this.clientIdExpiresAt = Date.now() + 12 * 60 * 60 * 1000;
            LogService.info('SoundCloud', `Acquired active SoundCloud Client ID: ${freshKey}`);
            break;
          }
        } catch {}
      }
    } catch (err) {
      LogService.warn('SoundCloud', `Could not scrape client_id, rotating through known pool: ${this.getActiveClientId()}`, err);
      this.currentClientIdIndex = (this.currentClientIdIndex + 1) % this.clientIds.length;
    } finally {
      this.isRefreshingClientId = false;
    }

    return this.getActiveClientId();
  }

  public async getClientId(): Promise<string> {
    if (Date.now() > this.clientIdExpiresAt) {
      this.refreshClientId().catch(() => {});
    }
    return this.getActiveClientId();
  }

  /**
   * Format ms duration to mm:ss or hh:mm:ss
   */
  public formatDuration(ms: number): { formatted: string; seconds: number } {
    const totalSeconds = Math.max(1, Math.round(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let formatted = '';
    if (hours > 0) {
      formatted = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    return { formatted, seconds: totalSeconds };
  }

  /**
   * Search real tracks using SoundCloud v2 Search API.
   * Filters and prioritizes full non-snipped progressive MP3 streams.
   */
  public async searchTracks(query: string, requestedBy: string = 'User', limit: number = 10): Promise<SoundCloudTrack[]> {
    const cleanQuery = query.replace(/<|>|`/g, '').trim();
    if (!cleanQuery) return [];

    let clientId = await this.getClientId();
    const url = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(cleanQuery)}&client_id=${clientId}&limit=${Math.max(limit * 2, 12)}`;

    try {
      let res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json, text/javascript, */*; q=0.01',
        },
        signal: AbortSignal.timeout(7000),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          LogService.warn('SoundCloud', `Received ${res.status}, rotating client_id and retrying...`);
          await this.refreshClientId();
          clientId = this.getActiveClientId();
          const retryUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(cleanQuery)}&client_id=${clientId}&limit=${Math.max(limit * 2, 12)}`;
          res = await fetch(retryUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Accept: 'application/json, text/javascript, */*; q=0.01',
            },
            signal: AbortSignal.timeout(7000),
          });
        }
      }

      if (!res.ok) {
        throw new Error(`SoundCloud search returned HTTP ${res.status}`);
      }

      const data: any = await res.json();
      const collection = data.collection || [];
      if (collection.length === 0) {
        // Retry with generic music query if exact query had no results
        return this.searchPopularFallbacks(cleanQuery, requestedBy, limit);
      }

      const parsedTracks = await this.parseTracksCollection(collection, requestedBy, limit);
      if (parsedTracks.length > 0) {
        return parsedTracks;
      }

      return this.searchPopularFallbacks(cleanQuery, requestedBy, limit);
    } catch (err) {
      LogService.error('SoundCloud', `Failed searching tracks for "${cleanQuery}"`, err);
      return this.searchPopularFallbacks(cleanQuery, requestedBy, limit);
    }
  }

  /**
   * Resolves popular real tracks on SoundCloud if a query yielded zero matches
   */
  private async searchPopularFallbacks(originalQuery: string, requestedBy: string, limit: number): Promise<SoundCloudTrack[]> {
    try {
      const clientId = await this.getClientId();
      const fallbackUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent('ncs chill')}&client_id=${clientId}&limit=${limit}`;
      const res = await fetch(fallbackUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data: any = await res.json();
        const tracks = await this.parseTracksCollection(data.collection || [], requestedBy, limit);
        if (tracks.length > 0) return tracks;
      }
    } catch {}

    // Minimal valid structure if offline
    return [];
  }

  /**
   * Resolves a direct SoundCloud track URL
   */
  public async resolveTrackUrl(trackUrl: string, requestedBy: string = 'User'): Promise<SoundCloudTrack | null> {
    const clientId = await this.getClientId();
    const url = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(trackUrl)}&client_id=${clientId}`;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) return null;
      const item: any = await res.json();
      if (!item || !item.id) return null;

      const streamUrl = await this.resolveAudioStreamUrl(item.media?.transcodings || []);
      const { formatted, seconds } = this.formatDuration(item.duration || 180000);

      let thumbnail = item.artwork_url || item.user?.avatar_url || '';
      if (thumbnail) {
        thumbnail = thumbnail.replace('-large', '-t500x500');
      } else {
        thumbnail = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
      }

      return {
        id: String(item.id),
        title: item.title,
        artist: item.user?.username || 'SoundCloud Artist',
        url: item.permalink_url || trackUrl,
        duration: formatted,
        durationSeconds: seconds,
        thumbnail,
        requestedBy,
        genre: item.genre || 'SoundCloud',
        energy: Math.min(10, Math.max(1, Math.round(((item.playback_count || 1000) % 10) + 1))),
        audioStreamUrl: streamUrl || undefined,
        isSnippet: streamUrl?.includes('/preview/') || false,
      };
    } catch (err) {
      LogService.error('SoundCloud', `Failed to resolve URL: ${trackUrl}`, err);
      return null;
    }
  }

  /**
   * Resolves progressive MP3 or HLS transcodings to direct CloudFront audio stream URL.
   * Strictly prioritizes non-snipped full-length streams.
   */
  public async resolveAudioStreamUrl(transcodings: any[]): Promise<string | null> {
    if (!transcodings || transcodings.length === 0) return null;

    // Prioritize:
    // 1. Non-snipped progressive MP3
    // 2. Any progressive MP3
    // 3. Non-snipped HLS
    // 4. Any HLS
    const nonSnippedProgressive = transcodings.filter((t) => !t.snipped && t.format?.protocol === 'progressive');
    const anyProgressive = transcodings.filter((t) => t.format?.protocol === 'progressive');
    const nonSnippedHls = transcodings.filter((t) => !t.snipped && t.format?.protocol === 'hls');
    const anyHls = transcodings.filter((t) => t.format?.protocol === 'hls');

    const orderedCandidates = [
      ...nonSnippedProgressive,
      ...anyProgressive,
      ...nonSnippedHls,
      ...anyHls,
    ];

    const clientId = await this.getClientId();

    for (const target of orderedCandidates) {
      if (!target || !target.url) continue;
      const mediaApiUrl = `${target.url}${target.url.includes('?') ? '&' : '?'}client_id=${clientId}`;

      try {
        const res = await fetch(mediaApiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'application/json, text/javascript, */*; q=0.01',
          },
          signal: AbortSignal.timeout(4500),
        });

        if (res.ok) {
          const data: any = await res.json();
          if (data && data.url) {
            return data.url;
          }
        }
      } catch {}
    }

    return null;
  }

  /**
   * Obtains a fresh live stream URL for a track right before playing.
   * Ensures AWS CloudFront signed signature hasn't expired.
   */
  public async getFreshStreamUrl(track: SoundCloudTrack): Promise<string | null> {
    // If we already have a streamUrl, check if it's still alive with a quick HEAD request
    if (track.audioStreamUrl && track.audioStreamUrl.startsWith('http')) {
      try {
        const headRes = await fetch(track.audioStreamUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000),
        });
        if (headRes.ok) {
          return track.audioStreamUrl;
        }
      } catch {}
    }

    // Otherwise, resolve fresh stream from track URL or ID
    if (track.url && track.url.includes('soundcloud.com')) {
      const refreshed = await this.resolveTrackUrl(track.url, track.requestedBy);
      if (refreshed?.audioStreamUrl) {
        track.audioStreamUrl = refreshed.audioStreamUrl;
        return refreshed.audioStreamUrl;
      }
    }

    return null;
  }

  private async parseTracksCollection(items: any[], requestedBy: string, limit: number = 8): Promise<SoundCloudTrack[]> {
    const tracks: SoundCloudTrack[] = [];

    // Separate full (non-snipped) tracks from preview-only tracks
    const fullItems: any[] = [];
    const snippedItems: any[] = [];

    for (const item of items) {
      if (!item || !item.id || !item.title) continue;
      const hasFullProgressive = (item.media?.transcodings || []).some(
        (t: any) => !t.snipped && t.format?.protocol === 'progressive'
      );
      if (hasFullProgressive) {
        fullItems.push(item);
      } else {
        snippedItems.push(item);
      }
    }

    // Prioritize full tracks first
    const sortedItems = [...fullItems, ...snippedItems];

    for (const item of sortedItems) {
      if (tracks.length >= limit) break;

      const { formatted, seconds } = this.formatDuration(item.duration || 180000);
      let thumbnail = item.artwork_url || item.user?.avatar_url || '';
      if (thumbnail) {
        thumbnail = thumbnail.replace('-large', '-t500x500');
      } else {
        thumbnail = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
      }

      // Resolve live stream URL
      const streamUrl = await this.resolveAudioStreamUrl(item.media?.transcodings || []);

      tracks.push({
        id: String(item.id),
        title: item.title,
        artist: item.user?.username || 'SoundCloud Artist',
        url: item.permalink_url || `https://soundcloud.com/tracks/${item.id}`,
        duration: formatted,
        durationSeconds: seconds,
        thumbnail,
        requestedBy,
        genre: item.genre || 'SoundCloud Track',
        energy: Math.min(10, Math.max(1, Math.round(((item.playback_count || 1000) % 10) + 1))),
        audioStreamUrl: streamUrl || undefined,
        isSnippet: streamUrl?.includes('/preview/') || false,
      });
    }

    return tracks;
  }
}

export const soundCloudService = SoundCloudService.getInstance();

