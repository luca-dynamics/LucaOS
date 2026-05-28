import { llmService } from "../llmService";
import {
  modelManager,
  modelManagerService,
  type LocalModel,
} from "../ModelManagerService";
import { memoryReadinessResolver } from "../memory/MemoryReadinessResolver";
import { modelReadinessResolver } from "../models/ModelReadinessResolver";
import { settingsService, type LucaSettings } from "../settingsService";
import {
  normalizeLucaUserTier,
  type LucaUserTier,
} from "../../types/lucaUserTier";
import {
  normalizeModelMode,
  type ModelMode,
  type ModelPrivacyPosture,
  type ModelReadinessState,
  type ModelRouteDecision,
} from "../../types/modelRouting";
import type { MemoryReadinessState, MemoryRouteDecision } from "../../types/memoryRouting";

export type RuntimeReadinessSeverity =
  | "ready"
  | "warning"
  | "blocked"
  | "unknown";

export type RuntimeDiagnosticsAudience = "normal" | "tactical" | "origin";

export type RuntimeRecommendedActionId =
  | "open_model_manager"
  | "add_byok_key"
  | "start_ollama"
  | "install_ollama"
  | "switch_to_luca_prime"
  | "retry_route_check"
  | "none";

export interface RuntimeRecommendedAction {
  id: RuntimeRecommendedActionId;
  label: string;
  description: string;
}

export interface RuntimeRouteDiagnostics {
  capability: "chat" | "embedding" | "stt" | "tts";
  label: string;
  mode: ModelMode;
  provider: ModelRouteDecision["provider"];
  model: string;
  readiness: ModelReadinessState;
  severity: RuntimeReadinessSeverity;
  reason: string;
  warnings: string[];
  privacy: ModelPrivacyPosture;
  networkAllowed: boolean;
  fallbackPolicy: ModelRouteDecision["fallbackPolicy"];
  keySource: NonNullable<ModelRouteDecision["keySource"]> | "none";
  runtime: NonNullable<ModelRouteDecision["runtime"]> | "unknown";
}

export interface RuntimeMemoryDiagnostics {
  label: string;
  mode: MemoryRouteDecision["mode"];
  provider: string;
  embeddingModel: string;
  vectorStore: string;
  readiness: MemoryReadinessState;
  severity: RuntimeReadinessSeverity;
  reason: string;
  warnings: string[];
  privacy: MemoryRouteDecision["privacy"];
  networkAllowed: boolean;
  fallbackPolicy: MemoryRouteDecision["fallbackPolicy"];
  localEmbeddingModelInstalled?: boolean;
  localRuntimeAvailable?: boolean;
}

export interface RuntimeLocalRuntimeDiagnostics {
  ollama: {
    available: boolean;
    installed?: boolean;
    installedModelCount: number;
  };
  cortex: {
    available: boolean | "unknown";
  };
}

export interface RuntimeOnboardingWarning {
  capability: string;
  mode: string;
  provider: string;
  readiness: string;
  reason: string;
  warnings: string[];
}

export interface RuntimeKeyReadinessSummary {
  required: boolean;
  ready: boolean;
  sources: Array<"vault" | "settings" | "environment" | "none">;
  missingProviders: string[];
}

export interface RuntimeDiagnosticsSummary {
  activeMode: ModelMode;
  activeModeLabel: string;
  headline: string;
  severity: RuntimeReadinessSeverity;
  description: string;
}

export interface RuntimeDiagnostics {
  summary: RuntimeDiagnosticsSummary;
  audience: RuntimeDiagnosticsAudience;
  routes: {
    chat: RuntimeRouteDiagnostics;
    embedding: RuntimeRouteDiagnostics;
    stt: RuntimeRouteDiagnostics;
    tts: RuntimeRouteDiagnostics;
  };
  memory: RuntimeMemoryDiagnostics;
  localRuntime: RuntimeLocalRuntimeDiagnostics;
  keyReadiness: RuntimeKeyReadinessSummary;
  onboardingWarnings: RuntimeOnboardingWarning[];
  recommendedActions: RuntimeRecommendedAction[];
  generatedAt: number;
}

