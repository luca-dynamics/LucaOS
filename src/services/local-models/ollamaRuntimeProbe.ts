/**
 * Shared Ollama status probe through the local runtime facade.
 * Prefer this over ad-hoc fetch(`${OLLAMA}/api/tags`) call sites.
 */

import { localRuntimeRegistry } from "./RuntimeRegistry";

export interface OllamaRuntimeProbeResult {
  available: boolean;
  models: string[];
  message?: string;
  checkedAt: number;
}

let cache: { result: OllamaRuntimeProbeResult; expiresAt: number } | null =
  null;

const DEFAULT_TTL_MS = 60_000;

/**
 * Probe Ollama via the registered runtime adapter (health + model list).
 * Results are cached briefly to avoid hammering the daemon.
 */
export async function probeOllamaViaRuntimeFacade(options?: {
  ttlMs?: number;
  force?: boolean;
  now?: () => number;
}): Promise<OllamaRuntimeProbeResult> {
  const now = options?.now ?? Date.now;
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  if (!options?.force && cache && cache.expiresAt > now()) {
    return cache.result;
  }

  const adapter = localRuntimeRegistry.get("ollama");
  if (!adapter) {
    const result: OllamaRuntimeProbeResult = {
      available: false,
      models: [],
      message: "Ollama runtime adapter is not registered.",
      checkedAt: now(),
    };
    cache = { result, expiresAt: now() + ttlMs };
    return result;
  }

  try {
    const health = await adapter.health();
    const result: OllamaRuntimeProbeResult = {
      available: health.reachable,
      models: health.modelIds ?? [],
      message: health.message,
      checkedAt: health.checkedAt ?? now(),
    };
    cache = { result, expiresAt: now() + ttlMs };
    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ollama probe failed";
    const result: OllamaRuntimeProbeResult = {
      available: false,
      models: [],
      message,
      checkedAt: now(),
    };
    cache = { result, expiresAt: now() + ttlMs };
    return result;
  }
}

/** Test helper — clear probe cache. */
export function clearOllamaRuntimeProbeCache(): void {
  cache = null;
}
