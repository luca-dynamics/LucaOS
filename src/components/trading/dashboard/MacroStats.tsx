import React from "react";
import { Icon } from "../../ui/Icon";

interface MacroStatsProps {
  metrics: {
    totalEquity: number;
    availableBalance: number;
    dailyPnL: number;
    dailyPnLPercent: number;
    activePositions: number;
    marginUsage: number;
  };
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function MacroStats({ metrics }: MacroStatsProps) {
  const stats = [
    {
      label: "Total Equity",
      value: `$${metrics.totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: "Wallet",
      color: "text-white",
    },
    {
      label: "Available",
      value: `$${metrics.availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: "LockUnlock",
      color: "text-white/70",
    },
    {
      label: "24h PnL",
      value: `${metrics.dailyPnL >= 0 ? "+" : ""}$${Math.abs(metrics.dailyPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subValue: `${metrics.dailyPnLPercent >= 0 ? "+" : ""}${metrics.dailyPnLPercent.toFixed(2)}%`,
      icon: "TrendUp",
      color: metrics.dailyPnL >= 0 ? "text-emerald-400" : "text-rose-400",
      accent: metrics.dailyPnL >= 0 ? "emerald" : "rose",
    },
    {
      label: "Active Positions",
      value: metrics.activePositions,
      icon: "Widget",
      color: "text-white",
    },
    {
      label: "Margin Usage",
      value: `${metrics.marginUsage.toFixed(1)}%`,
      icon: "ShieldCheck",
      color: metrics.marginUsage > 80 ? "text-orange-400" : "text-white/60",
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-2 w-full">
      {stats.map((stat, i) => (
        <div 
          key={i} 
          className="bg-black/20 glass-blur border border-white/5 rounded-lg p-2 flex flex-col h-[45px] relative overflow-hidden group hover:bg-white/[0.03] transition-all duration-500 hover:border-white/10"
        >
          {/* Subtle background glow based on stat color */}
          <div 
            className={`absolute -right-4 -top-4 w-12 h-12 rounded-full blur-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-700 ${
              stat.accent === "emerald" ? "bg-emerald-500" : stat.accent === "rose" ? "bg-rose-500" : "bg-white"
            }`}
          />

          <div className="flex items-center justify-between relative z-10 mb-auto">
            <span className="text-[8px] uppercase tracking-[0.1em] text-white/30 font-black group-hover:text-white/50 transition-colors">
              {stat.label}
            </span>
            <Icon name={stat.icon as any} variant="BoldDuotone" size={9} className="text-white/10 group-hover:text-white/30 transition-colors" />
          </div>

          <div className="flex items-baseline gap-1.5 relative z-10 -mt-1">
            <span className={`text-base font-mono font-bold tracking-tight ${stat.color} drop-shadow-[0_0_8px_rgba(255,255,255,0.05)]`}>
              {stat.value}
            </span>
            {stat.subValue && (
              <span className={`text-[8px] font-mono font-bold ${stat.color} opacity-60`}>
                {stat.subValue}
              </span>
            )}
          </div>

          {/* Bottom highlight bar for all cards with varying intensity */}
          <div 
            className={`absolute bottom-0 left-0 right-0 h-[1.5px] transition-all duration-500 ${
              stat.accent === "emerald" 
                ? "bg-emerald-400/30 group-hover:h-[2px] group-hover:bg-emerald-400/50 shadow-[0_0_10px_rgba(52,211,153,0.2)]" 
                : stat.accent === "rose" 
                ? "bg-rose-400/30 group-hover:h-[2px] group-hover:bg-rose-400/50 shadow-[0_0_10px_rgba(244,63,94,0.2)]" 
                : "bg-white/5 group-hover:bg-white/10"
            }`} 
          />
        </div>
      ))}
    </div>
  );
}
