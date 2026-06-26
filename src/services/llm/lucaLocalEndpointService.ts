import {
  LOCALAI_CURATED_CATALOG,
  type LucaUnifiedModel,
} from "./lucaUnifiedModelRegistry";
import {
  probeOpenAiCompatibleEndpoint,
  type LucaEndpointHealth,
  type LucaEndpointProbeDeps,
} from "./lucaEndpointHealth";

/**
 * lucaLocalEndpointService — the read-only bridge that ties the configured
 * OpenAI-compatible endpoint (LocalAI / local Ollama shim / a user's remote
 * server) to the health layer (L2) and the curated catalog (L1), per
 * docs/luca-local-models-backend-audit.md (L3).
 *
 * It reuses the existing settings fields
 * (settings.brain.customOpenAiCompatibleBaseUrl / ...ApiKey) — it adds no new
 * config and changes no provider routing. The core is pure (settings snapshot
 * in, status out, fetch injected); only a thin convenience wrapper reads the
 * live settings, and it does so via a lazy import so this module stays free of
 * heavy runtime dependencies. It is consumed by the P5b/L4 UI later; nothing
 * calls it yet.
 */

export interface LucaLocalEndpointBrainSettings {
  customOpenAiCompatibleBaseUrl?: string;
  customOpenAiCompatibleApiKey?: string;
}

export interface LucaLocalEndpointConfig {
  configured: boolean;
  baseUrl?: string;
  apiKey?: string;
}

export interface LucaLocalEndpointStatus {
  configured: boolean;
  health?: LucaEndpointHealth;
  /** Curated catalog models the endpoint actually serves. */
  servedCuratedModels: LucaUnifiedModel[];
}

/** Pure: derive the endpoint config from the brain settings (trimmed). */
export function resolveLocalEndpointConfig(
  brain: LucaLocalEndpointBrainSettings,
): LucaLocalEndpointConfig {
  const baseUrl = brain.customOpenAiCompatibleBaseUrl?.trim();
  if (!baseUrl) return { configured: false };
  const apiKey = brain.customOpenAiCompatibleApiKey?.trim() || undefined;
  return { configured: true, baseUrl, apiKey };
}

/** Pure: which curated models the endpoint actually serves (intersection). */
export function selectServedCuratedModels(
  servedModelIds: readonly string[],
): LucaUnifiedModel[] {
  const served = new Set(servedModelIds);
  return LOCALAI_CURATED_CATALOG.filter((model) => served.has(model.id));
}

/** Pure: of the served curated models, those that fit the system RAM. */
export function recommendServedModelsForRam(
  servedCuratedModels: readonly LucaUnifiedModel[],
  systemRamBytes: number,
): LucaUnifiedModel[] {
  return servedCuratedModels.filter(
    (model) =>
      model.minRamBytes === undefined || model.minRamBytes <= systemRamBytes,
  );
}

/** Check a configured endpoint from an explicit settings snapshot (pure inputs + injectable deps). */
export async function checkLocalEndpoint(
  brain: LucaLocalEndpointBrainSettings,
  deps?: LucaEndpointProbeDeps,
): Promise<LucaLocalEndpointStatus> {
  const config = resolveLocalEndpointConfig(brain);
  if (!config.configured || !config.baseUrl) {
    return { configured: false, servedCuratedModels: [] };
  }
  const health = await probeOpenAiCompatibleEndpoint(
    { baseUrl: config.baseUrl, apiKey: config.apiKey },
    deps,
  );
  return {
    configured: true,
    health,
    servedCuratedModels: selectServedCuratedModels(health.modelIds),
  };
}

/**
 * Thin convenience wrapper that reads the live brain settings (read-only).
 * settingsService is lazily imported so this module carries no heavy runtime
 * dependency at import time.
 */
export async function checkConfiguredLocalEndpoint(
  deps?: LucaEndpointProbeDeps,
): Promise<LucaLocalEndpointStatus> {
  const { settingsService } = await import("../settingsService");
  const brain = settingsService.getSettings().brain;
  return checkLocalEndpoint(
    {
      customOpenAiCompatibleBaseUrl: brain.customOpenAiCompatibleBaseUrl,
      customOpenAiCompatibleApiKey: brain.customOpenAiCompatibleApiKey,
    },
    deps,
  );
}
