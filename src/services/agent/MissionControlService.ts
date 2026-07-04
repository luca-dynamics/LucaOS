import { loggerService } from "../loggerService";

/**
 * MISSION CONTROL SERVICE (The Memory/State Proxy)
 * This service now acts as a proxy to the Electron Main process 
 * where the actual SQLite database (missionControl.cjs) resides.
 */

// Service logic follows after unified global definition in src/global.d.ts

export interface MissionGoal {
  id: number;
  mission_id: number;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  dependency_id?: number;
  metadata?: any;
}

export interface Mission {
  id: number;
  title: string;
  status: "ACTIVE" | "ARCHIVED" | "COMPLETED";
  created_at: number;
  updated_at: number;
  metadata?: any;
}

export interface MissionSnapshot {
  mission: Mission;
  goals: MissionGoal[];
}

function isMissionSnapshot(value: unknown): value is MissionSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { mission?: unknown; goals?: unknown };
  return (
    !!candidate.mission &&
    typeof candidate.mission === "object" &&
    typeof (candidate.mission as { id?: unknown }).id === "number" &&
    Array.isArray(candidate.goals)
  );
}

export class MissionControlService {
  private static instance: MissionControlService;

  private constructor() {
    loggerService.info("MISSION_CONTROL", "Mission Control Proxy initialized (Bridge: Electron Main).");
  }

  public static getInstance(): MissionControlService {
    if (!MissionControlService.instance) {
      MissionControlService.instance = new MissionControlService();
    }
    return MissionControlService.instance;
  }

  /**
   * Start a new persistent mission.
   */
  public async startMission(title: string, metadata: any = {}): Promise<number> {
    try {
      const id = await window.luca.missionControl.start(title, metadata);
      loggerService.info("MISSION_CONTROL", `Started new mission: ${title} (ID: ${id})`);
      return id;
    } catch (error) {
      loggerService.error("MISSION_CONTROL", "Failed to start mission", error);
      throw error;
    }
  }

  /**
   * Add a goal to an active mission.
   */
  public async addGoal(missionId: number, description: string, dependencyId?: number): Promise<number> {
    return window.luca.missionControl.addGoal(missionId, description, dependencyId);
  }

  /**
   * Update the status of a specific goal.
   */
  public async updateGoalStatus(goalId: number, status: MissionGoal["status"]): Promise<void> {
    return window.luca.missionControl.updateGoal(goalId, status);
  }

  /**
   * Retrieve the current active mission context for the LLM.
   */
  public async getActiveMissionContext(): Promise<string> {
    return window.luca.missionControl.getContext();
  }

  /**
   * Read the active mission + its goals as structured data (read-only), or null
   * when there is no active mission or the mission bridge is unavailable (e.g.
   * the browser-safe web build, where window.luca is absent). The IPC result is
   * untyped, so validate the shape defensively before trusting it.
   */
  public async getActiveMission(): Promise<MissionSnapshot | null> {
    if (
      typeof window === "undefined" ||
      !window.luca?.missionControl?.getActive
    ) {
      return null;
    }
    try {
      const raw = await window.luca.missionControl.getActive();
      return isMissionSnapshot(raw) ? raw : null;
    } catch (error) {
      loggerService.error(
        "MISSION_CONTROL",
        "Failed to read active mission",
        error,
      );
      return null;
    }
  }

  /**
   * Archive a mission once complete.
   */
  public async archiveMission(missionId: number): Promise<void> {
    return window.luca.missionControl.archive(missionId);
  }
}

export const missionControlService = MissionControlService.getInstance();
