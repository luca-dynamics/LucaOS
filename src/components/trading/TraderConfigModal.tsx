import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { AIModel, Exchange, Strategy } from "../../types/trading";
interface TraderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
  models: AIModel[];
  exchanges: Exchange[];
  strategies: Strategy[];
}

export default function TraderConfigModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  models,
  exchanges,
  strategies,
}: TraderConfigModalProps) {
  const [name, setName] = useState("");
  const [modelId, setModelId] = useState("");
  const [exchangeId, setExchangeId] = useState("");
  const [strategyId, setStrategyId] = useState("");
  const [leverage, setLeverage] = useState(5);
  const [riskPerTrade, setRiskPerTrade] = useState(1);
  const [activeTab, setActiveTab] = useState<"general" | "risk" | "strategy">(
    "general"
  );

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setModelId(initialData.ai_model);
        setExchangeId(initialData.exchange_id || "");
        setStrategyId(initialData.strategy_id || "");
        setLeverage(initialData.config?.maxLeverage || 5);
        setRiskPerTrade(initialData.config?.riskPerTrade || 1);
      } else {
        // Defaults
        setName("");
        setModelId(models[0]?.id || "");
        setExchangeId(exchanges[0]?.id || "");
        setStrategyId("");
        setLeverage(5);
        setRiskPerTrade(1);
      }
    }
  }, [isOpen, initialData, models, exchanges]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSave({
      name,
      ai_model: modelId,
      exchange_id: exchangeId,
      strategy_id: strategyId,
      config: {
        maxLeverage: leverage,
        riskPerTrade,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 glass-blur animate-in fade-in duration-200 p-0 sm:p-4">
      <div 
        className="border-none sm:border rounded-none sm:rounded-xl w-full h-full sm:h-auto sm:max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-full sm:max-h-[90vh] glass-blur transition-all"
        style={{ 
          backgroundColor: "var(--app-bg-tint)",
          borderColor: "var(--app-border-main)"
        }}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/5 flex items-center justify-between flex-shrink-0 relative z-30">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border bg-[var(--app-primary)]/10"
              style={{ borderColor: "var(--app-primary)" }}
            >
              <Icon name="Bot" variant="BoldDuotone" size={18} style={{ color: "var(--app-primary)" }} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {initialData ? "Edit Configuration" : "Deploy AI Trader"}
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">
                {initialData ? initialData.id : "NEW INSTANCE"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-50 text-slate-500 hover:text-white transition-all bg-white/5 hover:bg-white/10 p-2 rounded-lg cursor-pointer active:scale-95 flex-shrink-0"
          >
            <Icon name="CloseCircle" variant="BoldDuotone" size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 px-5 sm:px-6 gap-4 sm:gap-6 flex-shrink-0 overflow-x-auto no-scrollbar">
          {["general", "risk", "strategy"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors capitalize whitespace-nowrap ${
                activeTab === tab
                  ? "text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
              style={activeTab === tab ? { borderColor: "var(--app-primary)", color: "var(--app-primary)" } : {}}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-transparent">
          {activeTab === "general" && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Trader Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. BTC_Alpha_V1"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-all font-mono focus:border-[var(--app-primary)]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                    AI Model
                  </label>
                  <select
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none transition-all focus:border-[var(--app-primary)]"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.provider})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                    Exchange Account
                  </label>
                  <select
                    value={exchangeId}
                    onChange={(e) => setExchangeId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none transition-all focus:border-[var(--app-primary)]"
                  >
                    <option value="">Select Exchange...</option>
                    {exchanges.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} - {e.account_name || "Main"}
                      </option>
                    ))}
                  </select>
                  {exchanges.length === 0 && (
                    <div className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                      <Icon name="Danger" variant="BoldDuotone" size={10} /> No exchanges configured
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "risk" && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div 
                className="p-4 border rounded-xl bg-[var(--app-primary)]/10"
                style={{ borderColor: "rgba(var(--app-primary-rgb), 0.2)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <label 
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--app-primary)" }}
                  >
                    Max Leverage
                  </label>
                  <span className="text-lg font-bold text-white">
                    {leverage}x
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--app-primary)]"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>1x (Spot)</span>
                  <span>20x (Degen)</span>
                </div>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Risk Per Trade
                  </label>
                  <span className="text-lg font-bold text-white">
                    {riskPerTrade}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={riskPerTrade}
                  onChange={(e) => setRiskPerTrade(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--app-primary)]"
                />
                <p className="text-[10px] text-slate-500 mt-2">
                  Percentage of account balance risked per single trade
                  execution.
                </p>
              </div>
            </div>
          )}

          {activeTab === "strategy" && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Primary Strategy
                </label>
                <div className="space-y-2">
                  {strategies.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setStrategyId(s.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        strategyId === s.id
                          ? "bg-[var(--app-primary)]/10 border-[var(--app-primary)]"
                          : "bg-white/5 border-white/5 hover:border-white/20"
                      }`}
                    >
                      <div>
                        <div
                          className="font-bold text-sm"
                          style={{ color: strategyId === s.id ? "var(--app-primary)" : "white" }}
                        >
                          {s.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {s.description || "No description"}
                        </div>
                      </div>
                      {strategyId === s.id && (
                        <div 
                          className="w-3 h-3 rounded-full shadow-lg" 
                          style={{ backgroundColor: "var(--app-primary)", boxShadow: "0 0 10px var(--app-primary)" }}
                        />
                      )}
                    </div>
                  ))}
                  {strategies.length === 0 && (
                    <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-white/10 rounded-xl">
                      No strategies available. Create one in Strategy Studio.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-white/5 flex flex-col sm:flex-row justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="order-2 sm:order-1 px-6 py-3 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name || !modelId || !exchangeId}
            className="order-1 sm:order-2 px-8 py-3 sm:py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg bg-[var(--app-primary)]/20 hover:bg-[var(--app-primary)]/30 border border-[var(--app-primary)] text-[var(--app-primary)]"
            style={{ boxShadow: "0 0 20px rgba(var(--app-primary-rgb), 0.1)" }}
          >
            <Icon name="Save" variant="BoldDuotone" size={16} /> Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
