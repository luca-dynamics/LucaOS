import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { selectProviderHubRuntimeRoute } from "./providerHubRuntimeRouteSelection";

const snapshots = [
  { providerId: "luca_prime" as const, enabled: true, configuredModelId: "luca-prime-model" },
  { providerId: "openai" as const, enabled: true, hasUserKey: true, configuredModelId: "gpt-runtime" },
];

function route(overrides = {}) {
  return selectProviderHubRuntimeRoute({
    runtimeRouteSelectionEnabled: false,
    taskType: "chat",
    requiredCapabilities: ["text_generation"],
    routePreference: "managed_first",
    connectionSnapshots: snapshots,
    allowFallbacks: true,
    allowPaidProviders: true,
    allowLocalProviders: true,
    allowCloudProviders: true,
    currentProviderId: "local-luca",
    currentModelId: "current-model",
    ...overrides,
  });
}

describe("Provider Hub runtime route selection bridge", () => {
  it("defaults disabled and falls back to the current runtime", () => {
    const result = route();
    expect(result.enabled).toBe(false);
    expect(result.shouldUseProviderHubRoute).toBe(false);
    expect(result.fallbackToCurrentRuntime).toBe(true);
    expect(result.selectedProviderId).toBeUndefined();
    expect(result.runtimeRoutingChanged).toBe(false);
  });

  it("returns a usable Provider Hub route when enabled and selected", () => {
    const result = route({ runtimeRouteSelectionEnabled: true });
    expect(result.decisionStatus).toBe("selected");
    expect(result.shouldUseProviderHubRoute).toBe(true);
    expect(result.fallbackToCurrentRuntime).toBe(false);
    expect(result.selectedProviderId).toBe("luca_prime");
    expect(result.selectedModelId).toBe("luca-prime-model");
  });

  it("falls back to current runtime for blocked Provider Hub decisions", () => {
    const result = route({ runtimeRouteSelectionEnabled: true, allowCloudProviders: false, allowLocalProviders: false });
    expect(["blocked", "configuration_required"].includes(String(result.decisionStatus))).toBe(true);
    expect(result.shouldUseProviderHubRoute).toBe(false);
    expect(result.fallbackToCurrentRuntime).toBe(true);
    expect(result.selectedProviderId).toBeUndefined();
  });

  it("returns selected provider/model only when enabled and usable", () => {
    expect(route({ runtimeRouteSelectionEnabled: false }).selectedProviderId).toBeUndefined();
    expect(route({ runtimeRouteSelectionEnabled: true }).selectedProviderId).toBeDefined();
  });

  it("excludes secrets and remains side-effect free", () => {
    const result = route({ runtimeRouteSelectionEnabled: true, connectionSnapshots: [{ providerId: "openai", enabled: true, hasUserKey: true, configuredModelId: "safe-model" }] });
    expect(result.safeDiagnosticsText).not.toMatch(/sk-|apiKey|token|password|secret/i);
    expect(result.sideEffectsPerformed).toBe(false);
    expect(result.providerApiCalled).toBe(false);
    expect(result.providerAdapterInstantiated).toBe(false);
  });

  it("does not import ProviderFactory, adapters, networking, connection tests, or local runtime startup", () => {
    const source = readFileSync("src/model-router/providerHubRuntimeRouteSelection.ts", "utf8");
    expect(source).not.toMatch(/ProviderFactory|GeminiAdapter|OpenAIAdapter|AnthropicAdapter|LocalLLMAdapter|GrokAdapter|DeepSeekAdapter/);
    expect(source).not.toMatch(/\bfetch\b|WebSocket|XMLHttpRequest|testProviderHubConnection|validateSpecificKey|startOllama|spawn\(|exec\(/);
  });
});
