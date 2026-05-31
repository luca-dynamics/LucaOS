import {
  NATIVE_OVERLAY_SURFACE_IDS,
  type NativeOverlayForwardingKind,
  type NativeOverlayForwardingSource,
  type NativeOverlaySurfaceId,
  type NativeOverlaySurfacePolicy,
} from "../../types/androidNativeOverlayGovernance";

const POLICY: NativeOverlaySurfacePolicy = {
  surfaceId: "luca_overlay_plugin",
  sourceFiles: [
    "src/plugins/luca-overlay/index.ts",
    "src/services/overlayService.ts",
    "src/services/overlayIntegration.ts",
  ],
  capabilities: [
    "draws_over_other_apps",
    "receives_voice",
    "receives_chat",
    "wake_word_listening",
    "forwards_to_luca_service",
    "operates_outside_main_window",
    "requests_system_alert_window",
    "bypasses_visualcore_governance",
  ],
  forwardingSources: [
    "overlay_chat",
    "overlay_chat_voice",
    "overlay_hologram_voice",
    "overlay_sentry_wake_word",
    "overlay_continuous_voice",
  ],
  forwardingKinds: ["chat_message", "voice_transcript", "wake_word", "voice_command"],
  canForwardToLucaService: true,
  canRequestNativeOverlayPermission: true,
  mayStartVoiceCapture: true,
  mayUseWakeWordListening: true,
  operatesOutsideMainWindow: true,
  bypassesVisualCoreGovernance: true,
  needsDedicatedForwardingPolicy: true,
  defaultStatus: "blocked_until_native_overlay_policy",
  recommendedFutureApprovalCopy: "Allow the Android native overlay to forward this voice/chat input to LucaService?",
  userSafeReason: "The Android LucaOverlay subsystem can draw over other apps and forward voice/chat outside VisualCore, so forwarding stays blocked until a dedicated native-overlay policy exists.",
};

const SOURCE_STATUSES: Record<
  NativeOverlayForwardingSource,
  "blocked_until_native_overlay_policy" | "needs_explicit_forwarding_policy"
> = {
  overlay_chat: "needs_explicit_forwarding_policy",
  overlay_chat_voice: "needs_explicit_forwarding_policy",
  overlay_hologram_voice: "blocked_until_native_overlay_policy",
  overlay_sentry_wake_word: "blocked_until_native_overlay_policy",
  overlay_continuous_voice: "blocked_until_native_overlay_policy",
};

export function listAndroidNativeOverlayPolicies(): NativeOverlaySurfacePolicy[] {
  return [{ ...POLICY, sourceFiles: [...POLICY.sourceFiles], capabilities: [...POLICY.capabilities], forwardingSources: [...POLICY.forwardingSources], forwardingKinds: [...POLICY.forwardingKinds] }];
}

export function getAndroidNativeOverlayPolicy(
  surfaceId: NativeOverlaySurfaceId,
): NativeOverlaySurfacePolicy {
  if (surfaceId !== POLICY.surfaceId) throw new Error(`Unknown native overlay surface: ${surfaceId}`);
  return listAndroidNativeOverlayPolicies()[0];
}

export function getAndroidNativeOverlayForwardingDecision(
  source: NativeOverlayForwardingSource,
  kind: NativeOverlayForwardingKind,
) {
  const status = SOURCE_STATUSES[source];
  return {
    surfaceId: POLICY.surfaceId,
    source,
    kind,
    status,
    allowed: false as const,
    blockedBy: [status, "native_overlay_forwarding_gate_stub"],
    userSafeReason: POLICY.userSafeReason,
  };
}

export function getAndroidNativeOverlayGovernanceSummary() {
  return {
    totalSurfaces: NATIVE_OVERLAY_SURFACE_IDS.length,
    mappedSurfaces: [...NATIVE_OVERLAY_SURFACE_IDS],
    capabilities: [...POLICY.capabilities],
    forwardingSources: [...POLICY.forwardingSources],
    forwardingKinds: [...POLICY.forwardingKinds],
    bypassesVisualCoreGovernance: POLICY.bypassesVisualCoreGovernance,
    needsDedicatedForwardingPolicy: POLICY.needsDedicatedForwardingPolicy,
  };
}

export function assertKnownAndroidNativeOverlayMap(): boolean {
  const mapped = listAndroidNativeOverlayPolicies().map((policy) => policy.surfaceId).sort();
  return JSON.stringify(mapped) === JSON.stringify([...NATIVE_OVERLAY_SURFACE_IDS].sort());
}
