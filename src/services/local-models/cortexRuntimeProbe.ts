/**
 * Shared Cortex status probe through the local runtime facade.
 * Prefer this over ad-hoc fetch(`${CORTEX}/health`) for readiness/status.
 *
 * Cortex is product-critical for Luca internal local models (brain/vision/STT
 * paths that are not Ollama). Keep probes cheap and cached.
 */

import { localRuntimeRegistry } from "./RuntimeRegistry";
import type { CortexRuntime } from "./runtimes/CortexRuntime";

export interface CortexRuntimeProbeResult {
  available: boolean;
  models: string[];
  message?: string;
  checkedAt: number;
  /** In-flight generations on the adapter (when supported). */
  activeGenerations?: number;
}

let cache: { result: CortexRuntimeProbeResult; expiresAt: number } | null =
  null;

const DEFAULT_TTL_MS = 60_000;

/**
 * Probe Cortex via the registered runtime adapter (health + model list).
 * Results are cached briefly to avoid hammering the Python service.
 */
export async function probeCortexViaRuntimeFacade(options?: {
  ttlMs?: number;
  force?: boolean;
  now?: () => number;
}): Promise<CortexRuntimeProbeResult> {
  const now = options?.now ?? Date.now;
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  if (!options?.force && cache && cache.expiresAt > now()) {
    return cache.result;
  }

  const adapter = localRuntimeRegistry.get("cortex");
  if (!adapter) {
    const result: CortexRuntimeProbeResult = {
      available: false,
      models: [],
      message: "Cortex runtime adapter is not registered.",
      checkedAt: now(),
    };
    cache = { result, expiresAt: now() + ttlMs };
    return result;
  }

  try {
    const health = await adapter.health();
    const activeGenerations =
      typeof (adapter as CortexRuntime).getActiveGenerationCount === "function"
        ? (adapter as CortexRuntime).getActiveGenerationCount()
        : undefined;
    const result: CortexRuntimeProbeResult = {
      available: health.reachable,
      models: health.modelIds ?? [],
      message: health.message,
      checkedAt: health.checkedAt ?? now(),
      activeGenerations,
    };
    cache = { result, expiresAt: now() + ttlMs };
    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cortex probe failed";
    const result: CortexRuntimeProbeResult = {
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
export function clearCortexRuntimeProbeCache(): void {
  cache = null;
}
