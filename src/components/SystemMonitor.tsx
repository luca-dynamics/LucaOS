import React, { useState, useEffect, useRef } from "react";
import { Icon } from "./ui/Icon";
import { apiUrl, cortexUrl } from "../config/api";
import { useTheme } from "../hooks/useTheme";

interface Props {
  audioListenMode?: boolean;
  connected?: boolean;
  connectionTier?: "LAN" | "LOCAL" | "CLOUD" | "OFFLINE";
}

const SystemMonitor: React.FC<Props> = ({
  audioListenMode = false,
  connected = false,
  connectionTier = "LOCAL",
}) => {
  const { theme, isLight } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [metrics, setMetrics] = useState({
    cpu: 0,
    mem: 0,
    net: 0,
    battery: 100,
    isCharging: true,
    permissions: "OK",
    readiness: "READY",
    uptime: "0s",
  });

  // Real Audio Data Ref (Mutable for Animation Loop)
  const audioLevelRef = useRef(0);

  // 3. Permission Pulse (Separate from main loop to avoid spam)
  useEffect(() => {
    if (!connected) return;

    const checkPermissions = async () => {
      try {
        const permRes = await fetch(cortexUrl("/api/system/permissions"), {
          signal: AbortSignal.timeout(5000),
        });
        const permData = await permRes.json();
        setMetrics((prev) => ({
          ...prev,
          permissions: permData?.success ? "OK" : "DENIED",
        }));
      } catch (e) {
        console.warn("[MONITOR] Permission check failed", e);
      }
    };

    checkPermissions();
    let permInterval: NodeJS.Timeout | null = setInterval(checkPermissions, 30000);

    return () => {
      if (permInterval) clearInterval(permInterval);
    };
  }, [connected]);

  // Data Fetch Loop
  useEffect(() => {
    const controller = new AbortController();

    const interval = setInterval(async () => {
      if (connected) {
        try {
          const timeoutSignal = (timeout: number) => AbortSignal.timeout(timeout);

          const res = await fetch(apiUrl("/api/monitor"), { signal: timeoutSignal(2000) });
          const monitorData = res.ok ? await res.json() : null;

          const battRes = await fetch(cortexUrl("/api/system/control"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "GET_BATTERY" }),
            signal: timeoutSignal(2000),
          });
          const battData = battRes.ok ? await battRes.json() : null;

          const readyRes = await fetch(apiUrl("/api/system-status/status"), { signal: timeoutSignal(2000) });
          const readyData = readyRes.ok ? await readyRes.json() : null;

          if (monitorData) {
            const memUsed = monitorData.memory?.used || 0;
            const memTotal = monitorData.memory?.total || 1;
            const memPerc = Math.min(100, (memUsed / memTotal) * 100);

            const cpuCores = monitorData.cpuCores || 1;
            const cpuLoad = monitorData.cpu || 0;
            const cpuPerc = Math.min(100, (cpuLoad / cpuCores) * 100);

            setMetrics((prev) => ({
              ...prev,
              cpu: cpuPerc,
              mem: memPerc,
              net: monitorData.net || 0,
              battery: battData?.data?.percentage || 100,
              isCharging: battData?.data?.isCharging || false,
              readiness: readyData?.status?.toUpperCase() || "READY",
              uptime: `${Math.floor(monitorData.uptime || 0)}s`,
            }));
          }
        } catch (e: any) {
          if (e.name !== "AbortError" && e.name !== "TimeoutError") {
            console.warn("[HEARTBEAT] Aggregate fetch failed", e);
          }
        }
      } else {
        setMetrics((prev) => ({
          ...prev,
          cpu: Math.min(100, Math.max(5, prev.cpu + (Math.random() - 0.5) * 20)),
          mem: Math.min(100, Math.max(20, prev.mem + (Math.random() - 0.5) * 5)),
          net: Math.max(0, prev.net + (Math.random() - 0.5) * 10),
        }));
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [connected]);

  // Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let tick = 0;
    const history: number[] = Array(50).fill(0);

    const drawGauge = (
      x: number,
      y: number,
      radius: number,
      value: number,
      colors: any,
      label: string,
    ) => {
      // Background Ring
      ctx.beginPath();
      ctx.arc(x, y, radius, 0.75 * Math.PI, 2.25 * Math.PI);
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.stroke();

      // Value Ring
      const startAngle = 0.75 * Math.PI;
      const endAngle = 0.75 * Math.PI + (value / 100) * (1.5 * Math.PI);

      ctx.beginPath();
      ctx.arc(x, y, radius, startAngle, endAngle);
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      
      // Shadow glow for premium feel in dark mode
      if (!isLight) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = colors.primary;
      }
      ctx.stroke();
      ctx.shadowBlur = 0; 

      // Value Text
      ctx.fillStyle = colors.text;
      ctx.font = 'black 16px "JetBrains Mono"';
      ctx.textAlign = "center";
      ctx.fillText(Math.round(value) + "%", x, y + 6);

      // Label Text
      ctx.fillStyle = colors.muted;
      ctx.font = 'black 9px "JetBrains Mono"';
      ctx.fillText(label, x, y + 28);
    };

    const drawGraph = (x: number, y: number, w: number, h: number, colors: any) => {
      ctx.beginPath();
      ctx.moveTo(x, y + h);

      history.forEach((val, i) => {
        const px = x + (i / (history.length - 1)) * w;
        const py = y + h - (Math.max(0, Math.min(100, val)) / 100) * h;
        ctx.lineTo(px, py);
      });

      ctx.strokeStyle = audioListenMode ? colors.accent : colors.primary;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Fill Gradient
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.fillStyle = audioListenMode
        ? colors.accent + "22"
        : colors.primary + "1A";
      ctx.fill();

      // Grid lines
      ctx.beginPath();
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x + w, y + h / 2);
      ctx.strokeStyle = colors.border;
      ctx.setLineDash([2, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const render = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      tick++;

      // Use colors from hook
      const colors = {
        primary: theme.primary,
        text: theme.textMain,
        muted: theme.textMuted,
        border: theme.borderMain,
        accent: "#f59e0b",
      };

      // Update History for graph
      if (tick % 5 === 0) {
        history.shift();
        history.push(audioListenMode ? audioLevelRef.current : metrics.net * 5);
      }

      // Draw Gauges
      drawGauge(60, 65, 36, metrics.cpu, colors, "CPU LOAD");
      drawGauge(150, 65, 36, metrics.mem, colors, "MEM UTIL");

      // Draw Graph Area
      drawGraph(20, 130, width - 140, 50, colors);

      // Diagnostics Text
      const logs = [
        `PWR: ${metrics.battery}% ${metrics.isCharging ? "(AC)" : "(BAT)"}`,
        `AUTH: ${metrics.permissions}`,
        `SYST: ${metrics.readiness}`,
        `TIME: ${metrics.uptime}`,
        `KERN: SECURE`,
      ];

      logs.forEach((l, i) => {
        ctx.fillStyle = audioListenMode ? colors.accent : colors.text;
        ctx.font = 'black 10px "JetBrains Mono"';
        ctx.textAlign = "left";
        ctx.fillText(l, width - 110, 135 + i * 14);
      });

      ctx.fillStyle = audioListenMode ? colors.accent : colors.primary;
      ctx.font = 'black 10px "JetBrains Mono"';
      ctx.fillText(
        audioListenMode
          ? "SENSOR ARRAY // ACTIVE"
          : connectionTier === "OFFLINE"
            ? "SIMULATION // STANDBY"
            : `TELEMETRY // ${connectionTier}`,
        20,
        115,
      );

      // Corner Accents
      ctx.beginPath();
      ctx.moveTo(width - 5, 5);
      ctx.lineTo(width - 5, 20);
      ctx.lineTo(width - 20, 5);
      ctx.closePath();
      ctx.fillStyle = colors.border;
      ctx.fill();

      animationId = requestAnimationFrame(render);
    };

    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };
    window.addEventListener("resize", resize);
    resize();
    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [metrics, audioListenMode, connected, connectionTier]);

  return (
    <div className="h-full w-full flex flex-col gap-3 animate-in fade-in duration-1000">
      <div
        className="flex items-center justify-between pb-2 border-b border-[var(--app-border-main)]"
      >
        <div className="flex items-center gap-2.5">
          <Icon
            name="Pulse"
            className={audioListenMode ? "text-amber-500 animate-pulse" : "text-[var(--app-text-main)]"}
            size={18}
            variant="BoldDuotone"
          />
          <h2
            className={`text-[10px] font-black uppercase tracking-[0.3em] font-display italic text-[var(--app-text-main)]`}
          >
            {audioListenMode ? "Sensor Matrix" : "System Diagnostics"}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[9px] font-black font-mono tracking-widest border border-[var(--app-border-main)] bg-black/20 ${connected ? 'text-green-500' : 'text-amber-500'}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-amber-500"} animate-pulse`} />
            {connected ? "ONLINE" : "OFFLINE"}
          </div>
        </div>
      </div>

      <div
        className={`flex-1 w-full relative rounded-xl overflow-hidden tech-border glass-blur bg-[var(--app-bg-tint)] border border-[var(--app-border-main)] shadow-inner`}
      >
        <canvas ref={canvasRef} className="w-full h-full opacity-90" />
      </div>
    </div>
  );
};

export default SystemMonitor;
