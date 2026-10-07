import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Server, 
  Terminal, 
  FileCode, 
  BookOpen, 
  Cpu, 
  ShieldCheck, 
  Globe, 
  Copy, 
  Check, 
  Play, 
  RefreshCw, 
  Radio, 
  ExternalLink, 
  Layers, 
  Key, 
  Lock, 
  Eye, 
  Monitor, 
  ChevronRight,
  Download,
  AlertCircle
} from 'lucide-react';

interface VpsFile {
  name: string;
  path: string;
  type: string;
  description: string;
  size: number;
}

export default function VpsAdminGuide() {
  const [subTab, setSubTab] = useState<'architecture' | 'readme' | 'files' | 'controller'>('architecture');
  const [vpsStatus, setVpsStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>('linux-ssh.sh');
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [launchType, setLaunchType] = useState<'ssh' | 'desktop'>('ssh');
  const [customPassword, setCustomPassword] = useState('cybervps123');
  const [customUsername, setCustomUsername] = useState('runner');
  const [customMachine, setCustomMachine] = useState('FreeVPS');
  const [ngrokToken, setNgrokToken] = useState('');
  const [launching, setLaunching] = useState(false);
  const [launchMessage, setLaunchMessage] = useState('');

  const vpsFilesList: VpsFile[] = [
    {
      name: "linux-desktop.sh",
      path: "linux-desktop.sh",
      type: "shell",
      description: "Full XFCE4 GUI Desktop + TightVNC + Dropbear SSH + Bore/Ngrok Tunnel Auto-Installer",
      size: 4118
    },
    {
      name: "linux-ssh.sh",
      path: "linux-ssh.sh",
      type: "shell",
      description: "Lightweight Headless Linux Dropbear SSH + Bore/Ngrok Reverse Tunnel Script",
      size: 3561
    },
    {
      name: "README.md",
      path: "README.md",
      type: "markdown",
      description: "VPS Engine Architecture, Deployment Guide & Remote Connection Handbook",
      size: 3489
    },
    {
      name: "workflows/vps-runner.yml",
      path: "workflows/vps-runner.yml",
      type: "yaml",
      description: "24/7 GitHub Actions Free VPS Runner & Auto-Provisioning Workflow",
      size: 1420
    },
    {
      name: "bore",
      path: "bore",
      type: "binary",
      description: "High-Performance TCP Reverse Tunnel Relay Binary & Configuration",
      size: 2650000
    }
  ];

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/vps/status', {
        headers: { Authorization: token }
      });
      if (res.ok) {
        const data = await res.json();
        setVpsStatus(data);
      }
    } catch (e) {
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchFileContent = async (fileName: string) => {
    setLoadingFile(true);
    setSelectedFile(fileName);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/vps/file-content?file=${encodeURIComponent(fileName)}`, {
        headers: { Authorization: token }
      });
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content || '');
      } else {
        if (fileName === 'linux-ssh.sh') {
          setFileContent(`#!/bin/bash
export DEBIAN_FRONTEND=noninteractive
export LC_ALL=C

touch /tmp/vps_running
LINUX_USER_PASSWORD="\${LINUX_USER_PASSWORD:-cybervps123}"
LINUX_USERNAME="\${LINUX_USERNAME:-runner}"

useradd -m \$LINUX_USERNAME 2>/dev/null || true
usermod -aG sudo \$LINUX_USERNAME 2>/dev/null || true
echo "\$LINUX_USERNAME:\$LINUX_USER_PASSWORD" | chpasswd 2>/dev/null || true
hostname \${LINUX_MACHINE_NAME:-FreeVPS} 2>/dev/null || true

apt-get update -qq -y 2>/dev/null || true
apt-get install -qq -y dropbear tar wget curl 2>/dev/null || true

mkdir -p /var/run/sshd 2>/dev/null || true
chmod 0755 /var/run/sshd 2>/dev/null || true
pkill dropbear 2>/dev/null || true
/usr/sbin/dropbear -p 22 -W 65536 &

if [[ -n "\$NGROK_AUTH_TOKEN" ]]; then
    ./ngrok tcp 22 --log=stdout > ngrok.log 2>&1 &
else
    nohup ./bore local 22 --to bore.pub > bore.log 2>&1 &
fi`);
        }
      }
    } catch (e) {
    } finally {
      setLoadingFile(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchFileContent('linux-ssh.sh');
    const timer = setInterval(fetchStatus, 15000);
    return () => clearInterval(timer);
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleLaunchVps = async () => {
    setLaunching(true);
    setLaunchMessage('');
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/vps/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        body: JSON.stringify({
          type: launchType,
          password: customPassword,
          username: customUsername,
          machineName: customMachine,
          ngrokToken: ngrokToken
        })
      });
      const data = await res.json();
      if (res.ok) {
        setLaunchMessage(`VPS started successfully: ${data.message || 'Running in background'}`);
        setTimeout(fetchStatus, 2500);
      } else {
        setLaunchMessage(`Launch failed: ${data.error || 'Check server logs'}`);
      }
    } catch (err: any) {
      setLaunchMessage(`Error: ${err.message || 'Request error'}`);
    } finally {
      setLaunching(false);
    }
  };

  const sshCommand = vpsStatus?.port 
    ? `ssh ${customUsername}@bore.pub -p ${vpsStatus.port}` 
    : vpsStatus?.ngrokUrl 
      ? `ssh ${customUsername}@${vpsStatus.ngrokUrl.replace('tcp://', '').split(':')[0]} -p ${vpsStatus.ngrokUrl.split(':')[2] || '22'}` 
      : `ssh ${customUsername}@bore.pub -p [PORT]`;

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Server className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-white tracking-tight">VPS Engine & Linux Virtualization</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 uppercase tracking-wider">
                  Live Engine
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Deep-dive architectural handbook, live SSH controller, and complete VPS-only script repository.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={loadingStatus}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-zinc-300 font-mono transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin text-emerald-400' : 'text-zinc-400'}`} />
              Sync Status
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4 mb-6">
          <button
            onClick={() => setSubTab('architecture')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'architecture'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-500/10'
                : 'bg-black/30 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Cpu className="w-4 h-4" />
            How VPS Works (Full Architecture)
          </button>

          <button
            onClick={() => setSubTab('readme')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'readme'
                ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300 shadow-lg shadow-blue-500/10'
                : 'bg-black/30 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Full VPS README Guide
          </button>

          <button
            onClick={() => setSubTab('files')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'files'
                ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300 shadow-lg shadow-purple-500/10'
                : 'bg-black/30 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileCode className="w-4 h-4" />
            VPS Files Explorer (VPS Only)
          </button>

          <button
            onClick={() => setSubTab('controller')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'controller'
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/10'
                : 'bg-black/30 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Live Controller & Quick Connect
          </button>
        </div>

        {subTab === 'architecture' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-teal-950/20 border border-emerald-500/20">
              <h4 className="text-base font-bold text-emerald-300 flex items-center gap-2 mb-2">
                <Globe className="w-5 h-5" />
                What is the Free VPS Engine?
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                The VPS Engine transforms any headless Linux container, GitHub Actions virtual runner, or Cloud Run instance into a 
                fully functional, 24/7 accessible virtual private server. It automates root privilege setup, SSH socket management, 
                high-performance reverse tunneling, and optional full graphical XFCE4 desktop streaming without requiring any public IP address or firewall port forwarding.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {[
                {
                  step: "01",
                  title: "User & Privilege Isolation",
                  desc: "Creates unprivileged 'runner' account with sudo rights and updates /etc/passwd.",
                  icon: <Lock className="w-4 h-4 text-emerald-400" />
                },
                {
                  step: "02",
                  title: "Headless Environment",
                  desc: "Installs Dropbear SSH, tar, curl, and optional XFCE4 desktop + TightVNC server.",
                  icon: <Layers className="w-4 h-4 text-teal-400" />
                },
                {
                  step: "03",
                  title: "Dropbear Daemon",
                  desc: "Initializes lightweight SSH daemon on port 22 with 64KB TCP window size.",
                  icon: <Key className="w-4 h-4 text-blue-400" />
                },
                {
                  step: "04",
                  title: "Reverse Tunneling",
                  desc: "Multiplexes local port 22 out to bore.pub or ngrok to bypass container NAT barriers.",
                  icon: <Globe className="w-4 h-4 text-purple-400" />
                },
                {
                  step: "05",
                  title: "Remote Access",
                  desc: "Connect anywhere globally via standard OpenSSH terminal or Chrome Remote Desktop.",
                  icon: <Monitor className="w-4 h-4 text-amber-400" />
                }
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-zinc-500">{item.step}</span>
                    {item.icon}
                  </div>
                  <h5 className="text-xs font-bold text-white tracking-tight">{item.title}</h5>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Detailed Engineering Breakdown</h4>
              
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Cpu className="w-4 h-4" />
                    1. Why Reverse Tunneling (Bore & Ngrok) is Critical
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Standard cloud containers (e.g. Render, Cloud Run, GitHub Actions runners) sit behind strict corporate Network Address Translation (NAT) and cloud egress firewalls. Inbound ports cannot be opened directly. 
                    The script initiates an <strong>outbound TCP connection</strong> to a relay server (such as <code className="text-emerald-400 font-mono">bore.pub</code>). The relay server assigns a public listening port and proxies all incoming SSH traffic back down the active outbound socket.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                    <Server className="w-4 h-4" />
                    2. Dropbear vs Standard OpenSSH Server
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Instead of standard OpenSSH which consumes ~40MB of memory and requires multiple helper daemons, the VPS engine uses <strong>Dropbear</strong>. Dropbear operates in ~2.8MB of RAM, binds directly to port 22 with instantaneous initialization, and handles high-throughput encrypted terminal streams with minimal container footprint.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                    <Monitor className="w-4 h-4" />
                    3. Graphical Desktop Architecture (linux-desktop.sh)
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    When running in Desktop mode, the engine installs <code className="text-purple-400 font-mono">xfce4</code>, <code className="text-purple-400 font-mono">nautilus</code>, and <code className="text-purple-400 font-mono">firefox</code>. It provisions an internal virtual frame buffer via <code className="text-purple-400 font-mono">tightvncserver :1</code> and hooks directly into Google's Chrome Remote Desktop service if authorization tokens are passed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {subTab === 'readme' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  VPS Operations Manual & Technical README
                </h4>
                <p className="text-xs text-zinc-400">Complete reference handbook for provisioning, connecting, and maintaining VPS nodes.</p>
              </div>
              <button
                onClick={() => copyToClipboard(fileContent || '# VPS Documentation', 'readme-full')}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-xs text-blue-300 font-mono transition-all cursor-pointer"
              >
                {copiedKey === 'readme-full' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy Handbook
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-black/50 border border-white/10 font-mono text-xs text-zinc-300 space-y-6 leading-relaxed">
              <div className="space-y-2">
                <h1 className="text-lg font-bold text-white border-b border-white/10 pb-2">⚡ FREE LINUX VPS & REMOTE DESKTOP ENGINE</h1>
                <p className="text-zinc-400 text-xs">A high-performance, automated Bash orchestration pipeline for spinning up instantaneous Ubuntu/Debian SSH and GUI instances.</p>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-bold text-emerald-400">📋 PREREQUISITES & COMPATIBILITY</h2>
                <ul className="list-disc list-inside space-y-1 text-zinc-300">
                  <li>Operating System: Ubuntu 20.04+, Debian 11+, or any Linux container with root or sudo access.</li>
                  <li>Architecture: x86_64 / amd64 (native support for bore and ngrok binaries).</li>
                  <li>Inbound Requirements: NONE (Reverse Tunnel automatically handles NAT).</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-bold text-blue-400">🚀 QUICK START (SSH MODE)</h2>
                <div className="p-3 bg-black/80 rounded-xl border border-white/10 text-emerald-400 space-y-1">
                  <div># Execute lightweight headless SSH script:</div>
                  <div>curl -sSL https://raw.githubusercontent.com/Skibdiidii/Yuri/main/linux-ssh.sh | bash</div>
                </div>
                <p className="text-xs text-zinc-400">Default Credentials: Username: <code className="text-white">runner</code> | Password: <code className="text-white">cybervps123</code></p>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-bold text-purple-400">🖥️ QUICK START (DESKTOP GUI MODE)</h2>
                <div className="p-3 bg-black/80 rounded-xl border border-white/10 text-purple-300 space-y-1">
                  <div># Execute full XFCE4 Desktop + VNC script:</div>
                  <div>curl -sSL https://raw.githubusercontent.com/Skibdiidii/Yuri/main/linux-desktop.sh | bash</div>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-bold text-amber-400">🔑 ENVIRONMENT CONFIGURATION VARIABLES</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-black/40 border border-white/5 rounded-lg">
                    <strong className="text-white">LINUX_USER_PASSWORD</strong>: Custom SSH & sudo password (default: cybervps123)
                  </div>
                  <div className="p-2 bg-black/40 border border-white/5 rounded-lg">
                    <strong className="text-white">LINUX_USERNAME</strong>: Custom Linux user account (default: runner)
                  </div>
                  <div className="p-2 bg-black/40 border border-white/5 rounded-lg">
                    <strong className="text-white">LINUX_MACHINE_NAME</strong>: Hostname shown in prompt (default: FreeVPS)
                  </div>
                  <div className="p-2 bg-black/40 border border-white/5 rounded-lg">
                    <strong className="text-white">NGROK_AUTH_TOKEN</strong>: Optional token to use Ngrok TCP relay instead of Bore
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-bold text-red-400">🛡️ SYSTEM SECURITY & PROCESS GUARANTEES</h2>
                <p className="text-zinc-400 text-xs">
                  All scripts feature idempotency locks via <code className="text-white">/tmp/vps_running</code>. Subsequent executions automatically terminate stale processes (<code className="text-white">pkill dropbear</code>, <code className="text-white">pkill bore</code>) ensuring zero duplicate collisions or CPU throttling.
                </p>
              </div>
            </div>
          </div>
        )}

        {subTab === 'files' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-purple-400" />
                  Dedicated VPS Files Repository
                </h4>
                <p className="text-xs text-zinc-400">Inspect, verify, copy, or download exact script payloads.</p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(fileContent, selectedFile)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-xs text-purple-300 font-mono transition-all cursor-pointer"
                >
                  {copiedKey === selectedFile ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy File Content
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="space-y-2 lg:col-span-1">
                <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">VPS Files List ({vpsFilesList.length})</label>
                <div className="space-y-1.5">
                  {vpsFilesList.map((file) => (
                    <button
                      key={file.name}
                      onClick={() => fetchFileContent(file.name)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                        selectedFile === file.name
                          ? 'bg-purple-500/20 border-purple-500/40 text-white shadow-md shadow-purple-500/10'
                          : 'bg-black/30 border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold truncate">{file.name}</span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">
                          {file.type}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 line-clamp-2 leading-snug">{file.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-3 space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                  <div className="flex items-center gap-2 font-mono text-xs text-zinc-300">
                    <Terminal className="w-4 h-4 text-purple-400" />
                    <span>Viewing: <strong>{selectedFile}</strong></span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {vpsFilesList.find(f => f.name === selectedFile)?.size || fileContent.length} bytes
                  </span>
                </div>

                <div className="relative rounded-2xl bg-black/60 border border-white/10 overflow-hidden">
                  {loadingFile ? (
                    <div className="p-12 text-center text-zinc-400 flex items-center justify-center gap-3 font-mono text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                      Loading file contents...
                    </div>
                  ) : (
                    <div className="p-4 max-h-[480px] overflow-y-auto custom-scrollbar font-mono text-xs leading-relaxed">
                      <pre className="text-zinc-300 whitespace-pre-wrap select-text">
                        {fileContent || '# File is empty or not available.'}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {subTab === 'controller' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-mono">Daemon Status</span>
                  <div className={`w-2.5 h-2.5 rounded-full ${vpsStatus?.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                </div>
                <p className="text-xl font-bold font-mono text-white">
                  {vpsStatus?.isRunning ? 'ONLINE' : 'IDLE / READY'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-1">
                <span className="text-xs text-zinc-400 font-mono">Assigned Reverse Port</span>
                <p className="text-xl font-bold font-mono text-emerald-400">
                  {vpsStatus?.port ? `Port ${vpsStatus.port}` : 'Waiting for tunnel'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-1">
                <span className="text-xs text-zinc-400 font-mono">Ngrok Public Relay</span>
                <p className="text-sm font-bold font-mono text-blue-400 truncate">
                  {vpsStatus?.ngrokUrl || 'Bore Default'}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-black/50 border border-white/10 space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">SSH Quick-Connect Terminal Command</h4>
              
              <div className="flex items-center gap-2 p-3 bg-black/80 rounded-xl border border-white/10">
                <input
                  type="text"
                  readOnly
                  value={sshCommand}
                  className="flex-1 bg-transparent text-emerald-400 font-mono text-xs outline-none"
                />
                <button
                  onClick={() => copyToClipboard(sshCommand, 'ssh-cmd')}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 font-mono transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {copiedKey === 'ssh-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy SSH
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                Password: <strong className="text-white">{customPassword}</strong> | Run this command in your local terminal (Windows PowerShell, Mac/Linux Bash) to establish an encrypted shell.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-black/30 border border-white/10 space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Launch Node with Custom Parameters</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase">Operating Mode</label>
                  <select
                    value={launchType}
                    onChange={(e: any) => setLaunchType(e.target.value)}
                    className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono outline-none"
                  >
                    <option value="ssh">Lightweight SSH (linux-ssh.sh)</option>
                    <option value="desktop">Full XFCE4 Desktop (linux-desktop.sh)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase">Linux User Password</label>
                  <input
                    type="text"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase">Username / Hostname</label>
                  <input
                    type="text"
                    value={customUsername}
                    onChange={(e) => setCustomUsername(e.target.value)}
                    className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase">Ngrok Auth Token (Optional - Leave blank for Bore)</label>
                <input
                  type="password"
                  placeholder="2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  value={ngrokToken}
                  onChange={(e) => setNgrokToken(e.target.value)}
                  className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono outline-none"
                />
              </div>

              <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-4">
                <button
                  onClick={handleLaunchVps}
                  disabled={launching}
                  className="w-full md:w-auto px-6 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  <Play className={`w-4 h-4 ${launching ? 'animate-spin' : ''}`} />
                  {launching ? 'Deploying VPS Engine...' : 'Deploy & Launch VPS Node'}
                </button>

                {launchMessage && (
                  <span className="text-xs font-mono text-zinc-300">{launchMessage}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
