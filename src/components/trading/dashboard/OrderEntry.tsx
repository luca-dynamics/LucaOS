import React, { useState } from "react";
import { Icon } from "../../ui/Icon";

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
    <div className={`${themeCardBg} flex flex-col gap-3 font-mono overflow-hidden p-2 bg-black/20 glass-blur border border-white/5 rounded-xl`}>
      <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
          <Icon name="Bolt" variant="BoldDuotone" size={13} style={{ color: theme?.hex || "#fbbf24" }} />
          Manual Order Entry
        </h3>
        <span className="text-[10px] font-black text-white/60 px-2 py-0.5 rounded border border-white/10 bg-white/5 tracking-wider">
          {activeSymbol}
        </span>
      </div>

      <div className="flex bg-white/[0.02] rounded-lg p-1 border border-white/5 gap-1 shadow-inner">
        <button
          onClick={() => setSide("LONG")}
          className={`flex-1 text-[10px] font-black py-2 rounded-md transition-all tracking-[0.1em] ${
            side === "LONG" 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
              : "text-white/20 hover:text-white/40"
          }`}
        >
          LONG
        </button>
        <button
          onClick={() => setSide("SHORT")}
          className={`flex-1 text-[10px] font-black py-2 rounded-md transition-all tracking-[0.1em] ${
            side === "SHORT" 
              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]" 
              : "text-white/20 hover:text-white/40"
          }`}
        >
          SHORT
        </button>
      </div>

      <div className="space-y-4">
        <div className="relative group/input">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-white/20 group-focus-within/input:text-white/40 transition-colors">
            <Icon name="Dollar" variant="BoldDuotone" size={13} />
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/5 rounded-lg py-2.5 pl-8 pr-12 text-sm text-white placeholder-white/10 focus:outline-none focus:border-white/20 transition-all font-mono font-bold"
            placeholder="Amount"
          />
          <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[9px] text-white/20 uppercase font-black tracking-widest">USDT</span>
        </div>

        <div className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2.5 group/lev">
          <span className="text-[9px] text-white/20 uppercase font-black tracking-widest group-hover:text-white/40 transition-colors">Leverage</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              className="w-12 bg-transparent border-none text-sm text-white text-right focus:outline-none font-mono font-bold"
              min="1"
              max="125"
            />
            <span className="text-xs text-white/20 font-black">x</span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full py-3 rounded-xl text-[11px] font-black tracking-[0.15em] flex items-center justify-center gap-2 transition-all border duration-500 ${
            isSubmitting 
              ? "bg-white/5 border-white/5 text-white/20 cursor-wait" 
              : side === "LONG" 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/30 hover:border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.1)]"
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-current animate-ping" />
              TRANSMITTING...
            </div>
          ) : (
            `COMMIT ${side} ORDER`
          )}
        </button>
      </div>
    </div>
  );
}
