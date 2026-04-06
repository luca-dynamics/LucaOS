import React, { useState, useEffect, useRef } from "react";
import { Icon } from "../../ui/Icon";
import { tradingService } from "../../../services/tradingService";

interface SymbolSelectorProps {
  activeSymbol: string;
  onSelect: (symbol: string) => void;
  onClose?: () => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const COMMON_SYMBOLS = [
  "BTC/USDT",
  "ETH/USDT",
  "SOL/USDT",
  "BNB/USDT",
  "XRP/USDT",
  "ADA/USDT",
  "DOGE/USDT",
  "SUI/USDT",
  "PEPE/USDT",
  "AVAX/USDT",
];

export default function SymbolSelector({
  activeSymbol,
  onSelect,
  onClose,
  theme,
}: SymbolSelectorProps) {
  const [search, setSearch] = useState("");
  const [symbols, setSymbols] = useState<string[]>(COMMON_SYMBOLS);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadDynamicSymbols() {
      setLoading(true);
      try {
        const markets = await tradingService.getMarkets();
        if (isMounted && markets && Object.keys(markets).length > 0) {
          // Extract symbols from markets map
          const dynamicSymbols = Object.keys(markets).map(m => {
            const market = markets[m];
            return market.symbol || m;
          });
          
          // Merge with common symbols, ensuring uniqueness
          const merged = Array.from(new Set([...COMMON_SYMBOLS, ...dynamicSymbols]));
          setSymbols(merged);
        }
      } catch (e) {
        console.error("Failed to load dynamic symbols:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDynamicSymbols();
    return () => { isMounted = false; };
  }, []);

  const filtered = symbols.filter((s: string) =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a] font-mono border border-white/10 rounded-xl shadow-2xl overflow-hidden" ref={dropdownRef}>
      <div className="p-3 border-b border-white/[0.08] bg-white/[0.02]">
        <div className="relative group/search">
          <Icon name="Magnifer" variant="BoldDuotone" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/search:text-white/40 transition-colors" />
          <input
            autoFocus
            type="text"
            placeholder="PROBE TICKER..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-lg py-2.5 pl-9 pr-8 text-[11px] text-white placeholder:text-white/10 focus:outline-none focus:border-white/10 transition-all font-bold tracking-widest uppercase"
          />
          {loading && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2 text-white/20 animate-spin">
              <Icon name="Restart" variant="BoldDuotone" size={10} />
            </div>
          )}
          {search ? (
            <button 
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
            >
              <Icon name="CloseCircle" variant="BoldDuotone" size={12} />
            </button>
          ) : (
            <Icon 
              name="CloseCircle"
              variant="BoldDuotone"
              size={12} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/10 cursor-pointer hover:text-white/30 transition-colors" 
              onClick={onClose}
            />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 custom-scrollbar max-h-96">
        <div className="px-2 py-1.5 mb-1">
          <span className="text-[8px] font-black uppercase tracking-[0.25em] text-white/20">Market Core</span>
        </div>
        
        {filtered.length > 0 ? (
          filtered.map((symbol: string) => (
            <button
              key={symbol}
              onClick={() => {
                onSelect(symbol);
                setSearch("");
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[10px] font-bold transition-all group/item mb-0.5 ${
                activeSymbol === symbol 
                  ? "bg-white/[0.05] text-white border border-white/10" 
                  : "text-white/40 hover:bg-white/[0.03] hover:text-white/80 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon 
                  name="TrendUp"
                  variant="BoldDuotone"
                  size={12} 
                  className={activeSymbol === symbol ? "opacity-100" : "opacity-20 group-hover/item:opacity-40"} 
                  style={{ color: activeSymbol === symbol ? (theme?.hex || "#22d3ee") : undefined }}
                />
                <span className="tracking-widest uppercase">{symbol}</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-[8px] text-white/20 font-black">SELECT</span>
              </div>
            </button>
          ))
        ) : (
          <div className="p-8 text-center text-white/10 text-[10px] font-bold tracking-widest uppercase">
            No Ticker Found
          </div>
        )}
      </div>
      
      <div className="p-3 border-t border-white/[0.05] bg-black/40 flex justify-between items-center px-4">
        <span className="text-[8px] font-black tracking-widest text-white/10 uppercase">TRADING_TERMINAL_V1.2</span>
        <div className="flex gap-1">
          <div className="w-1 h-1 rounded-full bg-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
