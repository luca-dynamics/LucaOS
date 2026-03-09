import React, { useEffect, useRef, useState } from "react";
import { Activity } from "lucide-react";
import { apiUrl, cortexUrl } from "../config/api";
// import AudioStreamer from './AudioStreamer'; // REMOVED

interface Props {
  audioListenMode?: boolean;
  connected?: boolean;
  theme?: {
    hex: string;
    primary: string;
    border: string;
    bg: string;
    themeName?: string;
  };
}

const SystemMonitor: React.FC<Props> = ({
  audioListenMode = false,
  connected = false,
  theme,
}) => {
  const themeColor = theme?.hex || "#3b82f6";
  const themePrimary = theme?.primary || "text-sci-cyan";
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

  // Audio Level Ref removed handler as it is unused

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

    // Initial check
    checkPermissions();

    // Only set up an interval if permissions are NOT okay (to detect fix)
    let permInterval: NodeJS.Timeout | null = null;

    // We check every 30s if denied, otherwise we stop polling
    permInterval = setInterval(() => {
      // If it's already OK, we could stop the interval, but a slow 30s check is safe
      checkPermissions();
    }, 30000);

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
          // Use timeout signal for fetch requests
          const timeoutSignal = (timeout: number) =>
            AbortSignal.timeout(timeout);

          // 1. Resource Pulse
          const res = await fetch(apiUrl("/api/monitor"), {
            signal: timeoutSignal(2000), // Increased from 800ms
          });
          const monitorData = res.ok ? await res.json() : null;
          if (monitorData) console.log("[MONITOR] Data Received:", monitorData);

          // 2. Hardware Pulse (Battery)
          const battRes = await fetch(cortexUrl("/api/system/control"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "GET_BATTERY" }),
            signal: timeoutSignal(2000),
          });
          const battData = battRes.ok ? await battRes.json() : null;

          // 3. Dependency Pulse
          const readyRes = await fetch(apiUrl("/api/system-status/status"), {
            signal: timeoutSignal(2000), // Increased from 800ms
          });
          const readyData = readyRes.ok ? await readyRes.json() : null;

          if (monitorData) {
            // Fix NaN% memory bug
            const memUsed = monitorData.memory?.used || 0;
            const memTotal = monitorData.memory?.total || 1;
            const memPerc = Math.min(100, (memUsed / memTotal) * 100);

            // Fix CPU calculation: Load average should be divided by CPU count, not multiplied
            // Load average represents number of processes waiting, normalize to 0-100%
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
              // permissions is now handled by the separate effect
              readiness: readyData?.status?.toUpperCase() || "READY",
              uptime: `${Math.floor(monitorData.uptime || 0)}s`,
            }));
          }
        } catch (e: any) {
          // Silence aborted requests (unmount) or timeouts to keep logs clean
          if (e.name === "AbortError" || e.name === "TimeoutError") {
            // Ignore - expected behavior
          } else {
            console.warn("[HEARTBEAT] Aggregate fetch failed", e);
          }
        }
      } else {
        // Simulation Mode
        setMetrics((prev) => ({
          ...prev,
          cpu: Math.min(
            100,
            Math.max(5, prev.cpu + (Math.random() - 0.5) * 20),
          ),
          mem: Math.min(
            100,
            Math.max(20, prev.mem + (Math.random() - 0.5) * 5),
          ),
          net: Math.max(0, prev.net + (Math.random() - 0.5) * 10),
        }));
      }
    }, 2000); // Slower interval for aggregate pulse

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
    const history: number[] = Array(50).fill(0); // For line graph

    const drawGauge = (
      x: number,
      y: number,
      radius: number,
      value: number,
      color: string,
      label: string,
    ) => {
      const isLight = theme?.themeName?.toLowerCase() === "lucagent";
      // Background Ring
      ctx.beginPath();
      ctx.arc(x, y, radius, 0.75 * Math.PI, 2.25 * Math.PI);
      ctx.strokeStyle = isLight
        ? "rgba(0, 0, 0, 0.05)"
        : "rgba(30, 41, 59, 0.5)"; // Subtler for light mode
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.stroke();

      // Value Ring
      const startAngle = 0.75 * Math.PI;
      const endAngle = 0.75 * Math.PI + (value / 100) * (1.5 * Math.PI);

      ctx.beginPath();
      ctx.arc(x, y, radius, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.shadowBlur = isLight ? 0 : 10;
      ctx.shadowColor = color;
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset

      // Value Text
      ctx.fillStyle = isLight ? "#111827" : "white";
      ctx.font = 'bold 18px "JetBrains Mono"';
      ctx.textAlign = "center";
      ctx.fillText(Math.round(value) + "%", x, y + 5);

      // Label Text
      ctx.fillStyle = isLight
        ? "rgba(75, 85, 99, 0.8)"
        : "rgba(148, 163, 184, 0.8)"; // Gray-600 or Slate-400
      ctx.font = '10px "Rajdhani"';
      ctx.fillText(label, x, y + 25);
    };

    const drawGraph = (x: number, y: number, w: number, h: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y + h);

      history.forEach((val, i) => {
        const px = x + (i / (history.length - 1)) * w;
        // Clamp value
        const clampVal = Math.max(0, Math.min(100, val));
        const py = y + h - (clampVal / 100) * h;
        ctx.lineTo(px, py);
      });

      ctx.strokeStyle = audioListenMode ? "#f59e0b" : themeColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Fill Gradient
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.fillStyle = audioListenMode
        ? "rgba(245, 158, 11, 0.1)"
        : `${themeColor}1A`; // 10% opacity
      ctx.fill();

      const isLight = theme?.themeName?.toLowerCase() === "lucagent";
      // Grid lines
      ctx.beginPath();
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x + w, y + h / 2);
      ctx.strokeStyle = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)";
      ctx.setLineDash([2, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const render = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      tick++;

      // Update History for graph
      if (tick % 5 === 0) {
        history.shift();
        // Use Real Audio Level if in Listen Mode
        if (audioListenMode) {
          history.push(audioLevelRef.current);
        } else {
          history.push(metrics.net * 5);
        }
      }

      // Draw Gauges - Use themeColor for both
      drawGauge(60, 70, 40, metrics.cpu, themeColor, "CPU CORE");
      drawGauge(160, 70, 40, metrics.mem, themeColor, "MEM ALLOC");

      // Draw Graph Area
      drawGraph(20, 140, width - 140, 50);

      // Draw "Hex Rain" Text on Right
      ctx.fillStyle = audioListenMode ? "#f59e0b" : themeColor;
      ctx.font = "10px monospace";
      ctx.textAlign = "left";

      const logs = [
        `POWER: ${metrics.battery}% ${metrics.isCharging ? "(AC)" : "(BAT)"}`,
        `ACCESS: ${metrics.permissions}`,
        `READY: ${metrics.readiness}`,
        `UPTIME: ${metrics.uptime}`,
        `MODE: ACTIVE (ADMIN)`,
      ];

      const isLight = theme?.themeName?.toLowerCase() === "lucagent";
      logs.forEach((l, i) => {
        ctx.fillStyle = isLight
          ? "rgba(17, 24, 39, 0.9)"
          : audioListenMode
            ? "#f59e0b"
            : themeColor;
        ctx.fillText(l, width - 110, 145 + i * 12);
      });

      // Status Header
      ctx.fillStyle = isLight
        ? "rgba(17, 24, 39, 1)"
        : audioListenMode
          ? "#f59e0b"
          : themeColor;
      ctx.font = 'bold 12px "Rajdhani"';
      ctx.fillText(
        audioListenMode
          ? "AUDIO ANALYSIS ACTIVE"
          : connected
            ? "REALTIME TELEMETRY"
            : "SIMULATION MODE",
        20,
        125,
      );

      // Decorative Corner
      ctx.beginPath();
      ctx.moveTo(width - 10, 10);
      ctx.lineTo(width - 10, 30);
      ctx.lineTo(width - 30, 10);
      ctx.closePath();
      ctx.fillStyle = "#334155";
      ctx.fill();

      animationId = requestAnimationFrame(render);
    };

    // Resize observer
    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };
    window.addEventListener("resize", resize);
    resize(); // Init

    render();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [metrics, audioListenMode, connected, themeColor]);

  const isLight = theme?.themeName?.toLowerCase() === "lucagent";
  return (
    <div className="h-full w-full flex flex-col gap-2">
      <div
        className="flex items-center justify-between pb-2"
        style={{
          borderBottom: `1px solid ${isLight ? "rgba(0,0,0,0.1)" : themeColor + "33"}`,
        }}
      >
        <div className="flex items-center gap-2">
          <Activity
            className={
              audioListenMode
                ? "text-amber-500"
                : isLight
                  ? "text-gray-900"
                  : themePrimary
            }
            size={16}
          />
          <h2
            className={`font-display font-bold tracking-widest text-xs ${
              audioListenMode
                ? "text-amber-500"
                : isLight
                  ? "text-gray-900"
                  : themePrimary
            }`}
          >
            {audioListenMode ? "SENSOR ARRAY" : "SYSTEM DIAGNOSTICS"}
          </h2>
        </div>
        <div
          className={`flex items-center gap-2 text-[10px] font-mono ${isLight ? "text-gray-500" : "text-slate-500"}`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-500" : "bg-yellow-500"
            } animate-pulse`}
          ></div>
          {connected ? "ONLINE" : "OFFLINE"}
        </div>
      </div>

      <div
        className={`flex-1 w-full relative ${isLight ? "bg-white/30" : "bg-black/40"} rounded overflow-hidden`}
        style={{
          border: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : themeColor + "33"}`,
        }}
      >
        <canvas ref={canvasRef} className="w-full h-full" />

        {/* --- REAL SENSOR INTEGRATION REMOVED (Legacy Voice System) --- */}
        {/* Audio visualization now handled by VoiceHud via liveService */}
      </div>
    </div>
  );
};

export default SystemMonitor;
