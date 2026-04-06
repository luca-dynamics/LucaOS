import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import MarketChart from "./dashboard/MarketChart";
import EquityChart from "./dashboard/EquityChart";
import RecentDecisions, { DecisionCycle } from "./dashboard/RecentDecisions";
import PositionsTable, { Position } from "./dashboard/PositionsTable";
import OrderEntry from "./dashboard/OrderEntry";
import SymbolSelector from "./dashboard/SymbolSelector";
import MacroStats from "./dashboard/MacroStats";
import { tradingService } from "../../services/tradingService";
import { eventBus } from "../../services/eventBus";
import { useMarketStream } from "../../hooks/useMarketStream";
import { equityTracker, EquitySnapshot } from "../../services/equityTracker";

interface TradingDashboardProps {
  theme?: { hex: string; primary: string; border: string; bg: string; isLight?: boolean };
}

export default function TradingDashboard({ theme }: TradingDashboardProps) {
  // State
  const [metrics, setMetrics] = useState({
    totalEquity: 0,
    availableBalance: 0,
    dailyPnL: 0,
    dailyPnLPercent: 0,
    activePositions: 0,
    marginUsage: 0,
  });
  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [cycles, setCycles] = useState<DecisionCycle[]>([]);
  const [activeSymbol, setActiveSymbol] = useState("BTC/USDT");
  const [showSymbolSelector, setShowSymbolSelector] = useState(false);
  const [chartTab, setChartTab] = useState<"market" | "equity">("market");
  const [equityHistory, setEquityHistory] = useState<EquitySnapshot[]>([]);

  // Real-time Market Stream
  const [activeProvider, setActiveProvider] = useState<string>("binance");
  const { ticker } = useMarketStream(activeProvider, activeSymbol);

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
      const exchanges = await tradingService.getConnectedExchanges();

      if (exchanges.length > 0) {
        // Use the first active exchange's provider for the stream
        const firstActive = exchanges[0];
        setActiveProvider(firstActive.provider.toLowerCase());
      } else {
        // If not connected, we stay on binance for demo prices or show not connected
        setActiveProvider("binance");
      }

      const [balanceData, positionsData, historyData, debatesData] =
        await Promise.all([
          tradingService.getBalance(),
          tradingService.getPositions(),
          tradingService.getTradeHistory(),
          tradingService.getDebates(),
        ]);

      // Map service positions to UI Positions
      const activePositions: Position[] = Array.isArray(positionsData)
        ? positionsData.map((p: any) => ({
            id: p.id,
            symbol: p.symbol,
            side: p.side,
            size: p.amount,
            entryPrice: p.entryPrice,
            markPrice: p.markPrice,
            leverage: p.leverage,
            liquidationPrice: p.liquidPrice,
            unrealizedPnL: p.unrealizedPnl,
            pnlPercent:
              parseFloat(
                (
                  (p.unrealizedPnl / ((p.amount * p.entryPrice) / p.leverage)) *
                  100
                ).toFixed(2),
              ) || 0,
          }))
        : [];

      const totalUnrealizedPnL = activePositions.reduce(
        (sum, p) => sum + p.unrealizedPnL,
        0,
      );

      // Record snapshot (Phase 22)
      if (balanceData?.total) {
        await equityTracker.recordSnapshot({
          totalEquity: balanceData.total,
          availableBalance: balanceData.free,
          unrealizedPnL: totalUnrealizedPnL,
          positionCount: activePositions.length,
          marginUsagePct:
            balanceData.total > 0
              ? ((balanceData.total - balanceData.free) / balanceData.total) *
                100
              : 0,
        } as any);
      }

      // Fetch history for the chart
      const history = await equityTracker.getHistory();
      setEquityHistory(history);

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
                    action: (d.consensus.verdict || "")
                      .toUpperCase()
                      .replace("OPEN_", ""),
                    confidence: d.consensus.confidence,
                  },
                ]
              : [],
          }))
        : [];

      setPositions(activePositions);
      setHistory(historyData);
      setCycles(processedCycles);
      setMetrics({
        totalEquity: balanceData?.total || 0,
        availableBalance: balanceData?.free || 0,
        dailyPnL: totalUnrealizedPnL,
        dailyPnLPercent:
          (balanceData?.total || 0) > 0
            ? (totalUnrealizedPnL / balanceData.total) * 100
            : 0,
        activePositions: activePositions.length,
        marginUsage:
          (balanceData?.total || 0) > 0
            ? ((balanceData.total - balanceData.free) / balanceData.total) * 100
            : 0,
      });
    } catch (error) {
      console.error("Dashboard Load Error:", error);
    }
  };

  const handlePlaceOrder = async (order: any) => {
    const result = await tradingService.executeOrder(activeProvider, order);
    if (result.success || result.orderId) {
      setTimeout(loadDashboardData, 1000);
    }
  };

  const handleClosePosition = async (symbol: string) => {
    if (!confirm(`Are you sure you want to close ${symbol}?`)) return;
    const result = await tradingService.closePosition(activeProvider, symbol);
    if (result.success || result.id) {
      setTimeout(loadDashboardData, 1000);
    }
  };

  const isLight = theme?.isLight;

  return (
    <div className={`flex flex-col h-full ${isLight ? "bg-slate-50 text-slate-900" : "bg-[#050505] text-white"} font-sans overflow-hidden transition-colors duration-500`}>
      {/* Macro Stats Section */}
      <div className={`px-3 pt-3 flex-shrink-0 ${isLight ? "bg-white/50" : "bg-transparent"} border-b ${isLight ? "border-slate-200" : "border-white/5"}`}>
        <MacroStats metrics={metrics} theme={theme} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* Left Column: Chart & Summary (Col 1-8) */}
        <div className="col-span-8 flex flex-col gap-3 overflow-hidden h-full">
          {/* Market Chart Container */}
          <div className={`flex-[4.5] glass-card-premium liquid-border p-0.5 overflow-hidden rounded-xl ${isLight ? "bg-white shadow-xl shadow-slate-200/50" : "bg-white/[0.03] border-white/5 shadow-2xl shadow-black/50"}`}>
            <div 
              className="w-full h-full flex flex-col relative overflow-hidden transition-all duration-500 rounded-lg"
              style={{ backgroundColor: isLight ? "rgba(248,250,252,1)" : "rgba(255,255,255,0.02)" }}
            >
              <div className={`px-4 py-1 border-b ${isLight ? "border-black/5" : "border-white/5"} flex items-center justify-between flex-shrink-0`}>
                <div
                  className="flex items-center gap-2 cursor-pointer group px-2 py-1 rounded hover:bg-slate-500/5 transition-colors"
                  onClick={() => setShowSymbolSelector(true)}
                >
                  <Icon
                    name="Chart"
                    size={14}
                    variant="BoldDuotone"
                    color={theme?.hex || "#0ea5e9"}
                  />
                  <span 
                    className={`text-[11px] font-bold uppercase tracking-widest transition-colors ${isLight ? "text-slate-600" : "text-white/80"}`}
                    style={{ color: "" }}
                    onMouseEnter={(e) => e.currentTarget.style.color = theme?.hex || ""}
                    onMouseLeave={(e) => e.currentTarget.style.color = ""}
                  >
                    {activeSymbol} Perpetual
                  </span>
                  <Icon 
                    name="AltArrowDown" 
                    size={12} 
                    color={isLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.4)"} 
                    className="transition-colors" 
                    onMouseEnter={(e) => e.currentTarget.style.color = theme?.hex + "99"}
                    onMouseLeave={(e) => e.currentTarget.style.color = ""}
                  />
                </div>

                <div className={`h-4 w-px ${isLight ? "bg-slate-200" : "bg-white/10"} mx-2`} />

                {/* Chart Tabs (Matching NoFx) */}
                <div className="flex gap-1">
                  <button
                    onClick={() => setChartTab("equity")}
                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded transition-all ${
                      chartTab === "equity"
                        ? `${isLight ? "text-white" : "bg-emerald-500/20 text-emerald-500 border border-emerald-500/20"}`
                        : `${isLight ? "text-slate-400 hover:text-slate-600" : "text-white/40 hover:text-white/60"}`
                    }`}
                    style={chartTab === "equity" && isLight ? { 
                      backgroundColor: theme?.hex || "#0ea5e9",
                      boxShadow: `0 0 15px ${theme?.hex || "#0ea5e9"}4d`
                    } : {}}
                  >
                    Account Equity Curve
                  </button>
                  <button
                    onClick={() => setChartTab("market")}
                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded transition-all ${
                      chartTab === "market"
                        ? `${isLight ? "text-white" : "bg-emerald-500/20 text-emerald-500 border border-emerald-500/20"}`
                        : `${isLight ? "text-slate-400 hover:text-slate-600" : "text-white/40 hover:text-white/60"}`
                    }`}
                    style={chartTab === "market" && isLight ? { 
                      backgroundColor: theme?.hex || "#0ea5e9",
                      boxShadow: `0 0 15px ${theme?.hex || "#0ea5e9"}4d`
                    } : {}}
                  >
                    Market Chart
                  </button>
                </div>

                <div className={`flex items-center gap-3 text-[10px] font-mono ${isLight ? "text-slate-500" : "text-white/30"}`}>
                  <span
                    className={
                      (ticker?.change ?? 0) >= 0
                        ? "text-emerald-500 font-bold"
                        : "text-rose-500 font-bold"
                    }
                  >
                    $
                    {ticker?.price?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    }) || "---"}
                  </span>
                  <span className="opacity-60">
                    {(ticker?.change ?? 0) >= 0 ? "+" : ""}
                    {(ticker?.change ?? 0).toFixed(2)}%
                  </span>
                </div>
              </div>

              {showSymbolSelector && (
                <div className="absolute top-10 left-4 z-50 w-72 h-[420px] animate-in fade-in slide-in-from-top-2">
                  <SymbolSelector
                    activeSymbol={activeSymbol}
                    onSelect={(sym) => {
                      setActiveSymbol(sym);
                      setShowSymbolSelector(false);
                    }}
                    onClose={() => setShowSymbolSelector(false)}
                    theme={theme}
                  />
                </div>
              )}

              <div className="flex-1 relative overflow-hidden">
                {chartTab === "market" ? (
                  <MarketChart
                    symbol={activeSymbol}
                    theme={theme}
                  />
                ) : (
                  <EquityChart
                    theme={theme}
                    height="100%"
                    data={equityHistory}
                    metrics={metrics}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Positions Table Container */}
          <div className={`flex-[1.5] glass-card-premium liquid-border p-0.5 overflow-hidden rounded-xl ${isLight ? "bg-white shadow-xl shadow-slate-200/50" : "bg-white/[0.03] border-white/5 shadow-2xl shadow-black/50"}`}>
            <div 
              className="w-full h-full flex flex-col transition-all duration-500 rounded-lg overflow-hidden"
              style={{ backgroundColor: isLight ? "rgba(248,250,252,1)" : "rgba(255,255,255,0.02)" }}
            >
              <PositionsTable
                positions={positions}
                history={history}
                onClosePosition={handleClosePosition}
                theme={theme}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Order Entry & Recent Decisions (Col 9-12) */}
        <div className="col-span-4 flex flex-col gap-3 overflow-hidden h-full">
          {/* Order Entry */}
          <div className={`h-auto glass-card-premium liquid-border p-0.5 rounded-xl ${isLight ? "bg-white shadow-xl shadow-slate-200/50" : "bg-white/[0.03] border-white/5 shadow-2xl shadow-black/50"}`}>
            <div 
              className="w-full transition-all duration-500 rounded-lg overflow-hidden"
              style={{ backgroundColor: isLight ? "rgba(248,250,252,1)" : "rgba(255,255,255,0.02)" }}
            >
              <OrderEntry
                activeSymbol={activeSymbol}
                onPlaceOrder={handlePlaceOrder}
                theme={theme}
              />
            </div>
          </div>

          {/* Recent Decisions */}
          <div className={`flex-1 glass-card-premium liquid-border p-0.5 overflow-hidden rounded-xl ${isLight ? "bg-white shadow-xl shadow-slate-200/50" : "bg-white/[0.03] border-white/5 shadow-2xl shadow-black/50"}`}>
            <div 
              className={`w-full h-full overflow-hidden transition-all duration-500 rounded-lg ${isLight ? "bg-slate-50/80" : ""}`}
              style={{ backgroundColor: isLight ? "rgba(248,250,252,0.9)" : "rgba(255,255,255,0.02)" }}
            >
              <RecentDecisions cycles={cycles} theme={theme} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
