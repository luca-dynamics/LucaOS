import providerFactorySource from "./ProviderFactory.ts?raw";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { LLMProvider } from "./LLMProvider";
import type { LucaSettings } from "../settingsService";
import type { LucaProviderHubId } from "../../model-router/providerHubRegistry";

beforeAll(() => {
  process.env.LUCA_VAULT_KEY = "0".repeat(64);
});

const baseBrain = (overrides: Partial<LucaSettings["brain"]> = {}) => ({
  model: "gpt-4o",
  provider: "byok",
  useCustomApiKey: true,
  geminiApiKey: "",
  anthropicApiKey: "",
  openaiApiKey: "sk-secret-value",
  xaiApiKey: "",
  deepseekApiKey: "",
  groqApiKey: "",
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
}) as LucaSettings["brain"];

async function setRuntimeFlag(enabled: boolean, disabledProviderIds: LucaProviderHubId[] = [], killSwitchEnabled = false) {
  const { settingsService } = await import("../settingsService");
  await settingsService.saveSettings({ providerHub: { runtimeRouteSelectionEnabled: enabled, runtimeRouteKillSwitchEnabled: killSwitchEnabled, disabledProviderIds } });
}

const mockProvider = (name: string, chat = vi.fn().mockResolvedValue({ text: name })) => ({
  name,
  generateContent: vi.fn().mockResolvedValue(name),
  chat,
  chatStream: vi.fn().mockResolvedValue({ text: name }),
  validateKey: vi.fn().mockResolvedValue({ valid: true, message: "ok" }),
}) as unknown as LLMProvider;

