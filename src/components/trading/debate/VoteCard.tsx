import React from "react";
import { Icon } from "../../ui/Icon";
import { DebateVote, TradeAction } from "../../../types/trading";
import { LucaAvatar } from "../../../utils/tradingUI";

interface VoteCardProps {
  vote: DebateVote;
}

const ACTION_CONFIG: Record<
  string,
  { color: string; bg: string; iconName: string; label: string }
> = {
  [TradeAction.OPEN_LONG]: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/20",
    iconName: "TrendingUp",
    label: "LONG",
  },
  [TradeAction.OPEN_SHORT]: {
    color: "text-rose-400",
    bg: "bg-rose-500/20",
    iconName: "TrendingDown",
    label: "SHORT",
  },
  [TradeAction.HOLD]: {
    color: "text-cyan-400",
    bg: "bg-cyan-500/20",
    iconName: "Minus",
    label: "HOLD",
  },
  [TradeAction.WAIT]: {
    color: "text-slate-400",
    bg: "bg-slate-500/20",
    iconName: "Clock",
    label: "WAIT",
  },
  [TradeAction.CLOSE_LONG]: {
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    iconName: "Close",
    label: "CLOSE",
  },
  [TradeAction.CLOSE_SHORT]: {
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    iconName: "Close",
    label: "CLOSE",
  },
};

export default function VoteCard({ vote }: VoteCardProps) {
  const decision = vote.decisions?.[0];
  if (!decision) return null;

  const actionConfig = ACTION_CONFIG[decision.action] || ACTION_CONFIG[TradeAction.WAIT];

  return (
    <div className="bg-[#0a0a0a] rounded-xl p-3.5 border border-white/5 hover:border-white/10 transition-all shadow-xl group">
      {/* 1. Header: Avatar + Name + Action Badge */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <LucaAvatar aiModelId={vote.aiModelName} size={28} />
          <div className="min-w-0">
            <span className="text-white font-bold block text-[13px] leading-tight truncate">
              {vote.aiModelName}
            </span>
            {decision.symbol && (
              <span className="text-[10px] text-slate-500 font-mono tracking-tighter opacity-80">
                {decision.symbol}
              </span>
            )}
          </div>
        </div>

        <span
          className={`flex items-center gap-1.5 px-2 py-1 rounded border border-white/5 text-[10px] font-black tracking-widest ${actionConfig.bg} ${actionConfig.color}`}
        >
          <Icon name={actionConfig.iconName} size={12} variant="BoldDuotone" />
          {actionConfig.label}
        </span>
      </div>

      {/* 2. Confidence Indicator */}
      <div className="mb-4">
        <div className="flex justify-between items-center text-[10px] mb-1.5 font-mono tracking-wider">
           <span className="text-slate-500">Confidence score</span>
           <span className="text-white font-black">{vote.confidence}%</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${
              vote.confidence >= 80 ? "bg-emerald-500" : 
              vote.confidence >= 60 ? "bg-amber-500" : "bg-slate-500"
            }`}
            style={{ 
              width: `${vote.confidence}%`,
              boxShadow: `0 0 10px ${vote.confidence >= 80 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`
            }}
          />
        </div>
      </div>

      {/* 3. High-Density Metrics Grid (2x2) */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-black/20 rounded-sm p-1.5 border border-white/5 flex flex-col">
           <span className="text-[7px] text-slate-500 font-black mb-0.5 tracking-tighter">Leverage</span>
           <span className="text-[11px] text-white font-mono font-bold leading-none">
             {decision.leverage || 1}x
           </span>
        </div>
        <div className="bg-black/20 rounded-sm p-1.5 border border-white/5 flex flex-col">
           <span className="text-[7px] text-slate-500 font-black mb-0.5 tracking-tighter">Allocation</span>
           <span className="text-[11px] text-white font-mono font-bold leading-none">
             {decision.positionPct ? `${(decision.positionPct * 100).toFixed(0)}%` : "0%"}
           </span>
        </div>
        <div className="bg-black/20 rounded-sm p-1.5 border border-white/5 flex flex-col">
           <span className="text-[7px] text-red-500/50 font-black mb-0.5 tracking-tighter">Stop loss</span>
           <span className="text-[11px] text-red-400 font-mono font-bold leading-none">
             {decision.stopLoss ? `${(decision.stopLoss * 100).toFixed(1)}%` : "-"}
           </span>
        </div>
        <div className="bg-black/20 rounded-sm p-1.5 border border-white/5 flex flex-col">
           <span className="text-[7px] text-emerald-500/50 font-black mb-0.5 tracking-tighter">Take profit</span>
           <span className="text-[11px] text-emerald-400 font-mono font-bold leading-none">
             {decision.takeProfit ? `${(decision.takeProfit * 100).toFixed(1)}%` : "-"}
           </span>
        </div>
      </div>

      {/* 4. Reasoning Snippet */}
      {vote.reasoning && (
        <div className="pt-2.5 border-t border-white/5">
          <p className="text-[10px] text-slate-400 leading-relaxed italic line-clamp-2 opacity-70 group-hover:opacity-100 transition-opacity">
            &quot;{vote.reasoning}&quot;
          </p>
        </div>
      )}
    </div>
  );
}
