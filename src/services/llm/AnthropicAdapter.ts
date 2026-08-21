import Anthropic from "@anthropic-ai/sdk";
import { LLMProvider, LLMResponse, ChatMessage } from "./LLMProvider";
import {
  createAnthropicStreamAccumulator,
  fromAnthropicMessage,
  toAnthropicMessages,
  toAnthropicTools,
} from "../../shared/llm/anthropicWire.js";

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
    const stream = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 4096,
      messages: toAnthropicMessages(messages, { images }) as any,
      system: systemInstruction,
      tools: toAnthropicTools(tools) as any,
      stream: true,
    });

    const accumulator = createAnthropicStreamAccumulator(onChunk);

    for await (const chunk of stream) {
      if (abortSignal?.aborted) break;
      // Completed tool_use blocks are read off the SDK's in-flight message.
      accumulator.ingest(chunk, (stream as any).currentMessage);
    }

    return accumulator.finish();
  }

  async chat(
    messages: ChatMessage[],
    images?: string[],
    systemInstruction?: string,
    tools?: any[],
  ): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 4096,
      messages: toAnthropicMessages(messages, { images }) as any,
      system: systemInstruction,
      tools: toAnthropicTools(tools) as any,
    });

    return fromAnthropicMessage(response);
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
