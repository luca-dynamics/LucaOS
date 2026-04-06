import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { EquitySnapshot } from "../../../services/equityTracker";
import { Icon } from "../../ui/Icon";

interface EquityChartProps {
  theme?: { hex: string; primary: string; border: string; bg: string; isLight?: boolean };
  data?: EquitySnapshot[];
  metrics?: any;
  height?: number | string;
}

export default function EquityChart({ 
  theme, 
  data = [], 
  metrics,
  height = 400 
}: EquityChartProps) {
  const [displayMode, setDisplayMode] = useState<"USDT" | "percent">("USDT");
  const isLight = theme?.isLight;
  const primaryColor = theme?.hex || "#0ea5e9";

  // Process data for the chart
  const initialEquity = data.length > 0 ? data[0].totalEquity : 0;
  
  const chartData = data.map(point => ({
    time: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    fullTime: new Date(point.timestamp).toLocaleString(),
    value: displayMode === "USDT" 
      ? point.totalEquity 
      : initialEquity > 0 ? ((point.totalEquity - initialEquity) / initialEquity) * 100 : 0,
    raw: point
  }));

  // Stats for the header
  const currentEquity = data.length > 0 ? data[data.length - 1].totalEquity : (metrics?.totalEquity || 0);
  const totalPnL = currentEquity - initialEquity;
  const totalPnLPct = initialEquity > 0 ? (totalPnL / initialEquity) * 100 : 0;

  if (data.length === 0) {
    return (
      <div className={`w-full h-full bg-transparent flex items-center justify-center border-t ${isLight ? "border-black/5" : "border-white/5"}`} style={{ height }}>
        <div className="text-center">
          <div className={`text-[10px] font-black uppercase tracking-[0.3em] ${isLight ? "text-slate-300" : "text-white/20"} mb-2`}>Initializing Tracker</div>
          <div className={`text-xs ${isLight ? "text-slate-400" : "text-white/40"} animate-pulse uppercase font-bold tracking-tighter`}>Collecting market data points...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full bg-transparent p-6 flex flex-col`} style={{ height: typeof height === 'number' ? `${height}px` : height }}>
      <div className="flex justify-between items-center mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Icon 
              name="Activity" 
              size={14} 
              style={{ color: primaryColor }}
            />
            <h4 className={`text-[10px] font-black ${isLight ? "text-slate-400" : "text-white/30"} uppercase tracking-[0.3em]`}>Performance Oracle</h4>
          </div>
          <div className="flex items-baseline gap-3">
             <span className={`text-3xl font-black tracking-tighter ${isLight ? "text-slate-900" : "text-white"}`}>
               {displayMode === "USDT" 
                 ? `$${currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                 : `${totalPnLPct >= 0 ? "+" : ""}${totalPnLPct.toFixed(2)}%`
               }
             </span>
             <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase border ${totalPnL >= 0 
                ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20" 
                : "bg-rose-500/5 text-rose-500 border-rose-500/20"
              }`}>
               {totalPnL >= 0 ? "+" : ""}{displayMode === "USDT" ? `$${totalPnL.toFixed(2)}` : `${totalPnLPct.toFixed(2)}%`}
             </span>
          </div>
        </div>
        
        <div className={`flex ${isLight ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/10"} rounded-lg p-1 border shadow-inner`}>
            <button 
              onClick={() => setDisplayMode("USDT")}
              className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${
                displayMode === "USDT" 
                 ? isLight ? "bg-white shadow-sm border border-slate-200" : "bg-white/10 text-white shadow-sm" 
                 : `${isLight ? "text-slate-400 hover:text-slate-600" : "text-white/40 hover:text-white/60"}`
              }`}
              style={displayMode === "USDT" && isLight ? { color: theme?.hex || "#0ea5e9" } : {}}
            >
              Capital
            </button>
            <button 
              onClick={() => setDisplayMode("percent")}
              className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${
                displayMode === "percent" 
                 ? isLight ? "bg-white shadow-sm border border-slate-200" : "bg-white/10 text-white shadow-sm" 
                 : `${isLight ? "text-slate-400 hover:text-slate-600" : "text-white/40 hover:text-white/60"}`
              }`}
              style={displayMode === "percent" && isLight ? { color: theme?.hex || "#0ea5e9" } : {}}
            >
              Growth %
            </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke={isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)"} 
            />
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: isLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)", fontSize: 9, fontWeight: 700, fontFamily: "monospace" }}
              minTickGap={40}
            />
            <YAxis 
              hide={false}
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: isLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)", fontSize: 9, fontWeight: 700, fontFamily: "monospace" }}
              domain={["auto", "auto"]}
              tickFormatter={(val) => displayMode === "USDT" 
                ? `$${val > 1000 ? (val/1000).toFixed(1) + 'k' : val.toFixed(0)}`
                : `${val.toFixed(2)}%`
              }
            />
            <Tooltip
              labelFormatter={(label, items) => items[0]?.payload?.fullTime || label}
              contentStyle={{ 
                backgroundColor: isLight ? "#ffffff" : "#0a0a0a", 
                border: isLight ? "1px solid rgba(0,0,0,0.05)" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                fontSize: "10px",
                fontFamily: "monospace",
                boxShadow: isLight ? "0 10px 30px rgba(0,0,0,0.05)" : "0 10px 30px rgba(0,0,0,0.5)",
                padding: "8px 12px"
              }}
              itemStyle={{ color: primaryColor, fontWeight: 900 }}
              labelStyle={{ color: isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.5)", marginBottom: "4px", fontWeight: 700 }}
              formatter={(value: number) => [
                displayMode === "USDT" ? `$${value.toLocaleString()}` : `${value.toFixed(4)}%`,
                displayMode === "USDT" ? "Value" : "Delta"
              ]}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={primaryColor} 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorValue)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className={`${isLight ? "bg-slate-50 border-slate-100" : "bg-white/[0.02] border-white/5"} p-3 rounded-xl border`}>
            <div className={`text-[8px] ${isLight ? "text-slate-400" : "text-white/30"} uppercase font-black tracking-widest mb-1`}>Launch Equity</div>
            <div className={`text-xs font-black font-mono ${isLight ? "text-slate-900" : "text-white"}`}>${initialEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
         </div>
         <div className={`${isLight ? "bg-slate-50 border-slate-100" : "bg-white/[0.02] border-white/5"} p-3 rounded-xl border`}>
            <div className={`text-[8px] ${isLight ? "text-slate-400" : "text-white/30"} uppercase font-black tracking-widest mb-1`}>Live Portfolio</div>
            <div className="text-xs font-black font-mono text-emerald-500">${currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
         </div>
         <div className={`${isLight ? "bg-slate-50 border-slate-100" : "bg-white/[0.02] border-white/5"} p-3 rounded-xl border`}>
            <div className={`text-[8px] ${isLight ? "text-slate-400" : "text-white/30"} uppercase font-black tracking-widest mb-1`}>Data Nodes</div>
            <div className={`text-xs font-black font-mono ${isLight ? "text-slate-900" : "text-white"}`}>{data.length} pts</div>
         </div>
          <div className={`${isLight ? "bg-slate-50 border-slate-100" : "bg-white/[0.02] border-white/5"} p-3 rounded-xl border`}>
            <div className={`text-[8px] ${isLight ? "text-slate-400" : "text-white/30"} uppercase font-black tracking-widest mb-1`}>Orchestrator</div>
            <div 
              className="text-[9px] font-black font-mono uppercase tracking-tighter"
              style={{ color: isLight ? theme?.hex || "#0ea5e9" : "#f59e0b" }}
            >
              Active Sync
            </div>
          </div>
      </div>
    </div>
  );
}
