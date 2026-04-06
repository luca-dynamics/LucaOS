import Anthropic from "@anthropic-ai/sdk";
import { LLMProvider, LLMResponse, ToolCall, ChatMessage } from "./LLMProvider";

import { settingsService } from "../settingsService";

const getAnthropicBaseUrl = (): string | undefined => {
  const settingsUrl = settingsService.get("brain")?.anthropicBaseUrl;
  if (settingsUrl && settingsUrl.trim().length > 5) return settingsUrl;

  let envUrl = "";
  if (typeof import.meta !== "undefined" && import.meta.env) {
    envUrl = import.meta.env.VITE_ANTHROPIC_BASE_URL || "";
  }
  if (!envUrl && typeof process !== "undefined" && process.env) {
    envUrl =
      process.env.VITE_ANTHROPIC_BASE_URL ||
      process.env.ANTHROPIC_BASE_URL ||
      "";
  }
  return envUrl && envUrl.trim().length > 5 ? envUrl : undefined;
};

export class AnthropicAdapter implements LLMProvider {
  name = "Anthropic Claude";
  private client: Anthropic;
  private modelName: string;

  constructor(
    apiKey: string,
    modelName: string = "claude-3-5-sonnet-20240620",
  ) {
    const baseUrl = getAnthropicBaseUrl();
    const config: any = {
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Since we are in Electron/Local environment
    };
    if (baseUrl) {
      config.baseURL = baseUrl;
    }

    this.client = new Anthropic(config);
    this.modelName = modelName;
  }

  async generateContent(prompt: string, images?: string[]): Promise<string> {
    const messages: any[] = [{ role: "user", content: prompt }];

    if (images && images.length > 0) {
      // Anthropic image format
      const imageContent = images.map((img) => ({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: img,
        },
      }));
      messages[0].content = [...imageContent, { type: "text", text: prompt }];
    }

