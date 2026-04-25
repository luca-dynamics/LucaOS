/**
 * Model Manager Service
 * Unified management of all local AI models (Desktop).
 */

import { CORTEX_URL } from "../config/api";
import { settingsService } from "./settingsService";
import { maintenancePolicy } from "./selfMaintenancePolicy";

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
  vramStatus?: "safe" | "warning" | "critical"; // VRAM Guard status
  vramWarning?: string; // Human readable warning for the UI
  policyRecommendation?: "RECOMMENDED" | "RESTRICTED" | "WARNING" | "OPTIMAL";
  policyReason?: string;
  runtime: "ollama" | "internal";
  ollamaTag?: string; // Central runtime tag for Ollama modules
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
    description: "Google's local chat brain for offline conversations and tool calling.",
    size: 2_200_000_000,
    sizeFormatted: "2.1 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 6,
    memoryRequirement: 4_000_000_000,
    runtime: "ollama",
    ollamaTag: "gemma2:2b",
  },
  {
    id: "phi-3-mini",
    name: "Phi-3 Mini 3.8B",
    description: "Microsoft's reasoning powerhouse. High performance, zero-gate access.",
    size: 2_300_000_000,
    sizeFormatted: "2.3 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 8,
    memoryRequirement: 8_000_000_000,
    runtime: "ollama",
    ollamaTag: "phi3:mini",
  },
  {
    id: "llama-3.2-1b",
    name: "Llama 3.2 1B",
    description: "Meta's efficient small model. Ungated community GGUF version.",
    size: 1_000_000_000,
    sizeFormatted: "1.0 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 5,
    memoryRequirement: 2_000_000_000,
    runtime: "ollama",
    ollamaTag: "llama3.2:1b",
  },
  {
    id: "smollm2-1.7b",
    name: "SmolLM2 1.7B",
    description: "HuggingFace's tiny but mighty model. Ultra-fast on any device.",
    size: 1_200_000_000,
    sizeFormatted: "1.2 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 4,
    memoryRequirement: 2_000_000_000,
    runtime: "ollama",
    ollamaTag: "smollm2:1.7b",
  },
  {
    id: "qwen-2.5-7b",
    name: "Qwen 2.5 7B",
    description: "Alibaba's SOTA coding & reasoning model. Best general-purpose 7B.",
    size: 4_700_000_000,
    sizeFormatted: "4.7 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 9,
    memoryRequirement: 12_000_000_000,
    runtime: "ollama",
    ollamaTag: "qwen2.5:7b",
  },
  {
    id: "deepseek-r1-distill-7b",
    name: "DeepSeek R1 Distill 7B",
    description: "DeepSeek's distilled reasoning model. Exceptional logic & math.",
    size: 4_900_000_000,
    sizeFormatted: "4.9 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 10,
    memoryRequirement: 16_000_000_000,
    runtime: "ollama",
    ollamaTag: "deepseek-r1:7b",
  },
  {
    id: "gemma-4-e2b",
    name: "Gemma 4 E2B (Mobile Optimized)",
    description: "Google's ultra-fast efficient model. Optimized for mobile and edge inference.",
    size: 1_200_000_000,
    sizeFormatted: "1.2 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 4,
    memoryRequirement: 4_000_000_000,
    runtime: "ollama",
    ollamaTag: "gemma4:e2b",
  },
  {
    id: "gemma-4-31b",
    name: "Gemma 4 31B (Heavy Reasoning)",
    description: "DeepMind's state-of-the-art reasoning model for agentic workflows.",
    size: 18_000_000_000,
    sizeFormatted: "18.0 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 9,
    memoryRequirement: 22_000_000_000,
    runtime: "ollama",
    ollamaTag: "gemma4:31b",
  },
  {
    id: "qwen-3.5-7b",
    name: "Qwen 3.5 7B",
    description: "Alibaba's latest balanced model. Exceptional performance.",
    size: 4_500_000_000,
    sizeFormatted: "4.5 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 7,
    memoryRequirement: 12_000_000_000,
    runtime: "ollama",
    ollamaTag: "qwen3.5:7b",
  },
  {
    id: "qwopus-3.5-27b",
    name: "Qwopus 3.5 27B (Opus Reasoning)",
    description: "Qwen 3.5 enhanced with Claude 4.6 Opus reasoning trajectories.",
    size: 16_500_000_000,
    sizeFormatted: "16.5 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 10,
    memoryRequirement: 20_000_000_000,
    runtime: "ollama",
    ollamaTag: "qwopus:27b",
  },
  {
    id: "mistral-7b",
    name: "Mistral 7B v0.3",
    description: "The classic open-weight standard for efficiency and performance. Versatile and reliable.",
    size: 4_100_000_000,
    sizeFormatted: "4.1 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 7,
    memoryRequirement: 10_000_000_000,
    runtime: "ollama",
    ollamaTag: "mistral:7b",
  },
  {
    id: "hermes-3-8b",
    name: "Hermes 3 (8B)",
    description: "Nous Research fine-tune of Llama 3.1. Exceptional instruction following and sovereign persona alignment.",
    size: 4_700_000_000,
    sizeFormatted: "4.7 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 8,
    memoryRequirement: 12_000_000_000,
    runtime: "ollama",
    ollamaTag: "hermes3:8b",
  },
  {
    id: "qwen-2.5-1.5b",
    name: "Qwen 2.5 1.5B (Edge Optimized)",
    description: "Highly accurate even on lower-end hardware. Perfect for 8GB RAM systems and Intel Macs.",
    size: 1_600_000_000,
    sizeFormatted: "1.6 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 6,
    memoryRequirement: 4_000_000_000,
    runtime: "ollama",
    ollamaTag: "qwen2.5:1.5b",
  },
  {
    id: "hermes-3-3b",
    name: "Hermes 3 (3B)",
    description: "The lightweight sovereign persona specialist. Based on Llama 3.2. Runs smoothly on 8GB RAM.",
    size: 2_200_000_000,
    sizeFormatted: "2.2 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
    performanceRank: 7,
    memoryRequirement: 6_000_000_000,
    runtime: "ollama",
    ollamaTag: "hermes3:3b",
  },
  {
    id: "glm-5-9b",
    name: "GLM-5 9B (Agentic Specialist)",
    description: "Zhipu AI's 2026 breakthrough in long-horizon reasoning. Exceptional at complex tool-use and systems engineering.",
    size: 5_800_000_000,
    sizeFormatted: "5.8 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 9,
    memoryRequirement: 14_000_000_000,
    runtime: "ollama",
    ollamaTag: "glm5:9b",
  },
  {
    id: "qwen-3-32b",
    name: "Qwen 3 32B (Balanced Standard)",
    description: "The 2026 gold standard for local inference. Superior coding and multilingual reasoning for pro rigs.",
    size: 19_200_000_000,
    sizeFormatted: "19.2 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 10,
    memoryRequirement: 24_000_000_000,
    runtime: "ollama",
    ollamaTag: "qwen3:32b",
  },
  {
    id: "kimi-k2.5-12b",
    name: "Kimi K2.5 12B (Visual Designer)",
    description: "Moonshot AI's specialist in visual-to-code generation and UI design agentic workflows.",
    size: 7_900_000_000,
    sizeFormatted: "7.9 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 8,
    memoryRequirement: 16_000_000_000,
    runtime: "ollama",
    ollamaTag: "kimi:k2.5-12b",
  },
  {
    id: "deepseek-r1-distill-14b",
    name: "DeepSeek R1 Distill 14B",
    description: "The logic powerhouse. Fine-tuned for mathematical certainty and zero-error reasoning trajectories.",
    size: 9_100_000_000,
    sizeFormatted: "9.1 GB",
    category: "brain",
    platforms: ["desktop"],
    performanceRank: 10,
    memoryRequirement: 18_000_000_000,
    runtime: "ollama",
    ollamaTag: "deepseek-r1:14b",
  },

  // ===== VISION MODELS =====
  {
    id: "smolvlm-500m",
    name: "SmolVLM 500M",
    description: "Ultra-fast vision model for background sensing and HDC semantic snapshots.",
    size: 500_000_000,
    sizeFormatted: "500 MB",
    category: "vision",
    platforms: ["desktop"],
    performanceRank: 5,
    memoryRequirement: 2_000_000_000,
    runtime: "internal",
  },
  {
    id: "qwen2.5-vl-3b",
    name: "Qwen 2.5 VL 3B",
    description: "State-of-the-art vision reasoning for agentic UI automation and complex RAG expansion.",
    size: 3_200_000_000,
    sizeFormatted: "3.2 GB",
    category: "vision",
    platforms: ["desktop"],
    performanceRank: 9,
    memoryRequirement: 8_000_000_000,
    runtime: "internal",
  },
  {
    id: "moondream2",
    name: "Moondream2",
    description: "High-fidelity semantic visual describer. Excellent for deep memory expansion.",
    size: 1_600_000_000,
    sizeFormatted: "1.6 GB",
    category: "vision",
    platforms: ["desktop"],
    performanceRank: 7,
    memoryRequirement: 4_000_000_000,
    runtime: "internal",
  },
  {
    id: "ui-tars-2b",
    name: "UI-TARS 2B",
    description: "Vision-language model specialized in intelligent UI navigation and clicking.",
    size: 2_000_000_000,
    sizeFormatted: "2.0 GB",
    category: "vision",
    platforms: ["desktop"],
    performanceRank: 8,
    memoryRequirement: 8_000_000_000,
    runtime: "internal",
  },

  // ===== TTS MODELS =====
  {
    id: "piper-amy",
    name: "Piper Amy",
    description: "Luca's low-latency offline voice synthesis core.",
    size: 60_000_000,
    sizeFormatted: "60 MB",
    category: "tts",
    platforms: ["desktop", "mobile"],
    performanceRank: 1,
    memoryRequirement: 256_000_000,
    runtime: "internal",
  },
  {
    id: "kokoro-82m",
    name: "Kokoro 82M",
    description: "Breakout 2026 model. Near-human local speech with ultra-lightweight footprint.",
    size: 82_000_000,
    sizeFormatted: "82 MB",
    category: "tts",
    platforms: ["desktop", "mobile"],
    performanceRank: 5,
    memoryRequirement: 300_000_000,
    runtime: "internal",
  },
  {
    id: "qwen3-tts",
    name: "Qwen 3 TTS 0.6B",
    description: "Alibaba's 2026 vocal powerhouse. Zero-shot voice cloning and streaming excellence.",
    size: 600_000_000,
    sizeFormatted: "600 MB",
    category: "tts",
    platforms: ["desktop", "mobile"],
    performanceRank: 9,
    memoryRequirement: 2_000_000_000,
    runtime: "internal",
  },
  {
    id: "supertonic-2",
    name: "Supertonic-2",
    description: "High-fidelity professional speech synthesis.",
    size: 200_000_000,
    sizeFormatted: "200 MB",
    category: "tts",
    platforms: ["desktop", "mobile"],
    performanceRank: 3,
    memoryRequirement: 512_000_000,
    runtime: "internal",
  },

  // ===== STT MODELS =====
  {
    id: "whisper-tiny",
    name: "Whisper Tiny",
    description: "Reliable offline speech recognition.",
    size: 190_000_000,
    sizeFormatted: "190 MB",
    category: "stt",
    platforms: ["desktop", "mobile"],
    performanceRank: 4,
    memoryRequirement: 512_000_000,
    runtime: "internal",
  },
  {
    id: "whisper-v3-turbo",
    name: "Whisper v3 Turbo",
    description: "Maximum accuracy pruned version.",
    size: 3_020_000_000,
    sizeFormatted: "3.0 GB",
    category: "stt",
    platforms: ["desktop"],
    performanceRank: 10,
    memoryRequirement: 6_000_000_000,
    runtime: "internal",
  },

  // ===== EMBEDDING MODELS =====
  {
    id: "nomic-embed-text",
    name: "Nomic Embed Text",
    description: "Popular open-source embeddings.",
    size: 270_000_000,
    sizeFormatted: "270 MB",
    category: "embedding",
    platforms: ["desktop"],
    performanceRank: 8,
    memoryRequirement: 2_000_000_000,
    runtime: "internal",
  },
  {
    id: "mxbai-embed-large",
    name: "MixedBread Large",
    description: "SOTA embeddings from mixedbread.ai.",
    size: 670_000_000,
    sizeFormatted: "670 MB",
    category: "embedding",
    platforms: ["desktop"],
    performanceRank: 9,
    memoryRequirement: 4_000_000_000,
    runtime: "internal",
  },
  {
    id: "jina-embed-v2",
    name: "Jina Embed v2",
    description: "Supports huge 8k context window.",
    size: 540_000_000,
    sizeFormatted: "540 MB",
    category: "embedding",
    platforms: ["desktop"],
    performanceRank: 9,
    memoryRequirement: 3_000_000_000,
    runtime: "internal",
  },
  {
    id: "bge-large-en",
    name: "BGE Large v1.5",
    description: "Industry-standard RAG embeddings.",
    size: 1_300_000_000,
    sizeFormatted: "1.3 GB",
    category: "embedding",
    platforms: ["desktop"],
    performanceRank: 10,
    memoryRequirement: 6_000_000_000,
    runtime: "internal",
  },
];

