import { LLMProvider, LLMResponse, ToolCall, ChatMessage } from "./LLMProvider";
import { getApiKey, SYSTEM_API_KEY } from "../genAIClient";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BRAIN_CONFIG } from "../../config/brain.config";

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

    // Map history to Google GenAI format (V1 Beta)
    const contents: any[] = [];
    let currentGroup: any = null;

    messages.forEach((msg, index) => {
      const isLast = index === messages.length - 1;

      if (msg.role === "tool") {
        const part = {
          functionResponse: {
            name: msg.name || "unknown",
            response: { result: msg.content },
          },
        };

        if (currentGroup && currentGroup.role === "function") {
          currentGroup.parts.push(part);
        } else {
          currentGroup = { role: "function", parts: [part] };
          contents.push(currentGroup);
        }
      } else if (msg.role === "model") {
        const parts: any[] = [];
        if (msg.thought) parts.push({ thought: msg.thought });
        if (msg.thought_signature)
          parts.push({ thought_signature: msg.thought_signature });
        if (msg.content) parts.push({ text: msg.content });
        if (msg.toolCalls) {
          msg.toolCalls.forEach((tc) => {
            parts.push({
              functionCall: {
                name: tc.name,
                args: tc.args,
              },
            });
          });
        }
        if (parts.length === 0) parts.push({ text: "" });
        currentGroup = { role: "model", parts };
        contents.push(currentGroup);
      } else {
        const parts: any[] = [{ text: msg.content || "" }];
        if (isLast && images && images.length > 0) {
          parts.push(
            ...images.map((img) => ({
              inlineData: { data: img, mimeType: "image/jpeg" },
            })),
          );
        }
        currentGroup = { role: "user", parts };
        contents.push(currentGroup);
      }
    });

    const model = client.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemInstruction ? { role: "system", parts: [{ text: systemInstruction }] } : undefined,
      tools:
        tools && tools.length > 0
          ? [{ functionDeclarations: tools }]
          : undefined,
    });

    const stream = await model.generateContentStream({
      contents: contents,
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
      if (chunk.candidates?.[0]?.content?.parts) {
        for (const part of chunk.candidates[0].content.parts) {
          if ("thought" in part && (part as any).thought) {
            thought += (part as any).thought;
          }
          if ("thought_signature" in part || "thoughtSignature" in part) {
            thought_signature =
              (part as any).thought_signature || (part as any).thoughtSignature;
          }
        }
      }

      // 2. Extract Function Calls
      const calls = chunk.functionCalls();
      if (calls && calls.length > 0) {
        toolCalls.push(
          ...calls.map((c: any) => ({ name: c.name, args: c.args })),
        );
      }

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

    // Map history to Google GenAI format (V1 Beta)
    // CRITICAL: Group consecutive role: 'tool' messages into a single function role message
    // to comply with Gemini's strictly alternating role requirements.
    const contents: any[] = [];
    let currentGroup: any = null;

    messages.forEach((msg, index) => {
      const isLast = index === messages.length - 1;

      if (msg.role === "tool") {
        const part = {
          functionResponse: {
            name: msg.name || "unknown",
            response: { result: msg.content },
          },
        };

        if (currentGroup && currentGroup.role === "function") {
          currentGroup.parts.push(part);
        } else {
          currentGroup = { role: "function", parts: [part] };
          contents.push(currentGroup);
        }
      } else if (msg.role === "model") {
        const parts: any[] = [];
        // Support BOTH property names for transition period
        if (msg.thought) {
          parts.push({ thought: msg.thought });
        }
        if ((msg as any).thought_signature) {
          parts.push({ thought_signature: (msg as any).thought_signature });
        }
        if (msg.content) parts.push({ text: msg.content });
        if (msg.toolCalls) {
          msg.toolCalls.forEach((tc) => {
            parts.push({
              functionCall: {
                name: tc.name,
                args: tc.args,
              },
            });
          });
        }
        // Safeguard: Ensure parts is never empty (causes API error)
        if (parts.length === 0) {
          parts.push({ text: "" });
        }
        currentGroup = { role: "model", parts };
        contents.push(currentGroup);
      } else {
        // user or system message
        const parts: any[] = [{ text: msg.content || "" }];

        // Append images to LAST user message
        if (isLast && images && images.length > 0) {
          parts.push(
            ...images.map((img) => ({
              inlineData: {
                data: img,
                mimeType: "image/jpeg",
              },
            })),
          );
        }

        currentGroup = {
          role: "user",
          parts,
        };
        contents.push(currentGroup);
      }
    });

    const model = client.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemInstruction ? { role: "system", parts: [{ text: systemInstruction }] } : undefined,
      tools:
        tools && tools.length > 0
          ? [{ functionDeclarations: tools }]
          : undefined,
    });

    // Stateless call - clearer and often more robust
    const result = await model.generateContent({
      contents: contents,
      generationConfig: {
        temperature: 0.7,
      },
    });
    const response = result.response;
    const text = response.text() || "";

    // Handle function calls
    const calls = response.functionCalls();

    let thought: string | undefined;
    let thought_signature: string | undefined;

    // Extract thoughts and signatures from parts
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if ("thought" in part && (part as any).thought) {
          thought = (part as any).thought;
        }
        if ("thought_signature" in part || "thoughtSignature" in part) {
          thought_signature = (part as any).thought_signature || (part as any).thoughtSignature;
        }
      }
    }

    let toolCalls: ToolCall[] | undefined;
    if (calls && calls.length > 0) {
      toolCalls = calls.map((c: any) => ({
        name: c.name,
        args: c.args,
      }));
    }

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
