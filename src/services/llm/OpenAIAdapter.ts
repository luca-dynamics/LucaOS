import OpenAI from "openai";
import { LLMProvider, LLMResponse, ChatMessage } from "./LLMProvider";
import {
  createOpenAIStreamAccumulator,
  fromOpenAIChoice,
  toOpenAIMessages,
  toOpenAITools,
} from "../../shared/llm/openaiWire.js";

import { settingsService } from "../settingsService";

const getOpenAIBaseUrl = (baseURL?: string): string | undefined => {
  // Respect explicitly passed URL first (e.g., from GrokAdapter)
  if (baseURL) return baseURL;

  const settingsUrl = settingsService.get("brain")?.openaiBaseUrl;
  if (settingsUrl && settingsUrl.trim().length > 5) return settingsUrl;

  let envUrl = "";
  if (typeof import.meta !== "undefined" && import.meta.env) {
    envUrl = import.meta.env.VITE_OPENAI_BASE_URL || "";
  }
  if (!envUrl && typeof process !== "undefined" && process.env) {
    envUrl =
      process.env.VITE_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || "";
  }
  return envUrl && envUrl.trim().length > 5 ? envUrl : undefined;
};

export class OpenAIAdapter implements LLMProvider {
  name = "OpenAI GPT";
  private client: OpenAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gpt-4o", baseURL?: string) {
    const finalBaseUrl = getOpenAIBaseUrl(baseURL);
    const config: any = {
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    };
    if (finalBaseUrl) {
      config.baseURL = finalBaseUrl;
    }
    this.client = new OpenAI(config);
    this.modelName = modelName;
  }

  async generateContent(prompt: string, images?: string[]): Promise<string> {
    const messages: any[] = [{ role: "user", content: prompt }];

    if (images && images.length > 0) {
      const contentArray: any[] = [{ type: "text", text: prompt }];
      images.forEach((img) => {
        contentArray.push({
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${img}`,
          },
        });
      });
      messages[0].content = contentArray;
    }

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: messages as any,
    });

    return response.choices[0].message.content || "";
  }

  async streamContent(
    prompt: string,
    onToken: (text: string) => void,
  ): Promise<string> {
    const stream = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    let fullText = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullText += content;
        onToken(content);
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
    const stream = await this.client.chat.completions.create({
      model: this.modelName,
      messages: toOpenAIMessages(messages, {
        images,
        systemInstruction,
      }) as any,
      stream: true,
      tools: toOpenAITools(tools) as any,
    });

    const accumulator = createOpenAIStreamAccumulator(onChunk);

    for await (const chunk of stream) {
      if (abortSignal?.aborted) break;
      accumulator.ingest(chunk);
    }

    return accumulator.finish();
  }

  async chat(
    messages: ChatMessage[],
    images?: string[],
    systemInstruction?: string,
    tools?: any[],
  ): Promise<LLMResponse> {
    const openAITools = toOpenAITools(tools);

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: toOpenAIMessages(messages, {
        images,
        systemInstruction,
      }) as any,
      tool_choice: openAITools ? "auto" : undefined,
      tools: openAITools as any,
    });

    return fromOpenAIChoice(response.choices[0]);
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });
      return response.data[0].embedding;
    } catch (e) {
      console.error("[OpenAIAdapter] Embedding failed:", e);
      return [];
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
      });
      return response.data.map((d) => d.embedding);
    } catch (e) {
      console.error("[OpenAIAdapter] Batch embedding failed:", e);
      return [];
    }
  }

  async validateKey(): Promise<{ valid: boolean; message: string; details?: any }> {
    try {
      // Use models.list() as a lightweight way to verify the key/base URL
      await this.client.models.list();
      return { valid: true, message: `${this.name} API key/routing is valid.` };
    } catch (e: any) {
      console.error(`[${this.name}Adapter] Validation failed:`, e);
      return {
        valid: false,
        message: e.message || `Failed to validate ${this.name} API key.`,
        details: e,
      };
    }
  }
}