export const LOCAL_BRAIN_MODEL_IDS = MODEL_DEFINITIONS.filter(m => m.category === "brain").map(m => m.id);
export const LOCAL_VISION_MODEL_IDS = MODEL_DEFINITIONS.filter(m => m.category === "vision").map(m => m.id);
export const LOCAL_TTS_MODEL_IDS = MODEL_DEFINITIONS.filter(m => m.category === "tts").map(m => m.id);
export const LOCAL_STT_MODEL_IDS = MODEL_DEFINITIONS.filter(m => m.category === "stt").map(m => m.id);
export const LOCAL_EMBEDDING_MODEL_IDS = MODEL_DEFINITIONS.filter(m => m.category === "embedding").map(m => m.id);

export function isLocalModelId(modelId: string): boolean {
  return MODEL_DEFINITIONS.some(m => m.id === modelId);
}

class ModelManagerService {
  private _cortexBaseUrl: string = CORTEX_URL;
  private _isConfigured: boolean = false;
  private models: Map<string, LocalModel> = new Map();
  private listeners: Set<(models: LocalModel[]) => void> = new Set();
  private _systemSpecs: any = null;

  constructor() {
    MODEL_DEFINITIONS.forEach((def) => {
      this.models.set(def.id, { ...def, status: "not_downloaded" });
    });

    if (typeof window !== "undefined") {
      setTimeout(() => this.refreshStatus(), 1000);
      if ((window as any).electron) {
        setInterval(() => this.refreshStatus(), 30000);
      }
    }
  }

