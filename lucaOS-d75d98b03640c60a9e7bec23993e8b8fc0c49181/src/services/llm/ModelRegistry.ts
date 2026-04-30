/**
 * Model Registry - Catalog of Available Offline LLM Models
 *
 * Defines the available models, their configurations, and runtime requirements.
 */

export type ModelRuntime = "mediapipe" | "webllm" | "onnx";

export interface OfflineModel {
  id: string;
  name: string;
  description: string;
  size: number; // bytes
  downloadUrl: string;
  runtime: ModelRuntime;
  chatTemplate?: "gemma" | "chatml" | "llama" | "phi";
  quantization?: string;
  recommended?: boolean;
}

export interface ModelStatus {
  modelId: string;
  downloaded: boolean;
  downloading: boolean;
  progress: number; // 0-100
  initialized: boolean;
  error?: string;
}

/**
 * Available Offline Models Catalog
 * Model IDs must match MLC WebLLM hub: https://huggingface.co/mlc-ai
 */
export const OFFLINE_MODELS: OfflineModel[] = [
  {
    id: "gemma-2b-it",
    name: "Gemma 2B",
    description:
      "Google's compact, well-rounded assistant. Great balance of speed and capability.",
    size: 1_400_000_000, // ~1.4GB
    downloadUrl:
      "https://huggingface.co/xianbao/mediapipe-gemma-2b-it/resolve/main/gemma-2b-it-gpu-int4.bin",
    runtime: "mediapipe",
    chatTemplate: "gemma",
    quantization: "int4",
    recommended: true,
  },
  {
    id: "Phi-3-mini-4k-instruct-q4f16_1-MLC",
    name: "Phi-3 Mini 3.8B",
    description:
      "Microsoft's reasoning powerhouse. Excellent for coding and analysis.",
    size: 2_300_000_000, // ~2.3GB
    downloadUrl: "", // MLC handles download
    runtime: "webllm",
    chatTemplate: "phi",
    quantization: "q4f16",
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    name: "Llama 3.2 1B",
    description:
      "Meta's efficient small model. Fast and capable for general tasks.",
    size: 1_000_000_000, // ~1GB
    downloadUrl: "", // MLC handles download
    runtime: "webllm",
    chatTemplate: "llama",
    quantization: "q4f16",
  },
  {
    id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
    name: "SmolLM2 1.7B",
    description:
      "HuggingFace's tiny but mighty model. Ultra-fast on any device.",
    size: 1_200_000_000, // ~1.2GB
    downloadUrl: "", // MLC handles download
    runtime: "webllm",
    chatTemplate: "chatml",
    quantization: "q4f16",
  },
];

/**
 * Model Registry Service
 * Manages model catalog, download status, and persistence
 */
class ModelRegistryService {
  private static instance: ModelRegistryService;
  private statusMap: Map<string, ModelStatus> = new Map();
  private activeModelId: string | null = null;
  private readonly STORAGE_KEY = "luca_offline_models_status";
  private readonly ACTIVE_MODEL_KEY = "luca_active_offline_model";

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): ModelRegistryService {
    if (!ModelRegistryService.instance) {
      ModelRegistryService.instance = new ModelRegistryService();
    }
    return ModelRegistryService.instance;
  }

  /**
   * Get all available models with their status
   */
  getModels(): (OfflineModel & { status: ModelStatus })[] {
    return OFFLINE_MODELS.map((model) => ({
      ...model,
      status: this.getStatus(model.id),
    }));
  }

  /**
   * Get a specific model by ID
   */
  getModel(modelId: string): OfflineModel | undefined {
    return OFFLINE_MODELS.find((m) => m.id === modelId);
  }

  /**
   * Get model status
   */
  getStatus(modelId: string): ModelStatus {
    return (
      this.statusMap.get(modelId) || {
        modelId,
        downloaded: false,
        downloading: false,
        progress: 0,
        initialized: false,
      }
    );
  }

  /**
   * Update model status
   */
  updateStatus(modelId: string, updates: Partial<ModelStatus>): void {
    const current = this.getStatus(modelId);
    this.statusMap.set(modelId, { ...current, ...updates });
    this.saveToStorage();
  }

  /**
   * Get currently active model
   */
  getActiveModelId(): string | null {
    return this.activeModelId;
  }

  /**
   * Set active model
   */
  setActiveModel(modelId: string | null): void {
    this.activeModelId = modelId;
    if (typeof localStorage !== "undefined") {
      if (modelId) {
        localStorage.setItem(this.ACTIVE_MODEL_KEY, modelId);
      } else {
        localStorage.removeItem(this.ACTIVE_MODEL_KEY);
      }
    }
  }

  /**
   * Get formatted size string
   */
  formatSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1
      ? `${gb.toFixed(1)} GB`
      : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }

  /**
   * Load status from localStorage
   */
  private loadFromStorage(): void {
    if (typeof localStorage === "undefined") return;

    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, ModelStatus>;
        Object.entries(parsed).forEach(([id, status]) => {
          this.statusMap.set(id, status);
        });
      }

      this.activeModelId = localStorage.getItem(this.ACTIVE_MODEL_KEY);
    } catch (e) {
      console.warn("[ModelRegistry] Failed to load from storage:", e);
    }
  }

  /**
   * Save status to localStorage
   */
  private saveToStorage(): void {
    if (typeof localStorage === "undefined") return;

    try {
      const obj: Record<string, ModelStatus> = {};
      this.statusMap.forEach((status, id) => {
        obj[id] = status;
      });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn("[ModelRegistry] Failed to save to storage:", e);
    }
  }
}

export const modelRegistry = ModelRegistryService.getInstance();
