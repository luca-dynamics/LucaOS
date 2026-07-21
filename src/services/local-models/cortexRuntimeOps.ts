/**
 * Product-safe Cortex chat through the registered runtime + admission control.
 * Prefer this over ad-hoc fetch(`${CORTEX_URL}/chat/completions`).
 *
 * Install/download lifecycle still uses ModelManagerService Cortex HTTP.
 * Non-chat Cortex routes (keyboard, agent execute-tool, chroma) stay direct.
 */

import { localInferenceAdmission } from "./LocalInferenceAdmission";
import { localRuntimeRegistry } from "./RuntimeRegistry";
import { CortexRuntime } from "./runtimes/CortexRuntime";
import type { LocalChatMessage } from "./LocalModelTypes";
import { getLocalModelsByRuntime } from "./LocalModelCatalog";

function resolveCortexRuntime(baseUrl?: string): CortexRuntime {
  if (baseUrl?.trim()) {
    return new CortexRuntime({ baseUrl: baseUrl.trim() });
  }
  const registered = localRuntimeRegistry.get("cortex");
  if (registered instanceof CortexRuntime) return registered;
  return new CortexRuntime();
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
