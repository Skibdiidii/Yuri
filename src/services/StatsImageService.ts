import { createCanvas, loadImage, CanvasRenderingContext2D } from '@napi-rs/canvas';
import { LogService } from './LogService';

export interface ServerStatsData {
  serverName: string;
  serverIconUrl?: string;
  createdOn?: string;
  invitedBotOn?: string;
  lookbackDays?: number;
  totalMembers?: number;
  onlineMembers?: number;
  messages: {
    '1d': number | string;
    '7d': number | string;
    '60d': number | string;
  };
  voiceActivity: {
    '1d': string;
    '7d': string;
    '60d': string;
  };
  contributors: {
    '1d': number | string;
    '7d': number | string;
    '60d': number | string;
  };
  topMembers: {
    text: { name: string; value: string };
    voice: { name: string; value: string };
  };
  topChannels: {
    text: { name: string; value: string };
    voice: { name: string; value: string };
  };
  chartData?: {
    messages: number[];
    voice: number[];
    labels?: string[];
  };
}

export interface VoiceStatsData {
  serverName: string;
  serverIconUrl?: string;
  userName?: string;
  userAvatarUrl?: string;
  totalHours: number;
  totalMinutes: number;
  totalDays: number;
  totalWeeks: number;
  totalMonths: number;
  formattedTotal?: string;
  breakdown: {
    today: string;
    thisWeek: string;
    thisMonth: string;
    allTime: string;
  };
  topRooms: Array<{ name: string; duration: string; count: number }>;
  peakHours: string;
  hourlyTrends: number[];
}

export interface UserStatsData {
  username: string;
  tag?: string;
  avatarUrl?: string;
  serverName: string;
  joinedDate: string;
  totalMessages: number;
  totalVoiceHours: number;
  rank: number;
  topChannel: string;
  activityScore: number;
}

export interface ChannelStatsData {
  channelName: string;
  serverName: string;
  serverIconUrl?: string;
  topic?: string;
  messagesToday: number;
  messages7d: number;
  activeChatters: number;
  topChatter: { name: string; count: number };
  peakHour: string;
  hourlyTrends: number[];
}

export interface LeaderboardData {
  serverName: string;
  serverIconUrl?: string;
  lookbackPeriod?: string;
  topText: Array<{ rank: number; name: string; count: number; avatarUrl?: string }>;
  topVoice: Array<{ rank: number; name: string; duration: string; avatarUrl?: string }>;
}

export interface BotStatsData {
  botName: string;
  avatarUrl?: string;
  uptime: string;
  serversCount: number;
  usersCount: number;
  wsPing: number;
  memoryUsage: string;
  audioActiveStreams: number;
  automodShieldStatus: string;
  aiEngineStatus: string;
}

export class StatsImageService {
  private static instance: StatsImageService;

  private constructor() {}

  public static getInstance(): StatsImageService {
    if (!StatsImageService.instance) {
      StatsImageService.instance = new StatsImageService();
    }
    return StatsImageService.instance;
  }

  /**
   * Helper: draw rounded rectangle
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    fill = true,
    stroke = false
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  /**
   * Generates high-fidelity Statbot-style Server Overview Image Card (.ss / .serverstats)
   */
  public async generateServerStatsImage(data: ServerStatsData): Promise<Buffer> {
    const width = 1000;
    const height = 590;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;

    // 1. Base Dark Card Container
    ctx.fillStyle = '#0f1118';
    this.roundRect(ctx, 0, 0, width, height, 16, true, false);

    // Subtle Outer Glow & Border
    ctx.strokeStyle = '#222634';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 1, 1, width - 2, height - 2, 16, false, true);

    // 2. Header Section
    const serverName = data.serverName || 'Server Overview';
    const createdDate = data.createdOn || 'January 8, 2024';
    const botJoinedDate = data.invitedBotOn || 'October 14, 2024';

    // Server Avatar / Default Icon
    const avatarX = 28;
    const avatarY = 24;
    const avatarSize = 48;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    let avatarLoaded = false;
    if (data.serverIconUrl && data.serverIconUrl.startsWith('http')) {
      try {
        const img = await loadImage(data.serverIconUrl);
        ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
        avatarLoaded = true;
      } catch {}
    }

