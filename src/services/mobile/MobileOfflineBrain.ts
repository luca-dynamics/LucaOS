/**
 * Mobile Offline Brain Service
 * Wraps MediaPipe LLM Inference for on-device AI on Android/iOS.
 *
 * Model: Gemma 2B (Quantized TFLite/GGUF)
 * Size: ~1.3GB download
 *
 * Usage:
 *   const brain = MobileOfflineBrain.getInstance();
 *   await brain.initialize(); // Downloads model if needed
 *   const response = await brain.generate("Hello!");
 */

import { LLMProvider, ChatMessage, LLMResponse } from "../llm/LLMProvider";

// MediaPipe LLM Inference types (Using real types from the package)
import { FilesetResolver, LlmInference } from "@mediapipe/tasks-genai";

// Model configuration
const MODEL_CONFIG = {
  // Gemma 2B IT converted for MediaPipe (from verified Hugging Face source)
  // Source: https://huggingface.co/xianbao/mediapipe-gemma-2b-it
  modelUrl:
    "https://huggingface.co/xianbao/mediapipe-gemma-2b-it/resolve/main/gemma-2b-it-gpu-int4.bin",
  modelName: "gemma-2b-it-int4",
  modelSize: 1_400_000_000, // ~1.4GB
  cacheKey: "luca_mobile_brain_gemma2b",
};

// Download progress callback type
type ProgressCallback = (downloaded: number, total: number) => void;

class MobileOfflineBrainService implements LLMProvider {
  public name = "Mobile Gemma 2B";
  private static instance: MobileOfflineBrainService;
  private llmInference: LlmInference | null = null;
  private isInitialized = false;
  private isDownloading = false;

  private constructor() {}

  static getInstance(): MobileOfflineBrainService {
    if (!MobileOfflineBrainService.instance) {
      MobileOfflineBrainService.instance = new MobileOfflineBrainService();
    }
    return MobileOfflineBrainService.instance;
  }

