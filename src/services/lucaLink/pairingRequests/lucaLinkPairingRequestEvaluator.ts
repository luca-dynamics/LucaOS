import {
  createLucaLinkApprovalActionStatePreview,
  previewLucaLinkApprovalAction,
} from "../approvalActions";
import type { LucaLinkLinkedHostRecord, LucaLinkPermissionId } from "../lucaLinkLinkedHostRegistry";
import type {
  LucaLinkPairingApprovalPreview,
  LucaLinkPairingAuditPreview,
  LucaLinkPairingCodePreview,
  LucaLinkPairingDenialPreview,
  LucaLinkPairingDeviceCenterSummary,
  LucaLinkPairingExpirationPreview,
  LucaLinkPairingOperationCenterSummary,
  LucaLinkPairingRequest,
  LucaLinkPairingRequestMethod,
  LucaLinkPairingRequestPreview,
  LucaLinkPairingRequestSource,
} from "./lucaLinkPairingRequestTypes";
import {
  assertSafePairingCodePreview,
  createLucaLinkPairingRequestDraft,
  evaluateLucaLinkPairingDecision,
  getFictionalPairingDisplayCode,
  getLucaLinkPairingApprovalRequiredPermissions,
  getLucaLinkPairingBlockedPermissions,
  isLucaLinkPairingExpired,
  LUCA_LINK_PAIRING_PREVIEW_FLAGS,
} from "./lucaLinkPairingRequestPolicy";

const DEFAULT_NOW = "2026-06-09T00:00:00.000Z";

function createAuditPreview(
  request: LucaLinkPairingRequest,
  eventType: LucaLinkPairingAuditPreview["eventType"],
  generatedAt: string,
): LucaLinkPairingAuditPreview {
  return {
    eventType,
    requestId: request.requestId,
    sourceHostId: request.sourceHostId,
    targetHostId: request.targetHostId,
    generatedAt,
    durableAuditWritten: false,
    containsSecret: false,
    ...LUCA_LINK_PAIRING_PREVIEW_FLAGS,
  };
}

export function createLucaLinkPairingCodePreview(input: {
  request: Pick<LucaLinkPairingRequest, "method" | "requestId" | "expiresAt" | "requestedAt">;
  method?: LucaLinkPairingRequestMethod;
}): LucaLinkPairingCodePreview {
  const method = input.method ?? input.request.method;
  const displayCode = getFictionalPairingDisplayCode(method, input.request.requestId);
  const ttlSeconds = Math.max(
    0,
    Math.floor((Date.parse(input.request.expiresAt) - Date.parse(input.request.requestedAt)) / 1000),
  );
  return assertSafePairingCodePreview({
    method,
    displayCode,
    maskedCode: displayCode.replace(/[A-Z0-9](?=[A-Z0-9]{4})/g, "•"),
    qrPayloadPreview: `lucalink-preview:${method}:non-secret:${displayCode}:runtime-disabled`,
    expiresAt: input.request.expiresAt,
    ttlSeconds,
    singleUse: true,
    containsSecret: false,
    validForRuntimePairing: false,
    ...LUCA_LINK_PAIRING_PREVIEW_FLAGS,
  });
}

export function evaluateLucaLinkPairingRequest(input: {
  request: LucaLinkPairingRequest;
  nowIso?: string;
  hasPrimaryHost?: boolean;
}): LucaLinkPairingRequestPreview {
  const nowIso = input.nowIso ?? DEFAULT_NOW;
  const hasPrimaryHost = input.hasPrimaryHost ?? true;
  const expired = isLucaLinkPairingExpired(input.request, nowIso) || input.request.status === "expired";
  const blockedPermissions = getLucaLinkPairingBlockedPermissions(input.request.requestedPermissions);
  const approvalRequiredPermissions = getLucaLinkPairingApprovalRequiredPermissions(input.request.requestedPermissions);
  const request = {
    ...input.request,
    requestedPermissions: [...input.request.requestedPermissions],
    warnings: [...input.request.warnings],
    status: expired ? "expired" as const : input.request.status,
    requestedTrustState: input.request.requestedTrustState === "trusted_full" ? "trusted_limited" as const : input.request.requestedTrustState,
    ...LUCA_LINK_PAIRING_PREVIEW_FLAGS,
  };
  const decision = evaluateLucaLinkPairingDecision(request, { nowIso, hasPrimaryHost });
  return {
    request,
    decision,
    codePreview: createLucaLinkPairingCodePreview({ request }),
    blockedPermissions,
    approvalRequiredPermissions,
    expirationState: expired ? "expired" : "active",
    primaryHostReview: request.requiresPrimaryHostApproval ? (hasPrimaryHost ? "required" : "missing") : "not_required",
    runtimePairing: "disabled",
    noRealPairingStarted: true,
    auditPreview: createAuditPreview(request, "pairing_request_preview", nowIso),
    warnings: [...new Set([...request.warnings, "No real pairing has started."])],
    ...LUCA_LINK_PAIRING_PREVIEW_FLAGS,
  };
}

export function createLucaLinkPairingRequestPreview(input: {
  requestId: string;
  source: LucaLinkPairingRequestSource;
  targetHostId: string;
  method: LucaLinkPairingRequestMethod;
  requestedAt?: string;
  expiresAt?: string;
  requestedPermissions?: LucaLinkPermissionId[];
  hasPrimaryHost?: boolean;
}): LucaLinkPairingRequestPreview {
  const requestedAt = input.requestedAt ?? DEFAULT_NOW;
  const request = createLucaLinkPairingRequestDraft({
    requestId: input.requestId,
    source: input.source,
    targetHostId: input.targetHostId,
    method: input.method,
    requestedAt,
    expiresAt: input.expiresAt,
    requestedPermissions: input.requestedPermissions,
  });
  return evaluateLucaLinkPairingRequest({
    request,
    nowIso: requestedAt,
    hasPrimaryHost: input.hasPrimaryHost,
  });
}

