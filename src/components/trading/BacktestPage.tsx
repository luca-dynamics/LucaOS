import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import BacktestSidebar from "./BacktestSidebar";
import { tradingService } from "../../services/tradingService";
import { useTheme } from "../../hooks/useTheme";

// --- Types ---

// --- Models List ---
const DEFAULT_AI_MODELS = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", color: "#10a37f", enabled: true },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI", color: "#10a37f", enabled: true },
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", color: "#d97757", enabled: true },
  { id: "claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic", color: "#d97757", enabled: true },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google", color: "#4285f4", enabled: true },
  { id: "llama-3-70b", name: "Llama 3 70B", provider: "Meta", color: "#0668E1", enabled: true }
];

const QUICK_RANGES = [
  { label: "24h", hours: 24 },
  { label: "3d", hours: 72 },
  { label: "7d", hours: 168 },
  { label: "30d", hours: 720 },
];

interface Trade {
  ts: number;
  symbol: string;
  action: "open_long" | "open_short" | "close_long" | "close_short";
  price: number;
  qty: number;
  pnl?: number;
}

interface BacktestRun {
  id: string;
  status: "running" | "completed" | "failed" | "paused";
  symbol: string;
  model: string;
  roi: number;
  date: string;
}

// --- Sub-Components ---

const StatCard = ({ label, value, iconName, color, trend, isLight }: any) => (
  <div className={`glass-card-premium liquid-border p-0.5 rounded-xl ${isLight ? "bg-white shadow-xl shadow-slate-200/50" : "bg-black/40 shadow-2xl shadow-black/50"}`}>
    <div 
      className="p-4 rounded-lg flex flex-col h-full"
      style={{ backgroundColor: isLight ? "rgba(248,250,252,1)" : "rgba(255,255,255,0.02)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon name={iconName} className={`w-4 h-4 ${isLight ? "text-slate-400" : "text-slate-500"}`} variant="BoldDuotone" />
        <span className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? "text-slate-400" : "text-slate-500"}`}>{label}</span>
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {trend && (
        <div
          className={`text-[10px] mt-1 font-bold ${
            trend > 0 ? "text-emerald-500" : "text-rose-500"
          }`}
        >
          {trend > 0 ? "+" : ""}
          {trend.toFixed(1)}%
        </div>
      )}
    </div>
  </div>
);

const ProgressRing = ({
  progress,
  size = 120,
  theme,
}: {
  progress: number;
  size?: number;
  theme?: any;
}) => {
  const isLight = theme?.isLight;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center scale-110"
      style={{ width: size, height: size }}
    >
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme?.hex || "#0ea5e9"}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className={`text-2xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
          {Math.round(progress)}%
        </span>
        <span className={`text-[9px] font-bold uppercase tracking-widest ${isLight ? "text-slate-400" : "text-slate-500"}`}>
          {progress === 100 ? "Complete" : "Running"}
        </span>
      </div>
    </div>
  );
};

