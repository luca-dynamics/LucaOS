import React from "react";
import { CandleStickChart } from "./CandleStickChart";

interface MarketChartProps {
  symbol?: string;
  theme?: { hex: string; primary: string; border: string; bg: string; isLight?: boolean };
}

export default function MarketChart({
  symbol = "BTC/USDT",
  theme,
}: MarketChartProps) {
  const isLight = theme?.isLight;
  return (
    <div className={`${isLight ? "bg-white/50" : "bg-transparent"} flex flex-col h-full w-full overflow-hidden`}>
      <div className={`flex-1 relative overflow-hidden bg-transparent`}>
        <div className="absolute inset-0 w-full h-full">
           <CandleStickChart 
             symbol={symbol} 
             provider="binance" 
             theme={theme}
           />
        </div>
      </div>
    </div>
  );
}
