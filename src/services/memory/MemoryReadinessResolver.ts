import { BRAIN_CONFIG } from "../../config/brain.config";
import {
  LOCAL_EMBEDDING_MODEL_IDS,
  modelManager,
  type LocalModel,
} from "../local-models/LocalModelLibrary";
import { modelReadinessResolver } from "../models/ModelReadinessResolver";
import { settingsService, type LucaSettings } from "../settingsService";
import type { ModelRouteDecision } from "../../types/modelRouting";
import {
  MEMORY_CAPABILITIES,
  type MemoryCapability,
  type MemoryCapabilityStatus,
  type MemoryMode,
  type MemoryPrivacyPosture,
  type MemoryReadinessState,
  type MemoryRouteDecision,
} from "../../types/memoryRouting";

export interface MemoryReadinessSnapshot {
  settings: LucaSettings;
  embeddingRoute: ModelRouteDecision;
  vectorStoreAvailable?: boolean;
  vectorStoreName?: string;
  localEmbeddingModel?: Pick<LocalModel, "id" | "status" | "runtime">;
}

export interface ResolveMemoryRouteOptions {
  vectorStoreAvailable?: boolean;
  vectorStoreName?: string;
}

function selectedEmbeddingModel(settings: LucaSettings): string {
  if (settings.memory?.provider !== "local-luca" && settings.memory?.model) {
    return settings.memory.model;
  }

  return (
    settings.brain?.embeddingModel ||
    settings.memory?.model ||
    settings.brain?.memoryModel ||
    BRAIN_CONFIG.defaults.memory ||
    "gemini-embedding-001"
  );
}

function normalizeProviderMode(settings: LucaSettings): MemoryMode {
  if (settings.brain.provider === "local-luca") return "local";
  if (settings.brain.provider === "cloud-managed") return "luca-prime";
  if (settings.brain.provider === "byok") return "byok";

  const memoryProvider = settings.memory?.provider;
  if (memoryProvider === "local-luca") return "local";
  if (memoryProvider === "openai" || memoryProvider === "gemini-genai") return "byok";
  return "degraded";
}

function privacyForMode(mode: MemoryMode): MemoryPrivacyPosture {
  if (mode === "local") return "local_only";
  if (mode === "luca-prime") return "cloud_managed";
  if (mode === "byok") return "user_key_cloud";
  if (mode === "degraded") return "mixed";
  return "local_only";
}

function memoryReadinessFromEmbedding(route: ModelRouteDecision): MemoryReadinessState {
  if (route.readiness === "ready") return "ready";
  if (route.readiness === "missing_key") return "missing_key";
  if (route.readiness === "missing_runtime") return "missing_runtime";
  if (route.readiness === "missing_model" || route.readiness === "planned") {
    return "missing_embedding_model";
  }
  if (route.readiness === "downloading" || route.readiness === "unknown") {
    return "degraded";
  }
  if (route.readiness === "error" || route.readiness === "unsupported_hardware") {
    return "error";
  }
  return "unknown";
}

function status(
  capability: MemoryCapability,
  readiness: MemoryReadinessState,
  reason: string,
  warnings: string[] = [],
): MemoryCapabilityStatus {
  return {
    capability,
    readiness,
    reason,
    warnings,
    canRun: readiness === "ready" || readiness === "degraded",
  };
}

function buildCapabilityStatuses(input: {
  readiness: MemoryReadinessState;
  reason: string;
  warnings: string[];
  vectorStoreAvailable: boolean;
  localOnlyBlockedCloudFallback: boolean;
}): Record<MemoryCapability, MemoryCapabilityStatus> {
  const capabilities = {} as Record<MemoryCapability, MemoryCapabilityStatus>;
  for (const capability of MEMORY_CAPABILITIES) {
    capabilities[capability] = status(
      capability,
      input.readiness,
      input.reason,
      input.warnings,
    );
  }

  if (!input.vectorStoreAvailable) {
    const vectorReason =
      "Memory can keep local facts, but semantic RAG is unavailable because no vector store is ready.";
    capabilities.store = status("store", "degraded", vectorReason, [
      "New memories will be saved to the local archive without semantic indexing.",
    ]);
    capabilities.retrieve = status("retrieve", "degraded", vectorReason, [
      "Retrieval will use local keyword fallback instead of vector/RAG search.",
    ]);
    capabilities.hydrate_context = status("hydrate_context", "degraded", vectorReason, [
      "Context hydration will use saved facts without semantic expansion.",
    ]);
  }

  if (input.localOnlyBlockedCloudFallback) {
    const localOnlyReason =
      "Local-only memory is selected, so Luca will not fall back to cloud embeddings.";
    capabilities.embed = status("embed", input.readiness, localOnlyReason, [
      localOnlyReason,
    ]);
    capabilities.summarize = status("summarize", "degraded", localOnlyReason, [
      "Cloud summarization is blocked while local-only memory is active.",
    ]);
  }

  return capabilities;
}

