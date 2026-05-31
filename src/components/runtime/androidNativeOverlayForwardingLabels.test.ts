import { describe, expect, it } from "vitest";
import {
  getAndroidNativeOverlayForwardingBoundaryLabels,
  getAndroidNativeOverlayForwardingKindLabel,
  getAndroidNativeOverlayForwardingSafetyFlagSummary,
  getAndroidNativeOverlayForwardingSourceLabel,
  getAndroidNativeOverlayForwardingStatusLabel,
  getAndroidNativeOverlayForwardingStatusTone,
  isAndroidNativeOverlayForwardingBlocked,
} from "./androidNativeOverlayForwardingLabels";
import type {
  NativeOverlayForwardingKind,
  NativeOverlayForwardingRecord,
  NativeOverlayForwardingSource,
  NativeOverlayForwardingStatus,
} from "../../types/androidNativeOverlayGovernance";

const STATUSES: NativeOverlayForwardingStatus[] = [
  "blocked_until_native_overlay_policy",
  "needs_explicit_forwarding_policy",
];

const SOURCES: NativeOverlayForwardingSource[] = [
  "overlay_chat",
  "overlay_chat_voice",
  "overlay_hologram_voice",
  "overlay_sentry_wake_word",
  "overlay_continuous_voice",
];

const KINDS: NativeOverlayForwardingKind[] = [
  "chat_message",
  "voice_transcript",
  "wake_word",
  "voice_command",
];

function makeRecord(
  overrides: Partial<NativeOverlayForwardingRecord> = {},
): NativeOverlayForwardingRecord {
  return {
    nativeOverlayForwardingId: "android-native-overlay-forwarding:test:abc123",
    surfaceId: "luca_overlay_plugin",
    source: "overlay_chat",
    kind: "chat_message",
    status: "needs_explicit_forwarding_policy",
    allowed: false,
    blockedBy: ["needs_explicit_forwarding_policy"],
    recommendedFutureApprovalCopy: "Allow Android native overlay forwarding?",
    timestamp: "2026-01-01T00:00:00.000Z",
    userSafeReason: "Native overlay forwarding needs policy.",
    governanceApplied: true,
    forwardingGateStubOnly: true,
    forwardingEnabled: false,
    nativePermissionRequested: false,
    voiceCaptureStarted: false,
    voiceCaptureStopped: false,
    executionChanged: false,
    toolExecutionEnabled: false,
    automationEnabled: false,
    externalActionEnabled: false,
    fileAccessEnabled: false,
    messagingEnabled: false,
    wirelessControlEnabled: false,
    walletPaymentEnabled: false,
    ...overrides,
  };
}

describe("androidNativeOverlayForwardingLabels", () => {
  it("labels every forwarding status as blocked/non-actionable", () => {
    for (const status of STATUSES) {
      expect(isAndroidNativeOverlayForwardingBlocked(status)).toBe(true);
      expect(getAndroidNativeOverlayForwardingStatusLabel(status).toLowerCase()).toContain("blocked");
      expect(getAndroidNativeOverlayForwardingStatusTone(status)).toBe("danger");
    }
  });

  it("maps forwarding source and kind labels", () => {
    for (const source of SOURCES) {
      expect(getAndroidNativeOverlayForwardingSourceLabel(source)).toBeTruthy();
    }
    for (const kind of KINDS) {
      expect(getAndroidNativeOverlayForwardingKindLabel(kind)).toBeTruthy();
    }
    expect(getAndroidNativeOverlayForwardingSourceLabel("overlay_sentry_wake_word")).toContain("Sentry");
    expect(getAndroidNativeOverlayForwardingKindLabel("wake_word")).toBe("Wake-word");
  });

  it("exposes fixed visibility-only boundary labels", () => {
    const labels = getAndroidNativeOverlayForwardingBoundaryLabels();
    expect(labels).toContain("Native overlay forwarding audit only");
    expect(labels).toContain("No lucaService forwarding");
    expect(labels).toContain("No Android permission request");
    expect(labels).toContain("No voice capture start/stop");
    expect(labels).toContain("No approve/forward/start-voice/stop-voice/request-permission controls");
    expect(labels).toContain("No tool execution");
    expect(labels).toContain("No screenshot/OCR/vision");
  });

  it("summarizes forwarding, permission, voice, and execution flags as false", () => {
    const summary = getAndroidNativeOverlayForwardingSafetyFlagSummary(makeRecord());
    for (const chip of summary) {
      expect(chip.endsWith("false")).toBe(true);
    }
    expect(summary).toContain("forwarding: false");
    expect(summary).toContain("native permission: false");
    expect(summary).toContain("voice started: false");
    expect(summary).toContain("voice stopped: false");
    expect(summary).toContain("tool execution: false");
  });
});
