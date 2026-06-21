import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createProviderFactoryShadowSelection } from "./providerHubProviderFactoryShadowHook";
import type { LucaSettings } from "../services/settingsService";

const settings = (runtimeRouteSelectionEnabled: boolean): LucaSettings => ({
  brain: {
    model: "gpt-4o",
    provider: "byok",
    useCustomApiKey: true,
    openaiApiKey: "sk-secret-value",
  } as LucaSettings["brain"],
  general: {},
  providerHub: { disabledProviderIds: [], runtimeRouteSelectionEnabled },
  memory: { provider: "local-luca", model: "nomic-embed-text", sovereignFacts: [] },
  voice: {} as LucaSettings["voice"],
} as LucaSettings);

describe("ProviderFactory Provider Hub shadow selection hook", () => {
  it("reports current runtime remains active when the runtime flag is disabled", () => {
    const shadow = createProviderFactoryShadowSelection({
      currentRuntimeProviderId: "openai",
      currentRuntimeModelId: "gpt-4o",
      currentRouteMode: "BYOK",
      taskType: "chat",
      requiredCapabilities: ["text_generation"],
      currentSettingsSnapshot: settings(false),
      routePreference: "cloud_first",
      runtimeRouteSelectionEnabled: false,
      allowFallbacks: true,
      allowPaidProviders: true,
      allowLocalProviders: true,
      allowCloudProviders: true,
      observedAt: "2026-06-20T00:00:00.000Z",
    });

    expect(shadow.providerHubEnabled).toBe(false);
    expect(shadow.shouldUseProviderHubRoute).toBe(false);
    expect(shadow.wouldFallbackToCurrentRuntime).toBe(true);
    expect(shadow.runtimeExecutionChanged).toBe(false);
    expect(shadow.providerApiCalled).toBe(false);
    expect(shadow.providerAdapterInstantiated).toBe(false);
  });

  it("can observe a usable Provider Hub route without changing runtime execution or leaking secrets", () => {
    const shadow = createProviderFactoryShadowSelection({
      currentRuntimeProviderId: "openai",
      currentRuntimeModelId: "gpt-4o",
      currentRouteMode: "BYOK",
      taskType: "chat",
      requiredCapabilities: ["text_generation"],
      currentSettingsSnapshot: settings(true),
      routePreference: "cloud_first",
      runtimeRouteSelectionEnabled: true,
      allowFallbacks: true,
      allowPaidProviders: true,
      allowLocalProviders: true,
      allowCloudProviders: true,
      observedAt: "2026-06-20T00:00:00.000Z",
    });

    expect(shadow.providerHubEnabled).toBe(true);
    expect(["selected", "fallback_selected"]).toContain(shadow.decisionStatus);
    expect(shadow.shouldUseProviderHubRoute).toBe(true);
    expect(shadow.runtimeExecutionChanged).toBe(false);
    expect(shadow.sideEffectsPerformed).toBe(false);
    expect(shadow.providerApiCalled).toBe(false);
    expect(shadow.providerAdapterInstantiated).toBe(false);
    expect(shadow.safeDiagnosticsText).not.toContain("sk-secret-value");
  });

  it("does not import adapters, connection tests, local runtime startup, or App.tsx", () => {
    const source = readFileSync("src/model-router/providerHubProviderFactoryShadowHook.ts", "utf8");
    expect(source).not.toMatch(/GeminiAdapter|OpenAIAdapter|AnthropicAdapter|LocalLLMAdapter|GrokAdapter|DeepSeekAdapter/);
    expect(source).not.toMatch(/validateSpecificKey|testProviderHubConnection|fetch\(|WebSocket|ollamaUrl|App\.tsx/);
  });
});
