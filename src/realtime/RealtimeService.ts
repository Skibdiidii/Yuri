import { LogService } from '../services/LogService';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class RealtimeService {
  private static instance: RealtimeService;
  private cache = new Map<string, CacheEntry<unknown>>();

  private constructor() {
    setInterval(() => this.cleanCache(), 60000).unref();
  }

  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [k, v] of this.cache.entries()) {
      if (now > v.expiresAt) this.cache.delete(k);
    }
  }

  /**
   * Universal fetcher with timeout, retries, and short-term caching
   */
  public async fetchWithCache<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    ttlSeconds = 30
  ): Promise<T> {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }

    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const data = await fetchFn();
        if (data !== undefined && data !== null) {
          this.cache.set(cacheKey, {
            data,
            expiresAt: Date.now() + ttlSeconds * 1000,
          });
          return data;
        }
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    LogService.warn('RealtimeService', `Failed to fetch live data for ${cacheKey}`, lastErr);
    throw new Error('Live data is temporarily unavailable. Please try again later.');
  }

  // ==========================================
  // WEATHER PROVIDERS (wttr.in / open-meteo)
  // ==========================================
  public async getWeather(city: string) {
    return this.fetchWithCache(`weather:${city.toLowerCase()}`, async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Harumi-Discord-Bot/1.0' },
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
      const json = (await res.json()) as any;
      const current = json.current_condition?.[0];
      const area = json.nearest_area?.[0];
      const weather = json.weather?.[0];

      return {
        city: area?.areaName?.[0]?.value || city,
        country: area?.country?.[0]?.value || '',
        tempC: current?.temp_C || '0',
        tempF: current?.temp_F || '32',
        feelsLikeC: current?.FeelsLikeC || '0',
        feelsLikeF: current?.FeelsLikeF || '32',
        condition: current?.weatherDesc?.[0]?.value || 'Clear',
        humidity: current?.humidity || '0',
        windKmph: current?.windspeedKmph || '0',
        windMiles: current?.windspeedMiles || '0',
        uvIndex: current?.uvIndex || '0',
        visibilityKm: current?.visibility || '10',
        sunrise: weather?.astronomy?.[0]?.sunrise || '06:00 AM',
        sunset: weather?.astronomy?.[0]?.sunset || '06:00 PM',
        hourly: weather?.hourly || [],
        daily: json.weather || [],
        retrievedAt: new Date().toISOString(),
      };
    }, 60);
  }

  // ==========================================
  // CRYPTO & FINANCE (CoinGecko & Frankfurter)
  // ==========================================
  public async getCryptoData(coinId: string): Promise<any> {
    const normalized = coinId.toLowerCase().trim();
    return this.fetchWithCache(`crypto:${normalized}`, async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(
          normalized
        )}&sparkline=false`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Crypto fetch failed: ${res.status}`);
      const data = (await res.json()) as any[];
      if (!data || data.length === 0) {
        // Try searching symbol
        const searchRes = await fetch(
          `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(normalized)}`
        );
        const searchData = (await searchRes.json()) as any;
        const first = searchData?.coins?.[0]?.id;
        if (!first) throw new Error(`Crypto not found: ${coinId}`);
        return this.getCryptoData(first);
      }
      const coin = data[0];
      return {
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        currentPrice: coin.current_price,
        high24h: coin.high_24h,
        low24h: coin.low_24h,
        priceChange24h: coin.price_change_percentage_24h,
        marketCap: coin.market_cap,
        totalVolume: coin.total_volume,
        retrievedAt: new Date().toISOString(),
      };
    }, 30);
  }

  public async getCurrencyRates(from = 'USD') {
    return this.fetchWithCache(`rates:${from.toUpperCase()}`, async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(from)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Currency fetch failed: ${res.status}`);
      const json = (await res.json()) as any;
      return {
        base: json.base,
        date: json.date,
        rates: json.rates,
        retrievedAt: new Date().toISOString(),
      };
    }, 120);
  }

  // ==========================================
  // GAMING DATA (Minecraft / Roblox / Steam)
  // ==========================================
  public async getMinecraftServer(address: string) {
    return this.fetchWithCache(`mc:${address.toLowerCase()}`, async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(address)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Minecraft query failed: ${res.status}`);
      const json = (await res.json()) as any;
      return {
        online: json.online,
        ip: json.ip,
        port: json.port,
        hostname: json.hostname || address,
        version: json.version || 'Unknown',
        playersOnline: json.players?.online || 0,
        playersMax: json.players?.max || 0,
        motd: json.motd?.clean?.join(' ') || 'No MOTD',
        retrievedAt: new Date().toISOString(),
      };
    }, 30);
  }

  public async getRobloxUser(username: string) {
    return this.fetchWithCache(`roblox:user:${username.toLowerCase()}`, async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('https://users.roblox.com/v1/usernames/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Roblox query failed: ${res.status}`);
      const json = (await res.json()) as any;
      const user = json.data?.[0];
      if (!user) throw new Error('Roblox user not found');
      return {
        id: user.id,
        name: user.name,
        displayName: user.displayName,
        hasVerifiedBadge: user.hasVerifiedBadge,
        retrievedAt: new Date().toISOString(),
      };
    }, 60);
  }

  public async getSteamApp(appId: string) {
    return this.fetchWithCache(`steam:app:${appId}`, async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(appId)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Steam fetch failed: ${res.status}`);
      const json = (await res.json()) as any;
      const app = json[appId]?.data;
      if (!app) throw new Error('Steam App ID not found');

      // Fetch player count
      const pRes = await fetch(`https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`);
      const pJson = (await pRes.json()) as any;
      const playerCount = pJson?.response?.player_count || 0;

      return {
        id: app.steam_appid,
        name: app.name,
        type: app.type,
        isFree: app.is_free,
        shortDesc: app.short_description,
        headerImage: app.header_image,
        developers: app.developers || [],
        currentPlayers: playerCount,
        retrievedAt: new Date().toISOString(),
      };
    }, 60);
  }

  // ==========================================
  // NEWS (Live RSS or News API)
  // ==========================================
  public async getLiveNews(topic = 'general') {
    return this.fetchWithCache(`news:${topic.toLowerCase()}`, async () => {
      // Using BBC / Reddit worldnews / Google News live RSS parsed to JSON
      const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
        `https://feeds.bbci.co.uk/news/${topic === 'tech' ? 'technology' : topic === 'gaming' ? 'entertainment_and_arts' : 'world'}/rss.xml`
      )}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`News query failed: ${res.status}`);
      const json = (await res.json()) as any;
      const items = json.items || [];
      return items.slice(0, 5).map((item: any) => ({
        title: item.title,
        source: 'BBC News',
        pubDate: item.pubDate,
        link: item.link,
        description: item.description?.replace(/<[^>]*>?/gm, '').trim() || '',
      }));
    }, 120);
  }

  // ==========================================
  // WEB & NETWORK (IP, DNS, Discord Status, HTTP)
  // ==========================================
  public async getIpInfo(ip: string) {
    return this.fetchWithCache(`ip:${ip}`, async () => {
      const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
      if (!res.ok) throw new Error('IP query failed');
      const data = (await res.json()) as any;
      if (!data.success) throw new Error(data.message || 'Invalid IP address');
      return {
        ip: data.ip,
        type: data.type,
        continent: data.continent,
        country: data.country,
        region: data.region,
        city: data.city,
        isp: data.connection?.isp,
        timezone: data.timezone?.id,
        retrievedAt: new Date().toISOString(),
      };
    }, 120);
  }

  public async getDiscordStatus() {
    return this.fetchWithCache('discord:status', async () => {
      const res = await fetch('https://discordstatus.com/api/v2/summary.json');
      if (!res.ok) throw new Error('Discord status query failed');
      const data = (await res.json()) as any;
      return {
        indicator: data.status?.indicator || 'none',
        description: data.status?.description || 'All Systems Operational',
        components: (data.components || []).slice(0, 8).map((c: any) => ({
          name: c.name,
          status: c.status,
        })),
        updatedAt: data.page?.updated_at || new Date().toISOString(),
      };
    }, 60);
  }

  public async getDictionaryDefinition(word: string) {
    return this.fetchWithCache(`dict:${word.toLowerCase()}`, async () => {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (!res.ok) throw new Error(`Word not found: ${word}`);
      const json = (await res.json()) as any[];
      const entry = json[0];
      return {
        word: entry.word,
        phonetic: entry.phonetic || '',
        meanings: entry.meanings || [],
        retrievedAt: new Date().toISOString(),
      };
    }, 300);
  }

  public async checkWebsite(url: string) {
    const formatted = url.startsWith('http') ? url : `https://${url}`;
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(formatted, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeout);
      return {
        url: formatted,
        status: res.status,
        statusText: res.statusText,
        online: res.ok || res.status < 500,
        latencyMs: Date.now() - start,
        retrievedAt: new Date().toISOString(),
      };
    } catch {
      return {
        url: formatted,
        status: 0,
        statusText: 'Unreachable / Timeout',
        online: false,
        latencyMs: Date.now() - start,
        retrievedAt: new Date().toISOString(),
      };
    }
  }
}

export const realtimeService = RealtimeService.getInstance();