describe("ProviderFactory Provider Hub Long Context runtime guard", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await setRuntimeFlag(false);
  });

  it("uses the long_context policy with long_context and managed_first", async () => {
    const { ProviderFactory, createProviderHubLongContextRuntimeGuardSummary } = await import("./ProviderFactory");
    await setRuntimeFlag(true);

    const status = ProviderFactory.resolveLongContextProvisioningRouteWithDiagnostics(baseBrain());
    const summary = createProviderHubLongContextRuntimeGuardSummary(status.finalRouteDecision);

    expect(status.providerHubShadowSelection?.taskType).toBe("long_context");
    expect(status.providerHubShadowSelection?.requiredCapabilities).toEqual(["long_context"]);
    expect(status.providerHubShadowSelection?.safeDiagnosticsText).toContain('"routePreference":"managed_first"');
    expect(summary.taskType).toBe("long_context");
    expect(summary.requiredCapabilities).toEqual(["long_context"]);
    expect(summary.preference).toBe("managed_first");
  });

  it("flag disabled keeps Long Context on the current ProviderFactory route", async () => {
    const { ProviderFactory } = await import("./ProviderFactory");
    await setRuntimeFlag(false);
    const status = ProviderFactory.resolveLongContextProvisioningRouteWithDiagnostics(baseBrain());
    expect(status.finalRouteDecision.finalRoute).toEqual(status.finalRouteDecision.currentRoute);
    expect(status.finalRouteDecision.routeSource).toBe("current_provider_factory");
    expect(status.finalRouteDecision.fallbackReasonCode).toBe("flag_disabled");
  });

  it("flag enabled with a mapped provider uses the guarded Long Context handoff", async () => {
    const { ProviderFactory } = await import("./ProviderFactory");
    await setRuntimeFlag(true, ["luca_prime"]);
    const status = ProviderFactory.resolveLongContextProvisioningRouteWithDiagnostics(baseBrain());
    expect(status.providerHubRouteHandoff?.handoffStatus).toBe("mapped");
    expect(status.finalRouteDecision.routeSource).toBe("provider_hub_handoff");
    expect(status.route).toEqual({ kind: "BYOK", provider: "openai", model: "gpt-4o", apiKeySource: "user_settings" });
  });

  it("kill switch, missing config, and unsupported providers fall back to current route", async () => {
    const { ProviderFactory, createFinalRouteDecision } = await import("./ProviderFactory");
    const { createProviderHubProviderFactoryRouteHandoff } = await import("../../model-router/providerHubProviderFactoryRouteHandoff");

    await setRuntimeFlag(true, [], true);
    const killed = ProviderFactory.resolveLongContextProvisioningRouteWithDiagnostics(baseBrain({ provider: "cloud-managed", useCustomApiKey: false }));
    expect(killed.finalRouteDecision.fallbackReasonCode).toBe("kill_switch_enabled");
    expect(killed.finalRouteDecision.finalRoute).toEqual(killed.finalRouteDecision.currentRoute);

    const currentRoute = { kind: "LUCA_PRIME", provider: "gemini", model: "gemini-1.5-pro" } as const;
    const missingHandoff = createProviderHubProviderFactoryRouteHandoff({ runtimeRouteSelectionEnabled: true, providerHubSelectedProviderId: "openai", providerHubSelectedModelId: "gpt-4o", decisionStatus: "selected", shouldUseProviderHubRoute: true, currentRoute, settings: baseBrain({ openaiApiKey: "" }), taskType: "long_context", requiredCapabilities: ["long_context"] });
    expect(createFinalRouteDecision(currentRoute, missingHandoff, true).fallbackReasonCode).toBe("missing_configuration");

    const unsupported = createProviderHubProviderFactoryRouteHandoff({ runtimeRouteSelectionEnabled: true, providerHubSelectedProviderId: "mistral" as any, providerHubSelectedModelId: "mistral-large", decisionStatus: "selected", shouldUseProviderHubRoute: true, currentRoute, settings: baseBrain({ useCustomApiKey: false }), taskType: "long_context", requiredCapabilities: ["long_context"] });
    expect(createFinalRouteDecision(currentRoute, unsupported, true).fallbackReasonCode).toBe("unsupported_provider");
  });

  it("execution-time fallback applies when the Long Context Provider Hub route fails", async () => {
    const { ProviderFactory, createProviderHubLongContextRuntimeGuardSummary } = await import("./ProviderFactory");
    await setRuntimeFlag(true, ["luca_prime"]);
    const failingChat = vi.fn().mockRejectedValue(new Error("429 rate limit sk-secret-value"));
    const fallbackChat = vi.fn().mockResolvedValue({ text: "fallback" });
    vi.spyOn(ProviderFactory, "createProviderForRoute")
      .mockReturnValueOnce(mockProvider("primary", failingChat))
      .mockReturnValueOnce(mockProvider("fallback", fallbackChat));

    const provider = ProviderFactory.createLongContextProvider(baseBrain({ provider: "cloud-managed", useCustomApiKey: false }));
    await expect(provider.chat([{ role: "user", content: "long context" }])).resolves.toEqual({ text: "fallback" });
    const summary = createProviderHubLongContextRuntimeGuardSummary(ProviderFactory.getLastFinalRouteDecision()!, ProviderFactory.getLastExecutionFallbackResult());
    expect(ProviderFactory.getLastExecutionFallbackResult()?.fallbackUsed).toBe(true);
    expect(summary.executionFallbackStatus?.fallbackUsed).toBe(true);
    expect(summary.safeDiagnosticsText).not.toContain("sk-secret-value");
  });

  it("does not call provider APIs, auto-test connections, start local runtimes, leak secrets, or expand other surfaces during selection", async () => {
    const { ProviderFactory, createProviderHubLongContextRuntimeGuardSummary } = await import("./ProviderFactory");
    await setRuntimeFlag(true);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const status = ProviderFactory.resolveLongContextProvisioningRouteWithDiagnostics(baseBrain());
    const summary = createProviderHubLongContextRuntimeGuardSummary(status.finalRouteDecision);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(status.providerHubRouteHandoff?.providerApiCalled).toBe(false);
    expect(summary.automaticConnectionTestStarted).toBe(false);
    expect(summary.localRuntimeStarted).toBe(false);
    expect(summary.safeDiagnosticsText).not.toContain("sk-secret-value");
    expect(providerFactorySource).toContain('Extract<LucaModelTaskType, "chat" | "fast_reply" | "long_context" | "code">');
    expect(providerFactorySource).not.toContain("testProviderHubConnection");
    expect(providerFactorySource).not.toMatch(/startLocal|ollama serve|child_process|spawn\(/i);
    fetchSpy.mockRestore();
  });
});