function requestToApprovalHost(request: LucaLinkPairingRequest): LucaLinkLinkedHostRecord {
  const permissionState = createLucaLinkApprovalActionStatePreview({
    id: request.sourceHostId,
    displayName: request.displayName,
    deviceType: request.deviceType,
    hostType: "guest",
    platform: request.platform,
    connectionState: "pending_approval",
    trustState: "pending",
    permissionProfile: {
      permissions: request.requestedPermissions.map((permission) => ({
        id: permission,
        label: permission,
        description: `Requested ${permission} during pairing preview.`,
        sensitive: false,
        state: "requested" as const,
      })),
      allowedCount: 0,
      deniedCount: 0,
      pendingCount: request.requestedPermissions.length,
      sensitiveAllowedCount: 0,
    },
    isCurrentDevice: false,
    createdAt: Date.parse(request.requestedAt),
    updatedAt: Date.parse(request.requestedAt),
  });

  return {
    id: request.sourceHostId,
    displayName: request.displayName,
    deviceType: request.deviceType,
    hostType: "guest",
    platform: request.platform,
    connectionState: "pending_approval",
    trustState: "pending",
    permissionProfile: {
      permissions: request.requestedPermissions.map((permission) => ({
        id: permission,
        label: permission,
        description: `Requested ${permission} during pairing preview.`,
        sensitive: permissionState.approvalRequiredPermissions.includes(permission),
        state: "requested" as const,
      })),
      allowedCount: 0,
      deniedCount: 0,
      pendingCount: request.requestedPermissions.length,
      sensitiveAllowedCount: 0,
    },
    isCurrentDevice: false,
    createdAt: Date.parse(request.requestedAt),
    updatedAt: Date.parse(request.requestedAt),
  };
}

export function previewLucaLinkPairingApproval(input: {
  request: LucaLinkPairingRequest;
  nowIso?: string;
  hasPrimaryHost?: boolean;
}): LucaLinkPairingApprovalPreview {
  const evaluated = evaluateLucaLinkPairingRequest(input);
  const expired = evaluated.decision === "expired";
  const blocked = evaluated.decision === "blocked" || evaluated.primaryHostReview === "missing";
  const approvalActionPreview = !expired && !blocked
    ? previewLucaLinkApprovalAction({ host: requestToApprovalHost(evaluated.request), action: "approve_host" })
    : undefined;
  return {
    requestId: evaluated.request.requestId,
    status: expired ? "expired" : blocked ? "blocked" : "approved_preview",
    decision: expired ? "expired" : blocked ? "blocked" : "approval_required",
    requestedTrustState: evaluated.request.requestedTrustState,
    proposedTrustState: "trusted_limited",
    blockedPermissions: [
      ...new Set([
        ...evaluated.blockedPermissions,
        "remote_action" as const,
        "tool_execution" as const,
        "admin_trust" as const,
      ]),
    ],
    approvalRequiredPermissions: evaluated.approvalRequiredPermissions,
    requiresPrimaryHostApproval: true,
    requiresUserConfirmation: true,
    ...(approvalActionPreview ? { approvalActionPreview } : {}),
    transportStarted: false,
    registryMutated: false,
    ...LUCA_LINK_PAIRING_PREVIEW_FLAGS,
  };
}

export function previewLucaLinkPairingDenial(request: LucaLinkPairingRequest): LucaLinkPairingDenialPreview {
  return {
    requestId: request.requestId,
    status: "denied_preview",
    decision: "review_only",
    registryMutated: false,
    disconnected: false,
    ...LUCA_LINK_PAIRING_PREVIEW_FLAGS,
  };
}

export function previewLucaLinkPairingExpiration(request: LucaLinkPairingRequest): LucaLinkPairingExpirationPreview {
  return {
    requestId: request.requestId,
    status: "expired",
    decision: "expired",
    approvalBlocked: true,
    registryMutated: false,
    deleted: false,
    ...LUCA_LINK_PAIRING_PREVIEW_FLAGS,
  };
}

export function createLucaLinkPairingOperationCenterSummary(
  preview: LucaLinkPairingRequestPreview,
): LucaLinkPairingOperationCenterSummary {
  return {
    title: "LucaLink pairing request preview",
    description: `LucaLink pairing request preview: ${preview.decision.replace(/_/g, " ")}. Method: ${preview.request.method} preview. Trust: ${preview.request.requestedTrustState}. Runtime pairing: disabled. Side effects: none.`,
    decision: preview.decision,
    method: preview.request.method,
    requestedTrustState: preview.request.requestedTrustState,
    runtimePairing: "disabled",
    sideEffects: "none",
    previewOnly: true,
  };
}

export function createLucaLinkPairingDeviceCenterSummary(
  preview: LucaLinkPairingRequestPreview,
): LucaLinkPairingDeviceCenterSummary {
  return {
    title: "Pairing request",
    status: preview.request.status,
    decision: preview.decision,
    codePreview: preview.codePreview.displayCode,
    expiresAt: preview.request.expiresAt,
    primaryHostReviewRequired: preview.request.requiresPrimaryHostApproval,
    requestedTrustState: preview.request.requestedTrustState,
    sensitiveAccessCopy: "Sensitive access remains blocked.",
    runtimeCopy: "No real pairing started.",
    ...LUCA_LINK_PAIRING_PREVIEW_FLAGS,
  };
}
