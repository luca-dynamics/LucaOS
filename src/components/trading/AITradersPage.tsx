import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import TraderConfigModal from "./TraderConfigModal";
import ExchangeConfigModal from "./ExchangeConfigModal";
import AIModelConfigModal from "./AIModelConfigModal";
import { AIModel, Exchange, Strategy, TraderInfo } from "../../types/trading";
import { PunkAvatar } from "../PunkAvatar";
import { tradingService } from "../../services/tradingService";

// --- MOCK DATA FOR FALLBACK ---
const MOCK_MODELS: AIModel[] = [
  { id: "gpt4", name: "GPT-4o", provider: "OpenAI", enabled: true },
  {
    id: "claude3",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    enabled: true,
  },
  {
    id: "deepseek",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    enabled: true,
    customApiUrl: "https://api.deepseek.com",
  },
  { id: "gemini", name: "Gemini 1.5 Pro", provider: "Google", enabled: false },
];

interface AITradersPageProps {
  onClose?: () => void;
}

export default function AITradersPage({ onClose }: AITradersPageProps) {
  // State
  const [traders, setTraders] = useState<TraderInfo[]>([]);
  const [models, setModels] = useState<AIModel[]>(MOCK_MODELS);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals State
  const [showTraderModal, setShowTraderModal] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [editingTrader, setEditingTrader] = useState<any>(null);
  const [editingExchange, setEditingExchange] = useState<Exchange | null>(null);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Backend Data
      const [connectedExchanges, availableStrategies] = await Promise.all([
        tradingService.getConnectedExchanges(),
        tradingService.getStrategies(),
      ]);

      setExchanges(
        Array.isArray(connectedExchanges)
          ? connectedExchanges
          : connectedExchanges && typeof connectedExchanges === "object"
          ? Object.values(connectedExchanges)
          : []
      );
      setStrategies(
        Array.isArray(availableStrategies)
          ? (availableStrategies as Strategy[])
          : availableStrategies && typeof availableStrategies === "object"
          ? (Object.values(availableStrategies) as Strategy[])
          : []
      );

      // 2. Load Local Traders (Persistence Layer)
      const savedTraders = localStorage.getItem("luca_ai_traders");
      if (savedTraders) {
        try {
          const parsed = JSON.parse(savedTraders);
          if (Array.isArray(parsed)) {
            setTraders(parsed);
          } else if (parsed && typeof parsed === "object") {
            setTraders(Object.values(parsed));
          } else {
            setTraders([]);
          }
        } catch (e) {
          console.error("Failed to parse local traders:", e);
          setTraders([]);
        }
      } else {
        // Default traders if none saved
        setTraders([]);
      }
    } catch (error) {
      console.error("Failed to load trading data:", error);
      setExchanges([]);
      setStrategies([]);
      setTraders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers
  const handleToggleTrader = (id: string) => {
    const updatedTraders = traders.map((t) =>
      t.trader_id === id ? { ...t, is_running: !t.is_running } : t
    );
    setTraders(updatedTraders);
    localStorage.setItem("luca_ai_traders", JSON.stringify(updatedTraders));
  };

  const handleDeleteTrader = (id: string) => {
    if (confirm("Confirm delete trader?")) {
      const updatedTraders = traders.filter((t) => t.trader_id !== id);
      setTraders(updatedTraders);
      localStorage.setItem("luca_ai_traders", JSON.stringify(updatedTraders));
    }
  };

  const getModelName = (id: string) =>
    models.find((m) => m.id === id)?.name || id;
  const getExchangeName = (id: string) => {
    const ex = exchanges.find((e) => e.id === id);
    return ex ? `${ex.name} (${ex.account_name || "Main"})` : id;
  };

  // Modal Save Handlers
  const saveTrader = (data: any) => {
    let updatedTraders;
    if (editingTrader) {
      updatedTraders = traders.map((t) =>
        t.trader_id === editingTrader.trader_id ? { ...t, ...data } : t
      );
    } else {
      const newTrader: TraderInfo = {
        trader_id: `t${Date.now()}`,
        is_running: false,
        total_pnl: 0,
        win_rate: 0,
        trade_count: 0,
        strategies: [],
        trader_name: data.name, // Mapping
        ...data,
      };
      updatedTraders = [...traders, newTrader];
    }
    setTraders(updatedTraders);
    localStorage.setItem("luca_ai_traders", JSON.stringify(updatedTraders));
    setEditingTrader(null);
  };

  const saveExchange = async (data: any) => {
    try {
      // Connect to Backend
      if (data.api_key) {
        await tradingService.connectExchange({
          exchange: data.exchange_type,
          apiKey: data.api_key,
          secretKey: data.secret_key,
          passphrase: data.passphrase,
          testnet: data.testnet,
        });
        // Reload exchanges
        const updatedExchanges = await tradingService.getConnectedExchanges();
        setExchanges(updatedExchanges);
      }
    } catch (e) {
      console.error("Failed to connect exchange:", e);
      alert("Failed to connect exchange. Check console.");
    }
    setEditingExchange(null);
  };

  const saveModel = (data: any) => {
    if (data.id) {
      setModels((prev) => prev.map((m) => (m.id === data.id ? data : m)));
    } else {
      setModels([...models, { ...data, id: `md_${Date.now()}` }]);
    }
    setEditingModel(null);
  };

  return (
    <div 
      className="flex flex-col h-full text-white font-sans overflow-hidden transition-all duration-500 bg-[rgba(var(--app-primary-rgb),0.02)]"
    >
      {/* Header Bar */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b border-white/5 glass-blur z-20 bg-[rgba(var(--app-primary-rgb),0.05)]"
      >
        <div className="flex items-center gap-3">
          <div 
             className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm bg-[var(--app-primary)]/10 border-[var(--app-primary)]/30"
             style={{ 
               boxShadow: "0 0 15px rgba(var(--app-primary-rgb), 0.15)"
             }}
          >
            <Icon name="MagicStick" size={24} style={{ color: "var(--app-primary)" }} variant="BoldDuotone" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-white uppercase">LucaOS AGENT MANAGEMENT</h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Command & Personality Controls</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
          <Icon name="Close" size={20} variant="BoldDuotone" />
        </button>
      </div>

      {/* 2. MAIN CONTENT (Trader List) */}
      <div 
        className="flex-1 overflow-y-auto p-6 transition-all duration-500 bg-gradient-to-b from-[rgba(var(--app-primary-rgb),0.03)] to-transparent"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-slate-500 animate-pulse">
            Accessing Cortex Luca Network...
          </div>
        ) : (
          <div className="grid gap-4">
            {traders.length === 0 && (
              <div className="text-center py-20 text-slate-500 border border-dashed border-white/5 rounded-xl">
                <Icon name="MagicStick" size={48} className="mx-auto mb-4 opacity-20" variant="BoldDuotone" />
                <p>No active AI Traders deployed.</p>
                <button
                  onClick={() => setShowTraderModal(true)}
                  className="mt-4 text-[10px] font-bold text-[var(--app-primary)]"
                >
                  + Deploy your first agent
                </button>
              </div>
            )}
            {traders.map((trader) => {
              const isRunning = trader.is_running;
              
              return (
                <div
                  key={trader.trader_id}
                  className={`group relative rounded-xl border p-4 transition-all duration-500 ${isRunning ? "shadow-[0_0_20px_rgba(var(--app-primary-rgb),0.05)] bg-[rgba(var(--app-primary-rgb),0.05)] border-[rgba(var(--app-primary-rgb),0.2)]" : "border-white/5 bg-black/20 hover:border-white/20"}`}
                >
                  <div className="flex items-center justify-between">
                    {/* Left: Identity */}
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="relative flex-shrink-0">
                        <PunkAvatar
                          seed={trader.trader_id}
                          size={isRunning ? 48 : 40}
                          className="sm:size-14"
                        />
                        {isRunning && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#161b22] animate-pulse" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="text-sm sm:text-lg font-bold text-white truncate">
                          {trader.trader_name}
                        </h3>
                          <div className="flex items-center gap-2 text-[9px] sm:text-xs mt-0.5">
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/5 text-slate-400 whitespace-nowrap">
                              <Icon name="Cpu" size={10} variant="BoldDuotone" />
                              {getModelName(trader.ai_model)}
                            </div>
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/5 text-slate-400 whitespace-nowrap">
                              <Icon name="Transfer" size={10} variant="BoldDuotone" />
                              {getExchangeName(trader.exchange_id || "")}
                            </div>
                          </div>
                      </div>
                    </div>

                    {/* Middle: Stats */}
                    <div className="hidden lg:flex items-center gap-8">
                      <div className="text-center">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">
                          Total PNL
                        </div>
                        <div
                          className={`text-sm font-bold font-mono ${
                            trader.total_pnl >= 0
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {trader.total_pnl >= 0 ? "+" : ""}
                          {trader.total_pnl.toFixed(2)} USDT
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">
                          Win Rate
                        </div>
                        <div className="text-sm font-bold text-white font-mono">
                          {trader.win_rate}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">
                          Leverage
                        </div>
                        <div className="text-sm font-bold text-amber-400 font-mono">
                          {trader.config?.maxLeverage || 5}x
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingTrader(trader);
                            setShowTraderModal(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Icon name="Settings" size={16} variant="BoldDuotone" />
                        </button>
                      <button
                        onClick={() => handleToggleTrader(trader.trader_id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-[10px] sm:text-xs transition-all ${
                          isRunning
                            ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            : "bg-white/10 text-slate-400 hover:bg-slate-700"
                        }`}
                      >
                        {isRunning ? (
                          <Icon name="Pause" size={12} fill="currentColor" variant="BoldDuotone" />
                        ) : (
                          <Icon name="Play" size={12} fill="currentColor" variant="BoldDuotone" />
                        )}
                        <span className="hidden xs:inline">
                          {isRunning ? "RUNNING" : "STOPPED"}
                        </span>
                      </button>
                        <button
                          onClick={() => handleDeleteTrader(trader.trader_id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Icon name="Trash" size={16} variant="BoldDuotone" />
                        </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALS */}
      <TraderConfigModal
        isOpen={showTraderModal}
        onClose={() => setShowTraderModal(false)}
        onSave={saveTrader}
        initialData={editingTrader}
        models={models.filter((m) => m.enabled)}
        exchanges={exchanges} 
        strategies={strategies}
      />

      <ExchangeConfigModal
        isOpen={showExchangeModal}
        onClose={() => setShowExchangeModal(false)}
        onSave={saveExchange}
        initialData={editingExchange}
      />

      <AIModelConfigModal
        isOpen={showModelModal}
        onClose={() => setShowModelModal(false)}
        onSave={saveModel}
        initialData={editingModel}
      />
    </div>
  );
}
