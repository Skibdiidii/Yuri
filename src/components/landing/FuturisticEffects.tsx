import React, { useEffect, useRef, useState } from 'react';

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

export function CyberParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
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
    }> = [];

    const PARTICLE_COUNT = 24;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 1.8 + 0.8,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        if (p.x > width) { p.x = width; p.vx *= -1; }
        if (p.y < 0) { p.y = 0; p.vy *= -1; }
        if (p.y > height) { p.y = height; p.vy *= -1; }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239, 68, 68, ${p.alpha})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distBetween = Math.sqrt(dx * dx + dy * dy);
          if (distBetween < 90) {
            const lineAlpha = (1 - distBetween / 90) * 0.15;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(239, 68, 68, ${lineAlpha})`;
            ctx.lineWidth = 0.6;
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
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 opacity-50 will-change-transform"
    />
  );
}

export function CyberRadarScope() {
  const [angle, setAngle] = useState(0);
  const [blips] = useState([
    { id: 1, x: 68, y: 35, code: 'NODE_ALPHA' },
    { id: 2, x: 28, y: 72, code: 'PROXY_GW' },
    { id: 3, x: 80, y: 64, code: 'CLIENT_SIG' },
    { id: 4, x: 42, y: 22, code: 'PORT_DISCORD' },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setAngle((prev) => (prev + 3) % 360);
    }, 35);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-44 h-44 rounded-full border border-red-500/30 bg-black/20 backdrop-blur-md shadow-[0_0_25px_rgba(239,68,68,0.15)] flex items-center justify-center overflow-hidden font-mono select-none">
      <div className="absolute inset-2 rounded-full border border-red-500/15 border-dashed" />
      <div className="absolute inset-8 rounded-full border border-red-500/20" />
      <div className="absolute inset-16 rounded-full border border-red-500/25 border-dotted" />

      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-red-500/20" />
      <div className="absolute inset-y-0 left-1/2 w-[1px] bg-red-500/20" />

      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          transform: `rotate(${angle}deg)`,
          background: 'conic-gradient(from 0deg, rgba(239,68,68,0.35) 0deg, rgba(239,68,68,0.05) 45deg, transparent 65deg, transparent 360deg)',
        }}
      />

      <div className="relative z-10 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-ping" />
      <div className="relative z-10 w-1.5 h-1.5 rounded-full bg-white" />

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

      <div className="absolute bottom-1 right-2 text-[8px] text-red-400/60">
        AZ: {angle.toString().padStart(3, '0')}°
      </div>
      <div className="absolute top-1 left-2 text-[8px] text-red-400/60">
        SCAN: LIVE
      </div>
    </div>
  );
}

export function CyberEqualizerWaveform() {
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: 24 }, () => Math.floor(Math.random() * 75) + 20)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setBars((prev) =>
        prev.map((h) => {
          const delta = (Math.random() - 0.5) * 30;
          return Math.round(Math.max(15, Math.min(95, h + delta)));
        })
      );
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-end gap-[3px] h-9 px-2 py-1 bg-black/20 border border-white/10 rounded-lg backdrop-blur-md">
      {bars.map((height, i) => {
        const isPeak = height > 70;
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

export function CyberDataStreamTicker() {
  const [hexTokens, setHexTokens] = useState<string[]>([
    '0x4A2F', 'TLS_v1.3', 'GATEWAY:OK', 'ACK_772', 'SEC_P256', 'PING:18ms', 'NODE_US', 'TOKEN_HASH'
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const pool = ['0x8B31', '0x1C99', 'DISCORD_WS', 'PAYLOAD:248B', 'ENCRYPT:AES', 'SIG_SHA256', 'OPCODE:0', 'HEARTBEAT:OK'];
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setHexTokens((prev) => [pick, ...prev.slice(0, 7)]);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 overflow-hidden text-[10px] font-mono text-zinc-400 whitespace-nowrap">
      <span className="text-red-400 font-bold flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        NET_FLOW:
      </span>
      {hexTokens.map((tok, i) => (
        <span
          key={i}
          className={`transition-all duration-300 ${
            i === 0 ? 'text-red-300 font-bold bg-red-500/10 border border-red-500/20 px-1 rounded' : 'text-zinc-400'
          }`}
        >
          {tok}
        </span>
      ))}
    </div>
  );
}

export function CyberGyroReticle() {
  return (
    <div className="relative w-16 h-16 pointer-events-none select-none flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-red-500/25 border-dashed animate-[spin_12s_linear_infinite]" />
      <div className="absolute inset-2 rounded-full border border-red-500/40 animate-[spin_7s_linear_infinite_reverse]" />
      <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
      <div className="absolute inset-x-2 top-1/2 h-[1px] bg-red-500/40" />
      <div className="absolute inset-y-2 left-1/2 w-[1px] bg-red-500/40" />
    </div>
  );
}

export function CRTScanlineOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden opacity-20 mix-blend-overlay">
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