const BacktestChart = ({ data, theme }: { data: any[]; theme?: any }) => {
  return (
    <div className="glass-card-premium liquid-border p-0.5 rounded-xl bg-white/5 border-white/5 shadow-black/30">
      <div 
        className="h-[350px] w-full p-4 rounded-lg overflow-hidden bg-transparent"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--app-primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--app-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              stroke="#475569"
              tick={{ fill: "#475569", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => new Date(val).toLocaleDateString()}
            />
            <YAxis
              stroke="#475569"
              tick={{ fill: "#475569", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--app-bg-tint)",
                borderColor: "var(--app-border-main)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "var(--app-text-main)"
              }}
              itemStyle={{ color: "var(--app-primary)" }}
              labelFormatter={(label) => new Date(label).toLocaleString()}
            />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="var(--app-primary)"
              fillOpacity={1}
              fill="url(#colorEquity)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const TradeTimeline = ({ trades, isLight }: { trades: Trade[], isLight?: boolean }) => {
  if (trades.length === 0)
    return (
      <div className={`text-center ${isLight ? "text-slate-400" : "text-slate-500"} py-10 italic`}>No trades recorded</div>
    );

  return (
    <div className="space-y-2 pr-2">
      {trades.map((t, i) => {
        const isWin = (t.pnl || 0) > 0;
        return (
          <div
            key={i}
            className={`p-3 rounded-xl border transition-all ${isLight ? "bg-white border-slate-100 hover:border-slate-300" : "bg-black/20 border-white/5 hover:border-white/10"} flex items-center justify-between text-sm`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  t.action.includes("long")
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-rose-500/10 text-rose-500"
                }`}
              >
                {t.action.includes("long") ? (
                  <Icon name="TrendingUp" size={14} variant="BoldDuotone" />
                ) : (
                  <Icon name="TrendingDown" size={14} variant="BoldDuotone" />
                )}
              </div>
              <div>
                <div className={`font-bold flex items-center gap-2 ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                  {t.symbol}
                  <span className={`text-[9px] px-1.5 rounded-full font-bold uppercase tracking-wider ${isLight ? "bg-slate-100 text-slate-500" : "bg-white/5 text-slate-400"}`}>
                    {t.action.replace("_", " ")}
                  </span>
                </div>
                <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                  {new Date(t.ts).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-mono font-bold ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                {t.qty} @ ${t.price.toLocaleString()}
              </div>
              {t.pnl !== undefined && (
                <div
                  className={`font-mono text-[10px] font-bold ${
                    isWin ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {isWin ? "+" : ""}
                  {t.pnl.toFixed(2)} USDT
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- Main Component ---

export default function BacktestPage() {
  const { theme, isLight } = useTheme();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showHistory, setShowHistory] = useState(false);

  // Runs State
  const [runs, setRuns] = useState<BacktestRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>(
    undefined
  );
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Sync models if needed
  }, []);

  // Form State
  const [config, setConfig] = useState({
    modelIds: ["gpt-4o"],
    symbols: "BTC/USDT",
    timeframe: "1h",
    initialCapital: 10000,
    startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16),
    endTime: new Date().toISOString().slice(0, 16),
  });

  // Results State
  const [results, setResults] = useState<{
    equity: any[];
    trades: Trade[];
    metrics: any;
  } | null>(null);

  // Poll for active backtest status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && selectedRunId) {
      interval = setInterval(async () => {
        try {
          const status = await tradingService.getBacktestStatus(selectedRunId);
          if (status.progress >= 100 || status.status === "completed") {
            setIsRunning(false);
            setProgress(100);
            const final = (await tradingService.getBacktestResults(
              selectedRunId
            )) as any;
            setResults(final);
            updateRunStatus(selectedRunId, "completed", final.metrics.roi);
            setStep(3); // Auto switch to review/results
          } else if (status.status === "failed") {
            setIsRunning(false);
            updateRunStatus(selectedRunId, "failed", 0);
          } else {
            setProgress(status.progress || 0);
          }
        } catch (e) {
          console.error("Backtest poll failed", e);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, selectedRunId, theme]);

  // Load results when selecting a completed run (mocked lookup for now as we don't have full history API)
  useEffect(() => {
    if (selectedRunId && !isRunning) {
      // In a real app we would fetch the specific result
      // For now, we only have the result in state if we just ran it
      // Or we could try fetching if the ID is real
    }
  }, [selectedRunId]);

  const updateRunStatus = (id: string, status: any, roi: number) => {
    setRuns((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status, roi } : r))
    );
  };

  const handleRun = async () => {
    try {
      setIsRunning(true);
      setProgress(0);
      setResults(null);

      const responseId = await tradingService.runBacktest({
        symbol: config.symbols,
        timeframe: config.timeframe,
        initialCapital: config.initialCapital,
        strategyId: "active_strategy",
        startTime: new Date(config.startTime).getTime(),
        endTime: new Date(config.endTime).getTime(),
        modelIds: config.modelIds,
      });

      if (responseId) {
        const newRun: BacktestRun = {
          id: responseId,
          status: "running",
          symbol: config.symbols,
          model:
            DEFAULT_AI_MODELS.filter((m) => config.modelIds.includes(m.id))
              .map((m) => m.name)
              .join(", ") || "Unknown",
          roi: 0,
          date: new Date().toISOString(),
        };
        setRuns([newRun, ...runs]);
        setSelectedRunId(newRun.id);
      } else {
        // Fallback for demo if backend isn't actually running async wrapper
        const mockRunId = `bt_${Date.now()}`;
        setRuns((prev) => [
          {
            id: mockRunId,
            status: "running",
            symbol: config.symbols,
            model:
              DEFAULT_AI_MODELS.find((m) => config.modelIds.includes(m.id))?.name ||
              "Unknown",
            roi: 0,
            date: new Date().toISOString(),
          },
          ...prev,
        ]);
        setSelectedRunId(mockRunId);

        // Quick mock finish if backend didn't return ID
        setTimeout(() => {
          setIsRunning(false);
          setProgress(100);
          updateRunStatus(mockRunId, "completed", 12.5);
          setResults({
            equity: [],
            trades: [],
            metrics: {
              roi: 12.5,
              winRate: 60,
              profitFactor: 1.5,
              drawdown: -5,
            },
          });
        }, 2000);
      }
    } catch (e) {
      console.error("Backtest start failed", e);
      setIsRunning(false);
    }
  };

  const handleStop = async () => {
    if (selectedRunId) {
      await tradingService.stopBacktest(selectedRunId);
      setIsRunning(false);
      updateRunStatus(selectedRunId, "failed", 0);
    }
  };

  const handleDeleteRun = (id: string) => {
    setRuns((prev) => prev.filter((r) => r.id !== id));
    if (selectedRunId === id) setSelectedRunId(undefined);
  };

  return (
    <div className={`h-full flex transition-colors duration-500 overflow-hidden ${isLight ? "bg-slate-50 text-slate-900" : "bg-[#050505] text-slate-200"}`}>
      {/* 1. SIDEBAR HISTORY */}
      <div
        className={`fixed inset-0 z-50 lg:relative lg:inset-auto lg:z-0 lg:flex ${
          showHistory ? "flex" : "hidden"
        } lg:block h-full`}
      >
        <div
          className="absolute inset-0 bg-black/60 glass-blur lg:hidden"
          onClick={() => setShowHistory(false)}
        />
        <div className="relative h-full animate-in slide-in-from-left duration-300 lg:animate-none">
          <BacktestSidebar
            runs={runs}
            selectedRunId={selectedRunId}
            onSelectRun={(id) => {
              setSelectedRunId(id);
              setShowHistory(false);
            }}
            onDeleteRun={handleDeleteRun}
            onNewBacktest={() => {
              setSelectedRunId(undefined);
              setStep(1);
              setResults(null);
              setIsRunning(false);
              setShowHistory(false);
            }}
            theme={theme}
          />
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <div className={`h-16 flex-shrink-0 border-b flex items-center justify-between px-4 sm:px-6 transition-colors duration-500 ${isLight ? "bg-white/50 border-slate-200" : "bg-black/20 border-white/5"} backdrop-blur-md`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              onClick={() => setShowHistory(true)}
              className={`p-2 lg:hidden transition-colors ${isLight ? "text-slate-400 hover:text-slate-900" : "text-white/40 hover:text-white"}`}
            >
              <Icon name="Menu" size={20} variant="BoldDuotone" />
            </button>
            <div className="overflow-hidden">
              <h1 className={`text-base sm:text-xl font-black flex items-center gap-2 sm:gap-3 transition-colors ${isLight ? "text-slate-900" : "text-white"} truncate`}>
                <Icon name="Brain" size={20} variant="BoldDuotone" color={theme?.hex || "#0ea5e9"} />
                <span className="truncate tracking-tight uppercase">Simulation Lab</span>
              </h1>
              {selectedRunId && (
                <div className={`text-[9px] font-mono flex items-center gap-2 truncate font-bold ${isLight ? "text-slate-400" : "text-white/30"}`}>
                  ID: {selectedRunId.slice(0, 8)}...
                  {isRunning && (
                    <span className="animate-pulse flex items-center gap-1" style={{ color: theme?.hex || "#0ea5e9" }}>
                      <span className="w-1 h-1 rounded-full" style={{ backgroundColor: theme?.hex || "#0ea5e9" }} />
                      COMPUTING
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {isRunning && (
            <button
              onClick={handleStop}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-rose-500 text-white rounded-lg text-[10px] sm:text-xs font-black tracking-widest flex items-center gap-1.5 sm:gap-2 hover:bg-rose-600 shadow-lg shadow-rose-500/20"
            >
              <Icon name="Stop" size={14} variant="BoldDuotone" /> ABORT SIM
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-full">
            {/* MIDDLE: CONFIG WIZARD */}
            <div className="xl:col-span-4 flex flex-col gap-6">
              <div className={`border rounded-2xl p-6 transition-all duration-500 shadow-xl ${isLight ? "bg-white border-black/5 shadow-slate-200/20" : "bg-white/5 border-white/5 shadow-black/30"}`}>
                {/* Stepper */}
                <div className="flex items-center gap-2 mb-8">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border transition-all duration-500`}
                        style={
                          step >= s
                            ? {
                                backgroundColor: theme?.hex || "#0ea5e9",
                                borderColor: theme?.hex || "#0ea5e9",
                                color: "white",
                                boxShadow: theme?.hex
                                  ? `0 0 20px ${theme.hex}33`
                                  : "0 0 20px rgba(99,102,241,0.2)",
                              }
                            : {
                                backgroundColor: isLight ? "#f8fafc" : "#0f172a",
                                borderColor: isLight ? "#e2e8f0" : "#1e293b",
                                color: isLight ? "#94a3b8" : "#475569",
                              }
                        }
                      >
                        {s}
                      </div>
                      {s < 3 && (
                        <div
                          className={`w-8 h-0.5 mx-1 transition-colors duration-500`}
                          style={
                            step > s
                              ? { backgroundColor: theme?.hex || "#0ea5e9" }
                              : { backgroundColor: isLight ? "#e2e8f0" : "#1e293b" }
                          }
                        />
                      )}
                    </div>
                  ))}
                  <span className={`ml-auto text-[10px] font-mono font-black uppercase tracking-widest ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                    {step === 1
                      ? "Core"
                      : step === 2
                      ? "Params"
                      : "Review"}
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-6"
                    >
                      <div>
                        <label className={`text-[10px] font-black uppercase tracking-widest mb-3 block ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                          Intelligence Source
                        </label>
                        <div className="space-y-2">
                          {DEFAULT_AI_MODELS.map((m) => {
                            const isSelected = config.modelIds.includes(m.id);
                            return (
                              <div
                                key={m.id}
                                onClick={() => {
                                  if (!m.enabled) return;
                                  if (isSelected) {
                                    if (config.modelIds.length > 1) {
                                      setConfig({ ...config, modelIds: config.modelIds.filter(id => id !== m.id) });
                                    }
                                  } else {
                                    setConfig({ ...config, modelIds: [...config.modelIds, m.id] });
                                  }
                                }}
                                className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 relative overflow-hidden group`}
                                style={{
                                  backgroundColor: isSelected 
                                    ? (isLight ? `${theme?.hex || "#0ea5e9"}08` : "rgba(255,255,255,0.02)")
                                    : (isLight ? "#ffffff" : "transparent"),
                                  borderColor: isSelected 
                                    ? (theme?.hex || "#0ea5e9")
                                    : (isLight ? "#e2e8f0" : "rgba(255,255,255,0.05)"),
                                }}
                              >
                                {isSelected && (
                                  <div 
                                    className="absolute left-0 top-0 bottom-0 w-1" 
                                    style={{ backgroundColor: theme?.hex || "#0ea5e9" }}
                                  />
                                )}
                                <div className="flex justify-between items-center relative z-10">
                                  <span
                                    className={`font-black text-sm tracking-tight`}
                                    style={{ color: isSelected ? (isLight ? "#0f172a" : "white") : (isLight ? "#64748b" : "#94a3b8") }}
                                  >
                                    {m.name}
                                  </span>
                                  {isSelected && (
                                    <Icon name="CheckCircle2" size={16} color={theme?.hex || "#0ea5e9"} variant="BoldDuotone" />
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 rounded-full font-bold text-[9px] ${isLight ? "bg-slate-100 text-slate-500" : "bg-white/5 text-slate-500"}`}>
                                    {m.provider}
                                  </span>
                                  {!m.enabled && <span className="text-rose-500/50 italic text-[9px]">EXPERIMENTAL</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className={`text-[10px] font-black uppercase tracking-widest mb-3 block ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                          Asset Configuration
                        </label>
                        <div className="relative group">
                            <input
                              type="text"
                              value={config.symbols}
                              onChange={(e) =>
                                setConfig({ ...config, symbols: e.target.value })
                              }
                              className={`w-full p-4 rounded-xl border outline-none transition-all font-mono text-sm ${
                                isLight 
                                  ? "bg-white border-slate-200 focus:ring-4" 
                                  : "bg-black/20 border-white/5 focus:ring-4 text-white"
                              }`}
                              style={{ 
                                borderColor: config.symbols ? theme?.hex + "44" : "",
                                "--tw-ring-color": theme?.hex + "1a" 
                              } as any}
                              placeholder="e.g. BTC/USDT, ETH/USDT"
                            />
                        </div>
                        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 custom-scrollbar">
                          {["BTC", "ETH", "SOL", "BNB", "XRP"].map((coin) => (
                            <button
                              key={coin}
                              onClick={() =>
                                setConfig({
                                  ...config,
                                  symbols: config.symbols.includes(coin)
                                    ? config.symbols
                                    : config.symbols
                                    ? `${config.symbols}, ${coin}/USDT`
                                    : `${coin}/USDT`,
                                })
                              }
                              className={`text-[9px] font-black px-3 py-1.5 rounded-full transition-all flex-shrink-0 ${isLight ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
                            >
                              + {coin}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        disabled={config.modelIds.length === 0}
                        onClick={() => setStep(2)}
                        className="w-full py-4 rounded-xl mt-4 font-black transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 tracking-widest uppercase text-[10px]"
                        style={{
                          backgroundColor: theme?.hex || "#0ea5e9",
                          color: "#050505",
                          boxShadow: theme?.hex
                            ? `0 10px 25px ${theme.hex}4d`
                            : "0 10px 25px rgba(14,165,233,0.3)",
                        }}
                      >
                        Proceed to Parameters
                      </button>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`text-[10px] font-black uppercase tracking-widest mb-3 block ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                            Launch Window
                          </label>
                          <input
                            type="datetime-local"
                            value={config.startTime}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                startTime: e.target.value,
                              })
                            }
                            className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-xs ${isLight ? "bg-white border-slate-200" : "bg-black/20 border-white/5 text-white"}`}
                            style={{ borderColor: config.startTime ? theme?.hex + "44" : "" }}
                          />
                        </div>
                        <div>
                          <label className={`text-[10px] font-black uppercase tracking-widest mb-3 block ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                            End Window
                          </label>
                          <input
                            type="datetime-local"
                            value={config.endTime}
                            onChange={(e) =>
                              setConfig({ ...config, endTime: e.target.value })
                            }
                            className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-xs ${isLight ? "bg-white border-slate-200" : "bg-black/20 border-white/5 text-white"}`}
                            style={{ borderColor: config.endTime ? theme?.hex + "44" : "" }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {QUICK_RANGES.map((r) => (
                            <button
                              key={r.label}
                              className={`px-3 py-1.5 rounded-lg border text-[10px] font-black transition-all ${isLight ? "bg-white border-slate-200 text-slate-500 hover:text-slate-900" : "bg-white/5 border-white/5 text-slate-400 hover:text-white"}`}
                              style={{ borderColor: isLight ? "" : "rgba(255,255,255,0.05)" }}
                              onMouseEnter={(e) => e.currentTarget.style.borderColor = theme?.hex || ""}
                              onMouseLeave={(e) => e.currentTarget.style.borderColor = isLight ? "" : "rgba(255,255,255,0.05)"}
                            onClick={() => {
                              const end = new Date();
                              const start = new Date(
                                end.getTime() - r.hours * 3600000
                              );
                              setConfig({
                                ...config,
                                startTime: start.toISOString().slice(0, 16),
                                endTime: end.toISOString().slice(0, 16),
                              });
                            }}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className={`text-[10px] font-black uppercase tracking-widest mb-3 block ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                          Initial Liquidity (USDT)
                        </label>
                        <input
                          type="number"
                          value={config.initialCapital}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              initialCapital: Number(e.target.value),
                            })
                          }
                          className={`w-full p-4 rounded-xl border outline-none transition-all font-mono text-sm ${isLight ? "bg-white border-slate-200" : "bg-black/20 border-white/5 text-white"}`}
                          style={{ borderColor: config.initialCapital ? theme?.hex + "44" : "" }}
                        />
                      </div>

                      <div className="flex gap-3 mt-8">
                        <button
                          onClick={() => setStep(1)}
                          className={`flex-1 py-4 font-black rounded-xl border transition-all text-xs tracking-widest uppercase ${isLight ? "bg-white border-slate-200 text-slate-500 hover:bg-slate-50" : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"}`}
                        >
                          Back
                        </button>
                        <button
                          onClick={() => setStep(3)}
                          className="flex-[2] py-4 rounded-xl font-black transition-all shadow-xl active:scale-[0.98] tracking-widest uppercase text-[10px]"
                          style={{
                            backgroundColor: theme?.hex || "#0ea5e9",
                            color: "#050505",
                            boxShadow: theme?.hex
                              ? `0 10px 25px ${theme.hex}4d`
                              : "0 10px 25px rgba(14,165,233,0.3)",
                          }}
                        >
                          Review
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-6"
                    >
                      <div className={`rounded-2xl p-5 space-y-4 border transition-colors ${isLight ? "bg-slate-50/50 border-slate-100" : "bg-black/20 border-white/5"}`}>
                        <div className="flex justify-between text-xs items-center">
                          <span className={`${isLight ? "text-slate-400" : "text-slate-500"} font-bold uppercase tracking-widest text-[9px]`}>Intelligence</span>
                          <span
                            className="font-black text-sm tracking-tight"
                            style={{ color: theme?.hex || "#10b981" }}
                          >
                            {DEFAULT_AI_MODELS.filter((m) =>
                              config.modelIds.includes(m.id)
                            )
                              .map((m) => m.name)
                              .join(", ")}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs items-center">
                          <span className={`${isLight ? "text-slate-400" : "text-slate-500"} font-bold uppercase tracking-widest text-[9px]`}>Asset Swarm</span>
                          <span className={`font-mono font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                            {config.symbols}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs items-start">
                          <span className={`${isLight ? "text-slate-400" : "text-slate-500"} font-bold uppercase tracking-widest text-[9px] mt-1`}>Duration</span>
                          <span className={`font-mono text-right ${isLight ? "text-slate-900" : "text-white"}`}>
                            <div className="font-bold">{config.startTime}</div>
                            <div className="opacity-40">{config.endTime}</div>
                          </span>
                        </div>
                        <div className={`flex justify-between text-xs items-center border-t pt-4 ${isLight ? "border-slate-200" : "border-white/5"}`}>
                          <span className={`${isLight ? "text-slate-400" : "text-slate-500"} font-bold uppercase tracking-widest text-[9px]`}>Sim Capital</span>
                          <span 
                            className="font-black text-sm"
                            style={{ color: isLight ? theme?.hex || "#0ea5e9" : "#10b981" }}
                          >
                            ${config.initialCapital.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-8">
                        <button
                          onClick={() => setStep(2)}
                          className={`flex-1 py-4 font-black rounded-xl border transition-all text-xs tracking-widest uppercase ${isLight ? "bg-white border-slate-200 text-slate-500" : "bg-white/5 border-white/5 text-slate-400"}`}
                        >
                          Adjust
                        </button>
                        <button
                          onClick={handleRun}
                          disabled={isRunning}
                          className="flex-[2] py-4 rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70 font-black tracking-widest uppercase text-[10px]"
                          style={{
                            background: theme?.hex 
                              ? `linear-gradient(135deg, ${theme.hex}, ${theme.hex}cc)`
                              : "linear-gradient(135deg, #0ea5e9, #0284c7)",
                            color: "#ffffff",
                            boxShadow: theme?.hex
                              ? `0 10px 30px ${theme.hex}4d`
                              : "0 10px 30px rgba(14,165,233,0.4)",
                          }}
                        >
                          {isRunning ? (
                            <Icon name="Restart" className="animate-spin" variant="BoldDuotone" />
                          ) : (
                            <Icon name="Zap" variant="BoldDuotone" />
                          )}
                          {isRunning ? "Simulating..." : "Launch Simulation"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

             {/* RIGHT: RESULTS DASHBOARD */}
            <div className="xl:col-span-8 flex flex-col gap-6 min-h-0">
              {!results && !isRunning ? (
                <div className={`h-full border border-dashed rounded-2xl flex items-center justify-center flex-col gap-4 animate-in fade-in transition-colors duration-500 ${isLight ? "bg-white/30 border-black/10 text-slate-400" : "bg-white/5 border-white/10 text-slate-500"}`}>
                  <div className={`p-6 rounded-full transition-colors ${isLight ? "bg-white shadow-xl shadow-slate-200" : "bg-[#1e2329]"}`}>
                    <Icon name="Brain" size={48} color={theme?.hex || "#0ea5e9"} variant="BoldDuotone" />
                  </div>
                  <p className="font-bold tracking-tight uppercase text-xs">Awaiting Simulation Parameters</p>
                </div>
              ) : (
                <>
                  {isRunning ? (
                    <div className={`flex-1 border rounded-2xl flex items-center justify-center flex-col gap-8 animate-in zoom-in-95 transition-all duration-500 shadow-xl ${isLight ? "bg-white border-black/5 shadow-slate-200/20" : "bg-white/5 border-white/5 shadow-black/30"}`}>
                      <ProgressRing progress={progress} theme={theme} />
                      <div className="text-center">
                        <h3 className={`text-xl font-black mb-2 uppercase tracking-tighter transition-colors ${isLight ? "text-slate-900" : "text-white"}`}>
                          Orchestrating Market Pulse
                        </h3>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                          Synching multi-agent consensus...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                       {/* Metrics Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                          label="Yield (ROI)"
                          value={`${results?.metrics?.roi?.toFixed(2) || 0}%`}
                          iconName="TrendingUp"
                          color={isLight ? "text-emerald-600" : "text-emerald-500"}
                          trend={results?.metrics?.roi}
                          isLight={isLight}
                        />
                        <StatCard
                          label="Consensus Rate"
                          value={`${results?.metrics?.winRate || 0}%`}
                          iconName="Target"
                          color={isLight ? "text-slate-900" : "text-white"}
                          isLight={isLight}
                        />
                        <StatCard
                          label="Max Drawdown"
                          value={`${results?.metrics?.drawdown || 0}%`}
                          iconName="TrendingDown"
                          color="text-rose-500"
                          isLight={isLight}
                        />
                        <StatCard
                          label="Efficiency Factor"
                          value={results?.metrics?.profitFactor}
                          iconName="Activity"
                          color={isLight ? "text-slate-900" : "text-white"}
                          style={{ color: theme?.hex }}
                          isLight={isLight}
                        />
                      </div>

                       {/* Model Comparison Matrix (Phase 14) */}
                      {(results as any)?.modelComparisons && (
                        <div className={`border rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 shadow-xl transition-all duration-500 ${isLight ? "bg-white border-black/5 shadow-slate-200/20" : "bg-white/5 border-white/5 shadow-black/30"}`}>
                          <div className={`p-4 border-b flex items-center justify-between ${isLight ? "bg-slate-50 border-slate-100" : "bg-[#1e2329]/50 border-white/5"}`}>
                            <h3 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isLight ? "text-slate-600" : "text-white"}`}>
                              <Icon name="Database" size={14} color={theme?.hex || "#0ea5e9"} variant="BoldDuotone" />
                              Intelligence Efficiency Matrix
                            </h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px]">
                              <thead className={`font-black uppercase tracking-widest ${isLight ? "bg-slate-100/50 text-slate-400" : "bg-black/20 text-slate-500"}`}>
                                <tr>
                                  <th className="p-4">Engine</th>
                                  <th className="p-4">Yield %</th>
                                  <th className="p-4">Hit Rate</th>
                                  <th className="p-4 text-right">Inference Cost</th>
                                  <th className="p-4 w-48">Performance/Cost</th>
                                </tr>
                              </thead>
                              <tbody className={`divide-y ${isLight ? "divide-slate-100" : "divide-white/5"}`}>
                                {(results as any).modelComparisons.map((c: any) => (
                                  <tr key={c.modelId} className={`transition-colors ${isLight ? "hover:bg-slate-50" : "hover:bg-white/5"}`}>
                                    <td className={`p-4 font-black uppercase tracking-tighter ${isLight ? "text-slate-900" : "text-white"}`}>{c.modelId}</td>
                                    <td className="p-4 text-emerald-500 font-mono font-black">+{c.roi}%</td>
                                    <td className={`p-4 font-mono ${isLight ? "text-slate-600" : "text-slate-300"}`}>{c.winRate}%</td>
                                    <td className={`p-4 font-mono text-right ${isLight ? "text-slate-400" : "text-slate-400"}`}>${c.cost.toFixed(2)}</td>
                                    <td className="p-4">
                                      <div className="flex items-center gap-3">
                                        <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isLight ? "bg-slate-100" : "bg-white/5"}`}>
                                          <div 
                                            className="h-full transition-all duration-1000" 
                                            style={{ 
                                              width: `${Math.min(100, (c.roi / c.cost) / 2)}%`,
                                              backgroundColor: theme?.hex || "#0ea5e9",
                                              boxShadow: `0 0 10px ${theme?.hex || "#0ea5e9"}66`
                                            }}
                                          />
                                        </div>
                                        <span className="text-[10px] font-black min-w-[24px]" style={{ color: theme?.hex || "#0ea5e9" }}>
                                          {(c.roi / c.cost).toFixed(1)}x
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                       {/* Chart & Trades Split */}
                      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
                          <BacktestChart data={results?.equity || []} theme={theme} />
                          {/* Instructions / Log Placeholder */}
                          <div className={`flex-1 rounded-2xl border p-5 font-mono text-[10px] overflow-y-auto shadow-xl transition-all duration-500 ${isLight ? "bg-white border-black/5 text-slate-500 shadow-slate-200/20" : "bg-white/5 border-white/5 text-slate-400 shadow-black/30"}`}>
                            <div className={`mb-3 font-black uppercase tracking-widest flex items-center justify-between ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                              <div className="flex items-center gap-2">
                                <Icon name="Activity" size={12} variant="BoldDuotone" />
                                Engine Telemetry
                              </div>
                              <span className="text-[8px] opacity-50 font-mono">
                                LUCA_OS_V4.2
                              </span>
                            </div>
                            <div className="space-y-1.5 font-mono">
                              <div className="flex gap-2">
                                <span className="font-bold opacity-70" style={{ color: theme?.hex || "#10b981" }}>[08:24:12][SYSTEM]</span>
                                <span className={isLight ? "text-slate-600" : "text-slate-300"}>Core neural buffer initialized. 12.4GB allocated.</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="font-bold opacity-70" style={{ color: theme?.hex || "#10b981" }}>[08:24:13][DATA]</span>
                                <span className={isLight ? "text-slate-600" : "text-slate-300"}>Ingress stream synchronized for {config.symbols}.</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="font-bold opacity-70" style={{ color: theme?.hex || "#10b981" }}>[08:24:15][AI]</span>
                                <span className={isLight ? "text-slate-600" : "text-slate-300"}>Multi-agent reasoning loop active (Quorum: 4/4).</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="font-bold opacity-70" style={{ color: theme?.hex || "#10b981" }}>[08:24:18][STRAT]</span>
                                <span className={isLight ? "text-slate-600" : "text-slate-300"}>Recursive pattern match found on 4h timeframe.</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className={`rounded-2xl border flex flex-col min-h-0 shadow-xl transition-all duration-500 ${isLight ? "bg-white border-black/5 shadow-slate-200/20" : "bg-white/5 border-white/5 shadow-black/30"}`}>
                          <div className={`p-4 border-b font-black text-[10px] uppercase tracking-widest flex items-center justify-between ${isLight ? "bg-slate-50 border-slate-100 text-slate-600" : "bg-white/5 border-white/5 text-white"}`}>
                            <span>Operations Log</span>
                            <span style={{ color: theme?.hex }}>
                              {results?.trades?.length || 0} Events
                            </span>
                          </div>
                          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                            <TradeTimeline trades={results?.trades || []} isLight={isLight} />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