const ROUTE_LABEL: Record<RuntimeRouteDiagnostics["capability"], string> = {
  chat: "Brain / chat",
  embedding: "Embedding / memory",
  stt: "Speech-to-text",
  tts: "Text-to-speech",
};

const MODE_LABEL: Record<ModelMode, string> = {
  "luca-prime": "Luca Prime",
  local: "Local",
  byok: "BYOK",
};

const ACTION_COPY: Record<
  RuntimeRecommendedActionId,
  RuntimeRecommendedAction
> = {
  open_model_manager: {
    id: "open_model_manager",
    label: "Open Model Manager",
    description: "Review the selected model route and local model inventory.",
  },
  add_byok_key: {
    id: "add_byok_key",
    label: "Add BYOK key",
    description: "Add a provider key in settings or the secure vault.",
  },
  start_ollama: {
    id: "start_ollama",
    label: "Start Ollama",
    description: "Start the local Ollama daemon before using local routes.",
  },
  install_ollama: {
    id: "install_ollama",
    label: "Install Ollama",
    description: "Install the local runtime required by the selected model.",
  },
  switch_to_luca_prime: {
    id: "switch_to_luca_prime",
    label: "Switch to Luca Prime",
    description:
      "Use managed Luca Prime cloud routing if local/BYOK is not ready.",
  },
  retry_route_check: {
    id: "retry_route_check",
    label: "Retry status check",
    description: "Refresh route readiness after setup changes.",
  },
  none: {
    id: "none",
    label: "No action needed",
    description: "All visible runtime routes are ready.",
  },
};

const BLOCKED_STATES: ModelReadinessState[] = [
  "missing_key",
  "missing_runtime",
  "missing_model",
  "unsupported_hardware",
  "planned",
  "error",
];

const WARNING_STATES: ModelReadinessState[] = ["downloading", "unknown"];

const MEMORY_BLOCKED_STATES: MemoryReadinessState[] = [
  "missing_embedding_model",
  "missing_runtime",
  "missing_vector_store",
  "missing_key",
  "disabled",
  "error",
];

const MEMORY_WARNING_STATES: MemoryReadinessState[] = ["degraded", "unknown"];

export function severityFromReadiness(
  readiness: ModelReadinessState,
): RuntimeReadinessSeverity {
  if (readiness === "ready") return "ready";
  if (BLOCKED_STATES.includes(readiness)) return "blocked";
  if (WARNING_STATES.includes(readiness)) return "warning";
  return "unknown";
}

export function severityFromMemoryReadiness(
  readiness: MemoryReadinessState,
): RuntimeReadinessSeverity {
  if (readiness === "ready") return "ready";
  if (MEMORY_BLOCKED_STATES.includes(readiness)) return "blocked";
  if (MEMORY_WARNING_STATES.includes(readiness)) return "warning";
  return "unknown";
}

function aggregateSeverity(
  routes: RuntimeRouteDiagnostics[],
  onboardingWarnings: RuntimeOnboardingWarning[],
  memory?: RuntimeMemoryDiagnostics,
): RuntimeReadinessSeverity {
  if (routes.some((route) => route.severity === "blocked") || memory?.severity === "blocked") return "blocked";
  if (
    onboardingWarnings.length > 0 ||
    routes.some((route) => route.severity === "warning") ||
    memory?.severity === "warning"
  ) {
    return "warning";
  }
  if (routes.every((route) => route.severity === "ready") && (!memory || memory.severity === "ready")) return "ready";
  return "unknown";
}

function activeModeLabel(mode: ModelMode): string {
  return MODE_LABEL[mode] || mode;
}

export function sanitizeDiagnosticText(value: string): string {
  return value
    .replace(/\[SECURED\]/gi, "[redacted]")
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[redacted]")
    .replace(/\bsk-ant-[A-Za-z0-9_-]{8,}\b/g, "[redacted]")
    .replace(/\bAIza[A-Za-z0-9_-]{12,}\b/g, "[redacted]")
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{12,}\b/g, "[redacted]");
}

