import type {
  OverlayCaptureActivationStatus,
  OverlayCaptureCapability,
  OverlayCaptureGateRecord,
  OverlayCaptureSurfaceId,
} from "../../types/overlayCaptureGovernance";

export type OverlayCaptureGateTone = "good" | "warn" | "danger" | "neutral" | "info";

export function getOverlayCaptureGateStatusLabel(
  status: OverlayCaptureActivationStatus,
): string {
  switch (status) {
    case "blocked_until_dedicated_policy": return "Blocked — dedicated policy required";
    case "needs_explicit_capture_policy": return "Blocked — explicit capture policy required";
  }
}

export function getOverlayCaptureGateStatusTone(
  status: OverlayCaptureActivationStatus,
): OverlayCaptureGateTone {
  switch (status) {
    case "blocked_until_dedicated_policy":
    case "needs_explicit_capture_policy":
      return "danger";
  }
}

export function isOverlayCaptureGateBlocked(
  status: OverlayCaptureActivationStatus,
): boolean {
  return status === "blocked_until_dedicated_policy" || status === "needs_explicit_capture_policy";
}

export function getOverlayCaptureSurfaceLabel(surfaceId: OverlayCaptureSurfaceId): string {
  switch (surfaceId) {
    case "presence_monitor": return "PresenceMonitor";
    case "screen_share": return "ScreenShare";
    case "vision_camera": return "VisionCameraModal";
    case "desktop_stream": return "DesktopStreamModal";
    case "luca_recorder": return "LucaRecorder";
  }
}

export function getOverlayCaptureKindSummary(captures: OverlayCaptureCapability[]): string {
  return captures.length > 0 ? captures.join(", ") : "unknown";
}

export function getOverlayCaptureGateBoundaryLabels(): string[] {
  return [
    "Capture gate audit only",
    "No capture start/stop",
    "No permission request",
    "No OverlayManager behavior change",
    "No capture overlay behavior change",
    "No approve/start/stop/capture controls",
    "No screenshot/OCR/vision",
    "No file access",
    "No messaging",
    "No wireless/device control",
    "No tool execution",
    "No sensitive-surface enablement",
  ];
}

export function getOverlayCaptureGateSafetyFlagSummary(
  record: OverlayCaptureGateRecord,
): string[] {
  return [
    `capture started: ${record.captureStarted}`,
    `capture stopped: ${record.captureStopped}`,
    `permission requested: ${record.capturePermissionRequested}`,
    `execution changed: ${record.executionChanged}`,
    `tool execution: ${record.toolExecutionEnabled}`,
    `automation: ${record.automationEnabled}`,
    `external action: ${record.externalActionEnabled}`,
    `file: ${record.fileAccessEnabled}`,
    `messaging: ${record.messagingEnabled}`,
    `wireless: ${record.wirelessControlEnabled}`,
    `wallet/payment: ${record.walletPaymentEnabled}`,
  ];
}
