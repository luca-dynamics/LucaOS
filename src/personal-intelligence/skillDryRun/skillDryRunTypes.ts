import type { MissionAlignmentEvaluation } from "../missionRuntime";
import type { PersonalIntelligenceRuntimeTrace } from "../runtime";
import type { PersonalIntelligenceSkillPermissionGate } from "../skillPermissions";
import type { PersonalIntelligenceSkillSandboxPlan } from "../skillSandbox";
import type { PersonalIntelligenceSkillRegistryEntry, PersonalIntelligenceSkillRiskLevel } from "../skills";

export type PersonalIntelligenceSkillDryRunSource = "fixture" | "selected_skill" | "sandbox_plan" | "future_runtime";
export type PersonalIntelligenceSkillDryRunStatus = "ready_for_review" | "approval_required" | "blocked" | "disabled";
export type PersonalIntelligenceSkillDryRunStage = "inspect" | "prepare" | "permission_check" | "mission_check" | "trace_prepare" | "rollback_prepare" | "blocked_act" | "verify" | "learn_candidate";
export type PersonalIntelligenceSkillDryRunStepStatus = "simulated" | "skipped" | "blocked" | "requires_review";

export interface PersonalIntelligenceSkillDryRunStep {
  stepId: string;
  order: number;
  label: string;
  description: string;
  stage: PersonalIntelligenceSkillDryRunStage;
  status: PersonalIntelligenceSkillDryRunStepStatus;
  wouldRequire: string[];
  wouldBlock: string[];
  sideEffectsPerformed: false;
}

export interface PersonalIntelligenceSkillDryRunMissionAlignmentSummary {
  status: MissionAlignmentEvaluation["alignmentStatus"] | "not_provided";
  missionId?: string;
  summary: string;
  violatedConstraints: string[];
  requiresUserReview: boolean;
  sideEffectsPerformed: false;
}

export interface PersonalIntelligenceSkillDryRunSimulation {
  simulationId: string;
  skillId: string;
  manifestId: string;
  planId: string;
  createdAt: string;
  source: PersonalIntelligenceSkillDryRunSource;
  status: PersonalIntelligenceSkillDryRunStatus;
  riskLevel: PersonalIntelligenceSkillRiskLevel;
  dryRunOnly: true;
  executionEnabled: false;
  canExecute: false;
  readyForExecution: false;
  sideEffectsPerformed: false;
  simulatedSteps: PersonalIntelligenceSkillDryRunStep[];
  requiredApprovals: string[];
  missingApprovals: string[];
  grantedForReview: string[];
  deniedGates: string[];
  expiredGates: string[];
  blockedActions: string[];
  allowedReviewSurfaces: string[];
  runtimeTracePreview: PersonalIntelligenceRuntimeTrace;
  rollbackExpectations: string[];
  missionAlignmentSummary: PersonalIntelligenceSkillDryRunMissionAlignmentSummary;
  warnings: string[];
  blockers: string[];
}

export interface PersonalIntelligenceSkillDryRunReadiness {
  totalSimulations: number;
  readyForReview: number;
  approvalRequired: number;
  blocked: number;
  disabled: number;
  readyForExecution: false;
  executionEnabled: false;
  canExecute: false;
  dryRunOnly: true;
  sideEffectsPerformed: false;
  warnings: string[];
  blockers: string[];
}

export interface PersonalIntelligenceSkillDryRunRuntimeAuthority {
  executionEnabled?: boolean;
  canExecute?: boolean;
  readyForExecution?: boolean;
  toolInvocationEnabled?: boolean;
  modelCallsEnabled?: boolean;
}

export interface CreatePersonalIntelligenceSkillDryRunInput {
  skillRegistryEntry: PersonalIntelligenceSkillRegistryEntry;
  sandboxPlan: PersonalIntelligenceSkillSandboxPlan;
  permissionGates: readonly PersonalIntelligenceSkillPermissionGate[];
  missionEvaluation?: MissionAlignmentEvaluation;
  runtimeTraceContext?: { privacyZone?: PersonalIntelligenceRuntimeTrace["privacyZone"]; relatedMissionId?: string };
  runtimeAuthority?: PersonalIntelligenceSkillDryRunRuntimeAuthority;
  source?: PersonalIntelligenceSkillDryRunSource;
  now?: () => Date;
}

export interface PersonalIntelligenceSkillDryRunPolicyResult {
  status: PersonalIntelligenceSkillDryRunStatus;
  riskLevel: PersonalIntelligenceSkillRiskLevel;
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
  executionEnabled: false;
  canExecute: false;
  readyForExecution: false;
  dryRunOnly: true;
}