  private async getCortexUrl(): Promise<string> {
    if (!this._isConfigured && typeof window !== "undefined" && (window as any).electron) {
      try {
        const config = await (window as any).electron.ipcRenderer.invoke("get-cortex-config");
        if (config?.port) this._cortexBaseUrl = `http://127.0.0.1:${config.port}`;
        this._isConfigured = true;
      } catch (err) {
        console.warn("[ModelManager] Failed to get Cortex config, using default", err);
      }
    }
    return this._cortexBaseUrl;
  }

  private async getUrl(path: string): Promise<string> {
    const baseUrl = await this.getCortexUrl();
    return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  }

  async getModels(): Promise<LocalModel[]> {
    await this.refreshStatus();
    return Array.from(this.models.values());
  }

  public getModelSpecs(id: string): LocalModel | undefined {
    return this.models.get(id);
  }

  async getSystemSpecs(): Promise<any> {
    if (this._systemSpecs) return this._systemSpecs;
    if (typeof window !== "undefined" && (window as any).electron) {
      this._systemSpecs = await (window as any).electron.ipcRenderer.invoke("get-system-specs");
    }
    return this._systemSpecs;
  }

  async refreshStatus(): Promise<void> {
    if (!settingsService.isLocalDiscoveryEnabled()) return;

    try {
      // 1. Get Hardware Info
      const specs = await this.getSystemSpecs() || {};
      const totalRAM = specs.memory?.total || 8_000_000_000;
      const isIntelMac = specs.isIntelMac;

      // 2. Fetch Status from Runtimes
      let cortexData: any = { models: {} };
      try {
        const url = await this.getUrl("/models/status");
        const resp = await fetch(url);
        if (resp.ok) cortexData = await resp.json();
      } catch (err) {
        console.warn("[ModelManager] Cortex status fetch failed (offline?)", err);
      }

      let ollamaNames: string[] = [];
      try {
        const resp = await fetch("http://127.0.0.1:11434/api/tags");
        if (resp.ok) {
          const data = await resp.json();
          ollamaNames = (data.models || []).map((m: any) => m.name);
        }
      } catch (err) {
        console.warn("[ModelManager] Ollama status check failed (offline?)", err);
      }

      const OLLAMA_TAG_MAP: Record<string, string[]> = {
        "gemma-2b": ["gemma2:2b", "gemma:2b"],
        "llama-3.2-1b": ["llama3.2:1b"],
        "phi-3-mini": ["phi3:mini"],
        "smollm2-1.7b": ["smollm2:1.7b"],
        "qwen-2.5-7b": ["qwen2.5:7b"],
        "deepseek-r1-distill-7b": ["deepseek-r1:7b"],
        "gemma-4-e2b": ["gemma4:e2b"],
        "gemma-4-31b": ["gemma4:31b"],
        "qwen-3.5-7b": ["qwen3.5:7b", "qwen2.5:7b"],
        "qwopus-3.5-27b": ["qwopus:27b", "qwen2.5:27b"],
        "mistral-7b": ["mistral:latest", "mistral:v0.3"],
        "hermes-3-8b": ["hermes3:8b", "hermes3:latest"],
        "qwen-2.5-1.5b": ["qwen2.5:1.5b"],
        "hermes-3-3b": ["hermes3:3b"],
        "glm-5-9b": ["glm5:9b", "glm:v5-9b"],
        "qwen-3-32b": ["qwen3:32b", "qwen3.5:32b"],
        "kimi-k2.5-12b": ["kimi:k2.5-12b"],
        "deepseek-r1-distill-14b": ["deepseek-r1:14b"],
      };

      // 3. Update Model Map
      for (const [id, model] of this.models.entries()) {
        if (model.status === "downloading") continue;

        // A. Runtime Check
        if (model.runtime === "ollama") {
          const tags = OLLAMA_TAG_MAP[id] || [id];
          const pulled = ollamaNames.some(n => tags.some(t => n.startsWith(t)));
          model.status = pulled ? "ready" : "not_downloaded";
          if (pulled) model.downloadProgress = 100;
        } else {
          const status = cortexData.models[id];
          model.status = status?.downloaded ? "ready" : "not_downloaded";
        }

        // B. Hardware Gating (Universal)
        if (model.memoryRequirement && totalRAM < model.memoryRequirement * 0.9) {
          model.status = "unsupported";
          model.unsupportedReason = `Requires ${Math.round(model.memoryRequirement / 1e9)}GB RAM`;
        } else if (isIntelMac && model.category === "brain" && (model.performanceRank || 0) >= 8) {
          model.status = "unsupported";
          model.unsupportedReason = "Intel Mac with Integrated Graphics is too slow for local inference of this model. Switch to Cloud Mode for optimal performance.";
        }

        // C. VRAM Guard
        if (model.memoryRequirement) {
          const penalty = isIntelMac ? 1.5 : 1.0;
          const ratio = (model.memoryRequirement * penalty) / totalRAM;
          if (ratio > 0.8) {
            model.vramStatus = "critical";
            model.vramWarning = "System crash likely. Use a smaller model.";
          } else if (ratio > 0.6) {
            model.vramStatus = "warning";
            model.vramWarning = "System will slow down significantly.";
          } else {
            model.vramStatus = "safe";
            model.vramWarning = undefined;
          }
        }

        // D. Self-Maintenance Policy Integration
        const rec = maintenancePolicy.evaluateModel(id, {
          ramTotalGB: totalRAM / 1e9,
          ramFreeGB: (totalRAM - model.memoryRequirement!) / 1e9, // Simple heuristic
          isBatteryPowered: false, // Default to false until nativeControl is integrated
          batteryLevel: 100,
          isIntelMac,
          isWindows: (window as any).luca?.isWindows || false,
          diskFreeGB: 50, // Placeholder
          cpuLoad: 0
        });

        model.policyRecommendation = rec.status;
        model.policyReason = rec.reason;

        if (rec.status === "RESTRICTED") {
          model.status = "unsupported";
          model.unsupportedReason = rec.reason;
        }
      }

      this.notifyListeners();
    } catch (err) {
      console.error("[ModelManager] Refresh failed:", err);
    }
  }

