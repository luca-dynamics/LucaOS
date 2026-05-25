import type { MissionTape, MissionTapeRecorder } from "../missionEngine/types";

export interface MissionTapeStepRecord {
  stepId: string;
  goal: string;
  status: "executed" | "verified" | "recovered" | "failed";
  notes?: string;
  timestamp: string;
}

export interface MissionTapeGuardRecord {
  stepId?: string;
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
  riskLevel?: "safe" | "sensitive" | "dangerous";
  trustTier?: "trusted" | "verified" | "untrusted";
  timestamp: string;
}

export interface MissionTapeVerificationRecord {
  stepId: string;
  passed: boolean;
  details?: string;
  verificationCommand?: string;
  timestamp: string;
}

export interface MissionTapeRecoveryRecord {
  stepId: string;
  recovered: boolean;
  reason: string;
  details?: string;
  timestamp: string;
}

export interface MissionTapeRecord {
  missionId: string;
  intent: string;
  status: MissionTape["status"];
  startedAt: string;
  completedAt?: string;
  steps: MissionTapeStepRecord[];
  guard: MissionTapeGuardRecord[];
  verification: MissionTapeVerificationRecord[];
  recovery: MissionTapeRecoveryRecord[];
  result?: MissionTape["result"];
}

export interface MissionTapeQuery {
  missionId?: string;
  status?: MissionTapeRecord["status"];
  from?: string;
  to?: string;
  limit?: number;
}

export interface MissionTapeStorageAdapter {
  save(tape: MissionTapeRecord): Promise<void>;
  get(missionId: string): Promise<MissionTapeRecord | null>;
  list(query?: MissionTapeQuery): Promise<MissionTapeRecord[]>;
}

export interface MissionTapeRecorderServiceContract extends MissionTapeRecorder {
  createTape(missionId: string, intent: string): Promise<MissionTapeRecord>;
  appendStep(missionId: string, step: Omit<MissionTapeStepRecord, "timestamp"> & { timestamp?: string }): Promise<void>;
  appendGuardDecision(missionId: string, record: Omit<MissionTapeGuardRecord, "timestamp"> & { timestamp?: string }): Promise<void>;
  appendVerification(missionId: string, record: Omit<MissionTapeVerificationRecord, "timestamp"> & { timestamp?: string }): Promise<void>;
  appendRecovery(missionId: string, record: Omit<MissionTapeRecoveryRecord, "timestamp"> & { timestamp?: string }): Promise<void>;
  finalizeTape(missionId: string, finalData: { status: MissionTapeRecord["status"]; result?: MissionTapeRecord["result"]; completedAt?: string }): Promise<MissionTapeRecord>;
  getTape(missionId: string): Promise<MissionTapeRecord | null>;
  listTapes(query?: MissionTapeQuery): Promise<MissionTapeRecord[]>;
}
