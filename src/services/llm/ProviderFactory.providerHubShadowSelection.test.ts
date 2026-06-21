import providerFactorySource from "./ProviderFactory.ts?raw";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { LucaSettings } from "../settingsService";

beforeAll(() => {
  process.env.LUCA_VAULT_KEY = "0".repeat(64);
});

describe("ProviderFactory shadow Provider Hub route diagnostics", () => {
  it("returns optional shadow diagnostics while preserving the selected route", async () => {
    const { ProviderFactory } = await import("./ProviderFactory");
    const brain = { model: "gpt-4o", provider: "byok", useCustomApiKey: true, openaiApiKey: "sk-secret-value" } as LucaSettings["brain"];
    const status = ProviderFactory.resolveProvisioningRouteWithDiagnostics(brain);

    expect(status.route).toEqual({ kind: "BYOK", provider: "openai", model: "gpt-4o", apiKeySource: "user_settings" });
    expect(status.providerHubShadowSelection).toBeDefined();
    expect(status.providerHubShadowSelection?.currentProviderId).toBe("openai");
    expect(status.providerHubShadowSelection?.runtimeExecutionChanged).toBe(false);
    expect(status.providerHubShadowSelection?.providerAdapterInstantiated).toBe(false);
    expect(ProviderFactory.getLastProviderHubShadowSelection()).toEqual(status.providerHubShadowSelection);
    expect(status.providerHubShadowSelection?.safeDiagnosticsText).not.toContain("sk-secret-value");
    expect(status.providerHubRouteHandoff).toBeDefined();
    expect(status.providerHubRouteHandoff?.providerApiCalled).toBe(false);
    expect(status.providerHubRouteHandoff?.providerAdapterInstantiated).toBe(false);
    expect(status.providerHubRouteHandoff?.safeDiagnosticsText).not.toContain("sk-secret-value");
  });

  it("keeps adapter creation routed through the existing ProviderFactory path", () => {
    const source = providerFactorySource;
    expect(source).toContain("return this.createProviderForRoute(route, settings)");
    expect(source).not.toMatch(/createProviderForRoute\(shadow|providerHubSelectedProviderId\)/);
    expect(source).not.toMatch(/testProviderHubConnection|startLocal|ollama serve|App\.tsx/);
  });
});

