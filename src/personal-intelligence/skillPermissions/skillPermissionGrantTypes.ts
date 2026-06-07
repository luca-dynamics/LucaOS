import type {
  PersonalIntelligenceSkillSandboxApprovalKind,
  PersonalIntelligenceSkillSandboxPermissionKind,
  PersonalIntelligenceSkillSandboxPlan,
} from "../skillSandbox";

export type PersonalIntelligenceSkillPermissionGateKind = "permission" | "approval";
export type PersonalIntelligenceSkillPermissionGateStatus =
  | "pending"
  | "granted_for_review"
  | "denied"
  | "expired"
  | "blocked"
  | "requires_primary_approval";
export type PersonalIntelligenceSkillPermissionDecision = "grant_for_review" | "deny" | "expire";

export interface PersonalIntelligenceSkillPermissionScope {
  mode: "review_only";
  skillId: string;
  manifestId: string;
  planId: string;
  permissionKind?: PersonalIntelligenceSkillSandboxPermissionKind;
  approvalKind?: PersonalIntelligenceSkillSandboxApprovalKind;
  executionAuthorized: false;
}

export interface PersonalIntelligenceSkillPermissionGate {
  gateId: string;
  skillId: string;
  manifestId: string;
  planId: string;
  permissionId?: string;
  approvalId?: string;
  kind: PersonalIntelligenceSkillPermissionGateKind;
  permissionKind?: PersonalIntelligenceSkillSandboxPermissionKind;
  approvalKind?: PersonalIntelligenceSkillSandboxApprovalKind;
  label: string;
  reason: string;
  status: PersonalIntelligenceSkillPermissionGateStatus;
  riskLevel: PersonalIntelligenceSkillSandboxPlan["riskLevel"];
  required: boolean;
  scope: PersonalIntelligenceSkillPermissionScope;
  reviewedAt?: string;
  expiresAt?: string;
  decisionReason?: string;
  executionEnabled: false;
  canExecute: false;
  sideEffectsPerformed: false;
}

export interface PersonalIntelligenceSkillPermissionGrantAuditEvent {
  eventId: string;
  gateId: string;
  skillId: string;
  decision: PersonalIntelligenceSkillPermissionDecision;
  previousStatus: PersonalIntelligenceSkillPermissionGateStatus;
  nextStatus: PersonalIntelligenceSkillPermissionGateStatus;
  occurredAt: string;
  summary: string;
  persisted: false;
  executionEnabled: false;
  sideEffectsPerformed: false;
}

export interface PersonalIntelligenceSkillPermissionGrantState {
  gates: PersonalIntelligenceSkillPermissionGate[];
  auditEvents: PersonalIntelligenceSkillPermissionGrantAuditEvent[];
  readyForExecution: false;
  executionEnabled: false;
  canExecute: false;
  sideEffectsPerformed: false;
}

export interface PersonalIntelligenceSkillPermissionGrantReadiness {
  total: number;
  pending: number;
  grantedForReview: number;
  denied: number;
  expired: number;
  blocked: number;
  requiresPrimaryApproval: number;
  reviewComplete: boolean;
  readyForExecution: false;
  executionEnabled: false;
  canExecute: false;
  blockers: string[];
  sideEffectsPerformed: false;
}

export interface SkillPermissionDecisionOptions {
  now?: () => Date;
  reviewDurationMs?: number;
  reason?: string;
}