  /**
   * Check if model is already downloaded
   */
  async isModelAvailable(): Promise<boolean> {
    try {
      // Check IndexedDB / Cache API for stored model
      if (typeof caches !== "undefined") {
        const cache = await caches.open(MODEL_CONFIG.cacheKey);
        const response = await cache.match(MODEL_CONFIG.modelUrl);
        return response !== undefined;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get current model size (for UI display)
   */
  getModelSize(): { bytes: number; formatted: string } {
    const bytes = MODEL_CONFIG.modelSize;
    const gb = (bytes / (1024 * 1024 * 1024)).toFixed(1);
    return { bytes, formatted: `${gb} GB` };
  }

  /**
   * Download the model with progress reporting
   */
  async downloadModel(onProgress?: ProgressCallback): Promise<boolean> {
    if (this.isDownloading) {
      console.warn("[MobileOfflineBrain] Download already in progress");
      return false;
    }

    this.isDownloading = true;

    try {
      console.log("[MobileOfflineBrain] Starting model download...");

      const response = await fetch(MODEL_CONFIG.modelUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const contentLength = parseInt(
        response.headers.get("content-length") || "0"
      );
      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error("Cannot read response body");
      }

      const chunks: Uint8Array[] = [];
      let downloaded = 0;

      let reading = true;
      while (reading) {
        const { done, value } = await reader.read();
        if (done) {
          reading = false;
          break;
        }

        chunks.push(value);
        downloaded += value.length;

        if (onProgress) {
          onProgress(downloaded, contentLength || MODEL_CONFIG.modelSize);
        }
      }

      // Combine chunks and store in Cache API
      const blob = new Blob(chunks as any[]);
      const cache = await caches.open(MODEL_CONFIG.cacheKey);
      await cache.put(MODEL_CONFIG.modelUrl, new Response(blob));

      console.log(
        "[MobileOfflineBrain] Model downloaded and cached successfully"
      );
      return true;
    } catch (error) {
      console.error("[MobileOfflineBrain] Download failed:", error);
      return false;
    } finally {
      this.isDownloading = false;
    }
  }

  /**
   * Delete the cached model to free storage
   */
  async deleteModel(): Promise<boolean> {
    try {
      if (typeof caches !== "undefined") {
        await caches.delete(MODEL_CONFIG.cacheKey);
        this.llmInference = null;
        this.isInitialized = false;
        console.log("[MobileOfflineBrain] Model cache cleared");
        return true;
      }
      return false;
    } catch (error) {
      console.error("[MobileOfflineBrain] Failed to delete model:", error);
      return false;
    }
  }

  /**
   * Initialize the LLM inference engine
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized && this.llmInference) {
      return true;
    }

    try {
      // Check if model is available
      const available = await this.isModelAvailable();
      if (!available) {
        console.warn(
          "[MobileOfflineBrain] Model not downloaded. Call downloadModel() first."
        );
        return false;
      }

      console.log("[MobileOfflineBrain] Initializing MediaPipe GenAI tasks...");

      // 1. Resolve WASM assets
      const genaiFileset = await FilesetResolver.forGenAiTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm"
      );

      // 2. Retrieve model from Cache API
      const cache = await caches.open(MODEL_CONFIG.cacheKey);
      const cachedResponse = await cache.match(MODEL_CONFIG.modelUrl);

      if (!cachedResponse) {
        throw new Error("Model file missing from cache during initialization");
      }

      // Convert blob to Uint8Array for MediaPipe
      const modelBuffer = await cachedResponse.arrayBuffer();

      // 3. Create the real inference engine
      this.llmInference = await LlmInference.createFromOptions(genaiFileset, {
        baseOptions: {
          modelAssetBuffer: new Uint8Array(modelBuffer),
        },
        maxTokens: 2048,
        topK: 40,
        temperature: 0.7,
        randomSeed: Math.floor(Math.random() * 1000),
      });

      this.isInitialized = true;
      console.log("[MobileOfflineBrain] Real MediaPipe engine initialized successfully");
      return true;
    } catch (error) {
      console.error("[MobileOfflineBrain] Initialization failed:", error);
      this.isInitialized = false;
      this.llmInference = null;
      return false;
    }
  }

  /**
   * Check if brain is ready for inference
   */
  isReady(): boolean {
    return this.isInitialized && this.llmInference !== null;
  }

  // --- LLMProvider Interface Implementation ---

  async generateContent(prompt: string, images?: string[]): Promise<string> {
    if (!this.isReady()) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error("Failed to initialize Mobile Offline Brain.");
      }
    }

    // Current Gemma 2B is text-only
    if (images && images.length > 0) {
      console.warn("[MobileOfflineBrain] Images not supported in offline mode");
    }

    return this.llmInference!.generateResponse(prompt);
  }

  async streamContent(
    prompt: string,
    onToken: (text: string) => void
  ): Promise<string> {
    if (!this.isReady()) {
      await this.initialize();
    }

    let fullText = "";
    // Note: In MediaPipe 0.10.x, generateResponse(prompt, callback) is the streaming version.
    // If your specific version only has generateResponse(prompt), we fallback to the non-streaming one.
    if ((this.llmInference as any).generateResponse.length > 1) {
      await (this.llmInference as any).generateResponse(prompt, (partial: string) => {
        fullText = partial;
        onToken(partial);
      });
    } else {
      fullText = await this.llmInference!.generateResponse(prompt);
      onToken(fullText);
    }

    return fullText;
  }

  async chat(
    messages: ChatMessage[],
    images?: string[],
    systemInstruction?: string,
    tools?: any[]
  ): Promise<LLMResponse> {
    if (!this.isReady()) {
      const success = await this.initialize();
      if (!success) {
        return {
          text: "Mobile Offline Brain is not ready. Please go to Settings to download the model (~1.4GB).",
        };
      }
    }

    // Build prompt from messages using Gemma chat template
    // Reference: https://ai.google.dev/gemma/docs/model_card#instruction_tuned_it_models
    let prompt = "";

    if (systemInstruction) {
      prompt += `<start_of_turn>user\nInstruction: ${systemInstruction}<end_of_turn>\n`;
    }

    for (const msg of messages) {
      // Map roles correctly for Gemma: user/model are natively supported.
      // Use 'user' for system/tool if necessary.
      const role = msg.role === "model" ? "model" : "user";
      prompt += `<start_of_turn>${role}\n${msg.content}<end_of_turn>\n`;
    }

    // Append tool instructions
    if (tools && tools.length > 0) {
      const toolNames = tools.map((t: any) => t.name).join(", ");
      prompt += `\n<start_of_turn>user\nYou have access to these tools: ${toolNames}. If you need to use one, respond with format: {"tool": "name", "args": {}}<end_of_turn>\n`;
    }

    prompt += `<start_of_turn>model\n`;

    try {
      const response = await this.llmInference!.generateResponse(prompt);

      // Simple tool call detection
      const toolCalls: any[] = [];
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch && jsonMatch[0].includes('"tool"')) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.tool) {
            toolCalls.push({
              id: "offline_" + Date.now(),
              name: parsed.tool,
              args: parsed.args || parsed.arguments || {},
            });
          }
        }
      } catch {
        // Not a tool call
      }

      return {
        text: toolCalls.length > 0 ? "" : response.trim(),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (error: any) {
      console.error("[MobileOfflineBrain] Inference error:", error);
      return {
        text: `The Offline Brain encountered an error: ${error.message}`,
      };
    }
  }

  async chatStream(
    messages: ChatMessage[],
    onChunk: (text: string) => void,
    images?: string[],
    systemInstruction?: string,
    tools?: any[],
    _abortSignal?: AbortSignal,
  ): Promise<LLMResponse> {
    void _abortSignal;
    const response = await this.chat(messages, images, systemInstruction, tools);
    onChunk(response.text);
    return response;
  }

  async validateKey(): Promise<{ valid: boolean; message: string; details?: any }> {
    return { valid: true, message: "On-device model does not require auth" };
  }
}

// Export singleton instance
export const mobileOfflineBrain = MobileOfflineBrainService.getInstance();
export { MobileOfflineBrainService };
