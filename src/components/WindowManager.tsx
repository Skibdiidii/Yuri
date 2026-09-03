import React, { useState, useEffect, useRef } from "react";
import { 
  Terminal as TerminalIcon, 
  Globe, 
  Shield, 
  FolderOpen, 
  Activity, 
  X, 
  Maximize2, 
  Minimize2, 
  Clock, 
  Cpu, 
  Database, 
  Save, 
  Plus, 
  Trash2, 
  Search, 
  Wifi, 
  Settings, 
  RefreshCw, 
  Play, 
  Square, 
  ChevronRight,
  User,
  HardDrive,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FileText
} from "lucide-react";
import SystemConsoleTab from "./SystemConsoleTab";

interface WindowApp {
  id: string;
  title: string;
  icon: any;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface WindowManagerProps {
  onBack?: () => void;
  onLogout?: () => void;
}

export default function WindowManager({ onBack, onLogout }: WindowManagerProps) {
  const [apps, setApps] = useState<WindowApp[]>([
    { id: "terminal", title: "Yuri Terminal (root@YuriSelfbot)", icon: TerminalIcon, isOpen: true, isMinimized: false, isMaximized: true, zIndex: 10, x: 20, y: 30, w: 750, h: 500 },
    { id: "browser", title: "DuckDuckGo Privacy Search", icon: Globe, isOpen: false, isMinimized: false, isMaximized: false, zIndex: 1, x: 60, y: 80, w: 680, h: 480 },
    { id: "vpn", title: "Proton VPN - Secure Tunnel", icon: Shield, isOpen: false, isMinimized: false, isMaximized: false, zIndex: 1, x: 100, y: 120, w: 620, h: 450 },
    { id: "files", title: "Yuri File Manager & Editor", icon: FolderOpen, isOpen: false, isMinimized: false, isMaximized: false, zIndex: 1, x: 140, y: 160, w: 700, h: 480 },
    { id: "monitor", title: "YuriOS System Diagnostics", icon: Activity, isOpen: false, isMinimized: false, isMaximized: false, zIndex: 1, x: 180, y: 200, w: 600, h: 440 },
  ]);

  const [activeTab, setActiveTab] = useState<string>("terminal"); 
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isStartOpen, setIsStartOpen] = useState<boolean>(false);
  const [time, setTime] = useState<string>("");
  const [maxZIndex, setMaxZIndex] = useState<number>(10);
  const [ramCleared, setRamCleared] = useState<boolean>(false);
  const [ramUsage, setRamUsage] = useState<number>(38);
  const [cpuUsage, setCpuUsage] = useState<number>(5);

  
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [editorContent, setEditorContent] = useState<string>("");
  const [newFileName, setNewFileName] = useState<string>("");
  const [fileMessage, setFileMessage] = useState<string>("");

  
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [browserUrl, setBrowserUrl] = useState<string>("");
  const [iframeSrc, setIframeSrc] = useState<string>("");
  const [iframeLoading, setIframeLoading] = useState<boolean>(false);
  const [browserHistory, setBrowserHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [browserContent, setBrowserContent] = useState<string>("");
  const [browserError, setBrowserError] = useState<string>("");
  const [browserViewMode, setBrowserViewMode] = useState<'reader' | 'raw' | 'legacy'>('legacy');

  
  const [vpnConnected, setVpnConnected] = useState<boolean>(false);
  const [vpnServer, setVpnServer] = useState<string>("Geneva, Switzerland (CH-01)");
  const [vpnIp, setVpnIp] = useState<string>("109.201.154.22");
  const [vpnTraffic, setVpnTraffic] = useState<number[]>([12, 18, 15, 22, 19, 25, 31, 28, 42, 38, 55, 48, 62, 70]);
  const [vpnLogs, setVpnLogs] = useState<string[]>([
    "Initializing OpenVPN Core Daemon...",
    "Loading SSL credentials: Harumi Client Profile",
    "Resolving ProtonVPN endpoint ch-01.protonvpn.net..."
  ]);

  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(prev => {
        const offset = Math.floor(Math.random() * 7) - 3;
        const next = prev + offset;
        return Math.max(1, Math.min(95, next));
      });
      
      setRamUsage(prev => {
        if (ramCleared) return 18;
        const offset = Math.floor(Math.random() * 3) - 1;
        return Math.max(25, Math.min(85, prev + offset));
      });
      
      if (vpnConnected) {
        setVpnTraffic(prev => {
          const next = [...prev.slice(1)];
          const spike = Math.floor(Math.random() * 120) + 20;
          next.push(spike);
          return next;
        });
      } else {
        setVpnTraffic(prev => {
          if (prev.every(v => v === 0)) return prev;
          const next = [...prev.slice(1)];
          next.push(0);
          return next;
        });
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [vpnConnected, ramCleared]);

  
  const dragRef = useRef<{ id: string; startX: number; startY: number; appX: number; appY: number } | null>(null);

  const startDrag = (id: string, e: React.PointerEvent) => {
    if (isMobile) return;
    const app = apps.find(a => a.id === id);
    if (!app || app.isMaximized) return;
    
    
    focusApp(id);

    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      appX: app.x,
      appY: app.y
    };
    
    const element = e.currentTarget as HTMLElement;
    element.setPointerCapture(e.pointerId);
  };

  const onDrag = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const drag = dragRef.current;
    const deltaX = e.clientX - drag.startX;
    const deltaY = e.clientY - drag.startY;

