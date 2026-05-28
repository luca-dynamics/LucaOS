import { describe, expect, it, vi } from "vitest";
import type { LucaSettings } from "../settingsService";
import type { LocalModel } from "../ModelManagerService";
import type { ModelCapability, ModelRouteDecision } from "../../types/modelRouting";
import { OnboardingModelModeCoordinator } from "./OnboardingModelModeCoordinator";

function makeSettings(provider: LucaSettings["brain"]["provider"] = "local-luca"): LucaSettings {
  return {
    general: {
      backgroundBlur: 40,
      backgroundOpacity: 0.3,
      startOnBoot: false,
      minimizeToTray: false,
      debugMode: false,
      userName: "Operator",
      setupComplete: false,
      agencyLevel: "PROACTIVE",
      autonomousDomains: [],
      persona: "ASSISTANT",
      theme: "PROFESSIONAL",
      preferredMode: "text",
      syncThemeWithPersona: true,
      toneStyle: "CHILL",
      experimentalMode: false,
      fontScale: 1,
      fontFamily: "Inter",
      activeBrainId: "llama-3.2-1b",
      activeEmbedId: "nomic-embed-text",
    },
    hardwareSanitized: true,
    v1betaMigrationComplete: true,
    notifications: {
      enabled: true,
      voiceEnabled: true,
      visualEnabled: true,
      chatEnabled: true,
      tradingVoiceEnabled: true,
      priorityThreshold: "MEDIUM",
    },
    brain: {
      useCustomApiKey: false,
      geminiApiKey: "",
      anthropicApiKey: "",
      openaiApiKey: "",
      xaiApiKey: "",
      xaiBaseUrl: "",
      deepseekApiKey: "",
      groqApiKey: "",
      groqBaseUrl: "https://api.groq.com/openai/v1",
      model: "llama-3.2-1b",
      provider,
      voiceModel: "gemini-3-flash-preview",
      visionModel: "gemini-3-flash-preview",
      memoryModel: "nomic-embed-text",
      temperature: 0.7,
      autoContextWindow: true,
      preferOllama: true,
      conversationMode: "fast",
      activePluginId: null,
      embeddingModel: "nomic-embed-text",
    },
    memory: {
      provider: "local-luca",
      model: "nomic-embed-text",
      sovereignFacts: [],
    },
    voice: {
      provider: "local-luca",
      googleApiKey: "",
      voiceId: "piper-amy",
      rate: 1,
      pitch: 1,
      style: "Natural",
      pacing: "Normal",
      voiceModel: "gemini-3-flash-preview",
      sttModel: "whisper-tiny",
      wakeWordEnabled: false,
    },
    iot: { haUrl: "", haToken: "" },
    connectors: {
      whatsapp: false,
      telegram: false,
      linkedin: false,
      google: false,
      youtube: false,
      twitter: false,
      instagram: false,
      discord: false,
      signal: false,
      notion: false,
      obsidian: false,
    },
    telegram: { apiId: "", apiHash: "", phoneNumber: "" },
    lucaLink: { enabled: false, connectionMode: "auto", relayServerUrl: "", vpnServerUrl: "" },
    mcp: { servers: [] },
    mobile: { offlineModel: "none", offlineModelDownloaded: false },
    socialPersistence: {},
    privacy: { micEnabled: true, cameraEnabled: true, screenEnabled: true, telemetryEnabled: false },
    autonomy: {
      backgroundMissionsEnabled: false,
      shadowExecutionEnabled: false,
      doubleBrainConsensus: false,
      resourceAwareThrottling: true,
      idleThresholdMinutes: 10,
    },
  };
}

function makeRoute(capability: ModelCapability, readiness: ModelRouteDecision["readiness"] = "ready"): ModelRouteDecision {
  return {
    capability,
    provider: "luca-prime",
    model: "gemini-3-flash-preview",
    mode: "luca-prime",
    reason: readiness === "ready" ? `${capability} ready` : `${capability} blocked`,
    warnings: readiness === "ready" ? [] : [`${capability} warning`],
    readiness,
    privacy: "cloud_managed",
    fallbackPolicy: "prime_to_local",
    networkAllowed: readiness === "ready",
  };
}