export function normalizeRuntimeRoute(
  route: ModelRouteDecision,
): RuntimeRouteDiagnostics {
  const capability = route.capability === "brain" ? "chat" : route.capability;
  const safeCapability = ["chat", "embedding", "stt", "tts"].includes(
    capability,
  )
    ? (capability as RuntimeRouteDiagnostics["capability"])
    : "chat";

  return {
    capability: safeCapability,
    label: ROUTE_LABEL[safeCapability],
    mode: route.mode,
    provider: route.provider,
    model: sanitizeDiagnosticText(route.model),
    readiness: route.readiness,
    severity: severityFromReadiness(route.readiness),
    reason: sanitizeDiagnosticText(route.reason),
    warnings: route.warnings.map(sanitizeDiagnosticText),
    privacy: route.privacy,
    networkAllowed: route.networkAllowed,
    fallbackPolicy: route.fallbackPolicy,
    keySource: route.keySource || "none",
    runtime: route.runtime || "unknown",
  };
}


export function normalizeRuntimeMemory(
  route: MemoryRouteDecision,
): RuntimeMemoryDiagnostics {
  return {
    label: "Memory / RAG",
    mode: route.mode,
    provider: sanitizeDiagnosticText(route.provider),
    embeddingModel: sanitizeDiagnosticText(route.embeddingModel),
    vectorStore: sanitizeDiagnosticText(route.vectorStore),
    readiness: route.readiness,
    severity: severityFromMemoryReadiness(route.readiness),
    reason: sanitizeDiagnosticText(route.reason),
    warnings: route.warnings.map(sanitizeDiagnosticText),
    privacy: route.privacy,
    networkAllowed: route.networkAllowed,
    fallbackPolicy: route.fallbackPolicy,
    localEmbeddingModelInstalled: route.localEmbeddingModelInstalled,
    localRuntimeAvailable: route.localRuntimeAvailable,
  };
}
export function buildRuntimeDiagnosticsSummary(input: {
  activeMode: ModelMode;
  routes: RuntimeRouteDiagnostics[];
  onboardingWarnings: RuntimeOnboardingWarning[];
  memory?: RuntimeMemoryDiagnostics;
}): RuntimeDiagnosticsSummary {
  const severity = aggregateSeverity(input.routes, input.onboardingWarnings, input.memory);
  const activeLabel = activeModeLabel(input.activeMode);
  const firstBlocked = input.routes.find((route) => route.severity === "blocked");
  const firstWarning = input.routes.find((route) => route.severity === "warning");

  if (!firstBlocked && input.memory?.severity === "blocked") {
    return {
      activeMode: input.activeMode,
      activeModeLabel: activeLabel,
      headline: `${activeLabel} · Memory blocked`,
      severity,
      description: input.memory.reason,
    };
  }

  if (!firstWarning && input.memory?.severity === "warning") {
    return {
      activeMode: input.activeMode,
      activeModeLabel: activeLabel,
      headline: `${activeLabel} · Memory warning`,
      severity,
      description: input.memory.reason,
    };
  }

  if (firstBlocked) {
    return {
      activeMode: input.activeMode,
      activeModeLabel: activeLabel,
      headline: `${activeLabel} · ${friendlyBlockedHeadline(firstBlocked)}`,
      severity,
      description: firstBlocked.reason,
    };
  }

  if (firstWarning) {
    return {
      activeMode: input.activeMode,
      activeModeLabel: activeLabel,
      headline: `${activeLabel} · ${firstWarning.label} warning`,
      severity,
      description: firstWarning.reason,
    };
  }

  if (input.onboardingWarnings.length > 0) {
    return {
      activeMode: input.activeMode,
      activeModeLabel: activeLabel,
      headline: `${activeLabel} · Setup warning saved`,
      severity,
      description:
        "Luca saved setup warnings from onboarding. Review runtime status when convenient.",
    };
  }

  return {
    activeMode: input.activeMode,
    activeModeLabel: activeLabel,
    headline: `${activeLabel} · Ready`,
    severity,
    description: "Luca's visible model routes are ready.",
  };
}

