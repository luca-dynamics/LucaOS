import React, { useEffect, useState } from "react";
import { Icon } from "../ui/Icon";
import { probeOllamaViaRuntimeFacade, type OllamaRuntimeProbeResult } from "../../services/local-models/ollamaRuntimeProbe";
import { probeCortexViaRuntimeFacade, type CortexRuntimeProbeResult } from "../../services/local-models/cortexRuntimeProbe";
import { canaryChatViaRuntimeFacade } from "../../services/local-models/ollamaRuntimeOps";
import { getHardwareRamSummary, getUnifiedModelHardwarePolicy } from "../../services/local-models/HardwareRamTierService";
import { settingsService } from "../../services/settingsService";
import { localModelLibrary as modelManager } from "../../services/local-models/LocalModelLibrary";
import {
  lucaMaterialCardStyle,
} from "../../styles/lucaMaterialSystem";

const HERO_INK = "#2b303a";
const HERO_INK_2 = "#5b636f";
const HERO_ACCENT = "#3d8fa6";

function getModelBrandBadge(tag: string): { logo?: string; icon?: string; monogram?: string; color: string } {
  const t = tag.toLowerCase();
  if (t.includes("qwen")) return { logo: "/icons/brands/qwen.svg", color: "#615ced" };
  if (t.includes("llama") || t.includes("meta")) return { logo: "/icons/brands/meta.svg", color: "#0467df" };
  if (t.includes("deepseek") || t.includes("janus")) return { logo: "/icons/brands/deepseek.svg", color: "#4d6bfe" };
  if (t.includes("mistral")) return { logo: "/icons/brands/mistral.svg", color: "#ff7000" };
  if (t.includes("gemma") || t.includes("gemini")) return { logo: "/icons/brands/gemini-color.svg", color: "#4285f4" };
  if (t.includes("phi") || t.includes("microsoft")) return { logo: "/icons/brands/microsoft.svg", color: "#00a4ef" };
  if (t.includes("nomic")) return { logo: "/icons/brands/nomic.svg", color: "#00c853" };
  if (t.includes("lfm") || t.includes("liquid")) return { logo: "/icons/brands/liquid.svg", color: "#00d2ff" };
  if (t.includes("minicpm") || t.includes("openbmb")) return { logo: "/icons/brands/openbmb.svg", color: "#10b981" };
  if (t.includes("moondream")) return { logo: "/icons/brands/moondream.svg", color: "#8b5cf6" };
  if (t.includes("whisper") || t.includes("gpt")) return { logo: "/icons/brands/openai.svg", color: "#10a37f" };
  if (t.includes("claude") || t.includes("anthropic")) return { logo: "/icons/brands/anthropic.svg", color: "#d97706" };
  if (t.includes("kokoro") || t.includes("piper")) return { icon: "Volume2", color: "#ec4899" };
  if (t.includes("cortex")) return { monogram: "C", color: "#3d8fa6" };
  return { icon: "Cpu", color: "#6b7280" };
}

