import React from "react";
import * as LucideIcons from "lucide-react";
const {
  BarChart2,
  Trash2,
} = LucideIcons as any;

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
}

interface PositionsTableProps {
  themeCardBg?: string;
  positions: Position[];
  onClosePosition?: (symbol: string) => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function PositionsTable({
  themeCardBg = "bg-transparent",
  positions = [],
  onClosePosition,
  theme,
}: PositionsTableProps) {
  return (
    <div className={`${themeCardBg} flex flex-col h-full overflow-hidden text-white/90`}>
      <div className="p-2 border-b border-white/5 bg-white/5 flex justify-between items-center">
        <h3 className="font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
          <BarChart2 size={14} style={{ color: theme?.hex || "#22d3ee" }} />
          Active Intercepts
        </h3>
        <span className="text-[8px] font-bold text-slate-500 border border-white/5 px-2 py-0.5 rounded-md bg-black/20">
          {positions.length} Nodes
        </span>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        {positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 text-[10px] gap-3 uppercase tracking-widest">
            <BarChart2 size={24} className="opacity-10" />
            <span>Scanning for active signals...</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="text-[9px] font-bold text-slate-500 bg-black/20 sticky top-0 z-10 uppercase tracking-tighter">
              <tr>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-2 py-2 text-center">Side</th>
                <th className="px-2 py-2 text-right">Size</th>
                <th className="px-2 py-2 text-right">Entry</th>
                <th className="px-2 py-2 text-right">Mark</th>
                <th className="px-2 py-2 text-right">PNL</th>
                <th className="px-2 py-2 text-right">Liq</th>
                <th className="px-3 py-2 text-right">Ex</th>
              </tr>
            </thead>
            <tbody className="text-[10px] font-mono">
              {positions.map((pos) => (
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
                    ${pos.markPrice.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`font-bold ${pos.unrealizedPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {pos.unrealizedPnL >= 0 ? "+" : ""}{pos.unrealizedPnL.toFixed(2)}
                      </span>
                      <span className={`text-[8px] ${pos.pnlPercent >= 0 ? "text-emerald-500/50" : "text-rose-500/50"}`}>
                        ({pos.pnlPercent.toFixed(1)}%)
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right text-rose-500/40 text-[9px]">
                    ${pos.liquidationPrice.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => onClosePosition?.(pos.symbol)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-500/20 text-rose-500/60 rounded border border-white/5"
                    >
                      <Trash2 size={12} />
                    </button>
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
