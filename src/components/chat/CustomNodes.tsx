import React, { memo } from "react";
import { Handle,
  Position } from "@xyflow/react";
import { motion } from "framer-motion";
import { Icon } from "../ui/Icon";
import { setHexAlpha, getThemeColors } from "../../config/themeColors";

// --- GOAL NODE ---
export const GoalNode = memo(({ data }: any) => {
  return (
    <div className="px-6 py-4 shadow-xl rounded-2xl bg-black/60 glass-blur border border-white/20 flex flex-col items-center gap-2 min-w-[200px]">
      <div 
        className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-500/20 border border-blue-500/50 text-blue-400"
        style={{ boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)" }}
      >
        <Icon name="Target" size={24} variant="BoldDuotone" />
      </div>
      <div className="text-center">
        <div className="text-[10px] text-blue-400 font-bold tracking-widest uppercase mb-1">STRATEGIC GOAL</div>
        <div className="text-sm font-medium text-white max-w-[180px] break-words">
          {data.label}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  );
});

// --- AGENT NODE ---
export const AgentNode = memo(({ data }: any) => {
  const { persona, status } = data;
  const theme = getThemeColors(persona);
  const isAnyActive = status === "in-progress";
  
  const getIcon = () => {
    switch (persona) {
      case "HACKER": return <Icon name="Shield" size={20} variant="BoldDuotone" />;
      case "ENGINEER": return <Icon name="Cpu" size={20} variant="BoldDuotone" />;
      case "BROWSER": return <Icon name="Globe" size={20} variant="BoldDuotone" />;
      default: return <Icon name="Brain" size={20} variant="BoldDuotone" />;
    }
  };

  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-slate-500" />
      <motion.div 
        animate={isAnyActive ? { scale: [1, 1.05, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
        className="px-4 py-3 rounded-xl bg-black/80 glass-blur border flex flex-col items-center gap-2 min-w-[140px]"
        style={{ 
          borderColor: isAnyActive ? theme.hex : "rgba(255,255,255,0.1)",
          boxShadow: isAnyActive ? `0 0 20px ${setHexAlpha(theme.hex, 0.3)}` : "none"
        }}
      >
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center border"
          style={{ 
            backgroundColor: setHexAlpha(theme.hex, 0.1),
            borderColor: setHexAlpha(theme.hex, 0.3),
            color: theme.hex
          }}
        >
          {getIcon()}
          {isAnyActive && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="absolute inset-0 rounded-lg border border-dashed"
              style={{ borderColor: setHexAlpha(theme.hex, 0.5) }}
            />
          )}
        </div>
        <div className="text-center">
          <div className="text-[9px] font-black tracking-tighter uppercase" style={{ color: theme.hex }}>
            {persona} LUCA
          </div>
          <div className="text-[8px] text-slate-500 font-mono mt-1">
            {status.toUpperCase()}
          </div>
        </div>
      </motion.div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
    </div>
  );
});

// --- TASK NODE ---
export const TaskNode = memo(({ data }: any) => {
  const { task, status, persona } = data;
  const theme = getThemeColors(persona);
  const isExecuting = status === "in-progress";
  const isComplete = status === "complete";
  const isFailed = status === "failed";
  
  const snapshot = task.snapshot;

  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-slate-500" />
      <div 
        className="p-3 rounded-lg bg-[#050505] border border-white/5 flex flex-col gap-2 min-w-[180px] max-w-[240px] shadow-2xl transition-all"
        style={{ 
          borderColor: isExecuting ? theme.hex : isComplete ? "#22c55e40" : isFailed ? "#ef444440" : "rgba(255,255,255,0.05)",
          boxShadow: isExecuting ? `0 0 15px ${setHexAlpha(theme.hex, 0.2)}` : "none"
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <div 
              className="w-1.5 h-1.5 rounded-full shrink-0" 
              style={{ 
                backgroundColor: isExecuting ? theme.hex : isComplete ? "#22c55e" : isFailed ? "#ef4444" : "#475569",
                boxShadow: isExecuting ? `0 0 8px ${theme.hex}` : "none"
              }} 
            />
            <span className="text-[11px] text-slate-300 font-medium truncate">{task.description}</span>
          </div>
          {isExecuting && <Icon name="Activity" size={10} className="animate-pulse text-slate-500" variant="BoldDuotone" />}
        </div>

        {/* --- CONTEXTUAL VIEWPORT --- */}
        {isExecuting && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden rounded bg-black/50 border border-white/5"
          >
            {persona === "ENGINEER" && snapshot?.terminal && (
              <div className="p-1.5 font-mono text-[8px] text-emerald-400/80 leading-tight">
                {snapshot.terminal.slice(-4).map((line: string, i: number) => (
                  <div key={i} className="truncate">{`> ${line}`}</div>
                ))}
                <div className="animate-pulse">_</div>
              </div>
            )}
            {persona === "BROWSER" && snapshot?.browserScreenshot && (
              <div className="relative aspect-video bg-slate-900 overflow-hidden">
                <img src={snapshot.browserScreenshot} className="w-full h-full object-cover opacity-60" alt="Browser" />
                <div className="absolute inset-0 bg-blue-500/10" />
              </div>
            )}
            {!snapshot && (
              <div className="p-2 flex items-center justify-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white/20" />
              </div>
            )}
          </motion.div>
        )}

        {isComplete && task.result && (
          <div className="text-[9px] text-emerald-500 italic truncate opacity-60">
            {typeof task.result === 'string' ? task.result : 'Task completed successfully'}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 opacity-0" />
    </div>
  );
});

GoalNode.displayName = "GoalNode";
AgentNode.displayName = "AgentNode";
TaskNode.displayName = "TaskNode";
