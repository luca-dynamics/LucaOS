import React from "react";
import { Icon } from "../ui/Icon";

interface BacktestRun {
  id: string;
  status: "running" | "completed" | "failed" | "paused";
  symbol: string;
  model: string;
  roi: number;
  date: string;
}

interface BacktestSidebarProps {
  runs: BacktestRun[];
  selectedRunId?: string;
  onSelectRun: (id: string) => void;
  onDeleteRun: (id: string) => void;
  onNewBacktest: () => void;
  theme?: any;
}

export default function BacktestSidebar({
  runs,
  selectedRunId,
  onSelectRun,
  onDeleteRun,
  onNewBacktest,
  theme,
}: BacktestSidebarProps) {
  const isLight = theme?.isLight;
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Icon name="Activity" size={14} className="text-yellow-500 animate-pulse" />;
      case "completed":
        return <Icon name="CheckCircle2" size={14} className="text-emerald-500" />;
      case "failed":
        return <Icon name="XCircle" size={14} className="text-rose-500" />;
      case "paused":
        return <Icon name="Pause" size={14} className="text-slate-500" />;
      default:
        return <Icon name="Clock" size={14} className="text-slate-500" />;
    }
  };

  return (
    <div className={`flex flex-col h-full ${isLight ? "bg-white/80 border-slate-200" : "bg-white/[0.01] border-white/5"} border-r w-72 flex-shrink-0 transition-all duration-500 backdrop-blur-3xl`}>
      <div className={`p-5 border-b ${isLight ? "border-black/5" : "border-white/5"}`}>
        <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${isLight ? "text-slate-400" : "text-slate-500"}`}>
          Execution History
        </h2>
        <button
          onClick={onNewBacktest}
          className="w-full py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.15em] shadow-2xl hover:brightness-110 active:scale-[0.98] group"
          style={{ 
            backgroundColor: theme?.hex || "#0ea5e9",
            color: "#050505",
            boxShadow: theme?.hex ? `0 8px 30px ${theme.hex}44` : "none"
          }}
        >
          <Icon name="Plus" size={16} variant="BoldDuotone" className="group-hover:rotate-90 transition-transform duration-300" />
          <span>Initiate Simulation</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {runs.length === 0 && (
          <div className={`text-center py-10 ${isLight ? "text-slate-400" : "text-slate-500"} text-xs italic`}>
            No history available
          </div>
        )}
        
        {runs.map((run) => (
          <div
            key={run.id}
            onClick={() => onSelectRun(run.id)}
            className={`group relative p-4 rounded-xl border cursor-pointer transition-all ${
              selectedRunId === run.id
                ? `${isLight ? "bg-white border-slate-200 shadow-xl" : "bg-white/[0.04] border-white/20"}`
                : `bg-transparent border-transparent ${isLight ? "hover:bg-slate-50" : "hover:bg-white/[0.02] hover:border-white/5"}`
            }`}
            style={selectedRunId === run.id ? { 
              borderColor: `${theme?.hex || "#10b981"}66`, 
              boxShadow: theme?.hex ? `0 10px 40px ${theme.hex}1a` : `0 10px 40px rgba(16,185,129,0.1)` 
            } : {}}
          >
            <div className="flex justify-between items-start mb-1">
              <span
                className="text-xs font-bold font-mono"
                style={
                  selectedRunId === run.id
                    ? { color: theme?.hex || (isLight ? "#0f172a" : "#ffffff") }
                    : { color: isLight ? "#64748b" : "#94a3b8" }
                }
              >
                {run.id.slice(0, 12)}...
              </span>
              {getStatusIcon(run.status)}
            </div>

            <div className="flex justify-between items-end">
              <div>
                <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-slate-500"} font-mono mb-0.5`}>
                  {run.model}
                </div>
                <div className={`text-[10px] ${isLight ? "text-slate-900 font-bold" : "text-slate-300"} font-mono`}>
                  {run.symbol}
                </div>
              </div>
              <div
                className={`text-xs font-bold font-mono ${
                  run.roi >= 0 ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {run.roi >= 0 ? "+" : ""}
                {run.roi}%
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteRun(run.id);
              }}
              className={`absolute top-2 right-2 p-1.5 ${isLight ? "text-slate-300 hover:text-rose-500" : "text-slate-600 hover:text-white"} opacity-0 group-hover:opacity-100 transition-opacity`}
            >
              <Icon name="Trash2" size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
