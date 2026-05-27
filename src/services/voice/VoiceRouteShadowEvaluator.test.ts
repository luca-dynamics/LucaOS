import { describe, expect, it } from "vitest";
import { deriveVoiceRuntimeProviderPolicy } from "./VoiceRuntimeProviderPolicy";
import { evaluateVoiceRouteShadow } from "./VoiceRouteShadowEvaluator";

describe("VoiceRouteShadowEvaluator", () => {
  it("returns matched true with severity none when existing and shadow align", () => {
    const policy = deriveVoiceRuntimeProviderPolicy({ preset: "privacy" });
    const result = evaluateVoiceRouteShadow({
      existingRoute: { kind: "LOCAL_PIPELINE", provisioning: "LOCAL", routeKind: "LOCAL_PIPELINE" },
      providerPolicy: policy,
    });
    expect(result.matched).toBe(true);
    expect(result.severity).toBe("none");
    expect(result.providerPolicyAppliedToRouting).toBe(false);
    expect(result.shadowOnly).toBe(true);
  });

  it("warns when privacy local-first conflicts with cloud route", () => {
    const policy = deriveVoiceRuntimeProviderPolicy({ preset: "privacy" });
    const result = evaluateVoiceRouteShadow({
      existingRoute: { kind: "CLOUD_BIDI", provisioning: "LUCA_PRIME" },
      providerPolicy: policy,
    });
    expect(result.matched).toBe(false);
    expect(result.severity).toBe("warning");
    expect(result.recommendation).toBe("needs_review");
  });

  it("returns info for speedster mismatch", () => {
    const policy = deriveVoiceRuntimeProviderPolicy({ preset: "speedster" });
    const result = evaluateVoiceRouteShadow({
      existingRoute: { kind: "LOCAL_PIPELINE", provisioning: "LOCAL" },
      providerPolicy: policy,
    });
    expect(result.matched).toBe(false);
    expect(["info", "warning"]).toContain(result.severity);
  });

  it("marks performance cloud/auto as runtime router candidate", () => {
    const policy = deriveVoiceRuntimeProviderPolicy({ preset: "performance" });
    const result = evaluateVoiceRouteShadow({
      existingRoute: { kind: "HYBRID_PIPELINE", provisioning: "LOCAL" },
      providerPolicy: policy,
    });
    expect(["candidate_for_runtime_router", "observe"]).toContain(result.recommendation);
  });

  it("escalates blocked readiness to warning/error", () => {
    const policy = deriveVoiceRuntimeProviderPolicy({ preset: "performance" });
    const result = evaluateVoiceRouteShadow({
      existingRoute: { kind: "CLOUD_BIDI", provisioning: "LUCA_PRIME" },
      providerPolicy: policy,
      readiness: {
        status: "blocked",
        providerKind: "cloud",
        capability: "streaming_stt",
        gates: [],
        metadata: {
          readinessKind: "voice_provider_readiness_scaffold",
          audioApisCalled: false,
          microphoneApisCalled: false,
          sttApisCalled: false,
          ttsApisCalled: false,
          providerApisCalled: false,
          networkApisCalled: false,
          heavyModelsLoaded: false,
          systemApisCalled: false,
          requiresExplicitOptIn: true,
        },
      },
    });
    expect(["warning", "error"]).toContain(result.severity);
  });

  it("remains pure metadata logic with no provider/network/audio side effects", () => {
    const policy = deriveVoiceRuntimeProviderPolicy({ preset: "balanced" });
    const result = evaluateVoiceRouteShadow({
      existingRoute: { kind: "HYBRID_PIPELINE", provisioning: "LOCAL" },
      providerPolicy: policy,
    });
    expect(result.metadata).toMatchObject({
      providerCallsMade: false,
      networkCallsMade: false,
      microphoneApisCalled: false,
      audioOutputApisCalled: false,
    });
  });
});
