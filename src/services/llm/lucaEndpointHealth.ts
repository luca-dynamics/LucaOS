/**
 * lucaEndpointHealth — the connection/health layer for an OpenAI-compatible
 * local-model endpoint (LocalAI, a local Ollama OpenAI shim, or a user's remote
 * server), per docs/luca-local-models-backend-audit.md (L2).
 *
 * The audit's "industrial-strong" gap is the absence of a stable
 * connect/health layer: probe an endpoint, see which models it actually serves,
 * time out and retry transient failures, and report honest degraded states
 * instead of silently failing. This module provides exactly that, with the
 * decision logic kept pure and the network probe thin + dependency-injected.
 *
 * Boundary discipline: the pure interpreter does no I/O. The probe performs a
 * single GET to `${baseUrl}/models` only when called, via an injectable
 * `fetchImpl` (default global fetch), and is wired nowhere yet (L3 consumes it).
 * It reads no app state and starts/installs no model.
 */

export type LucaEndpointHealthStatus =
  | "online"
  | "no-models"
  | "unauthorized"
  | "degraded"
  | "unreachable";

export interface LucaEndpointHealth {
  status: LucaEndpointHealthStatus;
  /** Whether the endpoint answered at all (any HTTP response). */
  reachable: boolean;
  /** Model ids the endpoint reports serving (empty unless online). */
  modelIds: string[];
  latencyMs?: number;
  httpStatus?: number;
  /** Calm, human-readable summary suitable for the UI. */
  message: string;
}

export interface LucaEndpointConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  /** Retries for transient (network/timeout) failures. Default 1. */
  retries?: number;
}

export type LucaEndpointProbeErrorKind = "timeout" | "network" | "parse";

export interface LucaEndpointProbeResult {
  /** True only for a successful HTTP response that parsed. */
  ok: boolean;
  httpStatus?: number;
  modelIds?: string[];
  latencyMs?: number;
  errorKind?: LucaEndpointProbeErrorKind;
}

/** Pure: map a raw probe outcome to an honest health state. No I/O. */
export function interpretEndpointProbe(
  raw: LucaEndpointProbeResult,
): LucaEndpointHealth {
  const base = {
    modelIds: raw.modelIds ?? [],
    latencyMs: raw.latencyMs,
    httpStatus: raw.httpStatus,
  };

  if (raw.errorKind === "timeout") {
    return { status: "unreachable", reachable: false, ...base, modelIds: [], message: "The endpoint didn't respond in time." };
  }
  if (raw.errorKind === "network") {
    return { status: "unreachable", reachable: false, ...base, modelIds: [], message: "Couldn't reach the endpoint." };
  }

  const httpStatus = raw.httpStatus ?? 0;
  if (httpStatus === 401 || httpStatus === 403) {
    return { status: "unauthorized", reachable: true, ...base, modelIds: [], message: "The endpoint needs a valid key." };
  }
  if (httpStatus >= 500 || raw.errorKind === "parse" || httpStatus === 404) {
    return { status: "degraded", reachable: true, ...base, modelIds: [], message: "The endpoint answered but isn't serving a model list." };
  }

  if (raw.ok) {
    const modelIds = raw.modelIds ?? [];
    if (modelIds.length === 0) {
      return { status: "no-models", reachable: true, ...base, message: "Connected, but no models are loaded yet." };
    }
    return { status: "online", reachable: true, ...base, message: `Connected — ${modelIds.length} model${modelIds.length === 1 ? "" : "s"} available.` };
  }

  return { status: "degraded", reachable: true, ...base, modelIds: [], message: "The endpoint responded unexpectedly." };
}

const DEFAULT_TIMEOUT_MS = 4000;

export interface LucaEndpointProbeDeps {
  fetchImpl?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

function normalizeModelsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/models`;
}

function parseModelIds(payload: unknown): string[] {
  const data = (payload as { data?: Array<{ id?: unknown }> } | null)?.data;
  if (!Array.isArray(data)) return [];
  return data
    .map((entry) => (typeof entry?.id === "string" ? entry.id : undefined))
    .filter((id): id is string => Boolean(id));
}

/** Probe an OpenAI-compatible endpoint once, with timeout + retry on transient failures. */
export async function probeOpenAiCompatibleEndpoint(
  config: LucaEndpointConfig,
  deps: LucaEndpointProbeDeps = {},
): Promise<LucaEndpointHealth> {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const attempts = Math.max(1, (config.retries ?? 1) + 1);
  const url = normalizeModelsUrl(config.baseUrl);

  let last: LucaEndpointProbeResult = { ok: false, errorKind: "network" };

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = now();
    try {
      const response = await fetchImpl(url, {
        method: "GET",
        signal: controller.signal,
        headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : undefined,
      });
      const latencyMs = now() - started;
      if (!response.ok) {
        return interpretEndpointProbe({ ok: false, httpStatus: response.status, latencyMs });
      }
      try {
        const payload = await response.json();
        return interpretEndpointProbe({ ok: true, httpStatus: response.status, modelIds: parseModelIds(payload), latencyMs });
      } catch {
        return interpretEndpointProbe({ ok: false, httpStatus: response.status, errorKind: "parse", latencyMs });
      }
    } catch (error) {
      const kind: LucaEndpointProbeErrorKind =
        error instanceof Error && error.name === "AbortError" ? "timeout" : "network";
      last = { ok: false, errorKind: kind, latencyMs: now() - started };
    } finally {
      clearTimeout(timer);
    }
    if (attempt < attempts - 1) await sleep(Math.min(500 * 2 ** attempt, 2000));
  }

  return interpretEndpointProbe(last);
}
