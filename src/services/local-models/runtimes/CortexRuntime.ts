import { getLocalModelsByRuntime } from "../LocalModelCatalog";
import type { LocalRuntimeAdapter, LocalRuntimeHealth } from "../LocalRuntimeAdapter";
import { createRuntimeHealth } from "../LocalRuntimeAdapter";
import type {
  LocalChatMessage,
  LocalChatRequest,
  LocalChatResponse,
  LocalRuntimeEvent,
  LocalToolCall,
} from "../LocalModelTypes";

interface CortexRuntimeOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  requestTimeoutMs?: number;
  /**
   * Max concurrent chat/stream generations on this adapter instance.
   * Default 1 — protects the Python process from oversubscription when
   * callers bypass LucaLocalModelRuntime admission.
   */
  maxConcurrentGenerations?: number;
}

interface OpenAIChatChoice {
  message?: {
    content?: string | null;
    tool_calls?: Array<{
      id?: string;
      function?: {
        name?: string;
        arguments?: string | Record<string, unknown>;
      };
    }>;
  };
}

type OpenAIToolCall = NonNullable<
  NonNullable<OpenAIChatChoice["message"]>["tool_calls"]
>[number];

export class CortexRuntime implements LocalRuntimeAdapter {
  readonly kind = "cortex" as const;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly requestTimeoutMs: number;
  private readonly maxConcurrentGenerations: number;
  private activeGenerations = 0;

