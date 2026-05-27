import { describe, expect, it } from "vitest";
import { evaluateVoiceProviderReadiness } from "./VoiceProviderReadiness";

describe("VoiceProviderReadiness", () => {
  it("local provider is blocked without model loading and model", () => {
    const result = evaluateVoiceProviderReadiness({
      providerKind: "local",
      capability: "stt",
      featureFlags: {
        enableRealLocalVoiceProvider: true,
        enableRealStt: true,
      },
      backendAvailable: true,
      modelAvailable: false,
      localModelLoadingAllowed: false,
    });

    expect(result.status).toBe("scaffold_only");
    expect(result.gates.find((g) => g.gate === "local_model_loading")?.passed).toBe(false);
    expect(result.gates.find((g) => g.gate === "local_model_available")?.passed).toBe(false);
  });

  it("cloud provider is scaffold_only without network flag", () => {
    const result = evaluateVoiceProviderReadiness({
      providerKind: "cloud",
      capability: "stt",
      featureFlags: {
        enableRealLucaPrimeVoiceProvider: true,
        enableRealStt: true,
      },
      backendAvailable: true,
      networkAllowed: true,
    });

    expect(result.status).toBe("scaffold_only");
    expect(result.gates.find((g) => g.gate === "network_provider_calls")?.passed).toBe(false);
  });

  it("byok provider is scaffold_only without credentials", () => {
    const result = evaluateVoiceProviderReadiness({
      providerKind: "byok",
      capability: "tts",
      featureFlags: {
        enableRealByokVoiceProvider: true,
        enableRealTts: true,
        enableNetworkProviderCalls: true,
      },
      backendAvailable: true,
      networkAllowed: true,
      credentialsAvailable: false,
    });

    expect(result.status).toBe("scaffold_only");
    expect(result.gates.find((g) => g.gate === "credentials_available")?.passed).toBe(false);
  });

  it("returns scaffold_only when scaffold backend exists and real flags are disabled", () => {
    const result = evaluateVoiceProviderReadiness({
      providerKind: "local",
      capability: "stt",
      backendAvailable: true,
    });

    expect(result.status).toBe("scaffold_only");
  });

  it("returns ready only when all required gates pass", () => {
    const result = evaluateVoiceProviderReadiness({
      providerKind: "local",
      capability: "tts",
      featureFlags: {
        enableRealLocalVoiceProvider: true,
        enableLocalModelLoading: true,
        enableRealTts: true,
      },
      backendAvailable: true,
      modelAvailable: true,
      localModelLoadingAllowed: true,
    });

    expect(result.status).toBe("ready");
    expect(result.gates.every((g) => g.passed)).toBe(true);
  });

  it("streaming capabilities require streaming flag", () => {
    const result = evaluateVoiceProviderReadiness({
      providerKind: "cloud",
      capability: "streaming_stt",
      featureFlags: {
        enableRealLucaPrimeVoiceProvider: true,
        enableNetworkProviderCalls: true,
        enableRealStt: true,
      },
      backendAvailable: true,
      networkAllowed: true,
    });

    expect(result.status).toBe("scaffold_only");
    expect(result.gates.find((g) => g.gate === "real_streaming_flag")?.passed).toBe(false);
  });

  it("returns blocked when backend is unavailable", () => {
    const result = evaluateVoiceProviderReadiness({
      providerKind: "cloud",
      capability: "stt",
      backendAvailable: false,
    });

    expect(result.status).toBe("blocked");
  });
});
