/**
 * Model Manager Component
 * Unified UI for managing all local AI models on Desktop.
 */

import React, { useState, useEffect } from "react";
import { Icon } from "./ui/Icon";
import {
  modelManagerService,
  LocalModel,
} from "../services/ModelManagerService";

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
    case "brain": return <Icon name="Cpu" size={iconSize} variant="BoldDuotone" />;
    case "vision": return <Icon name="Eye" size={iconSize} variant="BoldDuotone" />;
    case "tts": return <Icon name="Volume2" size={iconSize} variant="BoldDuotone" />;
    case "stt": return <Icon name="Ear" size={iconSize} variant="BoldDuotone" />;
    case "agent": return <Icon name="System" size={iconSize} variant="BoldDuotone" />;
    case "embedding": return <Icon name="Brain" size={iconSize} variant="BoldDuotone" />;
    default: return <Icon name="Widget" size={iconSize} variant="BoldDuotone" />;
  }
};

export const ModelManager: React.FC<ModelManagerProps> = ({
  onClose,
  theme = { hex: "#f5d679ff" },
}) => {
  const [models, setModels] = useState<LocalModel[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [canaryTestingId, setCanaryTestingId] = useState<string | null>(null);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [platform] = useState<"desktop" | "mobile">(
    typeof window !== "undefined" && (window as any).Capacitor ? "mobile" : "desktop"
  );
  const [ollamaSetupStatus, setOllamaSetupStatus] = useState<{
    modelId: string | null;
    step: string;
    progress?: number;
  }>({ modelId: null, step: "" });
  const [systemSpecs, setSystemSpecs] = useState<any>(null);

  useEffect(() => {
    const loadModels = async () => {
      const all = await modelManagerService.getModels();
      setModels(all.filter((m: LocalModel) => m.platforms.includes(platform)));
      
      try {
        const specs = await modelManagerService.getSystemSpecs();
        setSystemSpecs(specs);
      } catch (e) {
        console.warn("Failed to fetch system specs in UI:", e);
      }
    };

    loadModels();

    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("luca_active_local_brain");
      if (saved) setActiveModelId(saved);
    }

    const unsubscribe = modelManagerService.subscribe((allModels: LocalModel[]) => {
      setModels(allModels.filter((m: LocalModel) => m.platforms.includes(platform)));
    });
    return () => { unsubscribe(); };
  }, [platform]);

  const handleDownload = async (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    setDownloadingId(modelId);
    try {
      if (model.runtime === "ollama") {
        setOllamaSetupStatus({ modelId, step: "Initializing..." });
        await modelManagerService.downloadModel(modelId, (p: number) => {
          setOllamaSetupStatus(s => ({ ...s, progress: p }));
        });
      } else {
        await modelManagerService.downloadModel(modelId);
      }
    } catch (e) {
      console.error("[UI] Download failed:", e);
    } finally {
      setDownloadingId(null);
      setOllamaSetupStatus({ modelId: null, step: "" });
    }
  };

  const handleDelete = async (modelId: string) => {
    const model = models.find((m) => m.id === modelId);
    if (!model) return;
    const confirmed = window.confirm(`Delete ${model.name}?`);
    if (!confirmed) return;
    await modelManagerService.refreshStatus(); 
  };

  const handleSetActive = (modelId: string) => {
    setActiveModelId(modelId);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("luca_active_local_brain", modelId);
    }
  };

  const handleCanary = async (modelId: string) => {
    setCanaryTestingId(modelId);
    await modelManagerService.runCanary(modelId);
    setCanaryTestingId(null);
  };

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "Chat Brain (LLM)": true,
  });

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const RenderGrid = ({ title, items, compact = false }: { title: string; items: LocalModel[]; compact?: boolean }) => {
    if (items.length === 0) return null;
    const isExpanded = expandedSections[title];

    return (
      <div className={`mb-3 overflow-hidden rounded-xl border ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/25 bg-white shadow-sm" : "border-white/5 bg-black/20 glass-blur"}`}>
        <button
          onClick={() => toggleSection(title)}
          className={`w-full flex items-center justify-between p-4 transition-all group ${isExpanded ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"}`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${isExpanded ? "bg-white/10 text-white" : "bg-white/5 text-gray-500"}`} style={{ color: isExpanded ? theme.hex : undefined }}>
              {getCategoryIcon(items[0].category)}
            </div>
            <div className="text-left">
              <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${isExpanded ? "text-gray-100" : "text-gray-500"}`}>
                {title}
              </span>
              <div className="text-[9px] text-gray-600 font-mono mt-0.5">{items.length} Modules Available</div>
            </div>
          </div>
          <Icon name="Close" size={16} className={`transition-all duration-300 ${isExpanded ? "rotate-180" : "rotate-45"}`} variant="BoldDuotone" />
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 pt-1 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
            <div className={`grid gap-2 ${compact ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
              {items.map((model) => (
                <div key={model.id} className={`${theme.themeName?.toLowerCase() === "lucagent" ? "bg-white border-black/25" : "bg-black/20 border-white/5"} border rounded-lg overflow-hidden relative ${model.status === "ready" ? "border-green-500/20" : "shadow-sm"}`}>
                  {model.status === "downloading" && (
                    <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full z-0">
                      <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${model.downloadProgress || 0}%`, backgroundColor: theme.hex }} />
                    </div>
                  )}

                  <div className="p-3 relative z-10 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-gray-400`} style={{ color: model.status === "ready" ? theme.hex : "" }}>
                            {getCategoryIcon(model.category)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                              {model.name}
                              {model.runtime === "ollama" && (
                                <span title="Ollama Guided" className="opacity-50 flex items-center">
                                  <Icon name="Zap" size={10} variant="BoldDuotone" />
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] font-mono text-gray-600">
                              {model.sizeFormatted} • {model.runtime === "ollama" ? "Ollama Guided" : "Internal"}
                            </div>
                          </div>
                        </div>
                        {model.status === "ready" ? (
                          <div className="text-green-500 bg-green-500/10 p-1 rounded-full"><Icon name="CheckCircle" size={10} variant="BoldDuotone" /></div>
                        ) : model.status === "downloading" ? (
                          <div className="text-blue-400 animate-spin" style={{ color: theme.hex }}><Icon name="Restart" size={10} variant="BoldDuotone" /></div>
                        ) : model.status === "unsupported" ? (
                          <div className="text-yellow-500 bg-yellow-500/10 p-1 rounded-full" title={model.unsupportedReason}><Icon name="Danger" size={10} variant="BoldDuotone" /></div>
                        ) : null}
                      </div>

                      <p className="text-[9px] text-gray-500 line-clamp-2 leading-relaxed mb-1">{model.description}</p>

                      {model.status === "ready" && model.canary && (
                        <div className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[8px] font-mono mt-1 ${model.canary.passed ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                          {model.canary.passed ? <Icon name="Zap" size={8} variant="BoldDuotone" /> : <Icon name="Danger" size={8} variant="BoldDuotone" />}
                          <span className="truncate max-w-[140px]">&ldquo;{model.canary.response}&rdquo;</span>
                          <span className="opacity-60 flex-shrink-0">({model.canary.latency_ms}ms)</span>
                        </div>
                      )}

                      {ollamaSetupStatus.modelId === model.id && (
                        <div className="flex flex-col gap-1.5 px-1.5 py-2 rounded-md text-[8px] font-mono mt-1 bg-blue-500/10 border border-blue-500/20 text-blue-400">
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1.5 capitalize animate-pulse"><Icon name="Zap" size={8} variant="BoldDuotone" />{ollamaSetupStatus.step || "Syncing weights..."}</span>
                            {ollamaSetupStatus.progress !== undefined && <span>{Math.round(ollamaSetupStatus.progress)}%</span>}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/5">
                      {model.status === "unsupported" ? (
                        <div className="flex-1 text-center text-[9px] text-yellow-500/80 italic">⚠️ {model.unsupportedReason || "Hardware mismatch"}</div>
                      ) : model.status === "not_downloaded" ? (
                        <button onClick={() => handleDownload(model.id)} disabled={downloadingId !== null} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 active:scale-95 transition-all text-[9px] font-medium py-1 rounded flex items-center justify-center gap-1.5">
                          <Icon name="Import" size={10} variant="BoldDuotone" /> Get
                        </button>
                      ) : model.status === "ready" ? (
                        <>
                          {model.category === "brain" && (
                            <button onClick={() => handleSetActive(model.id)} className={`flex-1 transition-all text-[9px] font-medium py-1 rounded flex items-center justify-center gap-1.5 border ${activeModelId === model.id ? "bg-white/10 text-white border-white/20" : "bg-transparent text-gray-400 border-transparent hover:bg-white/5"}`}>
                              {activeModelId === model.id ? "Active" : "Activate"}
                            </button>
                          )}
                          <button onClick={() => handleDelete(model.id)} className="px-2 py-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete"><Icon name="Trash" size={10} variant="BoldDuotone" /></button>
                          <button onClick={() => handleCanary(model.id)} disabled={canaryTestingId !== null} className="px-2 py-1 rounded text-gray-500 hover:text-blue-400 hover:bg-blue-500/10" title="Test"><Icon name="MagicStick" size={10} variant="BoldDuotone" /></button>
                        </>
                      ) : null}
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

  return (
    <div className={`flex flex-col h-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-slate-50" : "bg-zinc-950"} overflow-hidden`}>
      {/* HEADER WITH HARDWARE HEALTH */}
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="Cpu" size={20} className="text-blue-400" variant="BoldDuotone" />
            Sovereign Model Intelligence
          </h2>
          <p className="text-xs text-gray-400 mt-1">Manage and optimize local models for your hardware.</p>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">System Health</span>
          {systemSpecs ? (
            <div className="flex flex-col items-end">
              <span className={`text-xs font-mono ${(systemSpecs.memory?.total < 8_000_000_000) ? 'text-red-400' : 'text-green-400'}`}>
                {Math.round(systemSpecs.memory?.total / 1e9)}GB RAM · {systemSpecs.gpu || 'Internal GPU'}
              </span>
              {systemSpecs.isIntelMac && (
                <span className="text-[9px] text-amber-500 font-bold uppercase animate-pulse">
                  ⚠️ Intel Mac Constraints
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-600 animate-pulse">Calculating specs...</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <RenderGrid title="Chat Brain (LLM)" items={models.filter(m => m.category === "brain")} />
        <RenderGrid title="Vision & Astra" items={models.filter(m => m.category === "vision")} />
        <RenderGrid title="Listening (STT)" items={models.filter(m => m.category === "stt")} />
        <RenderGrid title="Voice (TTS)" items={models.filter(m => m.category === "tts")} />
        <RenderGrid title="Memory (Embedding)" items={models.filter(m => m.category === "embedding")} compact />
        
        {/* OLLAMA RUNTIME STATUS */}
        <div className={`mt-4 rounded-xl border p-4 ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/10 bg-slate-100" : "border-white/5 bg-white/[0.02]"}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon name="Zap" size={16} className="text-blue-400" variant="BoldDuotone" />
              <span className="text-xs font-bold text-gray-200">Ollama Runtime</span>
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${systemSpecs ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>
              {systemSpecs ? 'Daemon Ready' : 'Scanning...'}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Luca prioritizes Ollama for large reasoning models to ensure background stability and cross-platform compatibility.
          </p>
        </div>
      </div>

      {onClose && (
        <div className="p-4 border-t border-white/5 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-all">
            Done
          </button>
        </div>
      )}
    </div>
  );
};