describe("ProviderFactory final Provider Hub handoff execution guard", () => {
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

  async function setRuntimeFlag(enabled: boolean, disabledProviderIds: string[] = []) {
    const { settingsService } = await import("../settingsService");
    await settingsService.saveSettings({ providerHub: { runtimeRouteSelectionEnabled: enabled, disabledProviderIds } });
  }

  it("flag disabled keeps the current route as final route", async () => {
    const { ProviderFactory } = await import("./ProviderFactory");
    await setRuntimeFlag(false);
    const status = ProviderFactory.resolveProvisioningRouteWithDiagnostics(baseBrain());
    expect(status.finalRouteDecision.usedProviderHubHandoff).toBe(false);
    expect(status.finalRouteDecision.finalRoute).toEqual(status.finalRouteDecision.currentRoute);
    expect(status.finalRouteDecision.runtimeExecutionChanged).toBe(false);
  });

  it("flag enabled with mapped Luca Prime handoff uses the handoff route", async () => {
    const { ProviderFactory } = await import("./ProviderFactory");
    await setRuntimeFlag(true);
    const status = ProviderFactory.resolveProvisioningRouteWithDiagnostics(baseBrain({ provider: "cloud-managed", useCustomApiKey: false, model: "gpt-4o" }));
    expect(status.providerHubRouteHandoff?.handoffStatus).toBe("mapped");
    expect(status.finalRouteDecision.usedProviderHubHandoff).toBe(true);
    expect(status.route).toEqual(status.providerHubRouteHandoff?.handoffRoute);
    expect(status.route.kind).toBe("LUCA_PRIME");
  });

  it("flag enabled with mapped OpenAI BYOK handoff and key uses the handoff route", async () => {
    const { ProviderFactory } = await import("./ProviderFactory");
    await setRuntimeFlag(true, ["luca_prime"]);
    const status = ProviderFactory.resolveProvisioningRouteWithDiagnostics(baseBrain());
    expect(status.providerHubRouteHandoff?.handoffStatus).toBe("mapped");
    expect(status.finalRouteDecision.usedProviderHubHandoff).toBe(true);
    expect(status.route).toEqual({ kind: "BYOK", provider: "openai", model: "gpt-4o", apiKeySource: "user_settings" });
  });

  it("flag enabled with missing config falls back to the current route", async () => {
    const { ProviderFactory } = await import("./ProviderFactory");
    await setRuntimeFlag(true, ["luca_prime"]);
    const status = ProviderFactory.resolveProvisioningRouteWithDiagnostics(baseBrain({ openaiApiKey: "" }));
    expect(status.finalRouteDecision.usedProviderHubHandoff).toBe(false);
    expect(status.finalRouteDecision.finalRoute).toEqual(status.finalRouteDecision.currentRoute);
    expect(status.providerHubRouteHandoff?.handoffStatus).not.toBe("mapped");
  });

  it("flag enabled with unsupported provider falls back to the current route", async () => {
    const { createProviderHubProviderFactoryRouteHandoff } = await import("../../model-router/providerHubProviderFactoryRouteHandoff");
    const handoff = createProviderHubProviderFactoryRouteHandoff({
      runtimeRouteSelectionEnabled: true,
      providerHubSelectedProviderId: "mistral",
      providerHubSelectedModelId: "mistral-large",
      decisionStatus: "selected",
      shouldUseProviderHubRoute: true,
      currentRoute: { kind: "LUCA_PRIME", provider: "gemini", model: "gemini-1.5-pro" },
      settings: baseBrain({ useCustomApiKey: false }),
      taskType: "chat",
      requiredCapabilities: ["text_generation"],
    });
    expect(handoff.handoffStatus).toBe("unsupported_provider");
    expect(handoff.handoffRoute).toEqual(handoff.fallbackRoute);
  });

  it("flag enabled with blocked decision falls back to the current route", async () => {
    const { createProviderHubProviderFactoryRouteHandoff } = await import("../../model-router/providerHubProviderFactoryRouteHandoff");
    const handoff = createProviderHubProviderFactoryRouteHandoff({
      runtimeRouteSelectionEnabled: true,
      providerHubSelectedProviderId: "openai",
      providerHubSelectedModelId: "gpt-4o",
      decisionStatus: "blocked",
      shouldUseProviderHubRoute: false,
      currentRoute: { kind: "BYOK", provider: "openai", model: "gpt-4o", apiKeySource: "user_settings" },
      settings: baseBrain(),
      taskType: "chat",
      requiredCapabilities: ["text_generation"],
    });
    expect(handoff.handoffStatus).toBe("blocked_decision");
    expect(handoff.shouldUseProviderHubRoute).toBe(false);
  });

  it("final route still goes through createProviderForRoute without direct Provider Hub instantiation", async () => {
    const { ProviderFactory } = await import("./ProviderFactory");
    await setRuntimeFlag(true);
    const spy = vi.spyOn(ProviderFactory, "createProviderForRoute").mockReturnValue({} as any);
    ProviderFactory.createProvider(baseBrain({ provider: "cloud-managed", useCustomApiKey: false }));
    expect(spy).toHaveBeenCalledWith(ProviderFactory.getLastFinalRouteDecision()?.finalRoute, expect.any(Object));
    spy.mockRestore();
  });

  it("does not leak secrets or perform Provider Hub side effects during selection", async () => {
    const { ProviderFactory } = await import("./ProviderFactory");
    await setRuntimeFlag(true);
    const status = ProviderFactory.resolveProvisioningRouteWithDiagnostics(baseBrain());
    expect(status.finalRouteDecision.safeDiagnosticsText).not.toContain("sk-secret-value");
    expect(status.finalRouteDecision.providerApiCalledDuringSelection).toBe(false);
    expect(status.finalRouteDecision.providerAdapterInstantiatedByHandoffMapper).toBe(false);
    expect(status.providerHubRouteHandoff?.providerApiCalled).toBe(false);
    expect(status.providerHubRouteHandoff?.providerAdapterInstantiated).toBe(false);
  });
});
