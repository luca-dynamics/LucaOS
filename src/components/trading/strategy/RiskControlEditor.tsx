import React from "react";
import { Icon } from "../../ui/Icon";
import { RiskControlConfig } from "../../../types/trading";

interface RiskControlEditorProps {
  config: RiskControlConfig;
  onChange: (config: RiskControlConfig) => void;
  theme?: { hex: string; primary: string; border: string; bg: string; isLight?: boolean };
}

export function RiskControlEditor({
  config,
  onChange,
  theme,
}: RiskControlEditorProps) {
  const isLight = theme?.isLight;
  const update = (updates: Partial<RiskControlConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      {/* Position Sizing */}
      <div className={`p-4 border rounded-xl ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#050505] border-white/5"} shadow-inner`}>
        <h3 className={`text-[10px] font-black ${isLight ? "text-slate-400" : "text-slate-500"} mb-4 tracking-[0.2em] flex items-center gap-2`}>
          <Icon name="Wallet" size={14} style={{ color: theme?.hex || "#0ea5e9" }} />
          Sizing And Leverage
        </h3>

        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <div>
            <label className="text-[9px] font-bold text-slate-600 mb-1.5 block tracking-widest">
              Max Positions
            </label>
            <input
              type="number"
              value={config.maxPositions || 3}
              onChange={(e) =>
                update({ maxPositions: parseInt(e.target.value) })
              }
              className={`w-full ${isLight ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-[#050505] border-white/10 text-white"} border border-white/10 rounded-sm px-3 py-2 text-[10px] font-mono outline-none focus:border-opacity-50 transition-all`}
              style={{ focusBorderColor: theme?.hex || "#0ea5e9" } as any}
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-600 mb-1.5 block tracking-widest">
              Position Size %
            </label>
            <div className="relative">
              <input
                type="number"
                value={config.positionSizePercent}
                onChange={(e) =>
                  update({ positionSizePercent: parseFloat(e.target.value) })
                }
                className={`w-full ${isLight ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-[#050505] border-white/10 text-white"} border border-white/10 rounded-sm px-3 py-2 text-[10px] font-mono outline-none focus:border-opacity-50 transition-all pr-7`}
                style={{ focusBorderColor: theme?.hex || "#0ea5e9" } as any}
              />
              <span className="absolute right-3 top-2.5 text-[10px] text-slate-600 font-mono">
                %
              </span>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-bold text-slate-600 mb-1.5 block tracking-widest">
              Btc/Eth Leverage
            </label>
            <div className="relative">
              <input
                type="number"
                value={config.btcEthLeverage}
                onChange={(e) =>
                  update({ btcEthLeverage: parseInt(e.target.value) })
                }
                className={`w-full ${isLight ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-[#050505] border-white/10 text-white"} border border-white/10 rounded-sm px-3 py-2 text-[10px] font-mono outline-none focus:border-opacity-50 transition-all pr-7`}
                style={{ focusBorderColor: theme?.hex || "#0ea5e9" } as any}
              />
              <span className="absolute right-3 top-2.5 text-[10px] text-slate-600 font-mono">
                X
              </span>
            </div>
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-600 mb-1.5 block tracking-widest">
              Altcoin Leverage
            </label>
            <div className="relative">
              <input
                type="number"
                value={config.altcoinLeverage}
                onChange={(e) =>
                  update({ altcoinLeverage: parseInt(e.target.value) })
                }
                className={`w-full ${isLight ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-[#050505] border-white/10 text-white"} border border-white/10 rounded-sm px-3 py-2 text-[10px] font-mono outline-none focus:border-opacity-50 transition-all pr-7`}
                style={{ focusBorderColor: theme?.hex || "#0ea5e9" } as any}
              />
              <span className="absolute right-3 top-2.5 text-[10px] text-slate-600 font-mono">
                X
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Adaptive Risk */}
      <div className={`p-4 border rounded-xl transition-all ${
        config.adaptiveRisk 
          ? isLight ? "bg-white/50 shadow-[0_0_20px_rgba(255,255,255,0.02)]" : "bg-white/5 border-white/20" 
          : isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#050505] border-white/5 shadow-inner"
      }`} style={config.adaptiveRisk ? { borderColor: `${theme?.hex}4d` } : {}}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-[10px] font-black tracking-[0.2em] flex items-center gap-2 ${config.adaptiveRisk ? (isLight ? "text-slate-900" : "text-white") : "text-slate-500"}`}>
            <Icon name="Zap" size={14} style={config.adaptiveRisk ? { color: theme?.hex } : { color: "#444" }} />
            Adaptive Risk Engine
          </h3>
          <button
            type="button"
            onClick={() => update({ adaptiveRisk: !config.adaptiveRisk })}
            className={`w-10 h-5 rounded-full relative transition-all duration-300 ${
              config.adaptiveRisk ? "" : "bg-slate-800"
            }`}
            style={config.adaptiveRisk ? { backgroundColor: theme?.hex, boxShadow: `0 0 10px ${theme?.hex}66` } : {}}
          >
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${
              config.adaptiveRisk ? "left-6" : "left-1"
            }`} />
          </button>
        </div>

        <p className={`text-[9px] mb-4 leading-relaxed font-mono tracking-tighter ${config.adaptiveRisk ? (isLight ? "text-slate-700 font-bold" : "text-slate-300") : "text-slate-600"}`}>
          Confidence-based leverage scaling. High conviction tiers activate aggressive capital deployment.
        </p>

        {config.adaptiveRisk && (
          <div className="animate-in fade-in slide-in-from-top-1">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[9px] font-bold text-slate-500 tracking-widest">
                Max Leverage Cap
              </label>
              <span className="text-[10px] font-mono px-2 rounded-sm border" style={{ color: theme?.hex, backgroundColor: `${theme?.hex}1a`, borderColor: `${theme?.hex}33` }}>
                {config.maxLeverageCap || 10}X
              </span>
            </div>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={config.maxLeverageCap || 10}
                onChange={(e) => update({ maxLeverageCap: parseInt(e.target.value) })}
                className={`w-full h-1 ${isLight ? "bg-slate-200" : "bg-[#080808]"} rounded-full appearance-none cursor-pointer`}
                style={{ accentColor: theme?.hex }}
              />
          </div>
        )}
      </div>

      {/* Exit Strategy */}
      <div className={`p-4 border rounded-xl ${isLight ? "bg-white border-black/5" : "bg-[#0b0b0b] border-white/5"} shadow-inner`}>
        <h3 className={`text-[10px] font-black ${isLight ? "text-slate-400" : "text-slate-500"} mb-4 tracking-[0.2em] flex items-center gap-2`}>
          <Icon name="Shield" size={14} className="text-rose-500" />
          Termination Protocol
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-bold text-slate-600 mb-1.5 block tracking-widest flex items-center gap-1">
                <Icon name="TrendingDown" size={10} className="text-rose-500" /> Stop Loss
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={config.stopLossPercent}
                  onChange={(e) =>
                    update({ stopLossPercent: parseFloat(e.target.value) })
                  }
                  className={`w-full ${isLight ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-[#080808] border-white/5 text-rose-500"} rounded-sm px-3 py-2 font-mono text-[10px] outline-none focus:border-rose-500/30 transition-all pr-7`}
                />
                <span className="absolute right-3 top-2.5 text-[10px] text-slate-700 font-mono">
                  %
                </span>
              </div>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-600 mb-1.5 block tracking-widest flex items-center gap-1">
                <Icon name="Target" size={10} className="text-emerald-500" /> Take Profit
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={config.takeProfitPercent}
                  onChange={(e) =>
                    update({ takeProfitPercent: parseFloat(e.target.value) })
                  }
                  className={`w-full ${isLight ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-[#080808] border-white/5 text-emerald-500"} rounded-sm px-3 py-2 font-mono text-[10px] outline-none focus:border-emerald-500/30 transition-all pr-7`}
                />
                <span className="absolute right-3 top-2.5 text-[10px] text-slate-700 font-mono">
                  %
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <label className="text-[9px] font-bold text-slate-600 mb-1.5 block tracking-widest">
              Hard Drawdown Threshold
            </label>
            <div className="relative">
                <input
                  type="number"
                  value={config.maxDrawdownPercent}
                  onChange={(e) =>
                    update({ maxDrawdownPercent: parseFloat(e.target.value) })
                  }
                  className={`w-full ${isLight ? "bg-slate-50 border-black/5 text-slate-900" : "bg-[#080808] border-white/5 text-white"} rounded-sm px-3 py-2 font-mono text-[10px] outline-none transition-all pr-7`}
                  style={{ border: `1px solid ${theme?.hex}33` }}
                />
              <span className="absolute right-3 top-2.5 text-[10px] text-slate-600 font-mono">
                %
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
