import React, { useState, useEffect, useRef } from 'react';
import { 
  Music, 
  Code, 
  Gamepad2, 
  Tv, 
  Radio, 
  Play, 
  Pause, 
  RefreshCw, 
  ExternalLink, 
  Check, 
  Sparkles, 
  Search, 
  Zap, 
  Clock, 
  Layers, 
  Sliders, 
  Volume2, 
  Disc, 
  Globe 
} from 'lucide-react';
import { RpcConfig } from '../types';

interface AppPreset {
  id: string;
  name: string;
  category: 'music' | 'dev' | 'gaming' | 'media';
  iconUrl: string;
  badge: string;
  defaultConfig: {
    applicationId: string;
    name: string;
    details: string;
    state: string;
    largeImageKey: string;
    largeImageText: string;
    smallImageKey?: string;
    smallImageText?: string;
    type?: string;
    button1Label?: string;
    button1Url?: string;
    button2Label?: string;
    button2Url?: string;
  };
}

const APP_PRESETS: AppPreset[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    category: 'music',
    badge: 'Real Music Sync',
    iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/spotify.png',
    defaultConfig: {
      applicationId: '1015931589851959326',
      name: 'Spotify',
      details: 'Starboy',
      state: 'The Weeknd • Daft Punk',
      largeImageKey: 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452',
      largeImageText: 'Starboy (Deluxe)',
      smallImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/spotify.png',
      smallImageText: 'Listening on Spotify',
      type: 'LISTENING',
      button1Label: 'Play on Spotify',
      button1Url: 'https://open.spotify.com'
    }
  },
  {
    id: 'youtube-music',
    name: 'YouTube Music',
    category: 'music',
    badge: 'Music Stream',
    iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/youtube-music.png',
    defaultConfig: {
      applicationId: '1015931589851959326',
      name: 'YouTube Music',
      details: 'Blinding Lights',
      state: 'The Weeknd • After Hours',
      largeImageKey: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
      largeImageText: 'YouTube Music High Fidelity',
      smallImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/youtube-music.png',
      smallImageText: 'YouTube Music',
      type: 'LISTENING',
      button1Label: 'Listen on YT Music',
      button1Url: 'https://music.youtube.com'
    }
  },
  {
    id: 'apple-music',
    name: 'Apple Music',
    category: 'music',
    badge: 'Lossless Audio',
    iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/apple-music.png',
    defaultConfig: {
      applicationId: '1015931589851959326',
      name: 'Apple Music',
      details: 'Midnight City',
      state: 'M83 • Hurry Up, We\'re Dreaming',
      largeImageKey: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
      largeImageText: 'Apple Music Spatial Audio',
      smallImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/apple-music.png',
      smallImageText: 'Apple Music Lossless',
      type: 'LISTENING',
      button1Label: 'Apple Music',
      button1Url: 'https://music.apple.com'
    }
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    category: 'music',
    badge: 'Indie & Remixes',
    iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/soundcloud.png',
    defaultConfig: {
      applicationId: '1015931589851959326',
      name: 'SoundCloud',
      details: 'Late Night Synthwave Mix',
      state: 'Cyberpunk Radio • 128 BPM',
      largeImageKey: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      largeImageText: 'SoundCloud Underground',
      smallImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/soundcloud.png',
      smallImageText: 'SoundCloud Web',
      type: 'LISTENING',
      button1Label: 'Open SoundCloud',
      button1Url: 'https://soundcloud.com'
    }
  },
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    category: 'dev',
    badge: 'Code Editor',
    iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/visual-studio-code.png',
    defaultConfig: {
      applicationId: '383226320970055681',
      name: 'Visual Studio Code',
      details: 'Workspace: Yuri-Core-Architecture',
      state: 'Editing: server.ts [TypeScript]',
      largeImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/visual-studio-code.png',
      largeImageText: 'Visual Studio Code v1.94',
      smallImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/typescript.png',
      smallImageText: 'TypeScript • 0 errors',
      type: 'PLAYING',
      button1Label: 'View Repository',
      button1Url: 'https://github.com'
    }
  },
  {
    id: 'intellij',
    name: 'IntelliJ IDEA',
    category: 'dev',
    badge: 'JetBrains IDE',
    iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/intellij-idea.png',
    defaultConfig: {
      applicationId: '1015931589851959326',
      name: 'IntelliJ IDEA Ultimate',
      details: 'Project: backend-microservices',
      state: 'Refactoring: SecurityGateway.kt',
      largeImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/intellij-idea.png',
      largeImageText: 'IntelliJ IDEA 2026',
      smallImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/kotlin.png',
      smallImageText: 'Kotlin 2.0',
      type: 'PLAYING'
    }
  },
  {
    id: 'neovim',
    name: 'Neovim',
    category: 'dev',
    badge: 'Terminal Editor',
    iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/neovim.png',
    defaultConfig: {
      applicationId: '1015931589851959326',
      name: 'Neovim (Lua)',
      details: 'init.lua — 2,410 lines',
      state: 'Mode: NORMAL • Treesitter Active',
      largeImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/neovim.png',
      largeImageText: 'Neovim 0.10',
      smallImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/lua.png',
      smallImageText: 'Lua 5.4',
      type: 'PLAYING'
    }
  },
  {
    id: 'blender',
    name: 'Blender 3D',
    category: 'dev',
    badge: '3D & VFX',
    iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/blender.png',
    defaultConfig: {
      applicationId: '1015931589851959326',
      name: 'Blender 3D',
      details: 'Cyberpunk_City_Scene.blend',
      state: 'Cycles GPU Render • Sample 2048/4096',
      largeImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/blender.png',
      largeImageText: 'Blender 4.2 LTS',
      smallImageKey: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      smallImageText: 'Raytracing Active',
      type: 'PLAYING'
    }
  },
  {
    id: 'roblox',
    name: 'Roblox',
    category: 'gaming',
    badge: 'Multiplayer Gaming',
    iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/roblox.png',
    defaultConfig: {
      applicationId: '1015931589851959326',
      name: 'Roblox',
      details: 'Playing: Blox Fruits [Update 24]',
      state: 'In Sea 3 • Level Max • Server #48',
      largeImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/roblox.png',
      largeImageText: 'Roblox Player Client',
      smallImageKey: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80',
      smallImageText: 'In Game',
      type: 'PLAYING',
      button1Label: 'Join Game',
      button1Url: 'https://www.roblox.com'
    }
  },
  {
    id: 'minecraft',
    name: 'Minecraft',
    category: 'gaming',
    badge: 'Sandbox Game',
    iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/minecraft.png',
    defaultConfig: {
      applicationId: '1015931589851959326',
      name: 'Minecraft 1.21',
      details: 'Hardcore Survival World',
      state: 'Day 418 • Nether Fortress Exploration',
      largeImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/minecraft.png',
      largeImageText: 'Minecraft Java Edition',
      smallImageKey: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
      smallImageText: 'Hardcore Mode',
      type: 'PLAYING'
    }
  },
  {
    id: 'valorant',
    name: 'VALORANT',
    category: 'gaming',
    badge: 'Tactical Shooter',
    iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/valorant.png',
    defaultConfig: {
      applicationId: '1015931589851959326',
      name: 'VALORANT',
      details: 'Competitive: Haven (11 - 9)',
      state: 'Playing Jett • Radiant Rank',
      largeImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/valorant.png',
      largeImageText: 'VALORANT Riot Games',
      smallImageKey: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=200&auto=format&fit=crop&q=80',
      smallImageText: 'In Match',
      type: 'PLAYING'
    }
  },
  {
    id: 'cs2',
    name: 'Counter-Strike 2',
    category: 'gaming',
    badge: 'Source 2 FPS',
    iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/counter-strike.png',
    defaultConfig: {
      applicationId: '1015931589851959326',
      name: 'Counter-Strike 2',
      details: 'Premier Matchmaking: Mirage',
      state: 'Rating: 21,500 CS Rating',
      largeImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/counter-strike.png',
      largeImageText: 'Valve CS2',
      smallImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/steam.png',
      smallImageText: 'Steam Verified',
      type: 'PLAYING'
    }
  },
  {
    id: 'twitch',
    name: 'Twitch',
    category: 'media',
    badge: 'Live Streaming',
    iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/twitch.png',
    defaultConfig: {
      applicationId: '1015931589851959326',
      name: 'Twitch',
      details: 'Streaming: Ranked Matchmaking & Chill',
      state: 'Category: Just Chatting • 1,420 Viewers',
      largeImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/twitch.png',
      largeImageText: 'Twitch Live Stream',
      smallImageKey: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80',
      smallImageText: 'Broadcasting',
      type: 'STREAMING',
      button1Label: 'Watch Live Stream',
      button1Url: 'https://twitch.tv'
    }
  },
  {
    id: 'netflix',
    name: 'Netflix',
    category: 'media',
    badge: '4K Cinema',
    iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/netflix.png',
    defaultConfig: {
      applicationId: '1015931589851959326',
      name: 'Netflix',
      details: 'Arcane: League of Legends',
      state: 'Season 2 Episode 6 • 4K Dolby Atmos',
      largeImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/netflix.png',
      largeImageText: 'Netflix Original Series',
      smallImageKey: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=80',
      smallImageText: 'Watching Movie',
      type: 'WATCHING'
    }
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    category: 'media',
    badge: 'Anime Stream',
    iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/crunchyroll.png',
    defaultConfig: {
      applicationId: '1015931589851959326',
      name: 'Crunchyroll',
      details: 'Solo Leveling: Arise',
      state: 'Episode 12 (Simulcast HD)',
      largeImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/crunchyroll.png',
      largeImageText: 'Crunchyroll Premium',
      smallImageKey: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&auto=format&fit=crop&q=80',
      smallImageText: 'Anime Streaming',
      type: 'WATCHING',
      button1Label: 'Watch on Crunchyroll',
      button1Url: 'https://crunchyroll.com'
    }
  }
];

