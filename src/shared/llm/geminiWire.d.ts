import { ChatMessage, ToolCall, ToolSpec } from "./llmContract";

export type GeminiWireContent = Record<string, unknown>;

export interface GeminiWireToolConfig {
  functionDeclarations: ToolSpec[];
}

export interface GeminiWireSystemInstruction {
  role: "system";
  parts: Array<{ text: string }>;
}

export interface GeminiContentOptions {
  images?: string[];
}

/**
 * A response part, described loosely so either Gemini SDK's `Part` fits.
 *
 * `text` is declared even though the thought scan ignores it: a target of
 * only-optional properties is a *weak type*, and `@google/generative-ai`'s `Part`
 * union members declare `text` (as `string`, or `never` on the non-text
 * variants) and none of the thought fields — so without it, no `Part` shares a
 * property with this type and the whole union is rejected.
 */
export interface GeminiWirePart {
  text?: string;
  thought?: unknown;
  thought_signature?: unknown;
  thoughtSignature?: unknown;
}

/**
 * Anything carrying `candidates`: `result.response` on `@google/generative-ai`,
 * `result` on `@google/genai`.
 */
export interface GeminiWireThoughtHolder {
  candidates?: ReadonlyArray<{
    content?: { parts?: ReadonlyArray<GeminiWirePart> } | null;
  } | null> | null;
}

export interface GeminiWireFunctionCall {
  name: string;
  args?: unknown;
}

export declare function toGeminiContents(
  messages?: ChatMessage[],
  options?: GeminiContentOptions,
): GeminiWireContent[];

export declare function toGeminiTools(
  tools?: ToolSpec[],
): GeminiWireToolConfig[] | undefined;

export declare function toGeminiSystemInstruction(
  systemInstruction?: string,
): GeminiWireSystemInstruction | undefined;

export declare function extractGeminiThought(
  candidatesHolder?: GeminiWireThoughtHolder | null,
): { thought?: string; thought_signature?: string };

export declare function normalizeGeminiToolCalls(
  calls?: readonly GeminiWireFunctionCall[] | null,
): ToolCall[] | undefined;
