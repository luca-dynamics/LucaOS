import React, { useState } from "react";
import { Icon } from "../../ui/Icon";

export interface Position {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  size: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  liquidationPrice: number;
  unrealizedPnL: number;
  pnlPercent: number;
  collateral?: number;
  closedAt?: number;
  exitPrice?: number;
  realizedPnL?: number;
}

export interface PositionsTableProps {
  themeCardBg?: string;
  positions: Position[];
  history?: any[];
  onClosePosition?: (symbol: string) => void;
  theme?: { hex: string; primary: string; border: string; bg: string; isLight?: boolean };
}

export default function PositionsTable({
  themeCardBg = "bg-transparent",
  positions = [],
  history = [],
  onClosePosition,
}: PositionsTableProps) {
  const [viewMode, setViewMode] = useState<"OPEN" | "HISTORY">("OPEN");

  const displayData = viewMode === "OPEN" ? positions : history;

  return (
    <div className={`${themeCardBg} flex flex-col h-full overflow-hidden text-white/90`}>
      <div className="py-1.5 px-3 border-b border-white/[0.08] bg-white/[0.03] flex justify-between items-center glass-blur">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewMode("OPEN")}
            className={`flex items-center gap-2 py-1 relative transition-all ${viewMode === "OPEN" ? "text-white" : "text-white/30 hover:text-white/60"}`}
          >
            <Icon name="Chart" variant="BoldDuotone" size={12} className={viewMode === "OPEN" ? "text-emerald-400" : "text-emerald-400/30"} />
            <h3 className="font-bold text-[10px] uppercase tracking-[0.2em]">Open Positions</h3>
            {viewMode === "OPEN" && <div className="absolute bottom-[-6px] left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />}
          </button>
          
          <button 
            onClick={() => setViewMode("HISTORY")}
            className={`flex items-center gap-2 py-1 relative transition-all ${viewMode === "HISTORY" ? "text-white" : "text-white/30 hover:text-white/60"}`}
          >
            <Icon name="Clock" variant="BoldDuotone" size={12} className={viewMode === "HISTORY" ? "text-amber-400" : "text-amber-400/30"} />
            <h3 className="font-bold text-[10px] uppercase tracking-[0.2em]">Trade History</h3>
            {viewMode === "HISTORY" && <div className="absolute bottom-[-6px] left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />}
          </button>
        </div>
        
        <span className="text-[9px] font-mono font-bold text-slate-400 border border-white/[0.1] px-2 py-0.5 rounded bg-black/40 uppercase tracking-widest">
          {displayData.length} {viewMode === "OPEN" ? "Active" : "Past"}
        </span>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar bg-[#0a0a0a]/40">
        {displayData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 text-[10px] gap-4 uppercase tracking-[0.3em] opacity-40">
             <div className="relative">
              {viewMode === "OPEN" ? <Icon name="Chart" variant="BoldDuotone" size={32} className="text-slate-500" /> : <Icon name="Clock" variant="BoldDuotone" size={32} className="text-slate-500" />}
              <div className={`absolute inset-0 blur-xl rounded-full ${viewMode === "OPEN" ? "bg-emerald-500/10" : "bg-amber-500/10"}`} />
            </div>
            <span>{viewMode === "OPEN" ? "No active market exposure" : "No closed trades recorded"}</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="text-[9px] font-bold text-slate-500 bg-black/20 sticky top-0 z-10 uppercase tracking-tighter">
              <tr>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-2 py-2 text-center">Side</th>
                <th className="px-2 py-2 text-right">Size</th>
                <th className="px-2 py-2 text-right">Entry</th>
                <th className="px-2 py-2 text-right">{viewMode === "OPEN" ? "Mark" : "Exit"}</th>
                <th className="px-2 py-2 text-right">{viewMode === "OPEN" ? "Unrealized" : "Realized"}</th>
                <th className="px-3 py-2 text-right">{viewMode === "OPEN" ? "Ex" : "Date"}</th>
              </tr>
            </thead>
            <tbody className="text-[10px] font-mono">
              {displayData.map((pos) => (
                <tr
                  key={pos.id}
                  className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group"
                >
                  <td className="px-3 py-2 font-bold text-slate-200">
                    {pos.symbol}
                    <div className="text-[8px] text-slate-600 font-normal">{pos.leverage}x isolated</div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span className={`text-[8px] font-bold px-1 rounded-sm border ${
                        pos.side === "LONG"
                          ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                          : "text-rose-400 border-rose-500/30 bg-rose-500/10"
                      }`}>
                      {pos.side}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right text-slate-300">
                    {pos.size.toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-right text-slate-500">
                    ${pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                  </td>
                  <td className="px-2 py-2 text-right text-slate-300 font-bold">
                    ${(viewMode === "OPEN" ? pos.markPrice : pos.exitPrice).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`font-bold ${(viewMode === "OPEN" ? pos.unrealizedPnL : pos.realizedPnL) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {(viewMode === "OPEN" ? pos.unrealizedPnL : pos.realizedPnL) >= 0 ? "+" : ""}{(viewMode === "OPEN" ? pos.unrealizedPnL : pos.realizedPnL).toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {viewMode === "OPEN" ? (
                      <button
                        onClick={() => onClosePosition?.(pos.symbol)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-500/20 text-rose-500/60 rounded border border-white/5"
                      >
                        <Icon name="Trash" variant="BoldDuotone" size={12} />
                      </button>
                    ) : (
                      <span className="text-[8px] text-white/20 whitespace-nowrap">
                        {new Date(pos.closedAt).toLocaleDateString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
