import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Cpu,
  Eye,
  Database,
  Activity,
  Zap,
  Scale,
  Sparkles,
} from "lucide-react";
import { LucaSettings } from "../../services/settingsService";
import { ModelManager } from "../ModelManager";
import { modelManager, LocalModel } from "../../services/ModelManagerService";

interface SettingsBrainTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme: {
    primary: string;
    hex: string;
    themeName: string;
  };
}

const SettingsBrainTab: React.FC<SettingsBrainTabProps> = ({
  settings,
  onUpdate,
  theme,
}) => {
  // Load local models
  const [localBrainModels, setLocalBrainModels] = useState<LocalModel[]>([]);
  const [localVisionModels, setLocalVisionModels] = useState<LocalModel[]>([]);
  const [localEmbeddingModels, setLocalEmbeddingModels] = useState<
    LocalModel[]
  >([]);

  useEffect(() => {
    const loadLocalModels = async () => {
      const models = await modelManager.getModels();
      setLocalBrainModels(
        models.filter((m) => m.category === "brain" && m.status === "ready"),
      );
      setLocalVisionModels(
        models.filter((m) => m.category === "vision" && m.status === "ready"),
      );
      setLocalEmbeddingModels(
        models.filter(
          (m) => m.category === "embedding" && m.status === "ready",
        ),
      );
    };
    loadLocalModels();

    const unsubscribe = modelManager.subscribe((allModels) => {
      setLocalBrainModels(
        allModels.filter((m) => m.category === "brain" && m.status === "ready"),
      );
      setLocalVisionModels(
        allModels.filter(
          (m) => m.category === "vision" && m.status === "ready",
        ),
      );
      setLocalEmbeddingModels(
        allModels.filter(
          (m) => m.category === "embedding" && m.status === "ready",
        ),
      );
    });
    return () => unsubscribe();
  }, []);

  const applyPreset = async (type: "performance" | "balanced" | "privacy") => {
    if (type === "performance") {
      onUpdate("brain", "model", "gemini-3.1-pro-high");
      onUpdate("brain", "visionModel", "gemini-3.1-pro-low");
      onUpdate("brain", "memoryModel", "gemini-2.0-flash");
    } else if (type === "balanced") {
      onUpdate("brain", "model", "gemini-3-flash");

      const bestVision = await modelManager.getOptimalModel(
        "vision",
        "accuracy",
      );
      if (bestVision) onUpdate("brain", "visionModel", bestVision.id);

      const bestMemory = await modelManager.getOptimalModel(
        "embedding",
        "accuracy",
      );
      if (bestMemory) onUpdate("brain", "memoryModel", bestMemory.id);
    } else if (type === "privacy") {
      const bestBrain = await modelManager.getOptimalModel("brain", "accuracy");
      if (bestBrain) onUpdate("brain", "model", bestBrain.id);

      const bestVision = await modelManager.getOptimalModel(
        "vision",
        "efficiency",
      );
      if (bestVision) onUpdate("brain", "visionModel", bestVision.id);

      const bestMemory = await modelManager.getOptimalModel(
        "embedding",
        "efficiency",
      );
      if (bestMemory) onUpdate("brain", "memoryModel", bestMemory.id);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  // Intelligence Status detection
  const currentModel = settings.brain.model;
  const isLocalSelected = currentModel.startsWith("local");
  const hasCloudKey = !!settings.brain.geminiApiKey;
  const isRoutingToLocal = !isLocalSelected && !hasCloudKey;

  const statusLabel = isLocalSelected || isRoutingToLocal ? "LOCAL" : "CLOUD";
  const statusColor = statusLabel === "CLOUD" ? theme.hex : "#10b981"; // Primary hex or Green

  // Ollama Service State
  const [ollamaStatus, setOllamaStatus] = useState<{
    available: boolean;
    installed: boolean;
  }>({ available: false, installed: false });
  const [isRefreshingOllama, setIsRefreshingOllama] = useState(false);

  const refreshOllama = async () => {
    setIsRefreshingOllama(true);
    const status = await modelManager.getOllamaModels();
    const installed = await modelManager.isOllamaInstalled();
    setOllamaStatus({ available: status.available, installed });
    setIsRefreshingOllama(false);
  };

  useEffect(() => {
    refreshOllama();
  }, []);

  return (
    <div className="space-y-6 max-h-[420px] pr-2 mt-2">
      {/* Intelligence Status Badge */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light" : "glass-panel"} tech-border p-3 flex items-center justify-between`}
        style={{
          borderColor:
            theme.themeName?.toLowerCase() === "lucagent"
              ? "rgba(0,0,0,0.1)"
              : `${theme.hex}33`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-1.5 rounded-lg ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5" : "bg-white/5"}`}
          >
            <Shield className="w-4 h-4" style={{ color: statusColor }} />
          </div>
          <div
            className={`text-[10px] uppercase tracking-wider font-mono ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-500" : "text-gray-400"}`}
          >
            INTELLIGENCE MODE
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRoutingToLocal && !isLocalSelected && (
            <span className="text-[8px] text-yellow-500 font-bold animate-pulse">
              AUTOPILOT
            </span>
          )}
          <div
            className="px-2 py-1 rounded text-[10px] font-black tracking-tighter border"
            style={{
              backgroundColor: `${statusColor}15`,
              color: statusColor,
              borderColor: `${statusColor}33`,
            }}
          >
            {statusLabel}
          </div>
        </div>
      </motion.div>

      {/* Strategic Presets Section */}
      <motion.div variants={item} className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" style={{ color: theme.hex }} />
          <h4
            className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-500" : "text-gray-400"} uppercase tracking-widest`}
          >
            Intelligence Presets
          </h4>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              id: "performance",
              label: "Ultra Intelligence",
              icon: Zap,
              desc: "Deep cloud reasoning",
            },
            {
              id: "balanced",
              label: "Balanced",
              icon: Scale,
              desc: "Cloud brain, local eyes",
            },
            {
              id: "privacy",
              label: "Full Privacy",
              icon: Shield,
              desc: "100% Offline brain",
            },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id as any)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/5 bg-black/5 hover:bg-black/10" : "border-white/5 bg-white/5 hover:bg-white/10"} transition-all text-center group`}
              style={{
                borderColor:
                  (preset.id === "performance" &&
                    settings.brain.model === "gemini-3-pro-preview") ||
                  (preset.id === "balanced" &&
                    settings.brain.model === "gemini-3-flash-preview" &&
                    !settings.brain.visionModel.startsWith("gemini")) ||
                  (preset.id === "privacy" &&
                    !settings.brain.model.startsWith("gemini") &&
                    !settings.brain.model.includes("gpt") &&
                    !settings.brain.model.includes("claude"))
                    ? `${theme.hex}aa`
                    : theme.themeName?.toLowerCase() === "lucagent"
                      ? "transparent"
                      : "rgba(255,255,255,0.05)",
              }}
            >
              <preset.icon
                className="w-4 h-4 mb-2 group-hover:scale-110 transition-transform"
                style={{
                  color:
                    (preset.id === "performance" &&
                      settings.brain.model === "gemini-3-pro-preview") ||
                    (preset.id === "balanced" &&
                      settings.brain.model === "gemini-3-flash-preview" &&
                      !settings.brain.visionModel.startsWith("gemini")) ||
                    (preset.id === "privacy" &&
                      !settings.brain.model.startsWith("gemini") &&
                      !settings.brain.model.includes("gpt") &&
                      !settings.brain.model.includes("claude"))
                      ? theme.hex
                      : "#6b7280",
                }}
              />
              <span
                className={`text-[9px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-900" : "text-gray-300"}`}
              >
                {preset.label}
              </span>
              <span
                className={`text-[7px] ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-600" : "text-gray-500"} uppercase mt-1`}
              >
                {preset.desc}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {/* Intelligence Card */}
        <motion.div
          variants={item}
          className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light" : "glass-panel"} tech-border p-4 space-y-3`}
        >
          <div className="flex items-center justify-between">
            <Cpu className="w-4 h-4" style={{ color: theme.hex }} />
            <div className="text-[9px] font-mono text-gray-500 uppercase">
              Core Intelligence
            </div>
          </div>
          <div className="space-y-1">
            <div
              className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-500" : "text-gray-400"} uppercase tracking-tighter`}
            >
              Core Intelligence
            </div>
            {settings.brain.model.includes("/") === false && (
              <p className="text-[9px] text-gray-500 leading-tight">
                Unified managed intelligence gateway providing access to the
                world&apos;s most powerful LLMs.
              </p>
            )}
            <select
              value={(() => {
                const knownModels = [
                  "gemini-3.1-pro-high",
                  "gemini-3.1-pro-low",
                  "gemini-3-pro-high",
                  "gemini-3-pro-low",
                  "gemini-3-flash",
                  "claude-4.5-sonnet",
                  "claude-4.5-sonnet-thinking",
                  "claude-4.6-sonnet-thinking",
                  "claude-4.6-opus-thinking",
                ];
                const isKnown =
                  knownModels.includes(settings.brain.model) ||
                  localBrainModels.some((m) => m.id === settings.brain.model);
                // If it's a known model, use it. If not (it's custom), show "custom" selected.
                return isKnown ? settings.brain.model : "custom";
              })()}
              onChange={(e) => onUpdate("brain", "model", e.target.value)}
              className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 border-black/10 text-gray-900" : "bg-black/40 border-white/10 text-white"} rounded-lg p-2 text-xs outline-none transition-colors`}
            >
              <optgroup label="Cloud Intelligence (Managed)">
                <option value="gemini-3.1-pro-high">
                  Gemini 3.1 Pro (High) New
                </option>
                <option value="gemini-3.1-pro-low">
                  Gemini 3.1 Pro (Low) New
                </option>
                <option value="gemini-3-pro-high">Gemini 3 Pro (High)</option>
                <option value="gemini-3-pro-low">Gemini 3 Pro (Low)</option>
                <option value="gemini-3-flash">Gemini 3 Flash</option>
                <option value="claude-4.5-sonnet">Claude Sonnet 4.5</option>
                <option value="claude-4.5-sonnet-thinking">
                  Claude Sonnet 4.5 (Thinking)
                </option>
                <option value="claude-4.6-sonnet-thinking">
                  Claude Sonnet 4.6 (Thinking)
                </option>
                <option value="claude-4.6-opus-thinking">
                  Claude Opus 4.6 (Thinking)
                </option>
              </optgroup>
              {localBrainModels.length > 0 && (
                <optgroup label="Local Models (Offline)">
                  {localBrainModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} - {m.sizeFormatted}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Advanced">
                <option value="custom">Custom / External (Ollama)</option>
              </optgroup>
            </select>

            {/* Custom Model Input Logic */}
            {(() => {
              const knownModels = [
                "gemini-3.1-pro-high",
                "gemini-3.1-pro-low",
                "gemini-3-pro-high",
                "gemini-3-pro-low",
                "gemini-3-flash",
                "claude-4.5-sonnet",
                "claude-4.5-sonnet-thinking",
                "claude-4.6-sonnet-thinking",
                "claude-4.6-opus-thinking",
                "custom",
              ];
              // Check if current model is known (Cloud or Local)
              const isKnown =
                knownModels.includes(settings.brain.model) ||
                localBrainModels.some((m) => m.id === settings.brain.model);

              // If model is NOT known, or explicitly set to "custom", show input
              const showInput = !isKnown || settings.brain.model === "custom";

              return showInput ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="pt-2"
                >
                  <div className="text-[9px] text-gray-500 mb-1 uppercase tracking-wider">
                    External Model ID (Ollama)
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. mistral, deepseek-coder, llama3:70b"
                    // If model is "custom" (placeholder from select), show empty to prompt typing.
                    // Otherwise show the actual custom model name (e.g. "mistral")
                    value={
                      settings.brain.model === "custom"
                        ? ""
                        : settings.brain.model
                    }
                    onChange={(e) => onUpdate("brain", "model", e.target.value)}
                    className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 border-yellow-500/50 text-yellow-700 placeholder-black/20" : "bg-black/40 border-yellow-500/30 text-yellow-500 placeholder-white/20"} rounded-lg p-2 text-xs outline-none focus:border-yellow-500/60 transition-colors`}
                  />
                  <div className="text-[8px] text-gray-600 mt-1">
                    Runs on standard Ollama port 11434
                  </div>
                </motion.div>
              ) : null;
            })()}
          </div>
        </motion.div>

        {/* Vision Card */}
        <motion.div
          variants={item}
          className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light" : "glass-panel"} tech-border p-4 space-y-3`}
        >
          <div className="flex items-center justify-between">
            <Eye className="w-4 h-4" style={{ color: theme.hex }} />
            <div className="text-[9px] font-mono text-gray-500 uppercase">
              Vision & Multimodal
            </div>
          </div>
          <div className="space-y-1">
            <div
              className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-500" : "text-gray-400"} uppercase tracking-tighter`}
            >
              Vision Engine
            </div>
            <p className="text-[9px] text-gray-500 leading-tight">
              Controls screenshots, screen analysis, and spatial reasoning.
            </p>
            <select
              value={settings.brain.visionModel || "gemini-3-flash-preview"}
              onChange={(e) => onUpdate("brain", "visionModel", e.target.value)}
              className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 border-black/10 text-gray-900" : "bg-black/40 border-white/10 text-white"} rounded-lg p-2 text-xs outline-none transition-colors`}
            >
              <optgroup label="Cloud Vision (Managed)">
                <option value="gemini-3-flash-preview">
                  Gemini 3 Flash (RECOMMENDED)
                </option>
                <option value="gemini-3-pro-preview">Gemini 3 Pro</option>
              </optgroup>
              {localVisionModels.length > 0 && (
                <optgroup label="Local Vision (Offline)">
                  {localVisionModels.map((m) => {
                    const isIntelMac = (window as any).luca?.isIntelMac;
                    const isWindows = (window as any).luca?.isWindows;
                    const isRestricted =
                      (isIntelMac || isWindows) && m.id === "ui-tars-2b";

                    return (
                      <option key={m.id} value={m.id} disabled={isRestricted}>
                        {m.name}{" "}
                        {isRestricted
                          ? "(Restricted on CPU)"
                          : `- ${m.sizeFormatted}`}
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>
          </div>
        </motion.div>

        {/* Memory Gateway */}
        <motion.div
          variants={item}
          className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light" : "glass-panel"} tech-border p-4 space-y-3`}
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-500" />
            <div
              className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-400"} uppercase tracking-tighter`}
            >
              Memory Gateway (RAG)
            </div>
          </div>
          <p
            className={`text-[9px] ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-600" : "text-gray-500"} leading-tight`}
          >
            Self-evolving neural memory architecture that optimizes retrieval
            based on your session history.
          </p>
          <select
            value={settings.brain.memoryModel || "gemini-1.5-pro"}
            onChange={(e) => onUpdate("brain", "memoryModel", e.target.value)}
            className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 border-black/10 text-gray-900" : "bg-black/40 border-white/10 text-white"} rounded-lg p-2 text-xs outline-none transition-colors`}
          >
            <optgroup label="Cloud Embedding (Fast)">
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="gemini-2.0-flash">
                Gemini 2.0 Flash (RECOMMENDED)
              </option>
            </optgroup>
            {localEmbeddingModels.length > 0 && (
              <optgroup label="Local Embedding (Offline)">
                {localEmbeddingModels.map((m) => {
                  const isIntelMac = (window as any).luca?.isIntelMac;
                  const isWindows = (window as any).luca?.isWindows;
                  const isRestricted =
                    (isIntelMac || isWindows) && m.id === "bge-small-en";

                  return (
                    <option key={m.id} value={m.id} disabled={isRestricted}>
                      {m.name} {isRestricted ? "(Restricted on CPU)" : ""}
                    </option>
                  );
                })}
              </optgroup>
            )}
          </select>
        </motion.div>

        {/* Quota Intelligence Card */}
        <motion.div
          variants={item}
          className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light" : "glass-panel"} tech-border p-4 space-y-3`}
        >
          <div className="flex items-center justify-between">
            <Activity className="w-4 h-4" style={{ color: theme.hex }} />
            <div className="text-[8px] font-mono text-green-500 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
              OPTIMIZED
            </div>
          </div>
          <div className="space-y-2">
            <div
              className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-400"} uppercase tracking-tighter`}
            >
              Load Balancer
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "25%" }}
                className="h-full"
                style={{ backgroundColor: theme.hex }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono">
              <span className="text-gray-500">AVG LATENCY</span>
              <span style={{ color: theme.hex }}>240ms</span>
            </div>
            <div
              className={`text-[8px] ${theme.themeName?.toLowerCase() === "lucagent" ? "text-black/60" : "text-gray-600"} font-mono leading-tight`}
            >
              Auto-balancing traffic between cloud and local agents for optimum
              response time.
            </div>
          </div>
        </motion.div>

        {/* Ollama Service Card */}
        <motion.div
          variants={item}
          className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light" : "glass-panel"} tech-border p-4 space-y-3`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap
                className="w-4 h-4"
                style={{
                  color: ollamaStatus.available ? "#10b981" : "#6b7280",
                }}
              />
              <div
                className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-400"} uppercase tracking-tighter`}
              >
                Ollama Service
              </div>
            </div>
            <div
              className={`text-[8px] font-mono ${ollamaStatus.available ? "text-green-500" : "text-gray-500"} flex items-center gap-1`}
            >
              <span
                className={`w-1 h-1 rounded-full ${ollamaStatus.available ? "bg-green-500 animate-pulse" : "bg-gray-500"}`}
              />
              {ollamaStatus.available ? "RUNNING" : "OFFLINE"}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            {!ollamaStatus.available ? (
              ollamaStatus.installed ? (
                <button
                  onClick={async () => {
                    await modelManager.startOllama();
                    setTimeout(refreshOllama, 3000);
                  }}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all"
                >
                  Start Service
                </button>
              ) : (
                <button
                  onClick={async () => {
                    await modelManager.installOllama();
                    setTimeout(refreshOllama, 5000);
                  }}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all"
                >
                  Install Ollama
                </button>
              )
            ) : (
              <div className="text-[9px] text-gray-500 italic">
                Service active on port 11434
              </div>
            )}
            <button
              onClick={refreshOllama}
              disabled={isRefreshingOllama}
              className="p-1.5 hover:bg-white/5 rounded-lg transition-all"
            >
              <Activity
                className={`w-3 h-3 text-gray-400 ${isRefreshingOllama ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Creativity / Heat Pool */}
      <motion.div
        variants={item}
        className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light" : "glass-panel"} tech-border p-4 space-y-3`}
      >
        <div
          className={`flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-400"}`}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-yellow-500" />
            Temperature (Creativity Control)
          </div>
          <span
            className="font-mono"
            style={{
              color: theme.themeName?.toLowerCase() === "lucagent" ? "#000" : theme.hex,
            }}
          >
            {settings.brain.temperature}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={settings.brain.temperature}
          onChange={(e) =>
            onUpdate("brain", "temperature", parseFloat(e.target.value))
          }
          className={`w-full h-1 ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/10" : "bg-white/10"} rounded-lg appearance-none cursor-pointer`}
          style={{ accentColor: theme.hex }}
        />
      </motion.div>

      {/* Model Manager Manager */}
      <motion.div variants={item} className="pt-2">
        <ModelManager theme={theme} />
      </motion.div>
    </div>
  );
};

export default SettingsBrainTab;