export function OnboardingLocalModelPanel() {
  const [activeRuntime, setActiveRuntime] = useState<"ollama" | "cortex">("ollama");
  const [ollamaProbe, setOllamaProbe] = useState<OllamaRuntimeProbeResult | null>(null);
  const [cortexProbe, setCortexProbe] = useState<CortexRuntimeProbeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"brain" | "vision" | "stt" | "tts" | "omni_voice" | "memory">("brain");

  const ramSummary = getHardwareRamSummary();

  const [serviceModels, setServiceModels] = useState<{
    brain: string;
    vision: string;
    stt: string;
    tts: string;
    omni_voice: string;
    memory: string;
  }>(() => {
    try {
      const b = settingsService.getSettings()?.brain;
      const v = settingsService.getSettings()?.voice;
      return {
        brain: b?.brainModel || "qwen2.5:7b",
        vision: b?.visionModel || "qwen3-vl:8b",
        stt: v?.sttModel || "whisper:small",
        tts: v?.voiceId || "kokoro:v1",
        omni_voice: v?.voiceModel || "cortex-omni-v1",
        memory: b?.embeddingModel || "nomic-embed-text:latest",
      };
    } catch {
      return {
        brain: "qwen2.5:7b",
        vision: "qwen3-vl:8b",
        stt: "whisper:small",
        tts: "kokoro:v1",
        omni_voice: "cortex-omni-v1",
        memory: "nomic-embed-text:latest",
      };
    }
  });

  const checkStatus = async () => {
    setLoading(true);
    try {
      const [oRes, cRes] = await Promise.all([
        probeOllamaViaRuntimeFacade({ force: true }).catch(() => ({ available: false, models: [], checkedAt: Date.now() })),
        probeCortexViaRuntimeFacade({ force: true }).catch(() => ({ available: false, models: [], checkedAt: Date.now() })),
      ]);
      setOllamaProbe(oRes);
      setCortexProbe(cRes);
      if (cRes.available && !oRes.available) {
        setActiveRuntime("cortex");
      }
    } catch {
      setOllamaProbe({ available: false, models: [], checkedAt: Date.now() });
      setCortexProbe({ available: false, models: [], checkedAt: Date.now() });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const [setupProgress, setSetupProgress] = useState<{
    inProgress: boolean;
    step: string;
    progress: number;
    completed: boolean;
    error?: string;
  }>({
    inProgress: false,
    step: "",
    progress: 0,
    completed: false,
  });

  const handleSetupActiveModel = async () => {
    const selectedModelTag = serviceModels[activeTab];
    if (!selectedModelTag) return;

    setSetupProgress({
      inProgress: true,
      step: `Connecting to ${activeRuntime === "ollama" ? "Ollama" : "Cortex"} runtime...`,
      progress: 5,
      completed: false,
    });

    try {
      if (activeRuntime === "ollama") {
        if (typeof window === "undefined" || !(window as any).electron?.ipcRenderer) {
          setSetupProgress({
            inProgress: false,
            step: "Desktop app required to pull Ollama models",
            progress: 0,
            completed: false,
            error: "Electron desktop app required for local downloads.",
          });
          return;
        }

        const ipc = (window as any).electron.ipcRenderer;

        const statusHandler = (_: any, data: { step: string; progress?: number }) => {
          if (data && data.step) {
            setSetupProgress((prev) => ({
              ...prev,
              inProgress: true,
              step: data.step,
              progress: typeof data.progress === "number" ? Math.min(100, Math.max(0, data.progress)) : prev.progress,
            }));
          }
        };

        const unbindStatus = ipc.on("ollama-setup-status", statusHandler);
        const unbindInstall = ipc.on("ollama-install-status", statusHandler);

        const success = await ipc.invoke("setup-ollama-for-model", {
          modelId: selectedModelTag,
          tag: selectedModelTag,
        });

        if (typeof unbindStatus === "function") unbindStatus();
        if (typeof unbindInstall === "function") unbindInstall();
        try {
          ipc.removeListener("ollama-setup-status", statusHandler);
          ipc.removeListener("ollama-install-status", statusHandler);
        } catch {}

        if (success) {
          setSetupProgress({
            inProgress: true,
            step: `Testing ${selectedModelTag} responsiveness...`,
            progress: 90,
            completed: false,
          });

          const canary = await canaryChatViaRuntimeFacade({ model: selectedModelTag }).catch(() => ({ ok: false, text: "Canary timeout" }));

          setSetupProgress({
            inProgress: false,
            step: canary.ok ? `${selectedModelTag} ready & verified` : `${selectedModelTag} downloaded (canary pending)`,
            progress: 100,
            completed: true,
          });
          checkStatus();
        } else {
          setSetupProgress({
            inProgress: false,
            step: `Failed to download ${selectedModelTag}`,
            progress: 0,
            completed: false,
            error: "Setup failed",
          });
        }
      } else {
        setSetupProgress({
          inProgress: true,
          step: `Connecting to Cortex manager...`,
          progress: 10,
          completed: false,
        });

        const allModels = modelManager.getAllModels();
        const matched = allModels.find(m => m.id === selectedModelTag || m.name.toLowerCase().includes(selectedModelTag.toLowerCase()));
        const targetId = matched?.id || selectedModelTag;

        const success = await modelManager.downloadModel(targetId, (step, progress) => {
          setSetupProgress({
            inProgress: true,
            step,
            progress: progress || 20,
            completed: false,
          });
        });

        if (success) {
          setSetupProgress({
            inProgress: false,
            step: `${selectedModelTag} ready & verified`,
            progress: 100,
            completed: true,
          });
          checkStatus();
        } else {
          setSetupProgress({
            inProgress: false,
            step: `Cortex download failed for ${selectedModelTag}`,
            progress: 0,
            completed: false,
            error: "Cortex setup failed",
          });
        }
      }
    } catch (err) {
      console.error("[OnboardingLocalModelPanel] Setup error:", err);
      setSetupProgress({
        inProgress: false,
        step: `Error: ${err instanceof Error ? err.message : String(err)}`,
        progress: 0,
        completed: false,
        error: String(err),
      });
    }
  };

  const handleSelectModelForService = async (service: "brain" | "vision" | "stt" | "tts" | "omni_voice" | "memory", modelTag: string) => {
    const updated = { ...serviceModels, [service]: modelTag };
    setServiceModels(updated);

    try {
      const settings = settingsService.getSettings();
      const currentBrain = settings?.brain || {};
      const currentGeneral = settings?.general || {};
      const currentVoice = settings?.voice || {};

      if (service === "brain") {
        await settingsService.saveSettings({
          general: { ...currentGeneral, activeBrainId: modelTag } as any,
          brain: { ...currentBrain, model: modelTag } as any,
        });
      } else if (service === "vision") {
        await settingsService.saveSettings({
          brain: { ...currentBrain, visionModel: modelTag } as any,
        });
      } else if (service === "stt") {
        await settingsService.saveSettings({
          voice: { ...currentVoice, sttModel: modelTag } as any,
        });
      } else if (service === "tts") {
        await settingsService.saveSettings({
          voice: { ...currentVoice, voiceId: modelTag } as any,
        });
      } else if (service === "omni_voice") {
        await settingsService.saveSettings({
          voice: { ...currentVoice, voiceModel: modelTag } as any,
        });
      } else if (service === "memory") {
        await settingsService.saveSettings({
          brain: { ...currentBrain, embeddingModel: modelTag, memoryModel: modelTag } as any,
        });
      }
    } catch (err) {
      console.warn("[OnboardingLocalModelPanel] Failed saving local model for service", err);
    }
  };

  const [customTagInput, setCustomTagInput] = useState("");
  const [userAddedTags, setUserAddedTags] = useState<Record<string, string[]>>({
    brain: [],
    vision: [],
    stt: [],
    tts: [],
    omni_voice: [],
    memory: [],
  });

  const activeProbe = activeRuntime === "ollama" ? ollamaProbe : cortexProbe;
  const installedModels = activeProbe?.models || [];
  
  const categorizedInstalled = {
    brain: installedModels.filter(m => !m.includes("embed") && !m.includes("llava") && !m.includes("-vl") && !m.includes("whisper") && !m.includes("tts")),
    vision: installedModels.filter(m => m.includes("llava") || m.includes("-vl") || m.includes("vision")),
    stt: installedModels.filter(m => m.includes("whisper") || m.includes("stt")),
    tts: installedModels.filter(m => m.includes("tts") || m.includes("kokoro") || m.includes("piper")),
    omni_voice: installedModels.filter(m => m.includes("omni") || m.includes("realtime") || m.includes("audio")),
    memory: installedModels.filter(m => m.includes("embed") || m.includes("minilm") || m.includes("bge")),
  };

  const defaults = {
    brain: activeRuntime === "ollama"
      ? ["qwen2.5:7b", "llama3.2:3b", "deepseek-r1:7b", "mistral:7b"]
      : ["cortex-brain-v1", "cortex-coder-7b", "cortex-phi4:14b"],
    vision: activeRuntime === "ollama"
      ? ramSummary.totalRamGb >= 32
        ? ["qwen3-vl:8b (12GB)", "llama3.2-vision:11b (16GB)", "qwen3-vl:30b (32GB)", "llama3.2-vision:90b (64GB)", "minicpm-v:8b (8GB)"]
        : ["minicpm-v:8b (8GB)", "qwen3-vl:8b (12GB)", "llama3.2-vision:11b (16GB)", "moondream:latest (4GB)"]
      : ["cortex-vision-v1", "cortex-llava-v1.6"],
    stt: ["whisper:small", "whisper:medium", "system-stt"],
    tts: ["kokoro:v1", "piper:en_US-lessac", "system-tts"],
    omni_voice: ["cortex-omni-v1", "gemini-3.6-flash", "gpt-4o-realtime"],
    memory: ["nomic-embed-text:latest", "all-minilm:latest", "mxbai-embed-large:latest"],
  };

  // Merge discovered installed models, user added custom tags, and curated defaults
  const currentCategoryModels = Array.from(
    new Set([
      ...(userAddedTags[activeTab] || []),
      ...(categorizedInstalled[activeTab] || []),
      ...defaults[activeTab],
    ])
  );

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (!trimmed) return;

    setUserAddedTags((prev) => ({
      ...prev,
      [activeTab]: Array.from(new Set([...(prev[activeTab] || []), trimmed])),
    }));
    handleSelectModelForService(activeTab, trimmed);
    setCustomTagInput("");
  };

  const serviceTabConfig = [
    { id: "brain", label: "Brain", icon: "Cpu" },
    { id: "vision", label: "Vision", icon: "Eye" },
    { id: "stt", label: "STT", icon: "Mic" },
    { id: "tts", label: "TTS", icon: "Volume2" },
    { id: "omni_voice", label: "Native Voice", icon: "Radio" },
    { id: "memory", label: "Memory", icon: "HardDrive" },
  ] as const;

  return (
    <div
      style={{
        ...lucaMaterialCardStyle,
        width: "100%",
        padding: "12px 14px",
        marginTop: 6,
        borderRadius: 12,
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Header, Runtime Switcher & Status Pill */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, minWidth: 0, flexShrink: 1, maxWidth: "100%" }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              flexShrink: 0,
              background: activeProbe?.available ? "#10b981" : "#f59e0b",
              boxShadow: activeProbe?.available
                ? "0 0 8px rgba(16, 185, 129, 0.4)"
                : "0 0 8px rgba(245, 158, 11, 0.3)",
            }}
          />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--luca-text-primary, var(--app-text-main, inherit))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {loading
              ? "Probing local runtimes..."
              : activeProbe?.available
              ? `${activeRuntime === "ollama" ? "Ollama" : "Cortex Native"} Active (${activeProbe.models.length} model${activeProbe.models.length === 1 ? "" : "s"})`
              : `${activeRuntime === "ollama" ? "Ollama (11434)" : "Cortex (39281)"} offline`}
          </span>
          <span
            title={ramSummary.displayLabel}
            style={{
              fontSize: 9.5,
              padding: "2px 7px",
              borderRadius: 5,
              background: "rgba(56, 189, 248, 0.18)",
              color: "var(--luca-accent-primary, #38bdf8)",
              fontWeight: 700,
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 3.5,
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flexShrink: 0,
            }}
          >
            <Icon name={(ramSummary as any).iconName || "Cpu"} size={10} color="var(--luca-accent-primary, #38bdf8)" />
            <span>{ramSummary.totalRamGb}GB RAM</span>
          </span>
        </div>

        {/* Runtime Selector Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--luca-material-surface-hover, var(--luca-surface-hover, rgba(0,0,0,0.05)))", padding: "2px 4px", borderRadius: 6, border: "1px solid var(--luca-material-border, var(--luca-border-subtle, rgba(0,0,0,0.12)))", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setActiveRuntime("ollama")}
            style={{
              border: "none",
              background: activeRuntime === "ollama" ? HERO_ACCENT : "transparent",
              color: activeRuntime === "ollama" ? "#fff" : "var(--luca-text-secondary, var(--app-text-muted, #64748b))",
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 7px",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Ollama
          </button>
          <button
            type="button"
            onClick={() => setActiveRuntime("cortex")}
            style={{
              border: "none",
              background: activeRuntime === "cortex" ? HERO_ACCENT : "transparent",
              color: activeRuntime === "cortex" ? "#fff" : "var(--luca-text-secondary, var(--app-text-muted, #64748b))",
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 7px",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Cortex
          </button>
          <button
            type="button"
            onClick={checkStatus}
            title="Refresh runtime status"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              marginLeft: 2,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 2,
            }}
          >
            <Icon name="RotateCw" size={10} color={HERO_ACCENT} />
          </button>
        </div>
      </div>

      {/* Service Tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, background: "var(--luca-material-surface-hover, var(--luca-surface-hover, rgba(0,0,0,0.05)))", padding: 3, borderRadius: 8, border: "1px solid var(--luca-material-border, var(--luca-border-subtle, rgba(0, 0, 0, 0.12)))" }}>
        {serviceTabConfig.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: "1 1 auto",
                padding: "4px 8px",
                borderRadius: 6,
                fontSize: 10.5,
                fontWeight: isActive ? 650 : 550,
                cursor: "pointer",
                border: "none",
                color: isActive ? "#ffffff" : "var(--luca-text-secondary, var(--app-text-muted, #64748b))",
                background: isActive ? HERO_ACCENT : "transparent",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                whiteSpace: "nowrap",
                transition: "all 120ms ease",
              }}
            >
              <Icon name={tab.icon} size={11} color={isActive ? "#ffffff" : "var(--luca-text-secondary, var(--app-text-muted, #64748b))"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Model Selection for Active Service */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--luca-text-secondary, var(--app-text-muted, #64748b))" }}>
          {activeProbe?.available
            ? `Detected ${serviceTabConfig.find(t=>t.id===activeTab)?.label} models on your device:`
            : `Preferred ${serviceTabConfig.find(t=>t.id===activeTab)?.label} model tag (auto-pulled on setup):`}
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {currentCategoryModels.map((tag) => {
            const isSelected = serviceModels[activeTab] === tag;
            const policy = getUnifiedModelHardwarePolicy(tag);
            const badge = getModelBrandBadge(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleSelectModelForService(activeTab, tag)}
                style={{
                  flex: "1 1 auto",
                  padding: "4px 9px",
                  borderRadius: 6,
                  fontSize: 10.5,
                  fontWeight: isSelected ? 650 : 550,
                  cursor: "pointer",
                  color: isSelected ? "#ffffff" : "var(--luca-text-primary, var(--app-text-main, inherit))",
                  background: isSelected
                    ? HERO_ACCENT
                    : "var(--luca-material-surface-hover, var(--luca-surface-hover, rgba(0, 0, 0, 0.05)))",
                  border: isSelected
                    ? `1px solid ${HERO_ACCENT}`
                    : "1px solid var(--luca-material-border, var(--luca-border-subtle, rgba(0, 0, 0, 0.12)))",
                  boxShadow: isSelected ? "none" : "0 1px 2px rgba(0,0,0,0.06)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  transition: "all 120ms ease",
                }}
              >
                <span
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 3,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                    background: isSelected ? "rgba(255,255,255,0.25)" : badge.color,
                    color: "#ffffff",
                    fontSize: 8.5,
                    fontWeight: 700,
                  }}
                >
                  {badge.logo ? (
                    <img
                      src={badge.logo}
                      alt=""
                      style={{
                        width: 10,
                        height: 10,
                        objectFit: "contain",
                        filter: badge.logo.includes("gemini") ? "none" : "brightness(0) invert(1)",
                      }}
                    />
                  ) : badge.icon ? (
                    <Icon name={badge.icon} size={9} color="#fff" />
                  ) : (
                    badge.monogram
                  )}
                </span>
                <span>{tag}</span>
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 999,
                    background: policy.badgeColor,
                    flexShrink: 0,
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* Custom Local Model Tag Input for Power Users */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
          <input
            type="text"
            value={customTagInput}
            onChange={(e) => setCustomTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddCustomTag();
            }}
            placeholder={`+ Power User Custom Tag (e.g. phi4:latest, codestral:22b)...`}
            style={{
              flex: 1,
              padding: "5px 9px",
              borderRadius: 6,
              fontSize: 10.5,
              fontFamily: "monospace",
              border: "1px dashed var(--luca-material-border, var(--luca-border-subtle, rgba(0, 0, 0, 0.2)))",
              background: "var(--luca-material-surface-hover, var(--luca-surface-hover, rgba(0, 0, 0, 0.04)))",
              color: "var(--luca-text-primary, var(--app-text-main, inherit))",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={handleAddCustomTag}
            disabled={!customTagInput.trim()}
            style={{
              padding: "5px 9px",
              borderRadius: 6,
              fontSize: 10.5,
              fontWeight: 600,
              cursor: customTagInput.trim() ? "pointer" : "default",
              color: "#ffffff",
              background: customTagInput.trim() ? HERO_ACCENT : "rgba(0,0,0,0.08)",
              border: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              opacity: customTagInput.trim() ? 1 : 0.5,
              whiteSpace: "nowrap",
            }}
          >
            <Icon name="Plus" size={10} color="#fff" />
            <span>Add Tag</span>
          </button>
        </div>
      </div>

      {/* Live Setup & Download Progress Bar */}
      {setupProgress.inProgress && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4, padding: "8px 10px", borderRadius: 8, background: "var(--luca-material-surface-hover, var(--luca-surface-hover, rgba(0,0,0,0.05)))", border: "1px solid var(--luca-material-border, var(--luca-border-subtle, rgba(0,0,0,0.12)))" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, fontWeight: 600, color: "var(--luca-text-primary, var(--app-text-main, inherit))" }}>
            <span>{setupProgress.step}</span>
            <span>{setupProgress.progress}%</span>
          </div>
          <div style={{ width: "100%", height: 6, borderRadius: 999, background: "rgba(0,0,0,0.12)", overflow: "hidden" }}>
            <div
              style={{
                width: `${setupProgress.progress}%`,
                height: "100%",
                background: setupProgress.completed ? "#10b981" : HERO_ACCENT,
                borderRadius: 999,
                transition: "width 200ms ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Auto-Setup & Download Action Button */}
      {(() => {
        const selectedTag = serviceModels[activeTab];
        const isInstalledOnDaemon = Boolean(
          activeProbe?.available &&
          activeProbe.models.some((m) => m === selectedTag || m.startsWith(selectedTag) || selectedTag.startsWith(m))
        );
        const isReady = isInstalledOnDaemon || setupProgress.completed;

        return (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 10, color: isReady ? "#10b981" : "var(--luca-text-secondary, var(--app-text-muted, #64748b))", fontWeight: 500 }}>
              {isReady ? "✓ Model ready & verified on device" : "Pulls & installs model automatically"}
            </span>
            <button
              type="button"
              disabled={setupProgress.inProgress}
              onClick={handleSetupActiveModel}
              style={{
                flex: "1 1 auto",
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 10.5,
                fontWeight: 650,
                cursor: setupProgress.inProgress ? "not-allowed" : "pointer",
                color: "#ffffff",
                background: isReady ? "#10b981" : HERO_ACCENT,
                border: "none",
                boxShadow: isReady ? "0 2px 8px rgba(16, 185, 129, 0.3)" : "0 2px 8px rgba(61, 143, 166, 0.3)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                opacity: setupProgress.inProgress ? 0.7 : 1,
                transition: "all 120ms ease",
              }}
            >
              {setupProgress.inProgress ? (
                <>
                  <Icon name="RefreshCw" size={11} className="animate-spin" />
                  <span>Setting up {selectedTag}...</span>
                </>
              ) : isReady ? (
                <>
                  <Icon name="CheckCircle" size={11} color="#fff" />
                  <span>Ready & Tested</span>
                </>
              ) : (
                <>
                  <Icon name="Download" size={11} color="#fff" />
                  <span>Set Up & Test {selectedTag}</span>
                </>
              )}
            </button>
          </div>
        );
      })()}
    </div>
  );
}

const PROVIDER_OPTIONS = [
  { id: "openai", name: "OpenAI", keyProp: "openaiApiKey", placeholder: "sk-proj-...", logo: "/icons/brands/openai.svg", color: "#10A37F" },
  { id: "anthropic", name: "Anthropic", keyProp: "anthropicApiKey", placeholder: "sk-ant-...", logo: "/icons/brands/anthropic.svg", color: "#D97706" },
  { id: "gemini", name: "Google Gemini", keyProp: "geminiApiKey", placeholder: "AIzaSy...", logo: "/icons/brands/gemini-color.svg", color: "#4285F4" },
  { id: "deepseek", name: "DeepSeek", keyProp: "deepseekApiKey", placeholder: "sk-...", logo: "/icons/brands/deepseek.svg", color: "#4D6BFE" },
  { id: "kimi", name: "Kimi (Moonshot)", keyProp: "kimiApiKey", placeholder: "sk-...", monogram: "K", color: "#1E88E5" },
  { id: "groq", name: "Groq", keyProp: "groqApiKey", placeholder: "gsk_...", logo: "/icons/brands/grok.svg", color: "#F55036" },
  { id: "openrouter", name: "OpenRouter", keyProp: "openRouterApiKey", placeholder: "sk-or-v1-...", monogram: "O", color: "#6366F1" },
  { id: "custom", name: "+ Custom / OpenAI-Compatible", keyProp: "customOpenAiCompatibleApiKey", placeholder: "sk-custom-... (optional for local)", icon: "Plus", color: "#8B5CF6" },
] as const;

export function OnboardingBYOKPanel() {
  const [activeProvider, setActiveProvider] = useState<string>("openai");
  const [keyValues, setKeyValues] = useState<Record<string, string>>(() => {
    try {
      const brain = settingsService.getSettings()?.brain || {};
      const initial: Record<string, string> = {};
      for (const p of PROVIDER_OPTIONS) {
        initial[p.id] = (brain as any)[p.keyProp] || "";
      }
      return initial;
    } catch {
      return {};
    }
  });
  const [customUrl, setCustomUrl] = useState<string>(() => {
    try {
      return settingsService.getSettings()?.brain?.customOpenAiCompatibleBaseUrl || "";
    } catch {
      return "";
    }
  });
  const [customModel, setCustomModel] = useState<string>(() => {
    try {
      return settingsService.getSettings()?.brain?.customOpenAiCompatibleModel || "";
    } catch {
      return "";
    }
  });

  const [showKey, setShowKey] = useState(false);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);

  const currentProviderConfig =
    PROVIDER_OPTIONS.find((p) => p.id === activeProvider) || PROVIDER_OPTIONS[0];

  const handleKeyChange = async (val: string) => {
    const updated = { ...keyValues, [activeProvider]: val };
    setKeyValues(updated);

    try {
      const settings = settingsService.getSettings();
      const currentBrain = settings?.brain || {};
      await settingsService.saveSettings({
        brain: {
          ...currentBrain,
          [currentProviderConfig.keyProp]: val,
        } as any,
      });
      setSavedStatus(`Saved ${currentProviderConfig.name} key`);
      setTimeout(() => setSavedStatus(null), 2000);
    } catch (err) {
      console.warn("[OnboardingBYOKPanel] Error saving provider key", err);
    }
  };

  const handleCustomFieldChange = async (fields: { url?: string; key?: string; model?: string }) => {
    const newUrl = fields.url !== undefined ? fields.url : customUrl;
    const newKey = fields.key !== undefined ? fields.key : (keyValues["custom"] || "");
    const newModel = fields.model !== undefined ? fields.model : customModel;

    setCustomUrl(newUrl);
    setCustomModel(newModel);
    setKeyValues((prev) => ({ ...prev, custom: newKey }));

    try {
      const settings = settingsService.getSettings();
      const currentBrain = settings?.brain || {};
      await settingsService.saveSettings({
        brain: {
          ...currentBrain,
          customOpenAiCompatibleBaseUrl: newUrl,
          customOpenAiCompatibleApiKey: newKey,
          customOpenAiCompatibleModel: newModel,
        } as any,
      });
      setSavedStatus("Saved Custom Endpoint");
      setTimeout(() => setSavedStatus(null), 2000);
    } catch (err) {
      console.warn("[OnboardingBYOKPanel] Error saving custom endpoint settings", err);
    }
  };

  return (
    <div
      style={{
        ...lucaMaterialCardStyle,
        width: "100%",
        padding: "12px 14px",
        marginTop: 6,
        borderRadius: 12,
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Provider Tabs with Brand Logos */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {PROVIDER_OPTIONS.map((p) => {
          const isActive = p.id === activeProvider;
          const hasKey = p.id === "custom"
            ? Boolean(customUrl.trim() || keyValues["custom"]?.trim() || customModel.trim())
            : Boolean(keyValues[p.id]?.trim());
          const logoSrc = "logo" in p ? p.logo : undefined;
          const iconName = "icon" in p ? p.icon : undefined;
          const monogramLetter = "monogram" in p ? p.monogram : p.name[0];

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveProvider(p.id)}
              style={{
                flex: "1 1 auto",
                padding: "4px 8px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: isActive ? 650 : 550,
                whiteSpace: "nowrap",
                cursor: "pointer",
                color: isActive ? "#ffffff" : "var(--luca-text-primary, var(--app-text-main, inherit))",
                background: isActive
                  ? HERO_ACCENT
                  : "var(--luca-material-surface-hover, var(--luca-surface-hover, rgba(0, 0, 0, 0.05)))",
                border: isActive
                  ? `1px solid ${HERO_ACCENT}`
                  : "1px solid var(--luca-material-border, var(--luca-border-subtle, rgba(0, 0, 0, 0.12)))",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                transition: "all 120ms ease",
              }}
            >
              {/* Brand Logo Badge */}
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                  background: logoSrc ? (isActive ? "rgba(255,255,255,0.25)" : p.color) : p.color,
                  color: "#ffffff",
                  fontSize: 8.5,
                  fontWeight: 700,
                  padding: logoSrc ? 1 : 0,
                }}
              >
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      filter: logoSrc.includes("gemini") ? "none" : "brightness(0) invert(1)",
                    }}
                  />
                ) : iconName ? (
                  <Icon name={iconName} size={9} color="#fff" />
                ) : (
                  monogramLetter
                )}
              </span>

              <span>{p.name}</span>

              {hasKey && (
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    background: isActive ? "#ffffff" : "#10b981",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Input Fields for Selected Provider */}
      {activeProvider === "custom" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ fontSize: 10.5, fontWeight: 600, color: "var(--luca-text-primary, var(--app-text-main, inherit))" }}>
              Custom OpenAI-Compatible Endpoint Settings:
            </label>
            {savedStatus && (
              <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Icon name="Check" size={10} color="#10b981" />
                <span>{savedStatus}</span>
              </span>
            )}
          </div>

          {/* Base URL */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9.5, color: "var(--luca-text-secondary, var(--app-text-muted, #64748b))", fontWeight: 550 }}>
              Base URL / Endpoint:
            </span>
            <input
              type="text"
              value={customUrl}
              onChange={(e) => handleCustomFieldChange({ url: e.target.value })}
              placeholder="e.g. http://localhost:1234/v1 or https://api.together.xyz/v1"
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: 7,
                fontSize: 11,
                fontFamily: "monospace",
                border: "1px solid var(--luca-material-border, var(--luca-border-subtle, rgba(0, 0, 0, 0.15)))",
                background: "var(--luca-material-surface-hover, var(--luca-surface-hover, rgba(0, 0, 0, 0.05)))",
                color: "var(--luca-text-primary, var(--app-text-main, inherit))",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* API Key & Model Name row */}
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 9.5, color: "var(--luca-text-secondary, var(--app-text-muted, #64748b))", fontWeight: 550 }}>
                API Key (optional for local):
              </span>
              <div style={{ position: "relative", width: "100%" }}>
                <input
                  type={showKey ? "text" : "password"}
                  value={keyValues["custom"] || ""}
                  onChange={(e) => handleCustomFieldChange({ key: e.target.value })}
                  placeholder="sk-custom-..."
                  style={{
                    width: "100%",
                    padding: "6px 28px 6px 9px",
                    borderRadius: 7,
                    fontSize: 11,
                    fontFamily: "monospace",
                    border: "1px solid var(--luca-material-border, var(--luca-border-subtle, rgba(0, 0, 0, 0.15)))",
                    background: "var(--luca-material-surface-hover, var(--luca-surface-hover, rgba(0, 0, 0, 0.05)))",
                    color: "var(--luca-text-primary, var(--app-text-main, inherit))",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((prev) => !prev)}
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    padding: 2,
                    opacity: 0.8,
                  }}
                >
                  <Icon name={showKey ? "EyeOff" : "Eye"} size={12} color="var(--luca-text-secondary, var(--app-text-muted, #64748b))" />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 9.5, color: "var(--luca-text-secondary, var(--app-text-muted, #64748b))", fontWeight: 550 }}>
                Model Tag / Name:
              </span>
              <input
                type="text"
                value={customModel}
                onChange={(e) => handleCustomFieldChange({ model: e.target.value })}
                placeholder="e.g. llama-3.3-70b-instruct"
                style={{
                  width: "100%",
                  padding: "6px 9px",
                  borderRadius: 7,
                  fontSize: 11,
                  fontFamily: "monospace",
                  border: "1px solid var(--luca-material-border, var(--luca-border-subtle, rgba(0, 0, 0, 0.15)))",
                  background: "var(--luca-material-surface-hover, var(--luca-surface-hover, rgba(0, 0, 0, 0.05)))",
                  color: "var(--luca-text-primary, var(--app-text-main, inherit))",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--luca-text-primary, var(--app-text-main, inherit))" }}>
              {currentProviderConfig.name} API Key:
            </label>
            {savedStatus && (
              <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Icon name="Check" size={10} color="#10b981" />
                <span>{savedStatus}</span>
              </span>
            )}
          </div>
          <div style={{ position: "relative", width: "100%" }}>
            <input
              type={showKey ? "text" : "password"}
              value={keyValues[activeProvider] || ""}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder={currentProviderConfig.placeholder}
              style={{
                width: "100%",
                padding: "7px 32px 7px 10px",
                borderRadius: 8,
                fontSize: 11.5,
                fontFamily: "monospace",
                border: "1px solid var(--luca-material-border, var(--luca-border-subtle, rgba(0, 0, 0, 0.15)))",
                background: "var(--luca-material-surface-hover, var(--luca-surface-hover, rgba(0, 0, 0, 0.05)))",
                color: "var(--luca-text-primary, var(--app-text-main, inherit))",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => setShowKey((prev) => !prev)}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 2,
                opacity: 0.8,
              }}
            >
              <Icon name={showKey ? "EyeOff" : "Eye"} size={13} color="var(--luca-text-secondary, var(--app-text-muted, #64748b))" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
