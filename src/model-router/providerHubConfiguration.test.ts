import { describe, expect, it } from "vitest";
import { createProviderHubSettingsPatch, getProviderHubSafeKeyStatus, serializeProviderHubConfigurationSafely } from "./providerHubConfiguration";
import { createProviderHubSettingsSnapshots } from "./providerHubSettingsSnapshot";
import { createProviderHubPanelViewModel } from "./providerHubPanelViewModel";
import type { LucaSettings } from "../services/settingsService";

const baseSettings = {
  general: { activeBrainId: null, activeEmbedId: null },
  brain: {
    useCustomApiKey: false,
    geminiApiKey: "",
    anthropicApiKey: "",
    openaiApiKey: "",
    xaiApiKey: "",
    deepseekApiKey: "",
    groqApiKey: "",
    openRouterApiKey: "",
    model: "",
    provider: "local-luca",
    embeddingModel: "",
  },
  providerHub: { disabledProviderIds: [] },
  memory: { provider: "local-luca", model: "" },
} as unknown as LucaSettings;

describe("providerHubConfiguration", () => {
  it("saves an OpenAI key through settings shape and readiness becomes ready", () => {
    const patch = createProviderHubSettingsPatch(baseSettings, { providerId: "openai", apiKey: "sk-live-secret", modelId: "gpt-4.1" });
    const settings = { ...baseSettings, brain: { ...baseSettings.brain, ...patch.brain } } as LucaSettings;
    const openai = createProviderHubPanelViewModel(createProviderHubSettingsSnapshots({ settings })).sections.flatMap((s) => s.cards).find((card) => card.entry.providerId === "openai");
    expect(openai?.readiness.ready).toBe(true);
    expect(getProviderHubSafeKeyStatus(settings, "openai")).toBe("API key saved");
  });

  it("saves custom OpenAI-compatible key and base URL so readiness becomes ready", () => {
    const patch = createProviderHubSettingsPatch(baseSettings, { providerId: "custom_openai_compatible", apiKey: "sk-custom-secret", baseUrl: "https://models.example/v1", modelId: "custom-model" });
    const settings = { ...baseSettings, brain: { ...baseSettings.brain, ...patch.brain } } as LucaSettings;
    const custom = createProviderHubPanelViewModel(createProviderHubSettingsSnapshots({ settings })).sections.flatMap((s) => s.cards).find((card) => card.entry.providerId === "custom_openai_compatible");
    expect(custom?.readiness.ready).toBe(true);
  });

  it("keeps Luca Prime managed without API key status", () => {
    expect(getProviderHubSafeKeyStatus(baseSettings, "luca_prime")).toBe("No user key required");
  });

  it("redacts secret-like values in serialized diagnostics", () => {
    const serialized = serializeProviderHubConfigurationSafely({ apiKey: "sk-secret-provider-hub", nested: { token: "secret-token" } });
    expect(serialized).not.toContain("sk-secret-provider-hub");
    expect(serialized).not.toContain("secret-token");
  });
});
