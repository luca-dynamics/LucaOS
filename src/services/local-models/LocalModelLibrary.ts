/**
 * Local Model Library
 * -------------------
 * The lifecycle service for every local model Luca knows about: download,
 * delete, VRAM guard, canary probe, and live status.
 *
 * The model list itself lives in `LocalModelDefinitions` — one canonical array,
 * read by this service and projected by `LocalModelCatalog` into the
 * `LocalModelDescriptor` shape the runtime adapters consume. There is no second
 * hand-maintained catalog to drift from it.
 */

import { CORTEX_URL } from "../../config/api";
import { settingsService } from "../settingsService";
import { maintenancePolicy } from "../selfMaintenancePolicy";
import { probeOllamaViaRuntimeFacade } from "./ollamaRuntimeProbe";
import { probeCortexViaRuntimeFacade } from "./cortexRuntimeProbe";
import {
  canaryChatViaRuntimeFacade,
  deleteOllamaModelViaRuntimeFacade,
} from "./ollamaRuntimeOps";

// The canonical model list lives in a leaf module so that the projection in
// LocalModelCatalog can read it without importing this service (and the runtime
// registry it pulls in). Re-exported here because callers have always imported
// these names from the library.
import {
  catalogWarningFor,
  inferCatalogStatus,
  isLocalModelId,
  LOCAL_BRAIN_MODEL_IDS,
  LOCAL_EMBEDDING_MODEL_IDS,
  LOCAL_MODEL_DEFINITIONS,
  LOCAL_STT_MODEL_IDS,
  LOCAL_TTS_MODEL_IDS,
  LOCAL_VISION_MODEL_IDS,
  type LocalModel,
} from "./LocalModelDefinitions";

export type { LocalModel };
export {
  isLocalModelId,
  LOCAL_BRAIN_MODEL_IDS,
  LOCAL_EMBEDDING_MODEL_IDS,
  LOCAL_MODEL_DEFINITIONS,
  LOCAL_STT_MODEL_IDS,
  LOCAL_TTS_MODEL_IDS,
  LOCAL_VISION_MODEL_IDS,
};

/**
 * The lifecycle service over `LOCAL_MODEL_DEFINITIONS`: download, delete, VRAM
 * guard, canary probe, and live status for every local model.
 */
class LocalModelLibraryService {
  private _cortexBaseUrl: string = CORTEX_URL;
  private _isConfigured: boolean = false;
  private models: Map<string, LocalModel> = new Map();
  private listeners: Set<(models: LocalModel[]) => void> = new Set();
  private _systemSpecs: any = null;

