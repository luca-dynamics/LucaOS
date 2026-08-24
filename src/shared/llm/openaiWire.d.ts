import { ChatMessage, LLMResponse, ToolSpec } from "./llmContract";

export type OpenAIWireMessage = Record<string, unknown>;

export interface OpenAIWireTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface OpenAIWireToolCall {
  id?: string;
  function?: { name?: string; arguments?: string };
}

export interface OpenAIWireChoice {
  message?: {
    content?: string | null;
    tool_calls?: OpenAIWireToolCall[];
  };
}

export interface OpenAIWireStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string | null;
      tool_calls?: Array<OpenAIWireToolCall & { index: number }>;
    };
  }>;
}

export interface OpenAIMessageOptions {
  images?: string[];
  systemInstruction?: string;
}

export interface OpenAIStreamAccumulator {
  ingest(chunk: OpenAIWireStreamChunk): void;
  finish(): LLMResponse;
}

export declare function toOpenAIMessages(
  messages?: ChatMessage[],
  options?: OpenAIMessageOptions,
): OpenAIWireMessage[];

export declare function toOpenAITools(
  tools?: ToolSpec[],
): OpenAIWireTool[] | undefined;

export declare function fromOpenAIChoice(
  choice?: OpenAIWireChoice,
): LLMResponse;

export declare function createOpenAIStreamAccumulator(
  onChunk?: (text: string) => void,
): OpenAIStreamAccumulator;