    setApps(prev => prev.map(app => {
      if (app.id === drag.id) {
        return {
          ...app,
          x: drag.appX + deltaX,
          y: drag.appY + deltaY
        };
      }
      return app;
    }));
  };

  const stopDrag = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const element = e.currentTarget as HTMLElement;
    try {
      element.releasePointerCapture(e.pointerId);
    } catch {}
    dragRef.current = null;
  };

  
  const focusApp = (id: string) => {
    const nextZ = maxZIndex + 1;
    setMaxZIndex(nextZ);
    setApps(prev => prev.map(app => {
      if (app.id === id) {
        return { ...app, isOpen: true, isMinimized: false, zIndex: nextZ };
      }
      return app;
    }));
    setActiveTab(id);
  };

  const closeApp = (id: string) => {
    setApps(prev => prev.map(app => {
      if (app.id === id) {
        return { ...app, isOpen: false };
      }
      return app;
    }));
  };

  const minimizeApp = (id: string) => {
    setApps(prev => prev.map(app => {
      if (app.id === id) {
        return { ...app, isMinimized: true };
      }
      return app;
    }));
  };

  const handleTaskbarClick = (id: string) => {
    const app = apps.find(a => a.id === id);
    if (!app) return;
    if (app.isOpen && !app.isMinimized && activeTab === id) {
      minimizeApp(id);
    } else {
      focusApp(id);
    }
  };

  const toggleMaximizeApp = (id: string) => {
    setApps(prev => prev.map(app => {
      if (app.id === id) {
        return { ...app, isMaximized: !app.isMaximized };
      }
      return app;
    }));
  };

  
  const launchApp = (id: string) => {
    focusApp(id);
    setIsStartOpen(false);
  };

  
  const fetchFiles = async () => {
    try {
      const res = await fetch("/api/system/files");
      const data = await res.json();
      if (data.success) {
        setFiles(data.files || []);
        
        if (!data.files || data.files.length === 0) {
          await saveFile("config.json", JSON.stringify({
            prefix: ".",
            ownerId: "123456789",
            status: "Developing YuriOS Window Manager",
            soundboardMode: true
          }, null, 2));
          await saveFile("credits.txt", "YuriOS & YuriSelfbot developed & credited to Harumi 💜");
          const res2 = await fetch("/api/system/files");
          const data2 = await res2.json();
          if (data2.success) setFiles(data2.files || []);
        }
      }
    } catch (e) {
      console.error("Failed to read system files:", e);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const saveFile = async (name: string, content: string) => {
    try {
      const res = await fetch("/api/system/save-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content })
      });
      const data = await res.json();
      if (data.success) {
        setFileMessage(`File '${name}' saved successfully.`);
        fetchFiles();
        setTimeout(() => setFileMessage(""), 4000);
      }
    } catch (e) {
      setFileMessage("Error saving file.");
    }
  };

  const deleteFile = async (name: string) => {
    if (!window.confirm(`Are you sure you want to delete '${name}'?`)) return;
    try {
      const res = await fetch("/api/system/delete-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (data.success) {
        setFileMessage(`File '${name}' deleted.`);
        setSelectedFile(null);
        fetchFiles();
        setTimeout(() => setFileMessage(""), 4000);
      }
    } catch (e) {
      setFileMessage("Error deleting file.");
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;
    let name = newFileName.trim();
    if (!name.includes(".")) name += ".json";
    await saveFile(name, "{\n  \n}");
    setNewFileName("");
  };

  const fetchPageContent = async (url: string) => {
    if (!url) return;
    setIframeLoading(true);
    setBrowserError("");
    setBrowserContent("");
    
    let target = url;
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = "https://" + target;
    }
    const proxyUrl = `/api/browser/frame-proxy?url=${encodeURIComponent(target)}`;
    setIframeSrc(proxyUrl);
    
    try {
      const res = await fetch(target);
      if (!res.ok) {
        throw new Error(`Proxy Node Error (HTTP ${res.status}): Failed to retrieve web content.`);
      }
      const text = await res.text();
      setBrowserContent(text);
    } catch (err: any) {
      console.error("Error loading secure web node:", err);
      try {
        const fallbackRes = await fetch(proxyUrl);
        const text = await fallbackRes.text();
        setBrowserContent(text);
      } catch (fallbackErr: any) {
        setBrowserError(err.message || "Failed to retrieve page content via secure proxy node.");
      }
    } finally {
      setIframeLoading(false);
    }
  };

  
  const navigateBrowser = (target: string, isSearch: boolean = false) => {
    let cleanUrl = target.trim();
    if (!cleanUrl) return;

    let targetUrl = "";
    if (isSearch) {
      targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanUrl)}`;
    } else {
      const isUrl = cleanUrl.includes(".") && !cleanUrl.includes(" ") && !cleanUrl.startsWith("http://localhost") && !cleanUrl.startsWith("http://127.0.0.1");
      if (isUrl) {
        if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
          cleanUrl = "https://" + cleanUrl;
        }
        targetUrl = cleanUrl;
      } else {
        targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanUrl)}`;
      }
    }

    setBrowserUrl(targetUrl);
    setSearchQuery(targetUrl);
    
    const newHistory = browserHistory.slice(0, historyIndex + 1);
    newHistory.push(targetUrl);
    setBrowserHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    fetchPageContent(targetUrl);
  };

  const browserGoBack = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const url = browserHistory[prevIdx];
      setHistoryIndex(prevIdx);
      setBrowserUrl(url);
      setSearchQuery(url);
      fetchPageContent(url);
    }
  };

  const browserGoForward = () => {
    if (historyIndex < browserHistory.length - 1) {
      const nextIdx = historyIndex + 1;
      const url = browserHistory[nextIdx];
      setHistoryIndex(nextIdx);
      setBrowserUrl(url);
      setSearchQuery(url);
      fetchPageContent(url);
    }
  };

  const browserGoHome = () => {
    setBrowserUrl("");
    setIframeSrc("");
    setSearchQuery("");
    setBrowserContent("");
    setBrowserError("");
    setIframeLoading(false);
  };

  const browserRefresh = () => {
    if (browserUrl) {
      fetchPageContent(browserUrl);
    }
  };

  
  const handleConnectVpn = () => {
    if (vpnConnected) {
      setVpnConnected(false);
      setVpnLogs(prev => [...prev, `[VPN] Connection terminated manually. IP reverted to dynamic local proxy.`]);
    } else {
      setVpnConnected(true);
      setVpnLogs(prev => [
        ...prev,
        `[VPN] Routing tunnel initiated via server: ${vpnServer}`,
        `[VPN] Performing cryptographic handshake (AES-256-GCM)...`,
        `[VPN] Tunnel established. External IP: ${vpnIp}`,
        `[VPN] DNS Leak Protection: ENABLED`
      ]);
    }
  };

  const selectVpnServer = (name: string, ip: string) => {
    if (vpnConnected) {
      setVpnServer(name);
      setVpnIp(ip);
      setVpnLogs(prev => [
        ...prev,
        `[VPN] Disconnecting from previous node...`,
        `[VPN] Switching server to: ${name}`,
        `[VPN] Re-initiating cryptographic handshake (AES-256-GCM) on node ${ip}...`,
        `[VPN] Secure tunnel re-established. New external IP: ${ip}`
      ]);
    } else {
      setVpnServer(name);
      setVpnIp(ip);
      setVpnLogs(prev => [
        ...prev,
        `[VPN] Target server selected: ${name} (${ip})`
      ]);
    }
  };

  
  const handleClearRam = () => {
    setRamCleared(true);
    setRamUsage(18);
    setTimeout(() => {
      setRamCleared(false);
    }, 3000);
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-[#050508] border border-zinc-800/80 rounded-2xl overflow-hidden relative font-sans text-zinc-300 min-h-[640px] select-none shadow-2xl">
      
      {}
      <div className="w-full h-11 bg-[#09090e] border-b border-zinc-800/80 flex items-center justify-between px-4 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="h-4 w-[1px] bg-zinc-800" />
          <span className="text-xs font-semibold tracking-wider text-emerald-400 font-mono flex items-center gap-1">
            <Settings className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
            YuriOS v2.0-STABLE
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
          {onBack && (
            <button
              onClick={onBack}
              className="px-2.5 py-1 bg-[#111] hover:bg-zinc-900 hover:text-white border border-zinc-800 rounded text-[10px] font-medium transition-all flex items-center gap-1 shrink-0 active:scale-95"
            >
              <ArrowLeft className="w-3 h-3" /> Back to Portal
            </button>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-2.5 py-1 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 border border-red-900/30 rounded text-[10px] font-medium transition-all shrink-0 active:scale-95"
            >
              Sign Out
            </button>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/20 border border-emerald-500/10 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>SSL Secured</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{time || "12:00:00 AM"}</span>
          </div>
        </div>
      </div>

      {}
      <div className="flex-1 w-full relative overflow-hidden bg-gradient-to-br from-[#040406] via-[#07070d] to-[#0a0f1d] p-3 md:p-6 flex flex-col md:flex-row gap-4 min-h-0">
        
        {}
        {!isMobile ? (
          <>
            {}
            <div className="w-24 shrink-0 flex flex-col gap-4 items-center py-2 z-10 select-none">
              {apps.map((app) => {
                const Icon = app.icon;
                return (
                  <button
                    key={app.id}
                    onClick={() => launchApp(app.id)}
                    className="group flex flex-col items-center gap-1.5 p-2 rounded-xl w-20 hover:bg-white/5 border border-transparent hover:border-zinc-800/50 transition-all text-center focus:outline-none"
                  >
                    <div className={`p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 group-hover:border-emerald-500/30 group-hover:scale-105 transition-all relative ${app.isOpen ? 'shadow-md shadow-emerald-500/10' : ''}`}>
                      <Icon className={`w-6 h-6 text-emerald-400`} />
                      {app.isOpen && (
                        <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-500 shadow shadow-emerald-400" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 group-hover:text-emerald-400 transition-colors leading-tight truncate w-full">
                      {app.title.split(" ")[1] || app.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {}
            {apps.map((app) => {
              if (!app.isOpen || app.isMinimized) return null;
              const Icon = app.icon;
              
              return (
                <div
                  key={app.id}
                  style={{
                    zIndex: app.zIndex,
                    left: app.isMaximized ? 0 : `${app.x}px`,
                    top: app.isMaximized ? 0 : `${app.y}px`,
                    width: app.isMaximized ? "100%" : `${app.w}px`,
                    height: app.isMaximized ? "100%" : `${app.h}px`,
                    position: app.isMaximized ? "absolute" : "absolute"
                  }}
                  className={`bg-[#06060a]/95 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col transition-all duration-150 ${
                    app.id === activeTab ? 'border-emerald-500/30 ring-1 ring-emerald-500/10' : ''
                  }`}
                  onClick={() => focusApp(app.id)}
                >
                  {}
                  <div
                    onPointerDown={(e) => startDrag(app.id, e)}
                    onPointerMove={onDrag}
                    onPointerUp={stopDrag}
                    className="h-10 bg-[#0c0c12] border-b border-zinc-800/80 flex items-center justify-between px-3 shrink-0 cursor-move select-none select-none active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold font-mono text-zinc-300 leading-none truncate max-w-[280px]">
                        {app.title}
                      </span>
                    </div>

                    {}
                    <div 
                      className="flex items-center gap-1.5 shrink-0" 
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <button 
                        onClick={() => minimizeApp(app.id)}
                        className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded transition-all"
                        title="Minimize"
                      >
                        <Minimize2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => toggleMaximizeApp(app.id)}
                        className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded transition-all"
                        title={app.isMaximized ? "Restore" : "Maximize"}
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => closeApp(app.id)}
                        className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                        title="Close"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {}
                  <div className="flex-1 min-h-0 w-full overflow-auto flex flex-col bg-[#050508]/40">
                    {renderAppContent(app.id)}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          
          <div className="w-full flex flex-col flex-1 min-h-0">
            {}
            <div className="flex gap-1.5 p-1 bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-x-auto no-scrollbar mb-3 shrink-0">
              {apps.map((app) => {
                const Icon = app.icon;
                const isActive = activeTab === app.id;
                return (
                  <button
                    key={app.id}
                    onClick={() => {
                      setActiveTab(app.id);
                      setApps(prev => prev.map(a => a.id === app.id ? { ...a, isOpen: true, isMinimized: false, isMaximized: true } : a));
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap shrink-0 ${
                      isActive 
                        ? 'bg-emerald-600 text-white shadow shadow-emerald-500/20' 
                        : 'text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-inherit" />
                    <span>{app.title.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>

            {}
            <div className="flex-1 w-full bg-[#06060a]/95 border border-zinc-800/80 rounded-xl overflow-hidden flex flex-col min-h-0">
              <div className="h-9 bg-[#0c0c12] border-b border-zinc-800/80 flex items-center px-3 justify-between shrink-0">
                <span className="text-[11px] font-bold font-mono text-emerald-400 truncate">
                  {apps.find(a => a.id === activeTab)?.title || "Application"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono uppercase bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-black select-none">
                    Active
                  </span>
                  <button 
                    onClick={() => {
                      if (activeTab) {
                        closeApp(activeTab);
                      }
                    }}
                    className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                    title="Close App"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-auto flex flex-col">
                {renderAppContent(activeTab)}
              </div>
            </div>
          </div>
        )}
      </div>

      {}
      {isStartOpen && (
        <div className="absolute bottom-14 left-4 w-72 bg-[#09090f] border border-zinc-800/85 rounded-xl shadow-2xl z-50 overflow-hidden text-sm font-mono flex flex-col">
          <div className="p-4 bg-gradient-to-r from-emerald-950/40 to-zinc-900/40 border-b border-zinc-800/60">
            <p className="text-[10px] text-zinc-500 uppercase font-black">ACTIVE SESSION</p>
            <p className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
              <User className="w-3.5 h-3.5" />
              root@YuriSelfbot
            </p>
            <p className="text-[9px] text-zinc-500 mt-1">Admin authorized • Harumi 💜</p>
          </div>

          <div className="p-2 flex flex-col gap-1">
            {apps.map((app) => {
              const Icon = app.icon;
              return (
                <button
                  key={app.id}
                  onClick={() => launchApp(app.id)}
                  className="flex items-center justify-between w-full p-2 hover:bg-white/5 rounded-lg text-left transition-colors text-zinc-300 hover:text-emerald-400"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs">{app.title.split(" - ")[0]}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                </button>
              );
            })}
          </div>

          <div className="p-3 bg-zinc-950 border-t border-zinc-800/40 flex items-center justify-between text-[10px] text-zinc-500">
            <span>Uptime: {Math.floor(process.uptime() || 60)}s</span>
            <span className="text-zinc-600">Credited to Harumi 💜</span>
          </div>
        </div>
      )}

      {}
      <div className="w-full h-14 bg-[#09090d] border-t border-zinc-800/80 flex items-center justify-between px-4 shrink-0 z-40 select-none">
        
        {}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsStartOpen(!isStartOpen)}
            className={`px-4 py-2 bg-gradient-to-r from-emerald-900/60 to-emerald-800/60 text-white font-mono font-black text-xs rounded-lg border border-emerald-500/40 shadow-md flex items-center gap-2 hover:from-emerald-800/80 hover:to-emerald-700/80 transition-all active:scale-95`}
          >
            <Settings className="w-4 h-4 animate-spin" style={{ animationDuration: '10s' }} />
            <span>YuriOS</span>
          </button>
          
          <div className="h-6 w-[1px] bg-zinc-800" />

          {}
          <div className="hidden md:flex gap-1.5">
            {apps.map((app) => {
              const Icon = app.icon;
              const isActive = app.isOpen && !app.isMinimized;
              return (
                <button
                  key={app.id}
                  onClick={() => handleTaskbarClick(app.id)}
                  className={`p-2 rounded-lg border transition-all shrink-0 ${
                    isActive 
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' 
                      : 'bg-zinc-900/30 border-zinc-800 text-zinc-400 hover:bg-zinc-900/60 hover:text-white'
                  }`}
                  title={app.title}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>

        {}
        <div className="hidden lg:flex items-center gap-3 text-[10px] font-mono text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow shadow-emerald-400" />
          <span>Gateway: Secure Proxy Socket</span>
          <span className="text-zinc-700">•</span>
          <span>Environment: Sandboxed /tmp/root</span>
        </div>

        {}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex gap-4 text-[10px] font-mono">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">CPU LOAD</span>
              <span className="text-xs font-bold text-zinc-300">{cpuUsage}%</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">MEMORY</span>
              <span className="text-xs font-bold text-zinc-300">{ramUsage}%</span>
            </div>
          </div>
          
          <button
            onClick={handleClearRam}
            className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border transition-all ${
              ramCleared 
                ? 'bg-emerald-500 border-emerald-400 text-black font-extrabold' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/20'
            }`}
          >
            {ramCleared ? '✓ OPTIMIZED' : 'CLEAN RAM'}
          </button>
        </div>
      </div>
    </div>
  );

  
  function renderAppContent(appId: string) {
    switch (appId) {
      case "terminal":
        return (
          <div className="flex-1 w-full h-full flex flex-col p-1 bg-black/40">
            <SystemConsoleTab fullscreen={true} />
          </div>
        );

      case "browser":
        return renderBrowser();

      case "vpn":
        return renderVPN();

      case "files":
        return renderFileManager();

      case "monitor":
        return renderSystemMonitor();

      default:
        return (
          <div className="p-6 font-mono text-xs text-red-400 flex flex-col items-center justify-center h-full">
            <X className="w-10 h-10 mb-2" />
            <span>Unknown Application Core Entry</span>
          </div>
        );
    }
  }

  
  function renderBrowser() {
    return (
      <div className="flex flex-col flex-1 h-full w-full font-mono text-xs text-zinc-300 bg-[#07070a] min-h-0">
        
        {}
        <div className="p-2 bg-[#0c0c12] border-b border-zinc-800/80 flex items-center gap-2 shrink-0">
          {}
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={browserGoBack} 
              disabled={historyIndex <= 0}
              className="p-1.5 rounded hover:bg-white/5 text-zinc-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={browserGoForward} 
              disabled={historyIndex >= browserHistory.length - 1}
              className="p-1.5 rounded hover:bg-white/5 text-zinc-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Forward"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={browserGoHome} 
              className="p-1.5 rounded hover:bg-white/5 text-zinc-400 transition-colors"
              title="Home"
            >
              <Database className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={browserRefresh} 
              disabled={!browserUrl}
              className="p-1.5 rounded hover:bg-white/5 text-zinc-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 flex bg-[#050508] border border-zinc-800 rounded-lg px-2.5 py-1 items-center gap-1.5">
            <span className="text-[9px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.2 rounded select-none uppercase tracking-wider">PROXY</span>
            <input
              type="text"
              placeholder="Enter URL or search DuckDuckGo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") navigateBrowser(searchQuery);
              }}
              className="flex-1 bg-transparent text-zinc-200 outline-none text-xs"
            />
            {iframeLoading && <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />}
          </div>
          
          <button 
            onClick={() => navigateBrowser(searchQuery)}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors active:scale-95 shrink-0"
          >
            Go
          </button>
        </div>

        {}
        {browserUrl && (
          <div className="px-3 py-1.5 bg-[#09090f] border-b border-zinc-800/60 flex items-center justify-between text-[11px] shrink-0 select-none">
            <div className="flex items-center gap-1 text-zinc-500">
              <span className="text-[9px] uppercase font-black text-emerald-500/70">View Node:</span>
              <span className="text-zinc-400 truncate max-w-[200px] md:max-w-md font-mono">{browserUrl}</span>
            </div>
            
            <div className="flex items-center gap-1.5 bg-zinc-950 p-0.5 border border-zinc-850 rounded-lg shrink-0">
              <button
                onClick={() => setBrowserViewMode('reader')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-sans transition-all ${
                  browserViewMode === 'reader'
                    ? 'bg-emerald-600 text-white shadow shadow-emerald-500/10'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Reader View (Parsed Web Contents)"
              >
                <BookOpen className="w-3 h-3" />
                <span>Reader</span>
              </button>
              <button
                onClick={() => setBrowserViewMode('raw')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-sans transition-all ${
                  browserViewMode === 'raw'
                    ? 'bg-emerald-600 text-white shadow shadow-emerald-500/10'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="View Plain Markdown Source"
              >
                <FileText className="w-3 h-3" />
                <span>Raw Source</span>
              </button>
              <button
                onClick={() => setBrowserViewMode('legacy' as any)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-sans transition-all ${
                  (browserViewMode as any) === 'legacy'
                    ? 'bg-emerald-600 text-white shadow shadow-emerald-500/10'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Render normal website in iframe via Cloud Proxy"
              >
                <Globe className="w-3 h-3" />
                <span>Cloud Frame</span>
              </button>
            </div>
          </div>
        )}

        {}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-[#040407] min-h-0">
          {iframeLoading && (
            <div className="absolute inset-0 bg-[#040407]/95 z-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <div className="text-center">
                <span className="text-zinc-300 text-xs font-mono font-bold block">Proxying secure node connection...</span>
                <span className="text-zinc-500 text-[10px] font-mono block mt-1">Bypassing anti-frame protections via Cloud / Reader</span>
              </div>
            </div>
          )}

          {browserUrl ? (
            <div className="flex-1 w-full h-full relative min-h-0 overflow-hidden flex flex-col">
              {browserError ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-full bg-red-950/20 border border-red-900/30 flex items-center justify-center mb-4 text-red-400">
                    <Shield className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-red-400">Proxy Retrieval Failed</p>
                  <p className="text-xs text-zinc-500 mt-2 leading-relaxed font-sans">{browserError}</p>
                  <button 
                    onClick={() => fetchPageContent(browserUrl)}
                    className="mt-4 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:text-emerald-400 text-xs rounded-lg font-mono font-bold transition-all"
                  >
                    Retry Connection
                  </button>
                </div>
              ) : (browserViewMode as any) === 'legacy' ? (
                <iframe
                  src={`/api/browser/frame-proxy?url=${encodeURIComponent(browserUrl)}`}
                  onLoad={() => setIframeLoading(false)}
                  className="w-full h-full border-0 bg-zinc-950"
                  title="YuriOS Secure Proxy Browser Frame"
                  referrerPolicy="no-referrer"
                />
              ) : browserViewMode === 'raw' ? (
                <div className="flex-1 p-4 overflow-auto font-mono text-[11px] text-zinc-400 leading-normal bg-zinc-950/50">
                  <pre className="whitespace-pre-wrap select-text selection:bg-emerald-500/20">{browserContent || "No source retrieved."}</pre>
                </div>
              ) : (
                
                <div className="flex-1 p-5 md:p-8 overflow-y-auto bg-zinc-950/20 scroll-smooth">
                  <div className="max-w-2xl mx-auto pb-16 font-sans">
                    {browserContent ? (
                      parseMarkdown(browserContent, (linkUrl) => {
                        
                        if (linkUrl) {
                          navigateBrowser(linkUrl);
                        }
                      })
                    ) : (
                      <div className="text-center text-zinc-600 text-xs py-10 font-mono">No readable text found on page.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            
            <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center max-w-lg mx-auto text-center font-sans">
              <div className="w-16 h-16 rounded-full bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400 shadow-lg shadow-emerald-500/5 animate-pulse">
                <Globe className="w-8 h-8" />
              </div>
              <p className="text-base font-extrabold text-zinc-200 font-mono tracking-tight">YuriOS Web Agent v2.0</p>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                A secure browser integrated with the Secure Reader Proxy Engine. Browse normal websites or search privately via DuckDuckGo without CORS blocks, tracking cookies, or script injection.
              </p>

              {}
              <div className="w-full mt-6 bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex gap-2">
                <input 
                  type="text"
                  placeholder="Ask any question or input website URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigateBrowser(searchQuery);
                  }}
                  className="flex-1 bg-transparent text-zinc-200 outline-none text-xs font-mono px-1"
                />
                <button 
                  onClick={() => navigateBrowser(searchQuery)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors active:scale-95"
                >
                  Search / Go
                </button>
              </div>

              {}
              <div className="w-full mt-6 flex flex-col gap-2">
                <p className="text-[10px] text-zinc-600 uppercase font-black font-mono tracking-wider text-left">SUGGESTED SECURE NODES</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: "DuckDuckGo", target: "yuri selfbot harumi", search: true },
                    { name: "Wikipedia", target: "https://en.wikipedia.org" },
                    { name: "GitHub", target: "https://github.com/harumi" },
                    { name: "ProtonVPN Privacy", target: "https://protonvpn.ch/privacy-check" },
                  ].map((node, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSearchQuery(node.target);
                        navigateBrowser(node.target, node.search);
                      }}
                      className="p-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/80 hover:border-emerald-500/20 text-left rounded-xl transition-all flex flex-col gap-1 group text-zinc-400"
                    >
                      <span className="text-xs font-bold text-zinc-300 group-hover:text-emerald-400 font-mono transition-colors">{node.name}</span>
                      <span className="text-[9px] text-zinc-600 truncate font-mono">{node.target}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 text-[10px] text-zinc-600 leading-normal font-mono border-t border-zinc-900 pt-4 w-full text-center">
                🛡️ All sessions are encrypted on Swiss nodes, credited to **Harumi 💜**.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  
  function renderVPN() {
    return (
      <div className="flex flex-col md:flex-row flex-1 h-full w-full font-mono text-xs text-zinc-300 bg-[#060609] min-h-0">
        
        {}
        <div className="w-full md:w-56 bg-[#0a0a0f] border-b md:border-b-0 md:border-r border-zinc-800 p-4 flex flex-col gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${vpnConnected ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
            <span className="font-bold text-zinc-200">Proton VPN Core</span>
          </div>

          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col gap-1">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">CURRENT IP</p>
            <p className="text-xs font-bold text-zinc-300 font-mono">{vpnConnected ? vpnIp : "127.0.0.1 (Dynamic)"}</p>
          </div>

          <button
            onClick={handleConnectVpn}
            className={`w-full py-2.5 rounded-lg border font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-2 ${
              vpnConnected
                ? 'bg-red-950/40 border-red-500/40 text-red-400 hover:bg-red-900/30'
                : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40'
            }`}
          >
            {vpnConnected ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>DISCONNECT</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>QUICK CONNECT</span>
              </>
            )}
          </button>

          <div className="flex flex-col gap-2 mt-2">
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">SECURE COUNTRY SERVERS</p>
            {[
              { name: "Geneva, Switzerland (CH-01)", ip: "109.201.154.22" },
              { name: "Reykjavik, Iceland (IS-04)", ip: "185.112.144.18" },
              { name: "Tokyo, Japan (JP-12)", ip: "210.140.10.82" },
              { name: "New York, United States (US-88)", ip: "162.210.192.5" }
            ].map((srv, idx) => (
              <button
                key={idx}
                onClick={() => selectVpnServer(srv.name, srv.ip)}
                className={`w-full text-left p-2 rounded text-[10px] transition-all border ${
                  vpnServer === srv.name
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                    : 'bg-transparent border-transparent hover:bg-white/5 text-zinc-400 hover:text-zinc-300'
                }`}
              >
                {srv.name}
              </button>
            ))}
          </div>
        </div>

        {}
        <div className="flex-1 flex flex-col p-4 min-h-0 bg-[#040407]">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
            <span className="text-[11px] font-bold">TUNNEL GRAPH METRICS</span>
            <span className={`text-[10px] font-bold flex items-center gap-1.5 ${vpnConnected ? 'text-emerald-400' : 'text-zinc-500'}`}>
              <span className={`w-2 h-2 rounded-full ${vpnConnected ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'}`} />
              {vpnConnected ? "CONNECTED • TUNNEL ACTIVE" : "OFFLINE"}
            </span>
          </div>

          {}
          <div className="h-28 bg-[#09090f] border border-zinc-800/80 rounded-xl p-3 flex flex-col relative overflow-hidden shrink-0">
            <span className="absolute top-2 left-2 text-[9px] text-zinc-500 uppercase tracking-wider">Swiss Encrypted Encapsulation Node (Traffic peak KB/s)</span>
            <div className="flex-1 flex items-end">
              <svg className="w-full h-16 text-emerald-500 overflow-visible" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path
                  d={vpnTraffic.reduce((acc, val, idx) => {
                    const x = (idx / (vpnTraffic.length - 1)) * 100;
                    const y = 20 - (val / 150) * 18;
                    return acc + `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }, "")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className={`${vpnConnected ? 'transition-all duration-300' : ''}`}
                />
              </svg>
            </div>
            <div className="flex justify-between items-center text-[9px] text-zinc-600 font-mono mt-2">
              <span>0m ago</span>
              <span>Speed: {vpnConnected ? `${vpnTraffic[vpnTraffic.length - 1]} KB/s` : "0.0 KB/s"}</span>
              <span>Live</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 mt-3">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">TUNNEL LOGS</span>
            <div className="flex-1 bg-black p-3 rounded-lg border border-zinc-800/80 overflow-auto font-mono text-[10px] text-zinc-400 leading-normal scrollbar-thin">
              {vpnLogs.map((log, index) => (
                <div key={index} className="flex gap-2 mb-1">
                  <span className="text-emerald-600 select-none">&gt;&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  
  function renderFileManager() {
    return (
      <div className="flex flex-col md:flex-row flex-1 h-full w-full font-mono text-xs text-zinc-300 bg-[#07070a] min-h-0">
        
        {}
        <div className="w-full md:w-56 bg-[#0a0a0f] border-b md:border-b-0 md:border-r border-zinc-800 p-4 flex flex-col gap-3 shrink-0 min-h-0">
          <div className="flex items-center justify-between">
            <span className="font-bold text-zinc-200">Files (/tmp/root)</span>
            <button 
              onClick={fetchFiles}
              className="p-1 hover:text-emerald-400 hover:bg-white/5 rounded transition-all"
              title="Refresh Files"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {}
          <div className="flex gap-1.5 mt-2">
            <input
              type="text"
              placeholder="newfile.json"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="flex-1 px-2 py-1 bg-[#050508] border border-zinc-800 rounded outline-none text-[11px] focus:border-emerald-500/40 text-emerald-400"
            />
            <button 
              onClick={handleCreateFile}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-white font-bold transition-all active:scale-95"
              title="Create File"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {fileMessage && (
            <p className="text-[10px] text-yellow-500 font-semibold">{fileMessage}</p>
          )}

          <div className="h-[1px] bg-zinc-800 my-2" />

          {}
          <div className="flex-1 overflow-auto flex flex-col gap-1">
            {files.length === 0 ? (
              <span className="text-[10px] text-zinc-600">No files found.</span>
            ) : (
              files.map((file, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedFile(file);
                    setEditorContent(file.content);
                  }}
                  className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between ${
                    selectedFile && selectedFile.name === file.name
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400 font-bold'
                      : 'bg-transparent border-transparent hover:bg-white/5 text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FolderOpen className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span className="text-[9px] text-zinc-600 shrink-0 font-mono">
                    {Math.round(file.size)} B
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {}
        <div className="flex-1 flex flex-col min-h-0 bg-[#040407]">
          {selectedFile ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-3 bg-[#0c0c12] border-b border-zinc-800/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-bold text-zinc-200">Editing: {selectedFile.name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => saveFile(selectedFile.name, editorContent)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] transition-all active:scale-95 flex items-center gap-1"
                    title="Save current file"
                  >
                    <Save className="w-3 h-3" />
                    <span>SAVE FILE</span>
                  </button>
                  <button
                    onClick={() => deleteFile(selectedFile.name)}
                    className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                    title="Delete file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {}
              <div className="flex-1 relative flex min-h-0">
                <textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  className="flex-1 w-full h-full p-4 bg-[#050508] text-emerald-400 font-mono text-xs leading-relaxed outline-none border-0 resize-none selection:bg-emerald-800/40 selection:text-emerald-100"
                  spellCheck="false"
                  placeholder="Start writing file content here..."
                />
              </div>

              <div className="p-2 bg-[#09090f] border-t border-zinc-800/80 text-[10px] text-zinc-500 flex justify-between font-mono shrink-0">
                <span>Lines: {editorContent.split("\n").length}</span>
                <span>UTF-8 Encoding</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 items-center justify-center text-center max-w-sm mx-auto p-4">
              <FolderOpen className="w-12 h-12 text-zinc-700 mb-3" />
              <p className="text-sm font-bold text-zinc-300">No File Opened</p>
              <p className="text-xs text-zinc-500 mt-2 font-sans leading-relaxed">
                Open a file from the sidebar to view or edit its contents. You can safely manage Roblox script configs, token files, and selfbot scripts.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  
  function renderSystemMonitor() {
    return (
      <div className="flex-1 overflow-auto p-4 font-mono text-xs text-zinc-300 bg-[#050508]">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-4">
          <span className="font-bold text-zinc-200 uppercase tracking-wider text-[11px]">Telemetry Overview</span>
          <span className="text-[10px] text-emerald-400 font-bold">Harumi Secure OS v2.0-STABLE</span>
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
            <div className="flex justify-between text-[10px] text-zinc-500 font-bold mb-1.5 uppercase">
              <span>CPU Status</span>
              <span className="text-emerald-400">{cpuUsage}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                style={{ width: `${cpuUsage}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-zinc-600 mt-2">
              <span>4 physical cores</span>
              <span>Dynamic freq</span>
            </div>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
            <div className="flex justify-between text-[10px] text-zinc-500 font-bold mb-1.5 uppercase">
              <span>Memory Usage</span>
              <span className="text-emerald-400">{ramUsage}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                style={{ width: `${ramUsage}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-zinc-600 mt-2">
              <span>Used: {Math.round(4096 * (ramUsage / 100))} MB</span>
              <span>Max: 4096 MB</span>
            </div>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
            <div className="flex justify-between text-[10px] text-zinc-500 font-bold mb-1.5 uppercase">
              <span>Disk Partition</span>
              <span className="text-emerald-400">14%</span>
            </div>
            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full" 
                style={{ width: `14%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-zinc-600 mt-2">
              <span>Used: 4.2 GB</span>
              <span>Available: 30 GB</span>
            </div>
          </div>

        </div>

        {}
        <div className="flex flex-col">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">RUNNING PROCESS LIST</span>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-4 p-2 bg-[#0c0c12] border-b border-zinc-800 text-[10px] text-zinc-500 font-black uppercase">
              <span>PID</span>
              <span>PROCESS NAME</span>
              <span>STATUS</span>
              <span className="text-right">CPU/MEM</span>
            </div>

            <div className="divide-y divide-zinc-800">
              {[
                { pid: "392", name: "yuri-selfbot", state: "Active", metric: "0.8% / 42.1 MB" },
                { pid: "405", name: "node-server", state: "Active", metric: "1.2% / 128 MB" },
                { pid: "412", name: "pty_shell.py", state: "Idle", metric: "0.1% / 15.4 MB" },
                { pid: "450", name: "pm2-daemon", state: "Active", metric: "0.2% / 28.5 MB" }
              ].map((proc, index) => (
                <div key={index} className="grid grid-cols-4 p-2 text-[11px] items-center hover:bg-white/2">
                  <span className="text-zinc-500">#{proc.pid}</span>
                  <span className="font-semibold text-zinc-300">{proc.name}</span>
                  <span className="text-emerald-400 font-black uppercase text-[10px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {proc.state}
                  </span>
                  <span className="text-right text-zinc-400">{proc.metric}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] text-zinc-500 leading-relaxed font-sans">
            ℹ️ **Secure Sandbox Notice**: Diagnostics are gathered using node native system resources. To close the system dashboard or run custom terminal command line tools, use the Yuri TTY Terminal launcher, credited to **Harumi 💜**.
          </div>
        </div>
      </div>
    );
  }
}


function parseMarkdown(text: string, onLinkClick: (url: string) => void) {
  if (!text) return null;
  
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentCodeBlock: { lang: string; content: string[] } | null = null;
  let keyCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    
    if (line.trim().startsWith("```")) {
      if (currentCodeBlock) {
        const codeText = currentCodeBlock.content.join("\n");
        elements.push(
          <div key={`code-${keyCounter++}`} className="my-3 bg-zinc-950 border border-zinc-800/80 rounded-lg p-3 overflow-x-auto relative group">
            <div className="absolute top-2 right-2 text-[8px] text-zinc-600 uppercase font-black tracking-wider select-none">
              {currentCodeBlock.lang || "code"}
            </div>
            <pre className="text-emerald-400 font-mono text-[11px] leading-relaxed selection:bg-emerald-500/20">{codeText}</pre>
          </div>
        );
        currentCodeBlock = null;
      } else {
        const lang = line.trim().slice(3).trim();
        currentCodeBlock = { lang, content: [] };
      }
      continue;
    }

    if (currentCodeBlock) {
      currentCodeBlock.content.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={`spacer-${keyCounter++}`} className="h-2" />);
      continue;
    }

    
    if (trimmed.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${keyCounter++}`} className="text-base md:text-lg font-black text-white mt-5 mb-2.5 border-b border-zinc-800/60 pb-1.5 font-mono tracking-tight text-emerald-400">
          {trimmed.slice(2)}
        </h1>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${keyCounter++}`} className="text-sm font-extrabold text-zinc-100 mt-4.5 mb-2 font-mono border-b border-zinc-900 pb-1">
          {trimmed.slice(3)}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${keyCounter++}`} className="text-xs font-bold text-zinc-200 mt-4 mb-1.5 font-mono">
          {trimmed.slice(4)}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith("#### ")) {
      elements.push(
        <h4 key={`h4-${keyCounter++}`} className="text-[11px] font-bold text-zinc-300 mt-3.5 mb-1 font-mono">
          {trimmed.slice(5)}
        </h4>
      );
      continue;
    }

    
    if (trimmed.startsWith(">")) {
      elements.push(
        <blockquote key={`quote-${keyCounter++}`} className="border-l-2 border-emerald-500 pl-3 py-1 my-2.5 bg-emerald-950/5 text-zinc-400 italic text-[11px] leading-relaxed font-sans">
          {trimmed.slice(1).trim()}
        </blockquote>
      );
      continue;
    }

    
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      elements.push(<hr key={`hr-${keyCounter++}`} className="my-4 border-zinc-900" />);
      continue;
    }

    
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      const content = trimmed.slice(2);
      elements.push(
        <div key={`bullet-${keyCounter++}`} className="flex items-start gap-1.5 my-1 pl-1 font-sans text-xs text-zinc-300">
          <span className="text-emerald-500 select-none mt-1 shrink-0 text-[9px]">■</span>
          <span className="leading-relaxed">{renderInlineFormatting(content, onLinkClick)}</span>
        </div>
      );
      continue;
    }

    
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      const num = numMatch[1];
      const content = numMatch[2];
      elements.push(
        <div key={`number-${keyCounter++}`} className="flex items-start gap-1.5 my-1 pl-1 font-sans text-xs text-zinc-300">
          <span className="text-emerald-500 font-bold font-mono select-none shrink-0 text-[9px]">{num}.</span>
          <span className="leading-relaxed">{renderInlineFormatting(content, onLinkClick)}</span>
        </div>
      );
      continue;
    }

    
    elements.push(
      <p key={`p-${keyCounter++}`} className="my-1.5 text-xs leading-relaxed text-zinc-300 font-sans selection:bg-emerald-500/10">
        {renderInlineFormatting(line, onLinkClick)}
      </p>
    );
  }

  return <div className="space-y-1 break-words">{elements}</div>;
}

function renderInlineFormatting(text: string, onLinkClick: (url: string) => void) {
  let parts: React.ReactNode[] = [text];
  
  
  parts = parts.flatMap((part, idx) => {
    if (typeof part !== 'string') return part;
    const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
    const matches = [...part.matchAll(imgRegex)];
    if (matches.length === 0) return part;
    
    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    matches.forEach((match, mIdx) => {
      const index = match.index!;
      if (index > lastIndex) {
        result.push(part.substring(lastIndex, index));
      }
      const alt = match[1];
      const src = match[2];
      result.push(
        <img 
          key={`img-${idx}-${mIdx}`} 
          src={src} 
          alt={alt} 
          referrerPolicy="no-referrer"
          className="my-3 max-h-64 object-contain rounded-lg border border-zinc-800 bg-black/40 mx-auto"
        />
      );
      lastIndex = index + match[0].length;
    });
    if (lastIndex < part.length) {
      result.push(part.substring(lastIndex));
    }
    return result;
  });

  
  parts = parts.flatMap((part, idx) => {
    if (typeof part !== 'string') return part;
    const linkRegex = /\[(.*?)\]\((.*?)\)/g;
    const matches = [...part.matchAll(linkRegex)];
    if (matches.length === 0) return part;
    
    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    matches.forEach((match, mIdx) => {
      const index = match.index!;
      if (index > lastIndex) {
        result.push(part.substring(lastIndex, index));
      }
      const label = match[1];
      const url = match[2];
      
      const isInternalUrl = url.startsWith("/") || url.startsWith("#") || url.startsWith("javascript:");
      
      result.push(
        <button
          key={`link-${idx}-${mIdx}`}
          onClick={(e) => {
            e.preventDefault();
            if (url && !isInternalUrl) {
              onLinkClick(url);
            }
          }}
          className="text-emerald-400 hover:text-emerald-300 hover:underline font-semibold font-mono text-[11px] inline cursor-pointer text-left bg-transparent border-none p-0 align-baseline"
        >
          {label}
        </button>
      );
      lastIndex = index + match[0].length;
    });
    if (lastIndex < part.length) {
      result.push(part.substring(lastIndex));
    }
    return result;
  });

  
  parts = parts.flatMap((part, idx) => {
    if (typeof part !== 'string') return part;
    const boldRegex = /\*\*(.*?)\*\*/g;
    const matches = [...part.matchAll(boldRegex)];
    if (matches.length === 0) return part;
    
    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    matches.forEach((match, mIdx) => {
      const index = match.index!;
      if (index > lastIndex) {
        result.push(part.substring(lastIndex, index));
      }
      result.push(<strong key={`bold-${idx}-${mIdx}`} className="font-extrabold text-white">{match[1]}</strong>);
      lastIndex = index + match[0].length;
    });
    if (lastIndex < part.length) {
      result.push(part.substring(lastIndex));
    }
    return result;
  });

  
  parts = parts.flatMap((part, idx) => {
    if (typeof part !== 'string') return part;
    const codeRegex = /`(.*?)`/g;
    const matches = [...part.matchAll(codeRegex)];
    if (matches.length === 0) return part;
    
    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    matches.forEach((match, mIdx) => {
      const index = match.index!;
      if (index > lastIndex) {
        result.push(part.substring(lastIndex, index));
      }
      result.push(
        <code key={`code-${idx}-${mIdx}`} className="px-1 py-0.5 bg-zinc-950 border border-zinc-850 rounded text-amber-400 font-mono text-[10px] leading-none">
          {match[1]}
        </code>
      );
      lastIndex = index + match[0].length;
    });
    if (lastIndex < part.length) {
      result.push(part.substring(lastIndex));
    }
    return result;
  });

  return <>{parts}</>;
}
