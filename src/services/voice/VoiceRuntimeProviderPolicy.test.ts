import { describe, expect, it } from "vitest";
import {
  createVoiceRuntimeProviderPolicyRouteMetadata,
  deriveVoiceRuntimeProviderPolicy,
  getVoiceRuntimeProviderPolicySnapshot,
  policyToRoutePreference,
} from "./VoiceRuntimeProviderPolicy";

describe("VoiceRuntimeProviderPolicy", () => {
  it("maps performance to quality cloud route", () => {
    const policy = deriveVoiceRuntimeProviderPolicy({ preset: "performance" });
    expect(policy.preferredProviderKind).toBe("cloud");
    expect(policy.latencyMode).toBe("quality");
    expect(policy.fallbackAllowed).toBe(true);
    expect(policy.networkAllowed).toBe(true);
  });

  it("maps speedster to low-latency streaming with fallback", () => {
    const policy = deriveVoiceRuntimeProviderPolicy({ preset: "speedster" });
    expect(policy.latencyMode).toBe("lowest");
    expect(policy.enableStreaming).toBe(true);
    expect(policy.fallbackAllowed).toBe(true);
  });

  it("maps balanced to auto and balanced latency", () => {
    const policy = deriveVoiceRuntimeProviderPolicy({ preset: "balanced" });
    expect(policy.preferredProviderKind).toBe("auto");
    expect(policy.latencyMode).toBe("balanced");
  });

  it("maps privacy to local-first and network blocked", () => {
    const policy = deriveVoiceRuntimeProviderPolicy({ preset: "privacy" });
    expect(policy.preferredProviderKind).toBe("local");
    expect(policy.privacyMode).toBe("local_first");
    expect(policy.networkAllowed).toBe(false);
    expect(policy.localModelPreferred).toBe(true);
  });

  it("allows explicit network fallback in privacy mode", () => {
    const policy = deriveVoiceRuntimeProviderPolicy({ preset: "privacy", allowCloudFallback: true });
    expect(policy.networkAllowed).toBe(true);
    expect(policy.fallbackAllowed).toBe(true);
  });

  it("produces router preference and readiness hints", () => {
    const policy = deriveVoiceRuntimeProviderPolicy({ preset: "speedster" });
    expect(policyToRoutePreference(policy)).toBe("auto");
    expect(policy.readinessHints.preferredCapabilities).toContain("streaming_stt");
  });

  it("snapshot metadata remains advisory-only", () => {
    const snap = getVoiceRuntimeProviderPolicySnapshot({ preset: "balanced" });
    expect(snap.metadata).toMatchObject({
      advisoryOnly: true,
      providerCallsMade: false,
      networkCallsMade: false,
      microphoneApisCalled: false,
      audioOutputApisCalled: false,
    });
  });

  it("creates advisory route metadata without applying routing changes", () => {
    const policy = deriveVoiceRuntimeProviderPolicy({ preset: "speedster" });
    const routeMetadata = createVoiceRuntimeProviderPolicyRouteMetadata(policy);
    expect(routeMetadata.policyProviderPreference).toBe("auto");
    expect(routeMetadata.routePreference).toBe("auto");
    expect(routeMetadata.advisoryOnly).toBe(true);
    expect(routeMetadata.appliedToRouting).toBe(false);
    expect(routeMetadata.featureFlagsPreview.enableNetworkProviderCalls).toBe(true);
  });
});