  constructor() {
    LOCAL_MODEL_DEFINITIONS.forEach((def) => {
      const catalogStatus = inferCatalogStatus(def);
      this.models.set(def.id, {
        ...def,
        catalogStatus,
        catalogWarning: catalogWarningFor(catalogStatus, def),
        status: "not_downloaded",
      });
    });

    if (typeof window !== "undefined") {
      setTimeout(() => this.refreshStatus(), 1000);
      if ((window as any).electron) {
        setInterval(() => this.refreshStatus(), 30000);
      }
    }
  }

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
        if (config?.port)
          this._cortexBaseUrl = `http://127.0.0.1:${config.port}`;
        this._isConfigured = true;
      } catch (err) {
        console.warn(
          "[ModelManager] Failed to get Cortex config, using default",
          err,
        );
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
      this._systemSpecs = await (window as any).electron.ipcRenderer.invoke(
        "get-system-specs",
      );
    }
    return this._systemSpecs;
  }

  async refreshStatus(): Promise<void> {
    if (!settingsService.isLocalDiscoveryEnabled()) return;

    try {
      // 1. Get Hardware Info
      const specs = (await this.getSystemSpecs()) || {};
      const totalRAM = specs.memory?.total || 8_000_000_000;
      const isIntelMac = specs.isIntelMac;

      // 2. Fetch Status from Runtimes
      let cortexData: any = { models: {} };
      try {
        const url = await this.getUrl("/models/status");
        const resp = await fetch(url);
        if (resp.ok) cortexData = await resp.json();
      } catch (err) {
        console.warn(
          "[ModelManager] Cortex status fetch failed (offline?)",
          err,
        );
      }

      let ollamaNames: string[] = [];
      try {
        const probe = await probeOllamaViaRuntimeFacade({ force: true });
        if (probe.available) {
          ollamaNames = probe.models;
        }
      } catch (err) {
        console.warn(
          "[ModelManager] Ollama status check failed (offline?)",
          err,
        );
      }

      const OLLAMA_TAG_MAP: Record<string, string[]> = {
        "gemma-4b": ["gemma4:4b", "gemma:4b"],
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
          const tags = OLLAMA_TAG_MAP[id] || [model.ollamaTag || id];
          const pulled = ollamaNames.some((n) =>
            tags.some((t) => n.startsWith(t)),
          );
          model.status = pulled ? "ready" : "not_downloaded";
          if (pulled) {
            model.downloadProgress = 100;
          } else if (
            model.catalogStatus === "planned" ||
            model.catalogStatus === "experimental" ||
            model.catalogStatus === "unknown"
          ) {
            model.unsupportedReason = model.catalogWarning;
          }
        } else {
          const status = cortexData.models[id];
          model.status = status?.downloaded ? "ready" : "not_downloaded";
          if (
            !status?.downloaded &&
            (model.catalogStatus === "planned" ||
              model.catalogStatus === "experimental" ||
              model.catalogStatus === "unknown")
          ) {
            model.unsupportedReason = model.catalogWarning;
          }
        }

        // B. Hardware Gating (Universal)
        if (
          model.memoryRequirement &&
          totalRAM < model.memoryRequirement * 0.9
        ) {
          model.status = "unsupported";
          model.unsupportedReason = `Requires ${Math.round(model.memoryRequirement / 1e9)}GB RAM`;
        } else if (
          isIntelMac &&
          model.category === "brain" &&
          (model.performanceRank || 0) >= 8
        ) {
          model.status = "unsupported";
          model.unsupportedReason =
            "Intel Mac with Integrated Graphics is too slow for local inference of this model. Switch to Cloud Mode for optimal performance.";
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
          cpuLoad: 0,
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
    if (!model || model.vramStatus === "safe")
      return { shouldWarn: false, message: "" };
    return {
      shouldWarn: true,
      message: model.vramWarning || "High RAM usage detected.",
    };
  }

  async downloadModel(
    id: string,
    onProgress?: (step: string, p: number) => void,
  ): Promise<boolean> {
    const model = this.models.get(id);
    if (!model) return false;

    if (
      model.runtime === "ollama" &&
      (model.catalogStatus === "planned" || model.catalogStatus === "unknown")
    ) {
      const message =
        model.catalogWarning ||
        `${model.name} is not verified as installable yet.`;
      console.warn(
        `[ModelManager] Refusing unverified Ollama tag download for ${id}: ${message}`,
      );
      model.status = "error";
      model.unsupportedReason = message;
      this.notifyListeners();
      onProgress?.(message, 0);
      return false;
    }

    if (model.runtime === "ollama") {
      return await this.setupOllamaForModel(id, (step, p) => {
        model.status = "downloading";
        model.downloadProgress = p;
        this.notifyListeners();
        if (onProgress) onProgress(step, p || 0);
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
        const reader = resp.body?.getReader();
        if (!reader) {
          throw new Error("Download stream unavailable");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let sawComplete = false;

        while (true) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value || new Uint8Array(), {
            stream: !done,
          });

          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const eventChunk of events) {
            const dataLines = eventChunk
              .split("\n")
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim());

            if (dataLines.length === 0) continue;

            try {
              const payload = JSON.parse(dataLines.join("\n"));
              const progress =
                typeof payload.progress === "number"
                  ? payload.progress
                  : model.downloadProgress || 0;
              const status = payload.status || "downloading";

              model.downloadProgress = progress;

              if (status === "error") {
                model.status = "error";
                this.notifyListeners();
                throw new Error(payload.message || `Download failed for ${id}`);
              }

              model.status = status === "complete" ? "ready" : "downloading";
              this.notifyListeners();
              onProgress?.(payload.status || "downloading", progress);

              if (status === "complete") {
                sawComplete = true;
              }
            } catch (parseError) {
              console.warn(
                `[ModelManager] Failed to parse download event for ${id}:`,
                parseError,
              );
            }
          }

          if (done) break;
        }

        if (!sawComplete) {
          throw new Error(`Download stream ended before completion for ${id}`);
        }

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
        const deleted = await deleteOllamaModelViaRuntimeFacade(tag);
        if (deleted.ok) {
          model.status = "not_downloaded";
          model.downloadProgress = 0;
          this.notifyListeners();
          return true;
        }
        console.warn(
          `[ModelManager] Ollama delete failed for ${id}:`,
          deleted.message,
        );
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

  async setupOllamaForModel(
    id: string,
    onStatus: (step: string, progress?: number) => void,
  ): Promise<boolean> {
    if (typeof window === "undefined" || !(window as any).electron)
      return false;
    try {
      const isRunning = await (window as any).electron.ipcRenderer.invoke(
        "is-ollama-running",
      );
      if (!isRunning) {
        onStatus("Booting Intelligence Daemon...", 0);
        const started = await this.ensureOllamaRunning();
        if (!started) {
          onStatus("Daemon Missing", 0);
          return false;
        }
        // Brief wait for daemon to stabilize
        await new Promise((r) => setTimeout(r, 2000));
      }

      const tag = this.getOllamaTagForModel(id);

      const ipc = (window as any).electron.ipcRenderer;
      const statusHandler = (_: any, data: any) => {
        if (data && data.step) {
          onStatus(data.step, data.progress);
        }
      };

      ipc.on("ollama-setup-status", statusHandler);

      const success = await (window as any).electron.ipcRenderer.invoke(
        "setup-ollama-for-model",
        { modelId: id, tag },
      );

      // Cleanup listener properly
      ipc.removeListener("ollama-setup-status", statusHandler);

      return success;
    } catch (err) {
      console.error("[Ollama Setup] Failed:", err);
      return false;
    }
  }

  /**
   * Ollama status via local runtime facade (not a raw /api/tags fetch).
   * Shape preserved for callers that map models by `.name`.
   */
  async getOllamaModels(options?: {
    force?: boolean;
  }): Promise<{ available: boolean; models: Array<{ name: string }> }> {
    try {
      const probe = await probeOllamaViaRuntimeFacade({
        force: options?.force,
      });
      return {
        available: probe.available,
        models: probe.models.map((name) => ({ name })),
      };
    } catch (err) {
      console.warn("[ModelManager] Failed to fetch Ollama models via facade", err);
    }
    return { available: false, models: [] };
  }

  /**
   * Cortex status via local runtime facade (product-critical for internal models).
   * Install/download still uses Cortex /models/* HTTP; this is health + model ids.
   */
  async getCortexStatus(options?: {
    force?: boolean;
  }): Promise<{
    available: boolean;
    models: string[];
    message?: string;
    activeGenerations?: number;
  }> {
    try {
      const probe = await probeCortexViaRuntimeFacade({
        force: options?.force,
      });
      return {
        available: probe.available,
        models: probe.models,
        message: probe.message,
        activeGenerations: probe.activeGenerations,
      };
    } catch (err) {
      console.warn("[ModelManager] Failed to probe Cortex via facade", err);
    }
    return { available: false, models: [] };
  }

  async isOllamaInstalled(): Promise<boolean> {
    if (typeof window === "undefined" || !(window as any).electron)
      return false;
    return await (window as any).electron.ipcRenderer.invoke(
      "is-ollama-installed",
    );
  }

  /**
   * Ensuring Ollama is running (Active Reliability Layer)
   */
  async ensureOllamaRunning(): Promise<boolean> {
    // Force refresh so a recent negative probe cache cannot block auto-start.
    const status = await this.getOllamaModels({ force: true });
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
      const check = await this.getOllamaModels({ force: true });
      if (check.available) {
        console.log("[Reliability Layer] Ollama is now responsive.");
        return true;
      }
    }

    return false;
  }

  async startOllama(): Promise<boolean> {
    if (typeof window === "undefined" || !(window as any).electron)
      return false;
    return await (window as any).electron.ipcRenderer.invoke("start-ollama");
  }

  async installOllama(): Promise<{ success: boolean; message?: string }> {
    if (typeof window === "undefined" || !(window as any).electron)
      return { success: false, message: "Electron required" };
    return await (window as any).electron.ipcRenderer.invoke("install-ollama");
  }

  getModel(id: string): LocalModel | undefined {
    return this.models.get(id);
  }

  getAllModels(): LocalModel[] {
    return Array.from(this.models.values());
  }

  getModelsByCategory(category: LocalModel["category"]): LocalModel[] {
    return Array.from(this.models.values()).filter(
      (m) => m.category === category,
    );
  }

  async getOptimalModel(
    category: LocalModel["category"],
    strategy:
      | "performance"
      | "efficiency"
      | "accuracy"
      | "balanced" = "balanced",
  ): Promise<LocalModel | null> {
    const available = Array.from(this.models.values()).filter(
      (m) => m.category === category && m.status === "ready",
    );
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
        // Canary via runtime facade (OpenAI-compatible chat path).
        const tag = model.ollamaTag || id;
        const canary = await canaryChatViaRuntimeFacade({ model: tag });
        model.canary = {
          passed: canary.ok,
          response: canary.text,
          latency_ms: canary.latencyMs,
          timestamp: Date.now(),
        };
        this.notifyListeners();
        return canary.ok;
      }

      const url = await this.getUrl(`/models/${id}/canary`);
      const resp = await fetch(url, { method: "POST" });
      const data = await resp.json();

      model.canary = {
        passed: data.passed,
        response: data.response,
        latency_ms: data.latency_ms,
        timestamp: Date.now(),
      };

      this.notifyListeners();
      return data.passed;
    } catch (e) {
      console.error("[Service] Canary failed:", e);
      model.canary = {
        passed: false,
        response: "Connection Failed",
        latency_ms: 0,
        timestamp: Date.now(),
      };
      this.notifyListeners();
      return false;
    }
  }

  async activateModel(
    id: string | null,
    category: LocalModel["category"],
  ): Promise<boolean> {
    if (category === "brain") {
      const current = settingsService.getSettings();
      if (id) {
        const model = this.models.get(id);
        const modelString =
          model?.runtime === "ollama"
            ? this.getOllamaTagForModel(id)
            : `local/${id}`;
        settingsService.saveSettings({
          ...current,
          brain: {
            ...current.brain,
            useCustomApiKey: false,
            model: modelString,
          },
          general: { ...current.general, activeBrainId: id },
        });
      } else {
        // Fallback to Cloud or default
        settingsService.saveSettings({
          ...current,
          brain: { ...current.brain, model: "gemini-3-flash-preview" },
          general: { ...current.general, activeBrainId: null },
        });
      }
    } else if (category === "embedding") {
      const current = settingsService.getSettings();
      if (id) {
        settingsService.saveSettings({
          ...current,
          brain: { ...current.brain, embeddingModel: id },
          general: { ...current.general, activeEmbedId: id },
        });
      }
    }

    // Push to Cortex immediately if available
    try {
      const url = await this.getUrl("/config/sync");
      await fetch(url, { method: "POST" });
    } catch (e) {
      console.warn(
        "[ModelManager] Failed to sync config to Cortex directly:",
        e,
      );
    }

    return true;
  }

  private getOllamaTagForModel(id: string): string {
    const OLLAMA_TAG_MAP: Record<string, string> = {
      "gemma-4b": "gemma4:4b",
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
    this.listeners.forEach((cb) => cb(models));
  }
}

export const localModelLibrary = new LocalModelLibraryService();

/** Historical names for {@link localModelLibrary}. Same instance — there is one. */
export const modelManagerService = localModelLibrary;
export const modelManager = localModelLibrary;
