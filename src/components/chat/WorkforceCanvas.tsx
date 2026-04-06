import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Icon } from "../ui/Icon";
import { lucaWorkforce, WorkflowPlan, WorkflowTask } from "../../services/agent/LucaWorkforce";
import { PersonaType } from "../../config/personaConfig";

interface NodeProps {
  id: string;
  label: string;
  type: "GOAL" | "AGENT" | "TASK";
  status: "pending" | "in-progress" | "complete" | "failed";
  x: number;
  y: number;
  persona?: PersonaType;
  themeColor: string;
}

const Node: React.FC<NodeProps> = ({ label, type, status, x, y, persona, themeColor }) => {
  const isAgent = type === "AGENT";
  const isGoal = type === "GOAL";
  
  const getIcon = () => {
    if (isGoal) return <Icon name="Target" size={20} variant="BoldDuotone" />;
    if (type === "TASK") return <Icon name="Code" size={12} variant="BoldDuotone" />;
    
    switch (persona) {
      case "HACKER": return <Icon name="Shield" size={16} variant="BoldDuotone" />;
      case "ENGINEER": return <Icon name="Cpu" size={16} variant="BoldDuotone" />;
      case "LOCALCORE": return <Icon name="Code" size={16} variant="BoldDuotone" />;
      case "LUCAGENT": return <Icon name="Code" size={16} variant="BoldDuotone" />;
      default: return <Icon name="Brain" size={16} variant="BoldDuotone" />;
    }
  };

  const getGlowColor = () => {
    if (status === "complete") return "#22c55e";
    if (status === "failed") return "#ef4444";
    if (status === "in-progress") return themeColor;
    return "#475569";
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, x, y }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={`absolute flex flex-col items-center gap-2 group cursor-grab active:cursor-grabbing`}
      style={{ zIndex: isGoal ? 10 : 5 }}
    >
      <div 
        className={`
          flex items-center justify-center rounded-full border-2 glass-blur
          ${isGoal ? "w-16 h-16" : isAgent ? "w-12 h-12" : "w-8 h-8"}
          transition-all duration-500
        `}
        style={{
          borderColor: `${getGlowColor()}80`,
          backgroundColor: `${getGlowColor()}1a`,
          boxShadow: status === "in-progress" ? `0 0 20px ${getGlowColor()}40` : "none"
        }}
      >
        <div style={{ color: getGlowColor() }}>
          {getIcon()}
        </div>
        
        {status === "in-progress" && (
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: getGlowColor(), filter: "blur(10px)" }}
          />
        )}
      </div>

      <div className="flex flex-col items-center text-center max-w-[120px]">
        <span className={`text-[10px] font-bold tracking-widest uppercase ${isGoal ? "text-white" : "text-slate-400"} group-hover:text-white transition-colors`}>
          {label}
        </span>
        {status === "in-progress" && (
          <span className="text-[8px] font-mono animate-pulse" style={{ color: themeColor }}>
            EXECUTING...
          </span>
        )}
      </div>
    </motion.div>
  );
};

const Connection: React.FC<{ from: { x: number; y: number }, to: { x: number; y: number }, active: boolean, color: string }> = ({ from, to, active, color }) => {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      <motion.line
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: active ? 0.6 : 0.2 }}
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={color}
        strokeWidth={active ? 2 : 1}
        strokeDasharray={active ? "4 4" : "0"}
      />
      {active && (
        <motion.circle
          r="2"
          fill={color}
          animate={{
            cx: [from.x, to.x],
            cy: [from.y, to.y],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      )}
    </svg>
  );
};

interface WorkforceCanvasProps {
  theme: any;
  onSelectTask?: (task: WorkflowTask) => void;
}

