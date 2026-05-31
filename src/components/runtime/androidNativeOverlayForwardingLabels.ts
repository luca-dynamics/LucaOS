import type {
  NativeOverlayForwardingKind,
  NativeOverlayForwardingRecord,
  NativeOverlayForwardingSource,
  NativeOverlayForwardingStatus,
} from "../../types/androidNativeOverlayGovernance";

export type AndroidNativeOverlayForwardingTone = "good" | "warn" | "danger" | "neutral" | "info";

export function getAndroidNativeOverlayForwardingStatusLabel(
  status: NativeOverlayForwardingStatus,
): string {
  switch (status) {
    case "blocked_until_native_overlay_policy": return "Blocked — native overlay policy required";
    case "needs_explicit_forwarding_policy": return "Blocked — explicit forwarding policy required";
  }
}

export function getAndroidNativeOverlayForwardingStatusTone(
  status: NativeOverlayForwardingStatus,
): AndroidNativeOverlayForwardingTone {
  switch (status) {
    case "blocked_until_native_overlay_policy":
    case "needs_explicit_forwarding_policy":
      return "danger";
  }
}

export function isAndroidNativeOverlayForwardingBlocked(
  status: NativeOverlayForwardingStatus,
): boolean {
  return status === "blocked_until_native_overlay_policy" || status === "needs_explicit_forwarding_policy";
}

export function getAndroidNativeOverlayForwardingSourceLabel(
  source: NativeOverlayForwardingSource,
): string {
  switch (source) {
    case "overlay_chat": return "Overlay chat";
    case "overlay_chat_voice": return "Overlay chat voice";
    case "overlay_hologram_voice": return "Overlay hologram voice";
    case "overlay_sentry_wake_word": return "Overlay Sentry wake-word";
    case "overlay_continuous_voice": return "Overlay continuous voice";
  }
}

export function getAndroidNativeOverlayForwardingKindLabel(
  kind: NativeOverlayForwardingKind,
): string {
  switch (kind) {
    case "chat_message": return "Chat message";
    case "voice_transcript": return "Voice transcript";
    case "wake_word": return "Wake-word";
    case "voice_command": return "Voice command";
  }
}

export function getAndroidNativeOverlayForwardingBoundaryLabels(): string[] {
  return [
    "Native overlay forwarding audit only",
    "No lucaService forwarding",
    "No Android permission request",
    "No voice capture start/stop",
    "No wake-word behavior change",
    "No native overlay/plugin/rendering behavior change",
    "No approve/forward/start-voice/stop-voice/request-permission controls",
    "No messaging execution",
    "No wireless/device control",
    "No file access",
    "No tool execution",
    "No browser automation",
    "No screenshot/OCR/vision",
    "No sensitive-surface enablement",
  ];
}

export function getAndroidNativeOverlayForwardingSafetyFlagSummary(
  record: NativeOverlayForwardingRecord,
): string[] {
  return [
    `forwarding: ${record.forwardingEnabled}`,
    `native permission: ${record.nativePermissionRequested}`,
    `voice started: ${record.voiceCaptureStarted}`,
    `voice stopped: ${record.voiceCaptureStopped}`,
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