function friendlyBlockedHeadline(route: RuntimeRouteDiagnostics): string {
  if (route.readiness === "missing_key") return "Missing key";
  if (route.readiness === "missing_runtime") {
    return route.runtime === "ollama" ? "Ollama offline" : "Runtime offline";
  }
  if (route.readiness === "missing_model") return "Model not installed";
  if (route.readiness === "unsupported_hardware") return "Hardware unsupported";
  if (route.readiness === "planned") return "Model not verified";
  if (route.readiness === "error") return "Route blocked";
  return `${route.label} blocked`;
}

export function getVisibleRuntimeRoutesForAudience(
  routes: RuntimeRouteDiagnostics[],
  audience: RuntimeDiagnosticsAudience,
): RuntimeRouteDiagnostics[] {
  if (audience !== "normal") return routes;
  return routes.filter((route) => route.severity !== "ready");
}

export function getVisibleMemoryDiagnosticsForAudience(
  memory: RuntimeMemoryDiagnostics,
  audience: RuntimeDiagnosticsAudience,
): RuntimeMemoryDiagnostics | null {
  if (audience !== "normal") return memory;
  if (memory.severity === "ready") return null;
  return {
    ...memory,
    provider: "memory",
    embeddingModel: "hidden",
    vectorStore: "hidden",
    fallbackPolicy: "no_fallback",
    networkAllowed: memory.networkAllowed,
    warnings: memory.warnings.slice(0, 2),
  };
}

export function selectRecommendedActions(input: {
  routes: RuntimeRouteDiagnostics[];
  localRuntime: RuntimeLocalRuntimeDiagnostics;
  memory?: RuntimeMemoryDiagnostics;
}): RuntimeRecommendedAction[] {
  const ids: RuntimeRecommendedActionId[] = [];

  if (input.memory?.readiness === "missing_key") ids.push("add_byok_key");
  if (
    input.memory?.readiness === "missing_embedding_model" ||
    input.memory?.readiness === "missing_vector_store"
  ) {
    ids.push("open_model_manager");
  }
  if (input.memory?.readiness === "missing_runtime") ids.push("open_model_manager");
  if (input.memory?.readiness === "unknown" || input.memory?.readiness === "degraded") {
    ids.push("retry_route_check");
  }

  for (const route of input.routes) {
    if (route.readiness === "missing_key") ids.push("add_byok_key");
    if (route.readiness === "missing_runtime") {
      if (route.runtime === "ollama") {
        ids.push(
          input.localRuntime.ollama.installed === false
            ? "install_ollama"
            : "start_ollama",
        );
      } else {
        ids.push("open_model_manager");
      }
    }
    if (route.readiness === "missing_model" || route.readiness === "planned") {
      ids.push("open_model_manager");
    }
    if (
      route.readiness === "unsupported_hardware" ||
      route.readiness === "error"
    ) {
      ids.push("switch_to_luca_prime");
      ids.push("open_model_manager");
    }
    if (route.readiness === "downloading" || route.readiness === "unknown") {
      ids.push("retry_route_check");
    }
  }

  ids.push("retry_route_check");
  const unique = Array.from(new Set(ids));
  if (unique.length === 1 && unique[0] === "retry_route_check") {
    return [ACTION_COPY.none];
  }
  return unique.slice(0, 4).map((id) => ACTION_COPY[id]);
}

export function summarizeKeyReadiness(
  routes: RuntimeRouteDiagnostics[],
): RuntimeKeyReadinessSummary {
  const cloudRoutes = routes.filter(
    (route) => route.mode === "byok" || route.mode === "luca-prime",
  );
  const missingProviders = cloudRoutes
    .filter((route) => route.readiness === "missing_key")
    .map((route) => route.provider);
  const sources = Array.from(
    new Set(cloudRoutes.map((route) => route.keySource)),
  );

  return {
    required: cloudRoutes.length > 0,
    ready: missingProviders.length === 0,
    sources: sources.length > 0 ? sources : ["none"],
    missingProviders,
  };
}

