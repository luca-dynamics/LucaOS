import type {
  LucaLinkAdapterFileInstallPermissionDecision,
  LucaLinkAdapterFileInstallPermissionReadiness,
  LucaLinkAdapterFileInstallPermissionRequest,
} from "./adapterFileInstallPermissionTypes";

const CREATED_AT = "2026-06-07T12:00:00.000Z";
const TARGET_HOST_ID = "fixture-primary-host";

function request(
  input: Omit<LucaLinkAdapterFileInstallPermissionRequest, "adapterId" | "requestedByHostId" | "targetHostId" | "createdAt" | "sideEffectsPerformed" | "writeEnabled" | "installEnabled">,
): LucaLinkAdapterFileInstallPermissionRequest {
  return {
    adapterId: "lucalink.fixture-adapter",
    requestedByHostId: "fixture-companion-host",
    targetHostId: TARGET_HOST_ID,
    createdAt: CREATED_AT,
    ...input,
    sideEffectsPerformed: false,
    writeEnabled: false,
    installEnabled: false,
  };
}

export const LUCA_LINK_ADAPTER_FILE_INSTALL_READY_FOR_REVIEW_FIXTURE = request({
  requestId: "adapter-file-install:read-preview",
  operation: "file_read_preview",
  targetSummary: "Sanitized adapter manifest metadata preview.",
  riskLevel: "low",
  requiresApproval: false,
  warnings: ["Review readiness does not authorize file access."],
  blockers: [],
});

export const LUCA_LINK_ADAPTER_FILE_INSTALL_APPROVAL_REQUIRED_FIXTURE = request({
  requestId: "adapter-file-install:write-request",
  operation: "file_write_request",
  targetSummary: "Bounded adapter configuration write request metadata.",
  riskLevel: "high",
  requiresApproval: true,
  warnings: ["Approval is modeled only and does not enable a write."],
  blockers: [],
});

export const LUCA_LINK_ADAPTER_FILE_INSTALL_BLOCKED_FIXTURE = request({
  requestId: "adapter-file-install:package-request",
  operation: "package_install_request",
  targetSummary: "Fixture package installation request metadata.",
  packageSummary: "fixture-package@0.0.0",
  riskLevel: "critical",
  requiresApproval: true,
  warnings: [],
  blockers: ["Package installation remains blocked."],
});

export const LUCA_LINK_ADAPTER_FILE_INSTALL_UNSUPPORTED_FIXTURE = request({
  requestId: "adapter-file-install:unsupported-request",
  operation: "unsupported_operation",
  targetSummary: "Unsupported adapter mutation request metadata.",
  riskLevel: "high",
  requiresApproval: false,
  warnings: ["The requested operation is not supported by the model."],
  blockers: ["Unsupported operation cannot proceed."],
});

export const LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_REQUESTS = Object.freeze([
  LUCA_LINK_ADAPTER_FILE_INSTALL_READY_FOR_REVIEW_FIXTURE,
  LUCA_LINK_ADAPTER_FILE_INSTALL_APPROVAL_REQUIRED_FIXTURE,
  LUCA_LINK_ADAPTER_FILE_INSTALL_BLOCKED_FIXTURE,
  LUCA_LINK_ADAPTER_FILE_INSTALL_UNSUPPORTED_FIXTURE,
]);

function decision(
  request: LucaLinkAdapterFileInstallPermissionRequest,
  status: LucaLinkAdapterFileInstallPermissionDecision["status"],
  reason: string,
): LucaLinkAdapterFileInstallPermissionDecision {
  const isWrite = request.operation === "file_write_request";
  const isInstall = request.operation === "package_install_request";
  return {
    decisionId: `decision:${request.requestId}`,
    requestId: request.requestId,
    adapterId: request.adapterId,
    targetHostId: request.targetHostId,
    operation: request.operation,
    targetSummary: request.targetSummary,
    status,
    riskLevel: request.riskLevel,
    reason,
    requiredApprovals: request.requiresApproval ? ["explicit_primary_host_approval"] : [],
    blockedActions: [
      ...(isWrite ? ["file write"] : []),
      ...(isInstall ? ["package install"] : []),
      "adapter execution",
    ],
    warnings: [...request.warnings],
    blockers: [...request.blockers],
    createdAt: request.createdAt,
    expiresAt: request.expiresAt,
    sideEffectsPerformed: false,
    executionEnabled: false,
    canExecute: false,
    readyForExecution: false,
    writeEnabled: false,
    installEnabled: false,
    readyForLiveSend: false,
    liveCollectionEnabled: false,
  };
}

export const LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS = Object.freeze([
  decision(LUCA_LINK_ADAPTER_FILE_INSTALL_READY_FOR_REVIEW_FIXTURE, "ready_for_review", "Safe metadata is ready for read-only review."),
  decision(LUCA_LINK_ADAPTER_FILE_INSTALL_APPROVAL_REQUIRED_FIXTURE, "approval_required", "The modeled file write request requires explicit primary host approval."),
  decision(LUCA_LINK_ADAPTER_FILE_INSTALL_BLOCKED_FIXTURE, "blocked", "Package installation is blocked and cannot be enabled by this decision."),
  decision(LUCA_LINK_ADAPTER_FILE_INSTALL_UNSUPPORTED_FIXTURE, "unsupported", "The requested adapter mutation is unsupported."),
]);

const count = (status: LucaLinkAdapterFileInstallPermissionDecision["status"]) =>
  LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS.filter((item) => item.status === status).length;

export const LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_READINESS_FIXTURE: LucaLinkAdapterFileInstallPermissionReadiness = Object.freeze({
  totalRequests: LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_REQUESTS.length,
  readyForReviewCount: count("ready_for_review"),
  approvalRequiredCount: count("approval_required"),
  blockedCount: count("blocked"),
  unsupportedCount: count("unsupported"),
  readyForExecution: false,
  executionEnabled: false,
  canExecute: false,
  writeEnabled: false,
  installEnabled: false,
  readyForLiveSend: false,
  liveCollectionEnabled: false,
  sideEffectsPerformed: false,
  warnings: ["Review and approval statuses do not authorize file writes or installs."],
  blockers: ["File writes, package installation, and adapter execution remain disabled."],
});
