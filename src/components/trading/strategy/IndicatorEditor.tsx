import { Icon } from "../../ui/Icon";
import { IndicatorConfig } from "../../../types/trading";
interface IndicatorEditorProps {
  theme?: any;
  config: IndicatorConfig;
  onChange: (config: IndicatorConfig) => void;
}

export function IndicatorEditor({ config, onChange }: IndicatorEditorProps) {
  const updateRSI = (updates: Partial<typeof config.rsi>) => {
    onChange({ ...config, rsi: { ...config.rsi, ...updates } });
  };

  const updateMACD = (updates: Partial<typeof config.macd>) => {
    onChange({ ...config, macd: { ...config.macd, ...updates } });
  };

  const updateEMA = (updates: Partial<typeof config.ema>) => {
    onChange({ ...config, ema: { ...config.ema, ...updates } });
  };

  return (
    <div className="space-y-2.5">
      {/* RSI Section */}
      <div
        className={`transition-all rounded-xl glass-blur ${
          config.rsi.enabled
            ? "shadow-inner"
            : "opacity-60"
        }`}
        style={{ 
          backgroundColor: "var(--app-bg-tint)",
          border: `1px solid ${config.rsi.enabled ? "var(--app-primary)" : "var(--app-border-main)"}`
        }}
      >
        <div className="p-3 flex items-center justify-between cursor-pointer" onClick={() => updateRSI({ enabled: !config.rsi.enabled })}>
          <div className="flex items-center gap-3">
            <div className={`text-[10px] font-black tracking-widest flex items-center gap-2 ${config.rsi.enabled ? "text-white" : "text-slate-500"}`}>
              <Icon name="Activity" size={14} style={{ color: config.rsi.enabled ? "var(--app-primary)" : undefined }} className={!config.rsi.enabled ? "text-slate-700" : ""} /> Relative Strength Index
            </div>
          </div>
          {config.rsi.enabled && (
            <span className="text-[9px] text-slate-600 font-mono tracking-tighter">
              Relative Strength Index
            </span>
          )}
        </div>

        {config.rsi.enabled && (
          <div className="p-3 pt-0 grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-1">
            {[
              { label: "Period", value: config.rsi.period, key: "period" },
              { label: "Overbought", value: config.rsi.overbought, key: "overbought" },
              { label: "Oversold", value: config.rsi.oversold, key: "oversold" },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-[8px] font-bold text-slate-600 mb-1 block tracking-widest">
                  {field.label}
                </label>
                <input
                  type="number"
                  value={field.value}
                  onChange={(e) =>
                    updateRSI({ [field.key]: parseInt(e.target.value) })
                  }
                  className="w-full bg-white/5 text-white rounded-sm px-2 py-1.5 text-[10px] font-mono text-center outline-none transition-all border-white/10 focus:border-[var(--app-primary)] border"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MACD Section */}
      <div
        className={`transition-all rounded-xl glass-blur ${
          config.macd.enabled
            ? "shadow-inner"
            : "opacity-60"
        }`}
        style={{ 
          backgroundColor: "var(--app-bg-tint)",
          border: `1px solid ${config.macd.enabled ? "var(--app-primary)" : "var(--app-border-main)"}`
        }}
      >
        <div className="p-3 flex items-center justify-between cursor-pointer" onClick={() => updateMACD({ enabled: !config.macd.enabled })}>
          <div className="flex items-center gap-3">
            <div className={`text-[10px] font-black tracking-widest flex items-center gap-2 ${config.macd.enabled ? "text-white" : "text-slate-500"}`}>
              <Icon name="BarChart" size={14} className={config.macd.enabled ? "text-[var(--app-primary)]" : "text-slate-700"} /> Oscillator (MACD)
            </div>
          </div>
          {config.macd.enabled && (
            <span className="text-[9px] text-slate-600 font-mono tracking-tighter">
              Convergence / Divergence
            </span>
          )}
        </div>

        {config.macd.enabled && (
          <div className="p-3 pt-0 grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-1">
            {[
              { label: "Fast", value: config.macd.fastPeriod, key: "fastPeriod" },
              { label: "Slow", value: config.macd.slowPeriod, key: "slowPeriod" },
              { label: "Signal", value: config.macd.signalPeriod, key: "signalPeriod" },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-[8px] font-bold text-slate-600 mb-1 block tracking-widest">
                  {field.label}
                </label>
                <input
                  type="number"
                  value={field.value}
                  onChange={(e) =>
                    updateMACD({ [field.key]: parseInt(e.target.value) })
                  }
                  className="w-full bg-white/5 text-white rounded-sm px-3 py-2 text-[10px] font-mono outline-none transition-all border-white/10 focus:border-[var(--app-primary)] border"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EMA Section */}
      <div
        className={`transition-all rounded-xl glass-blur ${
          config.ema.enabled
            ? "shadow-inner"
            : "opacity-60"
        }`}
        style={{ 
          backgroundColor: "var(--app-bg-tint)",
          border: `1px solid ${config.ema.enabled ? "var(--app-primary)" : "var(--app-border-main)"}`
        }}
      >
        <div className="p-3 flex items-center justify-between cursor-pointer" onClick={() => updateEMA({ enabled: !config.ema.enabled })}>
          <div className="flex items-center gap-3">
            <div className={`text-[10px] font-black tracking-widest flex items-center gap-2 ${config.ema.enabled ? "text-white" : "text-slate-500"}`}>
              <Icon name="TrendingUp" size={14} className={config.ema.enabled ? "text-[var(--app-primary)]" : "text-slate-700"} /> Moving Average
            </div>
          </div>
          {config.ema.enabled && (
            <span className="text-[9px] text-slate-600 font-mono tracking-tighter">
              Exponential Moving Average
            </span>
          )}
        </div>

        {config.ema.enabled && (
          <div className="p-3 pt-0 animate-in fade-in slide-in-from-top-1">
            <label className="text-[8px] font-bold text-slate-600 mb-1.5 block tracking-widest">
              Periods (Comma Separated)
            </label>
            <input
              type="text"
              value={config.ema.periods.join(", ")}
              onChange={(e) =>
                updateEMA({
                  periods: e.target.value
                    .split(",")
                    .map((s) => parseInt(s.trim()))
                    .filter((n) => !isNaN(n)),
                })
              }
              className="w-full bg-white/5 text-white rounded-md px-3 py-2 text-xs font-mono outline-none transition-all border-white/10 focus:border-[var(--app-primary)] border"
              placeholder="e.g. 20, 50, 200"
            />
          </div>
        )}
      </div>

      <div 
        className="p-3 flex items-center justify-center gap-3 text-slate-700 cursor-not-allowed hover:bg-white/[0.04] transition-colors group rounded-xl bg-white/[0.02]" 
        style={{ border: '1px dashed var(--app-border-main)' }}
      >
        <Icon name="Settings2" size={12} className="group-hover:text-slate-600 transition-colors" />
        <span className="text-[9px] font-black tracking-[0.2em] group-hover:text-slate-600">Add Strategy Indicator</span>
      </div>
    </div>
  );
}
