import { describe, expect, it } from "vitest";
import {
  NATIVE_OVERLAY_SURFACE_IDS,
  type NativeOverlayForwardingKind,
  type NativeOverlayForwardingSource,
} from "../../types/androidNativeOverlayGovernance";
import {
  assertKnownAndroidNativeOverlayMap,
  getAndroidNativeOverlayForwardingDecision,
  getAndroidNativeOverlayGovernanceSummary,
  getAndroidNativeOverlayPolicy,
  listAndroidNativeOverlayPolicies,
} from "./AndroidNativeOverlayGovernancePolicy";

describe("AndroidNativeOverlayGovernancePolicy", () => {
  it("maps the Android native overlay surface", () => {
    const policies = listAndroidNativeOverlayPolicies();
    expect(policies).toHaveLength(NATIVE_OVERLAY_SURFACE_IDS.length);
    expect(policies.map((policy) => policy.surfaceId)).toEqual(NATIVE_OVERLAY_SURFACE_IDS);
    expect(assertKnownAndroidNativeOverlayMap()).toBe(true);
  });

  it("describes native overlay capabilities and source files", () => {
    const policy = getAndroidNativeOverlayPolicy("luca_overlay_plugin");
    expect(policy.sourceFiles).toEqual([
      "src/plugins/luca-overlay/index.ts",
      "src/services/overlayService.ts",
      "src/services/overlayIntegration.ts",
    ]);
    expect(policy.capabilities).toEqual(expect.arrayContaining([
      "draws_over_other_apps",
      "receives_voice",
      "receives_chat",
      "wake_word_listening",
      "forwards_to_luca_service",
      "operates_outside_main_window",
      "requests_system_alert_window",
      "bypasses_visualcore_governance",
    ]));
    expect(policy.canForwardToLucaService).toBe(true);
    expect(policy.canRequestNativeOverlayPermission).toBe(true);
    expect(policy.mayStartVoiceCapture).toBe(true);
    expect(policy.mayUseWakeWordListening).toBe(true);
    expect(policy.needsDedicatedForwardingPolicy).toBe(true);
  });

  it("blocks every forwarding source/kind decision", () => {
    const sources: NativeOverlayForwardingSource[] = [
      "overlay_chat",
      "overlay_chat_voice",
      "overlay_hologram_voice",
      "overlay_sentry_wake_word",
      "overlay_continuous_voice",
    ];
    const kinds: NativeOverlayForwardingKind[] = [
      "chat_message",
      "voice_transcript",
      "wake_word",
      "voice_command",
    ];

    for (const source of sources) {
      for (const kind of kinds) {
        const decision = getAndroidNativeOverlayForwardingDecision(source, kind);
        expect(decision.allowed).toBe(false);
        expect(["blocked_until_native_overlay_policy", "needs_explicit_forwarding_policy"]).toContain(decision.status);
        expect(decision.blockedBy).toContain(decision.status);
      }
    }
  });

  it("summarizes native overlay governance without enabling forwarding", () => {
    const summary = getAndroidNativeOverlayGovernanceSummary();
    expect(summary.totalSurfaces).toBe(1);
    expect(summary.mappedSurfaces).toEqual(["luca_overlay_plugin"]);
    expect(summary.capabilities).toContain("draws_over_other_apps");
    expect(summary.capabilities).toContain("forwards_to_luca_service");
    expect(summary.bypassesVisualCoreGovernance).toBe(true);
    expect(summary.needsDedicatedForwardingPolicy).toBe(true);
  });
});