    const response = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 4096,
      messages: messages as any,
    });

    // Handle TextBlock
    const textBlock = response.content.find((c) => c.type === "text");
    return textBlock && "text" in textBlock ? textBlock.text : "";
  }

  async streamContent(
    prompt: string,
    onToken: (text: string) => void,
  ): Promise<string> {
    const stream = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    let fullText = "";
    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        const text = chunk.delta.text;
        fullText += text;
        onToken(text);
      }
    }
    return fullText;
  }

  // ... constructor ...

  async chatStream(
    messages: ChatMessage[],
    onChunk: (text: string) => void,
    images?: string[],
    systemInstruction?: string,
    tools?: any[],
    abortSignal?: AbortSignal,
  ): Promise<LLMResponse> {
    const anthropicMessages = messages.map((msg, index) => {
      const isLast = index === messages.length - 1;

      if (msg.role === "tool") {
        return {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: msg.toolCallId || "unknown",
              content: msg.content,
            },
          ],
        };
      }
      if (msg.role === "model") {
        const content: any[] = [];
        if (msg.thought)
          content.push({
            type: "thinking",
            thinking: msg.thought,
            signature: msg.thought_signature,
          });
        if (msg.content) content.push({ type: "text", text: msg.content });
        if (msg.toolCalls) {
          msg.toolCalls.forEach((tc) => {
            content.push({
              type: "tool_use",
              id: tc.id,
              name: tc.name,
              input: tc.args,
            });
          });
        }
        return { role: "assistant", content };
      }

      const content: any[] = [];
      if (isLast && images && images.length > 0) {
        const imageContent = images.map((img) => ({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: img,
          },
        }));
        content.push(...imageContent);
      }
      if (msg.content) content.push({ type: "text", text: msg.content });
      return { role: "user", content };
    });

    const stream = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 4096,
      messages: anthropicMessages as any,
      system: systemInstruction,
      tools:
        tools && tools.length > 0
          ? (tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.parameters,
            })) as any)
          : undefined,
      stream: true,
    });

    let fullText = "";
    let thought = "";
    const thought_signature = ""; // Not natively supported by Anthropic, handled purely as thought text
    const toolCalls: ToolCall[] = [];

    for await (const chunk of stream) {
      if (abortSignal?.aborted) break;

      if (chunk.type === "content_block_start") {
        if (chunk.content_block.type === "thinking") {
          // thought = chunk.content_block.thinking; // Initial thought if any
        }
      }

      if (chunk.type === "content_block_delta") {
        if (chunk.delta.type === "text_delta") {
          const text = chunk.delta.text;
          fullText += text;
          onChunk(text);
        } else if ((chunk.delta.type as any) === "thinking_delta") {
          const t = (chunk.delta as any).thinking;
          thought += t;
        } else if (chunk.delta.type === "input_json_delta") {
          // Partial JSON for tool calls - we aggregate at the end or handle via block_stop
        }
      }

      if (
        chunk.type === "content_block_stop" &&
        chunk.index !== undefined &&
        (stream as any).currentMessage?.content[chunk.index]
      ) {
        const block = (stream as any).currentMessage.content[chunk.index];
        if (block.type === "tool_use") {
          toolCalls.push({
            name: block.name,
            args: block.input,
            id: block.id,
          });
        }
      }
    }

    return {
      text: fullText,
      thought: thought || undefined,
      thought_signature: thought_signature || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  async chat(
    messages: ChatMessage[],
    images?: string[],
    systemInstruction?: string,
    tools?: any[],
  ): Promise<LLMResponse> {
    // History mapping
    const anthropicMessages = messages.map((msg, index) => {
      const isLast = index === messages.length - 1;

      if (msg.role === "tool") {
        return {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: msg.toolCallId || "unknown",
              content: msg.content,
            },
          ],
        };
      }
      if (msg.role === "model") {
        const content: any[] = [];
        if (msg.thought) content.push({ type: "thinking", thinking: msg.thought, signature: msg.thought_signature });
        if (msg.content) content.push({ type: "text", text: msg.content });
        if (msg.toolCalls) {
          msg.toolCalls.forEach((tc) => {
            content.push({
              type: "tool_use",
              id: tc.id,
              name: tc.name,
              input: tc.args,
            });
          });
        }
        return { role: "assistant", content };
      }

      // User
      const content: any[] = [];
      // Append images if last message
      if (isLast && images && images.length > 0) {
        const imageContent = images.map((img) => ({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: img,
          },
        }));
        content.push(...imageContent);
      }

      if (msg.content) {
        content.push({ type: "text", text: msg.content });
      }

      return {
        role: "user",
        content,
      };
    });

    const response = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 4096,
      messages: anthropicMessages as any,
      system: systemInstruction,
      tools:
        tools && tools.length > 0
          ? (tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.parameters, // Map FunctionDeclaration to input_schema?
              // Luca uses JSON Schema (Google format). Anthropic uses similar.
              // We might need deep compatibility check or casting. Assuming compatible for now.
            })) as any)
          : undefined,
    });

    // Handle TextBlock
    const textBlock = response.content.find((c) => c.type === "text");
    const text = textBlock && "text" in textBlock ? textBlock.text : "";

    // Handle ToolUse
    const toolUseBlocks = response.content.filter((c) => c.type === "tool_use");
    let toolCalls: ToolCall[] | undefined;

    if (toolUseBlocks.length > 0) {
      toolCalls = toolUseBlocks.map((block: any) => ({
        name: block.name,
        args: block.input,
        id: block.id,
      }));
    }

    // Handle Thinking Block (Claude-specific)
    const thinkingBlock = response.content.find((c) => c.type === "thinking");
    const thought = thinkingBlock && "thinking" in thinkingBlock ? (thinkingBlock as any).thinking : undefined;
    const thought_signature = thinkingBlock && "signature" in thinkingBlock ? (thinkingBlock as any).signature : undefined;

    return { text, toolCalls, thought, thought_signature };
  }

  async validateKey(): Promise<{ valid: boolean; message: string; details?: any }> {
    try {
      // Minimal message request to verify the key
      await this.client.messages.create({
        model: this.modelName,
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      });
      return { valid: true, message: "Anthropic API key is valid." };
    } catch (e: any) {
      console.error("[AnthropicAdapter] Validation failed:", e);
      return {
        valid: false,
        message: e.message || "Failed to validate Anthropic API key.",
        details: e,
      };
    }
  }
}
