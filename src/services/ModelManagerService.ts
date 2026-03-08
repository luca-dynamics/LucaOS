/**
 * Model Manager Service
 * Unified management of all local AI models (Desktop).
 *
 * Models:
 * - Gemma 2B (Chat Brain)
 * - SmolVLM-500M (Astra Scan)
 * - UI-TARS 2B (Agentic Click)
 * - Piper Amy (TTS)
 */

import { CORTEX_URL } from "../config/api";

export interface LocalModel {
  id: string;
  name: string;
  description: string;
  size: number; // bytes
  sizeFormatted: string;
  category: "brain" | "vision" | "tts" | "agent" | "stt" | "embedding";
  status: "not_downloaded" | "downloading" | "ready" | "error" | "unsupported";
  downloadProgress?: number; // 0-100
  platforms: ("desktop" | "mobile")[]; // Which platforms support this model
  memoryRequirement?: number; // Minimum RAM in bytes
  performanceRank?: number; // 0-10 (10 = highest accuracy/heavy, 1 = fastest/light)
  unsupportedReason?: string; // Why the model is unsupported on this platform
  canary?: {
    passed: boolean;
    response: string;
    latency_ms: number;
    timestamp: number;
    error?: string;
  };
}

// Model definitions
const MODEL_DEFINITIONS: Omit<LocalModel, "status" | "downloadProgress">[] = [
  // ===== BRAIN MODELS (Chat & Reasoning) =====
  {
    id: "gemma-2b",
    name: "Gemma 2B",
    description:
      "Google's local chat brain for offline conversations and tool calling.",
    size: 2_200_000_000,
    sizeFormatted: "2.1 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 6,
    memoryRequirement: 4_000_000_000,
  },
  {
    id: "phi-3-mini",
    name: "Phi-3 Mini 3.8B",
    description:
      "Microsoft's reasoning powerhouse. High performance, zero-gate access.",
    size: 2_300_000_000,
    sizeFormatted: "2.3 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 8,
    memoryRequirement: 8_000_000_000,
  },
  {
    id: "llama-3.2-1b",
    name: "Llama 3.2 1B",
    description:
      "Meta's efficient small model. Ungated community GGUF version.",
    size: 1_000_000_000,
    sizeFormatted: "1.0 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 5,
    memoryRequirement: 2_000_000_000,
  },
  {
    id: "smollm2-1.7b",
    name: "SmolLM2 1.7B",
    description:
      "HuggingFace's tiny but mighty model. Ultra-fast on any device.",
    size: 1_200_000_000,
    sizeFormatted: "1.2 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 4,
    memoryRequirement: 2_000_000_000,
  },
  {
    id: "qwen-2.5-7b",
    name: "Qwen 2.5 7B",
    description:
      "Alibaba's SOTA coding & reasoning model. Best general-purpose 7B.",
    size: 4_700_000_000,
    sizeFormatted: "4.7 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 9,
    memoryRequirement: 12_000_000_000,
  },
  {
    id: "deepseek-r1-distill-7b",
    name: "DeepSeek R1 Distill 7B",
    description:
      "DeepSeek's distilled reasoning model. Exceptional logic & math.",
    size: 4_900_000_000,
    sizeFormatted: "4.9 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 10,
    memoryRequirement: 16_000_000_000,
  },

  // ===== VISION MODELS =====
  {
    id: "smolvlm-500m",
    name: "SmolVLM 500M",
    description:
      "Ultra-fast vision model for Astra Scan and quick image analysis.",
    size: 500_000_000,
    sizeFormatted: "500 MB",
    category: "vision",
    platforms: ["desktop"], // Desktop only - requires screen capture
    performanceRank: 5,
    memoryRequirement: 2_000_000_000,
  },

  // ===== AGENT MODELS =====
  {
    id: "ui-tars-2b",
    name: "UI-TARS 2B",
    description:
      "Vision-language model for intelligent UI clicking and automation.",
    size: 2_000_000_000,
    sizeFormatted: "2.0 GB",
    category: "vision",
    platforms: ["desktop"], // Desktop only - requires mouse control
    performanceRank: 8,
    memoryRequirement: 8_000_000_000,
  },

  // ===== TTS MODELS =====
  {
    id: "piper-amy",
    name: "Piper Amy",
    description: "Luca TTS voice for offline speech synthesis.",
    size: 60_000_000,
    sizeFormatted: "60 MB",
    category: "tts",
    platforms: ["desktop", "mobile"],
    performanceRank: 1, // Ultra-fast
    memoryRequirement: 256_000_000,
  },
  {
    id: "supertonic-2",
    name: "Supertonic-2",
    description: "Ultra-fast multilingual TTS. 167x real-time on M4 Pro.",
    size: 200_000_000,
    sizeFormatted: "200 MB",
    category: "tts",
    platforms: ["desktop", "mobile"],
    performanceRank: 3,
    memoryRequirement: 512_000_000,
  },
  {
    id: "kokoro-82m",
    name: "Kokoro-82M",
    description: "#1 ranked TTS model. 10 voices, premium quality.",
    size: 100_000_000,
    sizeFormatted: "100 MB",
    category: "tts",
    platforms: ["desktop", "mobile"],
    performanceRank: 8, // High Quality
    memoryRequirement: 512_000_000,
  },
  {
    id: "pocket-tts",
    name: "Pocket TTS",
    description: "Voice cloning from 5sec audio. 6x real-time on M4 CPU.",
    size: 150_000_000,
    sizeFormatted: "150 MB",
    category: "tts",
    platforms: ["desktop", "mobile"],
    performanceRank: 5,
    memoryRequirement: 1_000_000_000,
  },

  // ===== LISTENING MODELS (STT / EARS) =====
  {
    id: "whisper-tiny",
    name: "Whisper Tiny (Reliable)",
    description:
      "Solid and reliable offline speech recognition. Good for general use.",
    size: 190_000_000,
    sizeFormatted: "190 MB",
    category: "stt",
    platforms: ["desktop", "mobile"],
    performanceRank: 4,
    memoryRequirement: 512_000_000,
  },
  {
    id: "moonshine-tiny",
    name: "Real Moonshine (Extreme Speed)",
    description:
      "Next-gen architecture. 5-15x faster than Whisper for short commands.",
    size: 190_000_000,
    sizeFormatted: "190 MB",
    category: "stt",
    platforms: ["desktop", "mobile"],
    performanceRank: 2,
    memoryRequirement: 256_000_000,
  },
  {
    id: "sensevoice-small",
    name: "SenseVoice (Emotion Aware)",
    description:
      "Detects Happy/Sad/Angry tones and events like (Laughter). Very fast.",
    size: 500_000_000,
    sizeFormatted: "500 MB",
    category: "stt",
    platforms: ["desktop", "mobile"],
    performanceRank: 3,
    memoryRequirement: 1_000_000_000,
  },
  {
    id: "distil-whisper-medium-en",
    name: "Distil-Whisper",
    description: "6x faster than Whisper. The standard for Desktop.",
    size: 790_000_000,
    sizeFormatted: "790 MB",
    category: "stt",
    platforms: ["desktop", "mobile"],
    performanceRank: 6,
    memoryRequirement: 2_000_000_000,
  },
  {
    id: "whisper-v3-turbo",
    name: "Whisper v3 Turbo",
    description: "Maximum accuracy. Pruned version of Large-v3.",
    size: 3_020_000_000,
    sizeFormatted: "3.0 GB",
    category: "stt",
    platforms: ["desktop"],
    performanceRank: 10,
    memoryRequirement: 6_000_000_000,
  },

  // ===== EMBEDDING MODELS (Memory) =====
  {
    id: "model2vec-potion",
    name: "Model2Vec Potion",
    description: "Ultra-tiny embeddings. 500x faster, ideal for mobile.",
    size: 5_000_000,
    sizeFormatted: "5 MB",
    category: "embedding",
    platforms: ["desktop", "mobile"],
    performanceRank: 2,
    memoryRequirement: 500_000_000,
  },
  {
    id: "mxbai-embed-xsmall",
    name: "MixedBread XSmall",
    description: "Best balance of size and accuracy for local memory.",
    size: 90_000_000,
    sizeFormatted: "90 MB",
    category: "embedding",
    platforms: ["desktop", "mobile"],
    performanceRank: 6,
    memoryRequirement: 1_000_000_000,
  },
  {
    id: "bge-small-en",
    name: "BGE Small English",
    description: "Highest accuracy small embedding. MTEB 62.17.",
    size: 130_000_000,
    sizeFormatted: "130 MB",
    category: "embedding",
    platforms: ["desktop", "mobile"],
    performanceRank: 7,
    memoryRequirement: 1_000_000_000,
  },
  {
    id: "mxbai-embed-large",
    name: "MixedBread Large",
    description: "SOTA Large embeddings from MixedBread. 100+ languages.",
    size: 600_000_000,
    sizeFormatted: "600 MB",
    category: "embedding",
    platforms: ["desktop"],
    performanceRank: 9,
    memoryRequirement: 4_000_000_000,
  },
  {
    id: "nomic-embed-text",
    name: "Nomic Embed Text",
    description: "Popular open-source embeddings with great quality.",
    size: 270_000_000,
    sizeFormatted: "270 MB",
    category: "embedding",
    platforms: ["desktop"],
    performanceRank: 8,
    memoryRequirement: 2_000_000_000,
  },
];

