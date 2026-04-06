import React from "react";
import { Icon } from "../../ui/Icon";

export interface DecisionCycle {
  id: string;
  cycleNumber: number;
  timestamp: string;
  status: "success" | "pending" | "failed";
  decisions: {
    symbol: string;
    action: string;
    confidence: number;
  }[];
}

interface RecentDecisionsProps {
  themeCardBg?: string;
  cycles: DecisionCycle[];
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function RecentDecisions({
  themeCardBg = "bg-transparent",
  cycles = [],
  theme,
}: RecentDecisionsProps) {
  const primaryColor = theme?.hex || "#0ea5e9";

  return (
    <div className={`${themeCardBg} flex flex-col h-full overflow-hidden`}>
      <div className="p-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon
            name="Cyber"
            variant="BoldDuotone"
            size={14}
            style={{ color: primaryColor }}
          />
          <h3 className="font-bold text-[10px] text-white uppercase tracking-widest">
            AI Logic Stream
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[8px] px-1.5 py-0.5 rounded border border-white/10 bg-black/20 text-slate-500 font-bold uppercase">
          <Icon
            name="Bolt"
            variant="BoldDuotone"
            size={8}
            className="text-amber-400 animate-pulse"
          />
          Live
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {cycles.length === 0 && (
          <div className="text-center py-10 text-slate-600 text-[10px] uppercase tracking-tighter">
            Waiting for next tactical pulse...
          </div>
        )}
        {cycles.map((cycle) => (
          <div
            key={cycle.id}
            className="border border-white/5 rounded bg-white/[0.02] p-2 flex items-center justify-between hover:bg-white/[0.04] transition-all"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-1 h-8 rounded-full ${cycle.status === "success" ? "bg-emerald-500/40" : "bg-amber-500/40"}`}
              />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">
                  Event #{cycle.cycleNumber || "---"}
                </span>
                <span className="text-[8px] font-mono text-white/20">
                  {cycle.timestamp.split(",")[1] || cycle.timestamp}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              {cycle.decisions.map((decision, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[11px] font-black tracking-tighter text-white">
                    {decision.symbol}
                  </span>
                  <div
                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                      decision.action === "BUY" || decision.action === "LONG"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : decision.action === "SELL" ||
                            decision.action === "SHORT"
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-white/5 text-white/40"
                    }`}
                  >
                    {decision.action}
                  </div>
                  <span className="text-[9px] font-mono text-white/30">
                    {decision.confidence}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
