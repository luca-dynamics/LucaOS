import type { LucaExperienceMode } from "../../../experience/experienceMode";
import type {
  LucaLinkLinkedHostConnectionState,
  LucaLinkLinkedHostDeviceType,
  LucaLinkLinkedHostTrustState,
  LucaLinkPermissionId,
} from "../lucaLinkLinkedHostRegistry";
import type { LucaLinkApprovalActionPreview } from "../approvalActions";

export type LucaLinkPairingRequestMethod =
  | "qr_code"
  | "short_code"
  | "manual_code"
  | "nearby_preview"
  | "link_token_preview";

export type LucaLinkPairingRequestStatus =
  | "draft"
  | "pending"
  | "awaiting_primary_host"
  | "approved_preview"
  | "denied_preview"
  | "expired"
  | "revoked"
  | "blocked"
  | "unsupported";

export type LucaLinkPairingRequestDecision =
  | "allowed"
  | "approval_required"
  | "blocked"
  | "expired"
  | "unsupported"
  | "review_only";

export type LucaLinkPairingRequestRisk = "low" | "medium" | "high" | "critical";

export interface LucaLinkPairingRequestSource {
  hostId: string;
  displayName: string;
  deviceType: LucaLinkLinkedHostDeviceType;
  hostType: "primary_host" | "active_companion" | "display_surface" | "browser_host" | "wearable" | "unknown";
  platform: string;
  isPrimaryHost?: boolean;
}

export interface LucaLinkPairingRequest {
  requestId: string;
  sourceHostId: string;
  targetHostId: string;
  displayName: string;
  deviceType: LucaLinkLinkedHostDeviceType;
  hostType: LucaLinkPairingRequestSource["hostType"];
  platform: string;
  method: LucaLinkPairingRequestMethod;
  status: LucaLinkPairingRequestStatus;
  requestedAt: string;
  expiresAt: string;
  requestedPermissions: LucaLinkPermissionId[];
  requestedTrustState: LucaLinkLinkedHostTrustState;
  requestedConnectionState: LucaLinkLinkedHostConnectionState;
  requiresPrimaryHostApproval: boolean;
  requiresUserConfirmation: boolean;
  risk: LucaLinkPairingRequestRisk;
  reason: string;
  warnings: string[];
  sideEffectsPerformed: false;
  previewOnly: true;
}

export interface LucaLinkPairingCodePreview {
  method: LucaLinkPairingRequestMethod;
  displayCode: string;
  maskedCode: string;
  qrPayloadPreview: string;
  expiresAt: string;
  ttlSeconds: number;
  singleUse: true;
  containsSecret: false;
  validForRuntimePairing: false;
  sideEffectsPerformed: false;
  previewOnly: true;
}

export interface LucaLinkPairingAuditPreview {
  eventType: "pairing_request_preview" | "pairing_approval_preview" | "pairing_denial_preview" | "pairing_expiration_preview";
  requestId: string;
  sourceHostId: string;
  targetHostId: string;
  generatedAt: string;
  durableAuditWritten: false;
  containsSecret: false;
  sideEffectsPerformed: false;
  previewOnly: true;
}

export interface LucaLinkPairingRequestPreview {
  request: LucaLinkPairingRequest;
  decision: LucaLinkPairingRequestDecision;
  codePreview: LucaLinkPairingCodePreview;
  blockedPermissions: LucaLinkPermissionId[];
  approvalRequiredPermissions: LucaLinkPermissionId[];
  expirationState: "active" | "expired";
  primaryHostReview: "required" | "missing" | "not_required";
  runtimePairing: "disabled";
  noRealPairingStarted: true;
  auditPreview: LucaLinkPairingAuditPreview;
  warnings: string[];
  sideEffectsPerformed: false;
  previewOnly: true;
}

export interface LucaLinkPairingApprovalPreview {
  requestId: string;
  status: "approved_preview" | "blocked" | "expired";
  decision: LucaLinkPairingRequestDecision;
  requestedTrustState: LucaLinkLinkedHostTrustState;
  proposedTrustState: "trusted_limited";
  blockedPermissions: LucaLinkPermissionId[];
  approvalRequiredPermissions: LucaLinkPermissionId[];
  requiresPrimaryHostApproval: boolean;
  requiresUserConfirmation: boolean;
  approvalActionPreview?: LucaLinkApprovalActionPreview;
  transportStarted: false;
  registryMutated: false;
  sideEffectsPerformed: false;
  previewOnly: true;
}

export interface LucaLinkPairingExpirationPreview {
  requestId: string;
  status: "expired";
  decision: "expired";
  approvalBlocked: true;
  registryMutated: false;
  deleted: false;
  sideEffectsPerformed: false;
  previewOnly: true;
}

export interface LucaLinkPairingDenialPreview {
  requestId: string;
  status: "denied_preview";
  decision: "review_only";
  registryMutated: false;
  disconnected: false;
  sideEffectsPerformed: false;
  previewOnly: true;
}

export interface LucaLinkPairingDisclosureSummary {
  mode: LucaExperienceMode;
  title: string;
  simpleStatus: string;
  codePreview: string;
  expiration: string;
  primaryHostApproval: string;
  trustCopy: string;
  runtimeCopy: string;
  requestMethod?: LucaLinkPairingRequestMethod;
  deviceType?: LucaLinkLinkedHostDeviceType;
  hostType?: LucaLinkPairingRequestSource["hostType"];
  requestedTrustState?: LucaLinkLinkedHostTrustState;
  requestedPermissionsCount?: number;
  expirationState?: "active" | "expired";
  approvalPreviewState?: LucaLinkPairingRequestStatus;
  diagnosticRequestId?: string;
  diagnosticSourceHostId?: string;
  diagnosticTargetHostId?: string;
  qrPayloadPreview?: string;
  auditPreview?: string[];
  modelFlags?: string[];
}

export interface LucaLinkPairingOperationCenterSummary {
  title: string;
  description: string;
  decision: LucaLinkPairingRequestDecision;
  method: LucaLinkPairingRequestMethod;
  requestedTrustState: LucaLinkLinkedHostTrustState;
  runtimePairing: "disabled";
  sideEffects: "none";
  previewOnly: true;
}

export interface LucaLinkPairingDeviceCenterSummary {
  title: string;
  status: LucaLinkPairingRequestStatus;
  decision: LucaLinkPairingRequestDecision;
  codePreview: string;
  expiresAt: string;
  primaryHostReviewRequired: boolean;
  requestedTrustState: LucaLinkLinkedHostTrustState;
  sensitiveAccessCopy: string;
  runtimeCopy: string;
  sideEffectsPerformed: false;
  previewOnly: true;
}