export const WorkforceCanvas: React.FC<WorkforceCanvasProps> = ({ theme }) => {
  const [workflows, setWorkflows] = useState<WorkflowPlan[]>([]);
  const [zoom, setZoom] = useState(1);
  const themeColor = theme?.hex || "#3b82f6";

  useEffect(() => {
    const update = () => {
      // Filter for workflows that are either in-progress or recently completed
      const all = lucaWorkforce.getActiveWorkflows();
      const active = all.filter(wf => 
        wf.tasks.some(t => t.status === "in-progress" || t.status === "pending")
      );
      // If none active, show the most recent one
      if (active.length === 0 && all.length > 0) {
        setWorkflows([all[all.length - 1]]);
      } else {
        setWorkflows(active);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-600 font-mono gap-4">
        <div className="relative">
             <Icon name="Brain" size={48} className="opacity-20 translate-y-2" style={{ color: themeColor }} variant="BoldDuotone" />
             <div className="absolute inset-0 flex items-center justify-center">
                 <Icon name="Search" size={22} className="animate-pulse" style={{ color: themeColor }} variant="BoldDuotone" />
             </div>
             {/* Spinning outer ring */}
             <motion.div 
               animate={{ rotate: 360 }}
               transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
               className="absolute -inset-2 border border-dashed rounded-full"
               style={{ borderColor: `${themeColor}33` }}
             />
        </div>
        <div className="text-center">
          <p className="text-[10px] tracking-[0.4em] font-black mb-2" style={{ color: `${themeColor}99` }}>AI WORKFORCE STANDBY</p>
          <p className="text-[8px] tracking-[0.2em] opacity-40">NO ACTIVE MULTI-AGENT WORKFLOWS DETECTED</p>
        </div>
      </div>
    );
  }

  // Basic layout: Center the goal, orbit the agents
  // In a real version, we'd use a physics engine or better spacing
  const canvasWidth = 600;
  const canvasHeight = 500;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black/40 glass-blur rounded-xl border border-white/5 shadow-2xl">
      {/* Background Grid */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(${themeColor} 1px, transparent 1px)`,
          backgroundSize: "30px 30px"
        }}
      />

      {/* Canvas Controls */}
      <div className="absolute top-4 right-4 z-[100] flex flex-col gap-2">
           <button 
             onClick={() => setZoom(z => Math.min(2, z + 0.1))}
             className="w-8 h-8 rounded border border-white/10 bg-black/40 flex items-center justify-center text-white hover:bg-white/10"
           >
             +
           </button>
           <button 
             onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
             className="w-8 h-8 rounded border border-white/10 bg-black/40 flex items-center justify-center text-white hover:bg-white/10"
           >
             -
           </button>
      </div>

      <motion.div 
        className="relative w-full h-full"
        style={{ scale: zoom }}
        drag
        dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
      >
        {workflows.map((wf) => {
          const agents = Array.from(new Set(wf.tasks.map(t => t.persona)));
          
          return (
            <React.Fragment key={wf.workflowId}>
              {/* GOAL NODE */}
              <Node 
                id={`${wf.workflowId}-goal`}
                label={wf.goal.length > 30 ? wf.goal.substring(0, 30) + "..." : wf.goal}
                type="GOAL"
                status={wf.tasks.every(t => t.status === "complete") ? "complete" : "in-progress"}
                x={centerX - 32}
                y={centerY - 32}
                themeColor={themeColor}
              />

              {agents.map((persona, i) => {
                const angle = (i / agents.length) * Math.PI * 2;
                const dist = 180;
                const ax = centerX + Math.cos(angle) * dist - 24;
                const ay = centerY + Math.sin(angle) * dist - 24;
                
                const personaTasks = wf.tasks.filter(t => t.persona === persona);
                const isAnyActive = personaTasks.some(t => t.status === "in-progress");
                const isAllDone = personaTasks.every(t => t.status === "complete");

                return (
                  <React.Fragment key={persona}>
                    <Connection 
                      from={{ x: centerX, y: centerY }}
                      to={{ x: ax + 24, y: ay + 24 }}
                      active={isAnyActive}
                      color={isAllDone ? "#22c55e" : themeColor}
                    />
                    <Node 
                      id={`${wf.workflowId}-${persona}`}
                      label={`${persona} LUCA`}
                      type="AGENT"
                      status={isAllDone ? "complete" : isAnyActive ? "in-progress" : "pending"}
                      x={ax}
                      y={ay}
                      persona={persona}
                      themeColor={themeColor}
                    />

                    {/* Task Sub-nodes */}
                    {personaTasks.map((task, ti) => {
                         const tAngle = angle + (ti - (personaTasks.length-1)/2) * 0.4;
                         const tDist = dist + 80;
                         const tx = centerX + Math.cos(tAngle) * tDist - 16;
                         const ty = centerY + Math.sin(tAngle) * tDist - 16;

                         return (
                           <React.Fragment key={task.id}>
                             <Connection 
                               from={{ x: ax + 24, y: ay + 24 }}
                               to={{ x: tx + 16, y: ty + 16 }}
                               active={task.status === "in-progress"}
                               color={task.status === "complete" ? "#22c55e" : themeColor}
                             />
                             <Node 
                               id={task.id}
                               label={task.description.split(" ").slice(0, 3).join(" ")}
                               type="TASK"
                               status={task.status}
                               x={tx}
                               y={ty}
                               themeColor={themeColor}
                             />
                           </React.Fragment>
                         );
                    })}
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          );
        })}
      </motion.div>

      {/* Perspective Info */}
      <div className="absolute bottom-4 left-4 flex items-center gap-4 text-[9px] font-mono text-slate-500 uppercase tracking-widest">
           <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor, boxShadow: `0 0 5px ${themeColor}` }} />
                <span style={{ color: themeColor }}>Synchronized</span>
           </div>
           <div className="flex items-center gap-1">
                <Icon name="Activity" size={10} style={{ color: themeColor }} variant="BoldDuotone" />
                <span>Latency: 12ms</span>
           </div>
           <div className="animate-pulse px-2 py-0.5 border rounded" style={{ borderColor: `${themeColor}33`, backgroundColor: `${themeColor}0D` }}>
                Multi-Agent Mode: Active
           </div>
      </div>
    </div>
  );
};
