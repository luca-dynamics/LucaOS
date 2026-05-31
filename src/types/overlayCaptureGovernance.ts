export type OverlayCaptureSurfaceId =
  | "presence_monitor"
  | "screen_share"
  | "vision_camera"
  | "desktop_stream"
  | "luca_recorder";

export type OverlayCaptureCapability =
  | "camera"
  | "screen"
  | "audio"
  | "recording"
  | "desktop_stream";

export type OverlayCaptureRiskLevel = "high" | "critical";

export type OverlayCaptureActivationStatus =
  | "blocked_until_dedicated_policy"
  | "needs_explicit_capture_policy";

export interface OverlayCaptureSurfacePolicy {
  surfaceId: OverlayCaptureSurfaceId;
  sourceComponent: string;
  captures: OverlayCaptureCapability[];
  riskLevel: OverlayCaptureRiskLevel;
  canBypassVisualCoreGovernance: boolean;
  canInvokeTools: boolean;
  needsExplicitActivationGate: boolean;
  activationStatus: OverlayCaptureActivationStatus;
  recommendedFutureApprovalCopy: string;
  userSafeReason: string;
}

export interface OverlayCaptureActivationSafetyFlags {
  governanceApplied: true;
  activationGateStubOnly: true;
  captureStarted: false;
  captureStopped: false;
  capturePermissionRequested: false;
  executionChanged: false;
  toolExecutionEnabled: false;
  automationEnabled: false;
  externalActionEnabled: false;
  fileAccessEnabled: false;
  messagingEnabled: false;
  wirelessControlEnabled: false;
  walletPaymentEnabled: false;
}

export interface OverlayCaptureGateDecision extends OverlayCaptureActivationSafetyFlags {
  surfaceId: OverlayCaptureSurfaceId;
  status: OverlayCaptureActivationStatus;
  allowed: false;
  blockedBy: string[];
  userSafeReason: string;
}

export interface OverlayCaptureGateRecord extends OverlayCaptureGateDecision {
  captureGateRecordId: string;
  sourceComponent: string;
  captures: OverlayCaptureCapability[];
  riskLevel: OverlayCaptureRiskLevel;
  canBypassVisualCoreGovernance: boolean;
  canInvokeTools: boolean;
  needsExplicitActivationGate: boolean;
  recommendedFutureApprovalCopy: string;
  timestamp: string;
}

export interface OverlayCaptureGateDiagnosticsSummary extends OverlayCaptureActivationSafetyFlags {
  totalRecords: number;
  blockedUntilDedicatedPolicyAttempts: number;
  needsExplicitCapturePolicyAttempts: number;
  lastAttemptAt: string | null;
  surfaces: OverlayCaptureSurfaceId[];
}

export const OVERLAY_CAPTURE_SURFACE_IDS: OverlayCaptureSurfaceId[] = [
  "presence_monitor",
  "screen_share",
  "vision_camera",
  "desktop_stream",
  "luca_recorder",
];

export const MAX_OVERLAY_CAPTURE_GATE_RECORDS = 100;
export const OVERLAY_CAPTURE_GATE_EVENT = "overlay_capture_activation_gate";