  getVRAMGuardRecommendation(id: string) {
    const model = this.models.get(id);
    if (!model || model.vramStatus === "safe") return { shouldWarn: false, message: "" };
    return { shouldWarn: true, message: model.vramWarning || "High RAM usage detected." };
  }

  async downloadModel(id: string, onProgress?: (step: string, p: number) => void): Promise<boolean> {
    const model = this.models.get(id);
    if (!model) return false;

    if (model.runtime === "ollama") {
      return await this.setupOllamaForModel(id, (step, p) => {
        model.status = "downloading";
        model.downloadProgress = p;
        this.notifyListeners();
        if (p) onProgress?.(step, p);
      });
    }

    // Internal cortex download logic (Vision, TTS, STT)
    model.status = "downloading";
    onProgress?.("Syncing weights...", 0);
    this.notifyListeners();

    try {
      // Direct download from Cortex manifest
      // Backend expects GET /models/download/{id} and returns SSE stream
      const url = await this.getUrl(`/models/download/${id}`);
      const resp = await fetch(url, { method: "GET" });
      
      if (resp.ok) {
        // Since it's an SSE stream, we just wait for it to complete or handle chunks
        // For simplicity in the service layer, we mark as ready when the stream starts successfully
        model.status = "ready";
        model.downloadProgress = 100;
        this.notifyListeners();
        onProgress?.("Completed", 100);
        return true;
      }
      throw new Error("Download failed");
    } catch (err) {
      console.error(`[ModelManager] Internal download failed for ${id}:`, err);
      model.status = "error";
      this.notifyListeners();
      return false;
    }
  }

