import { describe, expect, it } from "vitest";
import type { LucaSettings } from "../settingsService";
import { resolveModelRouteFromSnapshot } from "./ModelReadinessResolver";

function makeSettings(
  provider: LucaSettings["brain"]["provider"],
): LucaSettings {
  return {
    general: {
      backgroundBlur: 40,
      backgroundOpacity: 0.3,
      startOnBoot: false,
      minimizeToTray: false,
      debugMode: false,
      userName: "Operator",
      setupComplete: true,
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
      model: "gemini-3-flash-preview",
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
    lucaLink: {
      enabled: false,
      connectionMode: "auto",
      relayServerUrl: "",
      vpnServerUrl: "",
    },
    mcp: { servers: [] },
    mobile: { offlineModel: "none", offlineModelDownloaded: false },
    socialPersistence: {},
    privacy: {
      micEnabled: true,
      cameraEnabled: true,
      screenEnabled: true,
      telemetryEnabled: false,
    },
    autonomy: {
      backgroundMissionsEnabled: false,
      shadowExecutionEnabled: false,
      doubleBrainConsensus: false,
      resourceAwareThrottling: true,
      idleThresholdMinutes: 10,
    },
  };
}

describe("ModelReadinessResolver pure route decisions", () => {
  it("blocks local mode when runtime is missing", () => {
    const decision = resolveModelRouteFromSnapshot(
      {
        settings: makeSettings("local-luca"),
        localRuntimeAvailable: false,
        localModel: {
          id: "llama-3.2-1b",
          status: "ready",
          runtime: "ollama",
          ollamaTag: "llama3.2:1b",
        },
      },
      { capability: "chat" },
    );

    expect(decision.mode).toBe("local");
    expect(decision.readiness).toBe("missing_runtime");
    expect(decision.networkAllowed).toBe(false);
  });

  it("routes local mode to a ready local model", () => {
    const decision = resolveModelRouteFromSnapshot(
      {
        settings: makeSettings("local-luca"),
        localRuntimeAvailable: true,
        localModel: {
          id: "llama-3.2-1b",
          status: "ready",
          runtime: "ollama",
          ollamaTag: "llama3.2:1b",
        },
      },
      { capability: "chat" },
    );

    expect(decision.provider).toBe("ollama");
    expect(decision.readiness).toBe("ready");
    expect(decision.privacy).toBe("local_only");
  });

  it("blocks BYOK when the selected provider key is missing", () => {
    const settings = makeSettings("byok");
    settings.brain.model = "gpt-4o";
    const decision = resolveModelRouteFromSnapshot(
      { settings, keyStates: { openai: { hasKey: false, source: "none" } } },
      { capability: "chat" },
    );

    expect(decision.mode).toBe("byok");
    expect(decision.provider).toBe("openai");
    expect(decision.readiness).toBe("missing_key");
    expect(decision.networkAllowed).toBe(false);
  });

  it("routes Luca Prime through managed cloud readiness", () => {
    const decision = resolveModelRouteFromSnapshot(
      {
        settings: makeSettings("cloud-managed"),
        keyStates: { gemini: { hasKey: true, source: "environment" } },
      },
      { capability: "chat" },
    );

    expect(decision.mode).toBe("luca-prime");
    expect(decision.provider).toBe("luca-prime");
    expect(decision.readiness).toBe("ready");
    expect(decision.networkAllowed).toBe(true);
  });

  it("resolves voice STT/TTS readiness without cloud fallback in local mode", () => {
    const stt = resolveModelRouteFromSnapshot(
      {
        settings: makeSettings("local-luca"),
        localRuntimeAvailable: true,
        localModel: {
          id: "whisper-tiny",
          status: "ready",
          runtime: "internal",
        },
      },
      { capability: "stt" },
    );
    const tts = resolveModelRouteFromSnapshot(
      {
        settings: makeSettings("local-luca"),
        localRuntimeAvailable: true,
        localModel: { id: "piper-amy", status: "ready", runtime: "internal" },
      },
      { capability: "tts" },
    );

    expect(stt.provider).toBe("cortex");
    expect(tts.provider).toBe("cortex");
    expect(stt.networkAllowed).toBe(false);
    expect(tts.networkAllowed).toBe(false);
  });
});
