import { useState, useMemo } from "react";
import { MemoryNode, Task, CalendarEvent, Goal } from "../types";
import type { RightPanelMode } from "../components/right-panel/rightPanelModel";

export function useManagementState() {
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>("CONTROL");
  const [memories, setMemories] = useState<MemoryNode[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [installedModules, setInstalledModules] = useState<string[]>([]);
  const [queuedTasks, setQueuedTasks] = useState<any[]>([]);

  return useMemo(() => ({
    rightPanelMode,
    setRightPanelMode,
    memories,
    setMemories,
    tasks,
    setTasks,
    events,
    setEvents,
    goals,
    setGoals,
    installedModules,
    setInstalledModules,
    queuedTasks,
    setQueuedTasks,
  }), [rightPanelMode, memories, tasks, events, goals, installedModules, queuedTasks]);
}
