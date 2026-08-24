/**
 * Product-safe Cortex access through the registered runtime facade.
 * Prefer these helpers over ad-hoc fetch(`${CORTEX_URL}/...`).
 *
 * - Chat: admission + CortexRuntime.chat
 * - Non-chat HTTP: shared base URL + fetchCortexViaRuntimeFacade
 *
 * Install/download lifecycle still uses LocalModelLibrary Cortex HTTP
 * (model status/download paths).
 */

import { localInferenceAdmission } from "./LocalInferenceAdmission";
import { localRuntimeRegistry } from "./RuntimeRegistry";
import { CortexRuntime } from "./runtimes/CortexRuntime";
import type { LocalChatMessage } from "./LocalModelTypes";
import { getLocalModelsByRuntime } from "./LocalModelCatalog";
import { probeCortexViaRuntimeFacade } from "./cortexRuntimeProbe";

function resolveCortexRuntime(baseUrl?: string): CortexRuntime {
  if (baseUrl?.trim()) {
    return new CortexRuntime({ baseUrl: baseUrl.trim() });
  }
  const registered = localRuntimeRegistry.get("cortex");
  if (registered instanceof CortexRuntime) return registered;
  return new CortexRuntime();
}

/** Resolved Cortex base URL from the registered runtime (or override). */
export function getCortexBaseUrlFromFacade(baseUrl?: string): string {
  return resolveCortexRuntime(baseUrl).getBaseUrl();
}

function joinCortexPath(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export interface FetchCortexOptions extends RequestInit {
  baseUrl?: string;
  /** When true, fail fast if Cortex health probe is down. Default false. */
  requireHealthy?: boolean;
  /** Override request timeout (AbortSignal.timeout). */
  timeoutMs?: number;
}

/**
 * HTTP to Cortex using the facade-resolved base URL.
 * Use for STT, tools, keyboard, memory bridge — not for chat (use chatViaCortexRuntimeFacade).
 */
export async function fetchCortexViaRuntimeFacade(
  path: string,
  options: FetchCortexOptions = {},
): Promise<Response> {
  const {
    baseUrl,
    requireHealthy = false,
    timeoutMs,
    signal,
    ...init
  } = options;

  if (requireHealthy) {
    const probe = await probeCortexViaRuntimeFacade({ force: true });
    if (!probe.available) {
      throw new Error(probe.message || "Cortex is not available.");
    }
  }

  const url = joinCortexPath(getCortexBaseUrlFromFacade(baseUrl), path);
  const timeoutSignal =
    timeoutMs && typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(timeoutMs)
      : undefined;

  let combinedSignal = signal ?? timeoutSignal;
  if (signal && timeoutSignal) {
    // Prefer AbortSignal.any when available
    const anyFn = (
      AbortSignal as unknown as {
        any?: (signals: AbortSignal[]) => AbortSignal;
      }
    ).any;
    combinedSignal = anyFn ? anyFn([signal, timeoutSignal]) : signal;
  }

  return fetch(url, {
    ...init,
    signal: combinedSignal,
  });
}

/**
 * POST JSON to a Cortex path; returns parsed body (throws on !ok).
 */
export async function postCortexJsonViaRuntimeFacade<T = unknown>(
  path: string,
  body: unknown,
  options: Omit<FetchCortexOptions, "method" | "body" | "headers"> & {
    headers?: HeadersInit;
  } = {},
): Promise<T> {
  const { headers, ...rest } = options;
  const response = await fetchCortexViaRuntimeFacade(path, {
    ...rest,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(headers as Record<string, string> | undefined),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Cortex ${path} failed with HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }
  return (await response.json()) as T;
}

function defaultCortexModelId(): string {
  const recommended = getLocalModelsByRuntime("cortex").find((m) => m.recommended);
  if (recommended) return recommended.runtimeModelId;
  const first = getLocalModelsByRuntime("cortex")[0];
  return first?.runtimeModelId ?? "gemma-2b";
}

/** Normalize legacy agent payloads that used Gemini-style `parts: [{ text }]`. */
export function normalizeCortexChatMessages(
  messages: Array<{
    role?: string;
    content?: unknown;
    parts?: Array<{ text?: string }>;
  }>,
): LocalChatMessage[] {
  return messages.map((msg) => {
    let content = "";
    if (typeof msg.content === "string") {
      content = msg.content;
    } else if (Array.isArray(msg.parts)) {
      content = msg.parts
        .map((p) => (typeof p?.text === "string" ? p.text : ""))
        .filter(Boolean)
        .join("\n");
    } else if (msg.content != null) {
      content = String(msg.content);
    }
    const roleRaw = (msg.role ?? "user").toLowerCase();
    const role: LocalChatMessage["role"] =
      roleRaw === "assistant" ||
      roleRaw === "system" ||
      roleRaw === "tool"
        ? roleRaw
        : "user";
    return { role, content: content || " " };
  });
}

export interface CortexChatFacadeResult {
  text: string;
  model: string;
}

/**
 * Chat via CortexRuntime with client-side admission (default 1 concurrent).
 * Throws if Cortex is busy or unreachable.
 */
export async function chatViaCortexRuntimeFacade(options: {
  model?: string;
  messages: Array<{
    role?: string;
    content?: unknown;
    parts?: Array<{ text?: string }>;
  }>;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
  signal?: AbortSignal;
  /** When false, skip admission (tests / nested calls). Default true. */
  useAdmission?: boolean;
}): Promise<CortexChatFacadeResult> {
  const useAdmission = options.useAdmission !== false;
  const token = useAdmission
    ? localInferenceAdmission.tryAcquire("cortex")
    : null;
  if (useAdmission && !token) {
    throw new Error(
      "Cortex is busy (admission limit). Wait for the current local generation to finish.",
    );
  }

  try {
    const runtime = resolveCortexRuntime(options.baseUrl);
    const response = await runtime.chat({
      model: options.model?.trim() || defaultCortexModelId(),
      messages: normalizeCortexChatMessages(options.messages),
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      signal: options.signal,
      stream: false,
    });
    return { text: response.text ?? "", model: response.model };
  } finally {
    token?.release();
  }
}
