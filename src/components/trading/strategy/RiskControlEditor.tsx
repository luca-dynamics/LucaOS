import React from "react";
import * as LucideIcons from "lucide-react";
const {
  Shield,
  TrendingDown,
  Target,
  Wallet,
  Zap,
} = LucideIcons as any;
import { RiskControlConfig } from "../../../types/trading";

interface RiskControlEditorProps {
  config: RiskControlConfig;
  onChange: (config: RiskControlConfig) => void;
}

export function RiskControlEditor({
  config,
  onChange,
}: RiskControlEditorProps) {
  const update = (updates: Partial<RiskControlConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-6">
      {/* Position Sizing */}
      <div className="bg-[#1e2329] p-4 rounded-xl border border-white/5">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Wallet size={16} className="text-indigo-400" /> Sizing & Leverage
        </h3>

        <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Max Positions
            </label>
            <input
              type="number"
              value={config.maxPositions || 3}
              onChange={(e) =>
                update({ maxPositions: parseInt(e.target.value) })
              }
              className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Position Size %
            </label>
            <div className="relative">
              <input
                type="number"
                value={config.positionSizePercent}
                onChange={(e) =>
                  update({ positionSizePercent: parseFloat(e.target.value) })
                }
                className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1.5 text-white text-sm pr-6"
              />
              <span className="absolute right-2 top-2 text-xs text-slate-500">
                %
              </span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              BTC/ETH Leverage
            </label>
            <input
              type="number"
              value={config.btcEthLeverage}
              onChange={(e) =>
                update({ btcEthLeverage: parseInt(e.target.value) })
              }
              className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Altcoin Leverage
            </label>
            <input
              type="number"
              value={config.altcoinLeverage}
              onChange={(e) =>
                update({ altcoinLeverage: parseInt(e.target.value) })
              }
              className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
            />
          </div>
        </div>
      </div>

      {/* Elite AI Risk (Phase 15) */}
      <div className="bg-[#1e2329] p-4 rounded-xl border border-indigo-500/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-2">
          <Zap size={10} className="text-indigo-400 opacity-50" />
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap size={16} className="text-indigo-400" /> Adaptive Risk
          </h3>
          <button
            type="button"
            onClick={() => update({ adaptiveRisk: !config.adaptiveRisk })}
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
              config.adaptiveRisk 
                ? "bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                : "bg-slate-700 text-slate-400"
            }`}
          >
            {config.adaptiveRisk ? "Active" : "Disabled"}
          </button>
        </div>

        <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
          When active, LUCA uses AI Conviction levels to dynamically scale leverage and position sizes. 
          High confidence trades utilize more capital.
        </p>

        {config.adaptiveRisk && (
          <div className="animate-in slide-in-from-top-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">
              Max Leverage Cap ({config.maxLeverageCap || 10}x)
            </label>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={config.maxLeverageCap || 10}
              onChange={(e) => update({ maxLeverageCap: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[8px] text-slate-600 mt-1 font-bold">
              <span>1X</span>
              <span>10X</span>
              <span>20X</span>
            </div>
          </div>
        )}
      </div>

      {/* Exit Strategy */}
      <div className="bg-[#1e2329] p-4 rounded-xl border border-white/5">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Shield size={16} className="text-rose-400" /> Exit Rules
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1">
                <TrendingDown size={10} /> Stop Loss
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={config.stopLossPercent}
                  onChange={(e) =>
                    update({ stopLossPercent: parseFloat(e.target.value) })
                  }
                  className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1.5 text-rose-400 font-bold text-sm pr-6"
                />
                <span className="absolute right-2 top-2 text-xs text-slate-500">
                  %
                </span>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1">
                <Target size={10} /> Take Profit
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={config.takeProfitPercent}
                  onChange={(e) =>
                    update({ takeProfitPercent: parseFloat(e.target.value) })
                  }
                  className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1.5 text-emerald-400 font-bold text-sm pr-6"
                />
                <span className="absolute right-2 top-2 text-xs text-slate-500">
                  %
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/50">
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Max Drawdown Limit
            </label>
            <div className="relative">
              <input
                type="number"
                value={config.maxDrawdownPercent}
                onChange={(e) =>
                  update({ maxDrawdownPercent: parseFloat(e.target.value) })
                }
                className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1.5 text-white text-sm pr-6"
              />
              <span className="absolute right-2 top-2 text-xs text-slate-500">
                %
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