export function detectRuntimeDiagnosticsAudience(
  settings: LucaSettings,
): RuntimeDiagnosticsAudience {
  const rawTier =
    (settings.general as any)?.userTier ||
    (settings.general as any)?.lucaTier ||
    (settings as any)?.userTier ||
    (settings as any)?.lucaTier;
  const tier: LucaUserTier = normalizeLucaUserTier(rawTier);

  if (tier === "origin") return "origin";
  if (tier === "tactical") return "tactical";
  if (settings.general.experimentalMode) return "origin";
  if (settings.general.debugMode) return "tactical";
  return "normal";
}

async function getLocalRuntimeDiagnostics(
  routes: RuntimeRouteDiagnostics[],
): Promise<RuntimeLocalRuntimeDiagnostics> {
  let ollama = { available: false, models: [] as any[] };
  try {
    ollama = await modelManagerService.getOllamaModels();
  } catch (error) {
    console.warn("[RuntimeDiagnostics] Ollama status unavailable", error);
  }

  let installed: boolean | undefined;
  try {
    installed = await modelManagerService.isOllamaInstalled();
  } catch {
    installed = undefined;
  }

  const cortexRouteSelected = routes.some((route) => route.runtime === "cortex");
  const cortexAvailable = cortexRouteSelected
    ? !routes.some(
        (route) =>
          route.runtime === "cortex" && route.readiness === "missing_runtime",
      )
    : "unknown";

  return {
    ollama: {
      available: ollama.available,
      installed,
      installedModelCount: ollama.models.length,
    },
    cortex: { available: cortexAvailable },
  };
}

function getOnboardingWarnings(
  settings: LucaSettings,
): RuntimeOnboardingWarning[] {
  return (settings.onboarding?.modelRouteWarnings || []).map((warning) => ({
    capability: warning.capability,
    mode: warning.mode,
    provider: warning.provider,
    readiness: warning.readiness,
    reason: sanitizeDiagnosticText(warning.reason),
    warnings: (warning.warnings || []).map(sanitizeDiagnosticText),
  }));
}

export async function buildRuntimeDiagnostics(): Promise<RuntimeDiagnostics> {
  const settings = settingsService.getSettings();
  const activeMode = normalizeModelMode(settings.brain.provider);

  const [chatRoute, embeddingRoute, voiceRoutes, memoryRoute] = await Promise.all([
    llmService.resolveRouteForDiagnostics(),
    modelReadinessResolver.resolveRoute({ capability: "embedding" }),
    modelReadinessResolver.resolveVoiceRoutes(),
    memoryReadinessResolver.resolveMemoryRoute(),
  ]);

  const routes = {
    chat: normalizeRuntimeRoute(chatRoute),
    embedding: normalizeRuntimeRoute(embeddingRoute),
    stt: normalizeRuntimeRoute(voiceRoutes.stt),
    tts: normalizeRuntimeRoute(voiceRoutes.tts),
  };
  const routeList = Object.values(routes);
  const memory = normalizeRuntimeMemory(memoryRoute);
  const onboardingWarnings = getOnboardingWarnings(settings);
  const localRuntime = await getLocalRuntimeDiagnostics(routeList);

  return {
    summary: buildRuntimeDiagnosticsSummary({
      activeMode,
      routes: routeList,
      onboardingWarnings,
      memory,
    }),
    audience: detectRuntimeDiagnosticsAudience(settings),
    routes,
    memory,
    localRuntime,
    keyReadiness: summarizeKeyReadiness(routeList),
    onboardingWarnings,
    recommendedActions: selectRecommendedActions({
      routes: routeList,
      localRuntime,
      memory,
    }),
    generatedAt: Date.now(),
  };
}

class RuntimeDiagnosticsService {
  async getDiagnostics(): Promise<RuntimeDiagnostics> {
    return buildRuntimeDiagnostics();
  }

  getAudience(
    settings: LucaSettings = settingsService.getSettings(),
  ): RuntimeDiagnosticsAudience {
    return detectRuntimeDiagnosticsAudience(settings);
  }

  getLocalInstalledModelCount(): number {
    return modelManager
      .getAllModels()
      .filter((model: LocalModel) => model.status === "ready").length;
  }
}

export const runtimeDiagnosticsService = new RuntimeDiagnosticsService();
