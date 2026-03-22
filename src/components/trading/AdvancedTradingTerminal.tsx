import React, { useState } from "react";
import DebateArena from "./DebateArena";
import BacktestPage from "./BacktestPage";
import StrategyBuilder from "./StrategyBuilder";
import TradingDashboard from "./TradingDashboard";
import AITradersPage from "./AITradersPage";
import CompetitionPage from "./CompetitionPage";
import * as LucideIcons from "lucide-react";
import { eventBus } from "../../services/eventBus";
import { tradingLoopService } from "../../services/tradingLoopService";
const { Activity, X, Trophy, Wrench, BellRing, CheckCircle2, TrendingUp, Power, Clock } = LucideIcons as any;

interface AdvancedTradingTerminalProps {
  onClose?: () => void;
  onOpenCompetition?: () => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function AdvancedTradingTerminal({
  onClose,
  onOpenCompetition,
  theme,
}: AdvancedTradingTerminalProps) {
  if (onOpenCompetition) {
    console.log("[AdvancedTradingTerminal] Competition mode initialized.");
  }

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "debate" | "backtest" | "strategy" | "config" | "ranking"
  >("dashboard");

  const currentThemeBorder = theme?.border || "border-indigo-500";
  const currentThemeHex = theme?.hex || "#818cf8";

  const [notification, setNotification] = useState<{message: string, type: 'exec' | 'prop'} | null>(null);
  const [isAutoResearchActive, setIsAutoResearchActive] = useState(tradingLoopService.isActive());

  const toggleAutoResearch = () => {
    if (isAutoResearchActive) {
      tradingLoopService.stop();
    } else {
      tradingLoopService.start();
    }
    setIsAutoResearchActive(tradingLoopService.isActive());
  };

  React.useEffect(() => {
    const handleExecuted = (data: any) => {
      setNotification({ message: `EXECUTED: ${data.side} ${data.symbol}`, type: 'exec' });
      setTimeout(() => setNotification(null), 5000);
    };

    const handleProposed = (data: any) => {
      setNotification({ message: `RESEARCH HIT: ${data.symbol} (${data.consensus}%)`, type: 'prop' });
      setTimeout(() => setNotification(null), 5000);
    };

    eventBus.on("TRADE_EXECUTED", handleExecuted);
    eventBus.on("TRADE_PROPOSED", handleProposed);

    return () => {
      eventBus.off("TRADE_EXECUTED", handleExecuted);
      eventBus.off("TRADE_PROPOSED", handleProposed);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in zoom-in-95 duration-300 font-mono p-0 sm:p-4 overflow-hidden">
      <div
        className={`relative w-full h-full sm:h-[90vh] sm:w-[95%] max-w-[1400px] bg-black/40 backdrop-blur-xl border-none sm:border ${currentThemeBorder} rounded-none sm:rounded-lg flex flex-col overflow-hidden shadow-2xl`}
        style={{ boxShadow: `0 0 50px ${currentThemeHex}1a` }}
      >
        <div
          className="absolute inset-0 opacity-40 pointer-events-none transition-all duration-700 -z-10"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${currentThemeHex}25, transparent 60%)`,
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute inset-0 opacity-30 pointer-events-none transition-all duration-700 -z-10"
          style={{
            background: `radial-gradient(circle at 80% 20%, ${currentThemeHex}15, transparent 50%)`,
            filter: "blur(40px)",
          }}
        />

        {/* 1. Header Bar */}
        <div
          className={`h-16 flex-shrink-0 border-b ${currentThemeBorder}/30 flex items-center justify-between px-4 sm:px-6`}
          style={{ backgroundColor: `${currentThemeHex}1F` }}
        >
          <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
            <div
              className={`p-1.5 sm:p-2 rounded border transition-colors flex-shrink-0`}
              style={{
                borderColor: `${currentThemeHex}66`,
                backgroundColor: `${currentThemeHex}1a`,
                color: currentThemeHex,
              }}
            >
              <Activity size={18} className="sm:size-5" />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-bold text-base sm:text-xl tracking-widest text-white uppercase font-display truncate">
                LucaOS{" "}
                <span style={{ color: currentThemeHex }}>
                  TRADING DASHBOARD{" "}
                </span>
              </h2>
              <div className="flex gap-2 sm:gap-4 text-[9px] sm:text-[10px] text-slate-500 font-bold tracking-wider font-mono mt-0.5 truncate">
                <span>ONLINE</span>
                <span className="text-emerald-500 hidden sm:inline">
                  CONNECTED
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-1 mr-2">
              <button
                onClick={toggleAutoResearch}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${
                  isAutoResearchActive 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                    : "bg-slate-800/40 text-slate-500 border border-slate-700/50"
                }`}
              >
                <Power size={12} className={isAutoResearchActive ? "animate-pulse" : ""} />
                {isAutoResearchActive ? "AUTORESEARCH: ON" : "AUTORESEARCH: OFF"}
              </button>
              
              <div className="h-4 w-[1px] bg-white/10 mx-1" />
              
              <select 
                className="bg-transparent text-[10px] font-bold text-slate-400 focus:outline-none cursor-pointer pr-1"
                value={tradingLoopService.getInterval()}
                onChange={(e) => tradingLoopService.updateInterval(parseInt(e.target.value))}
              >
                <option value={60000}>1m</option>
                <option value={300000}>5m</option>
                <option value={900000}>15m</option>
                <option value={3600000}>1h</option>
              </select>
              <Clock size={12} className="text-slate-500 mr-2" />
            </div>

            <button
              onClick={onClose}
              className="relative z-50 p-2 text-slate-500 hover:text-white transition-all cursor-pointer active:scale-95 rounded-lg hover:bg-white/5 flex-shrink-0"
            >
              <X size={20} className="sm:size-6" />
            </button>
          </div>
        </div>

        {/* 1.1 Notification Banner (Phase 4.3 Sync) */}
        {notification && (
          <div 
            className="h-10 flex-shrink-0 flex items-center px-6 gap-3 animate-in slide-in-from-top-full duration-500 overflow-hidden" 
            style={{ 
              backgroundColor: notification.type === 'exec' ? "rgba(16, 185, 129, 0.1)" : `${currentThemeHex}15`,
              borderBottom: `1px solid ${notification.type === 'exec' ? "rgba(16, 185, 129, 0.2)" : `${currentThemeHex}33`}`
            }}
          >
            {notification.type === 'exec' ? <CheckCircle2 size={14} className="text-emerald-500" /> : <BellRing size={14} style={{ color: currentThemeHex }} />}
            <span className="text-[10px] font-black tracking-widest text-white uppercase flex-1 truncate">
              {notification.message}
            </span>
            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 flex-shrink-0">
              <TrendingUp size={10} />
              REAL-TIME SYNC
            </div>
          </div>
        )}

        {/* Tab Switcher Bar */}
        <div
          className={`flex items-center justify-start sm:justify-center border-b ${currentThemeBorder}/10 p-1 overflow-x-auto no-scrollbar scroll-smooth`}
          style={{ backgroundColor: `${currentThemeHex}0A` }}
        >
          <div className="flex items-center gap-1">
            {[
              { id: "dashboard", label: "DASHBOARD" },
              { id: "debate", label: "DEBATE" },
              { id: "backtest", label: "BACKTEST" },
              { id: "strategy", label: "STRATEGY" },
              { id: "config", label: "CONFIG", icon: Wrench },
              {
                id: "ranking",
                label: "RANK",
                icon: Trophy,
                color: "text-amber-400",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 sm:px-4 py-1.5 rounded text-[10px] sm:text-xs font-bold tracking-wider transition-all whitespace-nowrap border border-transparent flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "text-white shadow-[0_0_15px_rgba(0,0,0,0.2)]"
                    : tab.color || "text-slate-500 hover:text-slate-300"
                }`}
                style={
                  activeTab === tab.id
                    ? {
                        backgroundColor: `${currentThemeHex}40`,
                        borderColor: `${currentThemeHex}80`,
                      }
                    : {}
                }
              >
                {tab.icon && <tab.icon size={12} />}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Main Content Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

          <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
            <div className="h-full">
              {activeTab === "dashboard" && (
                <div className="p-3 sm:p-4 h-full">
                  <TradingDashboard theme={theme} />
                </div>
              )}
              {activeTab === "debate" && (
                <div className="p-3 sm:p-4 h-full">
                  <DebateArena theme={theme} />
                </div>
              )}
              {activeTab === "backtest" && (
                <div className="p-3 sm:p-4 h-full">
                  <BacktestPage theme={theme} />
                </div>
              )}
              {activeTab === "strategy" && (
                <div className="p-3 sm:p-4 h-full">
                  <StrategyBuilder theme={theme} />
                </div>
              )}
              {activeTab === "config" && (
                <AITradersPage onClose={() => setActiveTab("dashboard")} />
              )}
              {activeTab === "ranking" && <CompetitionPage theme={theme} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
