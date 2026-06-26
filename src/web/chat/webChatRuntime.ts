import { API_BASE_URL, CLOUD_API_URL } from "../../config/api";

export interface WebChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface WebChatSendInput {
  messages: WebChatMessage[];
  text: string;
  mode?: "chat";
}

export interface WebChatRuntime {
  sendMessage(input: WebChatSendInput): Promise<WebChatMessage>;
}

export const WEB_CHAT_RUNTIME_UNAVAILABLE =
  "Luca Prime connection is preparing. Local and BYOK routes can be connected from Settings.";

const WEB_CHAT_ERROR =
  "Luca couldn't reach that route just now. You can try again, or connect a route in Settings.";

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * webChatRuntime — the browser-safe chat surface of the web app runtime
 * (real-app Phase 2). Talks to a configured OpenAI-compatible cloud endpoint
 * (the same `{base}/v1/chat/completions` contract the desktop adapters use),
 * with pure request/response helpers and an honest fallback when no route is
 * configured. It never imports the native/secure service chain (settingsService
 * / vault), so it stays mountable in the browser under Web Safe Mode.
 */

export interface WebChatEnv {
  cloudApiUrl?: string;
  apiBaseUrl?: string;
  model?: string;
}

/** Resolve the configured cloud chat base URL, or null when nothing is set. */
export function resolveWebChatBaseUrl(env: WebChatEnv = {}): string | null {
  const raw = (env.cloudApiUrl ?? CLOUD_API_URL) || (env.apiBaseUrl ?? API_BASE_URL);
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : null;
}

/** Pure: build the OpenAI-compatible chat request body for the conversation. */
export function buildWebChatRequestBody(
  conversation: WebChatMessage[],
  model: string,
): { model: string; messages: { role: string; content: string }[]; temperature: number } {
  return {
    model,
    messages: conversation.map((m) => ({ role: m.role, content: m.content })),
    temperature: 0.7,
  };
}

/** Pure: extract the assistant text from an OpenAI-compatible response, or null. */
export function parseWebChatResponse(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const choices = (raw as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const message = (choices[0] as { message?: { content?: unknown } }).message;
  const content = message?.content;
  return typeof content === "string" && content.length > 0 ? content : null;
}

const assistantMessage = (content: string): WebChatMessage => ({
  id: `web-runtime-${Date.now()}`,
  role: "assistant",
  content,
  timestamp: Date.now(),
});

export interface WebChatRuntimeDeps {
  env?: WebChatEnv;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export function createWebChatRuntime(deps: WebChatRuntimeDeps = {}): WebChatRuntime {
  const env = deps.env ?? {};
  const fetchImpl = deps.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const model = env.model ?? "luca-prime";

  return {
    async sendMessage(input) {
      const baseUrl = resolveWebChatBaseUrl(env);
      if (!baseUrl || !fetchImpl) {
        return assistantMessage(WEB_CHAT_RUNTIME_UNAVAILABLE);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(`${baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildWebChatRequestBody(input.messages, model)),
          signal: controller.signal,
        });
        if (!response.ok) return assistantMessage(WEB_CHAT_ERROR);
        const content = parseWebChatResponse(await response.json());
        return assistantMessage(content ?? WEB_CHAT_ERROR);
      } catch {
        return assistantMessage(WEB_CHAT_ERROR);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export const webChatRuntime: WebChatRuntime = createWebChatRuntime();