// ============================================================
// DERIVED CONSTANTS - Single Source of Truth for Routing
// ============================================================
// These are auto-derived from MODEL_DEFINITIONS above.
// ProviderFactory, VisionManager, and other services import these
// instead of maintaining their own hardcoded lists.

/** All local brain/chat model IDs */
export const LOCAL_BRAIN_MODEL_IDS = MODEL_DEFINITIONS.filter(
  (m) => m.category === "brain",
).map((m) => m.id);

/** All local vision model IDs */
export const LOCAL_VISION_MODEL_IDS = MODEL_DEFINITIONS.filter(
  (m) => m.category === "vision",
).map((m) => m.id);

/** All local TTS model IDs */
export const LOCAL_TTS_MODEL_IDS = MODEL_DEFINITIONS.filter(
  (m) => m.category === "tts",
).map((m) => m.id);

/** All local STT/Ears model IDs */
export const LOCAL_STT_MODEL_IDS = MODEL_DEFINITIONS.filter(
  (m) => m.category === "stt",
).map((m) => m.id);

/** All local embedding/memory model IDs */
export const LOCAL_EMBEDDING_MODEL_IDS = MODEL_DEFINITIONS.filter(
  (m) => m.category === "embedding",
).map((m) => m.id);

/** Check if a model ID is a known local model */
export function isLocalModelId(modelId: string): boolean {
  return MODEL_DEFINITIONS.some((m) => m.id === modelId);
}