  constructor(options: CortexRuntimeOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? getDefaultCortexBaseUrl());
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 120_000;
    this.maxConcurrentGenerations = Math.max(
      1,
      options.maxConcurrentGenerations ?? 1,
    );
  }

  /** In-flight chat/stream count on this adapter (diagnostics / probes). */
  getActiveGenerationCount(): number {
    return this.activeGenerations;
  }

  async health(): Promise<LocalRuntimeHealth> {
    if (!this.baseUrl) {
      return createRuntimeHealth({
        runtime: this.kind,
        reachable: false,
        checkedAt: this.now(),
        message: "Cortex base URL is not configured for this runtime target.",
      });
    }

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/health`, {
        method: "GET",
        signal: timeoutSignal(5_000),
      });

      if (!response.ok) {
        throw new Error(`Cortex health failed with HTTP ${response.status}`);
      }

      const modelIds = await this.listModels();
      const busy =
        this.activeGenerations >= this.maxConcurrentGenerations
          ? ` ${this.activeGenerations} active generation(s).`
          : "";
      return createRuntimeHealth({
        runtime: this.kind,
        reachable: true,
        modelIds,
        checkedAt: this.now(),
        message: `Cortex local runtime is reachable.${busy}`,
        degraded: this.activeGenerations > 0,
      });
    } catch (error) {
      return createRuntimeHealth({
        runtime: this.kind,
        reachable: false,
        checkedAt: this.now(),
        message: `Cortex is unreachable: ${errorMessage(error)}`,
      });
    }
  }

  /**
   * Prefer live server model ids when available; fall back to catalog.
   */
  async listModels(): Promise<string[]> {
    const catalogIds = getLocalModelsByRuntime("cortex").map(
      (model) => model.runtimeModelId,
    );
    if (!this.baseUrl) return catalogIds;

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/v1/models`, {
        method: "GET",
        signal: timeoutSignal(5_000),
      });
      if (!response.ok) return catalogIds;
      const body = await response.json();
      const live = parseOpenAIModelIds(body);
      if (live.length === 0) return catalogIds;
      // Union live + catalog so UI still knows planned Cortex models.
      return Array.from(new Set([...live, ...catalogIds]));
    } catch {
      return catalogIds;
    }
  }

  async ensureReady(): Promise<void> {
    const health = await this.health();
    if (!health.reachable) throw new Error(health.message);
  }

  async chat(request: LocalChatRequest): Promise<LocalChatResponse> {
    this.acquireGeneration(request.signal);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages.map(toOpenAIMessage),
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens,
          tools: request.tools && request.tools.length > 0 ? request.tools : undefined,
          stream: false,
        }),
        signal: request.signal ?? timeoutSignal(this.requestTimeoutMs),
      });

      if (!response.ok) {
        const detail = await safeReadText(response);
        throw new Error(
          `Cortex chat failed with HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
        );
      }

      const body = await response.json();
      const choice = (body.choices?.[0] ?? {}) as OpenAIChatChoice;
      const message = choice.message ?? {};

      return {
        text: message.content ?? "",
        toolCalls: parseToolCalls(message.tool_calls),
        usage: {
          inputTokens: body.usage?.prompt_tokens,
          outputTokens: body.usage?.completion_tokens,
        },
        runtime: this.kind,
        model: request.model,
      };
    } finally {
      this.releaseGeneration();
    }
  }

  async *stream(request: LocalChatRequest): AsyncGenerator<LocalRuntimeEvent> {
    this.acquireGeneration(request.signal);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages.map(toOpenAIMessage),
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens,
          tools: request.tools && request.tools.length > 0 ? request.tools : undefined,
          stream: true,
        }),
        signal: request.signal ?? timeoutSignal(this.requestTimeoutMs),
      });

      if (!response.ok) {
        const detail = await safeReadText(response);
        throw new Error(
          `Cortex stream failed with HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
        );
      }

      yield* parseOpenAIStream(response, request.signal);
    } finally {
      this.releaseGeneration();
    }
  }

  private acquireGeneration(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new Error("Cortex generation aborted before start.");
    }
    if (this.activeGenerations >= this.maxConcurrentGenerations) {
      throw new Error(
        `Cortex is busy (${this.activeGenerations}/${this.maxConcurrentGenerations} active generations). Wait for the current job to finish or cancel it.`,
      );
    }
    this.activeGenerations += 1;
  }

  private releaseGeneration(): void {
    this.activeGenerations = Math.max(0, this.activeGenerations - 1);
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function timeoutSignal(ms: number): AbortSignal | undefined {
  return typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
    ? AbortSignal.timeout(ms)
    : undefined;
}

function toOpenAIMessage(message: LocalChatMessage): Record<string, unknown> {
  return {
    role: message.role,
    content: message.content || " ",
    tool_call_id: message.toolCallId,
  };
}

function parseToolCalls(toolCalls: OpenAIToolCall[] | undefined): LocalToolCall[] | undefined {
  if (!toolCalls || toolCalls.length === 0) return undefined;
  return toolCalls.map((toolCall: OpenAIToolCall, index: number) => ({
    id: toolCall.id ?? `call_${index}`,
    name: toolCall.function?.name ?? "unknown_tool",
    args: parseArguments(toolCall.function?.arguments),
  }));
}

function parseArguments(args: string | Record<string, unknown> | undefined): unknown {
  if (!args) return {};
  if (typeof args !== "string") return args;
  try {
    return JSON.parse(args);
  } catch {
    return { raw: args };
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseOpenAIModelIds(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const data = (body as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  return data
    .map((entry) => {
      if (!entry || typeof entry !== "object") return undefined;
      const id = (entry as { id?: unknown }).id;
      return typeof id === "string" ? id : undefined;
    })
    .filter((id): id is string => Boolean(id));
}

async function* parseOpenAIStream(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<LocalRuntimeEvent> {
  if (!response.body) throw new Error("ReadableStream not supported in this environment");

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const onAbort = () => {
    try {
      void reader.cancel("aborted");
    } catch {
      /* best-effort */
    }
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    while (true) {
      if (signal?.aborted) {
        throw new Error("Cortex stream aborted.");
      }
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const event = parseStreamLine(line);
        if (!event) continue;
        yield event;
      }
    }

    if (buffer.trim()) {
      const event = parseStreamLine(buffer);
      if (event) yield event;
    }

    yield { type: "done" };
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}

function parseStreamLine(line: string): LocalRuntimeEvent | undefined {
  const trimmed = line.trim();
  if (!trimmed || trimmed === "data: [DONE]" || trimmed === "[DONE]") return undefined;

  const data = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
  if (!data || data === "[DONE]") return undefined;

  try {
    const parsed = JSON.parse(data);
    const text =
      parsed.choices?.[0]?.delta?.content ??
      parsed.choices?.[0]?.message?.content ??
      parsed.message?.content ??
      parsed.response ??
      parsed.text;
    if (typeof text === "string" && text.length > 0) return { type: "token", text };
  } catch {
    return undefined;
  }

  return undefined;
}

function getDefaultCortexBaseUrl(): string {
  const meta =
    typeof import.meta !== "undefined"
      ? (import.meta as unknown as { env?: Record<string, string | undefined> })
      : undefined;
  const viteValue = meta?.env?.VITE_CORTEX_SERVER_URL;
  if (viteValue) return viteValue;

  if (typeof process !== "undefined" && process.env?.VITE_CORTEX_SERVER_URL) {
    return process.env.VITE_CORTEX_SERVER_URL;
  }

  return "http://127.0.0.1:8000";
}