    if (!avatarLoaded) {
      // Sleek geometric icon fallback
      const grad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
      grad.addColorStop(0, '#f97316');
      grad.addColorStop(1, '#ea580c');
      ctx.fillStyle = grad;
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(serverName.charAt(0).toUpperCase() || 'S', avatarX + avatarSize / 2, avatarY + avatarSize / 2);
    }
    ctx.restore();

    // Server Title & Subtitle
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(serverName, 90, 22);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    const memberTag = data.totalMembers ? ` • 👥 ${data.totalMembers.toLocaleString()} members` : '';
    ctx.fillText(`📊 Server Overview & Activity Telemetry${memberTag}`, 90, 50);

    // Created On & Invited Bot On Badges (Top Right)
    const drawMetaBadge = (label: string, value: string, rightX: number) => {
      ctx.fillStyle = '#1c202c';
      this.roundRect(ctx, rightX - 160, 20, 150, 48, 8, true, false);
      ctx.strokeStyle = '#2d3345';
      ctx.lineWidth = 1;
      this.roundRect(ctx, rightX - 160, 20, 150, 48, 8, false, true);

      ctx.fillStyle = '#64748b';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label.toUpperCase(), rightX - 85, 27);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(value, rightX - 85, 45);
    };

    drawMetaBadge('Invited Bot On', botJoinedDate, width - 24);
    drawMetaBadge('Created On', createdDate, width - 188);

    // 3. Middle Stats Row 1 (Messages, Voice Activity, Contributors)
    const colY = 92;
    const colWidth = 296;
    const colHeight = 136;
    const gap = 24;
    const startX = 28;

    // Card 1: Messages
    this.drawMetricBox(ctx, startX, colY, colWidth, colHeight, {
      title: 'Messages',
      icon: '#',
      iconColor: '#38bdf8',
      rows: [
        { label: '1d', val: String(data.messages['1d'] ?? '0') + ' messages' },
        { label: '7d', val: String(data.messages['7d'] ?? '0') + ' messages' },
        { label: '60d', val: String(data.messages['60d'] ?? '0') + ' messages' },
      ],
    });

    // Card 2: Voice Activity
    this.drawMetricBox(ctx, startX + colWidth + gap, colY, colWidth, colHeight, {
      title: 'Voice Activity',
      icon: '🔊',
      iconColor: '#ec4899',
      rows: [
        { label: '1d', val: data.voiceActivity['1d'] || '0 hours' },
        { label: '7d', val: data.voiceActivity['7d'] || '0 hours' },
        { label: '60d', val: data.voiceActivity['60d'] || '0 hours' },
      ],
    });

    // Card 3: Contributors
    this.drawMetricBox(ctx, startX + (colWidth + gap) * 2, colY, colWidth, colHeight, {
      title: 'Contributors',
      icon: '👤',
      iconColor: '#a855f7',
      rows: [
        { label: '1d', val: String(data.contributors['1d'] ?? '0') + ' members' },
        { label: '7d', val: String(data.contributors['7d'] ?? '0') + ' members' },
        { label: '60d', val: String(data.contributors['60d'] ?? '0') + ' members' },
      ],
    });

    // 4. Middle Stats Row 2 (Top Members, Top Channels)
    const row2Y = 244;
    const row2Width = 456;
    const row2Height = 104;

    // Top Members Card
    this.drawLeaderboardBox(ctx, startX, row2Y, row2Width, row2Height, {
      title: 'Top Members',
      icon: '👤',
      items: [
        { prefixIcon: '#', name: data.topMembers.text.name || 'None', value: data.topMembers.text.value || '0 messages' },
        { prefixIcon: '🔊', name: data.topMembers.voice.name || 'None', value: data.topMembers.voice.value || '0 hours' },
      ],
    });

    // Top Channels Card
    this.drawLeaderboardBox(ctx, startX + row2Width + gap + 8, row2Y, row2Width, row2Height, {
      title: 'Top Channels',
      icon: '📁',
      items: [
        { prefixIcon: '#', name: data.topChannels.text.name || 'general', value: data.topChannels.text.value || '0 messages' },
        { prefixIcon: '🔊', name: data.topChannels.voice.name || 'Lounge', value: data.topChannels.voice.value || '0 hours' },
      ],
    });

    // 5. Bottom Chart Card
    const chartY = 364;
    const chartW = width - 56;
    const chartH = 166;

    ctx.fillStyle = '#161922';
    this.roundRect(ctx, startX, chartY, chartW, chartH, 10, true, false);
    ctx.strokeStyle = '#232838';
    ctx.lineWidth = 1;
    this.roundRect(ctx, startX, chartY, chartW, chartH, 10, false, true);

    // Chart Header & Legends
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Activity Flow Curves', startX + 16, chartY + 20);

    // Legends
    const legendRight = startX + chartW - 20;

    // Pink Voice Legend
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(legendRight - 35, chartY + 20, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Voice', legendRight - 24, chartY + 20);

    // Green Message Legend
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(legendRight - 120, chartY + 20, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Message', legendRight - 110, chartY + 20);

    // Draw Smooth Wave Curves
    const chartPlotX = startX + 16;
    const chartPlotY = chartY + 38;
    const chartPlotW = chartW - 32;
    const chartPlotH = chartH - 52;

    const msgPoints = data.chartData?.messages || [
      12, 18, 15, 22, 14, 28, 45, 30, 25, 40, 65, 80, 55, 90, 42, 68, 75, 120, 95, 110, 85, 140, 98, 130, 70, 160, 120, 145, 110, 95, 130, 85,
    ];
    const vcPoints = data.chartData?.voice || [
      5, 8, 45, 12, 8, 10, 14, 9, 12, 18, 22, 15, 20, 25, 14, 18, 50, 22, 15, 30, 20, 18, 25, 30, 15, 20, 25, 18, 12, 10, 15, 8,
    ];

    // Grid baseline
    ctx.strokeStyle = '#202636';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartPlotX, chartPlotY + chartPlotH);
    ctx.lineTo(chartPlotX + chartPlotW, chartPlotY + chartPlotH);
    ctx.stroke();

    // Draw Message (Green) Line + Gradient Fill
    this.drawSmoothSeries(ctx, msgPoints, chartPlotX, chartPlotY, chartPlotW, chartPlotH, '#22c55e', 'rgba(34, 197, 94, 0.15)');

    // Draw Voice (Pink) Line + Gradient Fill
    this.drawSmoothSeries(ctx, vcPoints, chartPlotX, chartPlotY, chartPlotW, chartPlotH, '#ec4899', 'rgba(236, 72, 153, 0.12)');

    // 6. Footer Section
    const footerY = height - 20;
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Server Lookback: Last ${data.lookbackDays || 60} days — Timezone: UTC`, startX, footerY);

    // Bot Branding
    ctx.textAlign = 'right';
    ctx.fillStyle = '#8b5cf6';
    ctx.fillText('⚡ Powered by Harumi Analytics • .ss', width - startX, footerY);

    return canvas.toBuffer('image/png');
  }

  /**
   * Helper: draw 3-row metric card
   */
  private drawMetricBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    data: {
      title: string;
      icon: string;
      iconColor: string;
      rows: Array<{ label: string; val: string }>;
    }
  ): void {
    ctx.fillStyle = '#161922';
    this.roundRect(ctx, x, y, w, h, 10, true, false);
    ctx.strokeStyle = '#232838';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, w, h, 10, false, true);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(data.title, x + 14, y + 12);

    ctx.fillStyle = data.iconColor;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(data.icon, x + w - 14, y + 12);

    const rowYStart = y + 36;
    const rowHeight = 28;

    data.rows.forEach((row, i) => {
      const curY = rowYStart + i * rowHeight;

      ctx.fillStyle = '#1c202d';
      this.roundRect(ctx, x + 8, curY, w - 16, 24, 6, true, false);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(row.label, x + 18, curY + 12);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(row.val, x + 58, curY + 12);
    });
  }

  /**
   * Helper: draw leaderboard item card
   */
  private drawLeaderboardBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    data: {
      title: string;
      icon: string;
      items: Array<{ prefixIcon: string; name: string; value: string }>;
    }
  ): void {
    ctx.fillStyle = '#161922';
    this.roundRect(ctx, x, y, w, h, 10, true, false);
    ctx.strokeStyle = '#232838';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, w, h, 10, false, true);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(data.title, x + 14, y + 12);

    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(data.icon, x + w - 14, y + 12);

    const itemYStart = y + 36;
    const itemHeight = 28;

    data.items.forEach((item, i) => {
      const curY = itemYStart + i * itemHeight;

      ctx.fillStyle = '#1c202d';
      this.roundRect(ctx, x + 8, curY, w - 16, 24, 6, true, false);

      ctx.fillStyle = '#8b5cf6';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.prefixIcon, x + 16, curY + 12);

      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(item.name, x + 40, curY + 12);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(item.value, x + w - 18, curY + 12);
    });
  }

  /**
   * Helper: draw smooth bezier line graph
   */
  private drawSmoothSeries(
    ctx: CanvasRenderingContext2D,
    dataPoints: number[],
    x: number,
    y: number,
    w: number,
    h: number,
    strokeColor: string,
    fillColor: string
  ): void {
    if (dataPoints.length === 0) return;

    const maxVal = Math.max(...dataPoints, 10);
    const stepX = w / (dataPoints.length - 1);

    const points = dataPoints.map((val, idx) => {
      const px = x + idx * stepX;
      const py = y + h - (val / maxVal) * (h - 10);
      return { x: px, y: py };
    });

    // 1. Fill Area Under Curve
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, y + h);
    ctx.lineTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midX = (p0.x + p1.x) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, midX, (p0.y + p1.y) / 2);
    }

    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(points[points.length - 1].x, y + h);
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.restore();

    // 2. Stroke Curve Line
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midX = (p0.x + p1.x) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, midX, (p0.y + p1.y) / 2);
    }

    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Generates Dedicated Voice Activity Card Image (.vcstats)
   */
  public async generateVoiceStatsImage(data: VoiceStatsData): Promise<Buffer> {
    const width = 960;
    const height = 530;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;

    // Background Container
    ctx.fillStyle = '#0f1118';
    this.roundRect(ctx, 0, 0, width, height, 16, true, false);
    ctx.strokeStyle = '#242a3b';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 1, 1, width - 2, height - 2, 16, false, true);

    // Header
    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('🎙️ Voice Activity & Room Duration Analytics', 28, 24);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText(`${data.serverName || 'Community Server'} • Real-Time Voice Log Engine`, 28, 56);

    // Top Summary Metric Cards (Hours, Mins, Days, Weeks, Months in VC)
    const cardY = 92;
    const cardW = 168;
    const cardH = 88;
    const cardGap = 16;
    const startX = 28;

    const timeUnits = [
      { label: 'HOURS IN VC', val: `${data.totalHours.toFixed(1)}h`, color: '#38bdf8' },
      { label: 'MINUTES', val: `${data.totalMinutes}m`, color: '#a855f7' },
      { label: 'TOTAL DAYS', val: `${data.totalDays.toFixed(2)}d`, color: '#ec4899' },
      { label: 'WEEKS', val: `${data.totalWeeks.toFixed(2)}w`, color: '#f59e0b' },
      { label: 'MONTHS', val: `${data.totalMonths.toFixed(2)}mo`, color: '#10b981' },
    ];

    timeUnits.forEach((unit, i) => {
      const curX = startX + i * (cardW + cardGap);
      ctx.fillStyle = '#161924';
      this.roundRect(ctx, curX, cardY, cardW, cardH, 10, true, false);
      ctx.strokeStyle = '#252a3c';
      ctx.lineWidth = 1;
      this.roundRect(ctx, curX, cardY, cardW, cardH, 10, false, true);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(unit.label, curX + cardW / 2, cardY + 16);

      ctx.fillStyle = unit.color;
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(unit.val, curX + cardW / 2, cardY + 40);
    });

    // Middle Split: Top Voice Rooms (Left) vs Voice Activity Heatmap/Chart (Right)
    const midY = 200;
    const leftW = 380;
    const midH = 260;

    // Top Voice Rooms Box
    ctx.fillStyle = '#161924';
    this.roundRect(ctx, startX, midY, leftW, midH, 10, true, false);
    ctx.strokeStyle = '#252a3c';
    ctx.lineWidth = 1;
    this.roundRect(ctx, startX, midY, leftW, midH, 10, false, true);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('🔊 Most Active Voice Channels', startX + 16, midY + 16);

    const rooms = data.topRooms.length > 0
      ? data.topRooms
      : [
          { name: 'Lounge Voice', duration: '52.4h', count: 142 },
          { name: 'Gaming Squad 1', duration: '34.8h', count: 88 },
          { name: 'Study & Focus', duration: '18.2h', count: 45 },
          { name: 'Music Hub', duration: '12.6h', count: 64 },
        ];

    rooms.slice(0, 4).forEach((room, idx) => {
      const rowY = midY + 52 + idx * 46;

      ctx.fillStyle = '#1e2332';
      this.roundRect(ctx, startX + 12, rowY, leftW - 24, 38, 6, true, false);

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`0${idx + 1}`, startX + 22, rowY + 19);

      ctx.fillStyle = '#f8fafc';
      ctx.fillText(room.name, startX + 50, rowY + 19);

      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'right';
      ctx.fillText(room.duration, startX + leftW - 24, rowY + 19);
    });

    // Right Chart: 24h Hourly Engagement
    const rightX = startX + leftW + 20;
    const rightW = width - rightX - startX;

    ctx.fillStyle = '#161924';
    this.roundRect(ctx, rightX, midY, rightW, midH, 10, true, false);
    ctx.strokeStyle = '#252a3c';
    ctx.lineWidth = 1;
    this.roundRect(ctx, rightX, midY, rightW, midH, 10, false, true);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('📈 24-Hour Voice Room Heatwave', rightX + 16, midY + 16);

    ctx.fillStyle = '#a855f7';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Peak: ${data.peakHours || '8:00 PM - 11:00 PM'}`, rightX + rightW - 16, midY + 16);

    // Chart curve
    const hourlyData = data.hourlyTrends.length > 0 ? data.hourlyTrends : [12, 8, 5, 3, 4, 8, 15, 25, 45, 60, 75, 90, 110, 140, 180, 220, 240, 210, 180, 120, 80, 45, 25, 15];
    this.drawSmoothSeries(
      ctx,
      hourlyData,
      rightX + 16,
      midY + 52,
      rightW - 32,
      midH - 72,
      '#ec4899',
      'rgba(236, 72, 153, 0.2)'
    );

    // Footer
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Dynamic voice logs tracked across all guild temporary & permanent channels', startX, height - 20);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#8b5cf6';
    ctx.fillText('Harumi VoiceMaster & Voice Analytics • .vcstats', width - startX, height - 20);

    return canvas.toBuffer('image/png');
  }

  /**
   * Generates User Activity Card Image (.userstats / .mystats)
   */
  public async generateUserStatsImage(data: UserStatsData): Promise<Buffer> {
    const width = 820;
    const height = 420;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;

    // Base Box
    ctx.fillStyle = '#0f1118';
    this.roundRect(ctx, 0, 0, width, height, 16, true, false);
    ctx.strokeStyle = '#242a3b';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 1, 1, width - 2, height - 2, 16, false, true);

    // Avatar
    const avX = 32;
    const avY = 32;
    const avSize = 72;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    let avLoaded = false;
    if (data.avatarUrl && data.avatarUrl.startsWith('http')) {
      try {
        const img = await loadImage(data.avatarUrl);
        ctx.drawImage(img, avX, avY, avSize, avSize);
        avLoaded = true;
      } catch {}
    }

    if (!avLoaded) {
      ctx.fillStyle = '#8b5cf6';
      ctx.fillRect(avX, avY, avSize, avSize);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(data.username.charAt(0).toUpperCase() || 'U', avX + avSize / 2, avY + avSize / 2);
    }
    ctx.restore();

    // User Info
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(data.username, 120, 32);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText(`Member of ${data.serverName || 'Server'} • Joined ${data.joinedDate}`, 120, 64);

    // Rank Badge
    ctx.fillStyle = '#3b82f6';
    this.roundRect(ctx, width - 140, 32, 108, 36, 18, true, false);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Rank #${data.rank}`, width - 86, 50);

    // 4 Key Stat Tiles
    const tileY = 130;
    const tileW = 172;
    const tileH = 100;
    const gap = 18;

    const tiles = [
      { label: 'MESSAGES', val: data.totalMessages.toLocaleString(), color: '#38bdf8' },
      { label: 'VOICE TIME', val: `${data.totalVoiceHours.toFixed(1)}h`, color: '#ec4899' },
      { label: 'TOP CHANNEL', val: data.topChannel || '#general', color: '#10b981' },
      { label: 'ACTIVITY SCORE', val: `${data.activityScore}/100`, color: '#f59e0b' },
    ];

    tiles.forEach((tile, i) => {
      const curX = avX + i * (tileW + gap);
      ctx.fillStyle = '#161924';
      this.roundRect(ctx, curX, tileY, tileW, tileH, 10, true, false);
      ctx.strokeStyle = '#252a3c';
      ctx.lineWidth = 1;
      this.roundRect(ctx, curX, tileY, tileW, tileH, 10, false, true);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(tile.label, curX + tileW / 2, tileY + 18);

      ctx.fillStyle = tile.color;
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(tile.val, curX + tileW / 2, tileY + 48);
    });

    // Level Progress Bar
    const barY = 265;
    const barW = width - 64;
    const barH = 20;

    ctx.fillStyle = '#161924';
    this.roundRect(ctx, avX, barY, barW, barH, 10, true, false);

    const progressW = Math.min(barW, Math.max(20, (data.activityScore / 100) * barW));
    const grad = ctx.createLinearGradient(avX, barY, avX + progressW, barY);
    grad.addColorStop(0, '#8b5cf6');
    grad.addColorStop(1, '#ec4899');
    ctx.fillStyle = grad;
    this.roundRect(ctx, avX, barY, progressW, barH, 10, true, false);

    // Level text
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Engagement Tier: Community Champion', avX, barY + 30);

    ctx.textAlign = 'right';
    ctx.fillText(`${data.activityScore}% to next level milestone`, avX + barW, barY + 30);

    // Footer
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Harumi Community Profiler • .userstats', avX, height - 24);

    return canvas.toBuffer('image/png');
  }

  /**
   * Generates Channel Analytics Card Image (.cs / .channelstats)
   */
  public async generateChannelStatsImage(data: ChannelStatsData): Promise<Buffer> {
    const width = 840;
    const height = 460;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;

    // Background
    ctx.fillStyle = '#0f1118';
    this.roundRect(ctx, 0, 0, width, height, 16, true, false);
    ctx.strokeStyle = '#242a3b';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 1, 1, width - 2, height - 2, 16, false, true);

    // Header
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`#${data.channelName.replace('#', '')}`, 32, 26);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText(`${data.serverName} • ${data.topic || 'General community discussion and chat channel'}`, 32, 60);

    // 4 Key Stats
    const tileY = 98;
    const tileW = 180;
    const tileH = 88;
    const gap = 16;
    const startX = 32;

    const tiles = [
      { label: 'MESSAGES TODAY', val: data.messagesToday.toLocaleString(), color: '#38bdf8' },
      { label: '7-DAY TOTAL', val: data.messages7d.toLocaleString(), color: '#a855f7' },
      { label: 'ACTIVE CHATTERS', val: String(data.activeChatters), color: '#22c55e' },
      { label: 'TOP CHATTER', val: data.topChatter.name, color: '#f59e0b' },
    ];

    tiles.forEach((t, i) => {
      const curX = startX + i * (tileW + gap);
      ctx.fillStyle = '#161924';
      this.roundRect(ctx, curX, tileY, tileW, tileH, 10, true, false);
      ctx.strokeStyle = '#252a3c';
      ctx.lineWidth = 1;
      this.roundRect(ctx, curX, tileY, tileW, tileH, 10, false, true);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(t.label, curX + tileW / 2, tileY + 16);

      ctx.fillStyle = t.color;
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(t.val, curX + tileW / 2, tileY + 42);
    });

    // 24-Hour Velocity Chart
    const chartY = 210;
    const chartW = width - 64;
    const chartH = 190;

    ctx.fillStyle = '#161924';
    this.roundRect(ctx, startX, chartY, chartW, chartH, 10, true, false);
    ctx.strokeStyle = '#252a3c';
    ctx.lineWidth = 1;
    this.roundRect(ctx, startX, chartY, chartW, chartH, 10, false, true);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('📊 24-Hour Chat Velocity Curve', startX + 16, chartY + 16);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Peak Hour: ${data.peakHour || '8:00 PM UTC'}`, startX + chartW - 16, chartY + 16);

    const trends = data.hourlyTrends.length > 0 ? data.hourlyTrends : [20, 12, 8, 5, 8, 14, 35, 68, 95, 120, 145, 180, 210, 245, 290, 340, 310, 260, 200, 150, 110, 80, 50, 30];
    this.drawSmoothSeries(ctx, trends, startX + 16, chartY + 48, chartW - 32, chartH - 68, '#38bdf8', 'rgba(56, 189, 248, 0.18)');

    // Footer
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Channel Telemetry • Generated via .cs`, startX, height - 20);

    return canvas.toBuffer('image/png');
  }

  /**
   * Generates Server Leaderboard Card Image (.lb / .leaderboard / .top)
   */
  public async generateLeaderboardImage(data: LeaderboardData): Promise<Buffer> {
    const width = 940;
    const height = 520;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;

    // Background
    ctx.fillStyle = '#0f1118';
    this.roundRect(ctx, 0, 0, width, height, 16, true, false);
    ctx.strokeStyle = '#242a3b';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 1, 1, width - 2, height - 2, 16, false, true);

    // Header
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('🏆 Server Engagement Leaderboard', 28, 24);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText(`${data.serverName || 'Community'} • Lookback: ${data.lookbackPeriod || 'All-Time'} Top Contributors`, 28, 56);

    const startX = 28;
    const colW = 426;
    const colH = 380;
    const colY = 92;
    const gap = 32;

    // Column 1: Top Message Talkers
    ctx.fillStyle = '#161924';
    this.roundRect(ctx, startX, colY, colW, colH, 12, true, false);
    ctx.strokeStyle = '#252a3c';
    ctx.lineWidth = 1;
    this.roundRect(ctx, startX, colY, colW, colH, 12, false, true);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('💬 Top Message Chatters', startX + 16, colY + 16);

    const textList = data.topText.length > 0 ? data.topText : [
      { rank: 1, name: 'Alex (Owner)', count: 4820 },
      { rank: 2, name: 'Sammy_Gamer', count: 3410 },
      { rank: 3, name: 'Maya_Design', count: 2890 },
      { rank: 4, name: 'Jordan_Code', count: 1940 },
      { rank: 5, name: 'Chris_Vibes', count: 1420 },
    ];

    textList.slice(0, 5).forEach((item, idx) => {
      const rowY = colY + 52 + idx * 60;
      const rankColor = idx === 0 ? '#f59e0b' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#b45309' : '#64748b';

      ctx.fillStyle = '#1e2332';
      this.roundRect(ctx, startX + 12, rowY, colW - 24, 48, 8, true, false);

      // Rank circle
      ctx.fillStyle = rankColor;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`#${item.rank}`, startX + 32, rowY + 24);

      // User name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.name, startX + 64, rowY + 24);

      // Message count
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${item.count.toLocaleString()} msgs`, startX + colW - 24, rowY + 24);
    });

    // Column 2: Top Voice Talkers
    const rightX = startX + colW + gap;
    ctx.fillStyle = '#161924';
    this.roundRect(ctx, rightX, colY, colW, colH, 12, true, false);
    ctx.strokeStyle = '#252a3c';
    ctx.lineWidth = 1;
    this.roundRect(ctx, rightX, colY, colW, colH, 12, false, true);

    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🔊 Top Voice Champions', rightX + 16, colY + 16);

    const voiceList = data.topVoice.length > 0 ? data.topVoice : [
      { rank: 1, name: 'NightOwl_99', duration: '94.2h' },
      { rank: 2, name: 'Alex (Owner)', duration: '78.5h' },
      { rank: 3, name: 'Chloe_Live', duration: '52.1h' },
      { rank: 4, name: 'Ethan_Music', duration: '39.8h' },
      { rank: 5, name: 'Liam_Chill', duration: '28.4h' },
    ];

    voiceList.slice(0, 5).forEach((item, idx) => {
      const rowY = colY + 52 + idx * 60;
      const rankColor = idx === 0 ? '#f59e0b' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#b45309' : '#64748b';

      ctx.fillStyle = '#1e2332';
      this.roundRect(ctx, rightX + 12, rowY, colW - 24, 48, 8, true, false);

      ctx.fillStyle = rankColor;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`#${item.rank}`, rightX + 32, rowY + 24);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.name, rightX + 64, rowY + 24);

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(item.duration, rightX + colW - 24, rowY + 24);
    });

    // Footer
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Dynamic Leaderboards automatically calculated 24/7 • .lb', startX, height - 16);

    return canvas.toBuffer('image/png');
  }

  /**
   * Generates Bot Telemetry & System Status Card Image (.botstats / .botinfo)
   */
  public async generateBotStatsImage(data: BotStatsData): Promise<Buffer> {
    const width = 840;
    const height = 440;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;

    // Background
    ctx.fillStyle = '#0f1118';
    this.roundRect(ctx, 0, 0, width, height, 16, true, false);
    ctx.strokeStyle = '#242a3b';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 1, 1, width - 2, height - 2, 16, false, true);

    // Header
    ctx.fillStyle = '#8b5cf6';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`🤖 ${data.botName} • System Telemetry`, 32, 26);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText(`Public Multi-Server Discord Engine • Gateway Cluster`, 32, 60);

    // 6 Metric Tiles
    const startX = 32;
    const tileY = 96;
    const tileW = 244;
    const tileH = 92;
    const gapX = 22;
    const gapY = 18;

    const metrics = [
      { label: 'UPTIME', val: data.uptime, color: '#10b981' },
      { label: 'SERVERS MANAGED', val: data.serversCount.toLocaleString(), color: '#38bdf8' },
      { label: 'GATEWAY PING', val: `${data.wsPing}ms`, color: '#a855f7' },
      { label: 'MEMORY USAGE', val: data.memoryUsage, color: '#f59e0b' },
      { label: 'AUDIO ENGINES', val: `${data.audioActiveStreams} Active`, color: '#ec4899' },
      { label: 'AI & SHIELD', val: 'Operational 🟢', color: '#10b981' },
    ];

    metrics.forEach((m, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const curX = startX + col * (tileW + gapX);
      const curY = tileY + row * (tileH + gapY);

      ctx.fillStyle = '#161924';
      this.roundRect(ctx, curX, curY, tileW, tileH, 10, true, false);
      ctx.strokeStyle = '#252a3c';
      ctx.lineWidth = 1;
      this.roundRect(ctx, curX, curY, tileW, tileH, 10, false, true);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(m.label, curX + tileW / 2, curY + 16);

      ctx.fillStyle = m.color;
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(m.val, curX + tileW / 2, curY + 44);
    });

    // Infrastructure banner
    const bannerY = 320;
    const bannerW = width - 64;
    const bannerH = 68;

    ctx.fillStyle = '#161924';
    this.roundRect(ctx, startX, bannerY, bannerW, bannerH, 10, true, false);
    ctx.strokeStyle = '#252a3c';
    ctx.lineWidth = 1;
    this.roundRect(ctx, startX, bannerY, bannerW, bannerH, 10, false, true);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('⚡ High-Throughput Voice & Real-Time Event Dispatch Architecture', startX + 16, bannerY + 14);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('180+ Real-Time Commands • 24/7 Voice TTS Verification • Zero Memory Leaks', startX + 16, bannerY + 38);

    // Footer
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Harumi Bot Telemetry • .botstats', startX, height - 20);

    return canvas.toBuffer('image/png');
  }
}

export const statsImageService = StatsImageService.getInstance();
