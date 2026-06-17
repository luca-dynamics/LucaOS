import plannerSource from "./providerHubRoutePlanner.ts?raw";
import { describe, expect, it } from "vitest";
import { createProviderHubRouteDecision } from "./providerHubRoutePlanner";
import type { LucaProviderHubRouteRequest } from "./providerHubRoutePlanner";

const baseRequest = (overrides: Partial<LucaProviderHubRouteRequest> = {}): LucaProviderHubRouteRequest => ({
  taskType: "chat",
  requiredCapabilities: ["text_generation"],
  preference: "balanced",
  connectionSnapshots: [{ providerId: "luca_prime" }],
  allowFallbacks: true,
  allowPaidProviders: true,
  allowLocalProviders: true,
  allowCloudProviders: true,
  ...overrides,
});

const checkedAt = "2026-06-17T00:00:00.000Z";

describe("providerHubRoutePlanner", () => {
  it("managed_first selects Luca Prime when ready", () => {
    const decision = createProviderHubRouteDecision(baseRequest({ preference: "managed_first" }));
    expect(decision.selectedProviderId).toBe("luca_prime");
    expect(decision.status).toBe("selected");
  });

  it("local_first selects Ollama/LM Studio only when local runtime is available", () => {
    const unavailable = createProviderHubRouteDecision(baseRequest({ preference: "local_first" }));
    expect(["ollama", "lm_studio"]).not.toContain(unavailable.selectedProviderId);

    const available = createProviderHubRouteDecision(baseRequest({
      preference: "local_first",
      connectionSnapshots: [{ providerId: "luca_prime" }, { providerId: "ollama", localRuntimeAvailable: true, configuredModelId: "llama3" }],
    }));
    expect(available.selectedProviderId).toBe("ollama");
    expect(available.selectedModelId).toBe("llama3");
  });

  it("privacy_first prefers local over cloud when ready", () => {
    const decision = createProviderHubRouteDecision(baseRequest({
      preference: "privacy_first",
      connectionSnapshots: [{ providerId: "luca_prime" }, { providerId: "lm_studio", localRuntimeAvailable: true }],
    }));
    expect(decision.selectedProviderId).toBe("lm_studio");
  });

  it("preferred provider wins when ready", () => {
    const decision = createProviderHubRouteDecision(baseRequest({
      preferredProviderId: "openai",
      connectionSnapshots: [{ providerId: "luca_prime" }, { providerId: "openai", hasUserKey: true, configuredModelId: "gpt-test" }],
    }));
    expect(decision.selectedProviderId).toBe("openai");
    expect(decision.selectedModelId).toBe("gpt-test");
  });

  it("preferred provider falls back when unavailable and fallbacks allowed", () => {
    const decision = createProviderHubRouteDecision(baseRequest({ preferredProviderId: "openai", allowFallbacks: true }));
    expect(decision.status).toBe("fallback_selected");
    expect(decision.selectedProviderId).toBe("luca_prime");
  });

  it("returns blocked when fallbacks are disabled for an unavailable preferred provider", () => {
    const decision = createProviderHubRouteDecision(baseRequest({ preferredProviderId: "openai", allowFallbacks: false }));
    expect(decision.status).toBe("blocked");
    expect(decision.selectedProviderId).toBeUndefined();
  });

  it("missing API key returns configuration_required", () => {
    const decision = createProviderHubRouteDecision(baseRequest({ connectionSnapshots: [{ providerId: "luca_prime", enabled: false }] }));
    expect(decision.status).toBe("configuration_required");
    expect(decision.selectedProviderId).toBeUndefined();
  });

  it("unsupported task returns no_supported_provider", () => {
    const decision = createProviderHubRouteDecision(baseRequest({
      taskType: "voice_tts",
      requiredCapabilities: ["text_to_speech", "local_only", "long_context"],
    }));
    expect(decision.status).toBe("no_supported_provider");
  });

  it("connection test success boosts candidate", () => {
    const decision = createProviderHubRouteDecision(baseRequest({
      connectionSnapshots: [{ providerId: "luca_prime" }, { providerId: "openai", hasUserKey: true }],
      connectionTestResults: [{ providerId: "openai", status: "success", message: "ok", checkedAt, safeDiagnosticsText: "{}", sideEffectsPerformed: false, runtimeRoutingChanged: false, providerApiCalled: false, secretExposed: false }],
    }));
    expect(decision.selectedProviderId).toBe("openai");
  });

  it("connection test failure lowers or blocks candidate safely", () => {
    const lowered = createProviderHubRouteDecision(baseRequest({
      preferredProviderId: "openai",
      connectionSnapshots: [{ providerId: "luca_prime" }, { providerId: "openai", hasUserKey: true }],
      connectionTestResults: [{ providerId: "openai", status: "failed", message: "bad", checkedAt, safeDiagnosticsText: "{}", sideEffectsPerformed: false, runtimeRoutingChanged: false, providerApiCalled: false, secretExposed: false }],
    }));
    const withoutFailure = createProviderHubRouteDecision(baseRequest({
      preferredProviderId: "openai",
      connectionSnapshots: [{ providerId: "luca_prime" }, { providerId: "openai", hasUserKey: true }],
    }));
    expect(lowered.selectedProviderId).toBe("openai");
    expect(lowered.candidates.find((candidate) => candidate.providerId === "openai")?.score).toBeLessThan(
      withoutFailure.candidates.find((candidate) => candidate.providerId === "openai")?.score ?? 0,
    );

    const blocked = createProviderHubRouteDecision(baseRequest({
      preferredProviderId: "openai",
      allowFallbacks: false,
      connectionSnapshots: [{ providerId: "openai", hasUserKey: true }],
      connectionTestResults: [{ providerId: "openai", status: "failed", message: "bad", checkedAt, safeDiagnosticsText: "{}", sideEffectsPerformed: false, runtimeRoutingChanged: false, providerApiCalled: false, secretExposed: false }],
    }));
    expect(blocked.status).toBe("blocked");
  });

  it("unsupported connection test does not block otherwise ready provider", () => {
    const decision = createProviderHubRouteDecision(baseRequest({
      preferredProviderId: "anthropic",
      connectionSnapshots: [{ providerId: "anthropic", hasUserKey: true }],
      connectionTestResults: [{ providerId: "anthropic", status: "unsupported", message: "n/a", checkedAt, safeDiagnosticsText: "{}", sideEffectsPerformed: false, runtimeRoutingChanged: false, providerApiCalled: false, secretExposed: false }],
    }));
    expect(decision.selectedProviderId).toBe("anthropic");
  });

  it("diagnostics are secret-safe", () => {
    const decision = createProviderHubRouteDecision(baseRequest({
      connectionSnapshots: [{ providerId: "openai", hasUserKey: true, configuredModelId: "safe-model" }],
      connectionTestResults: [{ providerId: "openai", status: "failed", message: "sk-secret-123456", checkedAt, safeDiagnosticsText: "api_key=sk-secret-123456", sideEffectsPerformed: false, runtimeRoutingChanged: false, providerApiCalled: false, secretExposed: false }],
    }));
    expect(decision.safeDiagnosticsText).not.toContain("sk-secret");
    expect(decision.safeDiagnosticsText).not.toContain("api_key");
    expect(decision.safeDiagnosticsText).toContain("candidateCount");
  });

  it("sets all side-effect flags false", () => {
    const decision = createProviderHubRouteDecision(baseRequest());
    expect(decision.sideEffectsPerformed).toBe(false);
    expect(decision.runtimeRoutingChanged).toBe(false);
    expect(decision.providerApiCalled).toBe(false);
  });

  it("does not import ProviderFactory, provider adapters, or browser/runtime side-effect APIs", () => {
    expect(plannerSource).not.toMatch(/ProviderFactory/);
    expect(plannerSource).not.toMatch(/providerAdapters|Adapter|adapter/);
    expect(plannerSource).not.toMatch(/\bfetch\b|WebSocket|XMLHttpRequest|localStorage|process\.env|import\.meta\.env/);
  });
});