/** Check if a model ID is a local model of a specific category */
export function isLocalModelOfCategory(
  modelId: string,
  category: LocalModel["category"],
): boolean {
  return MODEL_DEFINITIONS.some(
    (m) => m.id === modelId && m.category === category,
  );
}

class ModelManagerService {
  private _cortexBaseUrl: string = CORTEX_URL;
  private _isConfigured: boolean = false;
  private models: Map<string, LocalModel> = new Map();
  private listeners: Set<(models: LocalModel[]) => void> = new Set();

  constructor() {
    // Initialize models with unknown status
    MODEL_DEFINITIONS.forEach((def) => {
      this.models.set(def.id, { ...def, status: "not_downloaded" });
    });
  }

  /**
   * Get the current Cortex URL, discovering the port if in Electron
   */
  private async getCortexUrl(): Promise<string> {
    if (
      !this._isConfigured &&
      typeof window !== "undefined" &&
      (window as any).electron
    ) {
      try {
        const config = await (window as any).electron.ipcRenderer.invoke(
          "get-cortex-config",
        );
        if (config && config.port) {
          this._cortexBaseUrl = `http://127.0.0.1:${config.port}`;
          console.log(
            `[ModelManager] Configured Cortex URL: ${this._cortexBaseUrl}`,
          );
        }
        this._isConfigured = true;
      } catch (e) {
        console.warn(
          "[ModelManager] Failed to get Cortex config, using default:",
          e,
        );
      }
    }
    return this._cortexBaseUrl;
  }

  /**
   * Construct a full URL for a Cortex endpoint
   */
  private async getUrl(path: string): Promise<string> {
    const baseUrl = await this.getCortexUrl();
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  }

  /**
   * Get all models with their current status
   */
  async getModels(): Promise<LocalModel[]> {
    await this.refreshStatus();
    return Array.from(this.models.values());
  }

