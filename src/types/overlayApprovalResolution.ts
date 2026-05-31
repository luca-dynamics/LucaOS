export type OverlayApprovalResolutionSource = "voice_hud" | "security_gate";

export type OverlayApprovalResolutionDecision = "approve" | "deny";

export type OverlayApprovalResolutionStatus =
  | "recorded"
  | "resolved"
  | "blocked_no_pending_request"
  | "blocked_unrecognized_decision";

export interface OverlayApprovalResolutionSafetyFlags {
  governanceApplied: true;
  approvalResolutionOnly: true;
  executionChanged: false;
  toolExecutionEnabled: false;
  captureEnabled: false;
  automationEnabled: false;
  externalActionEnabled: false;
  fileAccessEnabled: false;
  messagingEnabled: false;
  wirelessControlEnabled: false;
  walletPaymentEnabled: false;
  sensitiveSurfaceEnabled: false;
}

export interface OverlayApprovalResolutionRecord extends OverlayApprovalResolutionSafetyFlags {
  approvalResolutionId: string;
  source: OverlayApprovalResolutionSource;
  decision: OverlayApprovalResolutionDecision | "unknown";
  status: OverlayApprovalResolutionStatus;
  timestamp: string;
  userSafeReason: string;
  blockedBy?: string[];
}

export interface OverlayApprovalResolutionDiagnosticsSummary extends OverlayApprovalResolutionSafetyFlags {
  totalRecords: number;
  recordedAttempts: number;
  resolvedAttempts: number;
  blockedNoPendingRequestAttempts: number;
  blockedUnrecognizedDecisionAttempts: number;
  voiceHudAttempts: number;
  securityGateAttempts: number;
  lastResolutionAt: string | null;
}

export const MAX_OVERLAY_APPROVAL_RESOLUTIONS = 100;
export const OVERLAY_APPROVAL_RESOLUTION_EVENT = "overlay_approval_resolution";
