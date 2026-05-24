export type MissionRiskLevel = "safe" | "sensitive" | "dangerous";

export type MissionStatus =
  | "queued"
  | "planned"
  | "awaiting_approval"
  | "executing"
  | "verifying"
  | "recovered"
  | "completed"
  | "failed"
  | "aborted";

export interface MissionStep {
  stepId: string;
  goal: string;
  toolOrRuntime: string;
  expectedOutput: string;
  verification: string;
  rollback: string;
  riskLevel: MissionRiskLevel;
}

export interface MissionCheckpoint {
  checkpointId: string;
  missionId: string;
  activePlanIndex: number;
  toolRuntimeContext?: Record<string, unknown>;
  relevantStateSnapshots?: Record<string, unknown>;
  modelRoute?: string;
  latestSuccessfulVerification?: string;
  recoveryBranch?: string;
  createdAt: string;
}

export interface Mission {
  missionId: string;
  intent: string;
  status: MissionStatus;
  createdAt: string;
  updatedAt: string;
  steps: MissionStep[];
  currentStepIndex: number;
  checkpoints: MissionCheckpoint[];
}

export interface MissionResult {
  success: boolean;
  status: MissionStatus;
  missionId: string;
  evidence?: string[];
  error?: string;
}

export interface MissionTape {
  missionId: string;
  intent: string;
  status: MissionStatus;
  startedAt: string;
  completedAt?: string;
  steps: Array<{
    stepId: string;
    goal: string;
    status: "executed" | "verified" | "recovered" | "failed";
    notes?: string;
  }>;
  result?: MissionResult;
}

export interface MissionVerifier {
  verifyStep(mission: Mission, step: MissionStep): Promise<{ passed: boolean; details?: string }>;
}

export interface MissionRecoveryHandler {
  recoverStep(mission: Mission, step: MissionStep, reason: string): Promise<{ recovered: boolean; details?: string }>;
}

export interface MissionTapeRecorder {
  recordMissionTape(tape: MissionTape): Promise<void>;
}

export interface GuardHook {
  evaluateStepRisk(mission: Mission, step: MissionStep): Promise<{
    allowed: boolean;
    requiresApproval: boolean;
    reason?: string;
  }>;
}