  /**
   * Get a specific model's synchronous state without forcing a network refresh
   */
  getModel(id: string): LocalModel | undefined {
    return this.models.get(id);
  }

  /**
   * Get models filtered by platform (desktop or mobile)
   */
  async getModelsForPlatform(
    platform: "desktop" | "mobile",
  ): Promise<LocalModel[]> {
    await this.refreshStatus();
    return Array.from(this.models.values()).filter((model) =>
      model.platforms.includes(platform),
    );
  }

  /**
   * Detect current platform
   */
  static getCurrentPlatform(): "desktop" | "mobile" {
    // Check for Capacitor (mobile)
    if (
      typeof window !== "undefined" &&
      (window as any).Capacitor?.isNativePlatform?.()
    ) {
      return "mobile";
    }
    // Check for mobile user agent as fallback
    if (
      typeof navigator !== "undefined" &&
      /Mobi|Android/i.test(navigator.userAgent)
    ) {
      return "mobile";
    }
    return "desktop";
  }

  /**
   * Check which models are downloaded by querying Cortex
   */
  async refreshStatus(): Promise<void> {
    try {
      const url = await this.getUrl("/models/status");
      const response = await fetch(url);
      if (!response.ok) {
        console.warn("[ModelManager] Failed to fetch model status");
        return;
      }

      const data = await response.json();

      // Update each model's status
      for (const [modelId, status] of Object.entries(data.models || {})) {
        const model = this.models.get(modelId);
        if (model) {
          // Don't overwrite state if we are currently downloading this model in this session
          if (model.status === "downloading") continue;

          const modelStatus = status as {
            downloaded: boolean;
            supported: boolean;
            unsupported_reason?: string;
            canary?: {
              passed: boolean;
              response: string;
              latency_ms: number;
              timestamp: number;
              error?: string;
            };
          };

          // Check if model is supported on this platform
          if (modelStatus.supported === false) {
            model.status = "unsupported";
            model.unsupportedReason =
              modelStatus.unsupported_reason ||
              "Not supported on this platform";
          } else {
            // --- COMPREHENSIVE COMPATIBILITY CHECKS ---
            const luca = (window as any).luca || {};
            const isIntelMac = luca.isIntelMac;
            const isWindows = luca.isWindows;
            const arch = luca.arch;
            const currentPlatform = ModelManagerService.getCurrentPlatform();

            const HEAVY_MODELS = [
              "qwen-2.5-7b",
              "deepseek-r1-distill-7b",
              "whisper-v3-turbo",
            ];

            // 0. SOURCE DEFINITION: Check if model explicitly supports this platform
            if (!model.platforms.includes(currentPlatform)) {
              model.status = "unsupported";
              model.unsupportedReason = `Not designed for ${currentPlatform}`;
            }
            // 1. INTEL MAC: Restrict 7B+ for downloads only (already downloaded is allowed but slow)
            else if (
              isIntelMac &&
              HEAVY_MODELS.includes(model.id) &&
              !modelStatus.downloaded
            ) {
              model.status = "unsupported";
              model.unsupportedReason = "Requires Apple Silicon (M1/M2/M3)";
            }
            // 2. WINDOWS ARM: Block until binaries are verified
            else if (isWindows && arch === "arm64") {
              model.status = "unsupported";
              model.unsupportedReason = "Windows on ARM not supported yet";
            }
            // 3. MOBILE: Block > 2.5GB (RAM Safety)
            else if (
              currentPlatform === "mobile" &&
              model.size > 2_500_000_000
            ) {
              model.status = "unsupported";
              model.unsupportedReason = "Too large for mobile device";
            } else {
              model.status = modelStatus.downloaded
                ? "ready"
                : "not_downloaded";
              model.unsupportedReason = undefined;
            }

            // Always update canary result from cache
            model.canary = modelStatus.canary || undefined;
          }
        }
      }

      this.notifyListeners();
    } catch (error) {
      console.error("[ModelManager] Status check failed:", error);
    }
  }

