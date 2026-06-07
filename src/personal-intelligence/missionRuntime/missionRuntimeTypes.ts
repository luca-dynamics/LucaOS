import type { MissionProfile } from "../mission/missionTypes";
import type { PrivacyZone } from "../privacy/privacyZones";

export type MissionRuntimeMode = "advisory" | "collaborative";
export type MissionAlignmentStatus = "aligned" | "partially_aligned" | "misaligned" | "blocked" | "needs_review";
export type MissionRiskLevel = "low" | "medium" | "high" | "critical";
export type MissionRecommendationType = "proceed" | "revise" | "ask_user" | "block" | "split_task" | "defer";

export interface MissionSuccessCriteriaCoverage {
  matched: string[];
  unverified: string[];
  coverageRatio: number;
}

export interface PersonalIntelligenceMissionContextSnapshot {
  snapshotId: string;
  missionId: string;
  title: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  mode: MissionRuntimeMode;
  privacyZone: PrivacyZone;
  goals: string[];
  constraints: string[];
  successCriteria: string[];
  operatingAssumptions: string[];
  relatedProjectIds?: string[];
  relatedMemoryItemIds?: string[];
  relatedTraceIds?: string[];
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export interface MissionAlignmentEvaluation {
  evaluationId: string;
  missionId: string;
  proposalTitle: string;
  proposalSummary: string;
  alignmentStatus: MissionAlignmentStatus;
  matchedGoals: string[];
  violatedConstraints: string[];
  unverifiedAssumptions: string[];
  successCriteriaCoverage: MissionSuccessCriteriaCoverage;
  riskLevel: MissionRiskLevel;
  requiresUserReview: boolean;
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export interface MissionAdvisoryRecommendation {
  recommendationId: string;
  missionId: string;
  title: string;
  summary: string;
  recommendationType: MissionRecommendationType;
  nextSteps: string[];
  rationale: string[];
  riskLevel: MissionRiskLevel;
  requiresApprovalBeforeAction: true;
  canExecute: false;
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export interface MissionCollaborativeGuidance {
  guidanceId: string;
  mode: "collaborative";
  userIntentSummary: string;
  missionRelevantContext: string[];
  suggestedQuestions: string[];
  suggestedNextSteps: string[];
  approvalBoundaries: string[];
  blockedAutonomousActions: string[];
  sideEffectsPerformed: false;
}

export interface MissionRuntimeReadinessSummary {
  totalSnapshots: number;
  blockedSnapshots: number;
  alignedEvaluations: number;
  needsReviewEvaluations: number;
  blockedEvaluations: number;
  recommendationsReadyForUserReview: number;
  autonomousExecutionEnabled: false;
  readyForAdvisoryMode: boolean;
  readyForCollaborativeMode: boolean;
  warnings: string[];
  blockers: string[];
}

export interface CreateMissionContextSnapshotInput {
  mission: MissionProfile;
  mode: MissionRuntimeMode;
  privacyZone?: PrivacyZone;
  source?: string;
  operatingAssumptions?: string[];
  relatedProjectIds?: string[];
  relatedMemoryItemIds?: string[];
  relatedTraceIds?: string[];
  now?: () => Date;
}
