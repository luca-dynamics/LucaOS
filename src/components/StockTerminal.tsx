import React, { useEffect, useState, useRef } from "react";
import { Icon } from "./ui/Icon";
import { apiUrl } from "../config/api";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
} from "lightweight-charts";

interface Props {
  onClose: () => void;
  initialSymbol?: string;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const StockTerminal: React.FC<Props> = ({ onClose, initialSymbol, theme }) => {
  const themePrimary = theme?.primary || "text-emerald-500";
  const themeBorder = theme?.border || "border-emerald-500";
  const themeHex = theme?.hex || "#22C55E";
  const [symbol, setSymbol] = useState(initialSymbol || "AAPL");
  const [stockData, setStockData] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stockRes, newsRes] = await Promise.all([
        fetch(apiUrl(`/api/finance/stock/${symbol}`)),
        fetch(apiUrl("/api/finance/news")),
      ]);

      if (stockRes.ok) {
        const data = await stockRes.json();
        setStockData(data || null);
      }

      if (newsRes.ok) {
        const data = await newsRes.json();
        if (Array.isArray(data)) {
          setNews(data);
        } else if (data?.news) {
          setNews(Array.isArray(data.news) ? data.news : Object.values(data.news));
        } else {
          setNews([]);
        }
      }
    } catch {
      console.error("Stock Data Fetch Failed");
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [symbol]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 glass-blur animate-in zoom-in-95 duration-300 font-mono p-0 sm:p-4 overflow-hidden">
      <div
        className="relative w-full h-full sm:h-[85vh] sm:w-[95%] max-w-[1400px] bg-black/40 glass-blur border-none sm:border border-white/10 rounded-none sm:rounded-lg flex flex-col overflow-hidden shadow-2xl"
        style={{ boxShadow: `0 0 50px ${themeHex}1a` }}
      >
        <div className="absolute inset-0 opacity-40 pointer-events-none -z-10" style={{ background: `radial-gradient(circle at 50% 50%, ${themeHex}25, transparent 60%)`, filter: "blur(40px)" }} />
        
        <div className={`h-16 flex-shrink-0 border-b ${themeBorder}/50 flex items-center justify-between px-4 sm:px-6 relative z-30`} style={{ backgroundColor: `${themeHex}1F` }}>
          <div className="flex items-center gap-4 overflow-hidden">
            <div className={`p-2 rounded border ${themeBorder}/30 ${themePrimary} flex-shrink-0`} style={{ backgroundColor: `${themeHex}1F` }}>
              <Icon name="Pulse" size={18} variant="BoldDuotone" color={themeHex} />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-display text-xl font-bold text-white tracking-widest uppercase">MARKET WATCH</h2>
              <div className={`text-[10px] font-mono ${themePrimary} flex gap-4 truncate`}>
                <span>STATUS: {stockData?.status || "INIT"}</span>
                <span className="hidden sm:inline">EXCHANGE: NASDAQ/NYSE</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-all rounded-lg hover:bg-white/5 active:scale-95">
            <Icon name="CloseCircle" size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          <div className={`w-full lg:w-80 border-b lg:border-b-0 lg:border-r ${themeBorder}/30 flex flex-col p-6`} style={{ backgroundColor: `${themeHex}0D` }}>
            <div className="mb-6 relative">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && fetchData()}
                className={`w-full bg-slate-900 border border-slate-700 rounded p-3 pl-4 text-xl font-bold text-white outline-none tracking-widest focus:${themeBorder}`}
                placeholder="TICKER"
              />
              <button onClick={fetchData} className={`absolute right-3 top-1/2 -translate-y-1/2 ${themePrimary}`}>
                <Icon name="Restart" size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            {stockData ? (
              <div className="space-y-6">
                <div>
                  <div className="text-4xl font-bold text-white">${stockData.price}</div>
                  <div className={`flex items-center gap-2 text-sm font-bold ${parseFloat(stockData.change) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    <Icon name="Chart" size={14} color={parseFloat(stockData.change) >= 0 ? "#10b981" : "#ef4444"} />
                    {stockData.change} ({stockData.changePercent})
                  </div>
                </div>

                <div className={`space-y-3 text-xs text-slate-400 border-t ${themeBorder}/30 pt-4`}>
                  <div className="flex justify-between"><span>OPEN</span><span className="text-white">{stockData.open}</span></div>
                  <div className="flex justify-between"><span>HIGH</span><span className="text-white">{stockData.high}</span></div>
                  <div className="flex justify-between"><span>LOW</span><span className="text-white">{stockData.low}</span></div>
                  <div className="flex justify-between"><span>VOL</span><span className="text-white">{stockData.volume}</span></div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-4">
                  <button 
                    onClick={async () => {
                      setIsPredicting(true);
                      try {
                        const { llmService } = await import("../services/llmService");
                        const brain = llmService.getProvider("gemini");
                        const insight = await brain.generate(`Analyze ${symbol} stock. Give a 1-sentence sentiment and a 3-sentence technical/fundamental outlook.`, { temperature: 0.5 });
                        setAiInsight(insight);
                      } catch {
                        setAiInsight("Unable to connect to market oracle.");
                      } finally {
                        setIsPredicting(false);
                      }
                    }}
                    disabled={isPredicting}
                    className="w-full py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:bg-white/10"
                    style={{ borderColor: themeHex, color: themeHex }}
                  >
                    <Icon name="Sparkles" size={14} />
                    {isPredicting ? "CONSULTING ORACLE..." : "AI PREDICTION"}
                  </button>
                  {aiInsight && (
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 animate-in fade-in slide-in-from-top-2">
                       <p className="text-[10px] leading-relaxed italic text-white/80">{aiInsight}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-600 text-xs italic mt-10">Enter a ticker to load data.</div>
            )}
          </div>

          <div className="flex-1 bg-transparent relative flex flex-col min-h-[300px] lg:min-h-0">
            <ChartContainer symbol={symbol} />
          </div>

          <div className={`w-full lg:w-80 border-t lg:border-t-0 lg:border-l ${themeBorder}/30 flex flex-col h-64 lg:h-auto`} style={{ backgroundColor: `${themeHex}0D` }}>
            <div className={`p-4 border-b ${themeBorder}/30 text-xs font-bold ${themePrimary} tracking-widest flex items-center gap-2`}>
              <Icon name="Notes" size={12} color={themeHex} /> WATCHLIST
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {news.map((item, i) => (
                <div key={i} className="group cursor-pointer">
                  <div className={`text-[10px] ${themePrimary} mb-1 flex justify-between opacity-70`}>
                    <span>{item.source}</span><span>{item.time}</span>
                  </div>
                  <div className="text-xs text-slate-300 font-bold transition-colors group-hover:text-white">{item.title}</div>
                  <div className={`h-px w-full ${themeBorder}/20 mt-3`}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockTerminal;

const ChartContainer: React.FC<{ symbol: string }> = ({ symbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    const initChart = async () => {
      if (!chartContainerRef.current) return;
      const chart = createChart(chartContainerRef.current, {
        layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#999" },
        grid: { vertLines: { color: "#111" }, horzLines: { color: "#111" } },
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        timeScale: { timeVisible: true },
      });
      chartRef.current = chart;

      const candleSeries = chart.addSeries(CandlestickSeries, { upColor: "#22C55E", downColor: "#ef4444" });
      
      try {
        const res = await fetch(apiUrl(`/api/finance/market/history/${symbol}`));
        const data = await res.json();
        if (data.success && data.data) {
          candleSeries.setData(data.data);
          const volumeSeries = chart.addSeries(HistogramSeries, { color: "#26a69a", priceFormat: { type: "volume" }, priceScaleId: "" });
          volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
          volumeSeries.setData(data.data.map((d: any) => ({ time: d.time, value: d.volume, color: d.close >= d.open ? "#26a69a40" : "#ef535040" })));
        }
      } catch (err) { console.error("Chart Data Error", err); }

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
        }
      };
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
      };
    };
    initChart();
  }, [symbol]);

  return <div ref={chartContainerRef} className="w-full h-full relative" />;
};
