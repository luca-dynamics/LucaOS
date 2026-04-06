import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";

import {
  TradingStrategy,
  CoinSourceType,
  AutomationMode,
  ScheduleType,
  FullDecision,
} from "../../types/trading";
import { CoinSourceEditor } from "./strategy/CoinSourceEditor";
import { IndicatorEditor } from "./strategy/IndicatorEditor";
import { RiskControlEditor } from "./strategy/RiskControlEditor";
import { PromptSectionsEditor } from "./strategy/PromptSectionsEditor";
import { IntelligenceSourceEditor } from "./strategy/IntelligenceSourceEditor";
import { AITestRunner } from "./strategy/AITestRunner";
import { tradingService } from "../../services/tradingService";
import StrategyContextBar from "./strategy/StrategyContextBar";
import TradingSettings from "./TradingSettings";

const DEFAULT_STRATEGY: TradingStrategy = {
  id: "",
  name: "New Strategy",
  description: "A fresh approach to market dominance.",
  isActive: false,
  isDefault: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  coinSource: {
    sourceType: CoinSourceType.STATIC,
    staticCoins: ["BTC/USDT", "ETH/USDT"],
    limit: 10,
    useOITop: false,
  },
  indicators: {
    rsi: { enabled: true, period: 14, overbought: 70, oversold: 30 },
    macd: { enabled: true, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    ema: { enabled: true, periods: [20, 50, 200] },
    atr: { enabled: false, period: 14 },
  },
  riskControl: {
    maxPositions: 3,
    positionSizePercent: 0.1,
    btcEthLeverage: 5,
    altcoinLeverage: 3,
    stopLossPercent: 0.02,
    takeProfitPercent: 0.05,
    maxDrawdownPercent: 0.1,
  },
  automation: {
    mode: AutomationMode.MANUAL,
    minConsensusConfidence: 70,
    aiLearningEnabled: true,
  },
  schedule: {
    type: ScheduleType.INTERVAL,
    intervalMinutes: 15,
  },
  promptVariant: "balanced",
  intelligenceSources: [],
};

interface StrategyBuilderProps {
  theme?: { hex: string; primary: string; border: string; bg: string; isLight?: boolean };
}

export default function StrategyBuilder({ theme }: StrategyBuilderProps) {
  const isLight = theme?.isLight;
  const currentThemeHex = theme?.hex || "#0ea5e9";
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] =
    useState<TradingStrategy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Load Strategies on Mount
  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    setIsLoading(true);
    try {
      const data = await tradingService.getStrategies();
      let validData: any[] = [];
      if (Array.isArray(data)) {
        validData = data;
      } else if (data && typeof data === "object") {
        validData = Object.values(data);
      }
      setStrategies(validData as unknown as TradingStrategy[]);
      if (validData.length > 0 && !selectedStrategy) {
        setSelectedStrategy(validData[0] as unknown as TradingStrategy);
      }
    } catch (e) {
      console.error("Failed to load strategies", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewStrategy = () => {
    const newStrat = {
      ...DEFAULT_STRATEGY,
      id: `new_${Date.now()}`, // Temporary ID
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setStrategies([newStrat, ...strategies]);
    setSelectedStrategy(newStrat);
  };

  const handleCloneStrategy = async () => {
    if (!selectedStrategy) return;
    const cloned: TradingStrategy = {
      ...selectedStrategy,
      id: `new_${Date.now()}`,
      name: `${selectedStrategy.name} (Clone)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setIsSaving(true);
    try {
      const result = await tradingService.saveStrategy(cloned);
      if (result.success) {
        await loadStrategies();
        const data = await tradingService.getStrategies();
        const saved = data.find((s: any) => s.id === result.id) || data[0];
        setSelectedStrategy(saved as unknown as TradingStrategy);
      }
    } catch (e) {
      console.error("Clone failed", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportYAML = () => {
    if (!selectedStrategy) return;
    const json = JSON.stringify(selectedStrategy, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedStrategy.name.replace(/\s+/g, "_")}_config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveStrategy = async () => {
    if (!selectedStrategy) return;
    setIsSaving(true);
    try {
      const result = await tradingService.saveStrategy(selectedStrategy);
      if (result.success) {
        const data = await tradingService.getStrategies();
        setStrategies(data as unknown as TradingStrategy[]);
        const saved = data.find((s: any) => s.id === result.id) || data[0];
        setSelectedStrategy(saved as unknown as TradingStrategy);
      } else {
        console.error(`Error: ${(result as any).error || "Unknown error"}`);
      }
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStrategy = async () => {
    if (!selectedStrategy || !selectedStrategy.id || selectedStrategy.id.startsWith('new_')) return;
    if (!confirm("Are you sure you want to delete this strategy?")) return;

    try {
      await tradingService.deleteStrategy(selectedStrategy.id);
      const remaining = strategies.filter((s) => s.id !== selectedStrategy.id);
      setStrategies(remaining);
      setSelectedStrategy(remaining[0] || null);
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const handleRunTest = async (): Promise<FullDecision> => {
    if (!selectedStrategy) throw new Error("No strategy selected");
    const startTime = performance.now();
    
    const result = await tradingService.runMultiAgentDebate(
      selectedStrategy.coinSource.staticCoins?.[0] || "BTC/USDT",
      selectedStrategy.id
    );
    
    const duration = Math.round(performance.now() - startTime);
    
    return {
      systemPrompt: "",
      userPrompt: "",
      cotTrace: result.transcript,
      decisions: [{
        symbol: selectedStrategy.coinSource.staticCoins?.[0] || "BTC/USDT",
        action: result.action,
        confidence: result.confidence,
        reasoning: `Market decision finalized after multi-agent committee consensus.`
      }],
      rawResponse: JSON.stringify(result),
      timestamp: Date.now(),
      aiRequestDurationMs: duration
    };
  };

  const updateStrategy = (updates: Partial<TradingStrategy>) => {
    if (!selectedStrategy) return;
    const updated = { ...selectedStrategy, ...updates, updatedAt: Date.now() };
    setSelectedStrategy(updated);
    setStrategies((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  };

  if (isLoading && strategies.length === 0) {
    return (
      <div className={`h-full flex items-center justify-center ${isLight ? "bg-white text-slate-400" : "bg-[#050505] text-slate-600"}`}>
        <div className="flex items-center gap-1">
          <div className="w-1 h-4 rounded-full animate-bounce" style={{ backgroundColor: currentThemeHex }} />
          <div className="w-1 h-4 rounded-full animate-bounce [animation-delay:-0.2s]" style={{ backgroundColor: currentThemeHex }} />
          <div className="w-1 h-4 rounded-full animate-bounce [animation-delay:-0.4s]" style={{ backgroundColor: currentThemeHex }} />
        </div>
        <span className="text-[10px] font-bold tracking-widest ml-2">Initializing database...</span>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${isLight ? "bg-slate-50 text-slate-900" : "bg-[#050505] text-white"} font-sans overflow-hidden transition-colors duration-500`}>
      {/* 1. Context Header Stats Bar */}
      {selectedStrategy && (
        <div className={`h-10 flex-shrink-0 border-b ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#050505]"} flex items-center overflow-hidden`}>
          <div className="flex-1 overflow-hidden">
            <StrategyContextBar strategy={selectedStrategy} theme={theme} />
          </div>
        </div>
      )}

      <div className={`flex-1 flex overflow-hidden ${selectedStrategy ? "p-3" : "p-0"} gap-3`}>
        {/* 2. Strategy Repository Sidebar */}
        <div className={`w-16 h-full flex flex-col items-center py-4 gap-6 ${isLight ? "bg-white border-r border-slate-200" : "bg-[#050505] border-r border-white/5"}`}>
          <button
            onClick={handleNewStrategy}
            className="w-10 h-10 flex items-center justify-center text-white rounded-lg transition-all group"
            style={{ 
              backgroundColor: `${currentThemeHex}33`, 
              border: `1px solid ${currentThemeHex}66`
            }}
            title="New Strategy"
          >
            <Icon name="Plus" size={20} className="group-hover:rotate-90 transition-transform" />
          </button>

          <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center gap-4">
            {strategies.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStrategy(s)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-black tracking-tighter transition-all relative group ${
                  selectedStrategy?.id === s.id
                    ? "text-white shadow-xl"
                    : isLight 
                      ? "bg-white text-slate-400 border border-slate-200 hover:border-slate-300 hover:text-slate-600"
                      : "bg-[#161616] text-slate-500 border border-white/5 hover:border-white/20 hover:text-slate-300"
                }`}
                style={selectedStrategy?.id === s.id ? { 
                  backgroundColor: currentThemeHex,
                  borderColor: `${currentThemeHex}80`
                } : {}}
              >
                {s.name?.slice(0, 2).toUpperCase() || "St"}
                <div 
                  className={`absolute left-full ml-3 px-2 py-1 ${isLight ? "bg-white border border-slate-200 text-slate-800" : "bg-slate-900 border border-white/10"} rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 text-[9px] tracking-widest shadow-xl`}
                  style={!isLight ? { color: currentThemeHex } : {}}
                >
                  {s.name}
                </div>
                {selectedStrategy?.id === s.id && (
                  <div className="absolute -left-1.5 w-1 h-5 rounded-full" style={{ backgroundColor: currentThemeHex }} />
                )}
              </button>
            ))}
          </div>
          
          <div className={`p-4 border-t ${isLight ? "border-slate-200" : "border-white/5"} flex flex-col items-center`}>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg transition-all"
              style={{ color: showSettings ? currentThemeHex : "" }}
            >
              <Icon 
                name="Settings" 
                size={16} 
                className={`${isLight ? "text-slate-400 hover:text-slate-900" : "text-slate-700 hover:text-slate-400"} cursor-pointer transition-colors`} 
                style={showSettings ? { color: currentThemeHex } : {}}
              />
            </button>
          </div>
        </div>
        
        {/* 3. Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {!selectedStrategy ? (
            <div className="flex-1 h-full flex flex-col items-center justify-center relative overflow-hidden p-12">
              <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
                <div className={`w-20 h-20 rounded-2xl ${isLight ? "bg-white shadow-sm" : "bg-white/5 shadow-2xl"} flex items-center justify-center mb-8`} style={{ border: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.1)"}` }}>
                  <Icon name="Brain" size={40} style={{ color: currentThemeHex }} />
                </div>
                <h1 className={`text-3xl font-black tracking-tight mb-4 ${isLight ? "text-slate-900" : "text-white"}`}>Strategy Discovery</h1>
                <p className={`text-sm ${isLight ? "text-slate-500" : "text-slate-400"} mb-12 max-w-lg leading-relaxed`}>
                  Access the ultimate command center for algorithmic trading. Design, simulate, and deploy high-conviction models with real-time intelligence.
                </p>

                <div className="grid grid-cols-3 gap-6 w-full">
                  {[
                    { name: "Scalping Core", desc: "High-frequency micro-movements.", icon: "Zap", color: "text-amber-400" },
                    { name: "Trend Genesis", desc: "Momentum tracking & breakout logic.", icon: "TrendingUp", color: "text-emerald-400" },
                    { name: "Arbitrage Hub", desc: "Cross-exchange price discrepancy.", icon: "RefreshCw", color: "" },
                  ].map(template => (
                    <button 
                      key={template.name}
                      onClick={handleNewStrategy}
                      className={`p-4 border rounded-xl text-left transition-all ${isLight ? "bg-white border-slate-100 hover:border-slate-200 hover:shadow-md" : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.08]"} group`}
                    >
                      <Icon name={template.icon as any} size={20} className={`mb-3 ${template.color || ""}`} style={!template.color ? { color: currentThemeHex } : {}} />
                      <div className={`text-[10px] font-black tracking-widest mb-1 ${isLight ? "text-slate-800" : "text-white"}`}>{template.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono leading-tight tracking-tighter">{template.desc}</div>
                    </button>
                  ))}
                </div>

                <button 
                  onClick={handleNewStrategy}
                  className="mt-12 px-8 py-3 rounded-lg font-black text-xs flex items-center gap-3 transition-all hover:brightness-110 active:scale-[0.98] group"
                  style={{ 
                    backgroundColor: currentThemeHex,
                    color: "#050505",
                    boxShadow: `0 10px 30px ${currentThemeHex}4d`
                  }}
                >
                  <Icon name="Plus" size={16} color="#050505" className="group-hover:rotate-90 transition-transform" />
                  Initialize New Strategy
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 h-full grid grid-cols-12 gap-3 overflow-hidden">
              {/* Col 0-4: Configuration Profile */}
              <div className={`col-span-4 rounded-xl overflow-hidden flex flex-col ${isLight ? "bg-white shadow-sm" : "bg-[#050505] shadow-2xl"}`} style={{ border: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"}` }}>
                <div className={`px-4 py-3 border-b ${isLight ? "border-slate-100" : "border-white/5"} flex items-center justify-between flex-shrink-0`}>
                  <div className="flex items-center gap-2">
                    <Icon name="Activity" size={14} className={isLight ? "text-slate-400" : "text-slate-500"} />
                    <span className={`text-[10px] font-black tracking-[0.2em] ${isLight ? "text-slate-800" : "text-white"}`}>Logical Core</span>
                  </div>
                  <div 
                    className="px-2 py-0.5 rounded-sm text-[8px] font-bold tracking-widest"
                    style={{ 
                      backgroundColor: `${currentThemeHex}1a`, 
                      border: `1px solid ${currentThemeHex}4d`,
                      color: currentThemeHex
                    }}
                  >
                    V4.0-STABLE
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-8 scrollbar-hide custom-scrollbar">
                  <CoinSourceEditor 
                    config={selectedStrategy.coinSource} 
                    onChange={(cfg) => updateStrategy({ coinSource: cfg })} 
                    theme={theme} 
                  />
                  <div className={`h-[1px] ${isLight ? "bg-black/5" : "bg-white/5"} w-full`} />
                  <IndicatorEditor 
                    config={selectedStrategy.indicators} 
                    onChange={(cfg) => updateStrategy({ indicators: cfg })} 
                    theme={theme} 
                  />
                  <div className={`h-[1px] ${isLight ? "bg-black/5" : "bg-white/5"} w-full`} />
                  <IntelligenceSourceEditor 
                    sources={selectedStrategy.intelligenceSources} 
                    onChange={(sources) => updateStrategy({ intelligenceSources: sources })} 
                    theme={theme} 
                  />
                </div>
              </div>

              {/* Col 5-12: Risk & Simulation */}
              <div className="col-span-8 flex flex-col gap-3 overflow-hidden">
                <div className={`flex-1 rounded-xl overflow-hidden ${isLight ? "bg-white shadow-sm" : "bg-[#050505] shadow-2xl"}`} style={{ border: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"}` }}>
                  <div className="w-full h-full p-6 flex flex-col">
                    <div className={`flex items-center gap-2 mb-6 pb-2 border-b ${isLight ? "border-slate-100" : "border-white/5"}`}>
                      <Icon name="Brain" size={14} className={isLight ? "text-slate-400" : "text-slate-500"} />
                      <span className={`text-[10px] font-black tracking-[0.2em] ${isLight ? "text-slate-800" : "text-white"}`}>Risk & Execution Protocol</span>
                    </div>
                    <div className="flex-1 overflow-y-auto scrollbar-hide custom-scrollbar">
                      <div className="grid grid-cols-2 gap-8">
                        <RiskControlEditor 
                          config={selectedStrategy.riskControl} 
                          onChange={(cfg) => updateStrategy({ riskControl: cfg })} 
                          theme={theme} 
                        />
                        <div className="space-y-6">
                          <div className={`p-4 rounded-lg border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5"}`}>
                            <div className={`text-[9px] font-black tracking-widest mb-3 ${isLight ? "text-slate-400" : "text-slate-600"}`}>Automation Layer</div>
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => updateStrategy({ automation: { ...selectedStrategy.automation, mode: AutomationMode.FULL_AUTO } })}
                                className="flex-1 h-10 rounded font-black text-[10px] tracking-widest shadow-lg transition-all hover:brightness-110 active:scale-95"
                                style={{ 
                                  backgroundColor: selectedStrategy.automation.mode === AutomationMode.FULL_AUTO ? (theme?.hex || "#0ea5e9") : "rgba(255,255,255,0.05)",
                                  color: selectedStrategy.automation.mode === AutomationMode.FULL_AUTO ? "#050505" : "#666",
                                  border: `1px solid ${selectedStrategy.automation.mode === AutomationMode.FULL_AUTO ? "transparent" : "rgba(255,255,255,0.05)"}`
                                }}
                              >
                                Live Auto
                              </button>
                              <button 
                                onClick={() => updateStrategy({ automation: { ...selectedStrategy.automation, mode: AutomationMode.MANUAL } })}
                                className={`flex-1 h-10 rounded font-bold text-[10px] tracking-widest transition-all ${
                                  selectedStrategy.automation.mode === AutomationMode.MANUAL 
                                    ? isLight ? "bg-slate-200 text-slate-900" : "bg-white/10 text-white border border-white/10" 
                                    : isLight ? "bg-white border border-slate-200 text-slate-400" : "bg-transparent text-slate-600 border border-white/5"
                                }`}
                                style={{ 
                                  borderColor: selectedStrategy.automation.mode === AutomationMode.MANUAL ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)"
                                }}
                              >
                                Manual
                              </button>
                            </div>
                          </div>
                          <PromptSectionsEditor 
                            {...selectedStrategy}
                            onUpdate={updateStrategy}
                            theme={theme}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`flex-1 rounded-xl overflow-hidden ${isLight ? "bg-white shadow-sm" : "bg-[#050505] shadow-2xl"}`} style={{ border: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"}` }}>
                  <div className="w-full h-full flex flex-col overflow-hidden">
                    <AITestRunner onRunTest={handleRunTest} theme={theme} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Strategy Actions Footer */}
      {selectedStrategy && (
        <div className={`h-14 flex-shrink-0 border-t ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#050505]"} px-6 flex items-center justify-between z-10`} style={!isLight ? { borderTop: '1px solid rgba(255,255,255,0.05)' } : {}}>
          <div className="flex items-center gap-6">
            <button 
              onClick={handleCloneStrategy}
              className={`text-[10px] font-black flex items-center gap-2 ${isLight ? "text-slate-400 hover:text-slate-900" : "text-slate-500 hover:text-white"} transition-colors`}
            >
              <Icon name="Copy" size={14} /> Clone Strategy
            </button>
            <button 
              onClick={handleExportYAML}
              className={`text-[10px] font-black flex items-center gap-2 ${isLight ? "text-slate-400 hover:text-slate-900" : "text-slate-500 hover:text-white"} transition-colors`}
            >
              <Icon name="Export" size={14} /> Export YAML
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleDeleteStrategy}
              className={`w-10 h-10 flex items-center justify-center ${isLight ? "text-rose-600 hover:bg-rose-50" : "text-rose-400 hover:bg-rose-500/10"} rounded-lg transition-all group`}
              style={{ border: `1px solid ${isLight ? "#e11d4833" : "rgba(255,255,255,0.05)"}` }}
              title="Delete Strategy"
            >
              <Icon name="Trash" size={16} className="opacity-40 group-hover:opacity-100 transition-opacity" />
            </button>
            <button 
              onClick={handleSaveStrategy}
              disabled={isSaving}
              className="px-6 h-10 rounded-lg text-[11px] font-black transition-all flex items-center gap-2 shadow-xl active:scale-95 disabled:opacity-50 group"
              style={{ 
                backgroundColor: theme?.hex || "#0ea5e9",
                color: "#050505",
                boxShadow: `0 4px 20px ${theme?.hex || "#0ea5e9"}33`,
                border: `1px solid ${theme?.hex}44`
              }}
            >
              {isSaving ? (
                <div className="w-3 h-3 border-2 border-black border-t-transparent animate-spin rounded-full" />
              ) : (
                <Icon name="CheckCircle" size={16} color="#050505" variant="Bold" />
              )}
              {isSaving ? "Saving..." : "Commit Changes"}
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.03)"}; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.08)"}; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      ` }} />

      {/* 5. Global Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div 
            className={`w-full max-w-4xl h-[80vh] border rounded-2xl overflow-hidden shadow-2xl flex flex-col ${
              isLight ? "bg-white border-slate-200" : "bg-[#080808] border-white/10"
            }`}
          >
            <div className={`p-4 border-b flex items-center justify-between ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0c0c0c] border-white/5"}`}>
              <div className="flex items-center gap-2">
                <Icon name="Settings" size={18} style={{ color: theme?.hex }} />
                <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-60">System Configuration</span>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className={`p-2 rounded-lg transition-colors ${isLight ? "hover:bg-slate-200 text-slate-400" : "hover:bg-white/5 text-slate-500"}`}
              >
                <Icon name="X" size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <TradingSettings />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