function makeCoordinator(routeFactory: (capability: ModelCapability) => ModelRouteDecision = makeRoute) {
  let settings = makeSettings();
  const discovery = { enabled: false };
  const saveSettings = vi.fn(async (partial: Partial<LucaSettings>) => {
    settings = {
      ...settings,
      ...partial,
      general: { ...settings.general, ...partial.general },
      brain: { ...settings.brain, ...partial.brain },
      memory: { ...settings.memory, ...partial.memory },
      voice: { ...settings.voice, ...partial.voice },
      onboarding: { ...(settings as any).onboarding, ...(partial as any).onboarding },
    };
  });
  const resolveRoute = vi.fn(async ({ capability }: { capability: ModelCapability }) =>
    routeFactory(capability),
  );
  const localModel: LocalModel = {
    id: "llama-3.2-1b",
    name: "Llama 3.2 1B",
    description: "safe local model",
    size: 1,
    sizeFormatted: "1 GB",
    category: "brain",
    status: "ready",
    platforms: ["desktop"],
    runtime: "ollama",
    catalogStatus: "verified",
  };

  return {
    coordinator: new OnboardingModelModeCoordinator({
      settings: {
        getSettings: () => settings,
        get: (section) => settings[section],
        saveSettings,
        setLocalDiscoveryOverride: (enabled) => {
          discovery.enabled = enabled;
        },
      },
      readinessResolver: { resolveRoute },
      models: {
        getModels: vi.fn(async () => [localModel]),
        getModelsByCategory: vi.fn(() => [localModel]),
      },
    }),
    getSettings: () => settings,
    discovery,
    saveSettings,
    resolveRoute,
  };
}

describe("OnboardingModelModeCoordinator", () => {
  it("selecting Luca Prime maps onboarding to cloud-managed settings", async () => {
    const { coordinator, getSettings, discovery } = makeCoordinator();

    await coordinator.selectLucaPrimeMode();

    expect(getSettings().brain.provider).toBe("cloud-managed");
    expect(getSettings().brain.preferOllama).toBe(false);
    expect(discovery.enabled).toBe(false);
  });

  it("selecting Local maps onboarding to local-luca and enables discovery", async () => {
    const { coordinator, getSettings, discovery } = makeCoordinator();

    await coordinator.selectLocalMode();

    expect(getSettings().brain.provider).toBe("local-luca");
    expect(getSettings().brain.preferOllama).toBe(true);
    expect(discovery.enabled).toBe(true);
  });

  it("selecting BYOK maps onboarding to byok without treating redacted keys as usable", async () => {
    const { coordinator, getSettings } = makeCoordinator();

    await coordinator.selectByokMode({ provider: "openai", apiKey: "[SECURED]" });

    expect(getSettings().brain.provider).toBe("byok");
    expect(getSettings().brain.openaiApiKey).toBe("");
    expect(getSettings().brain.model).toBe("gpt-4.1-mini");
  });

  it("uses the readiness resolver for chat, embedding, and voice checks", async () => {
    const { coordinator, resolveRoute } = makeCoordinator();

    await coordinator.getOnboardingModelReadiness({ includeVoice: true });

    expect(resolveRoute).toHaveBeenCalledWith({ capability: "chat" });
    expect(resolveRoute).toHaveBeenCalledWith({ capability: "embedding" });
    expect(resolveRoute).toHaveBeenCalledWith({ capability: "stt" });
    expect(resolveRoute).toHaveBeenCalledWith({ capability: "tts" });
  });

  it("persists blocked route warnings instead of throwing", async () => {
    const { coordinator, getSettings } = makeCoordinator((capability) =>
      capability === "stt" ? makeRoute(capability, "missing_runtime") : makeRoute(capability),
    );

    const readiness = await coordinator.confirmSelectedModelRoute({ voiceSelected: true });

    expect(readiness.blocked).toBe(true);
    expect(readiness.warnings[0].capability).toBe("stt");
    expect((getSettings() as any).onboarding.modelRouteWarnings[0].reason).toBe("stt blocked");
  });
});
