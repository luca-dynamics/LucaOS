import React, { useState } from "react";
import { Icon } from "../ui/Icon";
import { TacticalLog } from "../../types";

interface InlineActionFlowProps {
  logs: TacticalLog[];
  status: string;
  themeColor: string;
}

const InlineActionFlow: React.FC<InlineActionFlowProps> = ({
  logs,
  status,
  themeColor,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (logs.length === 0) return null;

  return (
    <div 
      className="my-4 rounded-xl border overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 glass-blur shadow-2xl"
      style={{ 
        borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
        backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.4))"
      }}
    >
      <div 
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-white/5 transition-colors"
        style={{ backgroundColor: "var(--app-bg-tint, rgba(255,255,255,0.05))" }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
             {status === "COMPLETE" || status === "SUCCESS" ? (
               <Icon name="CheckCircle" size={14} style={{ color: themeColor }} variant="BoldDuotone" />
             ) : (
               <>
                 <Icon name="Pulse" size={14} style={{ color: themeColor }} className="animate-pulse" variant="BoldDuotone" />
                 <div className="absolute inset-0 animate-ping opacity-20" style={{ backgroundColor: themeColor }} />
               </>
             )}
          </div>
          <div className="flex flex-col">
            <span 
              className="text-[10px] font-black uppercase tracking-[0.2em]"
              style={{ color: "var(--app-text-main, #ffffff)" }}
            >
              Action Flow
            </span>
            <span className="text-[9px] opacity-60 font-mono" style={{ color: themeColor }}>
              {status} • {logs.length} operations
            </span>
          </div>
        </div>
        <button className="text-slate-500">
          {isExpanded ? <Icon name="AltArrowUp" size={14} variant="BoldDuotone" /> : <Icon name="AltArrowDown" size={14} variant="BoldDuotone" />}
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 py-3 max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-1 duration-300">
              <div className="flex flex-col items-center pt-1.5 h-full">
                {i === logs.length - 1 && status !== "COMPLETE" && status !== "SUCCESS" ? (
                   <Icon name="Settings" size={10} className="animate-spin" style={{ color: themeColor }} variant="BoldDuotone" />
                ) : (
                   <Icon name="CheckCircle" size={10} className="text-emerald-500" variant="BoldDuotone" />
                )}
                <div className="w-px h-full bg-white/5 mt-1" />
              </div>
              <div className="flex flex-col">
                <span 
                  className="text-[11px] font-mono leading-tight"
                  style={{ color: "var(--app-text-main, #ffffff)" }}
                >
                  {log.message}
                </span>
                <span className="text-[9px] opacity-40 font-mono uppercase">
                  {log.source || "SYSTEM"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InlineActionFlow;
