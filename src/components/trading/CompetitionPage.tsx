import React, { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
const {
  Trophy,
  TrendingUp,
  Users,
  Activity,
  RefreshCw,
  Flame,
  Crown,
  BarChart2,
  Swords,
} = LucideIcons as any;
import { ComparisonChart } from "./ComparisonChart";
import { TraderConfigViewModal } from "./TraderConfigViewModal";
import { tradingService } from "../../services/tradingService";

interface CompetitionPageProps {
  theme?: { hex: string; primary: string; border: string; bg: string };
  onClose?: () => void;
}

export default function CompetitionPage({
  theme,
  onClose,
}: CompetitionPageProps) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [liveStats, setLiveStats] = useState<any>({
    totalTraders: 0,
    totalVolume: "$0M",
    avgROI: 0,
    topPerformer: "-",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTrader, setSelectedTrader] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alphaFeed, setAlphaFeed] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d" | "all">(
    "7d"
  );

  const currentThemeHex = theme?.hex || "#eab308";

  useEffect(() => {
    refreshLeaderboard();
  }, []);

  const refreshLeaderboard = async () => {
    setIsLoading(true);
    try {
      const [data, stats, alpha] = await Promise.all([
        tradingService.getLeaderboard(),
        tradingService.getCompetitionStats(),
        tradingService.getAlphaFeed(),
      ]);
      setLeaderboard(data);
      setLiveStats(stats);
      setAlphaFeed(alpha);
    } catch (e) {
      console.error("Failed to fetch competition data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const getTraderColor = (rank: number) => {
    if (rank === 1) return "#F0B90B";
    if (rank === 2) return "#0ECB81";
    if (rank === 3) return "#3b82f6";
    return "#848E9C";
  };

  const handleTraderClick = (trader: any) => {
    setSelectedTrader(trader);
    setIsModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col font-mono text-slate-200 animate-in fade-in duration-500 overflow-hidden bg-black/20">
      {/* Sub-Header Area */}
      <div className={`p-4 sm:p-5 flex-shrink-0 border-b border-white/5 bg-white/5 backdrop-blur-md relative overflow-hidden`}>
        {/* Glow effect */}
        <div 
          className="absolute -top-24 -left-24 w-64 h-64 opacity-20 pointer-events-none"
          style={{ 
            background: `radial-gradient(circle, ${currentThemeHex} 0%, transparent 70%)`,
            filter: 'blur(40px)'
          }}
        />

        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="p-1.5 rounded-xl border liquid-border"
              style={{
                background: `linear-gradient(to br, ${currentThemeHex}33, ${currentThemeHex}0d)`,
                borderColor: `${currentThemeHex}33`,
              }}
            >
              <Trophy
                size={20}
                style={{ color: currentThemeHex }}
              />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2 font-display">
                WAR__ROOM
                <span
                  className="text-[8px] px-1.5 py-0.5 rounded border border-white/10 bg-white/5 uppercase"
                >
                  Season 1
                </span>
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold opacity-60">
                Global Agent Championship
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex bg-black/40 border border-white/5 p-0.5 rounded-lg backdrop-blur-sm hidden sm:flex`}>
              {(["24h", "7d", "30d", "all"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all`}
                  style={timeframe === tf ? {
                    backgroundColor: `${currentThemeHex}33`,
                    color: currentThemeHex,
                    boxShadow: `0 0 10px ${currentThemeHex}1a`
                  } : {
                    color: '#64748b'
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>

            <button
              onClick={refreshLeaderboard}
              disabled={isLoading}
              className={`p-2 rounded-lg bg-black/40 border border-white/5 hover:bg-white/5 transition-colors text-slate-400 hover:text-white`}
            >
              <RefreshCw
                size={14}
                className={isLoading ? "animate-spin" : ""}
              />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white group"
              >
                <LucideIcons.X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
            )}
          </div>
        </div>

        {/* Mini Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { label: "Agents", value: liveStats.totalTraders, icon: Users, color: "text-indigo-400" },
            { label: "Volume", value: liveStats.totalVolume, icon: BarChart2, color: "text-emerald-400" },
            { label: "Avg ROI", value: `${(liveStats.avgROI || 0).toFixed(1)}%`, icon: TrendingUp, color: "", themeColor: true },
            { label: "Alpha", value: liveStats.topPerformer, icon: Flame, color: "text-amber-400" },
          ].map((stat, i) => (
            <div key={i} className={`glass-card-premium p-2 flex items-center justify-between rounded-lg border border-white/5 relative overflow-hidden group`}>
               <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle at center, ${currentThemeHex}, transparent)` }}
              />
              <div className="relative z-10">
                <div className="text-[8px] font-bold text-slate-500 uppercase mb-0.5 tracking-tighter">{stat.label}</div>
                <div className={`text-sm font-bold ${stat.color}`} style={stat.themeColor ? { color: currentThemeHex } : {}}>{stat.value}</div>
              </div>
              <stat.icon size={14} className="opacity-40 group-hover:scale-110 transition-transform duration-500" style={stat.themeColor ? { color: currentThemeHex } : {}} />
            </div>
          ))}
        </div>
      </div>

      {/* Scrolling Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Performance Chart */}
          <div className={`glass-card-premium p-4 rounded-xl flex flex-col h-[300px] border border-white/5 relative overflow-hidden`}>
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-white/40" />
                <h2 className="text-xs font-bold text-white uppercase tracking-widest">Growth Matrix</h2>
              </div>
              <span className="text-[9px] text-emerald-500 font-bold animate-pulse">LIVE STREAM</span>
            </div>
            <div className="flex-1 min-h-0 relative z-10">
              <ComparisonChart traders={leaderboard} />
            </div>
          </div>

          {/* Leaderboard List */}
          <div className={`glass-card-premium p-0 rounded-xl overflow-hidden flex flex-col h-[300px] border border-white/5`}>
            <div className="p-4 border-b border-white/5 flex items-center gap-2 bg-white/5">
              <Crown size={14} className="text-amber-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-widest">Elite Rosters</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 p-2 custom-scrollbar">
              {leaderboard.map((trader) => (
                <div
                  key={trader.trader_id}
                  onClick={() => handleTraderClick(trader)}
                  className={`p-2 rounded-lg cursor-pointer transition-all border ${trader.is_local ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-transparent'} hover:border-white/10 hover:bg-white/5 flex items-center justify-between group`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-5 text-center font-bold text-[10px]" style={{ color: getTraderColor(trader.rank) }}>#{trader.rank}</div>
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lg shadow-inner relative">
                      {trader.avatar}
                      {trader.is_local && (
                         <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 border border-black shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <div className="font-bold text-xs text-slate-200 group-hover:text-white transition-colors">{trader.trader_name}</div>
                        {trader.is_local && (
                          <span className="text-[7px] px-1 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/20 font-bold uppercase tracking-tighter">YOU</span>
                        )}
                      </div>
                      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tight">{trader.win_rate}% Win • {trader.trade_count}p</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`font-bold text-xs ${trader.total_pnl_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {trader.total_pnl_pct >= 0 ? "+" : ""}{trader.total_pnl_pct.toFixed(2)}%
                      </div>
                    </div>
                    {!trader.is_local && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(`Cloning Strategy: ${trader.trader_name}`);
                        }}
                        className="p-1 px-2 rounded-md bg-white/5 border border-white/5 hover:bg-white/10 text-[9px] font-bold text-white/60 hover:text-white transition-all scale-0 group-hover:scale-100 origin-right"
                      >
                        CLONE
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Alpha Stream (Phase 8 Expansion) */}
        <div className="mt-4 glass-card-premium border border-white/5 rounded-xl overflow-hidden p-0.5">
          <div className="bg-[#0a0a0a]/80 p-3 flex flex-col sm:flex-row items-center justify-between border-b border-white/5 gap-3">
             <div className="flex items-center gap-2">
               <Flame size={14} className="text-amber-500 animate-pulse" />
               <h2 className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Global_Alpha_Nexus</h2>
             </div>
             <div className="flex items-center gap-4 text-[9px] font-mono text-white/40 uppercase tracking-tighter overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
               {alphaFeed.map((signal) => (
                 <div key={signal.id} className="flex items-center gap-2 whitespace-nowrap bg-white/5 px-2 py-1 rounded">
                   <span className="text-white font-bold">{signal.symbol}</span>
                   <span className={signal.intensity === 'V_HIGH' ? 'text-rose-400 font-bold' : 'text-amber-400'}>{signal.action}</span>
                   <span className="text-[8px] opacity-40">{signal.time}</span>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Head-to-Head */}
        <div className={`mt-4 p-4 rounded-xl glass-card-premium border border-white/5 relative overflow-hidden`}>
           <div className="flex items-center gap-2 mb-4">
             <Swords size={16} className="text-rose-500" />
             <h2 className="text-xs font-bold text-white uppercase tracking-widest">Head-to-Head Battle</h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leaderboard.slice(0, 2).map((trader, i) => {
                const isFirst = i === 0;
                const opponent = leaderboard[i === 0 ? 1 : 0];
                const gap = (trader.total_pnl_pct - (opponent?.total_pnl_pct || 0)).toFixed(2);

                return (
                  <div 
                    key={trader.trader_id} 
                    className={`p-4 rounded-xl border transition-all hover:scale-[1.01]`}
                    style={isFirst ? {
                      borderColor: `${currentThemeHex}4d`,
                      backgroundColor: `${currentThemeHex}1a`,
                    } : {
                      borderColor: 'rgba(255,255,255,0.05)',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl filter drop-shadow-md">{trader.avatar}</span>
                      <div>
                        <div className={`text-sm font-bold`} style={isFirst ? { color: currentThemeHex } : { color: '#e2e8f0' }}>{trader.trader_name}</div>
                        <div className="text-[9px] text-slate-500 uppercase font-bold">{trader.exchange}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className={`font-bold ${trader.total_pnl_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trader.total_pnl_pct >= 0 ? '+' : ''}{trader.total_pnl_pct.toFixed(2)}%
                      </span>
                      <span 
                        className={`px-2 py-0.5 rounded-full bg-black/40 border border-white/5 font-bold ${isFirst ? 'text-emerald-500' : 'text-rose-500'}`}
                      >
                        {isFirst ? `+${gap}% LEAD` : `${Math.abs(Number(gap))}% BEHIND`}
                      </span>
                    </div>
                  </div>
                );
              })}
           </div>
        </div>
      </div>

      <TraderConfigViewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        traderData={selectedTrader}
      />
    </div>
  );
}
