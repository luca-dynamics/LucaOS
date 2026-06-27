import { getLocalModelsByRuntime } from "../LocalModelCatalog";
import type { LocalRuntimeAdapter, LocalRuntimeHealth } from "../LocalRuntimeAdapter";
import { createRuntimeHealth } from "../LocalRuntimeAdapter";
import type {
  LocalChatMessage,
  LocalChatRequest,
  LocalChatResponse,
  LocalToolCall,
} from "../LocalModelTypes";

interface CortexRuntimeOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  requestTimeoutMs?: number;
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

  constructor(options: CortexRuntimeOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? getDefaultCortexBaseUrl());
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 120_000;
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

      return createRuntimeHealth({
        runtime: this.kind,
        reachable: true,
        modelIds: await this.listModels(),
        checkedAt: this.now(),
        message: "Cortex local runtime is reachable.",
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

  async listModels(): Promise<string[]> {
    return getLocalModelsByRuntime("cortex").map((model) => model.runtimeModelId);
  }

  async ensureReady(): Promise<void> {
    const health = await this.health();
    if (!health.reachable) throw new Error(health.message);
  }

  async chat(request: LocalChatRequest): Promise<LocalChatResponse> {
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