export function resolveMemoryRouteFromSnapshot(
  snapshot: MemoryReadinessSnapshot,
): MemoryRouteDecision {
  const mode = normalizeProviderMode(snapshot.settings);
  const privacy = privacyForMode(mode);
  const embeddingModel = selectedEmbeddingModel(snapshot.settings);
  // If no caller passes a live vector/RAG health probe, keep the existing
  // conservative behavior: assume the local archive/Cortex vector store is
  // available and annotate diagnostics so reviewers know probing was deferred.
  const vectorStoreProbeDeferred = snapshot.vectorStoreAvailable === undefined;
  const vectorStoreAvailable = snapshot.vectorStoreAvailable !== false;
  const vectorStore = snapshot.vectorStoreName ||
    (vectorStoreAvailable ? "local-archive+cortex-vector" : "unavailable");
  const warnings = snapshot.embeddingRoute.warnings.slice();
  if (vectorStoreProbeDeferred) {
    warnings.push(
      "Vector/RAG store availability was not live-probed; assuming local archive/Cortex vector store is available.",
    );
  }
  const embeddingReadiness = memoryReadinessFromEmbedding(snapshot.embeddingRoute);
  const localOnlyBlockedCloudFallback =
    mode === "local" &&
    snapshot.embeddingRoute.networkAllowed === false &&
    embeddingReadiness !== "ready";

  if (mode === "disabled") {
    const reason = "Memory is disabled by settings.";
    return {
      mode,
      provider: snapshot.settings.memory?.provider || "disabled",
      embeddingModel,
      vectorStore,
      readiness: "disabled",
      reason,
      warnings: ["Memory storage and retrieval are disabled."],
      networkAllowed: false,
      fallbackPolicy: "no_fallback",
      privacy,
      capabilities: buildCapabilityStatuses({
        readiness: "disabled",
        reason,
        warnings: ["Memory storage and retrieval are disabled."],
        vectorStoreAvailable,
        localOnlyBlockedCloudFallback: false,
      }),
      embeddingRouteReadiness: snapshot.embeddingRoute.readiness,
      localEmbeddingModelInstalled: snapshot.localEmbeddingModel?.status === "ready",
      localRuntimeAvailable: snapshot.embeddingRoute.readiness !== "missing_runtime",
    };
  }

  let readiness = embeddingReadiness;
  if (readiness === "ready" && !vectorStoreAvailable) readiness = "missing_vector_store";

  const networkAllowed = mode === "local" ? false : snapshot.embeddingRoute.networkAllowed;
  const localEmbeddingModelInstalled = mode === "local"
    ? snapshot.localEmbeddingModel?.status === "ready" ||
      (LOCAL_EMBEDDING_MODEL_IDS.includes(embeddingModel.replace(/^local\//, "")) &&
        snapshot.embeddingRoute.readiness === "ready")
    : undefined;

  const baseReason =
    readiness === "ready"
      ? `Memory ${mode} route is ready for store, retrieve, and context hydration.`
      : readiness === "missing_key"
        ? "Memory requires a configured provider key before cloud embedding or RAG calls are allowed."
        : readiness === "missing_runtime"
          ? "Memory requires the selected local embedding runtime before semantic indexing can run."
          : readiness === "missing_embedding_model"
            ? "Memory requires the selected embedding model to be installed or made available."
            : readiness === "missing_vector_store"
              ? "Memory embedding is ready, but the vector/RAG store is unavailable."
              : readiness === "degraded"
                ? "Memory is available in degraded mode with safe local fallbacks."
                : "Memory readiness could not be fully verified.";

  if (mode === "local" && snapshot.embeddingRoute.networkAllowed) {
    warnings.push("Local-only memory selected a route that permits network access; cloud fallback is blocked for memory.");
  }
  if (mode === "local" && embeddingReadiness !== "ready") {
    warnings.push("Local-only memory will not use cloud fallback while the local embedding route is blocked.");
  }
  if (!vectorStoreAvailable) {
    warnings.push("Vector/RAG store is unavailable; Luca will use local archive and keyword fallback only.");
  }

  return {
    mode,
    provider:
      mode === "local"
        ? snapshot.settings.memory?.provider || snapshot.embeddingRoute.provider
        : snapshot.embeddingRoute.provider,
    embeddingModel,
    vectorStore,
    readiness,
    reason: baseReason,
    warnings,
    networkAllowed,
    fallbackPolicy: mode === "local" ? "no_fallback" : snapshot.embeddingRoute.fallbackPolicy,
    privacy,
    capabilities: buildCapabilityStatuses({
      readiness,
      reason: baseReason,
      warnings,
      vectorStoreAvailable,
      localOnlyBlockedCloudFallback,
    }),
    embeddingRouteReadiness: snapshot.embeddingRoute.readiness,
    localEmbeddingModelInstalled,
    localRuntimeAvailable: snapshot.embeddingRoute.readiness !== "missing_runtime",
  };
}

class MemoryReadinessResolver {
  async resolveMemoryRoute(
    options: ResolveMemoryRouteOptions = {},
  ): Promise<MemoryRouteDecision> {
    const settings = settingsService.getSettings();
    const embeddingModel = selectedEmbeddingModel(settings);
    const embeddingRoute = await modelReadinessResolver.resolveRoute({
      capability: "embedding",
      requestedModel: embeddingModel,
      fallbackPolicy: settings.brain.provider === "local-luca" ? "no_fallback" : undefined,
    });
    const localEmbeddingModel = modelManager.getModel(embeddingModel.replace(/^local\//, ""));

    return resolveMemoryRouteFromSnapshot({
      settings,
      embeddingRoute,
      localEmbeddingModel,
      vectorStoreAvailable: options.vectorStoreAvailable,
      vectorStoreName: options.vectorStoreName,
    });
  }

  async canRun(capability: MemoryCapability): Promise<MemoryCapabilityStatus> {
    const route = await this.resolveMemoryRoute();
    return route.capabilities[capability];
  }
}

export const memoryReadinessResolver = new MemoryReadinessResolver();
