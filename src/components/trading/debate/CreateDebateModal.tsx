import React, { useState, useEffect, useMemo, useRef } from "react";
import { Icon } from "../../ui/Icon";

import { DebatePersonality, CreateDebateRequest } from "../../../types/trading";
import { PERSONALITY_EMOJIS, PERSONALITY_COLORS } from "../../../types/trading";
import { BRAIN_CONFIG } from "../../../config/brain.config";
import { modelManager, LocalModel } from "../../../services/ModelManagerService";
import { tradingService } from "../../../services/tradingService";
import { getAgentLogo } from "../../../utils/tradingUI";

interface CreateDebateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (request: CreateDebateRequest) => void;
}

// Note: AI_MODELS is now dynamically generated inside the component

const MOCK_STRATEGIES = [
  {
    id: "strat1",
    name: "Trend Following (Safe)",
    type: "static",
    coins: [
      "BTCUSDT",
      "ETHUSDT",
      "SOLUSDT",
      "BNBUSDT",
      "XRPUSDT",
      "ADAUSDT",
      "LINKUSDT",
    ],
  },
  {
    id: "strat2",
    name: "Mean Reversion (Aggressive)",
    type: "static",
    coins: ["DOGEUSDT", "AVAXUSDT", "DOTUSDT", "NEARUSDT", "PEPEUSDT"],
  },
  {
    id: "strat3",
    name: "AI Sentiment Scan (Dynamic)",
    type: "dynamic",
    coins: [],
  },
];

const SUPPORTED_ASSETS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", 
  "ADAUSDT", "LINKUSDT", "DOGEUSDT", "AVAXUSDT", "DOTUSDT", 
  "NEARUSDT", "PEPEUSDT", "SHIBUSDT", "TRXUSDT", "MATICUSDT",
  "LTCUSDT", "BCHUSDT", "FILUSDT", "APTUSDT", "SUIUSDT",
  "OPUSDT", "ARBUSDT", "TIAUSDT", "SEIUSDT", "INJUSDT"
];

const PERSONALITIES: {
  value: DebatePersonality;
  label: string;
  emoji: string;
  desc: string;
}[] = [
  {
    value: DebatePersonality.BULL,
    label: "Bull",
    emoji: PERSONALITY_EMOJIS[DebatePersonality.BULL],
    desc: "Aggressive Long",
  },
  {
    value: DebatePersonality.BEAR,
    label: "Bear",
    emoji: PERSONALITY_EMOJIS[DebatePersonality.BEAR],
    desc: "Aggressive Short",
  },
  {
    value: DebatePersonality.ANALYST,
    label: "Analyst",
    emoji: PERSONALITY_EMOJIS[DebatePersonality.ANALYST],
    desc: "Data Driven",
  },
  {
    value: DebatePersonality.RISK_MANAGER,
    label: "Risk Mgr",
    emoji: PERSONALITY_EMOJIS[DebatePersonality.RISK_MANAGER],
    desc: "Conservative",
  },
  {
    value: DebatePersonality.CONTRARIAN,
    label: "Contrarian",
    emoji: PERSONALITY_EMOJIS[DebatePersonality.CONTRARIAN],
    desc: "Counter-Trend",
  },
];

