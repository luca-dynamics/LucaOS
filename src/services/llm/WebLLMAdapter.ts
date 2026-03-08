/**
 * WebLLM Adapter
 *
 * Runtime adapter for models using MLC WebLLM (GGUF/MLC format).
 * Supports models not compatible with MediaPipe (e.g., LFM, Phi-3, Qwen).
 */

import { LLMProvider, ChatMessage, LLMResponse } from "./LLMProvider";
import { OfflineModel, modelRegistry } from "./ModelRegistry";

// WebLLM types (will be dynamically imported)
interface WebLLMEngine {
  reload: (modelId: string, config?: any) => Promise<void>;
  chat: {
    completions: {
      create: (params: {
        messages: Array<{ role: string; content: string }>;
        stream?: boolean;
        temperature?: number;
        max_tokens?: number;
      }) => Promise<any>;
    };
  };
  unload: () => Promise<void>;
}

// Note: MLC WebLLM uses OpenAI-style messages directly, no need for custom templates

/**
 * WebLLM Adapter Service
 */
class WebLLMAdapterService implements LLMProvider {
  public name = "WebLLM Local";
  private static instance: WebLLMAdapterService;
  private engine: WebLLMEngine | null = null;
  private currentModelId: string | null = null;
  private isInitializing = false;

  private constructor() {}

  static getInstance(): WebLLMAdapterService {
    if (!WebLLMAdapterService.instance) {
      WebLLMAdapterService.instance = new WebLLMAdapterService();
    }
    return WebLLMAdapterService.instance;
  }

  /**
   * Check if WebLLM is available in this environment
   */
  static isSupported(): boolean {
    // WebLLM requires WebGPU
    return typeof navigator !== "undefined" && "gpu" in navigator;
  }

  /**
   * Initialize the engine with a specific model
   */
  async initialize(model: OfflineModel): Promise<boolean> {
    if (this.isInitializing) {
      console.warn("[WebLLMAdapter] Already initializing");
      return false;
    }

    if (model.runtime !== "webllm") {
      console.error("[WebLLMAdapter] Model is not a WebLLM model:", model.id);
      return false;
    }

    this.isInitializing = true;

    try {
      console.log("[WebLLMAdapter] Loading engine for:", model.name);

      // Dynamically import WebLLM
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");

      // Create engine with model
      this.engine = (await CreateMLCEngine(model.id, {
        initProgressCallback: (progress) => {
          console.log(`[WebLLMAdapter] Init: ${progress.text}`);
          modelRegistry.updateStatus(model.id, {
            progress: Math.round(progress.progress * 100),
          });
        },
      })) as WebLLMEngine;

      this.currentModelId = model.id;
      modelRegistry.updateStatus(model.id, {
        initialized: true,
        downloading: false,
        downloaded: true,
      });

      console.log("[WebLLMAdapter] Engine loaded successfully");
      return true;
    } catch (error: any) {
      console.error("[WebLLMAdapter] Failed to initialize:", error);
      modelRegistry.updateStatus(model.id, {
        error: error.message,
        downloading: false,
      });
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Unload current model
   */
  async unload(): Promise<void> {
    if (this.engine) {
      try {
        await this.engine.unload();
      } catch (e) {
        console.warn("[WebLLMAdapter] Unload error:", e);
      }
      this.engine = null;
      this.currentModelId = null;
    }
  }

  /**
   * Check if ready for inference
   */
  isReady(): boolean {
    return this.engine !== null && this.currentModelId !== null;
  }

  /**
   * Get current model ID
   */
  getCurrentModelId(): string | null {
    return this.currentModelId;
  }

  // --- LLMProvider Interface ---

  async generateContent(prompt: string): Promise<string> {
    if (!this.isReady()) {
      throw new Error("WebLLM engine not initialized");
    }

    const response = await this.engine!.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1024,
    });

    return response.choices[0]?.message?.content || "";
  }

  async streamContent(
    prompt: string,
    onToken: (text: string) => void
  ): Promise<string> {
    // For now, use non-streaming and return full response
    const response = await this.generateContent(prompt);
    onToken(response);
    return response;
  }

  async chat(
    messages: ChatMessage[],
    _images?: string[],
    systemInstruction?: string,
    _tools?: any[]
  ): Promise<LLMResponse> {
    if (!this.isReady()) {
      return {
        text: "WebLLM engine not initialized. Please download and activate a model first.",
      };
    }

    try {
      const model = modelRegistry.getModel(this.currentModelId!);
      const template = model?.chatTemplate || "chatml";

      // Format messages for the model
      const formattedMessages = [
        ...(systemInstruction
          ? [{ role: "system", content: systemInstruction }]
          : []),
        ...messages.map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content || "",
        })),
      ];

      const response = await this.engine!.chat.completions.create({
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 2048,
      });

      const text = response.choices[0]?.message?.content || "";

      // Try to parse tool calls
      const toolCalls: any[] = [];
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch && jsonMatch[0].includes('"tool"')) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.tool && parsed.arguments) {
            toolCalls.push({
              id: "webllm_" + Date.now(),
              name: parsed.tool,
              args: parsed.arguments,
            });
          }
        }
      } catch {
        // Not a tool call
      }

      return {
        text: toolCalls.length > 0 ? "" : text,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (error: any) {
      console.error("[WebLLMAdapter] Chat error:", error);
      return {
        text: `WebLLM Error: ${error.message}`,
      };
    }
  }
}

export const webLLMAdapter = WebLLMAdapterService.getInstance();
export { WebLLMAdapterService };
