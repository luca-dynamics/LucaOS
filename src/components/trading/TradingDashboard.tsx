import React, { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
const {
  Zap,
  Settings,
  TrendingUp,
} = LucideIcons as any;
import MarketChart from "./dashboard/MarketChart";
import RecentDecisions, { DecisionCycle } from "./dashboard/RecentDecisions";
import PositionsTable, { Position } from "./dashboard/PositionsTable";
import OrderEntry from "./dashboard/OrderEntry";
import { tradingService } from "../../services/tradingService";
import { eventBus } from "../../services/eventBus";
import { modelShadowService } from "../../services/ai/ModelShadowService";

interface TradingDashboardProps {
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function TradingDashboard({ theme }: TradingDashboardProps) {
  // State
  const [balance, setBalance] = useState<any>(null);
  const [metrics, setMetrics] = useState({
    totalEquity: 0,
    availableBalance: 0,
    dailyPnL: 0,
    dailyPnLPercent: 0,
    activePositions: 0,
    marginUsage: 0,
  });
  const [positions, setPositions] = useState<Position[]>([]);
  const [cycles, setCycles] = useState<DecisionCycle[]>([]);
  const [shadowDrift, setShadowDrift] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000); 
    eventBus.on("TRADE_EXECUTED", loadDashboardData);
    eventBus.on("TRADE_PROPOSED", loadDashboardData);

    return () => {
      clearInterval(interval);
      eventBus.off("TRADE_EXECUTED", loadDashboardData);
      eventBus.off("TRADE_PROPOSED", loadDashboardData);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      await tradingService.getConnectedExchanges();

      const [balanceData, positionsData, debatesData] = await Promise.all([
        tradingService.getBalance(),
        tradingService.getPositions(),
        tradingService.getDebates(),
      ]);

      const realBalance = balanceData || { total: 0, free: 0, pnl24h: 0 };
      setBalance(realBalance);

      // Map service positions to UI Positions
      const activePositions: Position[] = Array.isArray(positionsData) ? positionsData.map((p: any) => ({
        id: p.id,
        symbol: p.symbol,
        side: p.side,
        size: p.amount,
        entryPrice: p.entryPrice,
        markPrice: p.markPrice,
        leverage: p.leverage,
        liquidationPrice: p.liquidPrice,
        unrealizedPnL: p.unrealizedPnl,
        pnlPercent: parseFloat(((p.unrealizedPnl / (p.amount * p.entryPrice / p.leverage)) * 100).toFixed(2)) || 0,
      })) : [];

      const totalUnrealizedPnL = activePositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);

      const processedCycles: DecisionCycle[] = Array.isArray(debatesData)
        ? debatesData.map((d: any) => ({
            id: d.id,
            cycleNumber: d.cycleNumber || 0,
            timestamp: new Date(d.createdAt).toLocaleString(),
            status: d.status === "completed" ? "success" : d.status,
            decisions: d.consensus
              ? [
                  {
                    symbol: d.symbol,
                    action: d.consensus.verdict.toUpperCase().replace("OPEN_", ""),
                    reasoning: `Confidence: ${d.consensus.confidence}%`,
                  },
                ]
              : [],
            chainOfThought: d.messages?.map((m: any) => m.content.substring(0, 100) + "...") || [],
          }))
        : [];

      setPositions(activePositions);
      setCycles(processedCycles);
      setMetrics({
        totalEquity: realBalance.total || 0,
        availableBalance: realBalance.free || 0,
        dailyPnL: totalUnrealizedPnL,
        dailyPnLPercent: realBalance.total > 0 ? (totalUnrealizedPnL / realBalance.total) * 100 : 0,
        activePositions: activePositions.length,
        marginUsage: realBalance.total > 0 ? ((realBalance.total - realBalance.free) / realBalance.total) * 100 : 0,
      });

      // Fetch Shadow Drift (Phase 14)
      const drift = modelShadowService.getModelDriftReport("live_session");
      setShadowDrift(drift);
    } catch (error) {
      console.error("Dashboard Load Error:", error);
    }
  };

  const handlePlaceOrder = async (order: any) => {
    const exchanges = await tradingService.getConnectedExchanges();
    const activeExchange = exchanges[0]?.id || "Binance";
    const result = await tradingService.executeOrder(activeExchange, order);
    if (result.success || result.orderId) {
      setTimeout(loadDashboardData, 1000);
    }
  };

  const handleClosePosition = async (symbol: string) => {
    if (!confirm(`Are you sure you want to close ${symbol}?`)) return;
    const exchanges = await tradingService.getConnectedExchanges();
    const activeExchange = exchanges[0]?.id || "Binance";
    const result = await tradingService.closePosition(activeExchange, symbol);
    if (result.success || result.id) {
      setTimeout(loadDashboardData, 1000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white font-sans overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm"
            style={{ 
              backgroundColor: theme ? `${theme.hex}33` : "rgba(6,182,212,0.2)",
              borderColor: theme ? `${theme.hex}66` : "rgba(6,182,212,0.4)",
              boxShadow: theme ? `0 0 15px ${theme.hex}4d` : "0 0 15px rgba(6,182,212,0.3)"
            }}
          >
            <Zap 
              className="w-5 h-5" 
              style={{ color: theme?.hex || "#22d3ee" }}
            />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-white uppercase">LucaOS Trading Dashboard</h1>
            <div className="flex items-center gap-2">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-400/80 font-mono uppercase tracking-widest leading-none">Market Live</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-white/40 uppercase tracking-tighter">Account Balance</span>
            <span className="text-sm font-mono font-bold text-white tracking-widest">
              ${balance?.total.toLocaleString() || "0.00"}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-white/40 uppercase tracking-tighter">24h PnL</span>
            <span className={`text-sm font-mono font-bold tracking-widest ${metrics.dailyPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {metrics.dailyPnL >= 0 ? "+" : ""}${metrics.dailyPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Model Drift Indicator (Phase 14) */}
          {shadowDrift.length > 0 && (
            <div className="flex flex-col items-end border-l border-white/10 pl-4">
              <span className="text-[9px] text-white/40 uppercase tracking-tighter">Cortex Drift</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-yellow-500">
                  {shadowDrift[0].modelId}: {shadowDrift[0].driftPct.toFixed(1)}%
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
              </div>
            </div>
          )}
          <button className="p-1.5 hover:bg-white/5 rounded-md transition-colors border border-white/5">
            <Settings className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* Left Column: Chart & Summary (Col 1-8) */}
        <div className="col-span-8 flex flex-col gap-3 overflow-hidden">
          {/* Market Chart Container */}
          <div className="flex-[3] glass-card-premium liquid-border p-0.5">
            <div className="w-full h-full bg-[#0a0a0a]/80 flex flex-col">
              <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp 
                    className="w-4 h-4" 
                    style={{ color: theme?.hex || "#22d3ee" }}
                  />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">BTC/USDT Perpetual</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="text-emerald-400">$64,120.40</span>
                  <span className="text-white/30">Vol: 1.2B</span>
                </div>
              </div>
              <div className="flex-1 p-2">
                <MarketChart theme={theme} />
              </div>
            </div>
          </div>

          {/* Positions Table Container */}
          <div className="flex-[2] glass-card-premium liquid-border p-0.5">
            <div className="w-full h-full bg-[#0a0a0a]/80 flex flex-col">
              <PositionsTable 
                positions={positions} 
                onClosePosition={handleClosePosition}
                theme={theme}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Order Entry & Recent Decisions (Col 9-12) */}
        <div className="col-span-4 flex flex-col gap-3 overflow-hidden">
          {/* Order Entry */}
          <div className="h-auto glass-card-premium liquid-border p-0.5">
             <div className="w-full bg-[#0a0a0a]/80">
              <OrderEntry 
                activeSymbol={positions[0]?.symbol || "BTC/USDT"}
                onPlaceOrder={handlePlaceOrder}
                theme={theme}
              />
             </div>
          </div>

          {/* Recent Decisions */}
          <div className="flex-1 glass-card-premium liquid-border p-0.5">
            <div className="w-full h-full bg-[#0a0a0a]/80">
              <RecentDecisions 
                cycles={cycles}
                theme={theme}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
