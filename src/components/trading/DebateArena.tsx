import React, { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "../ui/Icon";

const StrategyBadge = ({ id }: { id: string }) => (
  <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[9px] font-black text-purple-400 tracking-tighter uppercase leading-none">
    {id}
  </span>
);

const RoundBadge = ({ current, max }: { current: number; max: number }) => (
  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono font-bold text-slate-400 leading-none whitespace-nowrap">
    R{current}/{max}
  </span>
);

import { getAgentLogo } from "../../utils/tradingUI";

import {
  DebateSession,
  DebateMessage,
  DebateVote,
  DebateConsensus,
  DebatePersonality,
  TradeAction,
  TraderInfo,
} from "../../types/trading";
import { eventBus } from "../../services/eventBus";
import DebateSidebar from "./debate/DebateSidebar";
import MessageCard from "./debate/MessageCard";
import VoteCard from "./debate/VoteCard";
import ConsensusBar from "./debate/ConsensusBar";
import CreateDebateModal from "./debate/CreateDebateModal";
import { tradingService } from "../../services/tradingService";

interface DebateArenaProps {
  theme?: { hex: string; primary: string; border: string; bg: string; isLight?: boolean };
}

export default function DebateArena({ theme }: DebateArenaProps) {
  const isLight = theme?.isLight;
  const currentThemeHex = theme?.hex || "#0ea5e9";
  // State
  const [sessions, setSessions] = useState<DebateSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [traders, setTraders] = useState<TraderInfo[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Mobile Toggles
  const [showSidebar, setShowSidebar] = useState(false);
  const [showVotes, setShowVotes] = useState(false);

  // Active Session Detail State
  const [activeMessages, setActiveMessages] = useState<DebateMessage[]>([]);
  const [activeVotes, setActiveVotes] = useState<DebateVote[]>([]);
  const [consensus, setConsensus] = useState<DebateConsensus | null>(null);

  const [isExecuting, setIsExecuting] = useState(false);
  const [isExecuted, setIsExecuted] = useState(false);

  // Refs for subscription cleanup
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedSession = sessions.find(
    (s) => (s.id || (s as any).hash) === selectedId,
  );

  // Initial Load
  useEffect(() => {
    loadSessions();

    // Listen for NEW research hits to add them to the sidebar list (Phase 5 Sync)
    const handleGlobalResearch = (data: any) => {
      setSessions((prev) => {
        if (prev.some((s) => s.id === data.symbol)) return prev;
        const newSession: DebateSession = {
          id: data.symbol,
          name: `Research: ${data.symbol}`,
          status: "completed",
          symbol: data.symbol,
          strategyId: "Auto-Research",
          maxRounds: 1,
          currentRound: 1,
          intervalMinutes: 0,
          promptVariant: "balanced",
          autoExecute: false,
          participants: [],
          messages: data.debate.messages || [],
          votes: data.debate.votes || [],
          consensus: [
            {
              symbol: data.symbol,
              action: data.debate.action,
              confidence: data.debate.confidence,
              leverage: 1,
              positionPct: 1,
              stopLoss: 0,
              takeProfit: 0,
              voteCount: 1,
              totalVotes: 1,
              hasConsensus: true,
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return [newSession, ...prev];
      });
    };

    eventBus.on("TRADE_RESEARCH_HIT", handleGlobalResearch);
    return () => {
      eventBus.off("TRADE_RESEARCH_HIT", handleGlobalResearch);
    };
  }, []);

  const loadSampleSession = () => {
    const sampleId = `sample-${Date.now()}`;
    const sample: DebateSession = {
      id: sampleId,
      name: "Momentum Strategy X",
      strategyId: "AI500",
      symbol: "PIPPINUSDT",
      maxRounds: 2,
      currentRound: 2,
      intervalMinutes: 15,
      promptVariant: "aggressive",
      autoExecute: true,
      status: "in_progress",
      participants: [
        {
          id: "p1",
          aiModelId: "claude-3-5-sonnet",
          aiModelName: "Claude AI",
          personality: DebatePersonality.BULL,
          provider: "anthropic",
          color: "#f37322",
          speakOrder: 1,
        },
        {
          id: "p2",
          aiModelId: "deepseek-v3",
          aiModelName: "DeepSeek AI",
          personality: DebatePersonality.BEAR,
          provider: "deepseek",
          color: theme?.hex || "#0ea5e9",
          speakOrder: 2,
        },
      ],
      messages: [],
      votes: [
        {
          id: "v1",
          sessionId: sampleId,
          aiModelId: "claude-3-5-sonnet",
          aiModelName: "Claude AI",
          decisions: [
            {
              symbol: "PIPPINUSDT",
              action: TradeAction.OPEN_LONG,
              confidence: 0.8,
              reasoning: "Positive trend",
            },
          ],
          confidence: 0.8,
          reasoning: "Positive trend",
        },
        {
          id: "v2",
          sessionId: sampleId,
          aiModelId: "deepseek-v3",
          aiModelName: "DeepSeek AI",
          decisions: [
            {
              symbol: "PIPPINUSDT",
              action: TradeAction.OPEN_LONG,
              confidence: 0.9,
              reasoning: "Strong indicators",
            },
          ],
          confidence: 0.9,
          reasoning: "Strong indicators",
        },
      ],
      consensus: [
        {
          symbol: "PIPPINUSDT",
          action: TradeAction.OPEN_LONG,
          confidence: 0.85,
          leverage: 10,
          positionPct: 0.5,
          stopLoss: 0.09,
          takeProfit: 0.12,
          voteCount: 2,
          totalVotes: 2,
          hasConsensus: true,
        },
        {
          symbol: "PIPPINUSDT",
          action: TradeAction.OPEN_LONG,
          confidence: 0.92,
          leverage: 10,
          positionPct: 0.5,
          stopLoss: 0.08,
          takeProfit: 0.15,
          voteCount: 2,
          totalVotes: 2,
          hasConsensus: true,
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => [sample, ...prev]);
    setSelectedId(sample.id);
  };

  const loadSessions = async () => {
    try {
      const [sessionData, traderData] = await Promise.all([
        tradingService.getDebates
          ? tradingService.getDebates()
          : Promise.resolve([]),
        tradingService.getLeaderboard(),
      ]);
      setSessions(sessionData as any);
      setTraders(traderData as any);
      if (sessionData && (sessionData as any).length > 0 && !selectedId) {
        setSelectedId(
          (sessionData[0] as any).id || (sessionData[0] as any).hash,
        );
      }
    } catch (e) {
      console.error("Failed to load debate data", e);
    }
  };

  // Subscription Logic
  useEffect(() => {
    // Cleanup previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Reset view state
    setActiveMessages([]);
    setActiveVotes([]);
    setConsensus(null);
    setIsExecuted(false);

    if (selectedId) {
      // 1. Load initial details (in case we only had summary)
      tradingService.getDebateDetails(selectedId).then((session: any) => {
        if (session) {
          setActiveMessages(session.messages || []);
          setActiveVotes(session.votes || []);
          // Auto-scroll to bottom
          setTimeout(scrollToBottom, 100);
        }
      });

      // 2. Subscribe to real-time events
      unsubscribeRef.current = tradingService.subscribeToDebate(
        selectedId,
        (event) => {
          handleRealtimeEvent(event);
        },
      );
    }

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [selectedId]);

  const handleRealtimeEvent = useCallback((event: any) => {
    // console.log("SSE Event:", event);
    if (event.type === "message") {
      setActiveMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === event.message.id)) return prev;
        const newMsgs = [...prev, event.message];
        setTimeout(scrollToBottom, 100);
        return newMsgs;
      });
    } else if (event.type === "vote") {
      setActiveVotes((prev) => {
        if (prev.some((v) => v.id === event.vote.id)) return prev;
        return [...prev, event.vote];
      });
    } else if (event.type === "update") {
      // Full session update (e.g. status change, consensus)
      setSessions((prev) =>
        prev.map((s) => (s.id === event.session.id ? event.session : s)),
      );
      if (event.session.consensus) {
        setConsensus(event.session.consensus);
      }
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handlers
  const handleCreate = () => {
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (request: any) => {
    try {
      const result = await tradingService.startDebate({
        name: request.name,
        symbol: request.symbol || "BTC/USDT",
        maxRounds: request.maxRounds,
        strategyId: request.strategyId,
        participants: request.participants, // Array of agent IDs
        promptVariant: request.promptVariant,
      });

      if (result.success && (result as any).session) {
        setSessions([(result as any).session, ...sessions]);
        setSelectedId((result as any).session.id);
      } else {
        alert(
          "Failed to start debate: " +
            ((result as any).error || "Unknown error"),
        );
      }
    } catch (e) {
      console.error("Create debate error", e);
    }
  };

  const handleStart = () => {
    // If we were using a manual start trigger not covered by create
    // In this backend implementation, creating usually starts it.
  };

  const handleDelete = (id: string) => {
    // Implement delete if API supports it
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleExecute = async () => {
    if (!selectedId) return;
    setIsExecuting(true);
    try {
      const result = await tradingService.executeDebate(selectedId);
      if (result.success) {
        setIsExecuted(true);
        // Optionally fetch updated session or positions
      } else {
        alert("Execution failed: " + result.error);
      }
    } catch (e: any) {
      alert("Execution error: " + e.message);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div 
      className={`h-full flex ${isLight ? "bg-slate-50 text-slate-900" : "bg-transparent text-slate-200"} font-sans overflow-hidden transition-colors duration-500`}
    >
      {/* 1. LEFT SIDEBAR */}
      <div
        className={`fixed inset-0 z-[60] lg:relative lg:inset-auto lg:z-0 lg:flex ${
          showSidebar ? "flex" : "hidden"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/60 glass-blur lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
        <div className="relative h-full animate-in slide-in-from-left duration-300 lg:animate-none">
          <DebateSidebar
            sessions={sessions}
            traders={traders}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setShowSidebar(false);
            }}
            onCreate={handleCreate}
            onStart={handleStart}
            onDelete={handleDelete}
            theme={theme}
          />
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA (CENTER + RIGHT + FOOTER) */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex min-w-0 overflow-hidden">
          {/* CENTER: CHAT STREAM */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-white/5">
            {/* Header: High-Density HUD */}
            <div 
              className={`h-12 border-b border-white/5 flex items-center justify-between px-3 sm:px-4 flex-shrink-0 ${isLight ? "bg-slate-50/50" : "bg-white/[0.02]"}`}
            >
              {selectedSession ? (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => setShowSidebar(true)}
                      className="p-1 lg:hidden text-slate-400 hover:text-white transition-colors"
                    >
                      <Icon name="Menu" size={18} variant="BoldDuotone" />
                    </button>

                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                          style={
                            selectedSession.status === "in_progress"
                              ? { backgroundColor: theme?.hex || "#0ea5e9" }
                              : { backgroundColor: "#475569" }
                          }
                        />
                        <div className="flex items-baseline gap-2">
                          <div className="flex gap-1 items-center">
                            {selectedSession.participants?.map((p) => {
                              const logo = getAgentLogo(p.aiModelId);
                              return (
                                <div
                                  key={p.id}
                                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-black/40 border transition-all ${logo.border}`}
                                >
                                  {logo.icon ? (
                                    <img
                                      src={logo.icon}
                                      className="w-2.5 h-2.5 object-contain"
                                      alt={logo.letter}
                                    />
                                  ) : (
                                    <span
                                      className={`${logo.color} font-black text-[10px] tabular-nums tracking-tighter`}
                                    >
                                      {logo.letter}
                                    </span>
                                  )}
                                  <Icon
                                    name="TrendingUp"
                                    size={8}
                                    className={`${logo.color} opacity-70`}
                                    variant="BoldDuotone"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <span className="text-white text-[13px] font-black tracking-tighter whitespace-nowrap">
                            {selectedSession.strategyId}
                          </span>
                          <span className="text-yellow-500/90 text-xs font-bold tracking-tight whitespace-nowrap">
                            {selectedSession.symbol}
                          </span>
                        </div>
                      </div>

                      <div className="hidden sm:flex items-center gap-1.5 border-l border-white/10 pl-3">
                        <StrategyBadge id={selectedSession.strategyId} />
                        <RoundBadge
                          current={selectedSession.currentRound}
                          max={selectedSession.maxRounds}
                        />
                      </div>

                      {/* Agent Logos (C/D/O) chips */}
                      {activeVotes?.length > 0 && (
                        <div className="hidden md:flex items-center gap-1 border-l border-white/10 pl-3">
                          {Array.from(
                            new Set(activeVotes?.map((v) => v.aiModelId) || []),
                          )
                            .slice(0, 3)
                            .map((modelId) => {
                              const latestVote = [...(activeVotes || [])]
                                .reverse()
                                .find((v) => v.aiModelId === modelId);
                              const action =
                                latestVote?.decisions?.[0]?.action || "";
                              const logo = getAgentLogo(modelId);
                              return (
                                <div
                                  key={modelId}
                                  className={`flex items-center gap-0.5 px-0.5 min-w-[1.5rem] justify-center py-0.5 rounded border border-white/5 text-[9px] font-black ${logo.bg} ${logo.color}`}
                                  title={`${modelId}: ${action}`}
                                >
                                  {logo.icon ? (
                                    <img
                                      src={logo.icon}
                                      alt={logo.letter}
                                      className="w-2.5 h-2.5 object-contain"
                                    />
                                  ) : (
                                    <span>{logo.letter}</span>
                                  )}
                                  <Icon
                                    name="TrendingUp"
                                    size={8}
                                    className={
                                      action.includes("SHORT")
                                        ? "rotate-180 ml-0.5"
                                        : "ml-0.5"
                                    }
                                    variant="BoldDuotone"
                                  />
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-3">
                    {/* Directional Voting Summary Badge */}
                    {activeVotes.length > 0 && (
                      <div
                        className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded border font-black text-[9px] tracking-widest leading-none ${
                          activeVotes[0]?.decisions?.[0]?.action.includes(
                            "LONG",
                          )
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                            : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                        }`}
                      >
                        <Icon
                          name="TrendingUp"
                          size={10}
                          className={
                            activeVotes[0]?.decisions?.[0]?.action.includes(
                              "SHORT",
                            )
                              ? "rotate-180"
                              : ""
                          }
                          variant="BoldDuotone"
                        />
                        <span>
                          {activeVotes[0]?.decisions?.[0]?.action.includes(
                            "SHORT",
                          )
                            ? "SHORT"
                            : "LONG"}
                          ×{activeVotes.length}
                        </span>
                      </div>
                    )}

                    {/* Removed LIVE badge for NoFx parity */}

                    <button
                      onClick={() => setShowVotes(!showVotes)}
                      className="p-1.5 lg:hidden text-slate-400 hover:text-white transition-colors"
                    >
                      <Icon
                        name="MagicStick"
                        size={14}
                        style={
                          showVotes ? { color: theme?.hex || "#F97316" } : {}
                        }
                        variant="BoldDuotone"
                      />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="text-[10px] text-slate-500 font-bold tracking-[0.2em] italic">
                    Select or create a debate session to begin analysis...
                  </div>
                  <button
                    onClick={loadSampleSession}
                    className={`px-2 py-0.5 rounded border ${isLight ? "border-slate-200 hover:bg-slate-50 text-slate-400" : "border-white/10 hover:bg-white/5 text-slate-400"} text-[9px] font-bold hover:text-white transition-all tracking-tighter`}
                  >
                    Try sample data
                  </button>
                </div>
              )}
            </div>

            {/* Messages List */}
            <div 
              className={`flex-1 overflow-y-auto p-4 space-y-4 ${isLight ? "bg-white" : ""}`}
            >
              {selectedSession ? (
                <>
                  {activeMessages.length === 0 && (
                    <div className={`text-center ${isLight ? "text-slate-400" : "text-slate-600"} text-sm py-10 italic font-mono tracking-widest text-[10px] opacity-40`}>
                      Syncing agent channels...
                    </div>
                  )}

                  {activeMessages?.map((msg) => (
                    <MessageCard key={msg.id} message={msg} />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-700 gap-6">
                  <div className="flex flex-col items-center gap-6 opacity-30">
                    <img
                      src="/icon.png"
                      alt="LUCA"
                      className="w-16 h-16 object-contain filter grayscale invert opacity-50 animate-pulse"
                    />
                    <p className={`text-[10px] font-mono tracking-[0.5em] font-black ${isLight ? "text-slate-400" : "text-slate-700"}`}>
                      Core debate stream offline
                    </p>
                  </div>
                  <button
                    onClick={loadSampleSession}
                    className={`mt-4 px-6 py-2 rounded-full border ${isLight ? "border-slate-200 hover:bg-slate-50 text-slate-400" : "border-white/5 hover:bg-white/5 text-slate-500"} hover:text-white transition-all tracking-[0.3em] font-black text-[10px]`}
                  >
                    Generate sample HUD session
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: VOTES (Fixed Width) */}
          <div
            className={`${
              showVotes ? "translate-x-0" : "translate-x-full"
            } lg:translate-x-0 fixed right-0 top-0 bottom-0 lg:relative w-full sm:w-[320px] 2xl:w-[400px] flex flex-col border-l border-white/5 shadow-2xl z-50 lg:z-10 transition-all duration-300 ${isLight ? "bg-white" : "bg-white/[0.01]"}`}
          >
            {/* Mobile Close */}
            <div className="lg:hidden flex justify-between items-center p-4 border-b border-white/5">
              <span className={`font-black ${isLight ? "text-slate-400" : "text-slate-300"} text-[10px] tracking-widest`}>
                Final votes
              </span>
              <button
                onClick={() => setShowVotes(false)}
                className="p-2 text-slate-500 hover:text-white"
              >
                <Icon name="Close" size={20} variant="BoldDuotone" />
              </button>
            </div>

            {/* Votes Header */}
            <div 
              className={`h-12 border-b border-white/5 flex items-center justify-between px-4 font-black text-[10px] ${isLight ? "text-slate-400" : "text-slate-50"} tracking-[0.15em] ${isLight ? "bg-slate-50" : "bg-white/[0.02]"}`}
            >
              <span>Final votes</span>
              <span className={`px-1.5 py-0.5 rounded tabular-nums border ${isLight ? "bg-white border-slate-200 text-slate-600" : "bg-white/5 border-white/5 text-white"}`}>
                {activeVotes.length}
              </span>
            </div>

            {/* Votes List */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar ${isLight ? "bg-white" : "bg-transparent"}`}>
              {selectedSession ? (
                <>
                  {activeVotes?.map((vote) => (
                    <VoteCard key={vote.id} vote={vote} />
                  ))}
                  {activeVotes.length === 0 && (
                    <div className={`text-center ${isLight ? "text-slate-400" : "text-slate-600"} text-[10px] font-mono mt-10 tracking-widest opacity-50`}>
                      Awaiting agent responses...
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-700 gap-3 opacity-30">
                  <Icon name="MagicStick" size={32} className="stroke-[1]" variant="BoldDuotone" />
                  <p className="text-[10px] font-mono tracking-widest">
                    Polling disabled
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM: GLOBAL CONSENSUS FOOTER */}
        <div className="flex-shrink-0 border-t border-white/5">
          <ConsensusBar
            consensus={consensus}
            onExecute={handleExecute}
            isExecuting={isExecuting}
            isExecuted={isExecuted}
          />
        </div>
      </div>

      {showCreateModal && (
        <CreateDebateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateSubmit}
        />
      )}
    </div>
  );
}
