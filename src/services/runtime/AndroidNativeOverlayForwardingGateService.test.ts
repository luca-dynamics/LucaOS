import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_NATIVE_OVERLAY_FORWARDING_RECORDS,
} from "../../types/androidNativeOverlayGovernance";
import { AndroidNativeOverlayForwardingGateService } from "./AndroidNativeOverlayForwardingGateService";

function makeService() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
  };
  const bus = { emit: vi.fn(), emitEvent: vi.fn() };
  return new AndroidNativeOverlayForwardingGateService({ storage, bus });
}

describe("AndroidNativeOverlayForwardingGateService", () => {
  let service: AndroidNativeOverlayForwardingGateService;

  beforeEach(() => {
    service = makeService();
  });

  it("records every forwarding attempt as blocked/stub-only", () => {
    const records = [
      service.recordForwardingAttempt("overlay_chat", "chat_message"),
      service.recordForwardingAttempt("overlay_chat_voice", "voice_transcript"),
      service.recordForwardingAttempt("overlay_hologram_voice", "voice_command"),
      service.recordForwardingAttempt("overlay_sentry_wake_word", "wake_word"),
    ];

    for (const record of records) {
      expect(record.surfaceId).toBe("luca_overlay_plugin");
      expect(record.allowed).toBe(false);
      expect(["blocked_until_native_overlay_policy", "needs_explicit_forwarding_policy"]).toContain(record.status);
      expect(record.blockedBy).toContain(record.status);
      expect(record.forwardingGateStubOnly).toBe(true);
      expect(record.forwardingEnabled).toBe(false);
    }
  });

  it("bounds retained records", () => {
    for (let i = 0; i < MAX_NATIVE_OVERLAY_FORWARDING_RECORDS + 25; i += 1) {
      service.recordForwardingAttempt("overlay_chat", "chat_message");
    }
    expect(service.listRecords()).toHaveLength(MAX_NATIVE_OVERLAY_FORWARDING_RECORDS);
    expect(service.getDiagnosticsSummary().totalRecords).toBe(MAX_NATIVE_OVERLAY_FORWARDING_RECORDS);
  });

  it("counts diagnostics by blocked status", () => {
    service.recordForwardingAttempt("overlay_chat", "chat_message");
    service.recordForwardingAttempt("overlay_chat_voice", "voice_transcript");
    service.recordForwardingAttempt("overlay_hologram_voice", "voice_command");

    const summary = service.getDiagnosticsSummary();
    expect(summary.totalRecords).toBe(3);
    expect(summary.needsExplicitForwardingPolicyAttempts).toBe(2);
    expect(summary.blockedUntilNativeOverlayPolicyAttempts).toBe(1);
    expect(summary.surfaces).toEqual(["luca_overlay_plugin"]);
  });

  it("keeps every dangerous safety flag false", () => {
    const record = service.recordForwardingAttempt("overlay_continuous_voice", "voice_command");
    const summary = service.getDiagnosticsSummary();

    for (const flags of [record, summary]) {
      expect(flags.governanceApplied).toBe(true);
      expect(flags.forwardingGateStubOnly).toBe(true);
      expect(flags.forwardingEnabled).toBe(false);
      expect(flags.nativePermissionRequested).toBe(false);
      expect(flags.voiceCaptureStarted).toBe(false);
      expect(flags.voiceCaptureStopped).toBe(false);
      expect(flags.executionChanged).toBe(false);
      expect(flags.toolExecutionEnabled).toBe(false);
      expect(flags.automationEnabled).toBe(false);
      expect(flags.externalActionEnabled).toBe(false);
      expect(flags.fileAccessEnabled).toBe(false);
      expect(flags.messagingEnabled).toBe(false);
      expect(flags.wirelessControlEnabled).toBe(false);
      expect(flags.walletPaymentEnabled).toBe(false);
    }
  });

  it("exposes no forwarding, voice, permission, or execution methods", () => {
    const methods = Object.getOwnPropertyNames(
      Object.getPrototypeOf(service),
    ).filter((name) => name !== "constructor" && !name.startsWith("#"));

    expect(methods.sort()).toEqual(
      ["getDiagnosticsSummary", "listRecords", "recordForwardingAttempt"].sort(),
    );
    for (const forbidden of ["forward", "startVoice", "stopVoice", "requestPermission", "execute"]) {
      expect(methods).not.toContain(forbidden);
    }
  });
});
