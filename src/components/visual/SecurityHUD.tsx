import React, { useEffect, useState } from "react";
import { Icon } from "../ui/Icon";
import { apiUrl } from "../../config/api";

interface Props {
  status: string;
  target: string;
  profit: string;
  steps: string[];
  metrics: {
    cost: string;
    successRate: string;
    threatLevel: number;
  };
  themeColor?: string;
}

const StatRow: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</span>
    <span className="text-sm font-bold font-mono" style={accent ? { color: accent } : { color: "#fff" }}>{value}</span>
  </div>
);

const UsageBar: React.FC<{ value: number; accent: string; label: string }> = ({ value, accent, label }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-slate-500 font-medium uppercase tracking-wider">{label}</span>
      <span className="font-bold font-mono text-white">{value}%</span>
    </div>
    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, backgroundColor: accent }}
      />
    </div>
  </div>
);

const SecurityHUD: React.FC<Props> = ({
  status,
  target,
  profit,
  steps,
  metrics,
  themeColor = "#ef4444",
}) => {
  const [realStats, setRealStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(apiUrl("/api/system/status/monitor"));
        const data = await res.json();
        if (data.success) setRealStats(data);
      } catch {
        // silent
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const displayTarget = realStats ? `${realStats.hostname} (${realStats.platform})` : target;
  const freeGb = realStats
    ? (realStats.freeMem / 1024 / 1024 / 1024).toFixed(1)
    : profit;
  const cpuLoad = realStats ? Math.round(realStats.cpuLoad || 0) : metrics.threatLevel;
  const displaySteps = realStats?.topProc?.length > 0 ? realStats.topProc : steps;
  const uptimeHrs = realStats ? (realStats.uptime / 3600).toFixed(1) : "—";

  return (
    <div className="w-full max-w-5xl mx-auto p-6 flex flex-col gap-6 font-sans">

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${themeColor}15` }}
          >
            <Icon name="Shield" size={20} style={{ color: themeColor }} variant="BoldDuotone" />
          </div>
          <div>
            <h2 className="text-white font-bold text-base tracking-wide">Security Monitor</h2>
            <p className="text-slate-500 text-xs flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ backgroundColor: themeColor }} />
              Sovereign protocol · Real-time monitoring
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
          style={{ backgroundColor: `${themeColor}08`, borderColor: `${themeColor}20`, color: themeColor }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
          <span className="text-[11px] font-bold tracking-widest">{status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: Target + Extraction */}
        <div className="flex flex-col gap-3">
          {/* Target */}
          <div className="bg-[#111111] border border-white/10 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Icon name="Target" size={14} style={{ color: themeColor }} />
              <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Active Target</span>
            </div>
            <p className="text-white text-sm font-bold font-mono break-all">{displayTarget}</p>
            <p className="text-[10px] text-slate-600 font-mono">THREAT_VECTOR: RE-ENTRANCY / MULTI-HOP</p>
          </div>

          {/* Extraction */}
          <div className="bg-[#111111] border border-white/10 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Icon name="TrendingUp" size={14} className="text-green-500" />
              <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Memory Free</span>
            </div>
            <p className="text-2xl font-bold text-green-400 font-mono">+{freeGb} <span className="text-sm font-normal text-slate-500">GB</span></p>
            <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full w-[65%] rounded-full bg-green-500" />
            </div>
            <p className="text-[10px] text-slate-600">Extraction efficiency optimal</p>
          </div>

          {/* Live Logs */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4 flex-1">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-3">Live Logs</p>
            <div className="space-y-1.5 font-mono text-[10px]">
              <div className="text-green-400">SYSTEM_SCAN · ACTIVE</div>
              <div className="text-slate-500">METRICS_FETCH · {realStats ? "OK" : "PENDING"}</div>
              <div className="text-yellow-400">PROBE · {realStats?.arch || "DETECTING"}</div>
              <div style={{ color: themeColor }}>DATA_FLOW · ESTABLISHED</div>
            </div>
          </div>
        </div>

        {/* Center: Probe Pipeline */}
        <div className="bg-[#111111] border border-white/10 rounded-xl p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
            <Icon name="Cpu" size={14} style={{ color: themeColor }} />
            <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Probe Pipeline</span>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            {displaySteps.map((step: string, idx: number) => (
              <div
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${idx === 0 ? "bg-white/[0.04]" : ""}`}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{
                    backgroundColor: idx === 0 ? themeColor : "rgba(255,255,255,0.05)",
                    color: idx === 0 ? "#000" : "#64748b",
                  }}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold uppercase truncate ${idx === 0 ? "text-white" : "text-slate-600"}`}>
                    {step}
                  </p>
                </div>
                {idx === 0 && (
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-[10px] mb-2">
              <span className="text-slate-500">Uptime Stability</span>
              <span className="font-bold font-mono text-white">{uptimeHrs} hrs</span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full w-[92%] rounded-full" style={{ backgroundColor: themeColor }} />
            </div>
          </div>
        </div>

        {/* Right: Metrics */}
        <div className="flex flex-col gap-3">
          {/* Performance rows */}
          <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-3">Performance</p>
            <StatRow label="Architecture" value={realStats?.arch || "N/A"} />
            <StatRow label="Success Rate" value={metrics.successRate} accent="#22c55e" />
            <StatRow label="Est. Cost" value={metrics.cost} />
          </div>

          {/* CPU Gauge */}
          <div className="bg-[#111111] border border-white/10 rounded-xl p-4 flex-1 flex flex-col">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-4">System Load</p>
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              {/* Ring */}
              <div className="relative flex items-center justify-center">
                <svg className="w-28 h-28 -rotate-90">
                  <circle cx="56" cy="56" r="46" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
                  <circle
                    cx="56" cy="56" r="46" fill="none"
                    stroke={themeColor}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 46}`}
                    strokeDashoffset={`${2 * Math.PI * 46 * (1 - cpuLoad / 100)}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute text-center">
                  <p className="text-xl font-bold font-mono text-white">{cpuLoad}%</p>
                  <p className="text-[9px] text-slate-600 uppercase tracking-wider">CPU</p>
                </div>
              </div>
              <div className="w-full space-y-2">
                <UsageBar value={cpuLoad} accent={themeColor} label="CPU Load" />
                <UsageBar
                  value={realStats ? Math.round(((realStats.totalMem - realStats.freeMem) / realStats.totalMem) * 100) : 55}
                  accent="#3b82f6"
                  label="RAM"
                />
              </div>
              <p
                className="text-[10px] font-bold tracking-widest uppercase text-center"
                style={{ color: cpuLoad > 80 ? "#ef4444" : "#22c55e" }}
              >
                {cpuLoad > 80 ? "CRITICAL LOAD" : "NOMINAL OPERATION"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityHUD;