export default function CreateDebateModal({
  isOpen,
  onClose,
  onCreate,
}: CreateDebateModalProps) {
  const [name, setName] = useState("");
  const [strategyId, setStrategyId] = useState(MOCK_STRATEGIES[0].id);
  const [symbol, setSymbol] = useState(MOCK_STRATEGIES[0].coins[0] || "");
  const [assetSearch, setAssetSearch] = useState("");
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [liveAssets, setLiveAssets] = useState<string[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [liveStrategies, setLiveStrategies] = useState<{id: string; name: string; coins: string[]; type: string}[]>([]);
  const assetDropdownRef = useRef<HTMLDivElement>(null);
  const [rounds, setRounds] = useState(3);
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  
  // Dynamically assemble available models
  const AI_MODELS = useMemo(() => {
    const cloudModels: { id: string; name: string; provider: string; color: string }[] = [];
    
    // 1. Collect from BRAIN_CONFIG
    Object.values(BRAIN_CONFIG.providers).forEach((provider) => {
      Object.entries(provider.models).forEach(([label, modelId]) => {
        const brand = getAgentLogo(modelId);
        cloudModels.push({
          id: modelId as string,
          name: `${provider.name} ${label} ${label.includes("3.1") || label.includes("4.5") ? "(Elite)" : "(Managed)"}`,
          provider: provider.name,
          color: brand.color,
        });
      });
    });

    // 2. Collect from ModelManager
    const local = localModels
      .filter((m: LocalModel) => m.status === "ready" && m.category === "brain")
      .map((m: LocalModel) => {
        const brand = getAgentLogo(m.id);
        return {
          id: m.id,
          name: `${m.name} (Local)`,
          provider: brand.letter === "G" ? "Google" : brand.letter === "L" ? "Meta" : "Local",
          color: brand.color,
        };
      });

    return { cloud: cloudModels, local };
  }, [localModels]);

  const [participants, setParticipants] = useState<
    { aiModelId: string; personality: DebatePersonality }[]
  >([
    { aiModelId: "gemini-3.1-pro-preview", personality: DebatePersonality.ANALYST },
    { aiModelId: "gemini-2.0-flash", personality: DebatePersonality.BULL },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync Local Models + Live Exchange Assets + Real Strategies
  useEffect(() => {
    if (isOpen) {
      modelManager.getModels().then(setLocalModels);

      // Fetch live assets from connected exchange
      setIsLoadingAssets(true);
      tradingService.getMarkets().then((markets) => {
        const symbols = Object.keys(markets ?? {});
        if (symbols.length > 0) {
          const normalised = symbols
            .filter((s) => s.endsWith("/USDT") || s.endsWith("USDT"))
            .map((s) => s.replace("/", ""))
            .sort();
          setLiveAssets(normalised);
        }
      }).catch(() => {}).finally(() => setIsLoadingAssets(false));

      // Fetch real strategies from backend
      fetch("/api/trading/strategy")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.strategies) && data.strategies.length > 0) {
            const mapped = data.strategies.map((s: any) => ({
              id: s.id,
              name: s.name,
              type: s.type || "static",
              coins: s.coinSource?.staticCoins || s.coins || [],
            }));
            setLiveStrategies(mapped);
          }
        })
        .catch(() => { /* silently fall back to mock strategies */ });
    }
  }, [isOpen]);

  // Merge real strategies with built-in mocks (real ones go first)
  const allStrategies = useMemo(() => {
    const live = liveStrategies.filter(ls => !MOCK_STRATEGIES.some(m => m.id === ls.id));
    return [...live, ...MOCK_STRATEGIES];
  }, [liveStrategies]);

  // Close asset dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(e.target as Node)) {
        setShowAssetDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Strategy Logic
  const selectedStrategy = allStrategies.find((s) => s.id === strategyId);
  const isStatic = selectedStrategy?.type === "static";

  // Merge live exchange assets with hardcoded fallback + strategy coins
  const allAssets = useMemo(() => {
    const strategyCoins = selectedStrategy?.coins || [];
    // Merge live assets with fallback list to ensure variety
    const base = [...new Set([...liveAssets, ...SUPPORTED_ASSETS])];
    return [...new Set([...strategyCoins, ...base])];
  }, [selectedStrategy, liveAssets]);

  useEffect(() => {
    if (selectedStrategy && isStatic && selectedStrategy.coins.length > 0) {
      // Only reset when strategy changes — seed with first coin
      const first = selectedStrategy.coins[0];
      setSymbol(first);
      setAssetSearch(first);
    } else if (selectedStrategy && !isStatic) {
      setSymbol("");
      setAssetSearch("");
    }
    // Only react to strategy change, NOT to symbol changes
  }, [strategyId]);

  // Filtered asset list based on search
  const filteredAssets = useMemo(() => {
    const q = assetSearch.toUpperCase().trim();
    // If search is empty OR it matches the current symbol exactly, show all assets
    // This allows the dropdown to be "full" when first opened even if a symbol is pre-selected
    if (!q || q === symbol) return allAssets;
    return allAssets.filter((a) => a.includes(q));
  }, [assetSearch, allAssets, symbol]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name || participants.length < 2) return;
    setIsSubmitting(true);
    setTimeout(() => {
      onCreate({
        name,
        strategyId,
        symbol: symbol || "AUTO-SELECT",
        maxRounds: rounds,
        participants,
      });
      setIsSubmitting(false);
      onClose();
      setName("");
      setParticipants([
        { aiModelId: "gemini-3.1-pro-preview", personality: DebatePersonality.ANALYST },
        { aiModelId: "deepseek-r1-distill-7b", personality: DebatePersonality.BULL },
      ]);
    }, 800);
  };

  const addParticipant = () => {
    if (participants.length >= 6) return;
    const nextPers = [
      DebatePersonality.ANALYST,
      DebatePersonality.RISK_MANAGER,
      DebatePersonality.CONTRARIAN,
    ];
    const p = nextPers[participants.length % nextPers.length];
    
    // Default to first cloud model if available
    const defaultModel = AI_MODELS.cloud[0]?.id || "gemini-2.0-flash";
    
    setParticipants([
      ...participants,
      { aiModelId: defaultModel, personality: p },
    ]);
  };

  const removeParticipant = (index: number) => {
    setParticipants((prev) => prev.filter((_: any, i: number) => i !== index));
  };

  const updateParticipant = (
    index: number,
    field: "aiModelId" | "personality",
    value: string
  ) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 glass-blur animate-in fade-in duration-200 font-sans">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 bg-[#050505] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Icon name="System" size={18} className="text-[#facc15]" variant="BoldDuotone" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Create Debate Session
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">
                AI Consensus Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg"
          >
            <Icon name="Close" size={18} variant="BoldDuotone" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar bg-[#080808]/40">
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block">
                Debate Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. BTC Breakout Analysis"
                className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#facc15] focus:ring-1 focus:ring-[#facc15]/20 transition-all placeholder:text-slate-600 font-medium"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-2 block">
                  Strategy
                </label>
                <select
                  value={strategyId}
                  onChange={(e) => setStrategyId(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-[#facc15] font-medium"
                >
                  {allStrategies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-2 block">
                  Target Asset
                </label>
                {isStatic ? (
                  <div className="relative" ref={assetDropdownRef}>
                    {/* Text input */}
                    <div className="relative">
                      <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" variant="BoldDuotone" />
                      <input
                        type="text"
                        placeholder="Search asset…"
                        className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl pl-8 pr-8 py-3 text-[#facc15] text-sm focus:outline-none focus:border-[#facc15] focus:ring-1 focus:ring-[#facc15]/20 transition-all placeholder:text-slate-700 placeholder:font-sans placeholder:text-xs font-mono font-bold"
                        value={assetSearch}
                        onFocus={() => setShowAssetDropdown(true)}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace("/", "");
                          setAssetSearch(val);
                          setSymbol(val);
                          setShowAssetDropdown(true);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAssetDropdown((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        <Icon name="AltArrowDown" size={13} className={`transition-transform ${showAssetDropdown ? "rotate-180" : ""}`} variant="BoldDuotone" />
                      </button>
                    </div>

                    {/* Dropdown list */}
                    {showAssetDropdown && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0d0d0d] border border-[#facc15]/20 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                        {isLoadingAssets ? (
                          <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-500">
                            <Icon name="Restart" size={12} className="animate-spin" variant="BoldDuotone" />
                            Loading assets from exchange…
                          </div>
                        ) : filteredAssets.length > 0 ? (
                          filteredAssets.map((asset) => (
                            <button
                              key={asset}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSymbol(asset);
                                setAssetSearch(asset);
                                setShowAssetDropdown(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm font-mono font-bold transition-colors hover:bg-[#facc15]/10 ${
                                symbol === asset ? "text-[#facc15] bg-[#facc15]/5" : "text-slate-300"
                              }`}
                            >
                              {asset}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-xs text-slate-500 italic">
                            No assets match &quot;{assetSearch}&quot;
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="w-full bg-[#0d0d0d]/50 border border-white/5 rounded-xl px-3 py-3 text-slate-500 text-sm italic border-dashed">
                    Auto-Selected by Strategy
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block">
                Max Rounds
              </label>
              <select
                value={rounds}
                onChange={(e) => setRounds(parseInt(e.target.value))}
                className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#facc15] font-medium"
              >
                {[2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} Rounds (Deep Analysis)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Section 2: Participants */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-500">
                AI Panel ({participants.length})
              </label>
              <button
                onClick={addParticipant}
                disabled={participants.length >= 6}
                className="flex items-center gap-1.5 text-[10px] font-black text-[#facc15] hover:text-white disabled:opacity-50 px-3 py-1.5 bg-[#facc15]/10 rounded border border-[#facc15]/20 transition-all uppercase tracking-widest"
              >
                <Icon name="Plus" size={12} variant="BoldDuotone" /> Add Agent
              </button>
            </div>

            <div className="space-y-2">
              {participants.map((p: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-[#0a0a0a] p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors group"
                >
                  {/* Personality Select - NoFx Order: Role first */}
                  <div className="flex-[1.2]">
                    <div className="text-[9px] text-slate-500 font-black mb-1 opacity-60">Role</div>
                    <select
                      value={p.personality}
                      onChange={(e) =>
                        updateParticipant(idx, "personality", e.target.value as any)
                      }
                      className="w-full bg-transparent text-xs font-bold outline-none cursor-pointer"
                      style={{ color: (PERSONALITY_COLORS as any)[p.personality] }}
                    >
                      {PERSONALITIES.map((pers) => (
                        <option key={pers.value} value={pers.value} className="bg-[#0a0a0a] text-white">
                          {pers.emoji} {pers.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-px h-8 bg-white/10" />

                  {/* Model Select */}
                  <div className="flex-[1.5]">
                    <div className="text-[9px] text-slate-500 font-black mb-1 opacity-60">AI Model</div>
                    <select
                      value={p.aiModelId}
                      onChange={(e) =>
                        updateParticipant(idx, "aiModelId", e.target.value)
                      }
                      className="w-full bg-transparent text-xs text-white font-black outline-none cursor-pointer"
                    >
                      <optgroup label="CLOUD AGENTS (FAST)" className="bg-[#0a0a0a] text-slate-500 text-[10px]">
                        {AI_MODELS.cloud.map((m: any) => (
                          <option key={m.id} value={m.id} className="bg-[#0a0a0a] text-white">
                            {m.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="LOCAL AGENTS (OFFLINE)" className="bg-[#0a0a0a] text-slate-500 text-[10px]">
                        {AI_MODELS.local.map((m: any) => (
                          <option key={m.id} value={m.id} className="bg-[#0a0a0a] text-white">
                            {m.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeParticipant(idx)}
                    disabled={participants.length <= 2}
                    className="p-2 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-0"
                  >
                    <Icon name="Close" size={16} variant="BoldDuotone" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-[#050505] flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-black tracking-widest transition-all uppercase border border-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name || participants.length < 2 || isSubmitting}
            className="flex-1 py-2.5 rounded-lg bg-[#facc15] hover:bg-[#eab308] text-black text-xs font-black tracking-[0.2em] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(250,204,21,0.15)] uppercase"
          >
            {isSubmitting ? (
              <Icon name="Restart" size={16} className="animate-spin" variant="BoldDuotone" />
            ) : (
              "Initialize Consensus"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
