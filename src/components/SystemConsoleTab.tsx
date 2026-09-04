import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Cpu, HardDrive, Loader2, Trash2, Maximize2, Minimize2, Wifi, WifiOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';


import '../lib/patchXterm';

export default function SystemConsoleTab({ fullscreen = false, onOpenFullTerminal }: { fullscreen?: boolean; onOpenFullTerminal?: () => void }) {
  const [stats, setStats] = useState<any>(null);
  const [connStatus, setConnStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [neofetchImage, setNeofetchImage] = useState<string | null>(null);
  const [isExpandedTerm, setIsExpandedTerm] = useState(false);
  const [mobileInput, setMobileInput] = useState('');
  const [isCtrlActive, setIsCtrlActive] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<Terminal | null>(null);
  const fitAddonInstance = useRef<FitAddon | null>(null);
  const wsInstance = useRef<WebSocket | null>(null);

  const handleAiAsk = async () => {
    if (!aiPrompt.trim() || isAiLoading) return;
    const promptText = aiPrompt.trim();
    setAiPrompt('');
    setIsAiLoading(true);

    const term = xtermInstance.current;
    if (term) {
      term.writeln(`\r\n\x1b[1;36m> AI Query: ${promptText}\x1b[0m`);
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
      });
      const data = await res.json();
      if (data.success && data.reply) {
        if (term) {
          const lines = data.reply.split('\n');
          term.writeln('\x1b[1;32mAI Response:\x1b[0m');
          for (const line of lines) {
            term.writeln(`  ${line}`);
          }
          term.write('\r\n$ ');
        }
      } else {
        if (term) {
          term.writeln(`\r\n\x1b[1;31mAI Error: ${data.error || 'Failed to get response'}\x1b[0m\r\n$ `);
        }
      }
    } catch (err: any) {
      if (term) {
        term.writeln(`\r\n\x1b[1;31mAI Request Error: ${err.message}\x1b[0m\r\n$ `);
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
        fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  
  useEffect(() => {
    if (!terminalRef.current) return;

    
    let isDisposed = false;
    let resizeTimer: any = null;
    let resizeObserver: ResizeObserver | null = null;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: '"Fira Code", "Courier New", Menlo, Monaco, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      theme: {
        background: '#090a0f',
        foreground: '#10b981',
        cursor: '#34d399',
        cursorAccent: '#090a0f',
        selectionBackground: 'rgba(52, 211, 153, 0.3)',
        black: '#000000',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#ec4899',
        cyan: '#06b6d4',
        white: '#f3f4f6',
        brightBlack: '#4b5563',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#f472b6',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();

    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    
    resizeTimer = setTimeout(() => {
      if (isDisposed) return;
      try {
        fitAddon.fit();
      } catch (e) {}
    }, 100);

    xtermInstance.current = term;
    fitAddonInstance.current = fitAddon;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = localStorage.getItem('token') || '';
    const wsUrl = `${protocol}//${window.location.host}/api/system/shell-ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsInstance.current = ws;

    ws.onopen = () => {
      if (isDisposed) return;
      setConnStatus('connected');
      
      try {
        ws.send(JSON.stringify({
          type: "resize",
          cols: term.cols,
          rows: term.rows
        }));
      } catch (e) {}
    };

    ws.onmessage = (event) => {
      if (isDisposed) return;
      try {
        const data = event.data;
        if (typeof data === 'string') {
          if (data.includes('[SHOW_NEOFETCH_IMAGE]')) {
            const match = data.match(/\[SHOW_NEOFETCH_IMAGE\]\s+([^\r\n\s]+)/);
            if (match && match[1]) {
              setNeofetchImage(match[1]);
              setTimeout(() => {
                if (!isDisposed) setNeofetchImage(null);
              }, 15000); 
              return;
            }
          }
        }
      } catch (e) {}
      try {
        term.write(event.data);
      } catch (_) {}
    };

    ws.onclose = () => {
      if (isDisposed) return;
      setConnStatus('disconnected');
      try {
        term.writeln('\r\n\x1b[1;31m[WebSocket Connection Closed. Click Reconnect or refresh to try again]\x1b[0m');
      } catch (_) {}
    };

    ws.onerror = (err) => {
      console.error("Shell WebSocket Error", err);
      if (!isDisposed) setConnStatus('disconnected');
    };

    const onDataDisposable = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data: data }));
      }
    });

    const handleResize = () => {
      if (isDisposed) return;
      try {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "resize",
            cols: term.cols,
            rows: term.rows
          }));
        }
      } catch (e) {}
    };
    window.addEventListener('resize', handleResize);

    try {
      if (terminalRef.current) {
        resizeObserver = new ResizeObserver(() => {
          handleResize();
        });
        resizeObserver.observe(terminalRef.current);
      }
    } catch (_) {}

    return () => {
      isDisposed = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      if (resizeObserver) {
        try { resizeObserver.disconnect(); } catch (_) {}
      }
      window.removeEventListener('resize', handleResize);
      try { onDataDisposable.dispose(); } catch (_) {}
      try { ws.close(); } catch (_) {}
      try { term.dispose(); } catch (_) {}
      xtermInstance.current = null;
      wsInstance.current = null;
    };
  }, []);

  const sendQuickCommand = (cmd: string) => {
    const ws = wsInstance.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "input", data: cmd + "\r" }));
    }
  };

  const reconnectShell = () => {
    window.location.reload();
  };

  const fetchStats = async () => {
    try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch('/api/system/stats', {
            headers: { 'Authorization': token }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
    } catch(e){}
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard 
            icon={Cpu} 
            label="Memory Usage" 
            value={stats ? `${stats.memory.toFixed(2)} MB` : 'Loading...'} 
            color="text-blue-400"
        />
        <StatsCard 
            icon={HardDrive} 
            label="Server Uptime" 
            value={stats ? formatUptime(stats.uptime) : 'Loading...'} 
            color="text-emerald-400"
        />
        <StatsCard 
            icon={Loader2} 
            label="Active Bot Units" 
            value={stats ? `${stats.activeBots} Sessions` : 'Loading...'} 
            color="text-purple-400"
            animate={stats?.activeBots > 0}
        />
      </div>

      <div className="flex justify-center pt-4">
          <button
              onClick={onOpenFullTerminal}
              className="group relative px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/30 rounded-xl text-sm font-black uppercase tracking-[0.2em] transition-all shadow-2xl hover:shadow-emerald-500/20 active:scale-95 flex items-center gap-3 overflow-hidden"
          >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-white/20 to-emerald-400/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <TerminalIcon className="w-5 h-5" />
              Open Yuri System Terminal
          </button>
      </div>
    </div>
  );
}

function StatsCard({ icon: Icon, label, value, color, animate }: any) {
    return (
        <div className="bg-black/40 border border-white/10 rounded-xl p-5 flex items-center gap-4">
            <div className={`p-3 bg-black/20 rounded-lg border border-white/5 ${color}`}>
                <Icon className={`w-6 h-6 ${animate ? 'animate-pulse' : ''}`} />
            </div>
            <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{label}</p>
                <p className="text-lg font-bold text-white tracking-tight">{value}</p>
            </div>
        </div>
    );
}
