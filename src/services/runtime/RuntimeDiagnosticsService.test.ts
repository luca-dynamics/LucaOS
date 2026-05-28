import { describe, expect, it } from "vitest";
import type { LucaSettings } from "../settingsService";
import {
  buildRuntimeDiagnosticsSummary,
  detectRuntimeDiagnosticsAudience,
  getVisibleMemoryDiagnosticsForAudience,
  getVisibleRuntimeRoutesForAudience,
  memoryVectorStoreOptionsFromCortexStatus,
  normalizeRuntimeMemory,
  normalizeRuntimeRoute,
  selectRecommendedActions,
  severityFromMemoryReadiness,
  severityFromReadiness,
  sanitizeDiagnosticText,
  summarizeKeyReadiness,
  type RuntimeLocalRuntimeDiagnostics,
} from "./RuntimeDiagnosticsService";
import type { ModelRouteDecision } from "../../types/modelRouting";
import type { MemoryRouteDecision } from "../../types/memoryRouting";

function makeRoute(
  overrides: Partial<ModelRouteDecision> = {},
): ModelRouteDecision {
  return {
    capability: "chat",
    provider: "ollama",
    model: "llama3.2:1b",
    mode: "local",
    reason: "Local chat model is ready.",
    warnings: [],
    readiness: "ready",
    privacy: "local_only",
    fallbackPolicy: "no_fallback",
    networkAllowed: false,
    runtime: "ollama",
    ...overrides,
  };
}

function makeMemoryRoute(overrides: Partial<MemoryRouteDecision> = {}): MemoryRouteDecision {
  const baseStatus = {
    readiness: "ready" as const,
    reason: "Memory local route is ready.",
    warnings: [],
    canRun: true,
  };
  return {
    mode: "local",
    provider: "local-luca",
    embeddingModel: "nomic-embed-text",
    vectorStore: "local-archive+cortex-vector",
    readiness: "ready",
    reason: "Memory local route is ready.",
    warnings: [],
    networkAllowed: false,
    fallbackPolicy: "no_fallback",
    privacy: "local_only",
    capabilities: {
      store: { capability: "store", ...baseStatus },
      retrieve: { capability: "retrieve", ...baseStatus },
      embed: { capability: "embed", ...baseStatus },
      summarize: { capability: "summarize", ...baseStatus },
      hydrate_context: { capability: "hydrate_context", ...baseStatus },
    },
    ...overrides,
  };
}

function makeSettings(overrides: Partial<LucaSettings["general"]> = {}): LucaSettings {
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
      ...overrides,
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
  };
}

const localRuntime: RuntimeLocalRuntimeDiagnostics = {
  ollama: { available: false, installed: true, installedModelCount: 0 },
  cortex: { available: "unknown" },
};