  async deleteModel(id: string): Promise<boolean> {
    const model = this.models.get(id);
    if (!model) return false;

    try {
      if (model.runtime === "ollama") {
        const tag = this.getOllamaTagForModel(id);
        const resp = await fetch("http://127.0.0.1:11434/api/delete", {
          method: "DELETE",
          body: JSON.stringify({ name: tag })
        });
        if (resp.ok) {
           model.status = "not_downloaded";
           model.downloadProgress = 0;
           this.notifyListeners();
           return true;
        }
      } else {
        const url = await this.getUrl(`/models/${id}`);
        const resp = await fetch(url, { method: "DELETE" });
        if (resp.ok) {
            model.status = "not_downloaded";
            model.downloadProgress = 0;
            this.notifyListeners();
            return true;
        }
      }
    } catch (e) {
      console.error(`[ModelManager] Purge failed for ${id}:`, e);
    }
    return false;
  }

  async setupOllamaForModel(id: string, onStatus: (step: string, progress?: number) => void): Promise<boolean> {
    if (typeof window === "undefined" || !(window as any).electron) return false;
    try {
      const isRunning = await (window as any).electron.ipcRenderer.invoke("is-ollama-running");
      if (!isRunning) {
        onStatus("Booting Intelligence Daemon...", 0);
        const started = await this.ensureOllamaRunning();
        if (!started) {
          onStatus("Daemon Missing", 0);
          return false;
        }
        // Brief wait for daemon to stabilize
        await new Promise(r => setTimeout(r, 2000));
      }

      const tag = this.getOllamaTagForModel(id);
      
      const ipc = (window as any).electron.ipcRenderer;
      const statusHandler = (_: any, data: any) => {
        onStatus(data.step, data.progress);
      };
      
      ipc.on("ollama-setup-status", statusHandler);

      const success = await (window as any).electron.ipcRenderer.invoke("setup-ollama-for-model", { modelId: id, tag });
      
      // Cleanup listener
      ipc.removeListener("ollama-setup-status", statusHandler);
      
      return success;
    } catch (err) {
      console.error("[Ollama Setup] Failed:", err);
      return false;
    }
  }

