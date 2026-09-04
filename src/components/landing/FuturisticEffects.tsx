import React, { useEffect, useRef, useState } from 'react';

// Web Audio API Synthesizer for high-tech futuristic sci-fi sound effects
class CyberAudioSynth {
  private ctx: AudioContext | null = null;
  public enabled: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playClick(freq = 880, dur = 0.04) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, ctx.currentTime + dur);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {}
  }

  public playBlip() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.setValueAtTime(1800, ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  public playScan() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(960, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  }
}

export const cyberSound = new CyberAudioSynth();

// Interactive Cyber Particle Network Canvas (60+ Nodes, Laser Links, Cursor Force Field)
export function CyberParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      pulse: number;
    }> = [];

    const PARTICLE_COUNT = 55;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        size: Math.random() * 2.2 + 0.8,
        alpha: Math.random() * 0.7 + 0.3,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    let mouseX = -9999;
    let mouseY = -9999;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    const handleMouseLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle grid crosshairs
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.025)';
      ctx.lineWidth = 1;
      const step = 60;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update & Draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.pulse += 0.03;
        p.x += p.vx;
        p.y += p.vy;

        // Bounce edges
        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        if (p.x > width) { p.x = width; p.vx *= -1; }
        if (p.y < 0) { p.y = 0; p.vy *= -1; }
        if (p.y > height) { p.y = height; p.vy *= -1; }

        // Mouse repulsion force field
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140) {
          const force = (140 - dist) / 140;
          p.x -= (dx / dist) * force * 3;
          p.y -= (dy / dist) * force * 3;
        }

        const dynamicAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));

        // Draw particle dot with red neon glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239, 68, 68, ${dynamicAlpha})`;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw laser connections between nearby nodes
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const distBetween = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (distBetween < 110) {
            const lineAlpha = (1 - distBetween / 110) * 0.28 * dynamicAlpha;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(239, 68, 68, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 opacity-70"
    />
  );
}

// Circular Sweeping Radar Scope with rotating beam and target blips
export function CyberRadarScope() {
  const [angle, setAngle] = useState(0);
  const [blips, setBlips] = useState([
    { id: 1, x: 68, y: 35, alpha: 0.9, code: 'NODE_ALPHA' },
    { id: 2, x: 28, y: 72, alpha: 0.7, code: 'PROXY_GW' },
    { id: 3, x: 80, y: 64, alpha: 0.85, code: 'CLIENT_SIG' },
    { id: 4, x: 42, y: 22, alpha: 0.6, code: 'PORT_DISCORD' },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setAngle((prev) => (prev + 3) % 360);
    }, 25);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-44 h-44 rounded-full border border-red-500/30 bg-black/60 shadow-[0_0_25px_rgba(239,68,68,0.15)] flex items-center justify-center overflow-hidden font-mono select-none">
      {/* Scope concentric rings */}
      <div className="absolute inset-2 rounded-full border border-red-500/15 border-dashed" />
      <div className="absolute inset-8 rounded-full border border-red-500/20" />
      <div className="absolute inset-16 rounded-full border border-red-500/25 border-dotted" />

      {/* Axis crosshairs */}
      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-red-500/20" />
      <div className="absolute inset-y-0 left-1/2 w-[1px] bg-red-500/20" />

      {/* Rotating Sweep Beam */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          transform: `rotate(${angle}deg)`,
          background: 'conic-gradient(from 0deg, rgba(239,68,68,0.4) 0deg, rgba(239,68,68,0.08) 45deg, transparent 65deg, transparent 360deg)',
        }}
      />

      {/* Radar Center Beacon */}
      <div className="relative z-10 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-ping" />
      <div className="relative z-10 w-1.5 h-1.5 rounded-full bg-white" />

      {/* Blips */}
      {blips.map((blip) => (
        <div
          key={blip.id}
          className="absolute z-10 flex items-center gap-1"
          style={{ left: `${blip.x}%`, top: `${blip.y}%` }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
          <span className="text-[8px] text-emerald-400 font-mono tracking-tighter opacity-70">
            {blip.code}
          </span>
        </div>
      ))}

      {/* Coordinate & Status Ticker */}
      <div className="absolute bottom-1 right-2 text-[8px] text-red-400/60">
        AZ: {angle.toString().padStart(3, '0')}°
      </div>
      <div className="absolute top-1 left-2 text-[8px] text-red-400/60">
        SCAN: LIVE
      </div>
    </div>
  );
}

// 28-Band Cyber Equalizer Waveform
export function CyberEqualizerWaveform() {
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: 28 }, () => Math.floor(Math.random() * 85) + 15)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setBars((prev) =>
        prev.map((h, i) => {
          const delta = (Math.random() - 0.5) * 35;
          const target = Math.max(12, Math.min(100, h + delta));
          return Math.round(target);
        })
      );
    }, 90);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-end gap-[3px] h-10 px-2 py-1 bg-black/40 border border-white/5 rounded-lg">
      {bars.map((height, i) => {
        const isPeak = height > 75;
        return (
          <div
            key={i}
            className={`w-[3px] rounded-t-sm transition-all duration-100 ${
              isPeak ? 'bg-red-400 shadow-[0_0_6px_#f87171]' : 'bg-red-600/70'
            }`}
            style={{ height: `${height}%` }}
          />
        );
      })}
    </div>
  );
}

// Real-time Hex Packet Flow Rain Stream
export function CyberDataStreamTicker() {
  const [hexTokens, setHexTokens] = useState<string[]>([
    '0x4A2F', 'TLS_v1.3', 'GATEWAY:OK', 'ACK_772', 'SEC_P256', 'PING:18ms', 'NODE_US', 'TOKEN_HASH'
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const pool = ['0x8B31', '0x1C99', 'DISCORD_WS', 'PAYLOAD:248B', 'ENCRYPT:AES', 'SIG_SHA256', 'OPCODE:0', 'HEARTBEAT:OK'];
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setHexTokens((prev) => [pick, ...prev.slice(0, 7)]);
    }, 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 overflow-hidden text-[10px] font-mono text-zinc-500 whitespace-nowrap">
      <span className="text-red-400 font-bold flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        NET_FLOW:
      </span>
      {hexTokens.map((tok, i) => (
        <span
          key={i}
          className={`transition-all duration-300 ${
            i === 0 ? 'text-red-300 font-bold bg-red-950/60 px-1 rounded' : 'text-zinc-500'
          }`}
        >
          {tok}
        </span>
      ))}
    </div>
  );
}

// Rotating Cybernetic Gyro Reticle with angle ticks
export function CyberGyroReticle() {
  return (
    <div className="relative w-16 h-16 pointer-events-none select-none flex items-center justify-center">
      {/* Outer slow-spinning ring */}
      <div className="absolute inset-0 rounded-full border border-red-500/25 border-dashed animate-[spin_12s_linear_infinite]" />
      {/* Inner counter-spinning ring */}
      <div className="absolute inset-2 rounded-full border border-red-500/40 animate-[spin_7s_linear_infinite_reverse]" />
      {/* Core crosshair */}
      <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
      <div className="absolute inset-x-2 top-1/2 h-[1px] bg-red-500/40" />
      <div className="absolute inset-y-2 left-1/2 w-[1px] bg-red-500/40" />
    </div>
  );
}

// CRT Scanlines & Phosphor Lens Overlay
export function CRTScanlineOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden opacity-30 mix-blend-overlay">
      <div
        className="w-full h-full"
        style={{
          backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%)',
          backgroundSize: '100% 4px',
        }}
      />
    </div>
  );
}
