import React, { useState } from "react";
import { Icon } from "../../ui/Icon";
import { FullDecision } from "../../../types/trading";
import ReactJson from "react-json-view";

interface AITestRunnerProps {
  onRunTest: () => Promise<FullDecision>;
  theme?: { hex: string; primary: string; border: string; bg: string; isLight?: boolean };
}

export function AITestRunner({ onRunTest, theme }: AITestRunnerProps) {
  const isLight = theme?.isLight;
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<FullDecision | null>(null);
  const [viewMode, setViewMode] = useState<"visual" | "raw">("visual");

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const decision = await onRunTest();
      setResult(decision);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-full flex flex-col font-mono">
      {/* Control Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          onClick={handleRun}
          disabled={isRunning}
          className={`group relative flex items-center gap-3 px-6 py-2.5 ${isLight ? "bg-white text-slate-800 shadow-sm" : "bg-[#0b0b0b] text-white"} hover:border-opacity-60 font-black rounded-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden`}
          style={{ border: `1px solid ${theme?.hex || "#0ea5e9"}66` }}
        >
          <div 
            className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity" 
            style={{ backgroundColor: theme?.hex || "#0ea5e9" }}
          />
          {isRunning ? (
            <Icon name="Loader" size={14} className="animate-spin" style={{ color: theme?.hex || "#0ea5e9" }} />
          ) : (
            <Icon name="Play" size={14} style={{ color: theme?.hex || "#0ea5e9" }} className="group-hover:scale-110 transition-transform" />
          )}
          <span className="text-[10px] tracking-[0.2em] relative z-10">
            {isRunning ? "Processing..." : "Simulate Engine Logic"}
          </span>
        </button>

        <div className={`flex ${isLight ? "bg-white border-black/5" : "bg-[#0b0b0b] border-white/5"} border rounded-sm p-1`}>
          <button
            onClick={() => setViewMode("visual")}
            className={`px-3 py-1.5 rounded-sm text-[9px] font-black tracking-widest transition-all ${
              viewMode === "visual"
                ? isLight ? "text-white shadow-sm" : "bg-white/5 text-white border border-white/10"
                : `${isLight ? "text-slate-400" : "text-slate-600"} hover:text-slate-400 border border-transparent`
            }`}
            style={viewMode === "visual" && isLight ? { backgroundColor: theme?.hex || "#0ea5e9" } : {}}
          >
            Visual Log
          </button>
          <button
            onClick={() => setViewMode("raw")}
            className={`px-3 py-1.5 rounded-sm text-[9px] font-black tracking-widest transition-all ${
              viewMode === "raw"
                ? isLight ? "text-white shadow-sm" : "bg-white/5 text-white border border-white/10"
                : `${isLight ? "text-slate-400" : "text-slate-600"} hover:text-slate-400 border border-transparent`
            }`}
            style={viewMode === "raw" && isLight ? { backgroundColor: theme?.hex || "#0ea5e9" } : {}}
          >
            Raw Data
          </button>
        </div>
      </div>

      {/* Results Area */}
      <div className={`flex-1 ${isLight ? "bg-[#f8f9fa] border-black/5" : "bg-[#080808] border-white/5"} border rounded-xl overflow-hidden relative shadow-inner`}>
        {!result && !isRunning && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center ${isLight ? "text-slate-300" : "text-slate-800"}`}>
            <Icon name="Brain" size={48} className="mb-4 opacity-20" />
            <p className="text-[10px] font-black tracking-[0.3em] opacity-40">Engine Idle: Ready for Simulation</p>
          </div>
        )}

        {isRunning && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center ${isLight ? "bg-white/90" : "bg-[#080808]/90"} z-10 backdrop-blur-sm`}>
            <div className="relative mb-6">
              <Icon name="Loader" size={48} className="animate-spin opacity-40" style={{ color: theme?.hex || "#0ea5e9" }} />
              <Icon name="Brain" size={24} className="absolute inset-0 m-auto animate-pulse" style={{ color: theme?.hex || "#0ea5e9" }} />
            </div>
            <p className="text-[10px] font-black tracking-[0.3em] animate-pulse" style={{ color: theme?.hex || "#0ea5e9" }}>
              Executing Scenarios...
            </p>
            <p className={`text-[8px] ${isLight ? "text-slate-400" : "text-slate-700"} mt-2 tracking-widest`}>
              {isRunning ? "Neural Compute Active" : "Simulate Engine Logic"}
            </p>
          </div>
        )}

        {result && (
          <div className="h-full overflow-y-auto custom-scrollbar">
            {viewMode === "visual" ? (
              <div className="p-4 space-y-6">
                {/* Header Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-3 ${isLight ? "bg-white border-black/5" : "bg-[#0b0b0b] border-white/5"} border shadow-inner`}>
                    <div className={`text-[8px] ${isLight ? "text-slate-400" : "text-slate-600"} font-black tracking-widest mb-1`}>Duration</div>
                    <div className={`text-sm font-mono ${isLight ? "text-slate-900" : "text-white"} flex items-baseline gap-1`}>
                      {result.aiRequestDurationMs} <span className={`text-[10px] ${isLight ? "text-slate-400" : "text-slate-600"}`}>ms</span>
                    </div>
                  </div>
                  <div className={`p-3 ${isLight ? "bg-white border-black/5" : "bg-[#0b0b0b] border-white/5"} border shadow-inner`}>
                    <div className={`text-[8px] ${isLight ? "text-slate-400" : "text-slate-600"} font-black tracking-widest mb-1`}>Signals</div>
                    <div className={`text-sm font-mono ${isLight ? "text-slate-900" : "text-white"}`}>
                        {result.decisions.length} Active
                    </div>
                  </div>
                </div>

                {/* Decisions */}
                <div className="space-y-4">
                  <h3 className={`text-[9px] font-black ${isLight ? "text-slate-400" : "text-slate-700"} tracking-[0.2em] flex items-center gap-2`}>
                    <Icon name="Activity" size={12} className={isLight ? "text-slate-300" : "text-slate-800"} />
                    <span className={`text-[10px] font-black ${isLight ? "text-slate-800" : "text-white"} tracking-[0.2em]`}>Simulated Trades</span>
                  </h3>
                  <div className="space-y-3">
                    {result.decisions.map((d, idx) => (
                      <div
                        key={idx}
                        className={`${isLight ? "bg-white border-black/5 shadow-sm" : "bg-[#0b0b0b] border-white/5"} p-4 border relative group transition-colors`}
                      >
                        <div
                          className={`absolute top-0 left-0 w-[2px] h-full ${getActionColor(d.action)} shadow-[0_0_8px_rgba(0,0,0,0.5)]`}
                        />
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                              {d.symbol}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-medium border rounded ${getActionBadge(d.action)}`}
                            >
                              {d.action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"} leading-none`}>
                              {d.confidence}%
                            </div>
                            <div className={`text-[8px] ${isLight ? "text-slate-400" : "text-slate-700"} font-black tracking-tighter`}>
                              Conviction
                            </div>
                          </div>
                        </div>
                        <div 
                          className={`p-3 ${isLight ? "bg-slate-50 text-slate-700 italic" : "bg-[#080808]/50 border-white/[0.02] text-slate-400"} border text-[10px] leading-relaxed font-mono`}
                          style={isLight ? { borderColor: `${theme?.hex || "#0ea5e9"}33` } : {}}
                        >
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                             <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                               <span className="text-[10px] font-black tracking-widest text-white/40">NODE_RESOLVED</span>
                             </div>
                             <span className="text-[9px] font-mono opacity-30 italic">
                               {new Date(result?.timestamp || Date.now()).toLocaleTimeString()}
                             </span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                              <Icon name="Zap" size={12} style={{ color: theme?.hex || "#0ea5e9" }} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span 
                                  className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter"
                                  style={{ borderColor: isLight ? `${theme?.hex || "#0ea5e9"}33` : "", color: isLight ? theme?.hex || "#0f172a" : `${theme?.hex || "#0ea5e9"}b3` }}
                                >
                                  {d.reasoning}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CoT */}
                <div className="space-y-3 pb-4">
                  <h3 className={`text-[9px] font-black ${isLight ? "text-slate-400" : "text-slate-700"} tracking-[0.2em] flex items-center gap-2`}>
                    <Icon name="Zap" size={12} style={{ color: theme?.hex || "#0ea5e9" }} />
                    Engine Decision Trace
                  </h3>
                  <div 
                    className={`p-4 border rounded-lg ${isLight ? "bg-white shadow-inner" : "bg-[#0b0b0b] border-white/5"} text-[9px] font-mono whitespace-pre-wrap leading-relaxed shadow-inner`}
                    style={{ borderColor: isLight ? `${theme?.hex || "#0ea5e9"}33` : "", color: isLight ? theme?.hex || "#0f172a" : `${theme?.hex || "#0ea5e9"}b3` }}
                  >
                    {result.cotTrace || "No trace data recorded."}
                  </div>
                </div>
              </div>
            ) : (
              <div className={`p-4 ${isLight ? "bg-[#f8f9fa]" : "bg-[#080808]"}`}>
                <ReactJson
                  src={result as object}
                  theme={isLight ? "monokai" : "ocean"}
                  displayDataTypes={false}
                  collapsed={false}
                  style={{ backgroundColor: "transparent", fontSize: "10px", fontFamily: "monospace" }}
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.03)'}; border-radius: 10px; }
      `}</style>
    </div>
  );
}

function getActionColor(action: string) {
  if (action.includes("long")) return "bg-emerald-500";
  if (action.includes("short")) return "bg-rose-500";
  return "bg-slate-500";
}

function getActionBadge(action: string) {
  if (action.includes("long")) return "bg-emerald-500/5 text-emerald-500/80 border-emerald-500/20";
  if (action.includes("short")) return "bg-rose-500/5 text-rose-500/80 border-rose-500/20";
  return "bg-slate-500/5 text-slate-500/80 border-slate-500/20";
}
