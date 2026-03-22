import React, { useState } from "react";
import * as LucideIcons from "lucide-react";
const {
  BarChart,
  Activity,
  ArrowUpRight,
} = LucideIcons as any;

interface MarketChartProps {
  symbol?: string;
  themeCardBg?: string;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function MarketChart({
  symbol = "BTCUSDT",
  themeCardBg = "bg-transparent",
  theme,
}: MarketChartProps) {
  const [viewMode, setViewMode] = useState<"market" | "equity">("market");
  const [timeframe, setTimeframe] = useState("1H");

  return (
    <div className={`${themeCardBg} flex flex-col h-full overflow-hidden`}>
      {/* Chart Header */}
      <div className="p-2 border-b border-white/5 flex justify-between items-center bg-white/5">
        <div className="flex items-center gap-2">
          <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
            <button
              onClick={() => setViewMode("market")}
              className={`px-3 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${
                viewMode === "market" 
                  ? "bg-white/10 text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-400"
              }`}
            >
              Market
            </button>
            <button
              onClick={() => setViewMode("equity")}
              className={`px-3 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${
                viewMode === "equity" 
                  ? "bg-white/10 text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-400"
              }`}
            >
              Equity
            </button>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1">
          {["5m", "15m", "1H", "4H", "1D"].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all border ${
                timeframe === tf
                  ? "shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                  : "text-slate-600 hover:text-slate-400 border-transparent"
              }`}
              style={timeframe === tf ? { 
                backgroundColor: theme ? `${theme.hex}33` : "rgba(6,182,212,0.2)",
                color: theme?.hex || "#22d3ee",
                borderColor: theme ? `${theme.hex}66` : "rgba(6,182,212,0.3)"
              } : {}}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Content Area */}
      <div className="flex-1 relative flex flex-col bg-[#080808] overflow-hidden">
        {/* Grid lines background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
        </div>

        {viewMode === "market" ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
             <div className="relative group cursor-pointer">
                <div 
                  className="absolute inset-0 blur-2xl transition-all rounded-full opacity-20 group-hover:opacity-40" 
                  style={{ backgroundColor: theme?.hex || "#22d3ee" }}
                />
                <BarChart size={48} className="text-white/10 relative z-10" />
             </div>
             <p className="text-[10px] text-white/40 font-mono tracking-[0.2em] uppercase mt-6 animate-pulse">
               Stream Initialized: {symbol}
             </p>
             <div className="flex items-center gap-4 mt-4">
                <div className="flex flex-col items-center">
                   <span className="text-[8px] text-slate-600 uppercase font-bold">Latency</span>
                   <span className="text-[10px] text-emerald-500 font-mono">12ms</span>
                </div>
                <div className="w-px h-6 bg-white/5" />
                <div className="flex flex-col items-center">
                   <span className="text-[8px] text-slate-600 uppercase font-bold">Node</span>
                   <span className="text-[10px] font-mono" style={{ color: theme?.hex || "#22d3ee" }}>OS-ALPHA</span>
                </div>
             </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="relative group">
               <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
               <Activity size={48} className="text-white/10 relative z-10" />
            </div>
            <p className="text-[10px] text-white/40 font-mono tracking-[0.2em] uppercase mt-6">
              Neural Strategy Growth
            </p>
            <div className="flex items-center gap-2 mt-4 text-emerald-400 font-mono text-sm">
               <ArrowUpRight size={16} />
               <span>+14.2% (30D)</span>
            </div>
          </div>
        )}
        
        {/* Bottom Status Bar */}
        <div className="px-3 py-1.5 border-t border-white/5 bg-black/40 flex justify-between items-center text-[8px] font-mono text-white/30 tracking-widest uppercase">
           <span>Live Feed Intercepted</span>
           <div className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
              <span>Verified Engine</span>
           </div>
        </div>
      </div>
    </div>
  );
}
