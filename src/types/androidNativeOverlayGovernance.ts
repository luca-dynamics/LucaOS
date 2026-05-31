export type NativeOverlaySurfaceId = "luca_overlay_plugin";

export type NativeOverlayForwardingSource =
  | "overlay_chat"
  | "overlay_chat_voice"
  | "overlay_hologram_voice"
  | "overlay_sentry_wake_word"
  | "overlay_continuous_voice";

export type NativeOverlayForwardingKind =
  | "chat_message"
  | "voice_transcript"
  | "wake_word"
  | "voice_command";

export type NativeOverlayForwardingStatus =
  | "blocked_until_native_overlay_policy"
  | "needs_explicit_forwarding_policy";

export type NativeOverlayCapability =
  | "draws_over_other_apps"
  | "receives_voice"
  | "receives_chat"
  | "wake_word_listening"
  | "forwards_to_luca_service"
  | "operates_outside_main_window"
  | "requests_system_alert_window"
  | "bypasses_visualcore_governance";

export interface NativeOverlaySurfacePolicy {
  surfaceId: NativeOverlaySurfaceId;
  sourceFiles: string[];
  capabilities: NativeOverlayCapability[];
  forwardingSources: NativeOverlayForwardingSource[];
  forwardingKinds: NativeOverlayForwardingKind[];
  canForwardToLucaService: boolean;
  canRequestNativeOverlayPermission: boolean;
  mayStartVoiceCapture: boolean;
  mayUseWakeWordListening: boolean;
  operatesOutsideMainWindow: boolean;
  bypassesVisualCoreGovernance: boolean;
  needsDedicatedForwardingPolicy: boolean;
  defaultStatus: NativeOverlayForwardingStatus;
  recommendedFutureApprovalCopy: string;
  userSafeReason: string;
}

export interface NativeOverlayForwardingSafetyFlags {
  governanceApplied: true;
  forwardingGateStubOnly: true;
  forwardingEnabled: false;
  nativePermissionRequested: false;
  voiceCaptureStarted: false;
  voiceCaptureStopped: false;
  executionChanged: false;
  toolExecutionEnabled: false;
  automationEnabled: false;
  externalActionEnabled: false;
  fileAccessEnabled: false;
  messagingEnabled: false;
  wirelessControlEnabled: false;
  walletPaymentEnabled: false;
}

export interface NativeOverlayForwardingDecision extends NativeOverlayForwardingSafetyFlags {
  surfaceId: NativeOverlaySurfaceId;
  source: NativeOverlayForwardingSource;
  kind: NativeOverlayForwardingKind;
  status: NativeOverlayForwardingStatus;
  allowed: false;
  blockedBy: string[];
  userSafeReason: string;
}

export interface NativeOverlayForwardingRecord extends NativeOverlayForwardingDecision {
  nativeOverlayForwardingId: string;
  timestamp: string;
  recommendedFutureApprovalCopy: string;
}

export interface NativeOverlayForwardingDiagnosticsSummary extends NativeOverlayForwardingSafetyFlags {
  totalRecords: number;
  blockedUntilNativeOverlayPolicyAttempts: number;
  needsExplicitForwardingPolicyAttempts: number;
  lastAttemptAt: string | null;
  surfaces: NativeOverlaySurfaceId[];
}

export const NATIVE_OVERLAY_SURFACE_IDS: NativeOverlaySurfaceId[] = [
  "luca_overlay_plugin",
];

export const MAX_NATIVE_OVERLAY_FORWARDING_RECORDS = 100;
export const NATIVE_OVERLAY_FORWARDING_GATE_EVENT = "android_native_overlay_forwarding_gate";