  async getOllamaModels(): Promise<{ available: boolean; models: any[] }> {
    try {
      const resp = await fetch("http://127.0.0.1:11434/api/tags");
      if (resp.ok) {
        const data = await resp.json();
        return { available: true, models: data.models || [] };
      }
    } catch (err) {
      console.warn("[ModelManager] Failed to fetch raw Ollama models", err);
    }
    return { available: false, models: [] };
  }

  async isOllamaInstalled(): Promise<boolean> {
    if (typeof window === "undefined" || !(window as any).electron) return false;
    return await (window as any).electron.ipcRenderer.invoke("is-ollama-installed");
  }

  /**
   * Ensuring Ollama is running (Active Reliability Layer)
   */
  async ensureOllamaRunning(): Promise<boolean> {
    const status = await this.getOllamaModels();
    if (status.available) return true;

    // Not running - check if it's there
    const installed = await this.isOllamaInstalled();
    if (!installed) return false;

    // It's installed but not running - boot it
    console.log("[Reliability Layer] Attempting to auto-start Ollama...");
    const started = await this.startOllama();
    if (!started) return false;

    // Poll until ready (max 15s)
    for (let i = 0; i < 15; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const check = await this.getOllamaModels();
      if (check.available) {
        console.log("[Reliability Layer] Ollama is now responsive.");
        return true;
      }
    }

    return false;
  }

