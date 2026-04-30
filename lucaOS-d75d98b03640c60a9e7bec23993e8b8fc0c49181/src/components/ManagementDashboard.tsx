import React, { useEffect, useState } from "react";
import { TaskStatus, Goal } from "../types";
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  Briefcase,
  Target,
  X,
  Brain,
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { setHexAlpha } from "../config/themeColors";
import { memoryService } from "../services/memoryService";

interface Props {
  onDeleteGoal?: (goalId: string) => void;
  theme?: {
    hex: string;
    primary: string;
    border: string;
    bg: string;
    themeName?: string;
  };
}

const ManagementDashboard: React.FC<Props> = ({ onDeleteGoal, theme }) => {
  const { management } = useAppContext();
  const { tasks, events, goals } = management;
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [currentTime]);

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return "text-green-500";
      case TaskStatus.IN_PROGRESS:
        // Use theme primary if available, otherwise fallback
        return theme?.primary || "text-sci-cyan";
      case TaskStatus.BLOCKED:
        return "text-red-500";
      default:
        return "text-slate-500";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-500 text-white animate-pulse";
      case "HIGH":
        return "bg-orange-500 text-white";
      case "MEDIUM":
        return "bg-yellow-500 text-black";
      default:
        return "bg-slate-700 text-slate-300";
    }
  };

  const getGoalStatusColor = (status: Goal["status"]) => {
    switch (status) {
      case "COMPLETED":
        return "text-green-500";
      case "IN_PROGRESS":
        return "text-cyan-500 animate-pulse";
      case "FAILED":
        return "text-red-500";
      case "SCHEDULED":
        return theme ? theme.primary : "text-purple-500";
      default:
        return "text-slate-500";
    }
  };

  const formatSchedule = (
    schedule: string | null,
    scheduledAt: number | null,
  ) => {
    if (!schedule && !scheduledAt) return "Immediate";

    if (scheduledAt) {
      const now = Date.now();
      const scheduled = new Date(scheduledAt);
      if (scheduledAt > now) {
        return `Scheduled: ${scheduled.toLocaleString()}`;
      } else {
        return `Due: ${scheduled.toLocaleString()}`;
      }
    }

    // Format schedule string
    if (schedule?.startsWith("EVERY_")) {
      return `Repeats: ${schedule
        .replace("EVERY_", "")
        .toLowerCase()
        .replace("_", " ")}`;
    }

    return schedule || "One-time";
  };

  return (
    <div className="h-full flex flex-col gap-3">
      <div
        className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2"
        style={{ color: theme?.hex || "#818cf8" }}
      >
        <Briefcase size={16} />
        <h2 className="font-display font-bold tracking-widest text-xs">
          MANAGEMENT CONSOLE
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Calendar Section */}
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mb-2 tracking-wider">
            <Calendar size={12} /> UPCOMING SCHEDULE
          </div>
          {events.length === 0 ? (
            <div className="text-xs text-slate-600 italic pl-4">
              No events scheduled.
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`flex items-center gap-2 p-1.5 rounded border ${theme?.themeName?.toLowerCase() === "lucagent" ? "border-black/5" : "border-slate-800/50"}`}
                >
                  <div
                    className={`flex flex-col items-center justify-center w-10 h-10 ${theme?.themeName?.toLowerCase() === "lucagent" ? "bg-white/60" : "bg-slate-900"} rounded text-[10px] font-mono border ${theme?.themeName?.toLowerCase() === "lucagent" ? "border-black/10" : "border-slate-700"}`}
                  >
                    <span style={{ color: theme?.hex || "#06b6d4" }}>
                      {new Date(event.startTime).getDate()}
                    </span>
                    <span className="text-slate-500">
                      {new Date(event.startTime).toLocaleString("default", {
                        month: "short",
                      })}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      {event.title}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(event.startTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      - {event.type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks Section */}
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mb-2 tracking-wider">
            <CheckCircle2 size={12} /> ACTIVE TASKS
          </div>
          {tasks.length === 0 ? (
            <div className="text-xs text-slate-600 italic pl-4">
              Task queue empty.
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`border-l-2 pl-2.5 py-1.5 relative group transition-all`}
                  style={
                    task.status === TaskStatus.COMPLETED
                      ? { opacity: 0.5, borderLeftColor: "#22C55E" }
                      : {
                          borderLeftColor: theme?.hex || "#6366f1",
                          backgroundColor: theme
                            ? setHexAlpha(theme.hex, 0.1)
                            : "rgba(99,102,241,0.1)",
                        }
                  }
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`text-xs font-bold ${
                        task.status === TaskStatus.COMPLETED
                          ? "line-through text-slate-500"
                          : theme?.themeName?.toLowerCase() === "lucagent"
                            ? "text-gray-900"
                            : "text-white"
                      }`}
                    >
                      {task.title}
                    </span>
                    <span
                      className={`text-[8px] px-1 rounded font-bold uppercase ${getPriorityColor(
                        task.priority,
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </div>
                  {task.description && (
                    <div className="text-[10px] text-slate-400 mb-1 truncate">
                      {task.description}
                    </div>
                  )}
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span
                      className={`flex items-center gap-1 ${getStatusColor(
                        task.status,
                      )}`}
                    >
                      {task.status === TaskStatus.COMPLETED ? (
                        <CheckCircle2 size={10} />
                      ) : (
                        <Circle size={10} />
                      )}
                      {task.status}
                    </span>
                    {task.deadline && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock size={10} />
                        {new Date(task.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Autonomous Goals Section */}
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mb-2 tracking-wider">
            <Target size={12} /> AUTONOMOUS GOALS
          </div>
          {goals.length === 0 ? (
            <div className="text-xs text-slate-600 italic pl-4">
              No autonomous goals scheduled.
            </div>
          ) : (
            <div className="space-y-2">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className={`border-l-2 pl-2.5 py-1.5 relative group transition-all`}
                  style={
                    goal.status === "COMPLETED"
                      ? { opacity: 0.5, borderLeftColor: "#22C55E" }
                      : goal.status === "FAILED"
                        ? {
                            borderLeftColor: "#ef4444",
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                          }
                        : {
                            borderLeftColor: theme?.hex || "#a855f7",
                            backgroundColor: theme
                              ? setHexAlpha(theme.hex, 0.1)
                              : "rgba(168, 85, 247, 0.1)",
                          }
                  }
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`text-xs font-bold ${
                        goal.status === "COMPLETED"
                          ? "line-through text-slate-500"
                          : theme?.themeName?.toLowerCase() === "lucagent"
                            ? "text-gray-900"
                            : "text-white"
                      }`}
                    >
                      {goal.description}
                    </span>
                    {onDeleteGoal && (
                      <button
                        onClick={() => onDeleteGoal(goal.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400 p-1"
                        title="Delete goal"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono gap-2">
                    <span
                      className={`flex items-center gap-1 ${getGoalStatusColor(
                        goal.status,
                      )}`}
                    >
                      {goal.status === "COMPLETED" ? (
                        <CheckCircle2 size={10} />
                      ) : goal.status === "IN_PROGRESS" ? (
                        <Circle size={10} className="animate-pulse" />
                      ) : (
                        <Circle size={10} />
                      )}
                      {goal.status}
                    </span>
                    <span className="text-[9px] text-slate-500 flex items-center gap-1">
                      {goal.type === "RECURRING" && <Target size={9} />}
                      {goal.type}
                    </span>
                  </div>
                  <div
                    className="text-[9px] mt-1 flex items-center gap-1"
                    style={{ color: theme?.hex || "#c084fc" }}
                  >
                    <Clock size={9} />
                    {formatSchedule(goal.schedule, goal.scheduledAt)}
                  </div>

                  {/* SUBTASKS: Parallel Workforce Visualization (Phase 8) */}
                  {goal.subtasks && goal.subtasks.length > 0 && (
                    <div className="mt-2 pl-2 border-l border-slate-700/50 space-y-1">
                      {goal.subtasks.map((sub: any) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between text-[8px] font-mono"
                        >
                          <div className="flex items-center gap-1">
                            <span
                              className="px-1 rounded bg-slate-800 text-slate-400"
                              style={
                                sub.status === "in-progress"
                                  ? {
                                      color: theme?.hex || "#818cf8",
                                      borderColor: theme?.hex || "#818cf8",
                                    }
                                  : {}
                              }
                            >
                              {sub.persona}
                            </span>
                            <span className="text-slate-500 truncate max-w-[120px]">
                              {sub.description}
                            </span>
                          </div>
                          <span
                            className={
                              sub.status === "complete"
                                ? "text-green-500"
                                : sub.status === "failed"
                                  ? "text-red-500"
                                  : "text-cyan-500"
                            }
                          >
                            {sub.status === "in-progress"
                              ? "ACTV"
                              : sub.status === "complete"
                                ? "DONE"
                                : "WAIT"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Goals Section */}
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mb-2 tracking-wider">
            <Target size={12} /> ACTIVE GOALS
          </div>
          {goals.length === 0 ? (
            <div className="text-xs text-slate-600 italic pl-4">
              No active goals.
            </div>
          ) : (
            <div className="space-y-2">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className={`p-2 rounded border border-slate-800/50 relative overflow-hidden group`}
                >
                  <div
                    className="absolute inset-y-0 left-0 w-1 opacity-60"
                    style={{ backgroundColor: theme?.hex || "#10b981" }}
                  />
                  <div className="flex justify-between items-start mb-1 pl-1 text-[10px] font-bold text-white tracking-widest uppercase">
                    <span>{goal.description}</span>
                    {onDeleteGoal && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteGoal(goal.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-500"
                        title="Delete Goal"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                  <div
                    className={`mt-1 pl-1 text-[9px] font-mono flex items-center gap-1 ${getGoalStatusColor(goal.status)}`}
                  >
                    {goal.status === "COMPLETED" ? (
                      <CheckCircle2 size={10} />
                    ) : goal.status === "IN_PROGRESS" ? (
                      <Circle size={10} className="animate-pulse" />
                    ) : (
                      <Circle size={10} />
                    )}
                    {goal.status} - {goal.type}
                  </div>
                  <div className="mt-1 pl-1 flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                    <Clock size={9} />
                    {formatSchedule(goal.schedule, goal.scheduledAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Intelligence Section (Phase 9) */}
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mb-2 tracking-wider">
            <Brain size={12} /> ACTIVE INTELLIGENCE (PHASE 9)
          </div>
          {memoryService.getRecentIntelligence(3).length === 0 ? (
            <div className="text-xs text-slate-600 italic pl-4">
              Intelligence matrix clear.
            </div>
          ) : (
            <div className="space-y-2">
              {memoryService.getRecentIntelligence(3).map((intel) => (
                <div
                  key={intel.id}
                  className="p-2 rounded border border-slate-800/50 relative overflow-hidden group"
                >
                  <div
                    className="absolute inset-y-0 left-0 w-1 opacity-60"
                    style={{ backgroundColor: theme?.hex || "#6366f1" }}
                  />
                  <div className="flex justify-between items-start mb-1 pl-1">
                    <span className="text-[10px] font-bold text-white truncate max-w-[80%] uppercase tracking-tighter">
                      {intel.key.replace(/_/g, " ")}
                    </span>
                    <span
                      className="text-[8px] font-mono"
                      style={{ color: theme?.hex || "#6366f1" }}
                    >
                      {Math.round(intel.confidence * 100)}%
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400 pl-1 leading-tight italic line-clamp-2">
                    {intel.value}
                  </div>
                  <div className="mt-1 flex justify-between items-center text-[8px] font-mono text-slate-600 pl-1">
                    <span>{intel.category}</span>
                    <span>
                      {new Date(intel.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagementDashboard;
