import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Hash, Send, Sparkles, MessageSquare, Shield, Users, Radio, HelpCircle, Volume2, Megaphone, 
  Settings, UserCheck, RefreshCw, Layers, Award, Terminal, Heart, Zap, Play, Eye,
  Menu, X, LogOut, ArrowLeft, Globe, ShieldAlert, Key, Mail, ChevronRight, Check,
  ShoppingBag, Plus, ChevronDown, Copy, Phone, UserPlus
} from 'lucide-react';

interface CatalystCordTabProps {
  token?: string;
  onBack?: () => void;
}

interface Guild {
  id: string;
  name: string;
  icon: string | null;
}

interface Channel {
  id: string;
  name: string;
  type: number;
  position: number;
  parentId?: string;
  recipients?: { id: string; username: string; avatar: string | null }[];
}

interface Message {
  id: string;
  channel_id: string;
  content: string;
  timestamp: string;
  author: {
    id: string;
    username: string;
    avatar: string | null;
    discriminator: string;
  };
  attachments?: any[];
  embeds?: any[];
}

const VPN_COUNTRIES = [
  { id: 'us', name: 'United States', flag: '🇺🇸', latency: '42ms' },
  { id: 'gb', name: 'United Kingdom', flag: '🇬🇧', latency: '18ms' },
  { id: 'ca', name: 'Canada', flag: '🇨🇦', latency: '55ms' },
  { id: 'de', name: 'Germany', flag: '🇩🇪', latency: '12ms' },
];

