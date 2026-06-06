import type { ValidationResult } from "../identity/identityTypes";

export type MissionOperatingMode = "advisory" | "collaborative" | "supervised_execution";
export type MissionPriority = "low" | "normal" | "high" | "critical";
export type MissionStatus = "draft" | "active" | "paused" | "completed" | "cancelled";

export interface MissionProfile {
  missionId: string;
  title: string;
  description: string;
  goals: string[];
  constraints: string[];
  successCriteria: string[];
  activeProjectRefs: string[];
  operatingMode: MissionOperatingMode;
  priority: MissionPriority;
  status: MissionStatus;
  createdAt: string;
  updatedAt: string;
}

export type MissionProfileInput = Omit<MissionProfile, "createdAt" | "updatedAt"> &
  Partial<Pick<MissionProfile, "createdAt" | "updatedAt">>;
export type MissionValidationResult = ValidationResult;
