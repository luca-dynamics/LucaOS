/**
 * Product-safe Ollama lifecycle/ops through the registered runtime facade.
 * Prefer these helpers over ad-hoc fetch to localhost:11434.
 *
 * Install / pull remain Electron IPC (ModelManagerService.setupOllamaForModel).
 */

import { localRuntimeRegistry } from "./RuntimeRegistry";
import {
  OllamaRuntime,
  type OllamaGenerateRequest,
} from "./runtimes/OllamaRuntime";
import { clearOllamaRuntimeProbeCache } from "./ollamaRuntimeProbe";
import type { LocalChatMessage, LocalChatRequest } from "./LocalModelTypes";

function resolveOllamaRuntime(baseUrl?: string): OllamaRuntime {
  if (baseUrl?.trim()) {
    return new OllamaRuntime({ baseUrl: baseUrl.trim() });
  }
  const registered = localRuntimeRegistry.get("ollama");
  if (registered instanceof OllamaRuntime) return registered;
  // Fall back to a default adapter so ops work even if registry was replaced
  // with a non-OllamaRuntime stub in tests.
  return new OllamaRuntime();
}

export interface OllamaDeleteResult {
  ok: boolean;
  message?: string;
}

/**
 * Delete an Ollama model tag via the runtime adapter, then clear status cache.
 */
export async function deleteOllamaModelViaRuntimeFacade(
  modelName: string,
): Promise<OllamaDeleteResult> {
  try {
    const runtime = resolveOllamaRuntime();
    await runtime.deleteModel(modelName);
    clearOllamaRuntimeProbeCache();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ollama delete failed";
    return { ok: false, message };
  }
}

export interface OllamaCanaryChatResult {
  ok: boolean;
  text: string;
  latencyMs: number;
  message?: string;
}

const DEFAULT_CANARY_PROMPT = "Say 'Luca Test Passed'";

/**
 * Short non-streaming chat for canary / readiness probes.
 * Uses the OpenAI-compatible path on OllamaRuntime (not raw /api/chat).
 */
export async function canaryChatViaRuntimeFacade(options: {
  model: string;
  prompt?: string;
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
}): Promise<OllamaCanaryChatResult> {
  const start = Date.now();
  const model = options.model.trim();
  if (!model) {
    return {
      ok: false,
      text: "No model tag",
      latencyMs: 0,
      message: "Canary requires a model tag.",
    };
  }

  try {
    const runtime = resolveOllamaRuntime(options.baseUrl);
    const request: LocalChatRequest = {
      model,
      messages: [
        {
          role: "user",
          content: options.prompt ?? DEFAULT_CANARY_PROMPT,
        },
      ],
      temperature: options.temperature ?? 0,
      maxTokens: options.maxTokens ?? 64,
      stream: false,
    };
    const response = await runtime.chat(request);
    const text = (response.text || "").trim() || "No response";
    const latencyMs = Date.now() - start;
    return {
      ok: text !== "No response",
      text,
      latencyMs,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ollama canary chat failed";
    const latencyMs = Date.now() - start;
    const notFound = /404|not found/i.test(message)
      ? "Model not found in Ollama"
      : message;
    return {
      ok: false,
      text: notFound,
      latencyMs,
      message,
    };
  }
}

export interface OllamaChatFacadeResult {
  text: string;
}

/**
 * Chat completions via registered Ollama runtime (OpenAI-compatible path).
 * Used by legacy llmService OllamaProvider.
 */
export async function chatViaRuntimeFacade(options: {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
}): Promise<OllamaChatFacadeResult> {
  const runtime = resolveOllamaRuntime(options.baseUrl);
  const messages: LocalChatMessage[] = options.messages.map((msg) => ({
    role: (msg.role === "assistant" || msg.role === "system" || msg.role === "tool"
      ? msg.role
      : "user") as LocalChatMessage["role"],
    content: msg.content,
  }));
  const response = await runtime.chat({
    model: options.model,
    messages,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    stream: false,
  });
  return { text: response.text ?? "" };
}

export interface OllamaGenerateFacadeResult {
  text: string;
  model: string;
}

/**
 * Prompt-style generation (optional images) via native `/api/generate`.
 * Used by visionManager and legacy llmService generate.
 */
export async function generateViaRuntimeFacade(
  options: OllamaGenerateRequest & { baseUrl?: string },
): Promise<OllamaGenerateFacadeResult> {
  const { baseUrl, ...request } = options;
  const runtime = resolveOllamaRuntime(baseUrl);
  const response = await runtime.generate(request);
  return { text: response.text, model: response.model };
}

/**
 * Streaming prompt-style generation via native `/api/generate`.
 */
export async function* streamGenerateViaRuntimeFacade(
  options: OllamaGenerateRequest & { baseUrl?: string },
): AsyncGenerator<string> {
  const { baseUrl, ...request } = options;
  const runtime = resolveOllamaRuntime(baseUrl);
  yield* runtime.streamGenerate(request);
}
