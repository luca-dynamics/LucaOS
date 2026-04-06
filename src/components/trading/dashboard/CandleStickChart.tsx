import React, { useEffect, useRef, useState, memo } from "react";
import { Icon } from "../../ui/Icon";

interface CandleStickChartProps {
  symbol?: string;
  theme?: { hex: string; primary: string; border: string; bg: string; isLight?: boolean };
  height?: string | number;
  provider?: string;
}

const INTERVALS = [
  { id: '1', label: '1m' },
  { id: '5', label: '5m' },
  { id: '15', label: '15m' },
  { id: '30', label: '30m' },
  { id: '60', label: '1H' },
  { id: '240', label: '4H' },
  { id: 'D', label: '1D' },
  { id: 'W', label: '1W' },
];

const EXCHANGES: Record<string, string> = {
  'binance': 'BINANCE',
  'bybit': 'BYBIT',
  'okx': 'OKX',
  'bitget': 'BITGET',
  'mexc': 'MEXC',
  'gate': 'GATEIO',
  'hyperliquid': 'BINANCE', 
};

const CandleStickChartComponent = ({
  symbol = "BTC/USDT",
  height = "curr",
  provider = "binance",
  theme,
}: CandleStickChartProps) => {
  const isLight = theme?.isLight;
  const containerRef = useRef<HTMLDivElement>(null);
  const [interval, setIntervalVal] = useState("60");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const getTradingViewSymbol = (sym: string, prov: string) => {
    const clean = sym.replace("/", "").toUpperCase();
    const exchange = EXCHANGES[prov.toLowerCase()] || "BINANCE";
    if (prov.toLowerCase() === 'hyperliquid') {
       return `BINANCE:${clean}USDT.P`;
    }
    return `${exchange}:${clean}.P`;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container";
    widgetContainer.style.height = "100%";
    widgetContainer.style.width = "100%";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "calc(100% - 32px)"; // Leave space for overlay
    widgetDiv.style.width = "100%";

    widgetContainer.appendChild(widgetDiv);
    containerRef.current.appendChild(widgetContainer);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    const config = {
      "autosize": true,
      "symbol": getTradingViewSymbol(symbol, provider),
      "interval": interval,
      "timezone": "Etc/UTC",
      "theme": isLight ? "light" : "dark",
      "style": "1",
      "locale": "en",
      "enable_publishing": false,
      "hide_top_toolbar": false,
      "hide_legend": false,
      "save_image": false,
      "calendar": false,
      "hide_volume": false,
      "support_host": "https://www.tradingview.com",
      "backgroundColor": isLight ? "rgba(255, 255, 255, 1)" : "rgba(8, 8, 8, 1)",
      "gridColor": isLight ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.03)"
    };

    script.innerHTML = JSON.stringify(config);
    widgetContainer.appendChild(script);
    setIsLoaded(true);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol, interval, provider, isLight]);

  return (
    <div className={`w-full flex flex-col ${isLight ? "bg-white" : "bg-[#080808]"} overflow-hidden relative ${isFullscreen ? 'fixed inset-0 z-[1000] h-screen' : 'h-full'}`}>
      
      {/* Chart Toolbar (Refined) */}
      <div className={`flex items-center justify-between px-3 py-1 border-b ${isLight ? "border-black/5 bg-slate-50" : "border-white/5 bg-[#0a0a0a]"} flex-shrink-0`}>
         <div className={`flex ${isLight ? "bg-black/5" : "bg-black/60"} p-0.5 rounded border ${isLight ? "border-black/5" : "border-white/5"}`}>
            {INTERVALS.map((int) => (
              <button
                key={int.id}
                onClick={() => setIntervalVal(int.id)}
                className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold transition-all ${
                  interval === int.id
                    ? "bg-amber-500 text-white shadow-sm"
                    : `${isLight ? "text-slate-400 hover:text-slate-900" : "text-white/30 hover:text-white/60"}`
                }`}
              >
                {int.label}
              </button>
            ))}
         </div>

         <button 
           onClick={() => setIsFullscreen(!isFullscreen)}
           className={`p-1 px-2 rounded hover:bg-white/5 ${isLight ? "text-slate-500 hover:text-slate-900" : "text-white/40 hover:text-white"} transition-all text-[10px] flex items-center gap-1.5`}
         >
            {isFullscreen ? <Icon name="Minimize" variant="BoldDuotone" size={10} /> : <Icon name="Maximize" variant="BoldDuotone" size={10} />}
            <span className={`font-bold ${isLight ? "opacity-60" : "opacity-40"} uppercase tracking-tighter`}>{isFullscreen ? "Exit" : "Expand"}</span>
         </button>
      </div>

      {/* Chart Target */}
      <div 
        ref={containerRef} 
        className="flex-1 w-full"
        style={{ minHeight: isFullscreen ? "auto" : "500px" }}
      />
      
      {/* OS Overlay - Fixed position */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
        <div className={`flex items-center gap-1 ${isLight ? "bg-white/80" : "bg-black/60"} px-2 py-1 rounded glass-blur border ${isLight ? "border-black/5" : "border-white/5"} opacity-40`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className={`text-[8px] font-mono ${isLight ? "text-slate-900" : "text-white"} tracking-[0.3em] uppercase`}>Luca Core Integrated</span>
        </div>
      </div>

      {!isLoaded && (
        <div className={`absolute inset-0 flex items-center justify-center ${isLight ? "bg-white" : "bg-[#080808]"}`}>
           <div className={`${isLight ? "text-slate-200" : "text-white/20"} font-mono text-xs animate-pulse`}>Initializing Stream...</div>
        </div>
      )}
    </div>
  );
};

export const CandleStickChart = memo(CandleStickChartComponent);
