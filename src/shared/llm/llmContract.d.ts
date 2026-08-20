export interface ToolCall {
  name: string;
  args: unknown;
  id?: string;
}

export interface ChatMessage {
  role: "user" | "model" | "tool" | "system";
  content?: string;
  thought?: string;
  thought_signature?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  name?: string;
}

export interface LLMResponse {
  text: string;
  thought?: string;
  thought_signature?: string;
  toolCalls?: ToolCall[];
}

export interface ToolSpec {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export declare function parseToolArguments(raw: unknown): unknown;

export declare function normalizeToolCalls(
  toolCalls?: ToolCall[],
): ToolCall[] | undefined;
