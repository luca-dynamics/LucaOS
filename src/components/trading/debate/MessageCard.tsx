import React, { useState } from "react";
import { Icon } from "../../ui/Icon";
import {
  DebateMessage,
  TradeAction,
  PERSONALITY_COLORS,
  DebatePersonality,
} from "../../../types/trading";
import { LucaAvatar } from "../../../utils/tradingUI";

interface MessageCardProps {
  message: DebateMessage;
}

const ACTION_CONFIG: Record<
  string,
  { color: string; bg: string; iconName: string; label: string }
> = {
  [TradeAction.OPEN_LONG]: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    iconName: "TrendingUp",
    label: "LONG",
  },
  [TradeAction.OPEN_SHORT]: {
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    iconName: "TrendingDown",
    label: "SHORT",
  },
  [TradeAction.HOLD]: {
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    iconName: "Minus",
    label: "HOLD",
  },
  [TradeAction.WAIT]: {
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    iconName: "Clock",
    label: "WAIT",
  },
  [TradeAction.CLOSE_LONG]: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    iconName: "CloseCircle",
    label: "CLOSE",
  },
  [TradeAction.CLOSE_SHORT]: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    iconName: "CloseCircle",
    label: "CLOSE",
  },
};

export default function MessageCard({ message }: MessageCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isThoughtOpen, setIsThoughtOpen] = useState(false);

  const aiModelId = message.participantId || "AI Trader";
  const personality = message.participantPersonality || DebatePersonality.ANALYST;
  const personalityColor = PERSONALITY_COLORS[personality] || "#94a3b8";

  // XML Parser for <thought> and <analysis> tags
  const parseContent = (reasoning: string) => {
    const thoughtMatch = reasoning.match(/<(?:thought|reasoning|analysis)>([\s\S]*?)<\/(?:thought|reasoning|analysis)>/i);
    const thought = thoughtMatch ? thoughtMatch[1].trim() : null;
    const cleanContent = reasoning.replace(/<(?:thought|reasoning|analysis)>([\s\S]*?)<\/(?:thought|reasoning|analysis)>/gi, "").trim();
    
    return { thought, cleanContent };
  };

  const { thought, cleanContent } = parseContent(message.reasoning || "");

  // Use first decision for summary
  const primaryDecision = message.decisions?.[0];
  const actionConfig = primaryDecision
    ? ACTION_CONFIG[primaryDecision.action] || ACTION_CONFIG[TradeAction.WAIT]
    : ACTION_CONFIG[TradeAction.WAIT];

  return (
    <div
      className="rounded border border-white/5 bg-[#0a0a0a]/60 overflow-hidden transition-all hover:bg-white/5"
      style={{ borderLeft: `3px solid ${personalityColor}` }}
    >
      {/* Header Summary */}
      <div
        className="px-3 py-2 flex items-center gap-2.5 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <LucaAvatar aiModelId={aiModelId} size={20} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-200 truncate tracking-tight">
              {aiModelId}
            </span>
            <span
              className="text-[9px] px-1 rounded bg-black/40 border border-white/5 font-bold tracking-widest"
              style={{ color: personalityColor, opacity: 0.8 }}
            >
              {personality}
            </span>
          </div>
        </div>

        {/* Decision Badge - HUD Style */}
        {primaryDecision && (
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/5 text-[9px] font-black tracking-widest ${actionConfig.bg} ${actionConfig.color}`}
          >
            <Icon name={actionConfig.iconName} size={10} variant="BoldDuotone" />
            {primaryDecision.symbol && (
              <span className="text-white opacity-90">{primaryDecision.symbol}</span>
            )}
            <span>{actionConfig.label}</span>
          </div>
        )}

        {/* Confidence Progress Mini */}
        {primaryDecision && (
          <div className="flex items-center gap-2 min-w-[60px] justify-end">
            <div className="w-10 h-1 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
              <div 
                className="h-full bg-amber-500/80 rounded-full transition-all"
                style={{ width: `${primaryDecision.confidence}%` }}
              />
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-500 tabular-nums">
              {primaryDecision.confidence}%
            </span>
          </div>
        )}

        {isOpen ? (
          <Icon name="AltArrowUp" size={14} className="text-slate-500" variant="BoldDuotone" />
        ) : (
          <Icon name="AltArrowDown" size={14} className="text-slate-500" variant="BoldDuotone" />
        )}
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="px-3 pb-3 pt-1 space-y-2 animate-in slide-in-from-top-1 duration-200">
          {/* Thought Section - H-D Upgrade */}
          {thought && (
            <div className="bg-black/40 rounded border border-white/5 overflow-hidden">
               <button 
                 onClick={() => setIsThoughtOpen(!isThoughtOpen)}
                 className="w-full px-2 py-1.5 flex items-center justify-between text-[10px] font-bold text-cyan-400/70 hover:text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 transition-all border-b border-white/5"
               >
                  <div className="flex items-center gap-1.5">
                    <Icon name="Brain" size={10} style={{ color: personalityColor }} variant="BoldDuotone" />
                    <span className="tracking-widest">Strategic analysis</span>
                  </div>
                  {isThoughtOpen ? <Icon name="AltArrowUp" size={10} variant="BoldDuotone" /> : <Icon name="AltArrowDown" size={10} variant="BoldDuotone" />}
               </button>
               {isThoughtOpen && (
                 <div className="p-2.5 text-[10px] font-mono text-slate-400 leading-relaxed bg-[#050505] whitespace-pre-wrap select-text selection:bg-cyan-500/30">
                    {thought}
                 </div>
               )}
            </div>
          )}

          {/* Clean Message Content */}
          <div className="bg-black/20 rounded p-2.5 border border-white/5">
            <div className="text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
              {cleanContent}
            </div>
          </div>

          {/* Decisions List - Trade Profile */}
          {message.decisions && message.decisions?.length > 0 && (
            <div className="bg-black/40 rounded p-2.5 border border-white/5">
              <div className="text-[9px] font-black text-emerald-400 mb-2 tracking-[0.2em] flex items-center gap-1.5 opacity-80">
                <Icon name="Target" size={10} variant="BoldDuotone" />
                Commitment profile
              </div>

              <div className="space-y-1.5">
                {message.decisions?.map((decision, idx) => {
                  const dConfig = ACTION_CONFIG[decision.action] || ACTION_CONFIG[TradeAction.WAIT];
                  return (
                    <div
                      key={idx}
                      className="bg-[#080808] rounded p-1.5 text-[10px] flex items-center justify-between border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white tracking-tight">
                          {decision.symbol}
                        </span>
                        <span className={`flex items-center gap-1 font-black ${dConfig.color} tracking-tighter`}>
                          <Icon name={dConfig.iconName} size={10} variant="BoldDuotone" /> {dConfig.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-slate-500 font-mono text-[9px] tabular-nums">
                        {decision.leverage && (
                          <span>
                            LEV: <span className="text-slate-300 font-bold">{decision.leverage}X</span>
                          </span>
                        )}
                        {decision.positionPct && (
                          <span>
                            SIZE: <span className="text-slate-300 font-bold">{(decision.positionPct * 100).toFixed(0)}%</span>
                          </span>
                        )}
                        {decision.stopLoss && (
                          <span>
                            SL: <span className="text-rose-400/80 font-bold">{(decision.stopLoss * 100).toFixed(1)}%</span>
                          </span>
                        )}
                        {decision.takeProfit && (
                          <span>
                            TP: <span className="text-emerald-400/80 font-bold">{(decision.takeProfit * 100).toFixed(1)}%</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview (if closed) */}
      {!isOpen && (
        <div className="px-3 pb-2 text-[10px] text-slate-500 line-clamp-1 font-mono pl-9 opacity-50 italic">
          {cleanContent.substring(0, 120)}...
        </div>
      )}
    </div>
  );
}
