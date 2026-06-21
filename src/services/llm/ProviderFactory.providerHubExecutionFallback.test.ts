import { beforeAll, describe, expect, it, vi, beforeEach } from "vitest";
import type { LLMProvider } from "./LLMProvider";
import type { LucaSettings } from "../settingsService";

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

const mockProvider = (name: string, chat = vi.fn().mockResolvedValue({ text: name })) => ({
  name,
  generateContent: vi.fn().mockResolvedValue(name),
  chat,
  chatStream: vi.fn().mockResolvedValue({ text: name }),
  validateKey: vi.fn().mockResolvedValue({ valid: true, message: "ok" }),
}) as unknown as LLMProvider;

async function setRuntimeFlag(enabled: boolean, killSwitchEnabled = false) {
  const { settingsService } = await import("../settingsService");
  await settingsService.saveSettings({ providerHub: { runtimeRouteSelectionEnabled: enabled, runtimeRouteKillSwitchEnabled: killSwitchEnabled, disabledProviderIds: [] } });
}

describe("ProviderFactory execution-time fallback guard", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await setRuntimeFlag(false);
  });

  it("Provider Hub handoff route creation failure falls back to current ProviderFactory route once", async () => {
    const { ProviderFactory } = await import("./ProviderFactory");
    const currentRoute = { kind: "LUCA_PRIME", provider: "gemini", model: "gemini-1.5-pro" } as const;
    const finalRoute = { kind: "BYOK", provider: "openai", model: "gpt-4o", apiKeySource: "user_settings" } as const;
    vi.spyOn(ProviderFactory, "resolveProvisioningRouteWithDiagnostics").mockReturnValue({ route: finalRoute, finalRouteDecision: { currentRoute, handoffRoute: finalRoute, finalRoute, fallbackRoute: currentRoute, usedProviderHubHandoff: true, routeSource: "provider_hub_handoff", flagDisabledRestoresCurrentRoute: true, handoffStatus: "mapped", reason: "test", runtimeRouteSelectionEnabled: true, runtimeRouteKillSwitchEnabled: false, killSwitchForcedCurrentRoute: false, safeDiagnosticsText: "{}", providerApiCalledDuringSelection: false, providerAdapterInstantiatedByHandoffMapper: false, runtimeExecutionChanged: true } });
    const fallback = mockProvider("fallback");
    const spy = vi.spyOn(ProviderFactory, "createProviderForRoute")
      .mockImplementationOnce(() => { throw new Error("auth failed apiKey=sk-secret-value /tmp/private"); })
      .mockReturnValueOnce(fallback);

    const provider = ProviderFactory.createProvider(baseBrain({ provider: "cloud-managed", useCustomApiKey: false }));
    const result = ProviderFactory.getLastExecutionFallbackResult();

    expect(provider).toBe(fallback);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(result?.fallbackAttempted).toBe(true);
    expect(result?.fallbackUsed).toBe(true);
    expect(result?.trigger).toBe("authentication_error");
    expect(result?.sanitizedErrorMessage).not.toContain("sk-secret-value");
    expect(result?.sanitizedErrorMessage).not.toContain("/tmp/private");
  });

  it("fallback is not attempted when Provider Hub handoff was not active", async () => {
    const { ProviderFactory } = await import("./ProviderFactory");
    vi.spyOn(ProviderFactory, "createProviderForRoute").mockImplementation(() => { throw new Error("boom"); });

    expect(() => ProviderFactory.createProvider(baseBrain())).toThrow("boom");
    expect(ProviderFactory.getLastExecutionFallbackResult()?.fallbackAttempted).toBe(false);
  });

  it("fallback is not attempted if attempted route equals fallback route", async () => {
    const { createProviderFactoryExecutionFallbackResult } = await import("./ProviderFactory");
    const route = { kind: "LUCA_PRIME", provider: "gemini", model: "gemini-1.5-pro" } as const;
    const result = createProviderFactoryExecutionFallbackResult({ attemptedRoute: route, fallbackRoute: route, fallbackAttempted: false, fallbackUsed: false, error: new Error("same route"), providerHubHandoffWasActive: true, emergencyKillSwitchEnabled: false, fallbackLoopPrevented: true });
    expect(result.fallbackLoopPrevented).toBe(true);
    expect(result.fallbackAttempted).toBe(false);
  });

  it("first execution failure falls back once and prevents loops", async () => {
    const { ProviderFactory } = await import("./ProviderFactory");
    const currentRoute = { kind: "LUCA_PRIME", provider: "gemini", model: "gemini-1.5-pro" } as const;
    const finalRoute = { kind: "BYOK", provider: "openai", model: "gpt-4o", apiKeySource: "user_settings" } as const;
    vi.spyOn(ProviderFactory, "resolveProvisioningRouteWithDiagnostics").mockReturnValue({ route: finalRoute, finalRouteDecision: { currentRoute, handoffRoute: finalRoute, finalRoute, fallbackRoute: currentRoute, usedProviderHubHandoff: true, routeSource: "provider_hub_handoff", flagDisabledRestoresCurrentRoute: true, handoffStatus: "mapped", reason: "test", runtimeRouteSelectionEnabled: true, runtimeRouteKillSwitchEnabled: false, killSwitchForcedCurrentRoute: false, safeDiagnosticsText: "{}", providerApiCalledDuringSelection: false, providerAdapterInstantiatedByHandoffMapper: false, runtimeExecutionChanged: true } });
    const failingChat = vi.fn().mockRejectedValue(new Error("429 rate limit"));
    const fallbackChat = vi.fn().mockResolvedValue({ text: "fallback" });
    vi.spyOn(ProviderFactory, "createProviderForRoute")
      .mockReturnValueOnce(mockProvider("primary", failingChat))
      .mockReturnValueOnce(mockProvider("fallback", fallbackChat));

    const provider = ProviderFactory.createProvider(baseBrain({ provider: "cloud-managed", useCustomApiKey: false }));
    await expect(provider.chat([{ role: "user", content: "hi" }])).resolves.toEqual({ text: "fallback" });

    expect(failingChat).toHaveBeenCalledTimes(1);
    expect(fallbackChat).toHaveBeenCalledTimes(1);
    expect(ProviderFactory.getLastExecutionFallbackResult()?.trigger).toBe("rate_limit");
    expect(ProviderFactory.getLastExecutionFallbackResult()?.maxFallbackAttempts).toBe(1);
  });

  it("emergency kill switch active prevents Provider Hub route attempt", async () => {
    const { ProviderFactory } = await import("./ProviderFactory");
    await setRuntimeFlag(true, true);
    const spy = vi.spyOn(ProviderFactory, "createProviderForRoute").mockReturnValue(mockProvider("current"));

    ProviderFactory.createProvider(baseBrain({ provider: "cloud-managed", useCustomApiKey: false }));

    expect(ProviderFactory.getLastFinalRouteDecision()?.runtimeRouteKillSwitchEnabled).toBe(true);
    expect(ProviderFactory.getLastFinalRouteDecision()?.usedProviderHubHandoff).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toEqual(ProviderFactory.getLastFinalRouteDecision()?.currentRoute);
  });

  it("classifies timeout, model unavailable, and local runtime triggers", async () => {
    const { classifyProviderFactoryExecutionFallbackTrigger } = await import("./ProviderFactory");
    expect(classifyProviderFactoryExecutionFallbackTrigger(new Error("request timeout"))).toBe("provider_timeout");
    expect(classifyProviderFactoryExecutionFallbackTrigger(new Error("model not found"))).toBe("model_unavailable");
    expect(classifyProviderFactoryExecutionFallbackTrigger(new Error("ECONNREFUSED ollama"))).toBe("local_runtime_unavailable");
  });

  it("does not call provider APIs, connection tests, or local runtime startup during route selection", async () => {
    const { ProviderFactory } = await import("./ProviderFactory");
    await setRuntimeFlag(true);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    ProviderFactory.resolveProvisioningRouteWithDiagnostics(baseBrain());
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
