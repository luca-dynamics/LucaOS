import { describe, expect, it } from "vitest";
import type { LucaSettings } from "../settingsService";
import { resolveMemoryRouteFromSnapshot } from "./MemoryReadinessResolver";
import type { ModelRouteDecision } from "../../types/modelRouting";

function makeSettings(overrides: Partial<LucaSettings> = {}): LucaSettings {
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
      provider: "local-luca",
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
    memory: { provider: "local-luca", model: "nomic-embed-text", sovereignFacts: [] },
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
    ...overrides,
  };
}

function makeEmbeddingRoute(overrides: Partial<ModelRouteDecision> = {}): ModelRouteDecision {
  return {
    capability: "embedding",
    provider: "cortex",
    model: "nomic-embed-text",
    mode: "local",
    reason: "Local embedding model is ready.",
    warnings: [],
    readiness: "ready",
    privacy: "local_only",
    fallbackPolicy: "no_fallback",
    networkAllowed: false,
    runtime: "cortex",
    localModelId: "nomic-embed-text",
    ...overrides,
  };
}

describe("MemoryReadinessResolver pure route logic", () => {
  it("marks local memory ready when embedding route and vector store are ready", () => {
    const decision = resolveMemoryRouteFromSnapshot({
      settings: makeSettings(),
      embeddingRoute: makeEmbeddingRoute(),
      vectorStoreAvailable: true,
      localEmbeddingModel: { id: "nomic-embed-text", status: "ready", runtime: "internal" },
    });

    expect(decision.mode).toBe("local");
    expect(decision.readiness).toBe("ready");
    expect(decision.privacy).toBe("local_only");
    expect(decision.networkAllowed).toBe(false);
    expect(decision.capabilities.embed.canRun).toBe(true);
  });

  it("blocks local memory when the embedding model is missing", () => {
    const decision = resolveMemoryRouteFromSnapshot({
      settings: makeSettings(),
      embeddingRoute: makeEmbeddingRoute({ readiness: "missing_model", reason: "Model missing." }),
      vectorStoreAvailable: true,
    });

    expect(decision.readiness).toBe("missing_embedding_model");
    expect(decision.capabilities.embed.canRun).toBe(false);
    expect(decision.warnings.join(" ")).toContain("Local-only memory will not use cloud fallback");
  });

  it("blocks BYOK memory when the provider key is missing without exposing raw keys", () => {
    const settings = makeSettings({
      brain: { ...makeSettings().brain, provider: "byok", model: "gpt-4o" },
      memory: { provider: "openai", model: "text-embedding-3-small", sovereignFacts: [] },
    });
    const decision = resolveMemoryRouteFromSnapshot({
      settings,
      embeddingRoute: makeEmbeddingRoute({
        mode: "byok",
        provider: "openai",
        model: "text-embedding-3-small",
        readiness: "missing_key",
        privacy: "user_key_cloud",
        networkAllowed: false,
        reason: "BYOK openai route requires a vault-backed key before cloud calls are allowed.",
        warnings: ["openai BYOK key is missing or still redacted without a vault entry."],
        keySource: "none",
      }),
      vectorStoreAvailable: true,
    });

    const serialized = JSON.stringify(decision);
    expect(decision.mode).toBe("byok");
    expect(decision.readiness).toBe("missing_key");
    expect(decision.networkAllowed).toBe(false);
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("[SECURED]");
  });

  it("keeps local-only memory from falling back to cloud", () => {
    const decision = resolveMemoryRouteFromSnapshot({
      settings: makeSettings(),
      embeddingRoute: makeEmbeddingRoute({
        readiness: "missing_runtime",
        reason: "Local Cortex runtime is not available.",
      }),
      vectorStoreAvailable: true,
    });

    expect(decision.fallbackPolicy).toBe("no_fallback");
    expect(decision.networkAllowed).toBe(false);
    expect(decision.capabilities.embed.warnings.join(" ")).toContain("will not fall back to cloud");
  });

  it("returns degraded memory with safe warnings when vector store is unavailable", () => {
    const decision = resolveMemoryRouteFromSnapshot({
      settings: makeSettings(),
      embeddingRoute: makeEmbeddingRoute(),
      vectorStoreAvailable: false,
    });

    expect(decision.readiness).toBe("missing_vector_store");
    expect(decision.capabilities.retrieve.readiness).toBe("degraded");
    expect(decision.capabilities.retrieve.canRun).toBe(true);
    expect(decision.warnings.join(" ")).toContain("keyword fallback");
  });
});
