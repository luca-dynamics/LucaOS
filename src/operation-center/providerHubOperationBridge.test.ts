import bridgeSource from "./providerHubOperationBridge.ts?raw";
import { describe, expect, it } from "vitest";
import { createProviderHubSettingsSnapshots } from "../model-router/providerHubSettingsSnapshot";
import { createProviderHubOperationItems } from "./providerHubOperationBridge";

const secretLikeValues = [
  "sk-test-secret-value",
  "anthropic-secret-value",
  "gemini-secret-value",
  "https://secret.internal/v1",
];

const forbiddenRuntimePatterns = [
  /ProviderFactory/,
  /providerAdapters?/i,
  /from\s+["'][^"']*providers?\//i,
  /\bfetch\b/,
  /\blocalStorage\b/,
  /\bprocess\.env\b/,
  /\bimport\.meta\.env\b/,
  /\bWebSocket\b/,
  /XMLHttpRequest/,
];

describe("Provider Hub Operation Center bridge", () => {
  it("creates read-only Provider Hub operation items from safe settings snapshots", () => {
    const snapshots = createProviderHubSettingsSnapshots({
      settings: {
        general: { activeBrainId: "gpt-5.5-fixture" },
        brain: {
          provider: "openai",
          model: "gpt-5.5-fixture",
          openaiApiKey: secretLikeValues[0],
          anthropicApiKey: secretLikeValues[1],
          geminiApiKey: secretLikeValues[2],
          openaiBaseUrl: secretLikeValues[3],
        },
      },
      ollamaAvailable: false,
    });
    const items = createProviderHubOperationItems(snapshots);

    expect(items.length).toBeGreaterThan(1);
    expect(items.every((item) => item.source === "provider_hub" && item.category === "provider_readiness")).toBe(true);
    expect(items.every((item) => item.sideEffectsPerformed === false && item.executionEnabled === false && item.canExecute === false)).toBe(true);
    expect(items.some((item) => item.title === "Provider Hub readiness summary")).toBe(true);
  });

  it("excludes raw secret-like settings values from diagnostics", () => {
    const snapshots = createProviderHubSettingsSnapshots({
      settings: {
        brain: {
          provider: "openai",
          model: "gpt-5.5-fixture",
          openaiApiKey: secretLikeValues[0],
          anthropicApiKey: secretLikeValues[1],
          geminiApiKey: secretLikeValues[2],
          openaiBaseUrl: secretLikeValues[3],
        },
      },
      ollamaAvailable: false,
    });
    const serialized = JSON.stringify(createProviderHubOperationItems(snapshots));

    for (const secret of secretLikeValues) expect(serialized).not.toContain(secret);
  });

  it("includes Luca Prime, missing cloud key, local runtime, configured model, and custom endpoint diagnostics", () => {
    const items = createProviderHubOperationItems([
      { providerId: "luca_prime", enabled: true },
      { providerId: "openai", enabled: true, hasUserKey: false },
      { providerId: "anthropic", enabled: true, hasUserKey: true, configuredModelId: "claude-sonnet-fixture" },
      { providerId: "ollama", enabled: true, localRuntimeAvailable: false },
      { providerId: "lm_studio", enabled: true, localRuntimeAvailable: false },
      { providerId: "custom_openai_compatible", enabled: true, hasUserKey: true, hasCustomBaseUrl: false },
    ]);

    expect(items.some((item) => item.title === "Luca Prime ready")).toBe(true);
    expect(items.some((item) => item.title.includes("OpenAI") && item.auditSummary?.includes("requiredAction=add_api_key"))).toBe(true);
    expect(items.some((item) => item.title.includes("Ollama") && item.auditSummary?.includes("requiredAction=start_local_runtime"))).toBe(true);
    expect(items.some((item) => item.title.includes("LM Studio") && item.auditSummary?.includes("requiredAction=start_local_runtime"))).toBe(true);
    expect(items.some((item) => item.title.includes("Anthropic") && item.auditSummary?.includes("selectedModelId=claude-sonnet-fixture"))).toBe(true);
    expect(items.some((item) => item.title.includes("Custom") && item.auditSummary?.includes("requiredAction=set_base_url"))).toBe(true);
  });

  it("does not import runtime provider execution code or call runtime APIs", () => {
    for (const pattern of forbiddenRuntimePatterns) expect(bridgeSource, `matched ${pattern}`).not.toMatch(pattern);
  });
});