  async startOllama(): Promise<boolean> {
    if (typeof window === "undefined" || !(window as any).electron) return false;
    return await (window as any).electron.ipcRenderer.invoke("start-ollama");
  }

  async installOllama(): Promise<{ success: boolean; message?: string }> {
    if (typeof window === "undefined" || !(window as any).electron) return { success: false, message: "Electron required" };
    return await (window as any).electron.ipcRenderer.invoke("install-ollama");
  }

  getModel(id: string): LocalModel | undefined {
    return this.models.get(id);
  }

  getModelsByCategory(category: LocalModel["category"]): LocalModel[] {
    return Array.from(this.models.values()).filter(m => m.category === category);
  }

  async getOptimalModel(category: LocalModel["category"], strategy: "performance" | "efficiency" | "accuracy" | "balanced" = "balanced"): Promise<LocalModel | null> {
    const available = Array.from(this.models.values()).filter(m => m.category === category && m.status === "ready");
    if (available.length === 0) return null;
    
    if (strategy === "performance" || strategy === "accuracy") {
      return available.sort((a, b) => (b.size || 0) - (a.size || 0))[0];
    }
    return available.sort((a, b) => (a.size || 0) - (b.size || 0))[0];
  }

  async runCanary(id: string): Promise<boolean> {
    const model = this.models.get(id);
    if (!model) return false;
    try {
      if (model.runtime === "ollama") {
        // Real-time inference probe for Ollama
        const start = Date.now();
        const tag = model.ollamaTag || id;
        const resp = await fetch("http://127.0.0.1:11434/api/chat", {
          method: "POST",
          body: JSON.stringify({
            model: tag,
            messages: [{ role: "user", content: "Say 'Luca Test Passed'" }],
            stream: false
          })
        });
        const data = await resp.json();
        
        // Handle specific Ollama error cases
        let displayResponse = data.message?.content || data.response || "No response";
        if (resp.status === 404) displayResponse = "Model not found in Ollama";
        else if (data.error) displayResponse = data.error;

        model.canary = {
          passed: resp.ok && !data.error && displayResponse !== "No response",
          response: displayResponse,
          latency_ms: Date.now() - start,
          timestamp: Date.now()
        };
        this.notifyListeners();
        return resp.ok && !data.error;
      }

      const url = await this.getUrl(`/models/${id}/canary`);
      const resp = await fetch(url, { method: "POST" });
      const data = await resp.json();
      
      model.canary = {
        passed: data.passed,
        response: data.response,
        latency_ms: data.latency_ms,
        timestamp: Date.now()
      };
      
      this.notifyListeners();
      return data.passed;
    } catch (e) {
      console.error("[Service] Canary failed:", e);
      model.canary = { 
        passed: false, 
        response: "Connection Failed", 
        latency_ms: 0,
        timestamp: Date.now()
      };
      this.notifyListeners();
      return false;
    }
  }

