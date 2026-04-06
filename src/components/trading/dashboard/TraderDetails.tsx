import React from "react";
import { Icon } from "../../ui/Icon";

interface TraderDetailsProps {
  themeCardBg?: string;
}

export default function TraderDetails({
  themeCardBg = "bg-transparent",
}: TraderDetailsProps) {
  return (
    <div
      className={`${themeCardBg} flex flex-col h-full overflow-hidden text-white/90`}
    >
      <div className="p-2.5 border-b border-white/[0.08] bg-white/[0.03] flex justify-between items-center glass-blur">
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 text-white/70">
          <Icon name="User" variant="BoldDuotone" size={12} className="text-emerald-400" />
          Operator Intel
        </h3>
        <span className="text-[9px] font-mono font-bold text-slate-400 border border-white/[0.1] px-2 py-0.5 rounded bg-black/40">
          RANK: #01
        </span>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-[#0a0a0a]/40">
        <div className="relative mb-4 group">
          <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="w-20 h-20 rounded-full bg-black/40 flex items-center justify-center border border-white/10 relative z-10 shadow-2xl">
            <Icon name="User" variant="BoldDuotone" size={40} className="text-slate-600 group-hover:text-emerald-400/60 transition-colors duration-500" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 glass-blur flex items-center justify-center z-20">
            <Icon name="Activity" variant="BoldDuotone" size={12} className="text-emerald-400 animate-pulse" />
          </div>
        </div>
        
        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Pending Intel</h4>
        <p className="text-[9px] text-slate-500 mt-2 max-w-[180px] font-mono uppercase leading-relaxed tracking-wider">
          AWAITING SELECTION: DATA STREAMS CURRENTLY IN STANDBY
        </p>
      </div>
    </div>
  );
}
