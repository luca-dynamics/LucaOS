/**
 * Model Manager Component
 * Unified UI for managing all local AI models on Desktop.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Icon } from "./ui/Icon";
import {
  modelManagerService,
  LocalModel,
} from "../services/ModelManagerService";
import { settingsService } from "../services/settingsService";

interface ModelManagerProps {
  onClose?: () => void;
  theme?: {
    hex: string;
    primary?: string;
    themeName?: string;
    isLight?: boolean;
  };
  isMobile?: boolean;
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

interface RenderGridProps {
  title: string;
  items: LocalModel[];
  compact?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
  onCanary: (id: string) => void;
  activeBrainId: string | null;
  activeEmbedId: string | null;
  downloadingId: string | null;
  canaryTestingId: string | null;
  ollamaSetupStatus: any;
  theme: any;
  isMobile?: boolean;
}

const RenderGrid: React.FC<RenderGridProps> = ({ 
  title, 
  items, 
  compact = false, 
  isExpanded, 
  onToggle,
  onDownload,
  onDelete,
  onSetActive,
  onCanary,
  activeBrainId,
  activeEmbedId,
  downloadingId,
  canaryTestingId,
  ollamaSetupStatus,
  theme,
  isMobile
}) => {
  if (items.length === 0) return null;

  return (
    <div className={`mb-3 overflow-hidden ${isMobile ? "border-x-0 border-y rounded-none" : "rounded-xl border"} shadow-sm`}
         style={{ backgroundColor: "var(--app-bg-tint)", borderColor: "var(--app-border-main)" }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="w-full flex items-center justify-between p-4 transition-all group hover:opacity-90"
      >
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--app-bg-tint)", color: isExpanded ? theme.hex : "var(--app-text-muted)" }}>
            {getCategoryIcon(items[0].category)}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span 
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: isExpanded ? "var(--app-text-main)" : "var(--app-text-muted)" }}
              >
                {title}
              </span>
            </div>
            <div 
              className="text-[9px] font-mono mt-0.5"
              style={{ color: "var(--app-text-muted)" }}
            >
              {items.length} Modules Available
            </div>
          </div>
        </div>
        <Icon name="Close" size={16} className={`transition-all duration-300 ${isExpanded ? "rotate-180" : "rotate-45"}`} style={{ color: "var(--app-text-muted)" }} variant="BoldDuotone" />
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
          <div className={`grid gap-2 ${compact ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
            {items.map((model) => (
              <div key={model.id} className={`border rounded-lg overflow-hidden relative ${model.status === "ready" ? "border-green-500/20" : "shadow-sm"}`}
                   style={{ backgroundColor: "var(--app-bg-main)", borderColor: model.status === "ready" ? undefined : "var(--app-border-main)" }}>
                {model.status === "downloading" && (
                  <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full z-0">
                    <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${model.downloadProgress || 0}%`, backgroundColor: theme.hex }} />
                  </div>
                )}

                <div className="p-3 relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: "var(--app-bg-tint)", color: model.status === "ready" ? theme.hex : "var(--app-text-muted)" }}>
                          {getCategoryIcon(model.category)}
                        </div>
                        <div>
                          <div 
                            className="text-xs font-bold flex items-center gap-1.5"
                            style={{ color: "var(--app-text-main)" }}
                          >
                            {model.name}
                            {model.runtime === "ollama" && (
                              <span title="Ollama Guided" className="opacity-50 flex items-center" style={{ color: "var(--app-text-main)" }}>
                                <Icon name="Zap" size={10} variant="BoldDuotone" />
                              </span>
                            )}
                          </div>
                          <div 
                            className="text-[9px] font-mono"
                            style={{ color: "var(--app-text-muted)" }}
                          >
                            {model.sizeFormatted} • {model.runtime === "ollama" ? "Ollama Guided" : "Internal"}
                          </div>
                        </div>
                      </div>
                      {model.status === "ready" ? (
                        <div className="text-green-500 bg-green-500/10 p-1 rounded-full"><Icon name="CheckCircle" size={10} variant="BoldDuotone" /></div>
                      ) : model.status === "downloading" ? (
                        <div className="animate-spin" style={{ color: theme.hex }}><Icon name="Restart" size={10} variant="BoldDuotone" /></div>
                      ) : model.status === "unsupported" ? (
                        <div className="text-yellow-500 bg-yellow-500/10 p-1 rounded-full" title={model.unsupportedReason}><Icon name="Danger" size={10} variant="BoldDuotone" /></div>
                      ) : null}
                    </div>

                    <p 
                      className="text-[9px] line-clamp-2 leading-relaxed mb-1"
                      style={{ color: "var(--app-text-muted)" }}
                    >
                      {model.description}
                    </p>

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
                          <span className="flex items-center gap-1.5 capitalize animate-pulse"><Icon name="Zap" size={8} variant="BoldDuotone" />{ollamaSetupStatus.step}</span>
                          {ollamaSetupStatus.progress !== undefined && ollamaSetupStatus.progress > 0 && <span style={{ color: "var(--app-text-main)" }}>{Math.round(ollamaSetupStatus.progress)}%</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t" style={{ borderColor: "var(--app-border-main)" }}>
                    {model.status === "unsupported" ? (
                      <div className="flex-1 text-center text-[9px] text-yellow-500 italic">⚠️ {model.unsupportedReason || "Hardware mismatch"}</div>
                    ) : model.status === "not_downloaded" ? (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(model.id);
                        }} 
                        disabled={downloadingId !== null} 
                        className="flex-1 active:scale-95 transition-all text-[9px] font-medium py-1 rounded flex items-center justify-center gap-1.5"
                        style={{ color: "var(--app-text-main)", backgroundColor: "var(--app-bg-tint)" }}
                      >
                        <Icon name="Import" size={10} variant="BoldDuotone" /> Get
                      </button>
                    ) : model.status === "ready" ? (
                      <>
                        {(model.category === "brain" || model.category === "embedding") && (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetActive(model.id);
                            }} 
                            className={`flex-1 transition-all text-[9px] font-medium py-1 rounded flex items-center justify-center gap-1.5 border ${
                                (model.category === "brain" ? activeBrainId === model.id : activeEmbedId === model.id) 
                                ? (theme.isLight ? "bg-red-50 border-red-200 text-red-600" : "bg-red-500/10 border-red-500/20 text-red-400") 
                                : "bg-transparent border-transparent"}`}
                            style={{ color: (model.category === "brain" ? activeBrainId === model.id : activeEmbedId === model.id) ? undefined : "var(--app-text-muted)" }}
                          >
                            {(model.category === "brain" ? activeBrainId === model.id : activeEmbedId === model.id) ? "Deactivate" : "Activate"}
                          </button>
                        )}
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(model.id);
                          }} 
                          className="px-2 py-1 rounded hover:text-red-400 hover:bg-red-500/10 transition-colors" 
                          style={{ color: "var(--app-text-muted)" }}
                          title="Delete"
                        >
                          <Icon name="Trash" size={10} variant="BoldDuotone" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCanary(model.id);
                          }} 
                          disabled={canaryTestingId !== null} 
                          className={`px-2 py-1 rounded transition-all ${canaryTestingId === model.id ? "text-blue-400 bg-blue-500/10 animate-pulse" : "hover:text-blue-400 hover:bg-blue-500/10"}`} 
                          style={{ color: canaryTestingId === model.id ? "var(--app-blue)" : "var(--app-text-muted)" }}
                          title="Test"
                        >
                          <Icon name={canaryTestingId === model.id ? "Restart" : "MagicStick"} size={10} className={canaryTestingId === model.id ? "animate-spin" : ""} variant="BoldDuotone" />
                        </button>
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

export const ModelManager: React.FC<ModelManagerProps> = ({
  theme = { hex: "#f5d679ff" },
  isMobile,
}) => {
  const [models, setModels] = useState<LocalModel[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [canaryTestingId, setCanaryTestingId] = useState<string | null>(null);
  const [activeBrainId, setActiveBrainId] = useState<string | null>(null);
  const [activeEmbedId, setActiveEmbedId] = useState<string | null>(null);
  const [isOllamaRunning, setIsOllamaRunning] = useState(false);
  const [platform, setPlatform] = useState<"desktop" | "mobile">("desktop");
  
  useEffect(() => {
    const updatePlatform = () => {
      const isElectron = typeof window !== "undefined" && (window as any).electron;
      const isCapacitor = typeof window !== "undefined" && (window as any).Capacitor;
      
      if (isElectron) {
        setPlatform("desktop");
      } else {
        const isSmallScreen = window.innerWidth < 1024;
        setPlatform(isCapacitor || isSmallScreen ? "mobile" : "desktop");
      }
    };

    updatePlatform();
    window.addEventListener("resize", updatePlatform);
    return () => window.removeEventListener("resize", updatePlatform);
  }, []);

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

        const ollama = await modelManagerService.getOllamaModels();
        setIsOllamaRunning(ollama.available);
      } catch (e) {
        console.warn("Failed to fetch system specs in UI:", e);
      }
    };

    loadModels();

    const pollId = setInterval(async () => {
      const status = await modelManagerService.getOllamaModels();
      setIsOllamaRunning(status.available);
    }, 10000);

    const settings = settingsService.getSettings();
    if (settings.general) {
        if (settings.general.activeBrainId) {
            setActiveBrainId(settings.general.activeBrainId);
        }
        if (settings.general.activeEmbedId) {
            setActiveEmbedId(settings.general.activeEmbedId);
        } else if (settings.brain.embeddingModel) {
            const id = settings.brain.embeddingModel.includes('/') ? settings.brain.embeddingModel.split('/')[1] : settings.brain.embeddingModel;
            setActiveEmbedId(id);
        }
    }

    const unsubscribe = modelManagerService.subscribe((allModels: LocalModel[]) => {
      setModels(allModels.filter((m: LocalModel) => m.platforms.includes(platform)));
    });
    return () => { 
      unsubscribe(); 
      clearInterval(pollId);
    };
  }, [platform]);

  const handleDownload = useCallback(async (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    setDownloadingId(modelId);
    try {
      if (model.runtime === "ollama") {
        setOllamaSetupStatus({ modelId, step: "Initializing..." });
        await modelManagerService.downloadModel(modelId, (step: string, p: number) => {
          setOllamaSetupStatus(s => ({ ...s, step, progress: p }));
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
  }, [models]);

  const handleDelete = useCallback(async (modelId: string) => {
    const model = models.find((m) => m.id === modelId);
    if (!model) return;
    const confirmed = window.confirm(`Irreversibly purge ${model.name} from local storage?`);
    if (!confirmed) return;
    await modelManagerService.deleteModel(modelId);
  }, [models]);

  const handleSetActive = useCallback(async (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    if (model.category === "brain") {
        const nextId = activeBrainId === modelId ? null : modelId;
        setActiveBrainId(nextId);
        await modelManagerService.activateModel(nextId, "brain");
    } else if (model.category === "embedding") {
        const nextId = activeEmbedId === modelId ? null : modelId;
        setActiveEmbedId(nextId);
        await modelManagerService.activateModel(nextId, "embedding");
    }
  }, [activeBrainId, activeEmbedId, models]);

  const handleCanary = useCallback(async (modelId: string) => {
    setCanaryTestingId(modelId);
    await modelManagerService.runCanary(modelId);
    setCanaryTestingId(null);
  }, []);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "Chat Brain (via Ollama)": true,
    "Memory Gateway (RAG)": true,
  });

  const toggleSection = useCallback((title: string) => {
    setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
  }, []);

  const brainModels = useMemo(() => models.filter(m => m.category === "brain"), [models]);
  const visionModels = useMemo(() => models.filter(m => m.category === "vision"), [models]);
  const sttModels = useMemo(() => models.filter(m => m.category === "stt"), [models]);
  const ttsModels = useMemo(() => models.filter(m => m.category === "tts"), [models]);
  const embedModels = useMemo(() => models.filter(m => m.category === "embedding"), [models]);

  return (
    <div className="flex flex-col min-h-[500px] rounded-xl overflow-hidden" style={{ backgroundColor: "var(--app-bg-main, #09090b)" }}>
      {/* HEADER WITH HARDWARE HEALTH */}
      <div className={`${isMobile ? "p-4 py-8 flex-col gap-4" : "p-6 justify-between items-center"} border-b flex`}
           style={{ borderColor: "var(--app-border-main)", backgroundColor: "var(--app-bg-tint)" }}>
        <div className="min-w-0">
          <h2 
            className={`${isMobile ? "text-lg" : "text-xl"} font-bold flex items-center gap-2 truncate`}
            style={{ color: "var(--app-text-main)" }}
          >
            <Icon name="Cpu" size={isMobile ? 18 : 20} className="text-blue-400 flex-shrink-0" variant="BoldDuotone" />
            Sovereign Intelligence
          </h2>
          <p 
            className={`${isMobile ? "text-[10px]" : "text-xs"} mt-1 truncate opacity-70`}
            style={{ color: "var(--app-text-muted)" }}
          >
            Manage and optimize local models for your hardware.
          </p>
        </div>
        
        <div className={`flex flex-col ${isMobile ? "items-start" : "items-end"} gap-1.5`}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span 
                className="text-[9px] uppercase tracking-[0.3em] font-black"
                style={{ color: "var(--app-text-muted)" }}
            >
                Hardware Telemetry
            </span>
          </div>
          {systemSpecs ? (
            <div className={`flex flex-col ${isMobile ? "items-start" : "items-end"} gap-1`}>
              <div className="flex items-center gap-3">
                 <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                       style={{ backgroundColor: "var(--app-bg-tint)", borderColor: "var(--app-border-main)", color: (systemSpecs.memory?.total < 8_000_000_000) ? '#f87171' : 'var(--app-text-main)' }}>
                    {Math.round(systemSpecs.memory?.total / 1e9)}GB RAM
                 </span>
                 <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                       style={{ backgroundColor: "var(--app-bg-tint)", borderColor: "var(--app-border-main)", color: "var(--app-text-main)" }}>
                    {systemSpecs.gpu?.split('(')[0].trim() || 'Core_Compute'}
                 </span>
              </div>
              {systemSpecs.isIntelMac && (
                <div className="flex items-center gap-1 text-[8px] text-amber-500 font-black uppercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 mt-1">
                  <Icon name="Danger" size={8} variant="BoldDuotone" />
                  Legacy Intel Architecture Detection
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
                <div className="w-12 h-3 bg-white/5 animate-pulse rounded" />
                <div className="w-20 h-3 bg-white/5 animate-pulse rounded" />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <RenderGrid 
          title="Chat Brain (via Ollama)" 
          items={brainModels} 
          isExpanded={!!expandedSections["Chat Brain (via Ollama)"]}
          onToggle={() => toggleSection("Chat Brain (via Ollama)")}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onSetActive={handleSetActive}
          onCanary={handleCanary}
          activeBrainId={activeBrainId}
          activeEmbedId={activeEmbedId}
          downloadingId={downloadingId}
          canaryTestingId={canaryTestingId}
          ollamaSetupStatus={ollamaSetupStatus}
          theme={theme}
          isMobile={isMobile}
        />
        <RenderGrid 
          title="Vision & Astra Scan" 
          items={visionModels} 
          isExpanded={!!expandedSections["Vision & Astra Scan"]}
          onToggle={() => toggleSection("Vision & Astra Scan")}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onSetActive={handleSetActive}
          onCanary={handleCanary}
          activeBrainId={activeBrainId}
          activeEmbedId={activeEmbedId}
          downloadingId={downloadingId}
          canaryTestingId={canaryTestingId}
          ollamaSetupStatus={ollamaSetupStatus}
          theme={theme}
          isMobile={isMobile}
        />
        <RenderGrid 
          title="Listening (STT)" 
          items={sttModels} 
          isExpanded={!!expandedSections["Listening (STT)"]}
          onToggle={() => toggleSection("Listening (STT)")}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onSetActive={handleSetActive}
          onCanary={handleCanary}
          activeBrainId={activeBrainId}
          activeEmbedId={activeEmbedId}
          downloadingId={downloadingId}
          canaryTestingId={canaryTestingId}
          ollamaSetupStatus={ollamaSetupStatus}
          theme={theme}
          isMobile={isMobile}
        />
        <RenderGrid 
          title="Voice (TTS)" 
          items={ttsModels} 
          isExpanded={!!expandedSections["Voice (TTS)"]}
          onToggle={() => toggleSection("Voice (TTS)")}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onSetActive={handleSetActive}
          onCanary={handleCanary}
          activeBrainId={activeBrainId}
          activeEmbedId={activeEmbedId}
          downloadingId={downloadingId}
          canaryTestingId={canaryTestingId}
          ollamaSetupStatus={ollamaSetupStatus}
          theme={theme}
          isMobile={isMobile}
        />
        <RenderGrid 
          title="Memory Gateway (RAG)" 
          items={embedModels} 
          compact 
          isExpanded={!!expandedSections["Memory Gateway (RAG)"]}
          onToggle={() => toggleSection("Memory Gateway (RAG)")}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onSetActive={handleSetActive}
          onCanary={handleCanary}
          activeBrainId={activeBrainId}
          activeEmbedId={activeEmbedId}
          downloadingId={downloadingId}
          canaryTestingId={canaryTestingId}
          ollamaSetupStatus={ollamaSetupStatus}
          theme={theme}
          isMobile={isMobile}
        />
        
        {/* OLLAMA RUNTIME STATUS */}
        <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "var(--app-border-main)", backgroundColor: "var(--app-bg-tint)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon name="Zap" size={16} className="text-blue-400" variant="BoldDuotone" />
              <span 
                className="text-xs font-bold"
                style={{ color: "var(--app-text-main)" }}
              >
                Ollama Runtime
              </span>
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${isOllamaRunning ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {isOllamaRunning ? 'Daemon Online' : 'Daemon Offline'}
            </span>
          </div>
          <p 
            className="text-[10px] leading-relaxed"
            style={{ color: "var(--app-text-muted)" }}
          >
            Sovereign Brain operations require the Ollama daemon to be active. 
            Ensure your local server is running for autonomous reasoning.
          </p>
        </div>
      </div>
    </div>
  );
};
