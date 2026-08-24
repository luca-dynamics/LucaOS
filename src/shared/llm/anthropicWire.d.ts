import { ChatMessage, LLMResponse, ToolSpec } from "./llmContract";

export type AnthropicWireMessageOut = Record<string, unknown>;

export interface AnthropicWireTool {
  name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
}

/** A response content block, described loosely so either SDK version fits. */
export interface AnthropicWireBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  thinking?: string;
  signature?: string;
}

export interface AnthropicWireMessage {
  content?: readonly AnthropicWireBlock[];
}

/**
 * One stream event, described loosely enough that the SDK's
 * `RawMessageStreamEvent` union fits: every member carries a literal `type`, and
 * what it carries beyond that differs per member.
 *
 * `delta` is `unknown` rather than the three fields the accumulator actually
 * reads (`type`, `text`, `thinking`, on a `content_block_delta`). A target of
 * only-optional properties is a *weak type*, and a `message_delta`'s delta —
 * `{ stop_reason, stop_sequence }` — shares no property with it, so naming the
 * fields here would reject the whole union at every call site.
 */
export interface AnthropicWireStreamChunk {
  type: string;
  index?: number;
  delta?: unknown;
}

export interface AnthropicMessageOptions {
  images?: string[];
}

export interface AnthropicStreamAccumulator {
  /**
   * Pass `stream.currentMessage` as `currentMessage` so completed `tool_use`
   * blocks can be read at `content_block_stop`.
   */
  ingest(
    chunk?: AnthropicWireStreamChunk | null,
    currentMessage?: AnthropicWireMessage | null,
  ): void;
  finish(): LLMResponse;
}

export declare function toAnthropicMessages(
  messages?: ChatMessage[],
  options?: AnthropicMessageOptions,
): AnthropicWireMessageOut[];

export declare function toAnthropicTools(
  tools?: ToolSpec[],
): AnthropicWireTool[] | undefined;

export declare function fromAnthropicMessage(
  response?: AnthropicWireMessage | null,
): LLMResponse;

export declare function createAnthropicStreamAccumulator(
  onChunk?: (text: string) => void,
): AnthropicStreamAccumulator;
