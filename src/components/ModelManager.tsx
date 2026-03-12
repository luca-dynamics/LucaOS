/**
 * Model Manager Component
 * Unified UI for managing all local AI models on Desktop.
 *
 * Shows: Download status, storage usage, download/delete buttons
 */

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Eye,
  Volume2,
  Bot,
  Package,
  X,
  Check,
  AlertTriangle,
  Database,
  Download,
  Trash2,
  RefreshCw,
  Ear,
  Brain,
  Zap,
  FlaskConical,
  Shield,
} from "lucide-react";
import {
  modelManager,
  LocalModel,
  ModelManagerService,
} from "../services/ModelManagerService";
import { settingsService } from "../services/settingsService";

interface ModelManagerProps {
  onClose?: () => void;
  theme?: {
    hex: string;
    primary?: string;
    themeName?: string;
  };
}

const getCategoryIcon = (category: LocalModel["category"]) => {
  const iconSize = 16;
  switch (category) {
    case "brain":
      return <Cpu size={iconSize} />;
    case "vision":
      return <Eye size={iconSize} />;
    case "tts":
      return <Volume2 size={iconSize} />;
    case "stt":
      return <Ear size={iconSize} />;
    case "agent":
      return <Bot size={iconSize} />;
    case "embedding":
      return <Brain size={iconSize} />;
    default:
      return <Package size={iconSize} />;
  }
};

