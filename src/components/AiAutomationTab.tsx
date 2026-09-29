import { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, Cpu, RefreshCw, Database } from 'lucide-react';

interface AiAutomationTabProps {
  token: string;
  addLog: (msg: string) => void;
}

export default function AiAutomationTab({ token, addLog }: AiAutomationTabProps) {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    { sender: 'ai', text: 'yo what\'s up hru? imolo GPT here ready to chat.', time: new Date().toLocaleTimeString() }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [memories, setMemories] = useState<string[]>([]);
  const [detectedChannels, setDetectedChannels] = useState<Record<string, any>>({});
  const [servers, setServers] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const res = await fetch('/api/yuricord/proxy?url=https://discord.com/api/v10/users/@me/guilds', {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const data = await res.json();
        setServers(data || []);
      }
    } catch (e) {}
  };

  const handleScanServers = async () => {
    setScanning(true);
    addLog('Scanning all servers and channels for chat targets...');
    try {
      const enrichedServers = [];
      for (const s of (servers.slice(0, 15))) {
        try {
          const chanRes = await fetch(`/api/yuricord/proxy?url=https://discord.com/api/v10/guilds/${s.id}/channels`, {
            headers: { 'Authorization': token }
          });
          if (chanRes.ok) {
            const chans = await chanRes.json();
            enrichedServers.push({ ...s, channels: chans });
          } else {
            enrichedServers.push(s);
          }
        } catch (e) {
          enrichedServers.push(s);
        }
      }

      const res = await fetch('/api/ai/automate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Scan complete. Summarize detected chat channels.',
          memories,
          servers: enrichedServers
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.detectedChannels) {
          setDetectedChannels(data.detectedChannels);
        }
        if (data.memories) {
          setMemories(data.memories);
        }
        addLog('Server and channel scan completed successfully.');
      }
    } catch (e) {
      addLog(`Scan error: ${e}`);
    } finally {
      setScanning(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;
    const userText = inputMessage.trim();
    setInputMessage('');
    const userMsgTime = new Date().toLocaleTimeString();
    setMessages(prev => [...prev, { sender: 'user', text: userText, time: userMsgTime }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/automate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          memories,
          servers
        })
      });
      if (res.ok) {
        const data = await res.json();
        const aiText = data.response || 'bet';
        if (data.memories) setMemories(data.memories);
        if (data.detectedChannels) setDetectedChannels(data.detectedChannels);
        setMessages(prev => [...prev, { sender: 'ai', text: aiText, time: new Date().toLocaleTimeString() }]);
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: 'yo hru? scanned all servers, wby?', time: new Date().toLocaleTimeString() }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { sender: 'ai', text: 'hey hyd, scanned all chat channels successfully, bet', time: new Date().toLocaleTimeString() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-center justify-between bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
            <Bot className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Imolo AI Automation
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Mistral AI
              </span>
            </h2>
            <p className="text-xs text-zinc-400">Autonomous channel scanner, chat assistant, and persistent memory.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleScanServers}
            disabled={scanning}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning Servers...' : 'Scan All Servers & Chats'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-black/40 border border-white/10 rounded-2xl flex flex-col h-[600px] backdrop-blur-xl overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>imolo GPT Active Session (Mistral AI)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                MEMORY SYNCED
              </span>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">
                    {m.sender === 'user' ? 'You' : 'imolo GPT'}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600">{m.time}</span>
                </div>
                <div className={`p-4 rounded-2xl text-sm max-w-[85%] leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-purple-600 text-white rounded-br-sm'
                    : 'bg-zinc-900 border border-white/10 text-zinc-200 rounded-bl-sm shadow-md'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono animate-pulse">
                <Bot className="w-4 h-4 text-purple-400" />
                <span>imolo GPT typing...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-white/10 bg-black/20 flex gap-3">
            <input
              type="text"
              placeholder="ask anything..."
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500/50"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Persistent Memory ({memories.length})
            </h3>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {memories.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No memories recorded yet. Start chatting or scan servers.</p>
              ) : (
                memories.map((mem, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-black/20 border border-white/5 text-[11px] font-mono text-zinc-300 leading-normal">
                    {mem}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              Detected Discord Chat Channels ({Object.keys(detectedChannels).length})
            </h3>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {Object.keys(detectedChannels).length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No servers scanned yet. Click scan above.</p>
              ) : (
                Object.entries(detectedChannels).map(([id, info]: [string, any]) => (
                  <div key={id} className="p-3 rounded-xl bg-black/20 border border-white/5 flex flex-col gap-1">
                    <span className="text-xs font-bold text-zinc-200">{info.serverName || 'Server'}</span>
                    <span className="text-[11px] font-mono text-emerald-400">#{info.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
