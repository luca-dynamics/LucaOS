import React, { useState } from "react";
import * as LucideIcons from "lucide-react";
const {
  Terminal,
  ChevronDown,
  ChevronUp,
  Activity,
  CheckCircle2,
  Loader2,
} = LucideIcons as any;
import { TacticalLog } from "../../types";

interface InlineActionFlowProps {
  logs: TacticalLog[];
  status: string;
  themeColor: string;
  isLight?: boolean;
}

const InlineActionFlow: React.FC<InlineActionFlowProps> = ({
  logs,
  status,
  themeColor,
  isLight = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (logs.length === 0) return null;

  return (
    <div 
      className={`my-4 rounded-xl border overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
        isLight ? "bg-gray-50/80 border-gray-200" : "bg-black/40 border-white/10 shadow-2xl backdrop-blur-md"
      }`}
    >
      <div 
        className={`flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-white/5 transition-colors ${
          isLight ? "bg-gray-100" : "bg-white/5"
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
             <Activity size={14} style={{ color: themeColor }} className="animate-pulse" />
             <div className="absolute inset-0 animate-ping opacity-20" style={{ backgroundColor: themeColor }} />
          </div>
          <div className="flex flex-col">
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLight ? "text-slate-900" : "text-white/90"}`}>
              Action Flow
            </span>
            <span className="text-[9px] opacity-60 font-mono" style={{ color: themeColor }}>
              {status} • {logs.length} operations
            </span>
          </div>
        </div>
        <button className="text-slate-500">
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 py-3 max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-1 duration-300">
              <div className="flex flex-col items-center pt-1.5 h-full">
                {i === logs.length - 1 ? (
                   <Loader2 size={10} className="animate-spin" style={{ color: themeColor }} />
                ) : (
                   <CheckCircle2 size={10} className="text-emerald-500" />
                )}
                <div className="w-px h-full bg-white/5 mt-1" />
              </div>
              <div className="flex flex-col">
                <span className={`text-[11px] font-mono leading-tight ${isLight ? "text-slate-800" : "text-white/80"}`}>
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
