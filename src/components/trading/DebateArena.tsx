import React, { useState, useEffect, useRef, useCallback } from "react";
import * as LucideIcons from "lucide-react";
const {
  Brain,
  Zap,
  Share2,
  AlertCircle,
  X,
  List,
} = LucideIcons as any;
import {
  DebateSession,
  DebateMessage,
  DebateVote,
  DebateConsensus,
  DebatePersonality,
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
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function DebateArena({ theme }: DebateArenaProps) {
  // State
  const [sessions, setSessions] = useState<DebateSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [traders] = useState<TraderInfo[]>([]);
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

  const selectedSession = sessions.find((s) => (s.id || (s as any).hash) === selectedId);

  // Initial Load
  useEffect(() => {
    loadSessions();
    
    // Listen for NEW research hits to add them to the sidebar list (Phase 5 Sync)
    const handleGlobalResearch = (data: any) => {
      setSessions(prev => {
        if (prev.some(s => s.id === data.symbol)) return prev;
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
          consensus: [{
            symbol: data.symbol,
            action: data.debate.action,
            confidence: data.debate.confidence,
            leverage: 1,
            positionPct: 1,
            stopLoss: 0,
            takeProfit: 0,
            voteCount: 1,
            totalVotes: 1,
            hasConsensus: true
          }],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        return [newSession, ...prev];
      });
    };

    eventBus.on("TRADE_RESEARCH_HIT", handleGlobalResearch);
    return () => {
      eventBus.off("TRADE_RESEARCH_HIT", handleGlobalResearch);
    };
  }, []);

  const loadSessions = async () => {
    try {
      const data = await tradingService.getDebates();
      setSessions(data as any);
      if (data.length > 0 && !selectedId) {
        setSelectedId((data[0] as any).id || (data[0] as any).hash);
      }
    } catch (e) {
      console.error("Failed to load debates", e);
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
        }
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
        prev.map((s) => (s.id === event.session.id ? event.session : s))
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
        alert("Failed to start debate: " + ((result as any).error || "Unknown error"));
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
    <div className="h-full flex bg-[#0a0c10] text-slate-200 font-sans overflow-hidden">
      {/* 1. LEFT SIDEBAR */}
      <div
        className={`fixed inset-0 z-[60] lg:relative lg:inset-auto lg:z-0 lg:flex ${
          showSidebar ? "flex" : "hidden"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm lg:hidden"
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
          />
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex min-w-0">
        {/* CENTER: CHAT STREAM */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800/60">
          {/* Header */}
          {selectedSession ? (
            <div className="h-14 border-b border-slate-800/60 bg-[#0d1017]/80 backdrop-blur flex items-center justify-between px-3 sm:px-4 flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                <button
                  onClick={() => setShowSidebar(true)}
                  className="p-1.5 lg:hidden text-slate-400 hover:text-white"
                >
                  <List size={20} />
                </button>
                <div className="flex flex-col overflow-hidden">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`w-2 h-2 flex-shrink-0 rounded-full`}
                      style={
                        selectedSession.status === "in_progress"
                          ? {
                              backgroundColor: theme?.hex || "#3b82f6",
                              boxShadow: theme
                                ? `0 0 10px ${theme.hex}`
                                : undefined,
                            }
                          : { backgroundColor: "#64748b" }
                      }
                    />
                    <h2 className="font-bold text-white text-[13px] sm:text-sm truncate">
                      {selectedSession.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <span
                      className="font-bold whitespace-nowrap"
                      style={{ color: theme?.hex || "#F97316" }}
                    >
                      {selectedSession.symbol}
                    </span>
                    <span>•</span>
                    <span>
                      Round {selectedSession.currentRound}/
                      {selectedSession.maxRounds}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setShowVotes(!showVotes)}
                  className="p-2 lg:hidden text-slate-400 hover:text-white"
                >
                  <Zap
                    size={16}
                    style={showVotes ? { color: theme?.hex || "#F97316" } : {}}
                  />
                </button>
                <button className="hidden sm:block p-2 hover:bg-white/5 rounded-full text-slate-400">
                  <Share2 size={16} />
                </button>
                <div className="hidden xs:flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 text-[9px] sm:text-[10px] text-red-500 animate-pulse">
                  <AlertCircle size={10} /> LIVE
                </div>
              </div>
            </div>
          ) : (
            <div className="h-14 border-b border-slate-800/60 flex items-center px-4 text-slate-500 text-sm italic">
              Select or create a debate session...
            </div>
          )}

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#0a0c10] to-[#0d1017]">
            {selectedSession ? (
              <>
                {activeMessages.length === 0 && (
                  <div className="text-center text-slate-600 text-sm py-10 italic">
                    Waiting for agents to join the debate...
                  </div>
                )}

                {activeMessages.map((msg) => (
                  <MessageCard
                    key={msg.id}
                    message={msg}
                    aiModelName={msg.participantId} // Simplify mapping
                    participantName={msg.participantId}
                    participantPersonality={
                      (msg.participantId?.split("_")[0] as DebatePersonality) ||
                      DebatePersonality.ANALYST
                    }
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-4">
                <Brain size={64} className="opacity-20" />
                <p>Select or create a debate to begin analysis</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: VOTES & CONSENSUS */}
        {selectedSession && (
          <div
            className={`${
              showVotes ? "translate-x-0" : "translate-x-full"
            } lg:translate-x-0 fixed right-0 top-0 bottom-0 lg:relative w-full sm:w-[400px] flex flex-col bg-[#0b0e14] border-l border-white/5 shadow-2xl z-50 lg:z-10 transition-transform duration-300`}
          >
            {/* Mobile Close */}
            <div className="lg:hidden flex justify-between items-center p-4 border-b border-slate-800">
              <span className="font-bold text-slate-300">
                VOTES & CONSENSUS
              </span>
              <button
                onClick={() => setShowVotes(false)}
                className="p-2 text-slate-500"
              >
                <X size={20} />
              </button>
            </div>
            {/* Votes Header */}
            <div className="h-14 border-b border-slate-800/60 flex items-center px-4 font-bold text-sm text-slate-400 uppercase tracking-wider bg-[#0d1017]">
              Live Votes ({activeVotes.length})
            </div>

            {/* Votes List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeVotes.map((vote) => (
                <VoteCard key={vote.id} vote={vote} />
              ))}
              {activeVotes.length === 0 && (
                <div className="text-center text-slate-600 params-xs mt-10">
                  No votes cast yet.
                </div>
              )}
            </div>

            {/* Sticky Consensus Footer */}
            <ConsensusBar
              consensus={consensus}
              onExecute={handleExecute}
              isExecuting={isExecuting}
              isExecuted={isExecuted}
            />
          </div>
        )}
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
