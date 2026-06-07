import type { PrivacyZone } from "../privacy/privacyZones";

export type LearningOutcome = "success" | "partial" | "failure" | "cancelled";
export type VerificationStatus = "not_required" | "pending" | "verified" | "failed";

export interface LearningLogEntry {
  eventId: string;
  timestamp: string;
  inputSummary: string;
  actionTaken: string;
  skillUsed?: string;
  modelUsed?: string;
  outcome: LearningOutcome;
  verificationStatus: VerificationStatus;
  userFeedback?: string;
  nextAdjustment?: string;
  relatedMissionId?: string;
  relatedTraceId?: string;
  relatedMemoryItemIds?: string[];
  privacyZone?: PrivacyZone;
  source?: string;
  confidence?: number;
}

export interface LearningLog {
  append(entry: LearningLogEntry): LearningLogEntry;
  list(): LearningLogEntry[];
}
