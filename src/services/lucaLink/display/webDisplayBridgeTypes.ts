export const LUCA_LINK_WEB_DISPLAY_CONTENT_KINDS = [
  "web_url",
  "dashboard_panel",
  "visualcore_surface",
  "browser_snapshot",
  "presentation",
] as const;

export type LucaLinkWebDisplayContentKind =
  (typeof LUCA_LINK_WEB_DISPLAY_CONTENT_KINDS)[number];

export type LucaLinkWebDisplaySessionStatus =
  | "draft"
  | "approval_required"
  | "approved_preview"
  | "blocked"
  | "expired";

export type LucaLinkWebDisplayRiskLevel = "low" | "medium" | "high";
export type LucaLinkWebDisplayPrivacyLevel = "public" | "project" | "private";
export type LucaLinkWebDisplayMode = "read_only" | "presentation_only";

export const LUCA_LINK_WEB_DISPLAY_BLOCKED_ACTIONS = [
  "remote_click",
  "remote_type",
  "credential_injection",
  "dom_execution",
  "browser_automation",
  "file_upload",
  "file_download",
  "install",
  "shell",
  "payment",
  "device_control",
] as const;

export type LucaLinkWebDisplayBlockedAction =
  (typeof LUCA_LINK_WEB_DISPLAY_BLOCKED_ACTIONS)[number];

export interface LucaLinkWebDisplaySessionIntent {
  sessionId: string;
  requestedByHostId: string;
  targetHostId: string;
  title: string;
  urlPreview?: string;
  contentKind: LucaLinkWebDisplayContentKind;
  requestedCapability: "display.present";
  status: LucaLinkWebDisplaySessionStatus;
  riskLevel: LucaLinkWebDisplayRiskLevel;
  createdAt: string;
  expiresAt: string;
  privacyLevel: LucaLinkWebDisplayPrivacyLevel;
  hostApprovalRequired: true;
  sideEffectsPerformed: false;
  blockers: string[];
  warnings: string[];
}

export interface LucaLinkWebDisplayPreviewPayload {
  previewId: string;
  sessionId: string;
  title: string;
  contentKind: LucaLinkWebDisplayContentKind;
  sanitizedUrlPreview?: string;
  displayMode: LucaLinkWebDisplayMode;
  allowedActions: [];
  blockedActions: LucaLinkWebDisplayBlockedAction[];
  generatedAt: string;
  sideEffectsPerformed: false;
}

export interface LucaLinkWebDisplayBridgePolicyOptions {
  now?: string | Date;
  requestedActions?: readonly string[];
  explicitPrivateApproval?: boolean;
}

export interface LucaLinkWebDisplayBridgePolicyEvaluation {
  allowedForPreview: boolean;
  status: "approval_required" | "approved_preview" | "blocked" | "expired";
  sanitizedUrlPreview?: string;
  hostApprovalRequired: true;
  blockers: string[];
  warnings: string[];
  sideEffectsPerformed: false;
}

export interface LucaLinkWebDisplaySessionApproval {
  approvedByHostId: string;
  approvedAt: string;
  explicitPrivateApproval?: boolean;
}

export type LucaLinkWebDisplayBridgeAuditEventType =
  | "created"
  | "validated"
  | "approval_required"
  | "approved_preview"
  | "blocked"
  | "expired"
  | "preview_created";

export interface LucaLinkWebDisplayBridgeAuditRecord {
  auditId: string;
  sessionId: string;
  timestamp: string;
  eventType: LucaLinkWebDisplayBridgeAuditEventType;
  summary: string;
  riskLevel: LucaLinkWebDisplayRiskLevel;
  blockers: string[];
  warnings: string[];
  sideEffectsPerformed: false;
}