interface AppDetectionRpcProps {
  onApplyPreset: (config: RpcConfig) => void;
  onInstantUpdate: (config: RpcConfig) => Promise<void>;
  token: string;
}

export default function AppDetectionRpc({ onApplyPreset, onInstantUpdate, token }: AppDetectionRpcProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'music' | 'dev' | 'gaming' | 'media'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePreset, setActivePreset] = useState<AppPreset>(APP_PRESETS[0]);
  const [customForm, setCustomForm] = useState<AppPreset['defaultConfig']>({ ...APP_PRESETS[0].defaultConfig });

  const [lastFmUser, setLastFmUser] = useState(() => localStorage.getItem('rpc_lastfm_user') || '');
  const [isAutoSyncing, setIsAutoSyncing] = useState(() => localStorage.getItem('rpc_auto_sync') === 'true');
  const [lastFmStatus, setLastFmStatus] = useState('');
  const [currentScrobble, setCurrentScrobble] = useState<{
    track?: string;
    artist?: string;
    album?: string;
    image?: string;
    nowPlaying?: boolean;
  } | null>(null);
  const [syncCount, setSyncCount] = useState(0);
  const [applying, setApplying] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const pollerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setCustomForm({ ...activePreset.defaultConfig });
  }, [activePreset]);

  const fetchLastFmTrack = async (user: string): Promise<boolean> => {
    if (!user.trim()) {
      setLastFmStatus('Enter a Last.fm username to detect active music');
      return false;
    }
    try {
      setLastFmStatus('Detecting active music via Last.fm API...');
      const apiKey = '943e8ea0c5e7b233a7f8ca31998fdf59';
      const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(user.trim())}&api_key=${apiKey}&format=json&limit=1`;
      
      const res = await fetch(url);
      if (!res.ok) {
        setLastFmStatus('Last.fm user not found or API rate limited.');
        return false;
      }
      const data = await res.json();
      const track = data?.recenttracks?.track?.[0] || data?.recenttracks?.track;
      if (!track) {
        setLastFmStatus('No recent tracks found for this user.');
        return false;
      }

      const isPlaying = Boolean(track['@attr']?.nowplaying === 'true');
      const trackName = track.name || 'Unknown Track';
      const artistName = track.artist?.['#text'] || track.artist?.name || 'Unknown Artist';
      const albumName = track.album?.['#text'] || 'Single';
      const imgUrl = (Array.isArray(track.image) ? track.image[track.image.length - 1]?.['#text'] : '') || 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/spotify.png';

      setCurrentScrobble({
        track: trackName,
        artist: artistName,
        album: albumName,
        image: imgUrl,
        nowPlaying: isPlaying
      });

      const updatedConfig: RpcConfig = {
        applicationId: '1015931589851959326',
        name: 'Spotify',
        details: trackName,
        state: `${artistName} • ${albumName}`,
        largeImageKey: imgUrl,
        largeImageText: albumName,
        smallImageKey: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/spotify.png',
        smallImageText: isPlaying ? 'Listening Live' : 'Scrobbled via Last.fm',
        type: 'LISTENING',
        startTimestamp: Date.now().toString(),
        button1Label: 'Listen on Spotify',
        button1Url: `https://open.spotify.com/search/${encodeURIComponent(trackName + ' ' + artistName)}`
      };

      setCustomForm(updatedConfig as any);

      if (isAutoSyncing && token) {
        await onInstantUpdate(updatedConfig);
        setSyncCount(c => c + 1);
        setLastFmStatus(`⚡ Live Synced: "${trackName}" by ${artistName}`);
      } else {
        setLastFmStatus(`Detected: "${trackName}" by ${artistName} (${isPlaying ? 'Now Playing' : 'Last Played'})`);
      }

      return true;
    } catch (err: any) {
      setLastFmStatus(`Detection error: ${err?.message || err}`);
      return false;
    }
  };

  useEffect(() => {
    if (isAutoSyncing && lastFmUser) {
      fetchLastFmTrack(lastFmUser);
      pollerRef.current = setInterval(() => {
        fetchLastFmTrack(lastFmUser);
      }, 10000);
    } else {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    }
    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, [isAutoSyncing, lastFmUser, token]);

  const handleToggleAutoSync = () => {
    const next = !isAutoSyncing;
    setIsAutoSyncing(next);
    localStorage.setItem('rpc_auto_sync', String(next));
    if (next && lastFmUser) {
      fetchLastFmTrack(lastFmUser);
    }
  };

  const handleSaveLastFmUser = (val: string) => {
    setLastFmUser(val);
    localStorage.setItem('rpc_lastfm_user', val);
  };

  const handleApplyToDiscord = async () => {
    try {
      setApplying(true);
      setStatusMessage('Applying Rich Presence to Discord profile...');
      const rpcData: RpcConfig = {
        applicationId: customForm.applicationId || '1015931589851959326',
        name: customForm.name || activePreset.name,
        details: customForm.details || '',
        state: customForm.state || '',
        largeImageKey: customForm.largeImageKey || activePreset.iconUrl,
        largeImageText: customForm.largeImageText || customForm.name,
        smallImageKey: customForm.smallImageKey || '',
        smallImageText: customForm.smallImageText || '',
        type: customForm.type || 'PLAYING',
        startTimestamp: Date.now().toString(),
        button1Label: customForm.button1Label || '',
        button1Url: customForm.button1Url || '',
        button2Label: customForm.button2Label || '',
        button2Url: customForm.button2Url || ''
      };

      await onInstantUpdate(rpcData);
      onApplyPreset(rpcData);
      setStatusMessage(`✅ ${customForm.name} Rich Presence applied instantly to Discord!`);
    } catch (err: any) {
      setStatusMessage(`❌ Error: ${err?.message || err}`);
    } finally {
      setApplying(false);
    }
  };

  const filteredPresets = APP_PRESETS.filter(p => {
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.defaultConfig.details.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="bg-gradient-to-r from-emerald-950/40 via-black/40 to-indigo-950/40 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <Radio className="w-3 h-3 animate-pulse" />
                Live Music Auto-Detector
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Spotify • Apple • YouTube • Tidal • Desktop</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Background Music Scrobble Bridge
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Detects whatever music you play on your computer, phone, or browser (even when this tab is closed or backgrounded) and automatically broadcasts live album art, track title, and artist to your Discord profile.
            </p>
          </div>

          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={lastFmUser}
                onChange={(e) => handleSaveLastFmUser(e.target.value)}
                placeholder="Last.fm Username (e.g. skibidi)"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60"
              />
            </div>
            
            <button
              onClick={() => fetchLastFmTrack(lastFmUser)}
              className="px-4 py-2.5 bg-black/40 border border-white/10 hover:border-white/20 text-zinc-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Detect Now
            </button>

            <button
              onClick={handleToggleAutoSync}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isAutoSyncing 
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/50' 
                  : 'bg-black/40 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${isAutoSyncing ? 'animate-bounce' : ''}`} />
              {isAutoSyncing ? 'Auto-Sync Active' : 'Start Auto-Sync'}
            </button>
          </div>
        </div>

        {lastFmStatus && (
          <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-2">
              <Disc className={`w-3.5 h-3.5 ${currentScrobble?.nowPlaying ? 'text-emerald-400 animate-spin' : 'text-zinc-500'}`} />
              {lastFmStatus}
            </span>
            {isAutoSyncing && (
              <span className="text-[10px] font-mono text-emerald-400/90 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                Syncs: {syncCount} • Interval: 10s
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'all', label: 'All Apps', icon: <Layers className="w-3.5 h-3.5" /> },
            { key: 'music', label: 'Music & Audio', icon: <Music className="w-3.5 h-3.5" /> },
            { key: 'dev', label: 'Coding & IDEs', icon: <Code className="w-3.5 h-3.5" /> },
            { key: 'gaming', label: 'Games & Platforms', icon: <Gamepad2 className="w-3.5 h-3.5" /> },
            { key: 'media', label: 'Streams & Video', icon: <Tv className="w-3.5 h-3.5" /> }
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedCategory === cat.key 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                  : 'bg-black/30 border border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter apps (Spotify, VS Code, Roblox...)"
            className="w-full bg-black/30 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredPresets.map((app) => {
          const isSelected = activePreset.id === app.id;
          return (
            <div
              key={app.id}
              onClick={() => setActivePreset(app)}
              className={`group relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col items-center text-center ${
                isSelected 
                  ? 'bg-indigo-950/30 border-indigo-500 ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-500/10' 
                  : 'bg-black/30 border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
              }`}
            >
              <div className="relative mb-2.5">
                <img 
                  src={app.iconUrl} 
                  alt={app.name} 
                  className="w-10 h-10 rounded-xl object-contain drop-shadow-md group-hover:scale-105 transition-transform" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/discord.png';
                  }}
                />
                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-zinc-200 truncate w-full">{app.name}</p>
              <span className="text-[10px] text-zinc-500 tracking-tight truncate w-full mt-0.5">{app.badge}</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-black/30 border border-white/10 rounded-2xl p-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-3">
              <img 
                src={activePreset.iconUrl} 
                alt={activePreset.name} 
                className="w-8 h-8 rounded-lg object-contain" 
              />
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Configure {activePreset.name} RPC
                </h3>
                <p className="text-[10px] text-zinc-500">Fine-tune details before applying to your Discord profile</p>
              </div>
            </div>
            <button
              onClick={() => setCustomForm({ ...activePreset.defaultConfig })}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Preset
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">App Display Name</label>
              <input
                type="text"
                value={customForm.name}
                onChange={(e) => setCustomForm(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Activity Type</label>
              <select
                value={customForm.type || 'PLAYING'}
                onChange={(e) => setCustomForm(p => ({ ...p, type: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="PLAYING">Playing</option>
                <option value="STREAMING">Streaming</option>
                <option value="LISTENING">Listening to</option>
                <option value="WATCHING">Watching</option>
                <option value="COMPETING">Competing in</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Details (Top Line)</label>
            <input
              type="text"
              value={customForm.details}
              onChange={(e) => setCustomForm(p => ({ ...p, details: e.target.value }))}
              placeholder="e.g. Song title, Map name, File being edited"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">State (Bottom Line)</label>
            <input
              type="text"
              value={customForm.state}
              onChange={(e) => setCustomForm(p => ({ ...p, state: e.target.value }))}
              placeholder="e.g. Artist, Score, Rank, Mode"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Large Image URL</label>
              <input
                type="text"
                value={customForm.largeImageKey}
                onChange={(e) => setCustomForm(p => ({ ...p, largeImageKey: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Small Icon URL</label>
              <input
                type="text"
                value={customForm.smallImageKey || ''}
                onChange={(e) => setCustomForm(p => ({ ...p, smallImageKey: e.target.value }))}
                placeholder="Optional small overlay icon"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Button 1 Label & URL</label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={customForm.button1Label || ''}
                  onChange={(e) => setCustomForm(p => ({ ...p, button1Label: e.target.value }))}
                  placeholder="Label (e.g. Listen)"
                  className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  value={customForm.button1Url || ''}
                  onChange={(e) => setCustomForm(p => ({ ...p, button1Url: e.target.value }))}
                  placeholder="https://..."
                  className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Application ID</label>
              <input
                type="text"
                value={customForm.applicationId}
                onChange={(e) => setCustomForm(p => ({ ...p, applicationId: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleApplyToDiscord}
              disabled={applying}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              {applying ? 'Updating Discord...' : `Apply ${customForm.name} to Discord`}
            </button>
            <button
              onClick={() => onApplyPreset(customForm as any)}
              className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Load into Editor
            </button>
          </div>

          {statusMessage && (
            <p className="text-xs text-center font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 py-2 rounded-lg">
              {statusMessage}
            </p>
          )}
        </div>

        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-2">
              Discord Profile Card Live Preview
            </span>

            <div className="bg-[#111214] border border-[#232428] rounded-xl p-4 text-white shadow-2xl space-y-3 font-sans">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-white/5 pb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {customForm.type === 'LISTENING' ? 'Listening to Spotify' : 
                 customForm.type === 'WATCHING' ? 'Watching' : 
                 customForm.type === 'STREAMING' ? 'Live on Twitch' : 'Playing a Game'}
              </div>

              <div className="flex items-start gap-3.5">
                <div className="relative flex-shrink-0">
                  <img
                    src={customForm.largeImageKey || activePreset.iconUrl}
                    alt="RPC Large"
                    className="w-16 h-16 rounded-xl object-cover border border-white/10"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = activePreset.iconUrl;
                    }}
                  />
                  {customForm.smallImageKey && (
                    <img
                      src={customForm.smallImageKey}
                      alt="RPC Small"
                      className="w-6 h-6 rounded-full object-cover absolute -bottom-1.5 -right-1.5 border-2 border-[#111214]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <h4 className="text-xs font-bold text-white truncate">{customForm.name}</h4>
                  <p className="text-[11px] text-zinc-300 truncate font-medium">{customForm.details || 'No activity details'}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{customForm.state || 'Active status'}</p>
                  <p className="text-[9px] text-zinc-500 font-mono pt-0.5 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> 00:42 elapsed
                  </p>
                </div>
              </div>

              {customForm.type === 'LISTENING' && (
                <div className="space-y-1 pt-1">
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="w-2/5 h-full bg-emerald-500 rounded-full" />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                    <span>1:24</span>
                    <span>3:48</span>
                  </div>
                </div>
              )}

              {customForm.button1Label && (
                <div className="pt-2">
                  <div className="w-full py-2 bg-[#2b2d31] hover:bg-[#35373c] text-white text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-white/5">
                    <ExternalLink className="w-3 h-3" />
                    {customForm.button1Label}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-black/20 border border-white/5 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Automatic Logo & Asset Pipeline
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              All official app logos and verified badges are optimized for Discord rich presence endpoints. Clicking Apply directly connects the protocol to your active selfbot session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
