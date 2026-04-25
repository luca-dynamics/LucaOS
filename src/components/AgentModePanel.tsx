/**
 * Agent Mode Panel - Premium Glassmorphic UI
 *
 * PHASE 3: UI Component with Luca's glassmorphic aesthetic
 * Matches: SkillsMatrix, SecurityHUD, SubsystemDashboard
 */

import React, { useState, useEffect } from "react";
import { Icon } from "./ui/Icon";
import type { AgentTask, AgentEvent } from "../services/agent/types";
import { agentService } from "../services/agent/AgentService";

interface Props {
  task?: AgentTask | null;
  onClose: () => void;
  onPause?: () => void;
  onResume?: () => void;
  theme?: any;
}

const AgentModePanel: React.FC<Props> = ({
  task = null,
  onClose,
  onPause,
  onResume,
  theme,
}) => {
  const themeHex = theme?.hex || "#8b5cf6";
  const [isPaused, setIsPaused] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);

  // Subscribe to agent events
  useEffect(() => {
    const unsubscribe = agentService.on((event) => {
      setEvents((prev) => [...prev.slice(-20), event]); // Keep last 20 events

      if (event.type === "paused") setIsPaused(true);
      if (event.type === "resumed") setIsPaused(false);
    });

    return unsubscribe;
  }, []);

  const handlePause = () => {
    agentService.pause();
    onPause?.();
  };

  const handleResume = () => {
    agentService.resume();
    onResume?.();
  };

  const handleStop = () => {
    agentService.emergencyStop();
    onClose();
  };

  const progress = task
    ? Math.round((task.currentStep / task.totalSteps) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 glass-blur" />

      {/* Panel Container - Glassmorphic */}
      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-black/40 glass-blur border"
        style={{
          borderColor: `${themeHex}40`,
          boxShadow: `0 0 40px ${themeHex}40, inset 0 0 60px ${themeHex}10`,
        }}
      >
        {/* Liquid Glass Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Center Gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${themeHex}25, transparent 60%)`,
              opacity: 0.4,
            }}
          />
          {/* Top Right Gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 80% 20%, ${themeHex}15, transparent 50%)`,
              opacity: 0.3,
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div
            className="flex items-center justify-between p-6 border-b"
            style={{ borderColor: `${themeHex}30` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${themeHex}30, ${themeHex}10)`,
                  boxShadow: `0 0 20px ${themeHex}30`,
                }}
              >
                <Icon name="Astrology" size={24} color={themeHex} />
              </div>
              <div>
                <h2
                  className="text-base font-black flex items-center gap-2 tracking-[0.2em]"
                  style={{ color: theme?.primary || themeHex }}
                >
                  <Icon name="Astrology" size={20} /> AGENT MODE
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {task?.status === "executing"
                    ? "ACTIVE"
                    : task?.status === "complete"
                    ? "COMPLETE"
                    : "IDLE"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 transition-all"
              style={{
                color: theme?.primary || themeHex,
              }}
            >
              <Icon name="CloseCircle" size={20} />
            </button>
          </div>

          {/* Main Content */}
          <div className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
            {task ? (
              <>
                {/* Goal */}
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                    Current Goal
                  </div>
                  <div
                    className="p-4 rounded-xl border"
                    style={{
                      background: `${themeHex}10`,
                      borderColor: `${themeHex}30`,
                    }}
                  >
                    <p className="text-white font-medium">{task.goal}</p>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs text-gray-400 uppercase tracking-wider">
                      Progress
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span style={{ color: themeHex }} className="font-mono">
                        {task.currentStep}/{task.totalSteps} Steps
                      </span>
                      <span className="text-gray-500">•</span>
                      <span style={{ color: themeHex }} className="font-mono">
                        {progress}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div
                    className="h-3 rounded-full overflow-hidden border"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      borderColor: `${themeHex}30`,
                    }}
                  >
                    <div
                      className="h-full transition-all duration-500 relative"
                      style={{
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${themeHex}, ${themeHex}CC)`,
                        boxShadow: `0 0 20px ${themeHex}80`,
                      }}
                    >
                      {/* Shimmer Effect */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${themeHex}40, transparent)`,
                          animation: "shimmer 2s infinite",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Iterations */}
                  <div
                    className="p-3 rounded-xl border"
                    style={{
                      background: `${themeHex}05`,
                      borderColor: `${themeHex}20`,
                    }}
                  >
                    <Icon name="Flash" size={16} color={themeHex} className="mb-2" />
                    <div className="text-xs text-gray-400">Iterations</div>
                    <div className="text-white font-mono text-base font-bold">
                      {task.currentStep}
                      <span className="text-gray-500 text-[10px]">
                        /{task.limits.maxIterations}
                      </span>
                    </div>
                  </div>

                  {/* Duration */}
                  <div
                    className="p-3 rounded-xl border"
                    style={{
                      background: `${themeHex}05`,
                      borderColor: `${themeHex}20`,
                    }}
                  >
                    <Icon
                      name="ClockCircle"
                      size={16}
                      color={themeHex}
                      className="mb-2"
                    />
                    <div className="text-xs text-gray-400">Duration</div>
                    <div className="text-white font-mono text-base font-bold">
                      {Math.round((Date.now() - task.createdAt) / 1000)}s
                    </div>
                  </div>

                  {/* Cost */}
                  <div
                    className="p-3 rounded-xl border"
                    style={{
                      background: `${themeHex}05`,
                      borderColor: `${themeHex}20`,
                    }}
                  >
                    <Icon
                      name="ChartUp"
                      size={16}
                      color={themeHex}
                      className="mb-2"
                    />
                    <div className="text-xs text-gray-400">Est. Cost</div>
                    <div className="text-white font-mono text-base font-bold">$0.00</div>
                  </div>
                </div>

                {/* Event Log */}
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">
                    Activity Log
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {events.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No events yet
                      </div>
                    ) : (
                      events.reverse().map((event, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 rounded-xl border"
                          style={{
                            background: `${themeHex}05`,
                            borderColor: `${themeHex}15`,
                          }}
                        >
                          {event.type === "started" && (
                            <Icon name="Play" size={16} color={themeHex} />
                          )}
                          {event.type === "step-completed" && (
                            <Icon name="CheckCircle" size={16} color="#10b981" />
                          )}
                          {event.type === "step-failed" && (
                            <Icon name="DangerCircle" size={16} color="#ef4444" />
                          )}
                          {event.type === "paused" && (
                            <Icon name="Pause" size={16} color="#f59e0b" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm text-white capitalize">
                              {event.type.replace("-", " ")}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">
                              {new Date().toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Icon
                  name="Astrology"
                  size={64}
                  color={themeHex}
                  style={{ opacity: 0.5 }}
                  className="mx-auto mb-4"
                />
                <p className="text-gray-400">No active agent task</p>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div
            className="flex items-center justify-between p-6 border-t"
            style={{ borderColor: `${themeHex}30` }}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  agentService.isRunning ? "animate-pulse" : ""
                }`}
                style={{
                  background: agentService.isRunning ? "#10b981" : "#6b7280",
                  boxShadow: agentService.isRunning
                    ? "0 0 10px #10b98180"
                    : "none",
                }}
              />
              <span className="text-xs text-gray-400">
                {agentService.isRunning ? "Running" : "Idle"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {!isPaused ? (
                <button
                  onClick={handlePause}
                  className="px-6 py-2.5 rounded-xl font-medium transition-all border"
                  style={{
                    background: `${themeHex}20`,
                    borderColor: `${themeHex}40`,
                    color: themeHex,
                  }}
                  disabled={!agentService.isRunning}
                >
                  <Icon name="Pause" size={16} className="inline mr-2" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className="px-6 py-2.5 rounded-xl font-medium transition-all border"
                  style={{
                    background: `${themeHex}20`,
                    borderColor: `${themeHex}40`,
                    color: themeHex,
                  }}
                >
                  <Icon name="Play" size={16} className="inline mr-2" />
                  Resume
                </button>
              )}

              <button
                onClick={handleStop}
                className="px-6 py-2.5 rounded-xl font-medium transition-all border hover:bg-red-500/20"
                style={{
                  background: "#ef444420",
                  borderColor: "#ef444440",
                  color: "#ef4444",
                }}
              >
                <Icon name="Stop" size={16} className="inline mr-2" />
                Stop
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Shimmer Animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default AgentModePanel;
