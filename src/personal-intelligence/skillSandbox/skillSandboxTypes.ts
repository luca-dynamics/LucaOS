import type { PrivacyZone } from "../privacy/privacyZones";
import type { PersonalIntelligenceSkillRiskLevel } from "../skills/skillRegistryTypes";

export type PersonalIntelligenceSkillSandboxStatus = "draft" | "ready_for_review" | "approval_required" | "blocked" | "disabled";
export type PersonalIntelligenceSkillSandboxMode = "inspection_only" | "dry_run_plan" | "future_isolated_runtime";
export type PersonalIntelligenceSkillSandboxPermissionKind = "model" | "tool" | "memory" | "connector" | "network" | "file" | "browser" | "lucalink" | "device" | "shell" | "install" | "credential" | "payment" | "unknown";
export type PersonalIntelligenceSkillSandboxApprovalKind = "user" | "privacy" | "memory" | "model" | "tool" | "connector" | "network" | "file" | "browser" | "lucalink" | "safety" | "primary_host";

export interface PersonalIntelligenceSkillSandboxPermissionRequirement {
  permissionId: string;
  kind: PersonalIntelligenceSkillSandboxPermissionKind;
  label: string;
  riskLevel: PersonalIntelligenceSkillRiskLevel;
  required: boolean;
  approvalRequired: boolean;
  sandboxRequired: boolean;
  blocked: boolean;
  reason: string;
}

export interface PersonalIntelligenceSkillSandboxApprovalRequirement {
  approvalId: string;
  kind: PersonalIntelligenceSkillSandboxApprovalKind;
  label: string;
  required: boolean;
  satisfied: false;
  reason: string;
}

export interface PersonalIntelligenceSkillSandboxTraceRequirement {
  stage: "sense" | "understand" | "plan" | "approve" | "act" | "verify" | "learn";
  required: boolean;
  expectation: string;
  sideEffectsPerformed: false;
}

export interface PersonalIntelligenceSkillSandboxRollbackExpectation {
  required: boolean;
  reason: string;
  expectedRecoverySteps: string[];
  stateMutationAllowed: false;
  filesTouched: [];
  networkCallsAllowed: false;
  sideEffectsPerformed: false;
}

export interface PersonalIntelligenceSkillSandboxPlan {
  planId: string;
  skillId: string;
  manifestId: string;
  createdAt: string;
  source: string;
  status: PersonalIntelligenceSkillSandboxStatus;
  riskLevel: PersonalIntelligenceSkillRiskLevel;
  executionEnabled: false;
  canExecute: false;
  sandboxMode: PersonalIntelligenceSkillSandboxMode;
  requiredPermissions: PersonalIntelligenceSkillSandboxPermissionRequirement[];
  requiredApprovals: PersonalIntelligenceSkillSandboxApprovalRequirement[];
  requiredRuntimeTraces: PersonalIntelligenceSkillSandboxTraceRequirement[];
  requiredRollbackPlan: PersonalIntelligenceSkillSandboxRollbackExpectation;
  allowedSurfaces: string[];
  blockedSurfaces: string[];
  permissionSummary: string;
  approvalSummary: string;
  traceSummary: string;
  rollbackSummary: string;
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export interface PersonalIntelligenceSkillSandboxPolicyEvaluation {
  status: PersonalIntelligenceSkillSandboxStatus;
  riskLevel: PersonalIntelligenceSkillRiskLevel;
  requiresApproval: boolean;
  requiresSandbox: boolean;
  requiresRuntimeTrace: boolean;
  requiresRollbackPlan: boolean;
  allowedSurfaces: string[];
  blockedSurfaces: string[];
  warnings: string[];
  blockers: string[];
  executionEnabled: false;
  canExecute: false;
  sideEffectsPerformed: false;
}

export interface PersonalIntelligenceSkillSandboxReadiness {
  totalPlans: number;
  readyForReview: number;
  approvalRequired: number;
  blocked: number;
  disabled: number;
  readyForExecution: false;
  executionEnabled: false;
  blockedPermissionKinds: PersonalIntelligenceSkillSandboxPermissionKind[];
  approvalRequirementCount: number;
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export interface CreatePersonalIntelligenceSkillSandboxPlanOptions {
  planId?: string;
  source?: string;
  sandboxMode?: PersonalIntelligenceSkillSandboxMode;
  now?: () => Date;
}

export interface SkillSandboxTraceContext {
  traceId?: string;
  source?: string;
  privacyZone?: PrivacyZone;
  now?: () => Date;
}

export interface SkillSandboxLearningOptions {
  eventId?: string;
  confidence?: number;
  traceId?: string;
  now?: () => Date;
}