describe("RuntimeDiagnosticsService pure logic", () => {
  it("calculates route severity", () => {
    expect(severityFromReadiness("ready")).toBe("ready");
    expect(severityFromReadiness("missing_key")).toBe("blocked");
    expect(severityFromReadiness("downloading")).toBe("warning");
    expect(severityFromMemoryReadiness("missing_embedding_model")).toBe("blocked");
    expect(severityFromMemoryReadiness("degraded")).toBe("warning");
  });

  it("generates friendly summaries for blocked routes", () => {
    const route = normalizeRuntimeRoute(
      makeRoute({ readiness: "missing_key", provider: "openai", mode: "byok", keySource: "none", reason: "BYOK openai route requires a vault-backed key." }),
    );
    const summary = buildRuntimeDiagnosticsSummary({
      activeMode: "byok",
      routes: [route],
      onboardingWarnings: [],
    });

    expect(summary.severity).toBe("blocked");
    expect(summary.headline).toBe("BYOK · Missing key");
  });

  it("redacts raw-key-looking diagnostic text", () => {
    expect(sanitizeDiagnosticText("token sk-1234567890abcdef and [SECURED]")).toBe(
      "token [redacted] and [redacted]",
    );
    expect(sanitizeDiagnosticText("gemini AIza1234567890abcdef"))
      .toBe("gemini [redacted]");
  });

  it("selects add-key action for missing BYOK keys without exposing raw keys", () => {
    const route = normalizeRuntimeRoute(
      makeRoute({
        readiness: "missing_key",
        provider: "openai",
        mode: "byok",
        reason: "BYOK openai route requires a vault-backed key sk-1234567890abcdef.",
        warnings: ["openai BYOK key is missing or still redacted without [SECURED]."],
        keySource: "none",
      }),
    );

    const actions = selectRecommendedActions({ routes: [route], localRuntime });
    const keySummary = summarizeKeyReadiness([route]);
    const serialized = JSON.stringify({ route, actions, keySummary });

    expect(actions.map((action) => action.id)).toContain("add_byok_key");
    expect(keySummary.sources).toEqual(["none"]);
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("[SECURED]");
  });

  it("selects runtime/model actions for missing local runtime and model", () => {
    const missingRuntime = normalizeRuntimeRoute(
      makeRoute({ readiness: "missing_runtime", reason: "Local Ollama runtime is not available." }),
    );
    const missingModel = normalizeRuntimeRoute(
      makeRoute({ readiness: "missing_model", reason: "Local chat model is not ready." }),
    );

    const actions = selectRecommendedActions({ routes: [missingRuntime, missingModel], localRuntime });
    expect(actions.map((action) => action.id)).toContain("start_ollama");
    expect(actions.map((action) => action.id)).toContain("open_model_manager");
  });

  it("selects no action for ready routes", () => {
    const route = normalizeRuntimeRoute(makeRoute());
    const actions = selectRecommendedActions({ routes: [route], localRuntime });
    expect(actions).toEqual([
      expect.objectContaining({ id: "none", label: "No action needed" }),
    ]);
  });

  it("filters ready route details away from normal users", () => {
    const ready = normalizeRuntimeRoute(makeRoute());
    const blocked = normalizeRuntimeRoute(makeRoute({ readiness: "missing_runtime" }));

    expect(getVisibleRuntimeRoutesForAudience([ready, blocked], "normal")).toEqual([blocked]);
    expect(getVisibleRuntimeRoutesForAudience([ready, blocked], "tactical")).toEqual([ready, blocked]);
  });

  it("detects tiered audience without overexposing normal users", () => {
    expect(detectRuntimeDiagnosticsAudience(makeSettings())).toBe("normal");
    expect(detectRuntimeDiagnosticsAudience(makeSettings({ debugMode: true }))).toBe("tactical");
    expect(detectRuntimeDiagnosticsAudience(makeSettings({ experimentalMode: true }))).toBe("origin");
  });


  it("maps Cortex health into explicit memory vector-store options", () => {
    expect(
      memoryVectorStoreOptionsFromCortexStatus({
        available: true,
        message: "Cortex is online and ready",
      }),
    ).toEqual({
      vectorStoreAvailable: true,
      vectorStoreName: "cortex-vector (online)",
    });

    expect(
      memoryVectorStoreOptionsFromCortexStatus({
        available: true,
        message: "Cortex is online (Initializing memory...)",
      }),
    ).toEqual({
      vectorStoreAvailable: false,
      vectorStoreName: "cortex-vector (Cortex is online (Initializing memory...))",
    });

    expect(memoryVectorStoreOptionsFromCortexStatus(null)).toEqual({
      vectorStoreAvailable: undefined,
      vectorStoreName: "local-archive+cortex-vector (assumed; live probe deferred)",
    });
  });

  it("includes memory readiness in summaries when route diagnostics are otherwise ready", () => {
    const ready = normalizeRuntimeRoute(makeRoute());
    const memory = normalizeRuntimeMemory(makeMemoryRoute({
      readiness: "missing_embedding_model",
      reason: "Memory requires the selected embedding model to be installed or made available.",
    }));

    const summary = buildRuntimeDiagnosticsSummary({
      activeMode: "local",
      routes: [ready],
      onboardingWarnings: [],
      memory,
    });

    expect(summary.severity).toBe("blocked");
    expect(summary.headline).toBe("Local · Memory blocked");
  });

  it("hides advanced memory route details from normal users", () => {
    const memory = normalizeRuntimeMemory(makeMemoryRoute({
      provider: "openai",
      embeddingModel: "text-embedding-3-small",
      vectorStore: "cortex-vector",
      readiness: "missing_key",
      reason: "Memory requires a configured provider key before cloud embedding or RAG calls are allowed.",
      warnings: ["openai BYOK key is missing or still redacted without [SECURED]."],
      networkAllowed: false,
    }));

    const normal = getVisibleMemoryDiagnosticsForAudience(memory, "normal");
    const origin = getVisibleMemoryDiagnosticsForAudience(memory, "origin");

    expect(normal?.provider).toBe("memory");
    expect(normal?.embeddingModel).toBe("hidden");
    expect(normal?.vectorStore).toBe("hidden");
    expect(JSON.stringify(normal)).not.toContain("[SECURED]");
    expect(origin?.provider).toBe("openai");
    expect(origin?.embeddingModel).toBe("text-embedding-3-small");
  });

});
