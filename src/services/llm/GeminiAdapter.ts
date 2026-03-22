import { LLMProvider, LLMResponse, ToolCall, ChatMessage } from "./LLMProvider";
import { getGenClient, setGenClient } from "../genAIClient";
import { GoogleGenAI } from "@google/genai";
import { BRAIN_CONFIG } from "../../config/brain.config.ts";

export class GeminiAdapter implements LLMProvider {
  name = "Google Gemini";
  private client?: GoogleGenAI;
  private modelName: string = BRAIN_CONFIG.defaults.brain; // Match Backend Config

  constructor(apiKey: string, modelName: string = BRAIN_CONFIG.defaults.brain) {
    this.modelName = modelName;
    // If a key is passed, we use it to initialize a fresh client.
    // Otherwise we fall back to the singleton via getGenClient() but we must type it.

    if (apiKey) {
      console.log(
        `[GeminiAdapter] Initializing with specific key (Length: ${apiKey.length})`,
      );
      this.client = new GoogleGenAI({ apiKey });
      setGenClient(this.client);
    } else {
      // Lazy Init: Do NOT set `this.client` here.
      // Let chat() call getGenClient() at runtime when settings are ready.
      console.log(
        "[GeminiAdapter] No key provided. Deferring to runtime getGenClient().",
      );
    }
  }

  updateConfig(apiKey: string, modelName: string) {
    this.modelName = modelName;
    if (apiKey) {
      try {
        const client = new GoogleGenAI({ apiKey });
        setGenClient(client);
        this.client = client;
      } catch (e) {
        console.error("Failed to update GenAI config", e);
      }
    }
  }

  async generateContent(prompt: string, images?: string[]): Promise<string> {
    const client = this.client || getGenClient(); // Fallback if undefined

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
      const result = await (client.models as any).generateContent({
        model: this.modelName,
        contents: [{ role: "user", parts }],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      });

      // SDK fallback: check both .text and .response.text()
      const text = result.text || (result.response && typeof result.response.text === 'function' ? result.response.text() : "");
      
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
    const client = this.client || getGenClient();
    const result = await client.models.generateContentStream({
      model: this.modelName,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    let fullText = "";
    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onToken(text);
      }
    }
    return fullText;
  }

  async chat(
    messages: ChatMessage[],
    images?: string[],
    systemInstruction?: string,
    tools?: any[],
  ): Promise<LLMResponse> {
    const client = this.client || getGenClient();

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

    const config: any = {
      model: this.modelName,
      contents: contents,
      generationConfig: {
        temperature: 0.7,
      },
    };

    if (systemInstruction) {
      config.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    if (tools && tools.length > 0) {
      config.tools = [{ functionDeclarations: tools }];
    }

    // Stateless call - clearer and often more robust
    const result = await client.models.generateContent(config);
    const text = result.text || "";

    // Handle function calls
    const calls = result.functionCalls;

    let thought: string | undefined;
    let thought_signature: string | undefined;

    // Extract thoughts and signatures from parts
    if (result.candidates?.[0]?.content?.parts) {
      for (const part of result.candidates[0].content.parts) {
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
    const client = this.client || getGenClient();
    try {
      // Reverting to the exact GitHub pattern confirmed by user.
      const result = await (client.models as any).embedContent({
        model: "text-embedding-004", // Force standard high-quality model
        contents: [{ parts: [{ text }] }], // NEW SDK (plural)
        taskType: "RETRIEVAL_QUERY",
      });
      return result.embedding?.values || [];
    } catch (e) {
      console.error("[GeminiAdapter] Embedding failed:", e);
      return [];
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const client = this.client || getGenClient();
    try {
      const requests = texts.map((text) => ({
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_DOCUMENT",
      }));
      // Some versions of the GenAI SDK expect the object with requests directly on the client.models
      // While others expect them on the specific model object. We use the most robust approach.
      const result = await (client as any).getGenerativeModel({ model: "text-embedding-004" }).batchEmbedContents({
        requests,
      });
      return (result.embeddings || []).map((e: any) => e.values || []);
    } catch (e) {
      console.error("[GeminiAdapter] Batch embedding failed:", e);
      return [];
    }
  }
}
