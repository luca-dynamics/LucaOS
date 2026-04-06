import React from "react";
import { Icon } from "../../ui/Icon";
import { DebateConsensus, TradeAction } from "../../../types/trading";

interface ConsensusBarProps {
  consensus?: DebateConsensus | null;
  onExecute: () => void;
  isExecuting: boolean;
  isExecuted: boolean;
}

const ACTION_CONFIG: Record<
  string,
  { color: string; bg: string; iconName: string; label: string }
> = {
  [TradeAction.OPEN_LONG]: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/20",
    iconName: "Zap",
    label: "LONG",
  },
  [TradeAction.OPEN_SHORT]: {
    color: "text-rose-400",
    bg: "bg-rose-500/20",
    iconName: "Zap",
    label: "SHORT",
  },
  [TradeAction.HOLD]: {
    color: "text-cyan-400",
    bg: "bg-cyan-500/20",
    iconName: "Target",
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
    iconName: "Target",
    label: "CLOSE",
  },
  [TradeAction.CLOSE_SHORT]: {
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    iconName: "Target",
    label: "CLOSE",
  },
};

export default function ConsensusBar({
  consensus,
  onExecute,
  isExecuting,
  isExecuted,
}: ConsensusBarProps) {
  // If no consensus yet or voting in progress
  if (!consensus) {
    return (
      <div className="p-3 border-t border-white/5 bg-[#0a0a0a]/80 flex items-center justify-between transition-colors shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icon name="Clock" size={16} className="text-amber-500/80" variant="BoldDuotone" />
            <div className="absolute inset-0 bg-amber-500 blur-sm opacity-20 animate-pulse" />
          </div>
          <span className="text-slate-500 font-bold tracking-[0.2em] text-[10px] animate-pulse">
            Awaiting final multi-agent consensus...
          </span>
        </div>
        <div className="text-[9px] text-slate-600 font-mono bg-white/5 border border-white/5 px-2 py-0.5 rounded tracking-tighter">
          Voting Phase Active
        </div>
      </div>
    );
  }

  const actionConfig =
    ACTION_CONFIG[consensus.action] || ACTION_CONFIG[TradeAction.WAIT];
  const canExecute =
    (consensus.action === TradeAction.OPEN_LONG ||
      consensus.action === TradeAction.OPEN_SHORT ||
      consensus.action === TradeAction.CLOSE_LONG ||
      consensus.action === TradeAction.CLOSE_SHORT) &&
    !isExecuted;

  return (
    <div className="px-4 py-2 border-t border-white/5 bg-[#0a0a0a] flex items-center gap-4 sticky bottom-0 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.4)]">
      {/* Consensus Label & Symbol */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Icon name="Cup" size={16} className="text-[#facc15]" variant="BoldDuotone" />
        <span className="text-[11px] text-slate-500 font-medium">Consensus:</span>
        <span className="text-[13px] font-black text-[#facc15] font-mono tracking-tight">
          {consensus?.symbol || "---"}
        </span>
      </div>

      {/* Action Badge */}
      <div className="flex-shrink-0">
        <div
          className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black flex items-center gap-1.5 transition-all ${actionConfig.bg} ${actionConfig.color}`}
        >
          <Icon name={actionConfig.iconName} size={11} className="opacity-80" variant="BoldDuotone" />
          {actionConfig.label}
        </div>
      </div>

      {/* HUD Metrics - Inline NoFx Style */}
      <div className="flex-1 flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar ml-2">
        <Metric
          label="Confidence"
          value={`${consensus.confidence}%`}
          color="text-[#facc15]"
        />

        {consensus.leverage > 0 && (
          <Metric
            label="Leverage"
            value={`${consensus.leverage}x`}
            color="text-white"
          />
        )}

        {consensus.positionPct > 0 && (
          <Metric
            label="Position"
            value={`${(consensus.positionPct * 100).toFixed(0)}%`}
            color="text-white"
          />
        )}

        {consensus.stopLoss > 0 && (
          <Metric
            label="SL"
            value={`${(consensus.stopLoss * 100).toFixed(1)}%`}
            color="text-rose-400"
          />
        )}

        {consensus.takeProfit > 0 && (
          <Metric
            label="TP"
            value={`${(consensus.takeProfit * 100).toFixed(1)}%`}
            color="text-emerald-400"
          />
        )}
      </div>

      {/* Action Status / Button */}
      <div className="flex-shrink-0">
        {isExecuted ? (
          <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-black tracking-tight">
            <Icon name="CheckCircle" size={14} className="stroke-[3px]" variant="BoldDuotone" />
            Executed
          </div>
        ) : canExecute ? (
          <button
            onClick={onExecute}
            disabled={isExecuting}
            className="px-5 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-[4px] text-[10px] tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 group shadow-[0_0_15px_rgba(234,179,8,0.2)]"
          >
            {isExecuting ? (
              <Icon name="Activity" className="animate-spin" size={12} variant="BoldDuotone" />
            ) : (
              <Icon name="Zap" size={12} variant="BoldDuotone" />
            )}
            Execute
          </button>
        ) : (
          <div className="px-5 py-1.5 bg-white/5 text-slate-600 rounded-[4px] border border-white/5 text-[10px] font-black tracking-widest opacity-40 italic">
            WAITING...
          </div>
        )}
      </div>
    </div>
  );
}

const Metric = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) => (
  <div className="flex items-center gap-1.5 flex-shrink-0">
    <span className="text-slate-500 text-[10px] font-medium tracking-tight">
      {label}
    </span>
    <span className={`text-[11px] font-bold font-mono tracking-tight ${color}`}>
      {value}
    </span>
  </div>
);

