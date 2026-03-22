import React, { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
const {
  Bot,
  Plus,
  Settings,
  Trash2,
  Play,
  Pause,
  Cpu,
  ArrowRightLeft,
  Sparkles,
} = LucideIcons as any;
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
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function AITradersPage({ onClose, theme }: AITradersPageProps) {
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

  const activeTradersCount = traders.filter((t) => t.is_running).length;

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
    <div className="flex flex-col h-full bg-[#050505] text-white font-sans overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-white/5 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div 
             className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm"
             style={{ 
               backgroundColor: theme ? `${theme.hex}33` : "rgba(99,102,241,0.2)",
               borderColor: theme ? `${theme.hex}66` : "rgba(99,102,241,0.4)",
               boxShadow: theme ? `0 0 15px ${theme.hex}4d` : "0 0 15px rgba(99,102,241,0.3)"
             }}
          >
            <Bot className="w-6 h-6" style={{ color: theme?.hex || "#818cf8" }} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-white uppercase">LucaOS AGENT MANAGEMENT</h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Command & Personality Controls</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
          <LucideIcons.X size={20} />
        </button>
      </div>

      {/* 2. MAIN CONTENT (Trader List) */}
      <div className="flex-1 overflow-y-auto p-6 bg-rq-base">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-slate-500 animate-pulse">
            Accessing Cortex Luca Network...
          </div>
        ) : (
          <div className="grid gap-4">
            {traders.length === 0 && (
              <div className="text-center py-20 text-slate-500 border border-dashed border-rq-border rounded-xl">
                <Bot size={48} className="mx-auto mb-4 opacity-20" />
                <p>No active AI Traders deployed.</p>
                <button
                  onClick={() => setShowTraderModal(true)}
                  className="mt-4 text-[10px] font-bold"
                  style={{ color: theme?.hex || "#06b6d4" }}
                >
                  + Deploy your first agent
                </button>
              </div>
            )}
            {traders.map((trader) => {
              const isRunning = trader.is_running;
              const statusBg = isRunning
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-rq-panel border-rq-border";

              return (
                <div
                  key={trader.trader_id}
                  className={`group relative rounded-xl border p-4 transition-all duration-200 ${statusBg} hover:border-slate-600`}
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
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-rq-panel animate-pulse" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="text-sm sm:text-lg font-bold text-white truncate">
                          {trader.trader_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-[9px] sm:text-xs mt-0.5">
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/40 border border-rq-border text-slate-400 whitespace-nowrap">
                            <Cpu size={10} />
                            {getModelName(trader.ai_model)}
                          </div>
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/40 border border-rq-border text-slate-400 whitespace-nowrap">
                            <ArrowRightLeft size={10} />
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
                        <Settings size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleTrader(trader.trader_id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-[10px] sm:text-xs transition-all ${
                          isRunning
                            ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            : "bg-rq-border text-slate-400 hover:bg-slate-700"
                        }`}
                      >
                        {isRunning ? (
                          <Pause size={12} fill="currentColor" />
                        ) : (
                          <Play size={12} fill="currentColor" />
                        )}
                        <span className="hidden xs:inline">
                          {isRunning ? "RUNNING" : "STOPPED"}
                        </span>
                      </button>
                      <button
                        onClick={() => handleDeleteTrader(trader.trader_id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 size={16} />
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
        exchanges={exchanges} // Pass Real Exchanges
        strategies={strategies} // Pass Real Strategies
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
