import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal as TerminalIcon, 
  Cpu, 
  HardDrive, 
  Loader2, 
  MessageSquare, 
  Terminal as XTermIcon, 
  Send, 
  Trash2, 
  ArrowLeft,
  Brain,
  Play,
  Check,
  Copy,
  ChevronRight,
  Activity,
  Settings,
  X,
  Palette,
  Image as ImageIcon,
  Monitor,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';


// Bulletproof FitAddon prototype patching to prevent any xterm dimension errors
if (typeof window !== 'undefined' && FitAddon && FitAddon.prototype) {
  FitAddon.prototype.proposeDimensions = function(this: any) {
    try {
      const t = this._terminal;
      if (!t) return undefined;
      const el = t.element;
      const parent = el ? el.parentElement : null;
      if (!el || !parent) return undefined;

      const core = t._core;
      const renderService = core?._renderService;
      const dims = renderService?.dimensions;

      const parentStyle = window.getComputedStyle(parent);
      const parentHeight = parseInt(parentStyle.getPropertyValue('height')) || parent.clientHeight || parent.offsetHeight || 400;
      const parentWidth = Math.max(0, parseInt(parentStyle.getPropertyValue('width')) || parent.clientWidth || parent.offsetWidth || 800);

      const elStyle = window.getComputedStyle(el);
      const paddingTop = parseInt(elStyle.getPropertyValue('padding-top')) || 0;
      const paddingBottom = parseInt(elStyle.getPropertyValue('padding-bottom')) || 0;
      const paddingLeft = parseInt(elStyle.getPropertyValue('padding-left')) || 0;
      const paddingRight = parseInt(elStyle.getPropertyValue('padding-right')) || 0;

      const scrollBarWidth = (t.options && t.options.scrollback === 0) ? 0 : (core?.viewport?.scrollBarWidth || 0);

      const availableHeight = Math.max(0, parentHeight - (paddingTop + paddingBottom));
      const availableWidth = Math.max(0, parentWidth - (paddingLeft + paddingRight) - scrollBarWidth);

      const fontSize = (t.options && t.options.fontSize) ? t.options.fontSize : 14;
      const cellWidth = (dims && dims.css && dims.css.cell && dims.css.cell.width > 0) ? dims.css.cell.width : (fontSize * 0.605);
      const cellHeight = (dims && dims.css && dims.css.cell && dims.css.cell.height > 0) ? dims.css.cell.height : (fontSize * 1.2);

      const cols = Math.max(10, Math.floor(availableWidth / (cellWidth || 8.4)));
      const rows = Math.max(4, Math.floor(availableHeight / (cellHeight || 17)));

      if (isNaN(cols) || isNaN(rows) || cols <= 0 || rows <= 0) {
        return { cols: 80, rows: 24 };
      }

      return { cols, rows };
    } catch (e) {
      return { cols: 80, rows: 24 };
    }
  };

  FitAddon.prototype.fit = function(this: any) {
    try {
      const t = this._terminal;
      if (!t || !t.element || !t.element.parentElement) return;
      const proposed = this.proposeDimensions();
      if (!proposed || !proposed.cols || !proposed.rows || isNaN(proposed.cols) || isNaN(proposed.rows)) return;
      if (t.rows !== proposed.rows || t.cols !== proposed.cols) {
        if (t._core && t._core._renderService && typeof t._core._renderService.clear === 'function') {
          try { t._core._renderService.clear(); } catch (_) {}
        }
        t.resize(proposed.cols, proposed.rows);
      }
    } catch (e) {
      // Safe failover
    }
  };
}
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function FullscreenTerminal({ onBack }: { onBack?: () => void }) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'ai' | 'system'>('terminal');
  const [connStatus, setConnStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [neofetchImage, setNeofetchImage] = useState<string | null>(null);
  const [neofetchLine, setNeofetchLine] = useState<number | null>(null);
  const [currentScroll, setCurrentScroll] = useState(0);
  const [terminalDimensions, setTerminalDimensions] = useState({ cols: 80, rows: 24, cellHeight: 18 });
  const [defaultNeofetchImage, setDefaultNeofetchImage] = useState<string>(() => {
    return localStorage.getItem('default_neofetch_image') || '/user_wallpaper_1.jpg';
  });

  const availableWallpapers = [
    { name: 'Purple Night', url: '/user_wallpaper_2.jpg' },
    { name: 'Soft Pink', url: '/user_wallpaper_1.jpg' }
  ];
  const [mobileInput, setMobileInput] = useState('');
  const [isCtrlActive, setIsCtrlActive] = useState(false);
  
  
  const [stats, setStats] = useState<any>(null);
  
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  
  const [isImgLoading, setIsImgLoading] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('ai_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [aiStatus, setAiStatus] = useState<string>('IDLE');
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(() => {
    const saved = localStorage.getItem('terminal_wallpaper');
    if (!saved || saved === '/wallpaper.jpg' || saved.includes('terminal_wallpaper') || saved.includes('user_wallpaper_1')) {
      return '/user_wallpaper_2.jpg';
    }
    return saved;
  });
  const [autoExecute, setAutoExecute] = useState(() => {
    const saved = localStorage.getItem('ai_auto_execute');
    return saved !== null ? saved === 'true' : true;
  });
  
  useEffect(() => {
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
      } catch (e) {}
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  
  useEffect(() => {
    localStorage.setItem('ai_chat_history', JSON.stringify(chatHistory.slice(-50)));
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem('ai_auto_execute', autoExecute.toString());
  }, [autoExecute]);

  useEffect(() => {
    if (wallpaperUrl) {
      localStorage.setItem('terminal_wallpaper', wallpaperUrl);
    }
  }, [wallpaperUrl]);
  
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<Terminal | null>(null);
  const fitAddonInstance = useRef<FitAddon | null>(null);
  const wsInstance = useRef<WebSocket | null>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);
  const isAutoExecutingRef = useRef<boolean>(false);
  const stopRequestedRef = useRef<boolean>(false);

  const getSystemContext = async () => {
    let terminalContext = "";
    if (xtermInstance.current) {
      try {
        const buffer = xtermInstance.current.buffer.active;
        const lines: string[] = [];
        const startLine = Math.max(0, buffer.baseY + buffer.viewportY - 80);
        const endLine = buffer.baseY + buffer.viewportY;
        for (let i = startLine; i < endLine; i++) {
          const line = buffer.getLine(i);
          if (line) {
            const text = line.translateToString(true).trim();
            if (text) lines.push(text);
          }
        }
        terminalContext = lines.join('\n');
      } catch (e) {}
    }

    let fileContext = "Unknown";
    let statusContext = "Unknown";
    try {
      const [fres, sres] = await Promise.all([
        fetch('/api/system/files').catch(() => null),
        fetch('/api/system/status').catch(() => null)
      ]);
      if (fres && fres.ok) {
        const fdata = await fres.json();
        fileContext = `Path: ${fdata.currentPath}\nFiles:\n${fdata.files || "Empty"}`;
      }
      if (sres && sres.ok) {
        const sdata = await sres.json();
        statusContext = `Uptime: ${sdata.uptime}\nMemory: ${sdata.mem}\nProcesses:\n${sdata.ps}`;
      }
    } catch (e) {}

    return { terminalContext, fileContext, statusContext };
  };

  const executeCommandDirectly = async (commandText: string) => {
    // Send to interactive terminal for real-time visualization
    sendQuickCommand(commandText);

    try {
      const res = await fetch('/api/system/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: commandText })
      });
      const data = await res.json();
      if (data.wallpaper) setWallpaperUrl(data.wallpaper);

      const exitCode = data.exitCode !== undefined ? data.exitCode : (data.success ? 0 : 1);
      const stdoutText = data.stdout?.trim() || (exitCode === 0 ? "(Command succeeded with no output)" : "None");
      const stderrText = data.stderr?.trim() || "None";

      return {
        success: data.success,
        exitCode,
        stdout: stdoutText,
        stderr: stderrText,
        raw: data
      };
    } catch (err: any) {
      return {
        success: false,
        exitCode: 1,
        stdout: "None",
        stderr: `Network/Execution error: ${err.message}`,
        raw: null
      };
    }
  };

  const runAgentTurn = async (currentHistory: ChatMessage[], promptOverride?: string) => {
    if (stopRequestedRef.current) {
      setAiStatus('IDLE');
      setIsAiLoading(false);
      isAutoExecutingRef.current = false;
      return;
    }

    setIsAiLoading(true);
    setAiStatus('THINKING');

    const { terminalContext, fileContext, statusContext } = await getSystemContext();
    const promptToSend = promptOverride || (currentHistory[currentHistory.length - 1]?.content || "");

    try {
      const res = await fetch('/api/mistral/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          history: currentHistory.slice(-25),
          terminalContext,
          fileContext,
          statusContext
        })
      });

      const data = await res.json();
      if (!data.reply) {
        throw new Error(data.error || 'Empty response from model');
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.reply,
        timestamp: Date.now()
      };

      const nextHistory = [...currentHistory, assistantMsg];
      setChatHistory(nextHistory);

      // Check if there is an executable command in the AI response
      const blocks = parseAiResponse(data.reply);
      const commandBlock = blocks.find(b => b.type === 'command');

      if (commandBlock && autoExecute && !stopRequestedRef.current) {
        setAiStatus(`EXECUTING: ${commandBlock.content.slice(0, 35)}`);
        
        // Slight pause for optical feedback
        await new Promise(r => setTimeout(r, 600));
        
        if (stopRequestedRef.current) {
          setAiStatus('PAUSED');
          setIsAiLoading(false);
          return;
        }

        const execResult = await executeCommandDirectly(commandBlock.content);
        
        const outputFormatted = `[COMMAND_RESULT]\nCOMMAND: ${commandBlock.content}\nSTDOUT: ${execResult.stdout}\nSTDERR: ${execResult.stderr}\nEXIT_CODE: ${execResult.exitCode}`;
        
        const resultMsg: ChatMessage = {
          role: 'user',
          content: outputFormatted,
          timestamp: Date.now()
        };

        const updatedHistoryWithResult = [...nextHistory, resultMsg];
        setChatHistory(updatedHistoryWithResult);

        // Continue the autonomous loop automatically
        await new Promise(r => setTimeout(r, 400));
        if (!stopRequestedRef.current) {
          await runAgentTurn(
            updatedHistoryWithResult,
            `Command executed.\n${outputFormatted}\n\nAnalyze the result. If more commands are required to complete the task, output <thought>...</thought> and <command>...</command>. Otherwise, provide your final summary.`
          );
        }
      } else {
        setAiStatus('READY');
        setIsAiLoading(false);
        isAutoExecutingRef.current = false;
      }
    } catch (err: any) {
      setChatHistory(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Neural Agent Error: ${err.message}`,
          timestamp: Date.now()
        }
      ]);
      setAiStatus('ERROR');
      setIsAiLoading(false);
      isAutoExecutingRef.current = false;
    }
  };

  const handleAiAsk = async () => {
    if (!aiPrompt.trim() || isAiLoading) return;
    stopRequestedRef.current = false;
    isAutoExecutingRef.current = true;
    
    const promptText = aiPrompt.trim();
    const newUserMsg: ChatMessage = { role: 'user', content: promptText, timestamp: Date.now() };
    
    const updatedHistory = [...chatHistory, newUserMsg];
    setChatHistory(updatedHistory);
    setAiPrompt('');

    await runAgentTurn(updatedHistory, promptText);
  };

  const handleManualCommandRun = async (cmd: string) => {
    sendQuickCommand(cmd);
    setActiveTab('terminal');
    setAiStatus(`MANUAL_EXEC: ${cmd.slice(0, 25)}`);
    
    const execResult = await executeCommandDirectly(cmd);
    const outputFormatted = `[COMMAND_RESULT]\nCOMMAND: ${cmd}\nSTDOUT: ${execResult.stdout}\nSTDERR: ${execResult.stderr}\nEXIT_CODE: ${execResult.exitCode}`;
    
    const resultMsg: ChatMessage = {
      role: 'user',
      content: outputFormatted,
      timestamp: Date.now()
    };
    
    setChatHistory(prev => [...prev, resultMsg]);
    setAiStatus('READY');
  };

  const stopAgentExecution = () => {
    stopRequestedRef.current = true;
    isAutoExecutingRef.current = false;
    setIsAiLoading(false);
    setAiStatus('PAUSED');
  };

  const clearChat = () => {
    stopAgentExecution();
    setChatHistory([]);
  };

  useEffect(() => {
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [chatHistory, isAiLoading, aiStatus]);

  
  useEffect(() => {
    if (!terminalRef.current) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: '"Fira Code", "JetBrains Mono", monospace',
      fontSize: isMobile ? 16 : 15,
      lineHeight: isMobile ? 1.2 : 1.1,
      letterSpacing: 0,
      scrollback: 10000,
      convertEol: false,
      allowTransparency: true,
      theme: {
        background: 'transparent',
        foreground: '#10b981',
        cursor: '#34d399',
        cursorAccent: '#050508',
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
      allowProposedApi: true
    });

    const fitAddon = new FitAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(terminalRef.current);
    
    const resizeTerminal = () => {
      if (!terminalRef.current) return;
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
          const screen = terminalRef.current?.querySelector('.xterm-screen');
          const height = screen?.clientHeight || terminalRef.current?.offsetHeight || 0;
          setTerminalDimensions({
            cols: term.cols,
            rows: term.rows,
            cellHeight: height / term.rows
          });
          if (wsInstance.current?.readyState === WebSocket.OPEN) {
            wsInstance.current.send(JSON.stringify({ 
              type: "resize", 
              cols: term.cols, 
              rows: term.rows 
            }));
          }
        } catch (e) {}
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      resizeTerminal();
    });

    resizeObserver.observe(terminalRef.current);

    xtermInstance.current = term;
    fitAddonInstance.current = fitAddon;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = localStorage.getItem('token') || '';
    const wsUrl = `${protocol}//${window.location.host}/api/system/shell-ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsInstance.current = ws;

    ws.onopen = () => {
      setConnStatus('connected');
      resizeTerminal();
    };

    ws.onmessage = (event) => {
      try {
        const data = event.data;
        if (typeof data === 'string') {
          
          if (data.includes('[SET_WALLPAPER]')) {
            const match = data.match(/\[SET_WALLPAPER\]\s+([^\r\n\s]+)/);
            if (match && match[1]) {
              const url = match[1];
              setWallpaperUrl(url);
              
              return; 
            }
          }

          
          if (data.includes('[SHOW_NEOFETCH_IMAGE]')) {
            const match = data.match(/\[SHOW_NEOFETCH_IMAGE\]\s+([^\r\n\s]+)/);
            if (match && match[1]) {
              const img = match[1] === 'DEFAULT' ? defaultNeofetchImage : match[1];
              setNeofetchImage(img);
              setNeofetchLine(term.buffer.active.baseY + term.buffer.active.cursorY);
              return;
            }
          }

          if (data.includes('[SET_WALLPAPER]')) {
            const wallpaperMatch = data.match(/\[SET_WALLPAPER\]\s+([^\r\n\s]+)/);
            if (wallpaperMatch && wallpaperMatch[1]) {
              setWallpaperUrl(wallpaperMatch[1]);
              return;
            }
          }

          if (data.includes('[OPEN_SETTINGS]')) {
            setActiveTab('system');
            return;
          }

          
          if (data.includes('\x1b[H\x1b[2J') || data.includes('\x1b[2J') || data.includes('\x1b[J')) {
            setNeofetchImage(null);
            setNeofetchLine(null);
          }
        }

        const parsed = JSON.parse(event.data);
        if (parsed.type === "wallpaper") {
          setWallpaperUrl(parsed.url);
          return;
        }
      } catch (e) {}
      term.write(event.data);
    };

    term.onScroll((newScrollPos) => {
      setCurrentScroll(newScrollPos);
    });

    ws.onclose = () => {
      setConnStatus('disconnected');
      term.writeln('\r\n\x1b[1;31m[SESSION CLOSED]\x1b[0m');
    };

    const onDataDisposable = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data: data }));
      }
    });

    window.addEventListener('resize', resizeTerminal);
    window.visualViewport?.addEventListener('resize', resizeTerminal);
    window.visualViewport?.addEventListener('scroll', resizeTerminal);

    const initialResize = setTimeout(resizeTerminal, 100);
    const secondResize = setTimeout(resizeTerminal, 500);

    return () => {
      clearTimeout(initialResize);
      clearTimeout(secondResize);
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeTerminal);
      window.visualViewport?.removeEventListener('resize', resizeTerminal);
      window.visualViewport?.removeEventListener('scroll', resizeTerminal);
      onDataDisposable.dispose();
      ws.close();
      term.dispose();
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

  const handleMobileKey = (key: string) => {
    const ws = wsInstance.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "input", data: key }));
    }
  };

  const parseAiResponse = (text: string) => {
    const blocks: { type: 'text' | 'thought' | 'command'; content: string }[] = [];
    
    // First check if there are explicit XML tags: <thought> and <command>
    const hasXmlTags = /<(thought|command)>[\s\S]*?<\/\1>/.test(text);

    if (hasXmlTags) {
      let currentPos = 0;
      const tagRegex = /<(thought|command)>([\s\S]*?)<\/\1>/g;
      let match;

      while ((match = tagRegex.exec(text)) !== null) {
        if (match.index > currentPos) {
          const preText = text.substring(currentPos, match.index).trim();
          if (preText) blocks.push({ type: 'text', content: preText });
        }
        blocks.push({ type: match[1] as 'thought' | 'command', content: match[2].trim() });
        currentPos = tagRegex.lastIndex;
      }

      if (currentPos < text.length) {
        const remaining = text.substring(currentPos).trim();
        if (remaining) blocks.push({ type: 'text', content: remaining });
      }
    } else {
      // Fallback: Check for markdown code blocks (```bash or ```sh or ```)
      const codeBlockRegex = /```(?:bash|sh|shell|zsh)?\n([\s\S]*?)```/g;
      let currentPos = 0;
      let match;
      let foundCode = false;

      while ((match = codeBlockRegex.exec(text)) !== null) {
        foundCode = true;
        if (match.index > currentPos) {
          const preText = text.substring(currentPos, match.index).trim();
          if (preText) blocks.push({ type: 'text', content: preText });
        }
        const cmd = match[1].trim();
        if (cmd) {
          blocks.push({ type: 'command', content: cmd });
        }
        currentPos = codeBlockRegex.lastIndex;
      }

      if (currentPos < text.length) {
        const remaining = text.substring(currentPos).trim();
        if (remaining) blocks.push({ type: 'text', content: remaining });
      }

      if (!foundCode && text.trim()) {
        blocks.push({ type: 'text', content: text.trim() });
      }
    }

    return blocks.filter(b => b.content);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-transparent overflow-hidden font-mono relative" style={{ minWidth: '100%', maxWidth: '100vw' }}>
      {wallpaperUrl && (
        <div 
          className="absolute inset-0 z-0 opacity-100 pointer-events-none transition-all duration-1000"
          style={{ 
            backgroundImage: `url(${wallpaperUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.6) contrast(1.1) saturate(1.1)'
          }}
        />
      )}
      <div className="relative z-10 flex flex-col h-full w-full bg-black/5 backdrop-blur-[0.5px]">
        {}
      <div className="flex items-center h-10 bg-black/60 backdrop-blur-md border-b border-white/5 px-2 gap-1">
        <button 
          onClick={() => setActiveTab('terminal')}
          className={`px-4 h-full text-[10px] font-black tracking-[0.1em] transition-all flex items-center gap-2 ${
            activeTab === 'terminal' ? 'bg-[#050508]/40 text-emerald-400 border-x border-white/5' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <XTermIcon className="w-3.5 h-3.5" />
          tty1
        </button>
        <button 
          onClick={() => setActiveTab('ai')}
          className={`px-4 h-full text-[10px] font-black tracking-[0.1em] transition-all flex items-center gap-2 ${
            activeTab === 'ai' ? 'bg-[#050508]/40 text-indigo-400 border-x border-white/5' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          AI_AGENT
        </button>
        <button 
          onClick={() => setActiveTab('system')}
          className={`px-4 h-full text-[10px] font-black tracking-[0.1em] transition-all flex items-center gap-2 ${
            activeTab === 'system' ? 'bg-[#050508]/40 text-purple-400 border-x border-white/5' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          SYSTEM
        </button>
        
        <div className="ml-auto flex items-center gap-3 pr-3">
          <button 
            onClick={() => setAutoExecute(!autoExecute)}
            className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-black transition-all shadow-sm ${
              autoExecute ? 'bg-indigo-600/80 text-white border border-indigo-400/30' : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'
            }`}
          >
            {autoExecute ? <Check className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            AUTO_EXEC: {autoExecute ? 'ON' : 'OFF'}
          </button>
          <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded border border-white/5">
            <span className={`w-1.5 h-1.5 rounded-full ${connStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">{connStatus}</span>
          </div>
          {onBack && (
            <button 
              onClick={onBack} 
              className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-[9px] text-zinc-400 hover:text-white font-black uppercase transition-all border border-white/5"
            >
              EXIT
            </button>
          )}
        </div>
      </div>

      <div className="relative flex-1 min-h-0 min-w-0">
        {}
        <div className={`absolute inset-0 z-10 ${activeTab === 'terminal' ? 'block' : 'hidden'}`}>
          {}
          <AnimatePresence>
            {neofetchImage && neofetchLine !== null && (neofetchLine - currentScroll) >= -10 && (neofetchLine - currentScroll) < terminalDimensions.rows && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  y: (neofetchLine - currentScroll) * terminalDimensions.cellHeight
                }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0 }} 
                className="absolute z-20 pointer-events-none hidden md:block"
                style={{
                  top: 0,
                  left: '10px',
                  transformOrigin: 'top left'
                }}
              >
                <div className="relative p-2">
                  <img 
                    src={neofetchImage} 
                    alt="System Logo" 
                    className="w-[340px] h-[340px] object-contain relative z-10 opacity-90"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div 
            ref={terminalRef} 
            className="absolute inset-0 w-full h-full overflow-hidden bg-transparent z-10" 
            style={{
              minWidth: 0,
              minHeight: 0,
              touchAction: 'pan-y',
            }}
          />
        </div>

        {}
        <div className={`absolute inset-0 bg-[#050508] flex flex-col z-20 ${activeTab === 'ai' ? 'block' : 'hidden'}`}>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar" ref={aiScrollRef}>
            {chatHistory.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                <Brain className="w-16 h-16 mb-4 text-indigo-500" />
                <p className="text-xs uppercase tracking-[0.3em] font-black">Agentic System Online</p>
                <p className="text-[10px] mt-2">I can suggest commands and execute them.</p>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${msg.role === 'user' ? 'text-zinc-500' : 'text-indigo-400'}`}>
                  {msg.role === 'user' ? (
                    <><ChevronRight className="w-3 h-3" /> USER_REQUEST</>
                  ) : (
                    <><Brain className="w-3 h-3" /> AGENT_THOUGHTS</>
                  )}
                  <span className="ml-auto text-[8px] opacity-30">[{new Date(msg.timestamp).toLocaleTimeString()}]</span>
                </div>
                
                <div className={`pl-4 border-l border-white/5 space-y-3`}>
                  {msg.role === 'user' ? (
                    msg.content.startsWith('[COMMAND_RESULT]') ? (
                      <ExpandableContainer title="Output" maxHeight={120}>
                        <div className="bg-zinc-950 border border-white/5 rounded p-3 font-mono text-[11px] text-zinc-400 space-y-1">
                          {msg.content.split('\n').map((line, li) => {
                            if (line.startsWith('COMMAND:')) return <div key={li} className="text-emerald-500/80 mb-2"># {line.substring(8).trim()}</div>;
                            if (line.startsWith('STDOUT:')) return <div key={li} className="text-emerald-400 opacity-90">{line.substring(7).trim()}</div>;
                            if (line.startsWith('STDERR:')) return line.includes('None') ? null : <div key={li} className="text-red-400 opacity-80">{line.substring(7).trim()}</div>;
                            if (line.startsWith('EXIT_CODE:')) return <div key={li} className="text-[10px] opacity-30 mt-2">Process exited with code {line.substring(10).trim()}</div>;
                            return <div key={li}>{line}</div>;
                          })}
                        </div>
                      </ExpandableContainer>
                    ) : (
                      <div className="text-sm text-zinc-300 break-words">{msg.content}</div>
                    )
                  ) : (
                    parseAiResponse(msg.content).map((block, bi) => {
                      if (block.type === 'thought') {
                        return (
                          <ExpandableContainer key={bi} title="Thought Process" maxHeight={100}>
                            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded p-3 text-[11px] text-indigo-300 italic flex gap-3">
                              <Brain className="w-4 h-4 shrink-0 opacity-50" />
                              <p>{block.content}</p>
                            </div>
                          </ExpandableContainer>
                        );
                      }
                      if (block.type === 'command') {
                        return (
                          <div key={bi} className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg overflow-hidden font-mono">
                            <div className="bg-emerald-500/10 px-3 py-1.5 flex items-center justify-between border-b border-emerald-500/10">
                              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">Shell Executable</span>
                              <button 
                                onClick={() => handleManualCommandRun(block.content)}
                                className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-black rounded transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)] active:scale-95"
                              >
                                <Play className="w-2.5 h-2.5 fill-current" /> RUN
                              </button>
                            </div>
                            <ExpandableContainer title="Code" maxHeight={200}>
                              <pre className="p-3 text-xs text-emerald-200 overflow-x-auto">
                                <code>{block.content}</code>
                              </pre>
                            </ExpandableContainer>
                          </div>
                        );
                      }
                      return (
                        <div key={bi} className="text-sm text-zinc-300 leading-relaxed prose prose-invert prose-xs max-w-none break-words overflow-hidden prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-white/5 prose-pre:overflow-x-auto prose-code:text-indigo-300 prose-code:bg-indigo-500/10 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                          <ExpandableContainer title="Text" maxHeight={400}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {block.content}
                            </ReactMarkdown>
                          </ExpandableContainer>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
            {isAiLoading && (
              <div className="flex flex-col gap-3 pl-4 border-l border-indigo-500/30">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20" />
                    <Brain className="w-5 h-5 text-indigo-400 relative" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-indigo-400 font-bold tracking-[0.2em] uppercase">{aiStatus}</span>
                    <span className="text-[9px] text-zinc-600 animate-pulse font-mono">NEURAL_STREAM_PROCESSING...</span>
                  </div>
                </div>
                <div className="space-y-2 max-w-md">
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      className="h-full w-1/3 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-white/5 bg-[#08080C] flex gap-3">
            <div className="flex-1 relative flex items-center">
              <span className="absolute left-3 text-emerald-500 font-bold text-sm select-none">$</span>
              <input 
                type="text"
                autoFocus
                placeholder="PROMPT_AI_AGENT..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiAsk()}
                className="w-full bg-[#050508] border border-white/10 rounded-lg pl-8 pr-12 py-3 text-sm text-zinc-100 placeholder:text-zinc-800 outline-none focus:border-indigo-500/30 transition-all"
              />
              <button 
                id="ai-submit-btn"
                onClick={handleAiAsk}
                disabled={isAiLoading || !aiPrompt.trim()}
                className="absolute right-2 p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-20 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            {isAiLoading && (
              <button 
                onClick={stopAgentExecution}
                title="Stop Agent"
                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
              >
                <div className="w-2.5 h-2.5 bg-red-500 rounded-sm" />
                STOP
              </button>
            )}
            <button onClick={clearChat} title="Clear Session" className="p-3 text-zinc-600 hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {}
        <div className={`absolute inset-0 z-20 bg-[#050508]/95 backdrop-blur-xl overflow-y-auto custom-scrollbar ${activeTab === 'system' ? 'block' : 'hidden'}`}>
          <div className="max-w-4xl mx-auto p-12 space-y-12">
            <header className="flex items-center gap-6 mb-12">
              <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
                <Monitor className="w-10 h-10 text-purple-400" />
              </div>
              <div>
                <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">System Configuration</h2>
                <p className="text-zinc-500 font-mono text-xs tracking-[0.2em] uppercase">Administrative Dashboard v4.2.0</p>
              </div>
            </header>

            <section className="space-y-8">
              <div className="flex items-center gap-3 text-white/90 border-b border-white/5 pb-4">
                <ImageIcon className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-[0.3em]">Global Background Wallpaper</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {availableWallpapers.map((wp) => (
                  <button
                    key={wp.url}
                    onClick={() => setWallpaperUrl(wp.url)}
                    className={`group relative aspect-video rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                      wallpaperUrl === wp.url 
                        ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[1.05] z-10' 
                        : 'border-white/5 hover:border-white/20 hover:scale-[1.02]'
                    }`}
                  >
                    <img src={wp.url} alt={wp.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-3">
                      <span className="text-[10px] text-white font-black uppercase tracking-widest translate-y-2 group-hover:translate-y-0 transition-transform">
                        {wp.name}
                      </span>
                    </div>
                    {wallpaperUrl === wp.url && (
                      <div className="absolute top-2 right-2 bg-emerald-500 text-black p-1 rounded-full">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-8">
              <div className="flex items-center gap-3 text-white/90 border-b border-white/5 pb-4">
                <Palette className="w-5 h-5 text-indigo-400" />
                <h3 className="text-xs font-black uppercase tracking-[0.3em]">Neofetch Visual Identity</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {availableWallpapers.map((wp) => (
                  <button
                    key={wp.url}
                    onClick={() => {
                      setDefaultNeofetchImage(wp.url);
                      localStorage.setItem('default_neofetch_image', wp.url);
                    }}
                    className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                      defaultNeofetchImage === wp.url 
                        ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] scale-[1.05] z-10' 
                        : 'border-white/5 hover:border-white/20 hover:scale-[1.02]'
                    }`}
                  >
                    <img 
                      src={wp.url} 
                      alt={wp.name} 
                      className={`w-full h-full object-cover transition-all duration-700 ${
                        defaultNeofetchImage === wp.url ? 'grayscale-0' : 'grayscale brightness-50 group-hover:grayscale-0 group-hover:brightness-100'
                      }`} 
                    />
                    {defaultNeofetchImage === wp.url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/20 backdrop-blur-[2px]">
                        <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-3">
                      <span className="text-[10px] text-white font-black uppercase tracking-widest translate-y-2 group-hover:translate-y-0 transition-transform">
                        {wp.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-zinc-500 text-[10px] font-mono leading-relaxed max-w-xl">
                The Neofetch Identity defines the visual asset rendered alongside system specifications. 
                This icon will be displayed in the terminal during administrative reconnaissance.
              </p>
            </section>

            <section className="space-y-8">
              <div className="flex items-center gap-3 text-white/90 border-b border-white/5 pb-4">
                <ImageIcon className="w-5 h-5 text-pink-400" />
                <h3 className="text-xs font-black uppercase tracking-[0.3em]">Custom Asset Upload</h3>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="space-y-4">
                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Select Image File</p>
                    <label className={`cursor-pointer px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 group ${
                      isImgLoading 
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                        : 'bg-pink-600 hover:bg-pink-500 text-white shadow-[0_0_20px_rgba(219,39,119,0.3)] hover:scale-105 active:scale-95'
                    }`}>
                      {isImgLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                          Choose File
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        disabled={isImgLoading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          setIsImgLoading(true);
                          try {
                            const formData = new FormData();
                            formData.append('file', file);
                            
                            const token = localStorage.getItem('token') || '';
                            const res = await fetch('/api/actions/stream/upload', {
                              method: 'POST',
                              headers: {
                                'Authorization': token
                              },
                              body: formData
                            });
                            
                            const data = await res.json();
                            if (data.url) {
                              setGeneratedImageUrl(data.url);
                            }
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setIsImgLoading(false);
                          }
                        }} 
                      />
                    </label>
                  </div>

                  <div className="flex-1 w-full flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] min-h-[200px]">
                    {generatedImageUrl ? (
                      <div className="space-y-4 w-full">
                        <img 
                          src={generatedImageUrl} 
                          alt="Uploaded Asset" 
                          className="w-full max-h-[400px] object-contain rounded-lg shadow-2xl border border-white/10"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setWallpaperUrl(generatedImageUrl);
                              setActiveTab('terminal');
                            }}
                            className="flex-1 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Set as Wallpaper
                          </button>
                          <button 
                            onClick={() => {
                              setDefaultNeofetchImage(generatedImageUrl);
                              localStorage.setItem('default_neofetch_image', generatedImageUrl);
                              setActiveTab('terminal');
                            }}
                            className="flex-1 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Set as Neofetch
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-2 opacity-30">
                        <ImageIcon className="w-12 h-12 mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No Asset Uploaded</p>
                        <p className="text-[9px] font-mono lowercase">Waiting for user upload...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <footer className="pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
              <button 
                onClick={() => setActiveTab('terminal')}
                className="flex items-center gap-3 px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all hover:scale-105 border border-white/5 text-xs font-black uppercase tracking-widest"
              >
                <TerminalIcon className="w-4 h-4" />
                Initialize Terminal
              </button>
              
              <div className="flex gap-4">
                <div className="text-right">
                  <p className="text-[10px] text-zinc-600 font-mono tracking-[0.2em] uppercase">Security Status</p>
                  <p className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 justify-end">
                    <Activity className="w-3 h-3" />
                    Encrypted
                  </p>
                </div>
                <div className="w-px h-10 bg-white/5" />
                <div className="text-left">
                  <p className="text-[10px] text-zinc-600 font-mono tracking-[0.2em] uppercase">User Profile</p>
                  <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Admin root</p>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>

      {}
      {activeTab === 'terminal' && (
        <div className="bg-[#08080C] border-t border-white/5 p-1 flex flex-col gap-1">
          <div className="flex gap-1 overflow-x-auto no-scrollbar scroll-smooth pb-1 px-1">
            <MKey label="ESC" onClick={() => handleMobileKey('\x1b')} />
            <MKey label="CTRL" active={isCtrlActive} onClick={() => setIsCtrlActive(!isCtrlActive)} />
            <MKey label="TAB" onClick={() => handleMobileKey('\t')} />
            <MKey label="↑" onClick={() => handleMobileKey('\x1b[A')} />
            <MKey label="↓" onClick={() => handleMobileKey('\x1b[B')} />
            <MKey label="←" onClick={() => handleMobileKey('\x1b[D')} />
            <MKey label="→" onClick={() => handleMobileKey('\x1b[C')} />
            <MKey label="|" onClick={() => handleMobileKey('|')} />
            <MKey label="~" onClick={() => handleMobileKey('~')} />
            <MKey label="/" onClick={() => handleMobileKey('/')} />
            <MKey label="-" onClick={() => handleMobileKey('-')} />
            <MKey label="." onClick={() => handleMobileKey('.')} />
            <MKey label="C-c" onClick={() => handleMobileKey('\x03')} color="text-red-500" />
          </div>
          <div className="flex gap-1">
            <input 
              type="text"
              placeholder={isCtrlActive ? "CTRL+KEY" : "SHELL_INPUT"}
              value={mobileInput}
              onChange={(e) => {
                const val = e.target.value;
                if (isCtrlActive && val.length > 0) {
                  const char = val.charAt(val.length - 1).toLowerCase();
                  const code = char.charCodeAt(0) - 96;
                  if (code >= 1 && code <= 26) handleMobileKey(String.fromCharCode(code));
                  setIsCtrlActive(false); setMobileInput('');
                } else setMobileInput(val);
              }}
              onKeyDown={(e) => e.key === 'Enter' && (sendQuickCommand(mobileInput), setMobileInput(''))}
              className="flex-1 bg-black/50 border border-white/5 rounded px-2 py-1.5 text-xs text-emerald-400 outline-none"
            />
            <button onClick={() => { sendQuickCommand(mobileInput); setMobileInput(''); }} className="px-3 bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-black uppercase tracking-widest">SEND</button>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}

function ExpandableContainer({ children, maxHeight = 160, title }: { children: React.ReactNode, maxHeight?: number, title?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [shouldShowToggle, setShouldShowToggle] = useState(false);

  useEffect(() => {
    if (contentRef.current) {
      setShouldShowToggle(contentRef.current.scrollHeight > maxHeight);
    }
  }, [children, maxHeight]);

  return (
    <div className="relative group">
      <motion.div 
        initial={false}
        animate={{ height: isExpanded ? 'auto' : (shouldShowToggle ? maxHeight : 'auto') }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="overflow-hidden relative"
      >
        <div ref={contentRef}>
          {children}
        </div>
        {!isExpanded && shouldShowToggle && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#050508] via-[#050508]/80 to-transparent pointer-events-none" />
        )}
      </motion.div>
      {shouldShowToggle && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-1 text-[9px] font-bold text-indigo-400/60 hover:text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-1.5 transition-colors py-1"
        >
          <div className="w-1 h-1 bg-indigo-500 rounded-full" />
          {isExpanded ? 'Minimize' : `Expand ${title || 'Results'}`}
        </button>
      )}
    </div>
  );
}

function MKey({ label, onClick, active, color = 'text-zinc-500' }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded border text-[9px] font-black tracking-tighter shrink-0 transition-all active:scale-90 ${
        active ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-white/5'
      } ${color}`}
    >
      {label}
    </button>
  );
}
