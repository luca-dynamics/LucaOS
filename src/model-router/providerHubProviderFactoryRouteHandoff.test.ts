import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createProviderHubProviderFactoryRouteHandoff } from "./providerHubProviderFactoryRouteHandoff";
import type { ModelProvisioningRoute } from "../services/llm/ProviderFactory";
import type { LucaSettings } from "../services/settingsService";

const currentRoute: ModelProvisioningRoute = { kind: "LUCA_PRIME", provider: "gemini", model: "gemini-1.5-pro" };

function brain(overrides: Partial<LucaSettings["brain"]> = {}): LucaSettings["brain"] {
  return {
    useCustomApiKey: false,
    geminiApiKey: "",
    anthropicApiKey: "",
    openaiApiKey: "",
    xaiApiKey: "",
    deepseekApiKey: "",
    groqApiKey: "",
    model: "gemini-1.5-pro",
    provider: "cloud-managed",
    voiceModel: "",
    visionModel: "",
    memoryModel: "",
    temperature: 0.7,
    autoContextWindow: true,
    preferOllama: false,
    conversationMode: "fast",
    activePluginId: null,
    embeddingModel: "",
    ...overrides,
  };
}

function handoff(overrides: Partial<Parameters<typeof createProviderHubProviderFactoryRouteHandoff>[0]> = {}) {
  return createProviderHubProviderFactoryRouteHandoff({
    runtimeRouteSelectionEnabled: true,
    providerHubSelectedProviderId: "luca_prime",
    providerHubSelectedModelId: "gemini-1.5-flash",
    decisionStatus: "selected",
    shouldUseProviderHubRoute: true,
    currentRoute,
    settings: brain(),
    taskType: "chat",
    requiredCapabilities: ["text_generation"],
    ...overrides,
  });
}

describe("providerHubProviderFactoryRouteHandoff", () => {
  it("falls back to the current route when the runtime flag is disabled", () => {
    const result = handoff({ runtimeRouteSelectionEnabled: false });
    expect(result.handoffStatus).toBe("disabled");
    expect(result.shouldUseProviderHubRoute).toBe(false);
    expect(result.handoffRoute).toEqual(currentRoute);
  });

  it("maps enabled luca_prime selection to the Luca Prime route shape", () => {
    const result = handoff();
    expect(result.handoffStatus).toBe("mapped");
    expect(result.handoffRoute).toEqual({ kind: "LUCA_PRIME", provider: "gemini", model: "gemini-1.5-flash" });
  });

  it("maps OpenAI with configured key to the existing BYOK ProviderFactory route shape", () => {
    const result = handoff({ providerHubSelectedProviderId: "openai", providerHubSelectedModelId: "gpt-4o", settings: brain({ openaiApiKey: "sk-secret-value" }) });
    expect(result.handoffStatus).toBe("mapped");
    expect(result.handoffRoute).toEqual({ kind: "BYOK", provider: "openai", model: "gpt-4o", apiKeySource: "user_settings" });
  });

  it("falls back for unsupported providers", () => {
    const result = handoff({ providerHubSelectedProviderId: "custom_openai_compatible" });
    expect(result.handoffStatus).toBe("unsupported_provider");
    expect(result.handoffRoute).toEqual(currentRoute);
  });

  it("falls back for blocked and configuration_required decisions", () => {
    expect(handoff({ decisionStatus: "blocked", shouldUseProviderHubRoute: false }).handoffStatus).toBe("blocked_decision");
    expect(handoff({ decisionStatus: "configuration_required", shouldUseProviderHubRoute: false }).handoffStatus).toBe("blocked_decision");
  });

  it("falls back when required provider configuration is missing", () => {
    const result = handoff({ providerHubSelectedProviderId: "anthropic", providerHubSelectedModelId: "claude-3-5-sonnet" });
    expect(result.handoffStatus).toBe("missing_configuration");
    expect(result.handoffRoute).toEqual(currentRoute);
  });

  it("keeps guard diagnostics side-effect free and excludes secrets", () => {
    const result = handoff({ providerHubSelectedProviderId: "openai", settings: brain({ openaiApiKey: "sk-secret-value" }) });
    expect(result.providerApiCalled).toBe(false);
    expect(result.sideEffectsPerformed).toBe(false);
    expect(result.providerAdapterInstantiated).toBe(false);
    expect(result.runtimeExecutionChanged).toBe(false);
    expect(result.safeDiagnosticsText).not.toContain("sk-secret-value");
  });

  it("does not import adapters, connection tests, provider APIs, or local runtime starters", () => {
    const source = readFileSync("src/model-router/providerHubProviderFactoryRouteHandoff.ts", "utf8");
    expect(source).not.toMatch(/import .*Adapter|new .*Adapter|testProviderHubConnection|fetch\(|WebSocket|ollamaUrl|child_process|spawn\(/);
  });
});
