export type LucaLinkAdapterFileInstallOperation =
  | "file_read_preview"
  | "file_write_request"
  | "package_install_request"
  | "unsupported_operation";

export type LucaLinkAdapterFileInstallRiskLevel = "low" | "medium" | "high" | "critical";

export type LucaLinkAdapterFileInstallPermissionDecisionStatus =
  | "ready_for_review"
  | "approval_required"
  | "blocked"
  | "unsupported";

export interface LucaLinkAdapterFileInstallPermissionRequest {
  requestId: string;
  adapterId: string;
  requestedByHostId: string;
  targetHostId: string;
  operation: LucaLinkAdapterFileInstallOperation;
  targetSummary: string;
  packageSummary?: string;
  riskLevel: LucaLinkAdapterFileInstallRiskLevel;
  createdAt: string;
  expiresAt?: string;
  requiresApproval: boolean;
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
  writeEnabled: false;
  installEnabled: false;
}

export interface LucaLinkAdapterFileInstallPermissionDecision {
  decisionId: string;
  requestId: string;
  adapterId: string;
  targetHostId: string;
  operation: LucaLinkAdapterFileInstallOperation;
  targetSummary: string;
  status: LucaLinkAdapterFileInstallPermissionDecisionStatus;
  riskLevel: LucaLinkAdapterFileInstallRiskLevel;
  reason: string;
  requiredApprovals: string[];
  blockedActions: string[];
  warnings: string[];
  blockers: string[];
  createdAt: string;
  expiresAt?: string;
  sideEffectsPerformed: false;
  executionEnabled: false;
  canExecute: false;
  readyForExecution: false;
  writeEnabled: false;
  installEnabled: false;
}

export interface LucaLinkAdapterFileInstallPermissionReadiness {
  totalRequests: number;
  readyForReviewCount: number;
  approvalRequiredCount: number;
  blockedCount: number;
  unsupportedCount: number;
  readyForExecution: false;
  executionEnabled: false;
  canExecute: false;
  writeEnabled: false;
  installEnabled: false;
  sideEffectsPerformed: false;
  warnings: string[];
  blockers: string[];
}
