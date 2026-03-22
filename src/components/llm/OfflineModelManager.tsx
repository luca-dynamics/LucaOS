/**
 * Offline Model Manager Component
 * UI for downloading/managing multiple Local LLM models.
 *
 * Features:
 * - Model catalog with multiple options
 * - Download progress per model
 * - Model activation toggle
 * - Storage usage display
 */

import React, { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import { mobileOfflineBrain } from "../../services/mobile/MobileOfflineBrain";
const {
  Download,
  Trash2,
  Loader2,
  Brain,
  AlertTriangle,
  Server,
  Cpu,
  Check,
  Zap,
  Sparkles,
  Globe,
} = LucideIcons as any;
import { llmService } from "../../services/llmService";
import {
  modelRegistry,
  OfflineModel,
  ModelStatus,
} from "../../services/llm/ModelRegistry";
import { webLLMAdapter } from "../../services/llm/WebLLMAdapter";

interface MobileModelManagerProps {
  onStatusChange?: (status: "ready" | "downloading" | "not_downloaded") => void;
  theme?: { hex: string; primary: string };
  onClose: () => void;
}

// Model card icon mapping
const MODEL_ICONS: Record<string, React.ReactNode> = {
  "gemma-2b-it": <Cpu size={20} />,
  "Phi-3-mini-4k-instruct-q4f16_1-MLC": <Sparkles size={20} />,
  "Llama-3.2-1B-Instruct-q4f16_1-MLC": <Zap size={20} />,
  "SmolLM2-1.7B-Instruct-q4f16_1-MLC": <Globe size={20} />,
};

// Check WebGPU support
const isWebGPUSupported =
  typeof navigator !== "undefined" && "gpu" in navigator;

export const OfflineModelManager: React.FC<MobileModelManagerProps> = ({
  onStatusChange,
  theme = { hex: "#a855f7", primary: "text-purple-500" },
  onClose,
}) => {
  // State for models
  const [models, setModels] = useState<
    (OfflineModel & { status: ModelStatus })[]
  >([]);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(
    null,
  );
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // State for System Brain
  const [systemBrainStatus, setSystemBrainStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");

  // Load initial state
  useEffect(() => {
    refreshModels();
    checkSystemBrain();
    setActiveModelId(modelRegistry.getActiveModelId());
  }, []);

  const refreshModels = () => {
    setModels(modelRegistry.getModels());
  };

  const checkSystemBrain = async () => {
    try {
      const provider = llmService.getProvider("cortex");
      await provider.generate("ping", { maxTokens: 1 });
      setSystemBrainStatus("online");
    } catch {
      setSystemBrainStatus("offline");
    }
  };

  const handleDownload = async (model: OfflineModel) => {
    setDownloadingModelId(model.id);
    setError(null);
    setDownloadProgress(0);
    onStatusChange?.("downloading");

    try {
      if (model.runtime === "mediapipe") {
        // Use existing MobileOfflineBrain for Gemma
        const success = await mobileOfflineBrain.downloadModel(
          (downloaded, total) => {
            const percent = Math.round((downloaded / total) * 100);
            setDownloadProgress(percent);
          },
        );

        if (success) {
          modelRegistry.updateStatus(model.id, {
            downloaded: true,
            downloading: false,
          });
          await mobileOfflineBrain.initialize();
          onStatusChange?.("ready");
        } else {
          throw new Error("Download failed");
        }
      } else if (model.runtime === "webllm") {
        // Use WebLLM adapter
        modelRegistry.updateStatus(model.id, { downloading: true });
        const success = await webLLMAdapter.initialize(model);
        if (!success) {
          throw new Error("WebLLM initialization failed");
        }
        onStatusChange?.("ready");
      }
    } catch (err: any) {
      setError(err.message || "Download failed. Please try again.");
      modelRegistry.updateStatus(model.id, {
        downloading: false,
        error: err.message,
      });
      onStatusChange?.("not_downloaded");
    } finally {
      setDownloadingModelId(null);
      refreshModels();
    }
  };

  const handleActivate = async (modelId: string) => {
    const model = modelRegistry.getModel(modelId);
    if (!model) return;

    // Deactivate previous
    if (activeModelId && activeModelId !== modelId) {
      // Unload previous if WebLLM
      const prevModel = modelRegistry.getModel(activeModelId);
      if (prevModel?.runtime === "webllm") {
        await webLLMAdapter.unload();
      }
    }

    // Activate new
    modelRegistry.setActiveModel(modelId);
    setActiveModelId(modelId);

    // Update LLM service
    if (model.runtime === "mediapipe") {
      llmService.setDefaultProvider("local-gemma-2b");
    } else {
      llmService.setDefaultProvider("webllm");
    }

    // Persist to settings
    const { settingsService } = await import("../../services/settingsService");
    settingsService.saveSettings({
      brain: {
        ...settingsService.getSettings().brain,
        model: modelId,
      },
    });
  };

  const handleDeactivate = async () => {
    modelRegistry.setActiveModel(null);
    setActiveModelId(null);
    llmService.setDefaultProvider("gemini");

    const { settingsService } = await import("../../services/settingsService");
    settingsService.saveSettings({
      brain: {
        ...settingsService.getSettings().brain,
        model: "gemini-3-flash-preview",
      },
    });
  };

  const handleDelete = async (model: OfflineModel) => {
    const confirmed = window.confirm(
      `Delete ${model.name}? You'll need to re-download it to use offline.`,
    );
    if (!confirmed) return;

    if (model.runtime === "mediapipe") {
      await mobileOfflineBrain.deleteModel();
    }
    // WebLLM clears cache automatically

    modelRegistry.updateStatus(model.id, {
      downloaded: false,
      initialized: false,
    });

    if (activeModelId === model.id) {
      handleDeactivate();
    }

    refreshModels();
    onStatusChange?.("not_downloaded");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
      <div
        className="w-full max-w-2xl bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{
          boxShadow: `0 0 50px -10px ${theme.hex}30`,
          borderColor: `${theme.hex}40`,
        }}
      >
        {/* Liquid background */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none transition-all duration-700 -z-10"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${theme.hex}25, transparent 60%)`,
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
              <Brain size={20} style={{ color: theme.hex }} />
            </div>
            <div>
              <h3 className="font-bold text-white tracking-wide text-sm">
                OFFLINE INTELLIGENCE
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                CHOOSE YOUR LOCAL MODEL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* System Brain Status */}
        <div
          className={`p-3 rounded-xl border mb-4 ${
            systemBrainStatus === "online"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-white/5 bg-white/5"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Server size={14} />
              SYSTEM BRAIN (PYTHON CORTEX)
            </div>
            <div className="flex items-center gap-2">
              {systemBrainStatus === "checking" && (
                <Loader2 size={12} className="animate-spin text-slate-500" />
              )}
              {systemBrainStatus === "online" && (
                <>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ONLINE
                  </span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                </>
              )}
              {systemBrainStatus === "offline" && (
                <>
                  <span className="text-[10px] text-red-400 font-mono">
                    OFFLINE
                  </span>
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400 text-xs">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* WebGPU Warning */}
        {!isWebGPUSupported && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-3 text-yellow-400 text-xs">
            <AlertTriangle size={16} />
            <span>
              WebGPU not supported. Only Gemma 2B (MediaPipe) will work. Use
              Chrome/Edge 113+ for other models.
            </span>
          </div>
        )}

        {/* Model Catalog Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {models.map((model) => {
            const isDownloading = downloadingModelId === model.id;
            const isActive = activeModelId === model.id;
            const isReady = model.status.downloaded || model.status.initialized;

            return (
              <div
                key={model.id}
                className={`p-4 rounded-xl border transition-all ${
                  isActive
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : isReady
                      ? "border-blue-500/30 bg-blue-500/5"
                      : "border-white/10 bg-white/5"
                }`}
              >
                {/* Model Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-1.5 rounded-lg"
                      style={{
                        backgroundColor: isActive
                          ? "#10b98120"
                          : `${theme.hex}20`,
                        color: isActive ? "#10b981" : theme.hex,
                      }}
                    >
                      {MODEL_ICONS[model.id] || <Brain size={20} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {model.name}
                        {model.recommended && (
                          <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-mono">
                            REC
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {modelRegistry.formatSize(model.size)} ·{" "}
                        {model.runtime.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check size={12} className="text-emerald-400" />
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-400 mb-3 line-clamp-2">
                  {model.description}
                </p>

                {/* Download Progress */}
                {isDownloading && (
                  <div className="mb-3">
                    <div className="flex justify-between text-[9px] font-mono text-slate-500 mb-1">
                      <span>DOWNLOADING...</span>
                      <span>{downloadProgress}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${downloadProgress}%`,
                          backgroundColor: theme.hex,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {!isReady && !isDownloading && (
                    <button
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold tracking-wider flex items-center justify-center gap-1.5 border transition-all ${
                        model.runtime === "webllm" && !isWebGPUSupported
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-white/10"
                      }`}
                      style={{
                        backgroundColor: `${theme.hex}15`,
                        color: theme.hex,
                        borderColor: `${theme.hex}30`,
                      }}
                      onClick={() => handleDownload(model)}
                      disabled={
                        model.runtime === "webllm" && !isWebGPUSupported
                      }
                      title={
                        model.runtime === "webllm" && !isWebGPUSupported
                          ? "Requires WebGPU (Chrome/Edge 113+)"
                          : undefined
                      }
                    >
                      <Download size={12} />
                      DOWNLOAD
                    </button>
                  )}

                  {isDownloading && (
                    <button className="flex-1 py-1.5 rounded-lg text-[10px] font-bold tracking-wider flex items-center justify-center gap-1.5 bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed">
                      <Loader2 size={12} className="animate-spin" />
                      DOWNLOADING
                    </button>
                  )}

                  {isReady && !isActive && (
                    <>
                      <button
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-bold tracking-wider flex items-center justify-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
                        onClick={() => handleActivate(model.id)}
                      >
                        <Brain size={12} />
                        ACTIVATE
                      </button>
                      <button
                        className="py-1.5 px-2 rounded-lg text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
                        onClick={() => handleDelete(model)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}

                  {isActive && (
                    <button
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-bold tracking-wider flex items-center justify-center gap-1.5 bg-slate-500/20 text-slate-400 border border-slate-500/30 hover:bg-slate-500/30 transition-all"
                      onClick={handleDeactivate}
                    >
                      <Brain size={12} />
                      DEACTIVATE
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-600 font-mono">
          Local models run entirely in your browser. No data sent to cloud.
        </p>
      </div>
    </div>
  );
};

export default OfflineModelManager;
