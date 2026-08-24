import { LLMProvider, LLMResponse, ToolCall, ChatMessage } from "./LLMProvider";
import { getApiKey, SYSTEM_API_KEY } from "../genAIClient";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BRAIN_CONFIG } from "../../config/brain.config";
import {
  extractGeminiThought,
  normalizeGeminiToolCalls,
  toGeminiContents,
  toGeminiSystemInstruction,
  toGeminiTools,
} from "../../shared/llm/geminiWire.js";

export class GeminiAdapter implements LLMProvider {
  name = "Google Gemini";
  private client?: GoogleGenerativeAI;
  private modelName: string = BRAIN_CONFIG.defaults.brain; // Match Backend Config

  constructor(apiKey: string, modelName: string = BRAIN_CONFIG.defaults.brain) {
    this.modelName = modelName;
    if (apiKey) {
      console.log(
        `[GeminiAdapter] Initializing with specific key (Length: ${apiKey.length})`,
      );
      this.client = new GoogleGenerativeAI(apiKey);
    }
  }

  private getClient(): GoogleGenerativeAI {
    if (this.client) return this.client;
    
    // Instantiate new SDK on the fly since genAIClient returns the old SDK
    const key = getApiKey() || SYSTEM_API_KEY;
    if (!key || !key.startsWith("AIza")) {
        console.warn("[GeminiAdapter] No valid API key found. API calls may fail.");
    }
    this.client = new GoogleGenerativeAI(key || "invalid-key");
    return this.client;
  }

  updateConfig(apiKey: string, modelName: string) {
    this.modelName = modelName;
    if (apiKey) {
      try {
        this.client = new GoogleGenerativeAI(apiKey);
      } catch (e) {
        console.error("Failed to update GenAI config", e);
      }
    }
  }

  async generateContent(prompt: string, images?: string[]): Promise<string> {
    const client = this.getClient();

    // Construct parts
    const parts: any[] = [{ text: prompt }];
    if (images && images.length > 0) {
      parts.push(
        ...images.map((img) => ({
          inlineData: {
            data: img,
            mimeType: "image/jpeg",
          },
        })),
      );
    }

    console.log(`[GeminiAdapter] Generating content with model: ${this.modelName}`);
    try {
      const model = client.getGenerativeModel({ model: this.modelName });
      const result = await model.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      });

      // SDK fallback: check both .text and .response.text()
      const text = result.response.text();
      
      console.log(`[GeminiAdapter] Generated response length: ${text.length}`);
      if (text.length < 20) {
        console.warn(`[GeminiAdapter] Short/Empty response detected: "${text}"`);
      }
      return text;
    } catch (e: any) {
      console.error(`[GeminiAdapter] Generation failed: ${e.message}`, e);
      throw e;
    }
  }

  async streamContent(
    prompt: string,
    onToken: (text: string) => void,
  ): Promise<string> {
    const client = this.getClient();
    const model = client.getGenerativeModel({ model: this.modelName });
    const result = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    let fullText = "";
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullText += text;
        onToken(text);
      }
    }
    return fullText;
  }

  async chatStream(
    messages: ChatMessage[],
    onChunk: (text: string) => void,
    images?: string[],
    systemInstruction?: string,
    tools?: any[],
    abortSignal?: AbortSignal,
  ): Promise<LLMResponse> {
    const client = this.getClient();

    const model = client.getGenerativeModel({
      model: this.modelName,
      systemInstruction: toGeminiSystemInstruction(systemInstruction),
      tools: toGeminiTools(tools) as any,
    });

    const stream = await model.generateContentStream({
      contents: toGeminiContents(messages, { images }) as any,
      generationConfig: {
        temperature: 0.7,
      },
    });

    let fullText = "";
    let thought = "";
    let thought_signature = "";
    const toolCalls: ToolCall[] = [];

    for await (const chunk of stream.stream) {
      if (abortSignal?.aborted) break;

      // 1. Extract Thoughts
      const thoughts = extractGeminiThought(chunk);
      if (thoughts.thought) thought += thoughts.thought;
      if (thoughts.thought_signature) {
        thought_signature = thoughts.thought_signature;
      }

      // 2. Extract Function Calls
      const calls = normalizeGeminiToolCalls(chunk.functionCalls());
      if (calls) toolCalls.push(...calls);

      // 3. Extract Text
      try {
        const text = chunk.text();
        if (text) {
          fullText += text;
          onChunk(text);
        }
      } catch {
        // Ignore empty text chunks (common if only thought/tools)
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
    const client = this.getClient();

    const model = client.getGenerativeModel({
      model: this.modelName,
      systemInstruction: toGeminiSystemInstruction(systemInstruction),
      tools: toGeminiTools(tools) as any,
    });

    // Stateless call - clearer and often more robust
    const result = await model.generateContent({
      contents: toGeminiContents(messages, { images }) as any,
      generationConfig: {
        temperature: 0.7,
      },
    });

    // Text and function calls stay SDK-native: this SDK's helpers surface safety
    // blocks that a raw scan of `parts` would swallow.
    const response = result.response;
    const text = response.text() || "";
    const toolCalls = normalizeGeminiToolCalls(response.functionCalls());
    const { thought, thought_signature } = extractGeminiThought(response);

    return { text, toolCalls, thought, thought_signature };
  }

  async embed(text: string): Promise<number[]> {
    const client = this.getClient();
    try {
      const model = client.getGenerativeModel({ model: "gemini-embedding-001" });
      const result = await model.embedContent(text);
      return result.embedding?.values || [];
    } catch (e) {
      console.error("[GeminiAdapter] Embedding failed:", e);
      return [];
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const client = this.getClient();
    try {
      const requests = texts.map((text) => ({
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_DOCUMENT",
      }));
      // Some versions of the GenAI SDK expect the object with requests directly on the client.models
      // While others expect them on the specific model object. We use the most robust approach.
      const result = await (client as any).getGenerativeModel({ model: "gemini-embedding-001" }).batchEmbedContents({
        requests,
      });
      return (result.embeddings || []).map((e: any) => e.values || []);
    } catch (e) {
      console.error("[GeminiAdapter] Batch embedding failed:", e);
      return [];
    }
  }
  
  async validateKey(): Promise<{ valid: boolean; message: string; details?: any }> {
    const client = this.getClient();
    try {
      const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
        generationConfig: { maxOutputTokens: 1 },
      });
      
      if (result.response.text()) {
        return { valid: true, message: "Gemini API key is valid." };
      }
      return { valid: false, message: "Gemini API returned an empty response." };
    } catch (e: any) {
      console.error("[GeminiAdapter] Validation failed:", e);
      return { 
        valid: false, 
        message: e.message || "Failed to validate Gemini API key.",
        details: e 
      };
    }
  }
}
