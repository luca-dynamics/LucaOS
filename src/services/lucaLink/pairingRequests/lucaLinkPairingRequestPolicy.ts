import type { LucaExperienceMode } from "../../../experience/experienceMode";
import {
  isLucaLinkPermissionSensitive,
  LUCA_LINK_PERMISSION_DEFINITIONS,
  type LucaLinkPermissionId,
} from "../lucaLinkLinkedHostRegistry";
import type {
  LucaLinkPairingCodePreview,
  LucaLinkPairingDisclosureSummary,
  LucaLinkPairingRequest,
  LucaLinkPairingRequestDecision,
  LucaLinkPairingRequestMethod,
  LucaLinkPairingRequestRisk,
  LucaLinkPairingRequestSource,
  LucaLinkPairingRequestStatus,
  LucaLinkPairingRequestPreview,
} from "./lucaLinkPairingRequestTypes";

export const LUCA_LINK_PAIRING_RUNTIME_DISABLED_PERMISSIONS: readonly LucaLinkPermissionId[] = [
  "remote_action",
  "tool_execution",
  "admin_trust",
];

export const LUCA_LINK_PAIRING_DEFAULT_TTL_SECONDS = 10 * 60;

export const LUCA_LINK_PAIRING_PREVIEW_FLAGS = {
  sideEffectsPerformed: false,
  previewOnly: true,
} as const;

export function isLucaLinkPairingExpired(
  request: Pick<LucaLinkPairingRequest, "expiresAt">,
  nowIso: string,
): boolean {
  return Date.parse(request.expiresAt) <= Date.parse(nowIso);
}

export function createPairingExpiration(requestedAt: string, ttlSeconds = LUCA_LINK_PAIRING_DEFAULT_TTL_SECONDS): string {
  return new Date(Date.parse(requestedAt) + ttlSeconds * 1000).toISOString();
}

export function getLucaLinkPairingRisk(permissions: readonly LucaLinkPermissionId[]): LucaLinkPairingRequestRisk {
  if (permissions.some((permission) => permission === "admin_trust")) return "critical";
  if (permissions.some((permission) => LUCA_LINK_PAIRING_RUNTIME_DISABLED_PERMISSIONS.includes(permission))) return "critical";
  if (permissions.some((permission) => isLucaLinkPermissionSensitive(permission))) return "high";
  if (permissions.includes("sync_memory")) return "medium";
  return "low";
}

export function getLucaLinkPairingBlockedPermissions(permissions: readonly LucaLinkPermissionId[]): LucaLinkPermissionId[] {
  return [...new Set(permissions.filter((permission) => LUCA_LINK_PAIRING_RUNTIME_DISABLED_PERMISSIONS.includes(permission)))] as LucaLinkPermissionId[];
}

export function getLucaLinkPairingApprovalRequiredPermissions(permissions: readonly LucaLinkPermissionId[]): LucaLinkPermissionId[] {
  return [
    ...new Set(
      permissions.filter(
        (permission) =>
          permission === "sync_memory" ||
          isLucaLinkPermissionSensitive(permission) ||
          LUCA_LINK_PAIRING_RUNTIME_DISABLED_PERMISSIONS.includes(permission),
      ),
    ),
  ] as LucaLinkPermissionId[];
}

export function normalizeLucaLinkPairingStatus(
  status: LucaLinkPairingRequestStatus | undefined,
  requiresPrimaryHostApproval: boolean,
): LucaLinkPairingRequestStatus {
  if (status && status !== "draft") return status;
  return requiresPrimaryHostApproval ? "awaiting_primary_host" : "pending";
}

export function createSafePairingWarnings(permissions: readonly LucaLinkPermissionId[]): string[] {
  const warnings = [
    "Preview only: no real pairing, linked-host registry write, transport, socket, WebRTC, or network discovery starts.",
    "Preview codes are fictional, non-secret, single-use model contracts and are not valid for runtime pairing.",
  ];
  if (permissions.some((permission) => LUCA_LINK_PAIRING_RUNTIME_DISABLED_PERMISSIONS.includes(permission))) {
    warnings.push("remote_action, tool_execution, and admin_trust remain runtime-disabled and cannot be granted by pairing.");
  }
  if (permissions.includes("sync_memory")) {
    warnings.push("Memory sync requires later explicit approval and does not sync memory in this preview.");
  }
  return warnings;
}

export function evaluateLucaLinkPairingDecision(
  request: LucaLinkPairingRequest,
  options: { nowIso: string; hasPrimaryHost: boolean },
): LucaLinkPairingRequestDecision {
  if (["unsupported"].includes(request.status)) return "unsupported";
  if (request.status === "blocked") return "blocked";
  if (isLucaLinkPairingExpired(request, options.nowIso) || request.status === "expired") return "expired";
  if (!options.hasPrimaryHost && request.requiresPrimaryHostApproval) return "review_only";
  if (request.requiresPrimaryHostApproval || request.requiresUserConfirmation) return "approval_required";
  return "allowed";
}

function sanitizeCodeSeed(seed: string): string {
  const digits = seed.replace(/\D/g, "").slice(-4).padStart(4, "0");
  return digits === "0000" ? "4281" : digits;
}

