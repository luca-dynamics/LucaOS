import React, { useState } from "react";
import * as LucideIcons from "lucide-react";
const {
  DollarSign,
  Zap,
} = LucideIcons as any;

interface OrderEntryProps {
  themeCardBg?: string;
  activeSymbol?: string;
  onPlaceOrder: (order: any) => Promise<void>;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function OrderEntry({
  themeCardBg = "bg-transparent",
  activeSymbol = "BTC/USDT",
  onPlaceOrder,
  theme,
}: OrderEntryProps) {
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");
  const [amount, setAmount] = useState("100");
  const [leverage, setLeverage] = useState("10");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!amount || isNaN(parseFloat(amount))) return;
    setIsSubmitting(true);
    try {
      await onPlaceOrder({
        symbol: activeSymbol,
        side,
        amount: parseFloat(amount),
        leverage: parseInt(leverage),
        type: "MARKET",
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${themeCardBg} flex flex-col gap-3 font-mono overflow-hidden p-3`}>
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h3 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
          <Zap size={14} style={{ color: theme?.hex || "#fbbf24" }} />
          Neural Link
        </h3>
        <span className="text-[9px] font-bold text-slate-400 px-2 py-0.5 rounded border border-white/10 bg-white/5 uppercase">
          {activeSymbol}
        </span>
      </div>

      <div className="flex bg-white/[0.03] rounded-lg p-1 border border-white/5 gap-1">
        <button
          onClick={() => setSide("LONG")}
          className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all ${
            side === "LONG" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-slate-500 hover:text-slate-400"
          }`}
        >
          LONG
        </button>
        <button
          onClick={() => setSide("SHORT")}
          className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all ${
            side === "SHORT" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "text-slate-500 hover:text-slate-400"
          }`}
        >
          SHORT
        </button>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
            <DollarSign size={12} />
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg py-2 pl-8 pr-12 text-xs text-white placeholder-slate-600 focus:outline-none transition-all font-mono"
            style={{ borderColor: theme ? `${theme.hex}33` : 'rgba(255,255,255,0.1)' }}
            placeholder="Amount"
          />
          <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[9px] text-slate-600 uppercase font-bold">USDT</span>
        </div>

        <div className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2">
          <span className="text-[9px] text-slate-500 uppercase font-bold">Leverage</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              className="w-12 bg-transparent border-none text-xs text-white text-right focus:outline-none font-mono"
              min="1"
              max="125"
            />
            <span className="text-xs text-slate-600 font-bold">x</span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full py-2.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 transition-all border ${
            isSubmitting 
              ? "bg-white/5 border-white/10 text-slate-500" 
              : side === "LONG" 
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                : "bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
          }`}
        >
          {isSubmitting ? "TRANSMITTING..." : `COMMIT ${side} ORDER`}
        </button>
      </div>
    </div>
  );
}