  /**
   * Download a model
   */
  async downloadModel(
    modelId: string,
    onProgress?: (progress: number) => void,
  ): Promise<boolean> {
    const model = this.models.get(modelId);
    if (!model) {
      console.error(`[ModelManager] Unknown model: ${modelId}`);
      return false;
    }

    if (model.status === "unsupported") {
      console.error(
        `[ModelManager] Cannot download unsupported model: ${modelId} (${model.unsupportedReason})`,
      );
      return false;
    }

    model.status = "downloading";
    model.downloadProgress = 0;
    this.notifyListeners();

    try {
      // Use EventSource for progress updates
      const url = await this.getUrl(`/models/download/${modelId}`);
      const eventSource = new EventSource(url);

      return await new Promise<boolean>((resolve) => {
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);

          if (data.progress !== undefined) {
            model.downloadProgress = data.progress;
            onProgress?.(data.progress);
            this.notifyListeners();
          }

          if (data.status === "complete") {
            model.status = "ready";
            model.downloadProgress = 100;
            this.notifyListeners();
            eventSource.close();

            // Auto-trigger canary test (non-blocking)
            setTimeout(() => {
              console.log(
                `[ModelManager] Auto-running canary test for ${modelId}...`,
              );
              this.runCanary(modelId).then((result) => {
                if (result?.passed) {
                  console.log(
                    `[ModelManager] ✅ Canary PASSED for ${modelId}: "${result.response}" (${result.latency_ms}ms)`,
                  );
                } else {
                  console.warn(
                    `[ModelManager] ⚠️ Canary FAILED for ${modelId}: ${result?.error || "unknown"}`,
                  );
                }
              });
            }, 0);

            resolve(true);
          }

          if (data.status === "error") {
            model.status = "error";
            this.notifyListeners();
            eventSource.close();
            resolve(false);
          }
        };

        eventSource.onerror = () => {
          // Fallback: Check if download completed via status endpoint
          setTimeout(async () => {
            await this.refreshStatus();
            eventSource.close();
            resolve(model.status === "ready");
          }, 2000);
        };
      });
    } catch (error) {
      console.error(`[ModelManager] Download failed for ${modelId}:`, error);
      model.status = "error";
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Run a canary test on a downloaded model to verify it works
   */
  async runCanary(
    modelId: string,
    onResult?: (result: LocalModel["canary"]) => void,
  ): Promise<LocalModel["canary"] | null> {
    const model = this.models.get(modelId);
    if (!model || model.status !== "ready") {
      console.warn(
        `[ModelManager] Cannot canary test model: ${modelId} (status: ${model?.status})`,
      );
      return null;
    }

    try {
      const url = await this.getUrl(`/models/canary/${modelId}`);
      const response = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(90_000), // 90s timeout for large models
      });

      if (!response.ok) {
        console.error(
          `[ModelManager] Canary request failed: HTTP ${response.status}`,
        );
        return null;
      }

      const result = await response.json();
      model.canary = result;
      this.notifyListeners();
      onResult?.(result);
      return result;
    } catch (error) {
      console.error(`[ModelManager] Canary test failed for ${modelId}:`, error);
      const failResult = {
        passed: false,
        response: "",
        latency_ms: 0,
        timestamp: Date.now() / 1000,
        error: error instanceof Error ? error.message : "Canary test failed",
      };
      model.canary = failResult;
      this.notifyListeners();
      return failResult;
    }
  }

  /**
   * Delete a model to free storage
   */
  async deleteModel(modelId: string): Promise<boolean> {
    const model = this.models.get(modelId);
    if (!model) {
      return false;
    }

    try {
      const url = await this.getUrl(`/models/delete/${modelId}`);
      const response = await fetch(url, {
        method: "DELETE",
      });

      if (response.ok) {
        model.status = "not_downloaded";
        model.downloadProgress = undefined;
        this.notifyListeners();
        return true;
      }

      return false;
    } catch (error) {
      console.error(`[ModelManager] Delete failed for ${modelId}:`, error);
      return false;
    }
  }

  /**
   * Smart Routing: Get the best model for a category based on hardware specs
   */
  async getOptimalModel(
    category: LocalModel["category"],
    strategy: "performance" | "efficiency" | "accuracy" = "efficiency",
  ): Promise<LocalModel | null> {
    const models = Array.from(this.models.values()).filter(
      (m) =>
        m.category === category &&
        m.status === "ready" &&
        m.platforms.includes(ModelManagerService.getCurrentPlatform()),
    );

    // 1. Get Hardware Info
    let specs = { totalMem: 8_000_000_000, arch: "arm64", platform: "desktop" };
    const isMobile = ModelManagerService.getCurrentPlatform() === "mobile";

    if (typeof window !== "undefined") {
      if ((window as any).electron) {
        specs = await (window as any).electron.ipcRenderer.invoke(
          "get-system-specs",
        );
      } else if (isMobile) {
        // Mobile Heuristic: Assume 6GB for modern devices if real RAM is inaccessible.
        specs = { totalMem: 6_000_000_000, arch: "arm64", platform: "mobile" };
      }
    }

    const luca = (window as any).luca || {};
    const isPowerful =
      specs.totalMem > 12_000_000_000 ||
      (!luca.isIntelMac && specs.arch === "arm64" && !isMobile) ||
      (isMobile && specs.totalMem > 8_000_000_000);

    // 2. Filter by Memory Safety
    const safeModels = models.filter((m) => {
      const req = m.memoryRequirement || 0;
      // Conservative buffer: Leave 25-40% RAM free
      const safetyBuffer = isMobile ? 0.6 : 0.75;
      return req < specs.totalMem * safetyBuffer;
    });

    if (safeModels.length === 0) {
      const sortedByWeight = models.sort((a, b) => a.size - b.size);
      return sortedByWeight[0] || null;
    }

    // 3. Rank and Select
    const sorted = safeModels.sort((a, b) => {
      const rankA = a.performanceRank || 5;
      const rankB = b.performanceRank || 5;
      if (strategy === "performance" || strategy === "accuracy")
        return rankB - rankA;
      return rankA - rankB; // Efficiency
    });

    // If powerful machine, prioritize accuracy even in efficiency mode to a point
    if (isPowerful && strategy === "efficiency") {
      return sorted.find((m) => (m.performanceRank || 0) >= 5) || sorted[0];
    }

    return sorted[0];
  }

  /**
   * Get total storage used by downloaded models
   */
  getTotalStorageUsed(): { bytes: number; formatted: string } {
    let total = 0;
    this.models.forEach((model) => {
      if (model.status === "ready") {
        total += model.size;
      }
    });

    const gb = (total / (1024 * 1024 * 1024)).toFixed(1);
    return { bytes: total, formatted: `${gb} GB` };
  }

  /**
   * Check if Ollama is running and return available models
   */
  async getOllamaModels(): Promise<{
    available: boolean;
    models: { name: string; size: number }[];
    count: number;
  }> {
    try {
      const resp = await fetch("http://127.0.0.1:11434/api/tags", {
        signal: AbortSignal.timeout(3_000),
      });
      if (!resp.ok) throw new Error("Not OK");
      const data = await resp.json();
      const models = (data.models || []).map((m: any) => ({
        name: m.name as string,
        size: (m.size || 0) as number,
      }));
      return { available: true, models, count: models.length };
    } catch {
      return { available: false, models: [], count: 0 };
    }
  }

  /**
   * Check if Ollama is installed on the system
   */
  async isOllamaInstalled(): Promise<boolean> {
    if (typeof window !== "undefined" && (window as any).electron) {
      return await (window as any).electron.ipcRenderer.invoke(
        "is-ollama-installed",
      );
    }
    return false;
  }

  /**
   * Start the Ollama service
   */
  async startOllama(): Promise<boolean> {
    if (typeof window !== "undefined" && (window as any).electron) {
      return await (window as any).electron.ipcRenderer.invoke("start-ollama");
    }
    return false;
  }

  /**
   * Install Ollama on the system
   */
  async installOllama(): Promise<{ success: boolean; message?: string }> {
    if (typeof window !== "undefined" && (window as any).electron) {
      return await (window as any).electron.ipcRenderer.invoke(
        "install-ollama",
      );
    }
    return { success: false, message: "Electron environment required" };
  }

  /**
   * Subscribe to model updates
   */
  subscribe(callback: (models: LocalModel[]) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const models = Array.from(this.models.values());

    // Export ready models to global window for zero-latency routing checks (ProviderFactory)
    if (typeof window !== "undefined") {
      (window as any).luca_ready_models = models.filter(
        (m) => m.status === "ready",
      );
    }

    this.listeners.forEach((cb) => cb(models));
  }
}

// Export singleton and class
export const modelManager = new ModelManagerService();
export { ModelManagerService };
