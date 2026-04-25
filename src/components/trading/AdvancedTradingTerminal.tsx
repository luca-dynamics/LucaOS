import React, { useState } from "react";
import DebateArena from "./DebateArena";
import BacktestPage from "./BacktestPage";
import StrategyBuilder from "./StrategyBuilder";
import TradingDashboard from "./TradingDashboard";
import TradingSettings from "./TradingSettings";
import AITradersPage from "./AITradersPage";
import CompetitionPage from "./CompetitionPage";
import { Icon } from "../ui/Icon";
import { tradingLoopService } from "../../services/tradingLoopService";
import eventBus from "../../services/eventBus";

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
    "dashboard" | "debate" | "backtest" | "strategy" | "config" | "ranking" | "settings"
  >("dashboard");

  const currentThemeBorder = theme?.border || "border-[#0ea5e9]";
  const currentThemeHex = theme?.hex || "#0ea5e9";

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

    const handleOpenSettings = () => {
      setActiveTab("settings");
    };

    eventBus.on("TRADE_EXECUTED", handleExecuted);
    eventBus.on("TRADE_PROPOSED", handleProposed);
    eventBus.on("OPEN_TRADING_SETTINGS", handleOpenSettings);

    return () => {
      eventBus.off("TRADE_EXECUTED", handleExecuted);
      eventBus.off("TRADE_PROPOSED", handleProposed);
      eventBus.off("OPEN_TRADING_SETTINGS", handleOpenSettings);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 glass-blur-heavy animate-in fade-in duration-500 font-mono p-0 sm:p-4 overflow-hidden">
      <div
        className={`relative w-full h-full sm:h-[94vh] sm:w-[98%] max-w-[1700px] bg-white/[0.02] border-none sm:border rounded-none sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl transition-all duration-700 glass-blur`}
        style={{ 
          boxShadow: `0 0 100px ${currentThemeHex}15, inset 0 0 40px ${currentThemeHex}05`,
          borderColor: "rgba(255,255,255,0.05)"
        }}
      >
        <div
          className="absolute inset-0 opacity-60 pointer-events-none transition-all duration-700 -z-10"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${currentThemeHex}15, transparent 70%)`,
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute inset-0 opacity-40 pointer-events-none transition-all duration-700 -z-10"
          style={{
            background: `radial-gradient(circle at 80% 20%, ${currentThemeHex}10, transparent 60%)`,
            filter: "blur(60px)",
          }}
        />

        {/* 1. Header Bar (Consolidated Navigation) */}
        <div
          className={`h-16 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-2 sm:px-6 relative z-10`}
          style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
        >
          <div className="flex items-center gap-4">
            {/* Logo/Title Section */}
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm flex-shrink-0"
                style={{ 
                  backgroundColor: `${currentThemeHex}33`,
                  borderColor: `${currentThemeHex}66`,
                  boxShadow: `0 0 15px ${currentThemeHex}4d`
                }}
              >
                <div 
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: currentThemeHex }}
                >
                  <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                </div>
              </div>
              <h1 className="text-sm font-black tracking-[0.1em] text-white uppercase whitespace-nowrap">
                LucaOS <span style={{ color: currentThemeHex }}>TRADE CENTER</span>
              </h1>
            </div>

            {/* Vertical Divider */}
            <div className="h-6 w-[1px] bg-white/20 hidden sm:block" />

            {/* Consolidated Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
              {[
                { id: "dashboard", label: "DASHBOARD" },
                { id: "debate", label: "DEBATE" },
                { id: "backtest", label: "BACKTEST" },
                { id: "strategy", label: "STRATEGY" },
                { id: "config", label: "CONFIG", icon: "Wrench" },
                { id: "settings", label: "SETTINGS", icon: "ShieldAlert" },
                {
                  id: "ranking",
                  label: "RANK",
                  icon: "Trophy",
                  color: "text-amber-400",
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-2 sm:px-3 py-1.5 rounded text-[10px] sm:text-xs font-bold tracking-[0.05em] transition-all whitespace-nowrap border border-transparent flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? "text-white shadow-[0_0_15px_rgba(0,0,0,0.2)]"
                      : tab.color || "text-slate-500 hover:text-slate-300"
                  }`}
                  style={
                    activeTab === tab.id
                      ? {
                          backgroundColor: `${currentThemeHex}15`,
                          borderColor: `${currentThemeHex}33`,
                          color: "white"
                        }
                      : {}
                  }
                >
                  <Icon name={tab.icon || "WidgetAdd"} size={12} variant={activeTab === tab.id ? "Bold" : "BoldDuotone"} color={activeTab === tab.id ? currentThemeHex : ""} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white/[0.03] border border-white/5 rounded-xl px-1.5 py-1.5 gap-1 shadow-inner glass-blur">
              <button
                onClick={toggleAutoResearch}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all duration-500 group relative overflow-hidden border ${
                  isAutoResearchActive 
                    ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 shadow-lg shadow-emerald-500/10" 
                    : "text-slate-500 border-white/5 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className={`relative z-10 transition-transform duration-500 ${isAutoResearchActive ? "scale-110" : "opacity-40"}`}>
                  <Icon name="Power" size={11} variant="Bold" />
                </div>
                
                <span className="relative z-10">{isAutoResearchActive ? "AUTOPILOT" : "MANUAL"}</span>

                {isAutoResearchActive && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-1 bg-emerald-400 rounded-full animate-ping" />
                )}
              </button>
              
              <div className="h-4 w-px bg-white/10 mx-1" />
              
              <div className="flex items-center gap-2 text-slate-400 group/timer pr-3 pl-1">
                <Icon name="Clock" size={12} variant="BoldDuotone" className="opacity-30 group-hover/timer:opacity-100 transition-opacity" />
                <select 
                  className="bg-transparent text-[10px] font-mono font-black focus:outline-none cursor-pointer appearance-none hover:text-white transition-colors"
                  value={tradingLoopService.getInterval()}
                  onChange={(e) => tradingLoopService.updateInterval(parseInt(e.target.value))}
                >
                  <option value={60000}>1M</option>
                  <option value={300000}>5M</option>
                  <option value={900000}>15M</option>
                  <option value={3600000}>1H</option>
                </select>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-rose-400 transition-all cursor-pointer active:scale-95 rounded-xl hover:bg-white/5 flex-shrink-0"
            >
              <Icon name="CloseCircle" size={20} variant="BoldDuotone" />
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
            {notification.type === 'exec' ? <Icon name="CheckCircle" size={14} variant="Bold" className="text-emerald-500" /> : <Icon name="Bell" size={14} variant="BoldDuotone" color={currentThemeHex} />}
            <span className="text-[10px] font-black tracking-widest text-white uppercase flex-1 truncate">
              {notification.message}
            </span>
            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 flex-shrink-0">
              <Icon name="Chart" size={10} color="#64748b" />
              REAL-TIME SYNC
            </div>
          </div>
        )}

        {/* 2. Main Content Area */}
        <div className="flex-1 min-h-0 relative flex flex-col">
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {activeTab === "dashboard" && (
              <div className="flex-1 p-2 sm:p-3 min-h-0">
                <TradingDashboard theme={theme} />
              </div>
            )}
            {activeTab === "debate" && (
              <div className="flex-1 p-2 sm:p-3 min-h-0">
                <DebateArena theme={theme} />
              </div>
            )}
            {activeTab === "backtest" && (
              <div className="flex-1 p-2 sm:p-3 min-h-0">
                <BacktestPage />
              </div>
            )}
            {activeTab === "strategy" && (
              <div className="flex-1 p-2 sm:p-3 min-h-0">
                <StrategyBuilder theme={theme} />
              </div>
            )}
            {activeTab === "config" && (
              <div className="flex-1 min-h-0">
                <AITradersPage onClose={() => setActiveTab("dashboard")} />
              </div>
            )}
            {activeTab === "settings" && (
              <div className="flex-1 p-2 sm:p-3 min-h-0">
                <TradingSettings />
              </div>
            )}
            {activeTab === "ranking" && (
              <div className="flex-1 min-h-0">
                <CompetitionPage theme={theme} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
