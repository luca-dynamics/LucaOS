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
}

export interface LearningLog {
  append(entry: LearningLogEntry): LearningLogEntry;
  list(): LearningLogEntry[];
}
