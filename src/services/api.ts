import { BotSession } from '../types';
import { safeJsonParse } from '../lib/safe-json';

const API_BASE = '';

const safeResJson = async (res: Response) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch(e) {
    console.error("Failed to parse JSON, returning original text", e);
    return text;
  }
};

export const api = {
  healthCheck: async () => {
    const res = await fetch(`${API_BASE}/api/health`);
    return safeResJson(res);
  },

  login: async (token: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const errorData = await safeResJson(res).catch(() => ({}));
      throw new Error(errorData.error || 'Login failed');
    }
    return safeResJson(res);
  },

  uploadTokens: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api/tokens/upload`, {
      method: 'POST',
      body: formData,
    });
    return safeResJson(res);
  },

  getTokens: async (): Promise<BotSession[]> => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/tokens`, {
      headers: {
        'Authorization': token
      }
    });
    return safeResJson(res);
  },

  clearTokens: async () => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/tokens`, { 
      method: 'DELETE',
      headers: {
        'Authorization': token
      }
    });
    return safeResJson(res);
  },

  getSettings: async () => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/settings`, {
      headers: { 'Authorization': token }
    });
    return safeResJson(res);
  },

  setMenuMode: async (mode: 'text' | 'image') => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/settings/menu-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ mode }),
    });
    return safeResJson(res);
  },

  setMultiFeature: async (enabled: boolean) => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/settings/multi-feature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ enabled }),
    });
    return safeResJson(res);
  },

  setBackground: async (base64Image: string) => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/settings/background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ image: base64Image }),
    });
    return safeResJson(res);
  },

  getBackground: async () => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/settings/background`, {
      headers: { 'Authorization': token }
    });
    return safeResJson(res);
  },

  joinVC: async (token: string, channelId: string) => {
    const res = await fetch(`${API_BASE}/api/actions/join-vc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ channelId }),
    });
    return res.json();
  },

  setMute: async (token: string, mute: boolean) => {
    const res = await fetch(`${API_BASE}/api/actions/vc/mute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ mute }),
    });
    return res.json();
  },

  setDeafen: async (token: string, deafen: boolean) => {
    const res = await fetch(`${API_BASE}/api/actions/vc/deafen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ deafen }),
    });
    return res.json();
  },

  setVideo: async (token: string, video: boolean) => {
    const res = await fetch(`${API_BASE}/api/actions/vc/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ video }),
    });
    return res.json();
  },

  speakTTS: async (token: string, text: string, voice: string) => {
    const res = await fetch(`${API_BASE}/api/actions/vc/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ text, voice }),
    });
    return res.json();
  },

  testTTS: async (text: string, voice: string) => {
    const res = await fetch(`${API_BASE}/api/actions/vc/tts/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });
    return res.json();
  },

  getSoundboardSounds: async (token?: string) => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = token;
    const res = await fetch(`${API_BASE}/api/actions/vc/soundboard/sounds`, { headers });
    return res.json();
  },

  playSoundboard: async (token: string, soundId: string) => {
    const res = await fetch(`${API_BASE}/api/actions/vc/soundboard/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ soundId }),
    });
    return res.json();
  },

  toggleSoundboardSpam: async (token: string, enabled: boolean, soundId: string, interval: number) => {
    const res = await fetch(`${API_BASE}/api/actions/vc/soundboard/spam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ enabled, soundId, interval }),
    });
    return res.json();
  },

  startStream: async (token: string, channelId?: string) => {
    const res = await fetch(`${API_BASE}/api/actions/stream/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ channelId }),
    });
    return res.json();
  },

  stopStream: async (token: string) => {
    const res = await fetch(`${API_BASE}/api/actions/stream/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
    });
    return res.json();
  },

  setStreamImage: async (token: string, image: string) => {
    const res = await fetch(`${API_BASE}/api/actions/stream/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ image }),
    });
    return res.json();
  },

  setStreamSource: async (token: string, type: 'image' | 'video' | 'youtube', url: string, options?: any) => {
    const res = await fetch(`${API_BASE}/api/actions/stream/source`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ type, url, options }),
    });
    return res.json();
  },

  uploadStreamMedia: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api/actions/stream/upload`, {
      method: 'POST',
      headers: { 'Authorization': token },
      body: formData,
    });
    return res.json();
  },

  togglePersistentTyping: async (token: string, enabled: boolean) => {
    const res = await fetch(`${API_BASE}/api/actions/typing/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ enabled }),
    });
    return res.json();
  },

  getPersistentTypingStatus: async (token: string) => {
    const res = await fetch(`${API_BASE}/api/actions/typing/status`, {
      headers: { 'Authorization': token },
    });
    return res.json();
  },

  getCosmetics: async (token: string) => {
    const res = await fetch(`${API_BASE}/api/actions/cosmetics`, {
      headers: { 'Authorization': token },
    });
    return res.json();
  },

  updateCosmetics: async (token: string, data: any) => {
    const res = await fetch(`${API_BASE}/api/actions/cosmetics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  discordGet: async (token: string, url: string, mobile: boolean = false, proxy?: string) => {
    let proxyUrl = `${API_BASE}/api/catalystcord/proxy?url=${encodeURIComponent(url)}`;
    if (mobile) proxyUrl += "&mobile=true";
    if (proxy) proxyUrl += `&proxy=${encodeURIComponent(proxy)}`;
    const headers: any = { 'Authorization': token };
    if (proxy) headers['X-Proxy'] = proxy;
    const res = await fetch(proxyUrl, { headers });
    const text = await res.text();
    if (text === "[object Blob]") {
        console.error("Received [object Blob] response, returning null");
        return null;
    }
    if (!res.ok) {
        throw new Error(text || 'Request failed');
    }
    try {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return JSON.parse(text);
        }
    } catch (e) {
        console.error("Failed to parse JSON response", e);
    }
    return text;
  },

  discordPost: async (token: string, url: string, body: any, method: string = 'POST', mobile: boolean = false, proxy?: string) => {
    let proxyUrl = `${API_BASE}/api/catalystcord/proxy?url=${encodeURIComponent(url)}`;
    if (mobile) proxyUrl += "&mobile=true";
    if (proxy) proxyUrl += `&proxy=${encodeURIComponent(proxy)}`;
    const headers: any = { 
      'Content-Type': 'application/json', 
      'Authorization': token 
    };
    if (proxy) headers['X-Proxy'] = proxy;
    const res = await fetch(proxyUrl, {
      method: method,
      headers: headers,
      body: JSON.stringify(body)
    });
    const text = await res.text();
    if (text === "[object Blob]") {
        console.error("Received [object Blob] response, returning null");
        return null;
    }
    if (!res.ok) {
        throw new Error(text || 'Request failed');
    }
    try {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return JSON.parse(text);
        }
    } catch (e) {
        console.error("Failed to parse JSON response", e);
    }
    return text;
  },

  autoSkull: async (ownerId: string) => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/actions/autoskull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ ownerId }),
    });
    return res.json();
  },

  massDM: async (message: string) => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/actions/mass-dm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ message }),
    });
    return res.json();
  },

  statusRotate: async (statusList: string[], interval: number = 3) => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/actions/status-rotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ statusList, interval }),
    });
    return res.json();
  },

  friendRequest: async (userId: string) => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/actions/friend-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ userId }),
    });
    return res.json();
  },

  spam: async (channelId: string, message: string, count: number) => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/actions/spam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ channelId, message, count }),
    });
    return res.json();
  },

  nuke: async (guildId: string) => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/actions/nuke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ guildId }),
    });
    return res.json();
  },

  massBan: async (guildId: string) => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/actions/mass-ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ guildId }),
    });
    return res.json();
  },

  renameChannels: async (guildId: string, name: string) => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/actions/rename-channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ guildId, name }),
    });
    return res.json();
  },

  uploadRpcImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_BASE}/api/rpc/upload-image`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  deleteRoles: async (guildId: string) => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/actions/delete-roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ guildId }),
    });
    return res.json();
  },

  getDiscordCdnUrl: (url: string) => {
    return `${API_BASE}/api/proxy/discord-cdn?url=${encodeURIComponent(url)}`;
  },

  termUser: async (token: string, userId: string) => {
    const res = await fetch(`${API_BASE}/api/actions/revenge/term`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ userId }),
    });
    return res.json();
  },

  untermUser: async (token: string, userId: string) => {
    const res = await fetch(`${API_BASE}/api/actions/revenge/unterm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ userId }),
    });
    return res.json();
  },

  getTermedUsers: async (token: string) => {
    const res = await fetch(`${API_BASE}/api/actions/revenge/termed`, {
      headers: { 'Authorization': token }
    });
    return res.json();
  },

  scrapeTerm: async (token: string, userId: string) => {
    const res = await fetch(`${API_BASE}/api/actions/revenge/scrape-term`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ userId }),
    });
    return res.json();
  },

  blockUser: async (token: string, userId: string) => {
    const res = await fetch(`${API_BASE}/api/actions/revenge/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ userId }),
    });
    return res.json();
  },

  ghostPing: async (token: string, channelId: string, userId: string) => {
    const res = await fetch(`${API_BASE}/api/actions/revenge/ghost-ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ channelId, userId }),
    });
    return res.json();
  },

  leaveAll: async () => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/actions/leave-all`, {
      method: 'POST',
      headers: { 'Authorization': token },
    });
    return res.json();
  },

  closeAllDMs: async () => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/actions/close-dms`, {
      method: 'POST',
      headers: { 'Authorization': token },
    });
    return res.json();
  },

  toggleAntiNuke: async (guildId: string, enabled: boolean) => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/actions/antinuke/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ guildId, enabled }),
    });
    return res.json();
  },

  getAntiNukeList: async () => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/actions/antinuke/list`, {
      headers: { 'Authorization': token }
    });
    return res.json();
  },

  globalMassJoin: async (inviteCode: string) => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/actions/global-mass-join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ inviteCode }),
    });
    return res.json();
  },

  adminGlobalStatus: async (status: string) => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/actions/admin/global-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  adminGlobalJoinVC: async (channelId: string, guildId?: string) => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/actions/admin/global-join-vc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ channelId, guildId }),
    });
    return res.json();
  },

  adminGlobalMassBoost: async (guildId: string) => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/actions/admin/global-mass-boost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ guildId }),
    });
    return res.json();
  },

  getServerManagement: async (token: string) => {
    const res = await fetch(`${API_BASE}/api/server-management`, {
      method: 'GET',
      headers: { 'Authorization': token },
    });
    return res.json();
  },

  updateServerManagement: async (token: string, config: any) => {
    const res = await fetch(`${API_BASE}/api/server-management`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify(config),
    });
    return res.json();
  },
  
  getRpcSettings: async () => {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`${API_BASE}/api/rpc/settings`, {
      headers: { 'Authorization': token },
    });
    return res.json();
  },
};
