import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Clock, Users, Server, MessageSquare, Terminal, TrendingUp, RefreshCw } from "lucide-react";

interface MetricHistoryPoint {
  time: string;
  messageRate: number;
  commandRate: number;
}

interface MetricsData {
  activeUsers: number;
  uptime: number;
  hostedPeople: number;
  history: MetricHistoryPoint[];
}

export default function MetricsDashboard() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [uptime, setUptime] = useState<number>(0);
  const [showMessages, setShowMessages] = useState(true);
  const [showCommands, setShowCommands] = useState(true);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchMetrics() {
      try {
        const res = await fetch("/api/metrics/realtime");
        if (res.ok) {
          const fetched: MetricsData = await res.json();
          if (active) {
            setData(fetched);
            setUptime(Math.floor(fetched.uptime));
          }
        }
      } catch (e) {
      }
    }

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setUptime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!data || !svgRef.current || data.history.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 400;
    const margin = { top: 35, right: 30, bottom: 40, left: 50 };

    svg.attr("viewBox", `0 0 ${width} ${height}`)
       .attr("width", "100%")
       .attr("height", "100%");

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const points = data.history;

    const xScale = d3.scalePoint()
                     .domain(points.map(d => d.time))
                     .range([0, chartWidth]);

    const maxVal = d3.max(points, (d: MetricHistoryPoint) => Math.max(d.messageRate, d.commandRate * 1.5)) || 10;
    const yScale = d3.scaleLinear()
                     .domain([0, maxVal * 1.15])
                     .range([chartHeight, 0]);

    const xTicks = points.filter((_, i) => i % Math.ceil(points.length / 6) === 0);

    g.append("g")
     .attr("transform", `translate(0, ${chartHeight})`)
     .call(d3.axisBottom(xScale).tickValues(xTicks.map(d => d.time)))
     .attr("color", "rgba(255, 255, 255, 0.1)")
     .selectAll("text")
     .attr("color", "rgba(161, 161, 170, 0.8)")
     .attr("font-size", "11px");

    g.append("g")
     .call(d3.axisLeft(yScale).ticks(5))
     .attr("color", "rgba(255, 255, 255, 0.1)")
     .selectAll("text")
     .attr("color", "rgba(161, 161, 170, 0.8)")
     .attr("font-size", "11px");

    g.append("g")
     .attr("class", "grid")
     .call(d3.axisLeft(yScale).ticks(5).tickSize(-chartWidth).tickFormat(() => ""))
     .attr("color", "rgba(255, 255, 255, 0.05)");

    if (showMessages) {
      const messageLine = d3.line<MetricHistoryPoint>()
                            .x(d => xScale(d.time) || 0)
                            .y(d => yScale(d.messageRate))
                            .curve(d3.curveMonotoneX);

      const combinedData = points.map(d => ({ ...d }));

      const areaPath = d3.area<MetricHistoryPoint>()
                         .x(d => xScale(d.time) || 0)
                         .y0(chartHeight)
                         .y1(d => yScale(d.messageRate))
                         .curve(d3.curveMonotoneX);

      const msGradId = "message-gradient-id";
      const defs = svg.append("defs");
      const msGrad = defs.append("linearGradient")
                         .attr("id", msGradId)
                         .attr("x1", "0%")
                         .attr("y1", "0%")
                         .attr("x2", "0%")
                         .attr("y2", "100%");
      msGrad.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#6366f1")
            .attr("stop-opacity", "0.25");
      msGrad.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#6366f1")
            .attr("stop-opacity", "0.0");

      g.append("path")
       .datum(combinedData)
       .attr("fill", `url(#${msGradId})`)
       .attr("d", areaPath);

      g.append("path")
       .datum(combinedData)
       .attr("fill", "none")
       .attr("stroke", "#6366f1")
       .attr("stroke-width", 2.5)
       .attr("d", messageLine);

      g.selectAll(".dot-msg")
       .data(combinedData)
       .enter()
       .append("circle")
       .attr("cx", (d: any) => xScale(d.time) || 0)
       .attr("cy", (d: any) => yScale(d.messageRate))
       .attr("r", 3.5)
       .attr("fill", "#0a0a0a")
       .attr("stroke", "#6366f1")
       .attr("stroke-width", 1.5);
    }

    if (showCommands) {
      const commandLine = d3.line<MetricHistoryPoint>()
                            .x(d => xScale(d.time) || 0)
                            .y(d => yScale(d.commandRate))
                            .curve(d3.curveMonotoneX);

      const combinedData = points.map(d => ({ ...d }));

      const areaPathCmd = d3.area<MetricHistoryPoint>()
                            .x(d => xScale(d.time) || 0)
                            .y0(chartHeight)
                            .y1(d => yScale(d.commandRate))
                            .curve(d3.curveMonotoneX);

      const cmdGradId = "command-gradient-id";
      const cmdDefs = svg.append("defs");
      const cmdGrad = cmdDefs.append("linearGradient")
                            .attr("id", cmdGradId)
                            .attr("x1", "0%")
                            .attr("y1", "0%")
                            .attr("x2", "0%")
                            .attr("y2", "100%");
      cmdGrad.append("stop")
             .attr("offset", "0%")
             .attr("stop-color", "#ec4899")
             .attr("stop-opacity", "0.2");
      cmdGrad.append("stop")
             .attr("offset", "100%")
             .attr("stop-color", "#ec4899")
             .attr("stop-opacity", "0.0");

      g.append("path")
       .datum(combinedData)
       .attr("fill", `url(#${cmdGradId})`)
       .attr("d", areaPathCmd);

      g.append("path")
       .datum(combinedData)
       .attr("fill", "none")
       .attr("stroke", "#ec4899")
       .attr("stroke-width", 2.5)
       .attr("d", commandLine);

      g.selectAll(".dot-cmd")
       .data(combinedData)
       .enter()
       .append("circle")
       .attr("cx", (d: any) => xScale(d.time) || 0)
       .attr("cy", (d: any) => yScale(d.commandRate))
       .attr("r", 3.5)
       .attr("fill", "#0a0a0a")
       .attr("stroke", "#ec4899")
       .attr("stroke-width", 1.5);
    }
  }, [data, showMessages, showCommands]);

  const formatUptimeValue = (seconds: number) => {
    if (seconds <= 0) return "0s";
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(" ");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111] border border-white/10 p-6 rounded-xl relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-zinc-500 font-medium tracking-wider uppercase mb-1">Real-Time Users</p>
              <h4 className="text-3xl font-semibold text-white tracking-tight">{data?.activeUsers || 0}</h4>
            </div>
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs text-zinc-400 font-medium">Live active websocket instances</span>
          </div>
        </div>

        <div className="bg-[#111] border border-white/10 p-6 rounded-xl relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-zinc-500 font-medium tracking-wider uppercase mb-1 font-sans">Uptime Dashboard</p>
              <h4 className="text-3xl font-semibold text-white tracking-tight font-mono">{formatUptimeValue(uptime)}</h4>
            </div>
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-sans animate-none">
              <Clock className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium font-sans">Selfbot server host active duration</span>
          </div>
        </div>

        <div className="bg-[#111] border border-white/10 p-6 rounded-xl relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-zinc-500 font-medium tracking-wider uppercase mb-1">Hosted People</p>
              <h4 className="text-3xl font-semibold text-white tracking-tight">{data?.hostedPeople || 0}</h4>
            </div>
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <Server className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Total overall tracked sessions</span>
          </div>
        </div>
      </div>

      <div className="bg-[#111] border border-white/10 rounded-xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-base font-medium text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Dynamic Activity Rate
            </h3>
            <p className="text-xs text-zinc-500 font-medium">Activity and command throughput across 5-second intervals</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMessages(!showMessages)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                showMessages
                  ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400"
                  : "bg-black border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              Message Activity
            </button>
            <button
              onClick={() => setShowCommands(!showCommands)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                showCommands
                  ? "bg-pink-600/10 border-pink-500/30 text-pink-400"
                  : "bg-black border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              Command Activity
            </button>
          </div>
        </div>

        <div className="w-full border border-white/10 bg-black/40 rounded-lg p-2 md:p-4 min-h-[300px]">
          <svg ref={svgRef} className="w-full h-full overflow-visible" />
        </div>
      </div>
    </div>
  );
}
