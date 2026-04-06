import React from "react";
import { Icon } from "../../ui/Icon";
import { CoinSourceConfig, CoinSourceType } from "../../../types/trading";
import { tradingService } from "../../../services/tradingService";

interface CoinSourceEditorProps {
  config: CoinSourceConfig;
  onChange: (config: CoinSourceConfig) => void;
  theme?: { hex: string; primary: string; border: string; bg: string; isLight?: boolean };
}

const DEFAULT_DISPLAY_COINS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "DOTUSDT",
];

export function CoinSourceEditor({ config, onChange, theme }: CoinSourceEditorProps) {
  const isLight = theme?.isLight;
  const [searchTerm, setSearchTerm] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [availableMarkets, setAvailableMarkets] = React.useState<string[]>([]);

  React.useEffect(() => {
    // ⚡ Dynamically Fetch all available markets to fix "SUI" and others
    const fetchMarkets = async () => {
      try {
        const data = await tradingService.getMarkets();
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          const symbols = Object.keys(data).filter(s => s.endsWith('USDT') || s.endsWith('BTC'));
          setAvailableMarkets(symbols);
        } else {
          setAvailableMarkets(DEFAULT_DISPLAY_COINS);
        }
      } catch (e) {
        console.warn("[CoinSourceEditor] Market fetch failed:", e);
        setAvailableMarkets(DEFAULT_DISPLAY_COINS);
      }
    };
    fetchMarkets();
  }, []);

  const handleTypeChange = (type: CoinSourceType) => {
    onChange({ ...config, sourceType: type });
  };

  const toggleStaticCoin = (coin: string) => {
    const current = config.staticCoins || [];
    const updated = current.includes(coin)
      ? current.filter((c) => c !== coin)
      : [...current, coin];
    onChange({ ...config, staticCoins: updated });
  };

  const handleSearch = (val: string) => {
    setSearchTerm(val);
    if (val.length >= 2) {
      const filtered = availableMarkets.filter(c => 
        c.toLowerCase().includes(val.toLowerCase()) && 
        !(config.staticCoins || []).includes(c)
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`${isLight ? "bg-white shadow-sm" : "bg-[#050505]"} p-4 shadow-inner rounded-xl`} style={{ border: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"}` }}>
        <h3 className={`text-[10px] font-black ${isLight ? "text-slate-400" : "text-slate-500"} mb-4 tracking-[0.2em] flex items-center gap-2`}>
          <Icon name="Database" size={14} style={{ color: theme?.hex || "#0ea5e9" }} />
          Source Selection
        </h3>

        <div className="space-y-2">
          <label className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
            config.sourceType === CoinSourceType.STATIC 
              ? isLight ? "shadow-sm border-opacity-30" : "bg-white/[0.03]" 
              : isLight ? "bg-white hover:border-slate-200" : "bg-[#050505] hover:border-white/10"
          }`} style={{ 
            border: `1px solid ${config.sourceType === CoinSourceType.STATIC ? `${theme?.hex}66` : "rgba(255,255,255,0.05)"}`,
            backgroundColor: config.sourceType === CoinSourceType.STATIC && isLight ? `${theme?.hex}08` : "" 
          }}>
            <input
              type="radio"
              name="sourceType"
              checked={config.sourceType === CoinSourceType.STATIC}
              onChange={() => handleTypeChange(CoinSourceType.STATIC)}
              className="w-3 h-3 cursor-pointer"
              style={{ accentColor: theme?.hex || "#0ea5e9" }}
            />
            <div className="flex-1">
              <div className={`text-[10px] font-bold tracking-wider ${config.sourceType === CoinSourceType.STATIC ? (isLight ? "text-slate-900" : "text-white") : "text-slate-400"}`}>
                Static List
              </div>
              <div className="text-[9px] text-slate-600 mt-0.5 font-mono tracking-tighter">
                Specific Asset Pair Targeting
              </div>
            </div>
          </label>

          <label className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
            config.sourceType === CoinSourceType.AI500 
              ? isLight ? "bg-emerald-50" : "bg-emerald-500/5" 
              : isLight ? "bg-white hover:border-slate-200" : "bg-[#050505] hover:border-white/10"
          }`} style={{ border: `1px solid ${config.sourceType === CoinSourceType.AI500 ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.05)"}` }}>
            <input
              type="radio"
              name="sourceType"
              checked={config.sourceType === CoinSourceType.AI500}
              onChange={() => handleTypeChange(CoinSourceType.AI500)}
              className="accent-emerald-500 w-3 h-3"
            />
            <div className="flex-1">
              <div className={`text-[10px] font-bold tracking-wider ${config.sourceType === CoinSourceType.AI500 ? (isLight ? "text-slate-900" : "text-white") : "text-slate-400"}`}>
                Global AI Scanner
              </div>
              <div className="text-[9px] text-slate-600 mt-0.5 font-mono tracking-tighter">
                Dynamic Top 500 Volume/OI Deployment
              </div>
            </div>
          </label>
        </div>
      </div>

      {config.sourceType === CoinSourceType.STATIC && (
        <div className={`${isLight ? "bg-white shadow-sm" : "bg-[#050505]"} p-4 shadow-inner animate-in fade-in slide-in-from-top-1 rounded-xl`} style={{ border: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"}` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black text-slate-500 tracking-[0.2em]">
              Markets
            </h3>
            <div className="relative">
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search Assets"
                className={`text-[9px] font-mono ${isLight ? "bg-slate-50 text-slate-800" : "bg-[#080808] text-white"} rounded-sm px-2 py-1.5 outline-none w-32 focus:w-48 transition-all focus:border-opacity-100 placeholder:text-slate-700`}
                style={{ border: `1px solid ${theme?.hex || "#0ea5e9"}4d` }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchTerm) {
                    const val = searchTerm.toUpperCase().trim();
                    if (val && !config.staticCoins?.includes(val)) {
                      toggleStaticCoin(val);
                      setSearchTerm("");
                      setSuggestions([]);
                    }
                  }
                }}
              />
              <Icon name="Search" size={10} className="absolute right-2 top-2.5 text-slate-500 opacity-40 pointer-events-none" />
              
              {suggestions.length > 0 && (
                <div className={`absolute top-full right-0 mt-1 w-48 ${isLight ? "bg-white border-slate-200" : "bg-[#0c0c0c] border-white/10"} border rounded-lg shadow-2xl z-[100] overflow-hidden py-1`}>
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        toggleStaticCoin(s);
                        setSearchTerm("");
                        setSuggestions([]);
                      }}
                      className={`w-full text-left px-3 py-2 text-[9px] font-mono ${isLight ? "hover:bg-slate-50 text-slate-700" : "hover:bg-white/5 text-slate-300"} transition-colors flex items-center justify-between group`}
                    >
                      {s}
                      <Icon name="Plus" size={8} className="opacity-0 group-hover:opacity-40" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 py-1">
            {DEFAULT_DISPLAY_COINS.map((coin: string) => (
              <button
                key={coin}
                onClick={() => toggleStaticCoin(coin)}
                className={`py-2 text-[9px] font-mono border transition-all rounded-lg flex flex-col items-center justify-center gap-1 ${
                  config.staticCoins?.includes(coin)
                    ? ""
                    : isLight ? "bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600" : "bg-[#0b0b0b] text-slate-600 border-white/5 hover:border-white/10"
                }`}
                style={config.staticCoins?.includes(coin) ? { 
                  backgroundColor: theme?.hex || "#0ea5e9",
                  borderColor: theme?.hex || "#0ea5e9",
                  color: "#050505",
                  boxShadow: `0 4px 12px ${theme?.hex || "#0ea5e9"}33`
                } : { border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div className="leading-none">{coin.replace("USDT", "")}</div>
                <div className={`text-[7px] opacity-60 ${config.staticCoins?.includes(coin) ? "text-slate-900" : "text-slate-500"}`}>PERP</div>
              </button>
            ))}
          </div>

          {(config.staticCoins?.filter(c => !DEFAULT_DISPLAY_COINS.includes(c)).length || 0) > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="text-[8px] font-black text-slate-600 mb-2 tracking-widest uppercase">Target Focus</div>
              <div className="flex flex-wrap gap-1.5">
                {config.staticCoins?.filter(c => !DEFAULT_DISPLAY_COINS.includes(c)).map(coin => (
                  <button
                    key={coin}
                    onClick={() => toggleStaticCoin(coin)}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-mono text-white flex items-center gap-2 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all group"
                  >
                    {coin}
                    <Icon name="X" size={8} className="opacity-40 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {config.sourceType === CoinSourceType.AI500 && (
        <div className={`${isLight ? "bg-white shadow-sm" : "bg-[#050505]"} p-4 shadow-inner animate-in fade-in slide-in-from-top-1 rounded-xl`} style={{ border: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"}` }}>
          <h3 className="text-[10px] font-black text-slate-500 mb-3 tracking-[0.2em]">
            Scanner Engine Config
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-bold text-slate-600 mb-1.5 block tracking-widest">
                Deployment Limit
              </label>
              <input
                type="number"
                value={config.limit || 10}
                onChange={(e) =>
                  onChange({ ...config, limit: parseInt(e.target.value) })
                }
                className={`w-full ${isLight ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-[#080808] border-white/5 text-white"} border border-white/10 rounded-sm px-3 py-2 text-[10px] font-mono outline-none focus:border-opacity-50 transition-all`}
                style={{ focusBorderColor: theme?.hex || "#0ea5e9" } as any}
              />
            </div>
            
            <div 
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                config.useOITop ? (isLight ? "bg-emerald-50 border-emerald-500/20" : "bg-emerald-500/5 border-emerald-500/20") : (isLight ? "bg-slate-50 border-slate-200" : "bg-[#080808] border-white/5")
              }`}
              onClick={() => onChange({ ...config, useOITop: !config.useOITop })}
            >
              <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                config.useOITop ? "bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : (isLight ? "border-slate-300" : "border-slate-800")
              }`}>
                {config.useOITop && <Icon name="Check" size={8} className="text-white" />}
              </div>
              <div className="flex-1">
                <div className={`text-[10px] font-bold tracking-wider ${config.useOITop ? (isLight ? "text-slate-900" : "text-white") : "text-slate-500"}`}>
                  Prioritize OI Spikes
                </div>
                <div className="text-[8px] text-slate-600 font-mono tracking-tighter">
                  Real-time Open Interest Anomaly Detection
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
