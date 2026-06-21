import providerFactorySource from "./ProviderFactory.ts?raw";
import { beforeAll, describe, expect, it, vi } from "vitest";
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

async function setRuntimeFlag(enabled: boolean, disabledProviderIds: LucaProviderHubId[] = []) {
  const { settingsService } = await import("../settingsService");
  await settingsService.saveSettings({ providerHub: { runtimeRouteSelectionEnabled: enabled, disabledProviderIds } });
}

describe("ProviderFactory Provider Hub chat runtime guard QA", () => {
  it("flag disabled keeps the chat final route equal to the current ProviderFactory route", async () => {
    const { ProviderFactory, createProviderHubChatRuntimeGuardSummary } = await import("./ProviderFactory");
    await setRuntimeFlag(false);

    const status = ProviderFactory.resolveProvisioningRouteWithDiagnostics(baseBrain());
    const summary = createProviderHubChatRuntimeGuardSummary(status.finalRouteDecision, false);

    expect(status.finalRouteDecision.finalRoute).toEqual(status.finalRouteDecision.currentRoute);
    expect(status.finalRouteDecision.routeSource).toBe("current_provider_factory");
    expect(status.finalRouteDecision.fallbackReasonCode).toBe("flag_disabled");
    expect(summary.runtimeRouteSelectionEnabled).toBe(false);
  });

  it("flag enabled with mapped Luca Prime uses the guarded chat handoff", async () => {
    const { ProviderFactory } = await import("./ProviderFactory");
    await setRuntimeFlag(true);

    const status = ProviderFactory.resolveProvisioningRouteWithDiagnostics(baseBrain({ provider: "cloud-managed", useCustomApiKey: false }));

    expect(status.providerHubShadowSelection?.taskType).toBe("chat");
    expect(status.providerHubRouteHandoff?.handoffStatus).toBe("mapped");
    expect(status.finalRouteDecision.routeSource).toBe("provider_hub_handoff");
    expect(status.route).toEqual(status.providerHubRouteHandoff?.handoffRoute);
    expect(status.route.kind).toBe("LUCA_PRIME");
  });

  it("flag enabled with mapped OpenAI BYOK and key uses BYOK handoff", async () => {
    const { ProviderFactory } = await import("./ProviderFactory");
    await setRuntimeFlag(true, ["luca_prime"]);

    const status = ProviderFactory.resolveProvisioningRouteWithDiagnostics(baseBrain());

    expect(status.providerHubRouteHandoff?.handoffStatus).toBe("mapped");
    expect(status.finalRouteDecision.routeSource).toBe("provider_hub_handoff");
    expect(status.route).toEqual({ kind: "BYOK", provider: "openai", model: "gpt-4o", apiKeySource: "user_settings" });
  });

  it("falls back deterministically for missing key, unsupported provider, and blocked/configuration_required decisions", async () => {
    const { ProviderFactory, createFinalRouteDecision } = await import("./ProviderFactory");
    const { createProviderHubProviderFactoryRouteHandoff } = await import("../../model-router/providerHubProviderFactoryRouteHandoff");
    await setRuntimeFlag(true, ["luca_prime"]);

    const missingKey = ProviderFactory.resolveProvisioningRouteWithDiagnostics(baseBrain({ openaiApiKey: "" }));
    expect(missingKey.finalRouteDecision.finalRoute).toEqual(missingKey.finalRouteDecision.currentRoute);
    expect(missingKey.finalRouteDecision.routeSource).toBe("current_provider_factory");

    const currentRoute = { kind: "LUCA_PRIME", provider: "gemini", model: "gemini-1.5-pro" } as const;
    const missingConfiguration = createProviderHubProviderFactoryRouteHandoff({ runtimeRouteSelectionEnabled: true, providerHubSelectedProviderId: "openai", providerHubSelectedModelId: "gpt-4o", decisionStatus: "selected", shouldUseProviderHubRoute: true, currentRoute, settings: baseBrain({ openaiApiKey: "" }), taskType: "chat", requiredCapabilities: ["text_generation"] });
    expect(createFinalRouteDecision(currentRoute, missingConfiguration, true).fallbackReasonCode).toBe("missing_configuration");

    const unsupported = createProviderHubProviderFactoryRouteHandoff({ runtimeRouteSelectionEnabled: true, providerHubSelectedProviderId: "mistral" as any, providerHubSelectedModelId: "mistral-large", decisionStatus: "selected", shouldUseProviderHubRoute: true, currentRoute, settings: baseBrain({ useCustomApiKey: false }), taskType: "chat", requiredCapabilities: ["text_generation"] });
    expect(createFinalRouteDecision(currentRoute, unsupported, true).fallbackReasonCode).toBe("unsupported_provider");

    const blocked = createProviderHubProviderFactoryRouteHandoff({ runtimeRouteSelectionEnabled: true, providerHubSelectedProviderId: "openai", providerHubSelectedModelId: "gpt-4o", decisionStatus: "configuration_required", shouldUseProviderHubRoute: false, currentRoute, settings: baseBrain(), taskType: "chat", requiredCapabilities: ["text_generation"] });
    expect(createFinalRouteDecision(currentRoute, blocked, true).fallbackReasonCode).toBe("blocked_decision");
  });

  it("disabling the flag after enabling restores the current chat route", async () => {
    const { ProviderFactory } = await import("./ProviderFactory");
    await setRuntimeFlag(true);
    const enabled = ProviderFactory.resolveProvisioningRouteWithDiagnostics(baseBrain({ provider: "cloud-managed", useCustomApiKey: false }));
    expect(enabled.finalRouteDecision.routeSource).toBe("provider_hub_handoff");

    await setRuntimeFlag(false);
    const disabled = ProviderFactory.resolveProvisioningRouteWithDiagnostics(baseBrain({ provider: "cloud-managed", useCustomApiKey: false }));
    expect(disabled.finalRouteDecision.routeSource).toBe("current_provider_factory");
    expect(disabled.finalRouteDecision.finalRoute).toEqual(disabled.finalRouteDecision.currentRoute);
  });

  it("keeps diagnostics secret-free and selection side-effect free", async () => {
    const { ProviderFactory, createProviderHubChatRuntimeGuardSummary } = await import("./ProviderFactory");
    await setRuntimeFlag(true);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const status = ProviderFactory.resolveProvisioningRouteWithDiagnostics(baseBrain());
    const summary = createProviderHubChatRuntimeGuardSummary(status.finalRouteDecision, true);

    expect(status.providerHubShadowSelection?.taskType).toBe("chat");
    expect(status.providerHubRouteHandoff?.safeDiagnosticsText).not.toContain("sk-secret-value");
    expect(status.finalRouteDecision.safeDiagnosticsText).not.toContain("sk-secret-value");
    expect(summary.safeDiagnosticsText).not.toContain("sk-secret-value");
    expect(status.finalRouteDecision.providerApiCalledDuringSelection).toBe(false);
    expect(status.providerHubRouteHandoff?.providerApiCalled).toBe(false);
    expect(status.providerHubRouteHandoff?.sideEffectsPerformed).toBe(false);
    expect(summary.automaticConnectionTestStarted).toBe(false);
    expect(summary.localRuntimeStarted).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("preserves createProviderForRoute as the adapter creation path and avoids runtime expansion hooks", () => {
    expect(providerFactorySource).toContain("return this.createProviderForRoute(route, settings)");
    expect(providerFactorySource).toContain("resolveProviderHubTaskRoutePolicy");
    expect(providerFactorySource).toContain("taskType: chatPolicy.taskType");
    expect(providerFactorySource).not.toContain("testProviderHubConnection");
    expect(providerFactorySource).not.toMatch(/startLocal|ollama serve|child_process|spawn\(/i);
  });
});