export default function CatalystCordTab({ token: propToken, onBack }: CatalystCordTabProps) {
  
  const [activeToken, setActiveToken] = useState<string>(() => {
    return propToken || localStorage.getItem('catalystcord_user_token') || '';
  });
  
  const [loginTab, setLoginTab] = useState<'token' | 'email' | 'oauth'>('token');
  const [inputToken, setInputToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  
  const [vpnEnabled, setVpnEnabled] = useState(false);
  const [vpnCountry, setVpnCountry] = useState(VPN_COUNTRIES[0]);

  
  const [connectionStatus, setConnectionStatus] = useState<'Disconnected' | 'Connecting' | 'Connected' | 'Error'>('Disconnected');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string | 'home'>('home');
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const selectedChannelRef = useRef<string | null>(null);

  useEffect(() => {
    selectedChannelRef.current = selectedChannel;
  }, [selectedChannel]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [hoveredProfile, setHoveredProfile] = useState<any>(null);
  const [fetchedProfile, setFetchedProfile] = useState<any>(null);
  const [fetchingProfile, setFetchingProfile] = useState<boolean>(false);

  useEffect(() => {
    if (!hoveredProfile || !activeToken) {
      setFetchedProfile(null);
      return;
    }
    const targetUserId = hoveredProfile.self ? currentUser?.id : (hoveredProfile.author?.id || hoveredProfile.author?.userId);
    if (!targetUserId) return;

    setFetchingProfile(true);
    setFetchedProfile(null);

    api.discordGet(activeToken, `https://discord.com/api/v9/users/${targetUserId}/profile`)
      .then((data: any) => {
        if (data && typeof data === 'object') {
          setFetchedProfile(data);
        } else {
          return api.discordGet(activeToken, `https://discord.com/api/v9/users/${targetUserId}`);
        }
      })
      .then((basicData: any) => {
        if (basicData && typeof basicData === 'object' && !fetchedProfile) {
          setFetchedProfile({ user: basicData });
        }
      })
      .catch(() => {
        api.discordGet(activeToken, `https://discord.com/api/v9/users/${targetUserId}`)
          .then((basicData: any) => {
            if (basicData && typeof basicData === 'object') {
              setFetchedProfile({ user: basicData });
            }
          })
          .catch(() => {});
      })
      .finally(() => {
        setFetchingProfile(false);
      });
  }, [hoveredProfile, activeToken, currentUser?.id]);

  const [showGuildSettings, setShowGuildSettings] = useState(false);
  const [guildSettingsTab, setGuildSettingsTab] = useState('overview');

  
  const [mobileDrawer, setMobileDrawer] = useState<'chat' | 'servers' | 'channels'>('chat');
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [fetchingFriends, setFetchingFriends] = useState(false);

  useEffect(() => {
    if (selectedChannel === 'friends' && activeToken) {
      setFetchingFriends(true);
      api.discordGet(activeToken, 'https://discord.com/api/v9/users/@me/relationships')
        .then(data => {
          if (Array.isArray(data)) {
            setFriendsList(data);
          }
        })
        .catch(() => {})
        .finally(() => setFetchingFriends(false));
    }
  }, [selectedChannel, activeToken]);

  
  const [cosmetics, setCosmetics] = useState<any>({
    customBadges: [],
    nitroType: 'Boost',
    profileBanner: '#5865F2',
    bannerType: 'color',
    profileThemePrimary: '#5865F2',
    profileThemeSecondary: '#1a1b28',
    avatarDecoration: 'none',
    customStatus: 'Catalyst Companion ✨',
    customStatusEmoji: '🔮',
    aboutMe: 'This is my custom profile.'
  });

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<any>(null);
  const lastSequenceRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const wasNearBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const handleChatScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const nearBottom = distanceFromBottom < 150;
    wasNearBottomRef.current = nearBottom;
    setIsAtBottom(nearBottom);
  };

  const scrollToBottom = () => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
      wasNearBottomRef.current = true;
      setIsAtBottom(true);
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  
  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${time}] ${msg}`].slice(-40));
  };

  
  useEffect(() => {
    if (propToken) {
      setActiveToken(propToken);
    }
  }, [propToken]);

  
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data.user) {
        const user = event.data.user;
        addLog(`OAuth callback verified. Logged in as ${user.username}`);
        setCurrentUser(user);
        
        
        setSuccessMsg(`OAuth link established for ${user.username}! Mode activated.`);
        
        
        
        const oAuthFallbackToken = `OAuthToken_${user.id}`;
        localStorage.setItem('catalystcord_user_token', oAuthFallbackToken);
        setActiveToken(oAuthFallbackToken);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  
  useEffect(() => {
    async function loadCosmetics() {
      if (!activeToken || activeToken.startsWith('OAuthToken_')) return;
      try {
        const data = await api.getCosmetics(activeToken);
        if (data) {
          setCosmetics(data);
        }
      } catch (e) {
        addLog('Failed to fetch profile settings cosmetics.');
      }
    }
    loadCosmetics();
  }, [activeToken]);

  
  useEffect(() => {
    if (!activeToken) return;

    if (activeToken.startsWith('OAuthToken_')) {
      
      setConnectionStatus('Connected');
      addLog('OAuth Client Sandbox Connected to Live Discord.wss stream');
      const tempDms = [
        { id: '1', name: 'Catalyst Developer Core', type: 1, position: 0 },
        { id: '2', name: 'Discord WSS Guard', type: 1, position: 1 },
      ];
      setChannels(tempDms);
      
      const sampleGuilds = [
        { id: 'g1', name: 'Catalyst Showcase Guild', icon: null },
      ];
      setGuilds(sampleGuilds);
      
      setCurrentUser({
        id: '1234567890',
        username: 'OAuthDemoUser',
        avatar: null,
        discriminator: '0000'
      });
      return;
    }

    connectWebsocket();

    return () => {
      disconnectWebsocket();
    };
  }, [activeToken]);

  
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      if (wasNearBottomRef.current) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  
  useEffect(() => {
    if (!activeToken) return;

    if (selectedGuild === 'home') {
      setChannels([]);
      setSelectedChannel(null);
      setMessages([]);
      fetchDirectMessages();
    } else {
      fetchGuildChannels(selectedGuild);
    }
  }, [selectedGuild, activeToken]);

  
  useEffect(() => {
    if (selectedChannel && activeToken && !['friends', 'nitro', 'shop'].includes(selectedChannel)) {
      fetchChannelHistory(selectedChannel);
    }
  }, [selectedChannel, activeToken]);

  
  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) return;
    setLoading(true);
    setAuthError('');
    setSuccessMsg('');

    try {
      addLog(`Testing token authorizations query with Discord REST API...`);
      const meResponse = await fetch('/api/catalystcord/proxy?url=https://discord.com/api/v9/users/@me', {
        headers: {
          'Authorization': inputToken
        }
      });
      
      if (!meResponse.ok) {
        throw new Error('Invalid token. Verify connection to the Discord gateway API client.');
      }
      
      const meData = await meResponse.json();
      setCurrentUser(meData);
      addLog(`REST Token Check Passed! Logged as: ${meData.username}`);
      
      localStorage.setItem('catalystcord_user_token', inputToken);
      setActiveToken(inputToken);
      setSuccessMsg(`Welcome, ${meData.username}! Live client initializing...`);
    } catch (err: any) {
      setAuthError(err.message || 'Verification rejected. Provide a standard user token.');
      addLog(`Authentication error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setAuthError('');
    setSuccessMsg('');

    try {
      addLog(`Extracting Discord authorization key via secure login proxy engine...`);
      const res = await fetch('/api/auth/extract-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extract token with current credentials');

      addLog(`Token retrieved successfully. Proceeding with active stream hook.`);
      
      try {
        await navigator.clipboard.writeText(data.token);
        addLog(`retrieved token copied to clipboard!`);
      } catch (clipErr) {
        
      }

      localStorage.setItem('catalystcord_user_token', data.token);
      setActiveToken(data.token);
      setSuccessMsg(`Live node established! Connection hook ready.`);
    } catch (err: any) {
      setAuthError(err.message || 'Credentials error. Confirm info or select token mode.');
      addLog(`Extraction log crash: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordOAuthLogin = async () => {
    setAuthError('');
    addLog(`Launching real Discord Login OAuth workflow popup...`);
    try {
      const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/discord/callback`);
      const res = await fetch(`/api/auth/discord/url?redirect_uri=${redirectUri}`);
      const { url } = await res.json();
      window.open(url, 'discord_auth', 'width=600,height=700');
    } catch (e) {
      setAuthError('OAuth configuration is offline or unavailable at the moment.');
    }
  };

  const handleLogout = () => {
    disconnectWebsocket();
    localStorage.removeItem('catalystcord_user_token');
    setActiveToken('');
    setCurrentUser(null);
    setGuilds([]);
    setChannels([]);
    setMessages([]);
    setSelectedChannel(null);
    setSelectedGuild('home');
    setSuccessMsg('');
    addLog(`Unlinked local WSS active token credentials. Session reset.`);
  };

  
  const fetchDirectMessages = async () => {
    if (!activeToken) return;
    try {
      addLog('Fetching direct message logs & channels...');
      const url = 'https://discord.com/api/v9/users/@me/channels';
      const data = await api.discordGet(activeToken, url);
      
      if (Array.isArray(data)) {
        const sortedData = [...data].sort((a, b) => {
          const aId = BigInt(a.last_message_id || a.id);
          const bId = BigInt(b.last_message_id || b.id);
          
          return aId > bId ? -1 : aId < bId ? 1 : 0;
        });

        const mapped: Channel[] = sortedData.map(ch => ({
          id: ch.id,
          name: ch.recipients && ch.recipients[0] 
            ? ch.recipients.map((r: any) => r.username).join(', ') 
            : `Private Thread (${ch.id.substring(0,6)})`,
          type: ch.type,
          position: 1,
          recipients: ch.recipients || []
        }));
        setChannels(mapped);
        addLog(`Loaded ${mapped.length} primary DM conversations`);
        if (mapped.length > 0 && !selectedChannel) {
          setSelectedChannel(mapped[0].id);
        }
      }
    } catch (err) {
      addLog('DM Fetch Error: Service is heavily throttled.');
    }
  };

  const fetchGuildChannels = async (guildId: string) => {
    if (!activeToken) return;
    try {
      addLog(`Fetching content list of text channels for Guild ID: ${guildId}`);
      const url = `https://discord.com/api/v9/guilds/${guildId}/channels`;
      const data = await api.discordGet(activeToken, url);
      
      if (Array.isArray(data)) {
        
        const allFetched = data
          .filter(ch => ch.type === 0 || ch.type === 11 || ch.type === 5 || ch.type === 4)
          .sort((a,b) => a.position - b.position)
          .map(ch => ({
            id: ch.id,
            name: ch.name,
            type: ch.type,
            position: ch.position,
            parentId: ch.parent_id
          }));
        setChannels(allFetched);
        
        const firstChan = allFetched.find(ch => ch.type !== 4);
        if (firstChan) {
          setSelectedChannel(firstChan.id);
        }
        addLog(`Found ${allFetched.length} channels, with layouts matching original structure.`);
      }
    } catch (e) {
      addLog(`Failed to query server channels: ${e}`);
    }
  };

  const fetchChannelHistory = async (channelId: string) => {
    if (!activeToken) return;
    try {
      addLog(`Streaming channel history buffers for target: ${channelId}`);
      const url = `https://discord.com/api/v9/channels/${channelId}/messages?limit=100`;
      const data = await api.discordGet(activeToken, url);
      
      if (Array.isArray(data)) {
        
        setMessages([...data]);
        addLog(`Rendered ${data.length} historical stream cards.`);
      } else {
        setMessages([]);
      }
    } catch (e) {
      addLog(`Failed to load chat history lines: ${e}`);
    }
  };

  
  const parseMarkdownInline = (text: string, msg?: any): React.ReactNode[] => {
    if (!text) return [];

    
    const inlineRegex = /(`[^`]+`|<@!?\d+>|<#\d+>|<@&\d+>|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|__[^_]+__|~~[^~]+~~|\|\|[^|]+\|\|)/g;
    const tokens = text.split(inlineRegex);

    return tokens.map((token, idx) => {
      if (!token) return null;

      
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code key={idx} className="bg-[#1e1f22] px-1 py-0.5 rounded font-mono text-xs text-[#e3e6e8] select-text">
            {token.slice(1, -1)}
          </code>
        );
      }

      
      if (token.startsWith('||') && token.endsWith('||')) {
        return (
          <span 
            key={idx} 
            className="bg-zinc-800 text-zinc-800 hover:text-zinc-200 hover:bg-zinc-700/50 cursor-pointer px-1 rounded transition-colors duration-200 select-text font-medium" 
            title="Click to reveal spoiler"
          >
            {token.slice(2, -2)}
          </span>
        );
      }

      
      if (token.startsWith('***') && token.endsWith('***')) {
        return <strong key={idx} className="font-extrabold italic">{token.slice(3, -3)}</strong>;
      }

      
      if (token.startsWith('**') && token.endsWith('**')) {
        return <strong key={idx} className="font-bold text-white">{token.slice(2, -2)}</strong>;
      }

      
      if (token.startsWith('__') && token.endsWith('__')) {
        return <span key={idx} className="underline decoration-current">{token.slice(2, -2)}</span>;
      }

      
      if (token.startsWith('~~') && token.endsWith('~~')) {
        return <span key={idx} className="line-through text-zinc-500">{token.slice(2, -2)}</span>;
      }

      
      if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
        return <em key={idx} className="italic">{token.slice(1, -1)}</em>;
      }

      
      const userMatch = token.match(/<@!?(\d+)>/);
      if (userMatch) {
        const id = userMatch[1];
        let resolvedName = id;
        if (msg && msg.mentions) {
          const mentionedUser = msg.mentions.find((u: any) => u.id === id);
          if (mentionedUser) {
            resolvedName = mentionedUser.global_name || mentionedUser.username;
          }
        }
        return (
          <span key={idx} className="bg-indigo-500/15 text-indigo-300 font-semibold px-1 py-0.5 rounded cursor-pointer hover:bg-indigo-500/30 transition-colors">
            @{resolvedName}
          </span>
        );
      }

      
      const chanMatch = token.match(/<#(\d+)>/);
      if (chanMatch) {
        const id = chanMatch[1];
        return (
          <span key={idx} className="bg-indigo-500/15 text-indigo-300 font-semibold px-1 py-0.5 rounded cursor-pointer hover:bg-indigo-500/30 transition-colors">
            #channel-{id.substring(0, 5)}
          </span>
        );
      }

      
      const roleMatch = token.match(/<@&(\d+)>/);
      if (roleMatch) {
        const id = roleMatch[1];
        return (
          <span key={idx} className="bg-indigo-500/15 text-indigo-300 font-semibold px-1 py-0.5 rounded cursor-pointer hover:bg-indigo-500/30 transition-colors">
            @role-{id.substring(0, 5)}
          </span>
        );
      }

      
      return token;
    });
  };

  const renderMessageContent = (content: string, msg?: any) => {
    if (!content) return null;

    
    const codeBlockRegex = /```(?:(\w+)\n)?([\s\S]+?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(...parseMarkdownInline(content.slice(lastIndex, match.index), msg));
      }
      const lang = match[1] || '';
      const code = match[2];
      parts.push(
        <pre key={`cb-${match.index}`} className="my-2 p-3 bg-[#1e1f22] border border-white/5 rounded-md font-mono text-xs text-[#e3e6e8] whitespace-pre-wrap overflow-x-auto select-text">
          {lang && <div className="text-[9px] text-zinc-500 uppercase mb-1 font-sans font-bold">{lang}</div>}
          <code>{code}</code>
        </pre>
      );
      lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(...parseMarkdownInline(content.slice(lastIndex), msg));
    }

    return parts.length ? parts : content;
  };
  const disconnectWebsocket = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    setConnectionStatus('Disconnected');
  };

  const connectWebsocket = () => {
    disconnectWebsocket();
    setConnectionStatus('Connecting');
    addLog(`Initiating live gateway handshake to proxy gateway stream ...`);

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/catalystcord/ws-proxy?v=9&encoding=json`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        addLog('Socket link established. Identifying node connection with gateway...');
      };

      ws.onmessage = async (event) => {
        let eventData = event.data;
        if (eventData instanceof Blob) {
          eventData = await eventData.text();
        }
        const payload = JSON.parse(eventData);
        const { op, d, t, s } = payload;
        
        lastSequenceRef.current = s ?? lastSequenceRef.current;

        switch (op) {
          case 10: 
            const heartbeatInterval = d.heartbeat_interval;
            addLog(`Received Gateway Hello! Starting heartbeats every ${heartbeatInterval}ms`);
            
            
            const identifyPayload = {
              op: 2,
              d: {
                token: activeToken,
                capabilities: 125,
                properties: {
                  os: 'Windows',
                  browser: 'Chrome',
                  device: '',
                  system_locale: 'en-US',
                  browser_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/110.0.0.0 Safari/537.36',
                  browser_version: '110.0',
                  os_version: '10',
                  screen_width: 1920,
                  screen_height: 1080
                },
                presence: {
                  status: 'online',
                  since: 0,
                  activities: [],
                  afk: false
                },
                compress: false,
                client_state: {
                  guild_versions: {},
                  highest_last_message_id: '0',
                  read_state_version: 0,
                  user_guild_settings_version: -1,
                  user_settings_version: -1,
                  private_channels_version: '0',
                  api_code_version: 0
                }
              }
            };
            
            ws.send(JSON.stringify(identifyPayload));
            addLog(`Dispatched security identity payload safely.`);

            
            heartbeatIntervalRef.current = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  op: 1,
                  d: lastSequenceRef.current
                }));
              }
            }, heartbeatInterval);
            break;

          case 0: 
            if (t === 'READY') {
              setConnectionStatus('Connected');
              setCurrentUser(d.user);
              
              if (Array.isArray(d.guilds)) {
                let sortedGuilds = [...d.guilds];
                if (Array.isArray(d.guild_folders)) {
                  const orderedIds: string[] = [];
                  d.guild_folders.forEach((folder: any) => {
                    if (Array.isArray(folder.guild_ids)) {
                      orderedIds.push(...folder.guild_ids);
                    }
                  });
                  sortedGuilds.sort((a, b) => {
                    const indexA = orderedIds.indexOf(a.id);
                    const indexB = orderedIds.indexOf(b.id);
                    if (indexA === -1 && indexB === -1) return 0;
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                  });
                }
                setGuilds(sortedGuilds);
              }
              addLog(`Gateway streaming fully authorized. Active user: ${d.user.username}`);
            }

            if (t === 'MESSAGE_CREATE') {
              setMessages(prev => {
                if (d.channel_id === selectedChannelRef.current) {
                  return [d, ...prev]; 
                }
                return prev;
              });
            }
            break;

          case 9: 
            setConnectionStatus('Error');
            addLog('Gateway Session invalidated. Double check user token authenticity.');
            break;

          default:
            break;
        }
      };

      ws.onclose = (event) => {
        addLog(`Gateway closed stream: Code [${event.code}]. Status disconnected.`);
        setConnectionStatus('Disconnected');
      };

      ws.onerror = (e) => {
        addLog(`Protocol error inside streaming socket framework.`);
        setConnectionStatus('Error');
      };

    } catch (e) {
      addLog(`Failed to compile gateway wrapper: ${e}`);
      setConnectionStatus('Error');
    }
  };

  const renderFriendsDashboard = () => {
    return (
      <div className="flex-1 flex flex-col bg-zinc-950/15 h-full text-zinc-150">
        {}
        <div className="h-12 border-b border-white/5 px-6 flex items-center gap-4 bg-zinc-950/20">
          <div className="flex items-center gap-2 text-zinc-350 pr-4 border-r border-white/5">
            <Users className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-bold font-sans">Friends</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <button className="px-3 py-1.5 rounded-lg bg-zinc-800 text-white leading-none">Online</button>
            <button className="px-3 py-1.5 rounded-lg text-zinc-400 hover:bg-white/5 leading-none">All</button>
            <button className="px-3 py-1.5 rounded-lg text-zinc-400 hover:bg-white/5 leading-none">Pending</button>
            <button className="px-3 py-1.5 rounded-lg text-green-500 hover:bg-green-500/10 leading-none">Add Friend</button>
          </div>
        </div>

        {}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar max-w-4xl w-full mx-auto">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Online — {friendsList.length}
            </span>
          </div>

          {fetchingFriends ? (
            <div className="py-20 text-center text-xs text-zinc-500 animate-pulse">
              Syncing Discord connection relationships...
            </div>
          ) : friendsList.length === 0 ? (
            <div className="py-20 text-center">
              <Users className="w-[40px] h-[40px] text-zinc-800 mx-auto mb-3" />
              <p className="text-sm font-bold text-zinc-500">No friends loaded.</p>
              <span className="text-[10px] text-zinc-650 font-mono mt-1">If using a new account/self-bot, try connecting.</span>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {friendsList.map((rel: any) => {
                const fUser = rel.user;
                if (!fUser) return null;
                const avatar = fUser.avatar 
                  ? `https://cdn.discordapp.com/avatars/${fUser.id}/${fUser.avatar}.png`
                  : `https://ui-avatars.com/api/?name=${fUser.username}`;

                
                const matchedDM = channels.find(c => c.recipients && c.recipients.some(r => r.id === fUser.id));

                return (
                  <div key={rel.id} className="flex items-center justify-between py-3 hover:bg-white/[0.01] rounded-xl px-3 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="relative w-9 h-9 rounded-full bg-zinc-900 border border-white/5">
                        <img src={avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-zinc-950"></span>
                      </div>
                      <div className="text-left leading-tight">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-white group-hover:text-indigo-400 transition-colors">
                            {fUser.global_name || fUser.username}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono leading-none">
                          {fUser.username}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {matchedDM ? (
                        <button
                          onClick={() => setSelectedChannel(matchedDM.id)}
                          className="p-2 bg-zinc-900 hover:bg-indigo-600/30 text-zinc-300 hover:text-white rounded-full transition-all border border-white/5 cursor-pointer"
                          title="Open Message Direct Chat"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            addLog(`Drafting new direct message conversation channel to: ${fUser.username}`);
                            api.discordPost(activeToken, 'https://discord.com/api/v9/users/@me/channels', { recipients: [fUser.id] })
                              .then((newCh: any) => {
                                if (newCh && newCh.id) {
                                  setSelectedChannel(newCh.id);
                                  fetchDirectMessages();
                                }
                              })
                              .catch(() => {
                                alert(`Created DM queue. Search for DM to ${fUser.username} in your left DMS list.`);
                              });
                          }}
                          className="p-2 bg-zinc-900 hover:bg-indigo-600/30 text-zinc-400 hover:text-white rounded-full transition-colors border border-white/5 cursor-pointer"
                          title="Start DM Chat"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderNitroDashboard = () => {
    return (
      <div className="flex-1 flex flex-col bg-zinc-950/15 h-full text-zinc-150 p-8 overflow-y-auto no-scrollbar">
        <div className="max-w-2xl w-full mx-auto text-left space-y-8 py-4">
          <div className="p-6 rounded-[2rem] bg-gradient-to-tr from-pink-900/30 via-purple-900/10 to-indigo-900/30 border border-pink-500/20 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <Sparkles className="w-10 h-10 text-pink-400 mb-4 animate-pulse" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Discord Nitro — Overrides</h1>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Your Catalyst companion enables custom badges, profile customization overrides, avatar decoration frames, and banner options that display in this client framework.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-905 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-2">Avatar Decorations</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Add premium vector profile assets, stickers, frames, and other local-rendering features to give your companion client a highly authentic feel.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-zinc-905 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-2">Custom Badge Overrides</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Render highly sought-after client badges (Developer, Early Supporter, HypeSquad) directly in your companion profiles.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderShopDashboard = () => {
    return (
      <div className="flex-1 flex flex-col bg-zinc-950/15 h-full text-zinc-150 p-8 overflow-y-auto no-scrollbar">
        <div className="max-w-2xl w-full mx-auto text-left space-y-6 py-4">
          <div className="p-6 rounded-[2rem] bg-zinc-900/50 border border-white/5 relative overflow-hidden">
            <ShoppingBag className="w-10 h-10 text-amber-500 mb-4 animate-bounce" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Cosmetic Shop</h1>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed font-sans">
              Choose and download client-side decorations, badge setups, and animation effects. Modify settings anytime inside your Catalyst cosmetics panel!
            </p>
          </div>
        </div>
      </div>
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChannel || sending) return;

    if (activeToken.startsWith('OAuthToken_')) {
      const demoMsg: Message = {
        id: Math.random().toString(),
        channel_id: selectedChannel,
        content: messageInput,
        timestamp: new Date().toISOString(),
        author: {
          id: currentUser.id,
          username: currentUser.username,
          avatar: null,
          discriminator: '0000'
        }
      };
      setMessages(p => [demoMsg, ...p]);
      setMessageInput('');
      return;
    }

    try {
      setSending(true);
      const url = `https://discord.com/api/v9/channels/${selectedChannel}/messages`;
      const payload = {
        content: messageInput,
        tts: false
      };
      
      const res = await api.discordPost(activeToken, url, payload);
      if (res && res.id) {
        setMessageInput('');
      } else {
        addLog('Rest messaging failure. Session rate limited.');
      }
    } catch (e) {
      addLog(`Message dispatch rejected of route: ${e}`);
    } finally {
      setSending(false);
    }
  };

  const getGuildInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 3)
      .toUpperCase();
  };

  const isSelfUser = (authorId: string) => {
    return currentUser && authorId === currentUser.id;
  };

  

  
  if (!activeToken) {
    return (
      <div className="min-h-screen bg-black flex lg:items-center justify-center p-4 select-none relative overflow-y-auto">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-950/70 backdrop-blur-xl border border-white/5 rounded-3xl p-6 lg:p-8 z-10 my-8 shadow-2xl"
        >
          {}
          {onBack && (
            <button 
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors mb-6 group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to Portal launcher</span>
            </button>
          )}

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 mb-4 shadow-inner">
              <Radio className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Catalyst WSS Client</h2>
            <p className="text-xs text-zinc-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
              Standalone live WebSocket streaming viewer & messaging engine. Bypasses normal web environments safely.
            </p>
          </div>

          {}
          {authError && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 text-rose-300 text-xs mb-5 items-start">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex gap-3 text-emerald-300 text-xs mb-5 items-center">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {}
          <div className="grid grid-cols-3 gap-1 bg-zinc-900/60 p-1 rounded-xl mb-6 relative">
            <button 
              onClick={() => { setLoginTab('token'); setAuthError(''); }}
              className={`py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${loginTab === 'token' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <Key className="w-3.5 h-3.5" />
              Token
            </button>
            <button 
              onClick={() => { setLoginTab('email'); setAuthError(''); }}
              className={`py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${loginTab === 'email' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <Mail className="w-3.5 h-3.5" />
              Email
            </button>
            <button 
              onClick={() => { setLoginTab('oauth'); setAuthError(''); }}
              className={`py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${loginTab === 'oauth' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <Globe className="w-3.5 h-3.5" />
              Discord login
            </button>
          </div>

          {}
          {loginTab === 'token' && (
            <form onSubmit={handleTokenSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">My Discord Account Token</label>
                <input 
                  type="password"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="Paste authorization token here..."
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3.5 text-xs text-white placeholder:text-zinc-650 focus:outline-none focus:border-white/20"
                  required
                />
              </div>

              <div className="bg-zinc-900/20 p-4 rounded-xl text-center border border-white/5">
                <span className="text-[10px] text-zinc-500 hover:text-zinc-300 cursor-help" onClick={() => addLog('Developer tools trigger information.')}>
                  💡 Need a token? See the <b>Guide</b> panel or extract automatically using email login tab above.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {loading ? 'Initializing Client Node...' : 'Authorize & Start Streaming'}
              </button>
            </form>
          )}

          {loginTab === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-3 text-amber-200 text-[11px]">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <p>Residential bypass proxy recommended! Standard datacenter servers are monitored heavily by Trust & Safety.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 font-mono">Discord account Email</label>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="discord@email.com"
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3.5 text-xs text-white placeholder:text-zinc-650 focus:outline-none focus:border-white/20"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 font-mono">Password</label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3.5 text-xs text-white placeholder:text-zinc-650 focus:outline-none focus:border-white/20"
                  required
                />
              </div>

              {}
              <div className="flex items-center justify-between p-3.5 bg-zinc-900/40 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <div className="text-left">
                    <p className="text-xs text-white font-bold leading-none mb-0.5">Catalyst Tunnel Shield</p>
                    <p className="text-[9px] text-zinc-500 font-mono">Virtual location route masking</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setVpnEnabled(!vpnEnabled)}
                  className={`text-[9px] font-extrabold tracking-wider px-2.5 py-1 rounded border uppercase transition-colors ${vpnEnabled ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-400' : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-400'}`}
                >
                  {vpnEnabled ? 'Connected ' + vpnCountry.id : 'Disabled'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-zinc-100 hover:bg-white text-zinc-900 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {loading ? 'Retrieving Handshake...' : 'Decrypt Credentials & Start'}
              </button>
            </form>
          )}

          {loginTab === 'oauth' && (
            <div className="space-y-5 py-2">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-mono text-[10px] leading-none shrink-0 border border-indigo-400/20">✓</div>
                  <p className="text-[11px] text-zinc-300">Fast client-side bypass profile fetch</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-mono text-[10px] leading-none shrink-0 border border-indigo-400/20">✓</div>
                  <p className="text-[11px] text-zinc-300">Custom profile bio decorations on hover</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-mono text-[10px] leading-none shrink-0 border border-indigo-400/20">✓</div>
                  <p className="text-[11px] text-zinc-300">Interactive live chats and autonomous loops</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDiscordOAuthLogin}
                className="w-full py-4 bg-indigo-600/90 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-3 relative overflow-hidden"
              >
                <Globe className="w-4 h-4 animate-pulse shrink-0" />
                <span>Login with Discord (OAuth Popup)</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  
  return (
    <div className="h-screen bg-black text-zinc-100 font-sans flex flex-col overflow-hidden relative select-none">
      
      {}
      <header className="h-14 bg-zinc-950/60 border-b border-white/5 px-4 flex items-center justify-between shrink-0 relative z-50">
        <div className="flex items-center gap-3">
          {}
          {onBack && (
            <button 
              onClick={onBack}
              title="Return to Selection Portal"
              className="p-2 hover:bg-zinc-900 border border-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-400 animate-pulse" />
            <h1 className="text-sm font-black tracking-wider text-white uppercase font-mono">Catalyst WSS Client</h1>
          </div>
        </div>

        {}
        <div className="hidden lg:flex items-center gap-2 overflow-hidden text-zinc-400 text-xs font-semibold">
          <Hash className="w-4 h-4 text-zinc-600" />
          <span className="truncate text-zinc-200">
            {channels.find(c => c.id === selectedChannel)?.name || 'Welcome chat'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] text-zinc-500 font-mono">Node live</span>
        </div>

        {}
        <div className="flex items-center gap-1.5">
          {}
          <button 
            onClick={() => setShowConsole(!showConsole)}
            title="System Terminal Logs"
            className={`p-2 rounded-xl transition-all ${showConsole ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-transparent text-zinc-400 hover:text-white'}`}
          >
            <Terminal className="w-4 h-4" />
          </button>

          {}
          <button
            onClick={() => setMobileDrawer(mobileDrawer === 'servers' ? 'chat' : 'servers')}
            title="Toggle Servers Sidebar"
            className={`md:hidden p-2.5 rounded-xl border transition-all ${mobileDrawer === 'servers' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-zinc-200'}`}
          >
            <Menu className="w-4 h-4" />
          </button>

          {}
          <button
            onClick={() => setMobileDrawer(mobileDrawer === 'channels' ? 'chat' : 'channels')}
            title="Toggle Channels Sidebar"
            className={`md:hidden p-2.5 rounded-xl border transition-all ${mobileDrawer === 'channels' ? 'bg-zinc-600 border-indigo-500 text-white' : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-zinc-200'}`}
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </header>

      {}
      <div className="flex-1 flex overflow-hidden relative">

        {}
        <div className={`
          w-[72px] bg-zinc-950/90 flex flex-col items-center py-4 gap-3 border-r border-white/5 shrink-0 z-40 select-none
          transition-transform duration-300 ease-[0.16,1,0.3,1]
          absolute md:static top-0 bottom-0 left-0
          ${mobileDrawer === 'servers' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          {}
          <button
            onClick={() => { setSelectedGuild('home'); setMobileDrawer('chat'); }}
            className={`w-12 h-12 rounded-3xl transition-all duration-300 flex items-center justify-center relative group ${
              selectedGuild === 'home' 
                ? 'bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20' 
                : 'bg-zinc-800 text-zinc-400 hover:bg-indigo-600 hover:rounded-2xl hover:text-white'
            }`}
          >
            {selectedGuild === 'home' && (
              <span className="absolute -left-1 w-2 h-8 rounded-r-lg bg-white"></span>
            )}
            <svg viewBox="0 0 127.14 96.36" className="w-5.5 h-5.5 fill-current">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.51-2a75.58,75.58,0,0,0,73,0c.79.69,1.63,1.38,2.51,2a68.53,68.53,0,0,1-10.5,5,78.37,78.37,0,0,0,6.63,10.85,105.43,105.43,0,0,0,31-18.83C129,50.7,122.64,27.78,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
            </svg>
          </button>

          <div className="w-8 h-[2px] bg-zinc-800 rounded shrink-0"></div>

          {}
          <div className="flex-1 w-full overflow-y-auto no-scrollbar flex flex-col items-center gap-3">
            {guilds.map((guild) => {
              const isSel = selectedGuild === guild.id;
              return (
                <button
                  key={guild.id}
                  onClick={() => { setSelectedGuild(guild.id); setMobileDrawer('channels'); }}
                  className={`w-12 h-12 rounded-3xl transition-all duration-300 flex items-center justify-center relative overflow-hidden group shrink-0 ${
                    isSel 
                      ? 'rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                      : 'bg-zinc-900 text-zinc-300 hover:bg-purple-600 hover:rounded-2xl hover:text-white'
                  }`}
                >
                  {isSel && (
                    <span className="absolute -left-1 w-2 h-8 rounded-r-lg bg-white"></span>
                  )}

                  {guild.icon ? (
                    <img 
                      src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} 
                      alt={guild.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as any).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-xs font-bold font-mono tracking-tight">{getGuildInitials(guild.name)}</span>
                  )}
                </button>
              );
            })}
          </div>

          {}
          <div className="pt-2">
            <button 
              onClick={() => connectWebsocket()}
              className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-colors relative group border ${
                connectionStatus === 'Connected' 
                  ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/30' 
                  : connectionStatus === 'Connecting'
                    ? 'bg-amber-950/30 text-amber-400 border-amber-500/30'
                    : 'bg-rose-950/30 text-rose-400 border-rose-500/30'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${connectionStatus === 'Connecting' ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {}
        <div className={`
          w-56 bg-zinc-950/50 border-r border-white/5 flex flex-col shrink-0 select-none z-30
          transition-transform duration-300 ease-[0.16,1,0.3,1]
          absolute md:static top-0 bottom-0 left-0 md:left-auto md:ml-0
          ${mobileDrawer === 'channels' ? 'translate-x-0 md:translate-x-0 ml-[72px] md:ml-0' : '-translate-x-full md:translate-x-0'}
        `}>
          {}
          <div className="h-12 border-b border-white/5 px-4 flex items-center justify-between bg-black/15">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 truncate max-w-[120px]">
              {selectedGuild === 'home' ? 'Direct Messages' : guilds.find(g => g.id === selectedGuild)?.name || 'Guild Channels'}
            </span>
            <div className="flex items-center gap-1.5">
              {selectedGuild !== 'home' && (
                <button 
                  onClick={() => setShowGuildSettings(true)} 
                  className="p-1 min-w-[24px] min-h-[24px] hover:bg-white/10 rounded cursor-pointer"
                  title="Server Settings"
                >
                  <Settings className="w-3.5 h-3.5 text-zinc-400 hover:text-white transition-colors" />
                </button>
              )}
              <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1 py-0.5 rounded border border-indigo-400/20 font-bold uppercase">WSS</span>
            </div>
          </div>

          {}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 no-scrollbar">
            {channels.length === 0 ? (
              <div className="text-center py-12 px-3 text-xs text-zinc-650">
                <MessageSquare className="w-8 h-8 text-zinc-800 mx-auto mb-2 opacity-50" />
                <p>No active text lines detected.</p>
              </div>
            ) : selectedGuild === 'home' ? (
              <div className="space-y-4">
                {}
                <div className="space-y-0.5">
                  <button
                    onClick={() => { setSelectedChannel('friends'); setMobileDrawer('chat'); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all text-left ${
                      selectedChannel === 'friends' 
                        ? 'bg-indigo-600/30 text-white font-bold border border-indigo-500/20' 
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    <Users className="w-4 h-4 text-zinc-400" />
                    <span>Friends</span>
                  </button>
                  <button
                    onClick={() => { setSelectedChannel('nitro'); setMobileDrawer('chat'); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all text-left ${
                      selectedChannel === 'nitro' 
                        ? 'bg-indigo-600/30 text-white font-bold border border-indigo-500/20' 
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
                    <span>Nitro</span>
                  </button>
                  <button
                    onClick={() => { setSelectedChannel('shop'); setMobileDrawer('chat'); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all text-left ${
                      selectedChannel === 'shop' 
                        ? 'bg-indigo-600/30 text-white font-bold border border-indigo-500/20' 
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-amber-500" />
                    <span>Shop</span>
                  </button>
                </div>

                {}
                <div className="px-3 pt-2 pb-1 flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none select-none">
                  <span>Direct Messages</span>
                  <Plus className="w-3.5 h-3.5 hover:text-zinc-300 cursor-pointer transition-colors" />
                </div>

                {}
                <div className="space-y-0.5">
                  {channels.filter(c => c.type !== 4).map((chan) => {
                    const isSel = selectedChannel === chan.id;
                    const firstRecipient = chan.recipients && chan.recipients[0];
                    const avatarUrl = firstRecipient?.avatar 
                      ? `https://cdn.discordapp.com/avatars/${firstRecipient.id}/${firstRecipient.avatar}.png`
                      : null;

                    return (
                      <button
                        key={chan.id}
                        onClick={() => { setSelectedChannel(chan.id); setMobileDrawer('chat'); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all text-left ${
                          isSel 
                            ? 'bg-indigo-600/30 text-white font-bold border border-indigo-500/20 shadow-sm' 
                            : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                        }`}
                      >
                        <div className="relative w-5 h-5 rounded-full bg-zinc-800 shrink-0 flex items-center justify-center border border-white/5">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt=""
                              className="w-[18px] h-[18px] rounded-full object-cover"
                              onError={(e) => {
                                (e.target as any).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-[9px] font-bold text-zinc-300 uppercase select-none font-mono">
                              {chan.name.substring(0, 1)}
                            </span>
                          )}
                          <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-500 border border-zinc-950"></span>
                        </div>
                        <span className="truncate">{chan.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {}
                {channels.filter(c => c.type !== 4 && !c.parentId).length > 0 && (
                  <div className="space-y-0.5">
                    {channels.filter(c => c.type !== 4 && !c.parentId).map((chan) => {
                      const isSel = selectedChannel === chan.id;
                      return (
                        <button
                          key={chan.id}
                          onClick={() => { setSelectedChannel(chan.id); setMobileDrawer('chat'); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl transition-all text-left ${
                            isSel 
                              ? 'bg-indigo-600/30 text-white font-bold border border-indigo-500/20 shadow-sm' 
                              : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                          }`}
                        >
                          {chan.type === 2 || chan.type === 13 ? (
                            <Volume2 className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                          ) : chan.type === 5 ? (
                            <Megaphone className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                          ) : (
                            <Hash className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                          )}
                          <span className="truncate">{chan.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {}
                {channels.filter(c => c.type === 4).map((cat) => {
                  const catChannels = channels.filter(c => c.type !== 4 && c.parentId === cat.id);
                  return (
                    <div key={cat.id} className="space-y-0.5">
                      {}
                      <div className="px-1.5 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-left flex items-center gap-1 select-none">
                        <ChevronDown className="w-3 h-3 text-zinc-600 shrink-0" />
                        <span className="truncate">{cat.name}</span>
                      </div>
                      
                      {}
                      <div className="space-y-0.5 pl-1.5">
                        {catChannels.map((chan) => {
                          const isSel = selectedChannel === chan.id;
                          return (
                            <button
                              key={chan.id}
                              onClick={() => { setSelectedChannel(chan.id); setMobileDrawer('chat'); }}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-xl transition-all text-left ${
                                isSel 
                                  ? 'bg-indigo-600/30 text-white font-bold border border-indigo-500/20 shadow-sm' 
                                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                              }`}
                            >
                              {chan.type === 2 || chan.type === 13 ? (
                                <Volume2 className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                              ) : chan.type === 5 ? (
                                <Megaphone className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                              ) : (
                                <Hash className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                              )}
                              <span className="truncate">{chan.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {}
          {currentUser && (
            <div className="p-3 border-t border-white/5 bg-zinc-950/80 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 overflow-hidden cursor-pointer group" onClick={() => setHoveredProfile({ self: true })}>
                <div className="relative w-8 h-8 rounded-full shrink-0">
                  <img 
                    src={currentUser.avatar ? `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png` : 'https://ui-avatars.com/api/?name=' + currentUser.username} 
                    alt="Avatar" 
                    className="w-full h-full rounded-full object-cover border border-white/10" 
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black"></span>
                </div>
                <div className="overflow-hidden text-left">
                  <span className="text-xs font-bold text-white block truncate group-hover:text-indigo-400 transition-colors">
                    {currentUser.username}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono block truncate">
                    {cosmetics.customStatus || 'Active Gateway'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  onClick={() => setHoveredProfile({ self: true })}
                  className="p-1 text-zinc-500 hover:text-indigo-400 rounded transition-colors"
                  title="View Profile Bio Settings"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                  title="Disconnect & Unlink Token"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {}
        <div className="flex-1 bg-zinc-950/25 flex flex-col min-w-0 h-full relative" onClick={() => setMobileDrawer('chat')}>
          
          {}
          {(mobileDrawer !== 'chat') && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden" />
          )}

          {selectedChannel === 'friends' ? (
            renderFriendsDashboard()
          ) : selectedChannel === 'nitro' ? (
            renderNitroDashboard()
          ) : selectedChannel === 'shop' ? (
            renderShopDashboard()
          ) : (
            <>
              {}
              <div 
                ref={chatContainerRef}
                onScroll={handleChatScroll}
                className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 no-scrollbar min-w-0 relative"
              >
                {connectionStatus !== 'Connected' ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-2xl font-bold mb-4 animate-[bounce_2s_infinite]">
                      ⚡
                    </div>
                    <h4 className="text-base font-bold text-white mb-2">Connecting to Gateway Stream...</h4>
                    <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                      Establishing WebSocket handshake protocol to monitor live text conversations safely.
                    </p>
                    <button
                      onClick={() => connectWebsocket()}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Connect live socket
                    </button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20">
                    <MessageSquare className="w-12 h-12 text-zinc-800 mb-3" />
                    <p className="text-sm font-bold text-zinc-650">No chat history lines downloaded.</p>
                    <span className="text-[10px] text-zinc-500 font-mono mt-1">Dispatched websocket events will stream feed here.</span>
                  </div>
                ) : (
                  <div className="space-y-4 min-w-0">
                    {[...messages].reverse().map((message) => {
                      const isSelf = isSelfUser(message.author.id);
                      const displayUsername = isSelf ? (cosmetics.customStatus ? (currentUser?.username || message.author.username) : message.author.username) : message.author.username;
                      const displayAvatarSrc = isSelf 
                        ? (currentUser?.avatar 
                            ? `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png` 
                            : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&h=100&h=100&q=80') 
                        : (message.author.avatar 
                            ? `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png` 
                            : `https://ui-avatars.com/api/?name=${message.author.username}`);

                      return (
                        <div key={message.id} className="flex gap-3.5 p-1 rounded hover:bg-white/[0.012] transition-colors group relative min-w-0 text-left">
                          <div 
                            className="relative w-10 h-10 rounded-full shrink-0 cursor-pointer"
                            onClick={() => setHoveredProfile(isSelf ? { self: true } : message)}
                          >
                            <img 
                              src={displayAvatarSrc} 
                              alt="Avatar" 
                              className="w-full h-full object-cover rounded-full border border-white/5" 
                              referrerPolicy="no-referrer"
                            />
                            {isSelf && cosmetics.avatarDecoration !== 'none' && (
                              <span className="absolute inset-[-3px] border border-pink-400 rounded-full animate-pulse"></span>
                            )}
                          </div>

                          <div className="flex-1 space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span 
                                onClick={() => setHoveredProfile(isSelf ? { self: true } : message)}
                                className={`text-xs font-bold hover:underline cursor-pointer ${isSelf ? 'text-indigo-400 font-extrabold' : 'text-zinc-200'}`}
                              >
                                {displayUsername}
                              </span>

                              <span className="text-[9px] text-zinc-500 font-mono">
                                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            
                            <div className="text-xs text-zinc-300 leading-relaxed font-normal break-words whitespace-pre-wrap select-text selection:bg-indigo-500/30">
                              {renderMessageContent(message.content, message)}
                            </div>

                            {}
                            {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-2 max-w-lg">
                                {message.attachments.map((att: any, index: number) => {
                                  const isImg = att.content_type?.startsWith('image/') || att.filename?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                  if (isImg) {
                                    return (
                                      <div key={att.id || index} className="relative rounded-lg overflow-hidden max-h-[300px] border border-white/5 inline-block">
                                        <img 
                                          src={att.url} 
                                          alt={att.filename || "Attachment"} 
                                          className="max-w-full max-h-[300px] object-contain rounded-md"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <a 
                                        key={att.id || index} 
                                        href={att.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 bg-zinc-900/60 rounded-lg border border-white/5 hover:bg-zinc-900 transition-colors w-full sm:w-[320px]"
                                      >
                                        <span className="text-2xl">📁</span>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-bold text-zinc-200 truncate">{att.filename}</p>
                                          <p className="text-[10px] text-zinc-500 font-mono">{(att.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                      </a>
                                    );
                                  }
                                })}
                              </div>
                            )}

                            {}
                            {message.embeds && Array.isArray(message.embeds) && message.embeds.length > 0 && (
                              <div className="mt-2 space-y-2 max-w-xl">
                                {message.embeds.map((emb: any, idx: number) => {
                                  const borderHex = emb.color ? '#' + Number(emb.color).toString(16).padStart(6, '0') : '#1e1f22';
                                  return (
                                    <div 
                                      key={idx} 
                                      className="bg-[#1e1f22]/70 rounded-md border-l-4 p-3.5 space-y-2 select-text text-left max-w-lg"
                                      style={{ borderLeftColor: borderHex }}
                                    >
                                      {emb.author && (
                                        <div className="flex items-center gap-2">
                                          {emb.author.icon_url && (
                                            <img 
                                              src={emb.author.icon_url} 
                                              alt="" 
                                              className="w-5 h-5 rounded-full object-cover" 
                                              referrerPolicy="no-referrer"
                                            />
                                          )}
                                          <span className="text-[11px] font-bold text-zinc-200">{emb.author.name}</span>
                                        </div>
                                      )}

                                      {emb.title && (
                                        <h5 className="text-xs font-bold text-white hover:underline cursor-pointer">
                                          {emb.url ? (
                                            <a href={emb.url} target="_blank" rel="noopener noreferrer">{emb.title}</a>
                                          ) : (
                                            emb.title
                                          )}
                                        </h5>
                                      )}

                                      {emb.description && (
                                        <div className="text-xs text-zinc-300 leading-normal">
                                          {renderMessageContent(emb.description, message)}
                                        </div>
                                      )}

                                      {}
                                      {emb.fields && Array.isArray(emb.fields) && emb.fields.length > 0 && (
                                        <div className="grid grid-cols-2 gap-3 pt-1">
                                          {emb.fields.map((field: any, fidx: number) => (
                                            <div key={fidx} className={`${field.inline ? 'col-span-1' : 'col-span-2'} space-y-0.5`}>
                                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{field.name}</span>
                                              <p className="text-xs text-zinc-200 leading-normal">{field.value}</p>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {emb.image && emb.image.url && (
                                        <div className="mt-2 rounded overflow-hidden max-h-[200px] border border-white/5">
                                          <img 
                                            src={emb.image.url} 
                                            alt="" 
                                            className="w-full h-full object-cover" 
                                            referrerPolicy="no-referrer"
                                          />
                                        </div>
                                      )}

                                      {emb.footer && (
                                        <div className="pt-1 flex items-center gap-1.5 text-[9px] text-zinc-500 font-semibold uppercase">
                                          {emb.footer.icon_url && (
                                            <img 
                                              src={emb.footer.icon_url} 
                                              alt="" 
                                              className="w-4 h-4 rounded-full object-cover" 
                                              referrerPolicy="no-referrer"
                                            />
                                          )}
                                          <span>{emb.footer.text}</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {!isAtBottom && messages.length > 0 && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30">
                  <button
                    onClick={scrollToBottom}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-full shadow-xl shadow-black/80 text-xs border border-indigo-400/30 flex items-center gap-1.5 transition-all active:scale-95 duration-200"
                  >
                    <span>⬇️ Jump to Bottom</span>
                  </button>
                </div>
              )}

              {}
              {selectedChannel && (
                <footer className="p-4 bg-zinc-950/40 border-t border-white/5 shrink-0 relative z-10" onClick={(e) => e.stopPropagation()}>
                  <form 
                    onSubmit={(e) => {
                      handleSendMessage(e);
                      
                      const target = e.target as HTMLFormElement;
                      const input = target.querySelector('input');
                      if (input) setTimeout(() => input.focus(), 10);
                    }} 
                    className="relative flex items-center"
                  >
                    <input 
                      type="text" 
                      autoComplete="off"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder={`Message #${channels.find(c => c.id === selectedChannel)?.name || 'chat'} ...`}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-5 pr-14 py-3.5 text-xs text-zinc-100 placeholder:text-zinc-650 focus:outline-none focus:border-indigo-500/40"
                      disabled={false}
                    />
                    <button
                      type="submit"
                      disabled={sending || !messageInput.trim()}
                      className="absolute right-2.5 p-2 bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg disabled:opacity-30 rounded-lg text-white transition-all scale-95 hover:scale-100"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </footer>
              )}
            </>
          )}
        </div>
      </div>

      {}
      <AnimatePresence>
        {showConsole && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="absolute bottom-0 left-0 right-0 h-64 bg-zinc-950 border-t border-white/10 z-50 flex flex-col font-mono"
          >
            <div className="h-10 bg-zinc-900 px-4 flex items-center justify-between border-b border-white/5 text-[11px] text-zinc-400 font-bold tracking-wide">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>Catalyst live-gateway activity terminal feed</span>
              </div>
              <button 
                onClick={() => setShowConsole(false)}
                className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto text-[10px] text-indigo-300 space-y-1.5 selection:bg-indigo-500/20 list-none text-left select-text custom-scrollbar">
              {logs.length === 0 ? (
                <li className="text-zinc-500 italic">No events generated. Gateway session idle.</li>
              ) : (
                logs.map((log, i) => (
                  <li key={i} className="leading-relaxed border-l-2 border-indigo-500/20 pl-2.5 hover:bg-white/[0.01] transition-colors">{log}</li>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {hoveredProfile && (() => {
          const userObj = fetchedProfile?.user || (hoveredProfile.self ? currentUser : hoveredProfile.author);
          if (!userObj) return null;

          const isAnimated = userObj.banner?.startsWith('a_');
          const bannerUrl = userObj.banner ? `https://cdn.discordapp.com/banners/${userObj.id}/${userObj.banner}.${isAnimated ? 'gif' : 'png'}?size=600` : null;
          const accentColor = userObj.accent_color ? `#${userObj.accent_color.toString(16).padStart(6, '0')}` : '#5865F2';

          const isAvatarAnimated = userObj.avatar?.startsWith('a_');
          const avatarUrl = userObj.avatar ? `https://cdn.discordapp.com/avatars/${userObj.id}/${userObj.avatar}.${isAvatarAnimated ? 'gif' : 'png'}?size=256` : `https://ui-avatars.com/api/?name=${userObj.username || 'Catalyst'}`;

          const publicFlags = userObj.public_flags || 0;
          const badgesList = [];
          if (publicFlags & 1) badgesList.push({ name: 'Discord Staff', url: 'https://raw.githubusercontent.com/rhon97/discord-badges/main/assets/discord-staff.svg' });
          if (publicFlags & 2) badgesList.push({ name: 'Discord Partner', url: 'https://raw.githubusercontent.com/rhon97/discord-badges/main/assets/discord-partner.svg' });
          if (publicFlags & 4) badgesList.push({ name: 'HypeSquad Events', url: 'https://raw.githubusercontent.com/rhon97/discord-badges/main/assets/hypesquad-events.svg' });
          if (publicFlags & 8) badgesList.push({ name: 'Bug Hunter Level 1', url: 'https://raw.githubusercontent.com/rhon97/discord-badges/main/assets/bug-hunter-1.svg' });
          if (publicFlags & 64) badgesList.push({ name: 'HypeSquad Bravery', url: 'https://raw.githubusercontent.com/rhon97/discord-badges/main/assets/hypesquad-bravery.svg' });
          if (publicFlags & 128) badgesList.push({ name: 'HypeSquad Brilliance', url: 'https://raw.githubusercontent.com/rhon97/discord-badges/main/assets/hypesquad-brilliance.svg' });
          if (publicFlags & 256) badgesList.push({ name: 'HypeSquad Balance', url: 'https://raw.githubusercontent.com/rhon97/discord-badges/main/assets/hypesquad-balance.svg' });
          if (publicFlags & 512) badgesList.push({ name: 'Early Supporter', url: 'https://raw.githubusercontent.com/rhon97/discord-badges/main/assets/early-supporter.svg' });
          if (publicFlags & 16384) badgesList.push({ name: 'Bug Hunter Level 2', url: 'https://raw.githubusercontent.com/rhon97/discord-badges/main/assets/bug-hunter-2.svg' });
          if (publicFlags & 131072) badgesList.push({ name: 'Verified Developer', url: 'https://raw.githubusercontent.com/rhon97/discord-badges/main/assets/discord-developer.svg' });
          if (publicFlags & 262144) badgesList.push({ name: 'Certified Moderator', url: 'https://raw.githubusercontent.com/rhon97/discord-badges/main/assets/certified-moderator.svg' });
          if (publicFlags & 4194304) badgesList.push({ name: 'Active Developer', url: 'https://raw.githubusercontent.com/rhon97/discord-badges/main/assets/active-developer.svg' });

          const presenceStatus = fetchedProfile?.presence?.status || 'offline';
          const statusColors: any = {
            online: '#23a55a',
            idle: '#f0b232',
            dnd: '#f23f43',
            offline: '#80848e'
          };
          const statusDot = statusColors[presenceStatus] || statusColors.offline;

          const customStatusAct = fetchedProfile?.presence?.activities?.find((act: any) => act.type === 4);
          const customStatusText = customStatusAct?.state || (hoveredProfile.self ? cosmetics.customStatus : null);
          const customStatusEmoji = customStatusAct?.emoji?.name || (hoveredProfile.self ? cosmetics.customStatusEmoji : null);

          const otherActivities = fetchedProfile?.presence?.activities?.filter((act: any) => act.type !== 4) || [];
          const bioText = fetchedProfile?.user_profile?.bio || userObj.bio || (hoveredProfile.self ? cosmetics.aboutMe : 'An verified user operating within the standard standalone Catalyst WSS Client.');

          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
              onClick={() => setHoveredProfile(null)}
            >
              <div 
                className="w-full max-w-sm rounded-[2rem] overflow-hidden border border-white/15 bg-[#10111A] text-zinc-100 shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className="h-28 w-full relative bg-cover bg-center"
                  style={{ 
                    backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined,
                    backgroundColor: accentColor
                  }}
                />

                <div className="p-5 space-y-4 bg-gradient-to-b from-[#161720]/80 to-[#0e0e11]/95">
                  <div className="flex justify-between items-end -mt-16 relative z-10">
                    <div className="w-20 h-20 bg-zinc-950 rounded-full p-1 border border-white/5 relative">
                      <img 
                        src={avatarUrl} 
                        alt="Avatar" 
                        className="w-full h-full object-cover rounded-full" 
                        referrerPolicy="no-referrer"
                      />
                      <span 
                        className="absolute bottom-1 right-1 w-4.5 h-4.5 rounded-full border-2 border-[#10111A]"
                        style={{ backgroundColor: statusDot }}
                      />
                    </div>

                    {badgesList.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-xl border border-white/5">
                        {badgesList.map((b, i) => (
                          <img 
                            key={i} 
                            src={b.url} 
                            title={b.name} 
                            className="w-4 h-4 object-contain select-none" 
                            referrerPolicy="no-referrer" 
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-base font-extrabold text-white">
                      {userObj.global_name || userObj.username}
                    </h4>
                    <p className="text-[10.5px] text-zinc-500 font-mono">
                      @{userObj.username?.toLowerCase()}
                    </p>
                  </div>

                  {customStatusText && (
                    <div className="bg-black/45 border border-white/5 rounded-xl p-2.5 text-xs flex items-center gap-2">
                      <span>{customStatusEmoji || '🔮'}</span>
                      <span className="text-zinc-300 font-semibold italic">{customStatusText}</span>
                    </div>
                  )}

                  <div className="border-t border-white/5 pt-3 space-y-3 text-left">
                    {fetchingProfile ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-2 bg-white/10 rounded w-1/4"></div>
                        <div className="h-3 bg-white/5 rounded w-full"></div>
                        <div className="h-3 bg-white/5 rounded w-5/6"></div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <h5 className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest font-mono">Biography</h5>
                          <p className="text-xs text-zinc-300 leading-normal whitespace-pre-wrap">
                            {bioText}
                          </p>
                        </div>

                        {otherActivities.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <h5 className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest font-mono">Activities</h5>
                            {otherActivities.map((act: any, i: number) => {
                              const isSpotifyAct = act.name === 'Spotify' || act.type === 2;
                              const largeImg = act.assets?.large_image;
                              let imgUrl = null;
                              if (largeImg) {
                                if (largeImg.startsWith('spotify:')) {
                                  imgUrl = `https://i.scdn.co/image/${largeImg.substring(8)}`;
                                } else if (largeImg.startsWith('mp:external/')) {
                                  const splitMatch = largeImg.match(/https\/(.*)/);
                                  if (splitMatch) imgUrl = `https://${splitMatch[1]}`;
                                } else if (act.application_id) {
                                  imgUrl = `https://cdn.discordapp.com/app-assets/${act.application_id}/${largeImg}.png`;
                                }
                              }

                              return (
                                <div key={i} className={`p-3 rounded-xl border ${isSpotifyAct ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-black/30 border-white/5'} flex gap-3 text-left`}>
                                  {imgUrl && (
                                    <img src={imgUrl} className="w-12 h-12 rounded-lg object-cover" alt="activity" referrerPolicy="no-referrer" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 font-mono">
                                      {isSpotifyAct ? 'Listening to Spotify' : (act.type === 0 ? 'Playing a Game' : 'Active Status')}
                                    </p>
                                    <p className="text-xs font-bold text-white truncate">{act.name}</p>
                                    {act.details && <p className="text-[11px] text-zinc-300 truncate">{act.details}</p>}
                                    {act.state && <p className="text-[11px] text-zinc-400 truncate">{act.state}</p>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}

                    <div className="space-y-1">
                      <h5 className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest font-mono">User ID</h5>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        {userObj.id}
                      </p>
                    </div>

                    {!hoveredProfile.self && (
                      <div className="pt-2 flex flex-wrap gap-1.5 border-t border-white/5">
                        <button 
                          onClick={() => {
                            api.discordPost(activeToken, `https://discord.com/api/v9/users/@me/relationships/${userObj.id}`, { direction: 1 }, 'PUT')
                              .then(() => addLog(`Friend request sent to ${userObj.username}`))
                              .catch((e) => addLog(`Failed to add friend: ${e.message || e}`));
                          }}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-[10px] uppercase flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <UserPlus className="w-3 h-3" /> Add Friend
                        </button>

                        <button 
                          onClick={() => {
                            api.discordPost(activeToken, `https://discord.com/api/v9/users/@me/channels`, { recipient_id: userObj.id })
                              .then((chan: any) => {
                                if (chan && chan.id) {
                                  setChannels(prev => {
                                    if (!prev.find(c => c.id === chan.id)) {
                                      return [...prev, {
                                        id: chan.id,
                                        name: userObj.username,
                                        type: 1,
                                        position: 0,
                                        recipients: [{ id: userObj.id, username: userObj.username, avatar: userObj.avatar }]
                                      }];
                                    }
                                    return prev;
                                  });
                                  setSelectedChannel(chan.id);
                                  setHoveredProfile(null);
                                }
                              })
                              .catch((e) => addLog(`Failed to open DM: ${e.message || e}`));
                          }}
                          className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded text-[10px] uppercase flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3" /> Message
                        </button>

                        <button 
                          onClick={() => {
                            api.discordPost(activeToken, `https://discord.com/api/v9/users/@me/channels`, { recipient_id: userObj.id })
                              .then((chan: any) => {
                                if (chan && chan.id) {
                                  return api.discordPost(activeToken, `https://discord.com/api/v9/channels/${chan.id}/call/ring`, { recipients: [userObj.id] });
                                }
                              })
                              .then(() => addLog(`Ringing user ${userObj.username}`))
                              .catch((e) => addLog(`Failed to call: ${e.message || e}`));
                          }}
                          className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded text-[10px] uppercase flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Phone className="w-3 h-3" /> Call
                        </button>

                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(userObj.id);
                            addLog(`Copied User ID: ${userObj.id}`);
                          }}
                          className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded text-[10px] uppercase flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3 h-3" /> Copy ID
                        </button>
                      </div>
                    )}
                  </div>

                  {!hoveredProfile.self && selectedGuild !== 'home' && (
                     <div className="border-t border-white/5 pt-3 space-y-2">
                       <h5 className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest font-mono text-left mb-1">Server Moderation</h5>
                       <div className="grid grid-cols-2 gap-2">
                         <button onClick={async () => {
                           await api.discordPost(activeToken, `https://discord.com/api/v9/guilds/${selectedGuild}/bans/${userObj.id}`, { delete_message_days: 0 }, 'PUT');
                           addLog(`Issued Ban for user ${userObj.id}`);
                         }} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded text-[10px] font-bold uppercase cursor-pointer">Ban User</button>
                         <button onClick={async () => {
                           await api.discordPost(activeToken, `https://discord.com/api/v9/guilds/${selectedGuild}/members/${userObj.id}`, {}, 'DELETE');
                           addLog(`Issued Kick for user ${userObj.id}`);
                         }} className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded text-[10px] font-bold uppercase cursor-pointer">Kick User</button>
                         <button onClick={async () => {
                           const timeoutUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
                           await api.discordPost(activeToken, `https://discord.com/api/v9/guilds/${selectedGuild}/members/${userObj.id}`, { communication_disabled_until: timeoutUntil }, 'PATCH');
                           addLog(`Issued 1hr Timeout for user ${userObj.id}`);
                         }} className="px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded text-[10px] font-bold uppercase cursor-pointer">Timeout (1h)</button>
                         <button className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-bold uppercase cursor-pointer">Manage Roles</button>
                       </div>
                     </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button 
                      onClick={() => setHoveredProfile(null)}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Close Profile Card
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {showGuildSettings && selectedGuild !== 'home' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl max-h-[85vh] bg-[#313338] rounded-lg shadow-2xl flex overflow-hidden border border-white/5"
            >
              {}
              <div className="w-1/3 bg-[#2B2D31] p-4 flex flex-col pt-12 overflow-y-auto hidden sm:flex border-r border-[#1E1F22]">
                <div className="text-xs font-bold uppercase text-[#80848E] pl-2 mb-2 tracking-wider">
                  {guilds.find(g => g.id === selectedGuild)?.name || 'Server Settings'}
                </div>
                
                <button 
                  onClick={() => setGuildSettingsTab('overview')}
                  className={`text-left px-2 py-1.5 rounded text-sm mb-1 ${guildSettingsTab === 'overview' ? 'text-[#DBDEE1] bg-[#404249]' : 'text-[#B5BAC1] hover:bg-[#35373C]'}`}
                >
                  Overview
                </button>
                <button 
                  onClick={() => setGuildSettingsTab('roles')}
                  className={`text-left px-2 py-1.5 rounded text-sm mb-1 ${guildSettingsTab === 'roles' ? 'text-[#DBDEE1] bg-[#404249]' : 'text-[#B5BAC1] hover:bg-[#35373C]'}`}
                >
                  Roles
                </button>
                <button 
                  onClick={() => setGuildSettingsTab('emoji')}
                  className={`text-left px-2 py-1.5 rounded text-sm mb-1 ${guildSettingsTab === 'emoji' ? 'text-[#DBDEE1] bg-[#404249]' : 'text-[#B5BAC1] hover:bg-[#35373C]'}`}
                >
                  Emoji
                </button>
                <button 
                  onClick={() => setGuildSettingsTab('webhooks')}
                  className={`text-left px-2 py-1.5 rounded text-sm mb-1 ${guildSettingsTab === 'webhooks' ? 'text-[#DBDEE1] bg-[#404249]' : 'text-[#B5BAC1] hover:bg-[#35373C]'}`}
                >
                  Integrations (Webhooks)
                </button>

                <div className="h-[1px] bg-[#1E1F22] my-3 mx-2" />
                
                <button className="text-left px-2 py-1.5 rounded text-sm text-[#B5BAC1] hover:bg-[#35373C] mb-1">
                  Widget
                </button>
                <button className="text-left px-2 py-1.5 rounded text-sm text-[#B5BAC1] hover:bg-[#35373C] mb-1">
                  Server Template
                </button>
                <button className="text-left px-2 py-1.5 rounded text-sm text-[#B5BAC1] hover:bg-[#35373C] mb-1">
                  Custom Invite Link
                </button>

                <div className="h-[1px] bg-[#1E1F22] my-3 mx-2" />

                <div className="text-xs font-bold uppercase text-[#80848E] pl-2 mb-2 tracking-wider">
                  User Management
                </div>
                <button className="text-left px-2 py-1.5 rounded text-sm text-[#B5BAC1] hover:bg-[#35373C] mb-1">
                  Members
                </button>
                <button className="text-left px-2 py-1.5 rounded text-sm text-[#B5BAC1] hover:bg-[#35373C] mb-1">
                  Invites
                </button>
                <button className="text-left px-2 py-1.5 rounded text-sm text-[#B5BAC1] hover:bg-[#35373C] mb-1">
                  Bans
                </button>
              </div>

              {}
              <div className="flex-1 bg-[#313338] relative p-10 overflow-y-auto">
                <button 
                  onClick={() => setShowGuildSettings(false)}
                  className="absolute top-5 right-5 w-8 h-8 rounded-full border-2 border-[#80848E] text-[#80848E] hover:bg-[#80848E]/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="text-[10px] text-center font-bold text-[#80848E] absolute top-14 right-5 uppercase tracking-widest mt-1">ESC</div>

                {guildSettingsTab === 'overview' && (
                  <>
                    <h2 className="text-xl font-bold text-white mb-6">Server Overview</h2>

                    <div className="flex gap-6 mb-8">
                      {}
                      <div className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-[#1E1F22] rounded-full flex items-center justify-center border-2 border-dashed border-[#80848E] text-[#B5BAC1] relative cursor-pointer group mb-2">
                           {guilds.find(g => g.id === selectedGuild)?.icon ? (
                             <img src={`https://cdn.discordapp.com/icons/${selectedGuild}/${guilds.find(g => g.id === selectedGuild)?.icon}.png`} alt="Server Icon" className="w-full h-full object-cover rounded-full" />
                           ) : (
                             <span className="text-xs uppercase">{guilds.find(g => g.id === selectedGuild)?.name?.substring(0, 2) || 'S'}</span>
                           )}
                           <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center font-bold opacity-0 group-hover:opacity-100 transition-opacity text-xs shadow-inner">
                             UPLOAD
                           </div>
                        </div>
                        <div className="text-[9px] text-[#80848E] text-center w-32 left">Minimum Size: 128x128<br/>Recommend: 512x512</div>
                      </div>

                      {}
                      <div className="flex-1 space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-[#B5BAC1] uppercase tracking-wider mb-2">Server Name</label>
                          <input 
                            type="text" 
                            value={guilds.find(g => g.id === selectedGuild)?.name || ''} 
                            readOnly
                            className="w-full bg-[#1E1F22] text-[#DBDEE1] rounded px-3 py-2 text-sm focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#404249] pt-6 space-y-4">
                      <h3 className="text-[#DBDEE1] font-bold text-sm tracking-wide">Catalyst Admin Access Overrides</h3>
                      
                      <div className="p-4 bg-[#2B2D31] rounded-lg border border-[#1E1F22]">
                        <div className="flex items-center gap-3 mb-2">
                          <Shield className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-semibold text-white">Full Guild Enumeration</span>
                        </div>
                        <p className="text-xs text-[#80848E] leading-loose">
                          Catalyst automatically resolves full guild meta-properties (Integrations, Audit Logs, Webhooks) when accessed regardless of target discord server permissions. Some functions may be completely spoofed client-side if REST rejects changes. 
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {guildSettingsTab === 'roles' && (
                  <>
                    <h2 className="text-xl font-bold text-white mb-6">Roles</h2>
                    <p className="text-sm text-[#80848E] mb-4">Use roles to group your server members and assign permissions.</p>
                    <div className="bg-[#2B2D31] rounded-lg border border-[#1E1F22] p-6 text-center">
                      <Shield className="w-12 h-12 text-[#80848E] mx-auto mb-4" />
                      <h3 className="text-white font-bold mb-2">Role Management Ready</h3>
                      <p className="text-sm text-[#B5BAC1] max-w-md mx-auto mb-4">You have permissions to create and manage roles. Any changes bypass UI locks.</p>
                      <button className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-sm font-semibold transition-colors">
                        Create Role
                      </button>
                    </div>
                  </>
                )}

                {guildSettingsTab === 'webhooks' && (
                  <>
                    <h2 className="text-xl font-bold text-white mb-6">Integrations & Webhooks</h2>
                    <p className="text-sm text-[#80848E] mb-4">Webhooks are a low-effort way to post messages from other apps and sites into Discord automatically.</p>
                    <div className="bg-[#2B2D31] rounded-lg border border-[#1E1F22] overflow-hidden">
                      <div className="p-4 border-b border-[#1E1F22] flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-white">Catalyst System Webhook</h3>
                          <div className="text-xs text-[#B5BAC1]">Channel: #general</div>
                        </div>
                        <button className="px-4 py-1.5 bg-black/20 hover:bg-black/40 border border-white/10 text-white rounded text-sm transition-colors">
                          Copy URL
                        </button>
                      </div>
                      <div className="p-4 bg-[#1E1F22]/50 text-center">
                        <button className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-sm font-semibold transition-colors">
                          New Webhook
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="py-2 bg-[#1E1F22] border-t border-[#313338] text-center text-[11px] text-[#80848E] font-mono">
        ©️ {new Date().getFullYear()} Yuri Gateway Client. All rights reserved.
      </footer>
    </div>
  );
}
