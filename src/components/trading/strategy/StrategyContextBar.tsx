import React, { useMemo, useState, useEffect } from "react";
import { Icon } from "../../ui/Icon";
import { TradingStrategy } from "../../../types/trading";
import { tradingService } from "../../../services/tradingService";

interface StrategyContextBarProps {
  strategy: TradingStrategy;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function StrategyContextBar({ strategy, theme }: StrategyContextBarProps) {
  const [stats, setStats] = useState({
    winRate: 0,
    totalTrades: 0,
    lastRun: "Never",
  });

  useEffect(() => {
    const fetchStats = async () => {
      const commits = await tradingService.getRecentCommits();
      const strategyCommits = commits.filter(c => c.strategyId === strategy.id);
      
      const wins = strategyCommits.filter(c => (c.pnl || 0) > 0).length;
      const total = strategyCommits.length;
      
      setStats({
        winRate: total > 0 ? (wins / total) * 100 : 0,
        totalTrades: total,
        lastRun: total > 0 
          ? new Date(strategyCommits[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : "Never",
      });
    };
    
    fetchStats();
  }, [strategy.id]);

  const metrics = useMemo(() => [
    {
      label: "Strategy ID",
      value: strategy.id.slice(0, 8).toUpperCase(),
      icon: "ShieldCheck",
      color: "text-slate-500",
    },
    {
      label: "Status",
      value: strategy.isActive ? "Active" : "Idle",
      icon: "Power",
      color: strategy.isActive ? "text-emerald-400" : "text-slate-600",
      animate: strategy.isActive,
    },
    {
      label: "Win Rate",
      value: `${stats.winRate.toFixed(1)}%`,
      icon: "Trophy",
      color: stats.winRate >= 50 ? "text-emerald-400" : "text-rose-400",
    },
    {
      label: "Executed Trades",
      value: stats.totalTrades.toString(),
      icon: "Chart",
      color: "text-white",
    },
    {
      label: "Last Execution Trace",
      value: stats.lastRun,
      icon: "Clock",
      color: "text-white/60",
    },
    {
      label: "Model Variant",
      value: strategy.automation?.aiLearningEnabled ? "Live Adaptive" : "GPT-4o",
      icon: "Brain",
      color: "text-white/70",
    },
  ], [strategy, stats]);

  return (
    <div 
      className="flex w-full h-full gap-0 overflow-x-auto no-scrollbar scroll-smooth flex-1"
      style={{ borderBottom: `1px solid ${theme?.border || "rgba(255,255,255,0.05)"}`, backgroundColor: "transparent" }}
    >
      {metrics.map((metric, i) => (
        <div 
          key={i}
          className="flex flex-col flex-1 min-w-[120px] px-4 py-1.5 border-r border-white/5 last:border-r-0 group hover:bg-white/[0.02] transition-all justify-center"
        >
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[7px] font-black tracking-[0.2em] text-slate-500 group-hover:text-slate-200 transition-colors">
              {metric.label}
            </span>
            <Icon 
              name={metric.icon as any} 
              size={10} 
              className={`${metric.color} opacity-40 group-hover:opacity-100 transition-opacity ${metric.animate ? "animate-pulse" : ""}`} 
            />
          </div>
          <div className={`text-[11px] font-mono font-bold tracking-wider ${metric.color}`}>
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  );
}
