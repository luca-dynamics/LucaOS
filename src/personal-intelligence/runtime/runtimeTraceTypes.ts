import type { LearningLogEntry, VerificationStatus } from "../learning/learningTypes";
import type { LearningPersistenceProposal } from "../persistence/persistenceTypes";
import type { PrivacyZone } from "../privacy/privacyZones";

export const PERSONAL_INTELLIGENCE_DOCTRINE_STAGES = [
  "sense",
  "understand",
  "plan",
  "approve",
  "act",
  "verify",
  "learn",
] as const;

export type PersonalIntelligenceRuntimeTraceStageName =
  (typeof PERSONAL_INTELLIGENCE_DOCTRINE_STAGES)[number];
export type PersonalIntelligenceRuntimeTraceStatus =
  | "draft"
  | "active"
  | "verified"
  | "blocked"
  | "failed"
  | "cancelled";
export type PersonalIntelligenceRuntimeTraceStageStatus =
  | "pending"
  | "completed"
  | "blocked"
  | "skipped"
  | "failed";

export interface PersonalIntelligenceRuntimeTraceStage {
  stage: PersonalIntelligenceRuntimeTraceStageName;
  status: PersonalIntelligenceRuntimeTraceStageStatus;
  summary: string;
  timestamp: string;
  evidenceRef?: string;
  requiresApproval?: boolean;
  approvalSatisfied?: boolean;
  sideEffectsPerformed: false;
}

export interface PersonalIntelligenceRuntimeTrace {
  traceId: string;
  title: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  privacyZone: PrivacyZone;
  relatedMissionId?: string;
  relatedProposalId?: string;
  relatedApprovalId?: string;
  status: PersonalIntelligenceRuntimeTraceStatus;
  stages: PersonalIntelligenceRuntimeTraceStage[];
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export interface CreateRuntimeTraceInput {
  traceId: string;
  title: string;
  source: string;
  privacyZone: PrivacyZone;
  createdAt?: string;
  relatedMissionId?: string;
  relatedProposalId?: string;
  relatedApprovalId?: string;
  status?: PersonalIntelligenceRuntimeTraceStatus;
  warnings?: string[];
  blockers?: string[];
  now?: () => Date;
}

export type RuntimeTraceStageInput = Omit<
  PersonalIntelligenceRuntimeTraceStage,
  "timestamp" | "sideEffectsPerformed"
> & {
  timestamp?: string;
};

export interface RuntimeTracePolicyOptions {
  allowPrivateTraceReview?: boolean;
  explicitApproval?: boolean;
  approvalId?: string;
}

export interface RuntimeTracePolicyEvaluation {
  allowed: boolean;
  trace: PersonalIntelligenceRuntimeTrace;
  warnings: string[];
  blockers: string[];
}

export interface PersonalIntelligenceRuntimeLearningEvent
  extends LearningLogEntry {
  privacyZone: PrivacyZone;
  source: string;
  confidence: number;
  relatedTraceId?: string;
  verificationStatus: VerificationStatus;
  blockers: string[];
  warnings: string[];
  proposalReady: boolean;
  persisted: false;
  writePerformed: false;
}

export interface LearningEventCreationResult {
  event: PersonalIntelligenceRuntimeLearningEvent;
  warnings: string[];
  blockers: string[];
}

export interface LearningEventProposalPreviewResult {
  proposal: LearningPersistenceProposal;
  warnings: string[];
  blockers: string[];
  approved: false;
  writePerformed: false;
}

export interface PersonalIntelligenceRuntimeTraceReadiness {
  totalTraces: number;
  blockedTraces: number;
  verifiedTraces: number;
  learningEventsReadyForProposal: number;
  sensitiveZoneCount: number;
  unsafeContentBlocked: number;
  readyForRuntimeRecording: boolean;
  readyForPersistenceProposal: boolean;
  warnings: string[];
  blockers: string[];
}
