import OpenAI from "openai";
import { LLMProvider, LLMResponse, ToolCall, ChatMessage } from "./LLMProvider";

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
    const openAIMessages: any[] = messages.map((msg, index) => {
      const isLast = index === messages.length - 1;

      if (msg.role === "tool") {
        return {
          role: "tool",
          tool_call_id: msg.toolCallId,
          content: msg.content,
        };
      }
      if (msg.role === "model") {
        const m: any = { role: "assistant" };
        if (msg.content) m.content = msg.content;
        if (msg.toolCalls) {
          m.tool_calls = msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args),
            },
          }));
        }
        return m;
      }

      const contentArray: any[] = [];
      if (msg.content) contentArray.push({ type: "text", text: msg.content });
      if (isLast && images && images.length > 0) {
        images.forEach((img) => {
          contentArray.push({
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${img}` },
          });
        });
      }
      return { role: msg.role, content: contentArray };
    });

    if (systemInstruction) {
      openAIMessages.unshift({ role: "system", content: systemInstruction });
    }

    const stream = await this.client.chat.completions.create({
      model: this.modelName,
      messages: openAIMessages as any,
      stream: true,
      tools:
        tools && tools.length > 0
          ? (tools.map((t) => ({
              type: "function",
              function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
              },
            })) as any)
          : undefined,
    });

    let fullText = "";
    const toolCalls: ToolCall[] = [];
    const tempToolCalls: Record<number, any> = {};

    for await (const chunk of stream) {
      if (abortSignal?.aborted) break;

      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        fullText += delta.content;
        onChunk(delta.content);
      }

      if (delta.tool_calls) {
        delta.tool_calls.forEach((tc: any) => {
          if (!tempToolCalls[tc.index]) {
            tempToolCalls[tc.index] = {
              id: tc.id,
              name: tc.function.name,
              args: "",
            };
          }
          if (tc.function.arguments) {
            tempToolCalls[tc.index].args += tc.function.arguments;
          }
        });
      }
    }

    // Finalize tool calls
    Object.values(tempToolCalls).forEach((tc) => {
      try {
        toolCalls.push({
          id: tc.id,
          name: tc.name,
          args: JSON.parse(tc.args),
        });
      } catch (e) {
        console.error("[OpenAIAdapter] Failed to parse tool arguments:", e);
      }
    });

    return {
      text: fullText,
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
    const openAIMessages = messages.map((msg, index) => {
      const isLast = index === messages.length - 1;

      if (msg.role === "tool") {
        return {
          role: "tool",
          tool_call_id: msg.toolCallId,
          content: msg.content,
        };
      }
      if (msg.role === "model") {
        const m: any = { role: "assistant" };
        if (msg.content) m.content = msg.content;
        if (msg.toolCalls) {
          m.tool_calls = msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args),
            },
          }));
        }
        return m;
      }

      // User
      const contentArray: any[] = [];
      if (msg.content) contentArray.push({ type: "text", text: msg.content });

      if (isLast && images && images.length > 0) {
        images.forEach((img) => {
          contentArray.push({
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${img}`,
            },
          });
        });
      }

      return {
        role: msg.role,
        content: contentArray,
      };
    });

    if (systemInstruction) {
      openAIMessages.unshift({ role: "system", content: systemInstruction });
    }

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: openAIMessages as any,
      tool_choice: tools && tools.length > 0 ? "auto" : undefined,
      tools:
        tools && tools.length > 0
          ? (tools.map((t) => ({
              type: "function",
              function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
              },
            })) as any)
          : undefined,
    });

    const choice = response.choices[0];
    const text = choice.message.content || "";
    const toolC = choice.message.tool_calls;

    let toolCalls: ToolCall[] | undefined;
    if (toolC && toolC.length > 0) {
      toolCalls = toolC.map((tc: any) => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments),
        id: tc.id,
      }));
    }

    return { text, toolCalls };
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
