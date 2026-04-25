import React, { useState, useEffect } from "react";
import { Icon } from "./ui/Icon";
import { apiUrl } from "../config/api";
import { settingsService } from "../services/settingsService";
import { getThemeColors } from "../config/themeColors";

interface Goal {
  id: string;
  description: string;
  type: "ONCE" | "RECURRING";
  schedule: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "PAUSED";
  parentGoalId: string | null;
  priority: number;
  createdAt: number;
  updatedAt: number;
  lastRun: number | null;
  nextRun: number | null;
  metadata: any;
  logs: { timestamp: number; message: string }[];
}

export const AutonomyDashboard: React.FC<{
  onClose: () => void;
  theme?: any;
}> = ({ onClose, theme: propTheme }) => {
  // Theme Integration
  const currentPersona =
    settingsService.getSettings().general.persona || "ASSISTANT";
  const theme = propTheme || getThemeColors(currentPersona);
  const themeHex = theme.hex || "#3b82f6";
  const themeBorder = theme.border || "border-white/20";
  const themePrimary = theme.primary || "text-white";

  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalDesc, setNewGoalDesc] = useState("");
  const [newGoalSchedule, setNewGoalSchedule] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  const fetchGoals = async () => {
    try {
      const res = await fetch(apiUrl("/api/goals/list"));
      const data = await res.json();
      setGoals(data);
    } catch (e) {
      console.error("Failed to fetch goals", e);
    }
  };

  useEffect(() => {
    fetchGoals();
    const interval = setInterval(fetchGoals, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const addGoal = async () => {
    if (!newGoalDesc) return;
    setLoading(true);
    try {
      await fetch(apiUrl("/api/goals/add"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: newGoalDesc,
          type: newGoalSchedule ? "RECURRING" : "ONCE",
          schedule: newGoalSchedule || null,
        }),
      });
      setNewGoalDesc("");
      setNewGoalSchedule("");
      fetchGoals();
    } catch (e) {
      console.error("Failed to add goal", e);
    }
    setLoading(false);
  };

  const deleteGoal = async (id: string) => {
    try {
      await fetch(apiUrl("/api/goals/delete"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchGoals();
    } catch (e) {
      console.error("Failed to delete goal", e);
    }
  };

  const executeGoal = async (id: string) => {
    try {
      await fetch(apiUrl(`/api/goals/${id}/execute`), { method: "POST" });
      fetchGoals();
    } catch (e) {
      console.error("Failed to execute goal", e);
    }
  };

  const pauseGoal = async (id: string) => {
    try {
      await fetch(apiUrl(`/api/goals/${id}/pause`), { method: "POST" });
      fetchGoals();
    } catch (e) {
      console.error("Failed to pause goal", e);
    }
  };

  const resumeGoal = async (id: string) => {
    try {
      await fetch(apiUrl(`/api/goals/${id}/resume`), { method: "POST" });
      fetchGoals();
    } catch (e) {
      console.error("Failed to resume goal", e);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedGoals(newExpanded);
  };

  const getSubGoals = (parentId: string) => {
    return goals.filter((g) => g.parentGoalId === parentId);
  };

  const getTopLevelGoals = () => {
    return goals.filter((g) => !g.parentGoalId);
  };

  return (
    <div className="fixed inset-0 bg-black/90 glass-blur z-[200] flex items-center justify-center p-4 font-mono animate-in fade-in duration-300">
      <div
        className={`relative w-full max-w-5xl h-[85vh] bg-[#050505]/60 glass-blur border rounded-2xl shadow-2xl overflow-hidden flex flex-col ${themeBorder}`}
        style={{
          boxShadow: `0 0 100px -20px ${themeHex}44`,
          borderColor: `${themeHex}33`,
        }}
      >
        {/* Background Visuals */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none -z-10"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${themeHex}20, transparent 70%)`,
          }}
        />
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10"
          style={{ backgroundImage: `linear-gradient(${themeHex} 1px, transparent 1px), linear-gradient(90deg, ${themeHex} 1px, transparent 1px)`, backgroundSize: '40px 40px' }}
        ></div>
        {/* Header */}
        <div
          className="h-16 flex-shrink-0 border-b flex items-center justify-between px-8 relative z-30"
          style={{ 
            borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
            backgroundColor: "rgba(255,255,255,0.02)"
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className={`p-2 rounded-xl border flex-shrink-0 bg-black/40 ${themePrimary}`}
              style={{ borderColor: `${themeHex}22` }}
            >
              <Icon name="Activity" size={24} variant="BoldDuotone" className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-[0.3em] uppercase italic text-white">
                Autonomy Control Matrix
              </h2>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Sovereign Expert // Cognitive Layer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-white/5 active:scale-95 text-white/40 hover:text-white"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar: New Goal Injection */}
          <div className="w-80 border-r border-white/5 p-8 space-y-10 bg-black/20 flex flex-col overflow-hidden">
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30">System Stats</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></div>
               </div>
               <div className="grid grid-cols-1 gap-4">
                  <div className="bg-white/[0.03] border border-white/5 p-4 rounded-xl">
                      <div className="text-[9px] font-black text-white/40 uppercase tracking-tighter mb-1">Active Threads</div>
                      <div className="text-xl font-black text-white italic">
                         {goals.filter((g) => g.status !== "COMPLETED").length} <span className="text-xs text-white/20">NODES</span>
                      </div>
                  </div>
               </div>
            </div>

            <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
              <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${themePrimary}`}>
                Inject Directive
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                   <label className="text-[8px] font-black text-white/20 uppercase">Core Description</label>
                   <textarea
                     value={newGoalDesc}
                     onChange={(e) => setNewGoalDesc(e.target.value)}
                     placeholder="Define system objective..."
                     className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-all h-24 resize-none"
                   />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[8px] font-black text-white/20 uppercase">Temporal Schedule</label>
                   <input
                     type="text"
                     value={newGoalSchedule}
                     onChange={(e) => setNewGoalSchedule(e.target.value)}
                     placeholder="CRON or recurring string..."
                     className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-all"
                   />
                </div>
                <button
                  onClick={addGoal}
                  disabled={loading || !newGoalDesc}
                  className={`w-full py-3 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase flex items-center justify-center gap-3 transition-all border ${
                    loading || !newGoalDesc 
                      ? "opacity-20 grayscale" 
                      : `hover:bg-white/5`
                  }`}
                  style={{ borderColor: `${themeHex}44`, color: themeHex }}
                >
                  <Icon name="PlusCircle" size={16} variant="BoldDuotone" />
                  Commit Directive
                </button>
              </div>
            </div>
          </div>

          {/* Main Directives List */}
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
            <div className="flex justify-between items-center mb-8">
               <div className="flex items-center gap-3">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50">Active Directives Matrix</h3>
                  <span className="text-[10px] font-mono text-white/20">({getTopLevelGoals().length} PRIMARY)</span>
               </div>
               <button 
                onClick={fetchGoals}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
               >
                  <Icon name="RefreshCw" size={14} className={loading ? "animate-spin" : ""} />
               </button>
            </div>

            <div className="space-y-6">
              {getTopLevelGoals().map((goal) => {
                const subGoals = getSubGoals(goal.id);
                const isExpanded = expandedGoals.has(goal.id);

                return (
                  <div
                    key={goal.id}
                    className={`bg-white/[0.02] border rounded-2xl p-6 transition-all group ${
                        isExpanded ? "border-white/20 bg-white/[0.05]" : "border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        {subGoals.length > 0 && (
                          <button
                            onClick={() => toggleExpanded(goal.id)}
                            className="text-gray-400 hover:text-white"
                          >
                            {isExpanded ? (
                              <Icon name="ChevronDown" className="w-4 h-4" />
                            ) : (
                              <Icon name="ChevronRight" className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <div
                          className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${
                            goal.status === "COMPLETED"
                              ? "bg-green-500"
                              : goal.status === "IN_PROGRESS"
                              ? "bg-amber-500 animate-pulse"
                              : goal.status === "FAILED"
                              ? "bg-red-500"
                              : goal.status === "PAUSED"
                              ? "bg-orange-500"
                              : "bg-white/20"
                          }`}
                        />
                        <span className="font-bold text-white">
                          {goal.description}
                        </span>
                        {subGoals.length > 0 && (
                          <span className="text-xs text-gray-500">
                            ({subGoals.length} sub-goals)
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {goal.status === "PAUSED" ? (
                          <button
                            onClick={() => resumeGoal(goal.id)}
                            className="text-green-500 hover:text-green-400"
                            title="Resume"
                          >
                            <Icon name="Play" className="w-4 h-4" />
                          </button>
                        ) : goal.type === "RECURRING" &&
                          goal.status !== "COMPLETED" ? (
                          <button
                            onClick={() => pauseGoal(goal.id)}
                            className="text-orange-500 hover:text-orange-400"
                            title="Pause"
                          >
                            <Icon name="Pause" className="w-4 h-4" />
                          </button>
                        ) : null}
                        {goal.status === "PENDING" && (
                          <button
                            onClick={() => executeGoal(goal.id)}
                            className="p-1 px-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
                            style={{ color: themeHex, borderColor: `${themeHex}22` }}
                            title="Execute Forcefully"
                          >
                            <Icon name="Play" size={14} />
                            <span className="text-[8px] font-black uppercase">Force</span>
                          </button>
                        )}
                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="text-gray-600 hover:text-red-400"
                          title="Delete"
                        >
                          <Icon name="Trash2" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                      <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5 text-[9px] font-black tracking-widest text-white/40 uppercase">
                        {goal.type}
                      </span>
                      <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5 text-[9px] font-black tracking-widest text-white/40 uppercase">
                        {goal.status}
                      </span>
                      {goal.schedule && (
                        <span className="flex items-center gap-1">
                          <Icon name="Clock" className="w-3 h-3" /> {goal.schedule}
                        </span>
                      )}
                    </div>

                    {/* Sub-goals Matrix */}
                    {isExpanded && subGoals.length > 0 && (
                      <div className="ml-6 mt-4 space-y-3 border-l border-white/10 pl-6">
                        {subGoals.map((subGoal) => (
                          <div
                            key={subGoal.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                subGoal.status === "COMPLETED"
                                  ? "bg-green-500"
                                  : subGoal.status === "IN_PROGRESS"
                                  ? "bg-yellow-500"
                                  : subGoal.status === "FAILED"
                                  ? "bg-red-500"
                                  : "bg-gray-500"
                              }`}
                            />
                            <span className="text-gray-300">
                              {subGoal.description}
                            </span>
                            <span className="text-xs text-gray-600">
                              ({subGoal.status})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Cognitive Logs */}
                    {goal.logs?.length > 0 && (
                      <div className="mt-4 bg-black/40 rounded-xl border border-white/5 p-4 text-[10px] font-mono text-white/40 max-h-32 overflow-y-auto custom-scrollbar">
                        {goal.logs.slice(-5).map((log, i) => (
                          <div key={i} className="py-1 border-b border-white/[0.02] last:border-0 flex items-start gap-3">
                            <span className="text-white/20 shrink-0">
                              [{new Date(log.timestamp).toLocaleTimeString()}]
                            </span>
                            <span className="italic">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {goals.length === 0 && (
                <div className="text-center py-12 text-gray-600">
                  <Icon name="Terminal" className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No active directives found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