export const ModelManager: React.FC<ModelManagerProps> = ({
  onClose,
  theme = { hex: "#f5d679ff" },
}) => {
  const [models, setModels] = useState<LocalModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [canaryTestingId, setCanaryTestingId] = useState<string | null>(null);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [platform] = useState<"desktop" | "mobile">(
    ModelManagerService.getCurrentPlatform(),
  );
  const [totalStorage, setTotalStorage] = useState({
    bytes: 0,
    formatted: "0.0 GB",
  });

  // Load models on mount (filtered by platform)
  useEffect(() => {
    const loadModels = async () => {
      setIsLoading(true);
      const data = await modelManager.getModelsForPlatform(platform);
      setModels(data);
      setIsLoading(false);
    };

    loadModels();

    // Load active model from localStorage
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("luca_active_local_brain");
      if (saved) setActiveModelId(saved);
    }

    // Subscribe to updates (and filter by platform)
    const unsubscribe = modelManager.subscribe((allModels) => {
      setModels(allModels.filter((m) => m.platforms.includes(platform)));
      // Update storage counter
      setTotalStorage(modelManager.getTotalStorageUsed());
    });
    return () => unsubscribe();
  }, [platform]);

  const handleDownload = async (modelId: string) => {
    setDownloadingId(modelId);
    await modelManager.downloadModel(modelId);
    setDownloadingId(null);
  };

  const handleDelete = async (modelId: string) => {
    const model = models.find((m) => m.id === modelId);
    if (!model) return;

    const confirmed = window.confirm(
      `Delete ${model.name}? You'll need to re-download it to use offline features.`,
    );
    if (!confirmed) return;

    await modelManager.deleteModel(modelId);
  };

  const handleSetActive = (modelId: string) => {
    setActiveModelId(modelId);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("luca_active_local_brain", modelId);
    }
  };

  const handleCanary = async (modelId: string) => {
    setCanaryTestingId(modelId);
    await modelManager.runCanary(modelId);
    setCanaryTestingId(null);
  };

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    "Chat Brain (LLM)": true, // Default expanded
  });

  const toggleSection = (title: string) => {
    setExpandedSections((prev: Record<string, boolean>) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // Group models
  const brainModels = models.filter((m: LocalModel) => m.category === "brain");
  const visionModels = models.filter(
    (m: LocalModel) => m.category === "vision",
  );
  const sttModels = models.filter((m: LocalModel) => m.category === "stt");
  const ttsModels = models.filter((m: LocalModel) => m.category === "tts");
  const agentModels = models.filter((m: LocalModel) => m.category === "agent");
  const embeddingModels = models.filter(
    (m: LocalModel) => m.category === "embedding",
  );

  const RenderGrid = ({
    title,
    items,
    compact = false,
  }: {
    title: string;
    items: LocalModel[];
    compact?: boolean;
  }) => {
    if (items.length === 0) return null;
    const isExpanded = expandedSections[title];

    return (
      <div
        className={`mb-3 overflow-hidden rounded-xl border ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/5 bg-black/[0.02]" : "border-white/5 bg-black/20"} backdrop-blur-sm transition-all hover:border-white/10`}
      >
        {/* Accordion Header */}
        <button
          onClick={() => toggleSection(title)}
          className={`w-full flex items-center justify-between p-4 transition-all group ${
            isExpanded
              ? theme.themeName?.toLowerCase() === "lucagent"
                ? "bg-black/[0.03]"
                : "bg-white/[0.03]"
              : theme.themeName?.toLowerCase() === "lucagent"
                ? "hover:bg-black/[0.02]"
                : "hover:bg-white/[0.02]"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`p-2 rounded-lg transition-all ${
                isExpanded
                  ? theme.themeName?.toLowerCase() === "lucagent"
                    ? "bg-black/5 text-slate-900 shadow-[0_0_15px_rgba(0,0,0,0.05)]"
                    : "bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                  : theme.themeName?.toLowerCase() === "lucagent"
                    ? "bg-black/[0.02] text-slate-400 group-hover:text-slate-600"
                    : "bg-white/5 text-gray-500 group-hover:text-gray-300"
              }`}
              style={{ color: isExpanded ? theme.hex : undefined }}
            >
              {getCategoryIcon(items[0].category)}
            </div>
            <div className="text-left">
              <span
                className={`text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${
                  isExpanded
                    ? theme.themeName?.toLowerCase() === "lucagent"
                      ? "text-slate-900"
                      : "text-gray-100"
                    : theme.themeName?.toLowerCase() === "lucagent"
                      ? "text-slate-500"
                      : "text-gray-500"
                }`}
              >
                {title}
              </span>
              <div className="text-[9px] text-gray-600 font-mono mt-0.5">
                {items.length} Modules Available
              </div>
            </div>
          </div>
          <div
            className={`transition-all duration-300 ${isExpanded ? "rotate-180 text-white" : "text-gray-600 group-hover:text-gray-400"}`}
          >
            <X size={16} className={isExpanded ? "" : "rotate-45"} />
          </div>
        </button>

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-1 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
            <div
              className={`grid gap-2 ${
                compact
                  ? "grid-cols-1 sm:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2"
              }`}
            >
              {items.map((model) => (
                <div
                  key={model.id}
                  className={`${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.02] border-black/5" : "bg-black/20 border-white/5"} border rounded-lg overflow-hidden hover:border-white/10 transition-all group relative ${
                    model.status === "ready"
                      ? theme.themeName?.toLowerCase() === "lucagent"
                        ? "border-green-500/30 bg-green-500/[0.02]"
                        : "border-green-500/20"
                      : ""
                  }`}
                >
                  {/* Progress Bar Background */}
                  {model.status === "downloading" && (
                    <div
                      className="absolute bottom-0 left-0 h-1 bg-white/10 w-full"
                      style={{ zIndex: 0 }}
                    >
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${model.downloadProgress || 0}%`,
                          backgroundColor: theme.hex,
                        }}
                      />
                    </div>
                  )}

                  <div className="p-2 relative z-10 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-gray-400"
                            style={{
                              color: model.status === "ready" ? theme.hex : "",
                            }}
                          >
                            {getCategoryIcon(model.category)}
                          </div>
                          <div>
                            <div
                              className={`text-xs font-bold leading-tight ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-200"}`}
                            >
                              {model.name}
                            </div>
                            <div
                              className={`text-[9px] font-mono ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-500" : "text-gray-600"}`}
                            >
                              {model.sizeFormatted}
                            </div>
                          </div>
                        </div>

                        {/* Status Indicator */}
                        {model.status === "ready" ? (
                          <div className="text-green-500 bg-green-500/10 p-1 rounded-full">
                            <Check size={10} />
                          </div>
                        ) : model.status === "downloading" ? (
                          <div
                            className="text-blue-400 animate-spin"
                            style={{ color: theme.hex }}
                          >
                            <RefreshCw size={10} />
                          </div>
                        ) : model.status === "unsupported" ? (
                          <div
                            className="text-yellow-500 bg-yellow-500/10 p-1 rounded-full"
                            title={model.unsupportedReason}
                          >
                            <AlertTriangle size={10} />
                          </div>
                        ) : null}
                      </div>

                      {!compact && (
                        <p
                          className={`text-[9px] line-clamp-2 leading-relaxed mb-1 ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-600" : "text-gray-500"}`}
                        >
                          {model.description}
                        </p>
                      )}

                      {/* Canary Test Result */}
                      {model.status === "ready" && model.canary && (
                        <div
                          className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[8px] font-mono mt-0.5 ${
                            model.canary.passed
                              ? theme.themeName?.toLowerCase() === "lucagent"
                                ? "bg-emerald-500/5 text-emerald-700"
                                : "bg-emerald-500/10 text-emerald-400"
                              : theme.themeName?.toLowerCase() === "lucagent"
                                ? "bg-yellow-500/5 text-yellow-700"
                                : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {model.canary.passed ? (
                            <>
                              <Zap size={8} />
                              <span className="truncate max-w-[140px]">
                                &ldquo;{model.canary.response}&rdquo;
                              </span>
                              <span className="opacity-60 flex-shrink-0">
                                ({model.canary.latency_ms}ms)
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={8} />
                              <span className="truncate">
                                Canary: {model.canary.error || "Failed"}
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Canary Running Indicator */}
                      {canaryTestingId === model.id && (
                        <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[8px] font-mono mt-0.5 bg-blue-500/10 text-blue-400">
                          <RefreshCw size={8} className="animate-spin" />
                          Running inference test...
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1 pt-1.5 border-t border-white/5">
                      {/* Action Buttons */}
                      {model.status === "unsupported" ? (
                        <div
                          className={`flex-1 text-center text-[9px] py-1 ${theme.themeName?.toLowerCase() === "lucagent" ? "text-yellow-600" : "text-yellow-500/80"}`}
                        >
                          ⚠️ {model.unsupportedReason || "Not supported"}
                        </div>
                      ) : model.status === "not_downloaded" ? (
                        <button
                          onClick={() => handleDownload(model.id)}
                          disabled={downloadingId !== null}
                          className={`flex-1 ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 hover:bg-black/10 text-slate-700" : "bg-white/5 hover:bg-white/10 text-gray-300"} active:scale-95 transition-all text-[9px] font-medium py-1 rounded flex items-center justify-center gap-1.5`}
                        >
                          <Download size={10} />
                          Get
                        </button>
                      ) : model.status === "ready" ? (
                        <>
                          {categoryIsActivatable(model.category) && (
                            <button
                              onClick={() => handleSetActive(model.id)}
                              className={`flex-1 transition-all text-[9px] font-medium py-1 rounded flex items-center justify-center gap-1.5 border ${
                                activeModelId === model.id
                                  ? theme.themeName?.toLowerCase() ===
                                    "lucagent"
                                    ? "bg-black/10 text-slate-900 border-black/20"
                                    : "bg-white/10 text-white border-white/20"
                                  : theme.themeName?.toLowerCase() ===
                                      "lucagent"
                                    ? "bg-transparent text-slate-500 border-transparent hover:bg-black/5"
                                    : "bg-transparent text-gray-400 border-transparent hover:bg-white/5"
                              }`}
                            >
                              {activeModelId === model.id
                                ? "Active"
                                : "Activate"}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(model.id)}
                            className="px-2 py-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete Model"
                          >
                            <Trash2 size={10} />
                          </button>
                          <button
                            onClick={() => handleCanary(model.id)}
                            disabled={canaryTestingId !== null}
                            className={`px-2 py-1 rounded transition-colors ${
                              canaryTestingId === model.id
                                ? "text-blue-400 bg-blue-500/10"
                                : "text-gray-500 hover:text-blue-400 hover:bg-blue-500/10"
                            }`}
                            title="Run Canary Test"
                          >
                            <FlaskConical size={10} />
                          </button>
                        </>
                      ) : model.status === "downloading" ? (
                        <div className="w-full text-center text-[9px] text-gray-400 font-mono">
                          {model.downloadProgress}%
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDownload(model.id)}
                          className="flex-1 bg-red-500/20 text-red-400 text-[9px] py-1 rounded flex items-center justify-center gap-1"
                        >
                          <RefreshCw size={10} /> Retry
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const categoryIsActivatable = (cat: string) => cat === "brain";

  // ─── Ollama Section State ──────────────────────────────────────────────
  const [ollamaStatus, setOllamaStatus] = useState<{
    available: boolean;
    models: { name: string; size: number }[];
    checked: boolean;
  }>({ available: false, models: [], checked: false });

  useEffect(() => {
    // Only check on desktop
    if (platform !== "desktop") return;

    // Global Guard
    if (!settingsService.isLocalDiscoveryEnabled()) {
      setOllamaStatus({ available: false, models: [], checked: true });
      return;
    }

    const checkOllama = async () => {
      try {
        const resp = await fetch("http://127.0.0.1:11434/api/tags", {
          signal: AbortSignal.timeout(3000),
        });
        if (resp.ok) {
          const data = await resp.json();
          const models = (data.models || []).map((m: any) => ({
            name: m.name as string,
            size: (m.size || 0) as number,
          }));
          setOllamaStatus({ available: true, models, checked: true });
        } else {
          setOllamaStatus({ available: false, models: [], checked: true });
        }
      } catch {
        setOllamaStatus({ available: false, models: [], checked: true });
      }
    };
    checkOllama();
  }, [platform]);

  // Detect OS for download link
  const getOllamaDownload = (): {
    os: string;
    url: string;
    label: string;
  } => {
    const ua = navigator.userAgent.toLowerCase();
    const p = navigator.platform?.toLowerCase() || "";
    if (p.includes("mac") || ua.includes("macintosh")) {
      return {
        os: "macOS",
        url: "https://ollama.com/download/mac",
        label: "Download for macOS",
      };
    }
    if (p.includes("win") || ua.includes("windows")) {
      return {
        os: "Windows",
        url: "https://ollama.com/download/windows",
        label: "Download for Windows",
      };
    }
    return {
      os: "Linux",
      url: "https://ollama.com/download/linux",
      label: "Download for Linux",
    };
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1_000_000_000)
      return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`;
    return `${bytes} B`;
  };

  const OllamaSection = () => {
    if (platform !== "desktop") return null;
    const download = getOllamaDownload();
    const isExpanded = expandedSections["Ollama (External Runtime)"];

    return (
      <div
        className={`mb-3 overflow-hidden rounded-xl border ${
          theme.themeName?.toLowerCase() === "lucagent"
            ? "border-black/5 bg-black/[0.02]"
            : "border-white/5 bg-black/20"
        } backdrop-blur-sm transition-all hover:border-white/10`}
      >
        {/* Accordion Header */}
        <button
          onClick={() => toggleSection("Ollama (External Runtime)")}
          className={`w-full flex items-center justify-between p-4 transition-all group ${
            theme.themeName?.toLowerCase() === "lucagent"
              ? "hover:bg-black/[0.03]"
              : "hover:bg-white/[0.03]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                theme.themeName?.toLowerCase() === "lucagent"
                  ? "bg-black/5"
                  : "bg-white/5"
              }`}
            >
              <Zap size={16} style={{ color: theme.hex }} />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-semibold ${
                    theme.themeName?.toLowerCase() === "lucagent"
                      ? "text-slate-800"
                      : "text-gray-200"
                  }`}
                >
                  Ollama (External Runtime)
                </span>
                {ollamaStatus.checked && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                      ollamaStatus.available
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-neutral-500/15 text-neutral-400"
                    }`}
                  >
                    {ollamaStatus.available
                      ? `Connected · ${ollamaStatus.models.length} model${ollamaStatus.models.length !== 1 ? "s" : ""}`
                      : "Not Installed"}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] ${
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "text-slate-500"
                    : "text-gray-500"
                }`}
              >
                Optimized local AI runner • Faster inference on your hardware
              </span>
            </div>
          </div>
          <span
            className={`text-xs transition-transform ${isExpanded ? "rotate-180" : ""} ${
              theme.themeName?.toLowerCase() === "lucagent"
                ? "text-slate-400"
                : "text-gray-500"
            }`}
          >
            ▼
          </span>
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-4 pb-4">
            {!ollamaStatus.checked ? (
              /* Scanning */
              <div
                className={`text-center py-6 text-xs ${
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "text-slate-400"
                    : "text-gray-500"
                } animate-pulse`}
              >
                Scanning for Ollama...
              </div>
            ) : !settingsService.isLocalDiscoveryEnabled() ? (
              /* Discovery Disabled */
              <div
                className={`rounded-lg p-4 border text-center ${
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "border-black/5 bg-black/[0.02]"
                    : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <Shield size={18} className="text-gray-500" />
                  <div>
                    <p
                      className={`text-xs font-semibold mb-1 ${
                        theme.themeName?.toLowerCase() === "lucagent"
                          ? "text-slate-800"
                          : "text-gray-200"
                      }`}
                    >
                      Local Discovery Disabled
                    </p>
                    <p
                      className={`text-[9px] mb-3 ${
                        theme.themeName?.toLowerCase() === "lucagent"
                          ? "text-slate-500"
                          : "text-gray-500"
                      }`}
                    >
                      Background pings are disabled for privacy. Click below to
                      scan your hardware for local models.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      settingsService.setLocalDiscoveryOverride(true);
                      window.location.reload(); // Refresh to trigger mount effects
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[10px] font-bold shadow-lg shadow-blue-500/20"
                    style={{ backgroundColor: theme.hex }}
                  >
                    <RefreshCw size={12} />
                    Scan Hardware
                  </button>
                </div>
              </div>
            ) : !ollamaStatus.available ? (
              /* Not Installed — Show Download Card */
              <div
                className={`rounded-lg p-4 border ${
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "border-black/5 bg-black/[0.02]"
                    : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex-shrink-0">
                    <Download size={18} className="text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold mb-1 ${
                        theme.themeName?.toLowerCase() === "lucagent"
                          ? "text-slate-800"
                          : "text-gray-200"
                      }`}
                    >
                      Install Ollama for Faster AI
                    </p>
                    <p
                      className={`text-[10px] mb-3 leading-relaxed ${
                        theme.themeName?.toLowerCase() === "lucagent"
                          ? "text-slate-500"
                          : "text-gray-500"
                      }`}
                    >
                      Ollama optimizes local model inference for your hardware.
                      Brain models will run 2-5x faster. Detected:{" "}
                      <span className="font-mono" style={{ color: theme.hex }}>
                        {download.os}
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={download.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:scale-[1.02]"
                        style={{
                          background: `${theme.hex}20`,
                          color: theme.hex,
                          border: `1px solid ${theme.hex}30`,
                        }}
                      >
                        <Download size={10} />
                        {download.label}
                      </a>
                      <button
                        onClick={async () => {
                          setOllamaStatus((s) => ({ ...s, checked: false }));
                          try {
                            const resp = await fetch(
                              "http://127.0.0.1:11434/api/tags",
                              { signal: AbortSignal.timeout(3000) },
                            );
                            if (resp.ok) {
                              const data = await resp.json();
                              const models = (data.models || []).map(
                                (m: any) => ({
                                  name: m.name as string,
                                  size: (m.size || 0) as number,
                                }),
                              );
                              setOllamaStatus({
                                available: true,
                                models,
                                checked: true,
                              });
                            } else {
                              setOllamaStatus({
                                available: false,
                                models: [],
                                checked: true,
                              });
                            }
                          } catch {
                            setOllamaStatus({
                              available: false,
                              models: [],
                              checked: true,
                            });
                          }
                        }}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] transition-all ${
                          theme.themeName?.toLowerCase() === "lucagent"
                            ? "bg-black/5 text-slate-500 hover:bg-black/10"
                            : "bg-white/5 text-gray-500 hover:bg-white/10"
                        }`}
                      >
                        <RefreshCw size={9} />
                        Re-check
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Connected — Show Models */
              <div className="space-y-2">
                {ollamaStatus.models.map((model) => (
                  <div
                    key={model.name}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      theme.themeName?.toLowerCase() === "lucagent"
                        ? "border-black/5 bg-black/[0.02]"
                        : "border-white/5 bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                        title="Running"
                      />
                      <span
                        className={`text-xs font-mono ${
                          theme.themeName?.toLowerCase() === "lucagent"
                            ? "text-slate-700"
                            : "text-gray-300"
                        }`}
                      >
                        {model.name}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono ${
                        theme.themeName?.toLowerCase() === "lucagent"
                          ? "text-slate-400"
                          : "text-gray-500"
                      }`}
                    >
                      {formatSize(model.size)}
                    </span>
                  </div>
                ))}
                <p
                  className={`text-[9px] mt-2 ${
                    theme.themeName?.toLowerCase() === "lucagent"
                      ? "text-slate-400"
                      : "text-gray-600"
                  }`}
                >
                  Luca auto-routes to Ollama when a matching model is detected.
                  Pull more models with:{" "}
                  <code
                    className={`px-1 py-0.5 rounded text-[9px] ${
                      theme.themeName?.toLowerCase() === "lucagent"
                        ? "bg-black/5"
                        : "bg-white/5"
                    }`}
                  >
                    ollama pull model-name
                  </code>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.02]" : "bg-black/20"} rounded-xl border border-white/5 p-4 max-w-3xl mx-auto backdrop-blur-md`}
    >
      <div className="flex justify-between items-center mb-6">
        <h2
          className={`flex items-center gap-2 text-lg font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-200"}`}
        >
          <Database
            size={18}
            className={
              theme.themeName?.toLowerCase() === "lucagent"
                ? "text-slate-400"
                : "text-gray-400"
            }
          />
          <span>Offline Models</span>
        </h2>
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5" : "bg-black/40"} px-3 py-1.5 rounded-full border border-white/5`}
          >
            <span
              className={`text-[10px] ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-500" : "text-gray-500"} uppercase tracking-wider`}
            >
              Storage
            </span>
            <span
              className="text-xs font-mono font-bold"
              style={{ color: theme.hex }}
            >
              {totalStorage.formatted}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <p
        className={`text-xs ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-600" : "text-gray-500"} mb-6 max-w-lg`}
      >
        Download specialized AI models to give Luca offline capabilities. These
        run entirely on your device (Local Privacy).
      </p>

      {/* Loading State */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 text-sm animate-pulse">
          Indexing local neural networks...
        </div>
      ) : (
        <div className="space-y-3">
          <RenderGrid title="Chat Brain (LLM)" items={brainModels} />
          <RenderGrid
            title="Hearing (Speech-to-Text)"
            items={sttModels}
            compact
          />
          <RenderGrid title="Vision (Eyes)" items={visionModels} />
          <RenderGrid
            title="Voice (Text-to-Speech)"
            items={ttsModels}
            compact
          />
          <RenderGrid title="Agents" items={agentModels} compact />
          <RenderGrid
            title="Memory (Embeddings)"
            items={embeddingModels}
            compact
          />
          <OllamaSection />
        </div>
      )}
    </div>
  );
};

export default ModelManager;
