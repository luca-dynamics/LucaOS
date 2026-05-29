export type GovernedExecutionCapability =
  | "notify"
  | "open_panel"
  | "runtime_read"
  | "memory_read"
  | "inbox_read"
  | "session_read"
  | "dry_run_confirm";

export type GovernedExecutionStatus =
  | "queued"
  | "blocked"
  | "approval_required"
  | "approved"
  | "executing"
  | "succeeded"
  | "failed"
  | "skipped"
  | "expired";

export type GovernedExecutionRiskLevel =
  | "safe"
  | "low"
  | "elevated"
  | "high"
  | "critical";

export interface GovernedToolExecutionRequest {
  executionId: string;
  requestId: string;
  approvalRequestId?: string;
  actionDigest: string;
  capability: GovernedExecutionCapability;
  title: string;
  target: string;
  parametersPreview: Record<string, unknown>;
  provenanceIds: string[];
  riskLevel: GovernedExecutionRiskLevel;
  status: GovernedExecutionStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  blockedBy?: string[];
  userSafeReason: string;
  dryRunOnly?: boolean;
}

export interface GovernedToolExecutionResult {
  executionId: string;
  requestId: string;
  status: GovernedExecutionStatus;
  resultSummary: string;
  resultPreview: Record<string, unknown>;
  startedAt: string;
  completedAt: string;
  consumedApproval: boolean;
  traceEventId?: string;
  inboxEventId?: string;
  blockedBy?: string[];
  errorMessage?: string;
}

export interface GovernedToolExecutionDiagnosticsSummary {
  totalExecutions: number;
  succeededExecutions: number;
  blockedExecutions: number;
  failedExecutions: number;
  queuedExecutions: number;
  lastExecutionAt?: string;
  safeExecutionEnabled: true;
  riskyExecutionEnabled: false;
}

export type GovernedExecutionPolicyDecision = {
  allowed: boolean;
  capability: GovernedExecutionCapability | null;
  riskLevel: GovernedExecutionRiskLevel;
  blockedBy: string[];
  userSafeReason: string;
};

export const GOVERNED_EXECUTION_ALLOWED_PANELS = [
  "control",
  "activity",
  "memory",
  "logs",
  "model-manager",
] as const;

export type GovernedExecutionAllowedPanel = typeof GOVERNED_EXECUTION_ALLOWED_PANELS[number];
