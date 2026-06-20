import { readFileSync } from "node:fs";
import { createProviderFactoryProviderHubDryRunComparison } from "./providerHubProviderFactoryDryRun";

const snapshots = [
  { providerId: "luca_prime" as const, enabled: true, configuredModelId: "gemini-2.5-pro" },
  { providerId: "openai" as const, enabled: true, hasUserKey: true, configuredModelId: "gpt-4o" },
  { providerId: "ollama" as const, enabled: true, localRuntimeAvailable: false },
];

function base(overrides = {}) {
  return createProviderFactoryProviderHubDryRunComparison({
    currentProviderId: "luca-prime",
    currentRouteMode: "luca-prime",
    currentModelId: "gemini-2.5-pro",
    taskType: "chat",
    requiredCapabilities: ["text_generation"],
    routePreference: "managed_first",
    connectionSnapshots: snapshots,
    allowFallbacks: true,
    allowPaidProviders: true,
    allowLocalProviders: true,
    allowCloudProviders: true,
    ...overrides,
  });
}

describe("ProviderFactory Provider Hub dry-run bridge", () => {
  it("returns matchesCurrentRoute true for equivalent current and planned routes", () => {
    expect(base().matchesCurrentRoute).toBe(true);
  });

  it("returns a mismatch reason for a different current route", () => {
    const comparison = base({ currentProviderId: "openai", currentModelId: "gpt-4o" });
    expect(comparison.matchesCurrentRoute).toBe(false);
    expect(comparison.mismatchReason).toContain("Current runtime would use openai");
  });

  it("handles missing current route safely", () => {
    const comparison = base({ currentProviderId: undefined, currentModelId: undefined });
    expect(comparison.matchesCurrentRoute).toBe(false);
    expect(comparison.mismatchReason).toContain("Current runtime route unavailable");
  });

  it("represents Provider Hub blocked/configuration_required safely", () => {
    const comparison = base({ allowCloudProviders: false, allowLocalProviders: false });
    expect(["blocked", "configuration_required"].includes(comparison.providerHubDecisionStatus)).toBe(true);
    expect(comparison.providerApiCalled).toBe(false);
    expect(comparison.runtimeRoutingChanged).toBe(false);
  });

  it("excludes secret-like values from diagnostics", () => {
    const comparison = base({ currentProviderId: "openai", connectionSnapshots: [{ providerId: "openai", enabled: true, hasUserKey: true, configuredModelId: "secret-model" }] });
    expect(comparison.safeDiagnosticsText).not.toMatch(/sk-[a-z0-9]|apiKey|token|password/i);
    expect(comparison.sideEffectsPerformed).toBe(false);
  });

  it("does not import ProviderFactory, adapters, or side-effectful browser/runtime APIs", () => {
    const source = readFileSync("src/model-router/providerHubProviderFactoryDryRun.ts", "utf8");
    expect(source).not.toMatch(/GeminiAdapter|OpenAIAdapter|AnthropicAdapter|LocalLLMAdapter|GrokAdapter|DeepSeekAdapter/);
    expect(source).not.toMatch(/\bfetch\b|WebSocket|XMLHttpRequest|localStorage|process\.env|testProviderHubConnection|validateSpecificKey|createProvider\(/);
  });
});