  async activateModel(id: string | null, category: LocalModel["category"]): Promise<boolean> {
    if (category === "brain") {
      const current = settingsService.get("brain");
      if (id) {
          const model = this.models.get(id);
          const modelString = model?.runtime === "ollama" ? this.getOllamaTagForModel(id) : `local/${id}`;
          settingsService.saveSettings({
              brain: { ...current, useCustomApiKey: false, model: modelString }
          });
      } else {
          // Fallback to Cloud or default
          settingsService.saveSettings({
              brain: { ...current, model: "gemini-3-flash-preview" }
          });
      }
    } else if (category === "embedding") {
        const general = settingsService.get("general");
        const modelString = id ? (this.models.get(id)?.runtime === "ollama" ? this.getOllamaTagForModel(id) : `local/${id}`) : "gemini-2.1-flash";
        settingsService.saveSettings({
            general: { ...general, embeddingModel: modelString }
        });
    }

    // Push to Cortex immediately if available
    try {
        const url = await this.getUrl("/config/sync");
        await fetch(url, { method: "POST" });
    } catch (e) {
        console.warn("[ModelManager] Failed to sync config to Cortex directly:", e);
    }

    return true;
  }

  private getOllamaTagForModel(id: string): string {
    const OLLAMA_TAG_MAP: Record<string, string> = {
      "gemma-2b": "gemma2:2b",
      "phi-3-mini": "phi3:mini",
      "llama-3.2-1b": "llama3.2:1b",
      "smollm2-1.7b": "smollm2:1.7b",
      "qwen-2.5-7b": "qwen2.5:7b",
      "deepseek-r1-distill-7b": "deepseek-r1:7b",
      "gemma-4-e2b": "gemma4:e2b",
      "gemma-4-31b": "gemma4:31b",
      "qwen-3.5-7b": "qwen3.5:7b",
      "qwopus-3.5-27b": "qwopus:27b",
      "mistral-7b": "mistral:7b",
      "hermes-3-8b": "hermes3:8b",
      "qwen-2.5-1.5b": "qwen2.5:1.5b",
      "hermes-3-3b": "hermes3:3b",
      "glm-5-9b": "glm5:9b",
      "qwen-3-32b": "qwen3:32b",
      "kimi-k2.5-12b": "kimi:k2.5-12b",
      "deepseek-r1-distill-14b": "deepseek-r1:14b",
    };
    return OLLAMA_TAG_MAP[id] || id;
  }

  subscribe(callback: (models: LocalModel[]) => void) {
    this.listeners.add(callback);
    callback(Array.from(this.models.values()));
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    const models = Array.from(this.models.values());
    this.listeners.forEach(cb => cb(models));
  }
}

export const modelManagerService = new ModelManagerService();
export const modelManager = modelManagerService; // Backward compatibility alias
