export type ProvenanceSourceType =
  | "memory"
  | "skill"
  | "scheduled_job"
  | "tool_action"
  | "runtime_snapshot"
  | "external_input";

export type ProvenanceTrustLevel = "trusted" | "user_approved" | "local" | "untrusted" | "unknown";
export type ProvenanceQuarantineState = "clear" | "quarantined";
export type ProvenanceRevocationState = "active" | "revoked";

export type ProvenanceApprovalState =
  | "not_required"
  | "required"
  | "pending"
  | "approved_once"
  | "rejected"
  | "expired"
  | "revoked";

export interface ProvenanceMetadata {
  provenanceId: string;
  sourceType: ProvenanceSourceType;
  sourceId: string;
  sourceTrustLevel: ProvenanceTrustLevel;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  digest: string;
  parentProvenanceIds: string[];
  quarantineState: ProvenanceQuarantineState;
  approvalState: ProvenanceApprovalState;
  revocationState: ProvenanceRevocationState;
}

export interface ActionInstanceIdentity {
  actionInstanceId: string;
  actionType: string;
  target: string;
  parameters: Record<string, unknown>;
  provenanceChain: string[];
  timestampBucket?: string;
}

export interface ProvenanceApprovalRecord {
  approvalId: string;
  actionDigest: string;
  provenanceIds: string[];
  state: ProvenanceApprovalState;
  createdAt: string;
  decidedAt?: string;
  consumedAt?: string;
  userSafeReason: string;
}

export interface ProvenanceRunCheck {
  allowed: boolean;
  approvalState: ProvenanceApprovalState;
  userSafeReason: string;
  actionDigest: string;
  blockedBy: string[];
}

export interface ProvenanceDiagnosticsSummary {
  totalRecords: number;
  pendingApprovals: number;
  approvedOnce: number;
  quarantinedRecords: number;
  revokedRecords: number;
  expiredRecords: number;
}

export const PROVENANCE_SAFETY_RULES = [
  "No always-on risky action without provenance.",
  "No scheduled tool, shell, or network execution without explicit approval.",
  "No approval reuse across different action-instance digests.",
  "No untrusted memory, skill, or schedule can silently trigger a later risky action.",
  "Quarantined items cannot run.",
  "Revoked provenance invalidates dependent actions.",
  "Normal users should never see raw internals or secrets.",
  "No raw provider keys in diagnostics.",
  "Existing memories, settings, skills, and runtime state must not be destructively migrated.",
  "All new execution-like flows are dry-run/no-op unless explicitly safe.",
] as const;