export function getFictionalPairingDisplayCode(method: LucaLinkPairingRequestMethod, requestId: string): string {
  const suffix = sanitizeCodeSeed(requestId);
  if (method === "short_code") return `PAIR-PREVIEW-${suffix}`;
  if (method === "manual_code") return `MANUAL-PREVIEW-${suffix}`;
  return `LUCALINK-DEMO-${suffix}`;
}

export function maskLucaLinkPairingCode(code: string): string {
  const last = code.slice(-4);
  return `${code.slice(0, Math.max(0, code.length - 4)).replace(/[A-Z0-9]/g, "•")}${last}`;
}

export function assertSafePairingCodePreview(preview: LucaLinkPairingCodePreview): LucaLinkPairingCodePreview {
  return {
    ...preview,
    singleUse: true,
    containsSecret: false,
    validForRuntimePairing: false,
    ...LUCA_LINK_PAIRING_PREVIEW_FLAGS,
  };
}

export function createLucaLinkPairingRequestDraft(input: {
  requestId: string;
  source: LucaLinkPairingRequestSource;
  targetHostId: string;
  method: LucaLinkPairingRequestMethod;
  requestedAt: string;
  expiresAt?: string;
  requestedPermissions?: LucaLinkPermissionId[];
  requiresPrimaryHostApproval?: boolean;
  requiresUserConfirmation?: boolean;
  status?: LucaLinkPairingRequestStatus;
}): LucaLinkPairingRequest {
  const permissions = input.requestedPermissions ?? ["read_presence", "sync_context"];
  const requiresPrimaryHostApproval = input.requiresPrimaryHostApproval ?? true;
  const requiresUserConfirmation = input.requiresUserConfirmation ?? true;
  const status = normalizeLucaLinkPairingStatus(input.status, requiresPrimaryHostApproval);
  return {
    requestId: input.requestId,
    sourceHostId: input.source.hostId,
    targetHostId: input.targetHostId,
    displayName: input.source.displayName,
    deviceType: input.source.deviceType,
    hostType: input.source.hostType,
    platform: input.source.platform,
    method: input.method,
    status,
    requestedAt: input.requestedAt,
    expiresAt: input.expiresAt ?? createPairingExpiration(input.requestedAt),
    requestedPermissions: [...permissions],
    requestedTrustState: "trusted_limited",
    requestedConnectionState: "pending_approval",
    requiresPrimaryHostApproval,
    requiresUserConfirmation,
    risk: getLucaLinkPairingRisk(permissions),
    reason: requiresPrimaryHostApproval
      ? "New LucaLink pairing requests default to Primary Host review and limited trust."
      : "New LucaLink pairing request preview requires user confirmation before any future runtime implementation.",
    warnings: createSafePairingWarnings(permissions),
    ...LUCA_LINK_PAIRING_PREVIEW_FLAGS,
  };
}

export function getPermissionLabels(permissions: readonly LucaLinkPermissionId[]): string[] {
  return permissions.map((permission) => LUCA_LINK_PERMISSION_DEFINITIONS[permission]?.label ?? permission);
}

function maskIdentifier(id: string): string {
  if (id.length <= 8) return "hidden";
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

export function createLucaLinkPairingDisclosureSummary(
  preview: LucaLinkPairingRequestPreview,
  mode: LucaExperienceMode,
): LucaLinkPairingDisclosureSummary {
  const base = {
    mode,
    title: "Pairing request",
    simpleStatus: preview.decision === "expired" ? "Expired" : preview.decision === "blocked" ? "Blocked" : "Primary Host approval required",
    codePreview: preview.codePreview.displayCode,
    expiration: preview.request.expiresAt,
    primaryHostApproval: preview.primaryHostReview === "missing" ? "Primary Host missing; review cannot complete." : "Primary Host approval required.",
    trustCopy: "Limited trust only.",
    runtimeCopy: "No real pairing started.",
  } satisfies LucaLinkPairingDisclosureSummary;

  if (mode === "basic") return base;

  if (mode === "pro") {
    return {
      ...base,
      requestMethod: preview.request.method,
      deviceType: preview.request.deviceType,
      hostType: preview.request.hostType,
      requestedTrustState: preview.request.requestedTrustState,
      requestedPermissionsCount: preview.request.requestedPermissions.length,
      expirationState: preview.expirationState,
      approvalPreviewState: preview.request.status,
    };
  }

  return {
    ...base,
    requestMethod: preview.request.method,
    deviceType: preview.request.deviceType,
    hostType: preview.request.hostType,
    requestedTrustState: preview.request.requestedTrustState,
    requestedPermissionsCount: preview.request.requestedPermissions.length,
    expirationState: preview.expirationState,
    approvalPreviewState: preview.request.status,
    diagnosticRequestId: maskIdentifier(preview.request.requestId),
    diagnosticSourceHostId: maskIdentifier(preview.request.sourceHostId),
    diagnosticTargetHostId: maskIdentifier(preview.request.targetHostId),
    qrPayloadPreview: preview.codePreview.qrPayloadPreview,
    auditPreview: [preview.auditPreview.eventType, "durableAuditWritten:false", "containsSecret:false"],
    modelFlags: [
      `sideEffectsPerformed:${preview.sideEffectsPerformed}`,
      `previewOnly:${preview.previewOnly}`,
      `validForRuntimePairing:${preview.codePreview.validForRuntimePairing}`,
    ],
  };
}
