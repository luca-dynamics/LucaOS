import { describe, expect, it } from "vitest";
import { evaluateVoiceRouteAuthority } from "./VoiceRouteAuthorityGate";
import { deriveVoiceRuntimeProviderPolicy } from "./VoiceRuntimeProviderPolicy";

const existingRoute = { kind: "CLOUD_BIDI", provisioning: "LUCA_PRIME", reason: "existing" } as const;
const runtimeRoute = { kind: "LOCAL_PIPELINE", provisioning: "LOCAL", reason: "runtime" } as const;

describe("VoiceRouteAuthorityGate", () => {
  it("default uses existing resolver", () => {
    const result = evaluateVoiceRouteAuthority({ existingRoute: existingRoute as any });
    expect(result.activeAuthority).toBe("existing_resolver");
    expect(result.selectedRoute).toEqual(existingRoute);
    expect(result.authorityChanged).toBe(false);
    expect(result.defaultSafeMode).toBe(true);
  });

  it("shadow_only keeps existing resolver", () => {
    const result = evaluateVoiceRouteAuthority({ mode: "shadow_only", existingRoute: existingRoute as any });
    expect(result.activeAuthority).toBe("existing_resolver");
    expect(result.selectedRoute).toEqual(existingRoute);
    expect(result.authorityChanged).toBe(false);
  });

  it("runtime_router mode without global flag stays existing resolver", () => {
    const result = evaluateVoiceRouteAuthority({ mode: "runtime_router", existingRoute: existingRoute as any, runtimeRoute: runtimeRoute as any });
    expect(result.activeAuthority).toBe("existing_resolver");
    expect(result.promotionBlockedReasons).toContain("runtime_authority_flag_disabled");
  });

  it("runtime_router mode with flag but missing runtime route is blocked", () => {
    const result = evaluateVoiceRouteAuthority({ mode: "runtime_router", existingRoute: existingRoute as any, featureFlags: { enableRuntimeRouteAuthority: true } });
    expect(result.canPromoteRuntimeRoute).toBe(false);
    expect(result.promotionBlockedReasons).toContain("runtime_route_missing");
  });

  it("readiness required and not ready blocks promotion", () => {
    const result = evaluateVoiceRouteAuthority({
      mode: "runtime_router",
      existingRoute: existingRoute as any,
      runtimeRoute: runtimeRoute as any,
      featureFlags: { enableRuntimeRouteAuthority: true, requireReadinessReadyBeforePromotion: true, enableRuntimeRouteAuthorityForPerformancePreset: true },
      providerPolicy: deriveVoiceRuntimeProviderPolicy({ preset: "performance" }),
      readinessSummary: { status: "blocked" } as any,
    });
    expect(result.canPromoteRuntimeRoute).toBe(false);
    expect(result.promotionBlockedReasons).toContain("readiness_not_ready");
  });

  it("shadow match required and mismatch blocks promotion", () => {
    const result = evaluateVoiceRouteAuthority({
      mode: "runtime_router",
      existingRoute: existingRoute as any,
      runtimeRoute: runtimeRoute as any,
      featureFlags: { enableRuntimeRouteAuthority: true, requireShadowMatchBeforePromotion: true, enableRuntimeRouteAuthorityForPerformancePreset: true },
      providerPolicy: deriveVoiceRuntimeProviderPolicy({ preset: "performance" }),
      shadowEvaluation: { matched: false } as any,
    });
    expect(result.promotionBlockedReasons).toContain("shadow_mismatch");
  });

  it("preset-specific flag blocks when disabled", () => {
    const result = evaluateVoiceRouteAuthority({
      mode: "runtime_router",
      existingRoute: existingRoute as any,
      runtimeRoute: runtimeRoute as any,
      providerPolicy: deriveVoiceRuntimeProviderPolicy({ preset: "privacy" }),
      featureFlags: { enableRuntimeRouteAuthority: true, enableRuntimeRouteAuthorityForPrivacyPreset: false },
    });
    expect(result.promotionBlockedReasons).toContain("preset_not_enabled_for_runtime_authority");
  });

  it("when all explicit flags pass, decision marks runtime route as promotable", () => {
    const result = evaluateVoiceRouteAuthority({
      mode: "runtime_router",
      existingRoute: existingRoute as any,
      runtimeRoute: runtimeRoute as any,
      providerPolicy: deriveVoiceRuntimeProviderPolicy({ preset: "balanced" }),
      featureFlags: {
        enableRuntimeRouteAuthority: true,
        enableRuntimeRouteAuthorityForBalancedPreset: true,
        requireReadinessReadyBeforePromotion: true,
        requireShadowMatchBeforePromotion: true,
      },
      readinessSummary: { status: "ready" } as any,
      shadowEvaluation: { matched: true } as any,
    });
    expect(result.canPromoteRuntimeRoute).toBe(true);
    expect(result.activeAuthority).toBe("runtime_router");
  });

  it("metadata confirms no provider/network/audio calls", () => {
    const result = evaluateVoiceRouteAuthority({ existingRoute: existingRoute as any });
    expect(result.metadata).toMatchObject({
      providerCallsMade: false,
      networkCallsMade: false,
      microphoneApisCalled: false,
      audioOutputApisCalled: false,
    });
  });
});
