import type { PersonalIntelligenceSkillRiskLevel } from "../skills";

export type PersonalIntelligenceRuntimeAuthorityClass =
  | "permanently_blocked"
  | "review_only"
  | "dry_run_only"
  | "future_pilot_candidate"
  | "unsupported";

export type PersonalIntelligenceRuntimeCapabilityKind =
  | "skill_execution"
  | "tool_invocation"
  | "mcp_invocation"
  | "workflow_execution"
  | "model_call"
  | "memory_proposal"
  | "memory_write"
  | "browser_action"
  | "network_access"
  | "file_read"
  | "file_write"
  | "connector_access"
  | "lucalink_handoff"
  | "shell_command"
  | "install_package"
  | "credential_access"
  | "payment_or_trading"
  | "device_control"
  | "generated_code_execution"
  | "private_reasoning_access"
  | "unknown";

export type PersonalIntelligenceRuntimeAuthoritySource =
  | "skill_registry"
  | "sandbox_plan"
  | "permission_gates"
  | "dry_run"
  | "memory_proposal"
  | "mission_profile"
  | "runtime_trace"
  | "fixture";

export interface PersonalIntelligenceRuntimeAuthorityRecord {
  authorityId: string;
  createdAt: string;
  source: PersonalIntelligenceRuntimeAuthoritySource;
  skillId?: string;
  manifestId?: string;
  planId?: string;
  simulationId?: string;
  capabilityKind: PersonalIntelligenceRuntimeCapabilityKind;
  authorityClass: PersonalIntelligenceRuntimeAuthorityClass;
  riskLevel: PersonalIntelligenceSkillRiskLevel;
  requiredEvidence: string[];
  requiredApprovals: string[];
  requiredRuntimeBoundary: string[];
  blockedActions: string[];
  warnings: string[];
  blockers: string[];
  authorityGranted: false;
  executionEnabled: false;
  canExecute: false;
  readyForExecution: false;
  sideEffectsPerformed: false;
}

export interface PersonalIntelligenceRuntimeAuthorityReadiness {
  totalRecords: number;
  permanentlyBlocked: number;
  reviewOnly: number;
  dryRunOnly: number;
  futurePilotCandidates: number;
  unsupported: number;
  highRiskCount: number;
  criticalRiskCount: number;
  authorityGranted: false;
  executionEnabled: false;
  canExecute: false;
  readyForExecution: false;
  sideEffectsPerformed: false;
  warnings: string[];
  blockers: string[];
}

export interface PersonalIntelligenceRuntimeAuthorityPolicyInput {
  capabilityKind: PersonalIntelligenceRuntimeCapabilityKind | string;
  source: PersonalIntelligenceRuntimeAuthoritySource | string;
  riskLevel?: PersonalIntelligenceSkillRiskLevel;
  manifestPresent?: boolean;
  sandboxPlanPresent?: boolean;
  declarationsComplete?: boolean;
  dryRunSuccessful?: boolean;
  requiredGatesGrantedForReview?: boolean;
  hasBlockedDeniedOrExpiredGates?: boolean;
  missionAlignment?: "aligned" | "reviewed" | "misaligned" | "not_provided";
  rollbackExpectationExists?: boolean;
  runtimeTracePreviewExists?: boolean;
  permanentBlockedCapabilityPresent?: boolean;
  authorityGranted?: boolean;
  executionEnabled?: boolean;
  canExecute?: boolean;
  readyForExecution?: boolean;
}

export interface PersonalIntelligenceRuntimeAuthorityPolicyResult {
  authorityClass: PersonalIntelligenceRuntimeAuthorityClass;
  riskLevel: PersonalIntelligenceSkillRiskLevel;
  requiredEvidence: string[];
  requiredApprovals: string[];
  requiredRuntimeBoundary: string[];
  blockedActions: string[];
  warnings: string[];
  blockers: string[];
  authorityGranted: false;
  executionEnabled: false;
  canExecute: false;
  readyForExecution: false;
  sideEffectsPerformed: false;
}

export interface PersonalIntelligenceRuntimeAuthorityEvidence {
  authorityId: string;
  sourceItem: string;
  requiredApprovals: string[];
  dryRunEvidence: string[];
  blockedActions: string[];
  rollbackExpectations: string[];
  runtimeTracePresence: boolean;
  missionAlignment: string;
  safetyBlockers: string[];
  futurePilotRequirements: string[];
  authorityGranted: false;
  executionEnabled: false;
  canExecute: false;
  readyForExecution: false;
  sideEffectsPerformed: false;
}
