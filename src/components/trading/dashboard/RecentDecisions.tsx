import React, { useState } from "react";
import * as LucideIcons from "lucide-react";
const {
  Brain,
  ChevronDown,
  Check,
  Zap,
} = LucideIcons as any;

export interface DecisionCycle {
  id: string;
  cycleNumber: number;
  timestamp: string;
  status: "success" | "pending" | "failed";
  decisions: {
    symbol: string;
    action: "HOLD" | "BUY" | "SELL" | "Short" | "Long";
    reasoning?: string;
  }[];
  chainOfThought: string[];
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
  const [expandedCycles, setExpandedCycles] = useState<Record<string, boolean>>(
    cycles.length > 0 ? { [cycles[0].id]: true } : {}
  );

  const toggleCycle = (id: string) => {
    setExpandedCycles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={`${themeCardBg} flex flex-col h-full overflow-hidden`}>
      <div className="p-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={14} style={{ color: theme?.hex || "#818cf8" }} />
          <h3 className="font-bold text-[10px] text-white uppercase tracking-widest">Logic Stream</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[8px] px-1.5 py-0.5 rounded border border-white/10 bg-black/20 text-slate-500 font-bold uppercase transition-all hover:bg-white/5">
          <Zap size={8} className="text-amber-400 animate-pulse" />
          Live Reasoning
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {cycles.length === 0 && (
          <div className="text-center py-10 text-slate-600 text-[10px] uppercase tracking-tighter">
            Waiting for next decision cycle...
          </div>
        )}
        {cycles.map((cycle) => (
          <div
            key={cycle.id}
            className="border border-white/5 rounded-lg bg-white/[0.02] overflow-hidden transition-all hover:bg-white/[0.04]"
          >
            <div
              className="p-2 flex justify-between items-center cursor-pointer"
              onClick={() => toggleCycle(cycle.id)}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">#{cycle.cycleNumber || cycle.id.substring(0,4)}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${cycle.status === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500'}`}></span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] text-white/30 font-mono">{cycle.timestamp.split(',')[1] || cycle.timestamp}</span>
                <ChevronDown
                  size={12}
                  className={`text-slate-600 transition-transform ${expandedCycles[cycle.id] ? "rotate-180" : ""}`}
                />
              </div>
            </div>

            {expandedCycles[cycle.id] && (
              <div className="px-3 pb-3 space-y-3">
                <div className="space-y-1 mt-1">
                  {cycle.chainOfThought.map((thought, idx) => (
                    <div key={idx} className="flex gap-2 text-[10px] text-slate-500 font-mono leading-relaxed">
                      <span className="mt-1" style={{ color: theme ? `${theme.hex}80` : "rgba(99,102,241,0.5)" }}>↳</span>
                      <span>{thought}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-1">
                  {cycle.decisions.map((decision, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[10px] bg-white/[0.03] p-1.5 rounded-md border border-white/5">
                      <span className="font-bold text-slate-300">{decision.symbol}</span>
                      <span className={`uppercase font-bold ${(decision.action === 'BUY' || decision.action === 'Long') ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {decision.action}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-[9px] text-slate-600 border-t border-white/5 pt-2">
                  <div className="flex items-center gap-1"><Check size={10} className="text-emerald-500" /> 240ms</div>
                  <div className="flex items-center gap-1"><Check size={10} className="text-emerald-500" /> Protocol-7 Verified</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
