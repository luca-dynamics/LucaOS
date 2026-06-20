import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Icon } from "../ui/Icon";
import { LucaSettings, settingsService } from "../../services/settingsService";
import { modelManager, LocalModel } from "../../services/ModelManagerService";
import { SettingsAdvancedDisclosure } from "./SettingsLayout";
import { lucaCapabilities } from "../../config/lucaReleaseTarget";
import { WebUnavailableState } from "../ui/WebUnavailableState";

interface SettingsBrainTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme: {
    hex: string;
    primary: string;
    border: string;
    bg: string;
    themeName?: string;
    isLight?: boolean;
  };
  isMobile?: boolean;
}

const SettingsBrainTab: React.FC<SettingsBrainTabProps> = ({
  settings,
  onUpdate,
  theme,
  isMobile,
}) => {
  // Load local models
  const [localBrainModels, setLocalBrainModels] = useState<LocalModel[]>([]);
  const [localEmbeddingModels, setLocalEmbeddingModels] = useState<
    LocalModel[]
  >([]);

  useEffect(() => {
    if (!lucaCapabilities.localModelScan) return;

    const loadLocalModels = async () => {
      const models = await modelManager.getModels();
      setLocalBrainModels(
        models.filter((m) => m.category === "brain" && m.status === "ready"),
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
      setLocalEmbeddingModels(
        allModels.filter(
          (m) => m.category === "embedding" && m.status === "ready",
        ),
      );
    });
    return () => unsubscribe();
  }, []);

  const applyPreset = async (type: "performance" | "balanced" | "privacy") => {
    // 1. Determine active/best cloud provider
    const currentModelId = settings.brain.model.toLowerCase();
    let activeProvider: "gemini" | "openai" | "anthropic" | "xai" | "deepseek" =
      "gemini";

    if (currentModelId.includes("deepseek")) activeProvider = "deepseek";
    else if (currentModelId.includes("gpt") || currentModelId.includes("o1"))
      activeProvider = "openai";
    else if (currentModelId.includes("claude")) activeProvider = "anthropic";
    else if (currentModelId.includes("grok") || currentModelId.includes("xai"))
      activeProvider = "xai";
    else if (currentModelId.startsWith("gemini")) activeProvider = "gemini";
    else {
      // Fallback if current is local or unknown
      activeProvider = settingsService.getBestAvailableCloudProvider();
    }

    // 2. Map strategies to specific model IDs per provider
    const modelMap = {
      gemini: {
        performance: "gemini-3.1-pro-preview",
        balanced: "gemini-3-flash-preview",
      },
      anthropic: {
        performance: "claude-4.5-sonnet-thinking",
        balanced: "claude-4.5-sonnet",
      },
      openai: {
        performance: "o1-preview",
        balanced: "gpt-4o",
      },
      deepseek: {
        performance: "deepseek-reasoner",
        balanced: "deepseek-chat",
      },
      xai: {
        performance: "grok-2-1212",
        balanced: "grok-2-1212",
      },
    };

    if (type === "performance") {
      const targetModel = modelMap[activeProvider].performance;
      onUpdate("brain", "model", targetModel);
      onUpdate("brain", "visionModel", targetModel);
      onUpdate("brain", "memoryModel", "gemini-2.5-flash");
    } else if (type === "balanced") {
      const targetModel = modelMap[activeProvider].balanced;
      onUpdate("brain", "model", targetModel);

      // Balanced uses local eyes if available
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
  const isLocalSelected =
    currentModel.startsWith("local") ||
    currentModel.includes("gemma") ||
    currentModel.includes("llama") ||
    currentModel.includes("phi") ||
    currentModel.includes("qwen");

  const hasCloudKey =
    !settings.brain.useCustomApiKey || settingsService.hasValidCloudKeys();
  const isRoutingToLocal = !isLocalSelected && !hasCloudKey;

  // Badge should reflect intended configuration (CLOUD vs LOCAL)
  const statusLabel = isLocalSelected ? "LOCAL" : "CLOUD";
  const statusColor = statusLabel === "CLOUD" ? theme.hex : "#10b981"; // Primary hex or Green

  const toggleIntelligenceMode = () => {
    if (statusLabel === "CLOUD") {
      applyPreset("privacy");
    } else {
      applyPreset("performance");
    }
  };

  const [ollamaStatus, setOllamaStatus] = useState<{
    available: boolean;
    installed: boolean;
  }>({ available: false, installed: false });
  const [isRefreshingOllama, setIsRefreshingOllama] = useState(false);

  // --- DYNAMIC LOAD BALANCER STATE ---
  const [balancerStatus, setBalancerStatus] = useState({
    label: "OPTIMIZED",
    color: "text-[var(--luca-success,#4fbf7a)]",
    dotColor: "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]",
  });
  const [avgLatency, setAvgLatency] = useState(240);

  // --- API VERIFICATION STATE ---
  const [verificationStatus, setVerificationStatus] = useState<
    Record<string, { loading: boolean; result?: string; error?: string }>
  >({});

  const verifyProvider = async (
    providerId: string,
    apiKey: string,
    model: string,
    baseUrl?: string,
  ) => {
    setVerificationStatus((prev) => ({
      ...prev,
      [providerId]: { loading: true },
    }));
    try {
      const { ProviderFactory } =
        await import("../../services/llm/ProviderFactory");
      // Create a targeted config override for validation
      const check = await ProviderFactory.validateSpecificKey(
        providerId,
        apiKey,
        model,
        baseUrl,
      );

      if (check.valid) {
        setVerificationStatus((prev) => ({
          ...prev,
          [providerId]: { loading: false, result: "Valid" },
        }));
      } else {
        setVerificationStatus((prev) => ({
          ...prev,
          [providerId]: { loading: false, error: check.message },
        }));
      }
    } catch (e: any) {
      setVerificationStatus((prev) => ({
        ...prev,
        [providerId]: { loading: false, error: e.message || "Failed" },
      }));
    }
  };

  const VerificationBadge = ({
    id,
    apiKey,
    model,
    baseUrl,
  }: {
    id: string;
    apiKey: string;
    model: string;
    baseUrl?: string;
  }) => {
    const status = verificationStatus[id];

    if (!apiKey) return null;

    return (
      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={() => verifyProvider(id, apiKey, model, baseUrl)}
          disabled={status?.loading}
          className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all ${
            status?.loading
              ? "opacity-50 cursor-wait"
              : "hover:bg-white/5 cursor-pointer"
          }`}
          style={{
            borderColor: status?.result
              ? "#10b981"
              : status?.error
                ? "#ef4444"
                : "rgba(255,255,255,0.2)",
            color: status?.result
              ? "#10b981"
              : status?.error
                ? "#ef4444"
                : "gray",
          }}
        >
          {status?.loading
            ? "VERIFYING..."
            : status?.result
              ? "VALID"
              : status?.error
                ? "RETRY"
                : "VERIFY"}
        </button>
        {status?.error && (
          <span className="text-[10px] text-[var(--luca-danger,#f87171)] font-mono truncate max-w-[200px]">
            {status.error}
          </span>
        )}
      </div>
    );
  };

  const refreshOllama = async () => {
    if (!lucaCapabilities.localOllamaInstall) return;

    setIsRefreshingOllama(true);
    const status = await modelManager.getOllamaModels();
    const installed = await modelManager.isOllamaInstalled();
    setOllamaStatus({ available: status.available, installed });
    setIsRefreshingOllama(false);
  };

  useEffect(() => {
    if (lucaCapabilities.localOllamaInstall) refreshOllama();
  }, []);

  // Update Balancer Status & Latency Pulse
  useEffect(() => {
    const hasCloud = settingsService.hasValidCloudKeys();
    const hasLocal = ollamaStatus.available;
    const isLocalModel =
      settings.brain.model.startsWith("local") ||
      ["gemma-2b", "phi-3-mini", "llama-3.2-1b", "qwen-2.5-7b"].includes(
        settings.brain.model,
      );

    // 1. Determine Status Label
    if (hasCloud && hasLocal) {
      setBalancerStatus({
        label: "OPTIMIZED",
        color: "text-[var(--luca-success,#4fbf7a)]",
        dotColor: "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]",
      });
    } else if (hasCloud && !hasLocal) {
      setBalancerStatus({
        label: "CLOUD ONLY",
        color: "text-[var(--luca-warning,#f2b23e)]",
        dotColor: "bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]",
      });
    } else if (!hasCloud && hasLocal) {
      setBalancerStatus({
        label: "LOCAL ONLY",
        color: "text-[var(--luca-warning,#f2b23e)]",
        dotColor: "bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]",
      });
    } else {
      setBalancerStatus({
        label: "OFFLINE",
        color: "text-[var(--luca-danger,#f87171)]",
        dotColor: "bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]",
      });
    }

    // 2. Latency Pulse Logic
    const interval = setInterval(() => {
      const base = isLocalModel ? 180 : 1800;
      const variance = isLocalModel ? 40 : 400;
      // Add a random pulse
      const pulse = base + Math.floor(Math.random() * variance);
      setAvgLatency(pulse);
    }, 4000);

    return () => clearInterval(interval);
  }, [settings.brain.model, ollamaStatus.available]);

  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : "pr-2"} mt-2`}>
      {/* Intelligence Status Badge */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`flex items-center justify-between ${isMobile ? "p-4 py-6 border-x-0 border-y rounded-none" : " p-3 rounded-xl border"} glass-blur`}
        style={{
          backgroundColor: isMobile
            ? "rgba(255,255,255,0.02)"
            : "var(--app-bg-tint, #11111a)",
          borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
        }}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg bg-[var(--app-bg-tint)]/20`}>
            <Icon
              name="ShieldCheck"
              variant="BoldDuotone"
              className="w-4 h-4"
              style={{ color: statusColor }}
            />
          </div>
          <div
            className={`text-xs uppercase tracking-wider font-mono text-[var(--app-text-muted)] opacity-60`}
          >
            Brain Status / Intelligence Mode
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRoutingToLocal && !isLocalSelected && (
            <span className="text-sm text-[var(--luca-warning,#f2b23e)] font-bold animate-pulse">
              AUTOPILOT
            </span>
          )}
          <button
            onClick={toggleIntelligenceMode}
            className="px-2 py-1 rounded text-sm font-black tracking-tighter border transition-all hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              backgroundColor: `${statusColor}10`,
              color: statusColor,
              borderColor: `${statusColor}20`,
            }}
          >
            {statusLabel}
          </button>
        </div>
      </motion.div>

      {/* Cloud API Config Section */}
      <motion.div
        variants={item}
        className={`space-y-4 ${isMobile ? "p-4 py-6 border-x-0 border-y rounded-none" : " p-4 rounded-xl border"} glass-blur`}
        style={{
          backgroundColor: isMobile
            ? "rgba(255,255,255,0.02)"
            : "var(--app-bg-tint, #0a0a0a)",
          borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon
              name="Key"
              variant="BoldDuotone"
              className="w-4 h-4"
              style={{ color: theme.hex }}
            />
            <h4
              className={`${isMobile ? "text-sm" : "text-base"} font-black uppercase tracking-widest truncate`}
              style={{ color: "var(--app-text-main)" }}
            >
              Provider Access / BYOK
            </h4>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`text-[10px] font-mono text-[var(--app-text-muted)]`}
            >
              {settings.brain.useCustomApiKey ? "MANUAL" : "MANAGED"}
            </span>
            <button
              onClick={() =>
                onUpdate(
                  "brain",
                  "useCustomApiKey",
                  !settings.brain.useCustomApiKey,
                )
              }
              className={`w-7 h-3.5 rounded-full transition-all relative ${settings.brain.useCustomApiKey ? "" : "bg-[var(--app-border-main)] opacity-40 hover:opacity-100"}`}
              style={{
                backgroundColor: settings.brain.useCustomApiKey
                  ? theme.hex
                  : undefined,
              }}
            >
              <div
                className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-[var(--app-bg-tint)] transition-all ${settings.brain.useCustomApiKey ? "translate-x-4" : "translate-x-0.5"}`}
                style={{
                  backgroundColor: settings.brain.useCustomApiKey
                    ? "white"
                    : "var(--app-text-muted)",
                }}
              />
            </button>
          </div>
        </div>

        {settings.brain.useCustomApiKey && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-4 pt-2 border-t border-[var(--luca-border-subtle,var(--app-border-main))]"
          >
            <div className="flex items-center justify-between px-1">
              <span
                className={`text-[10px] font-mono text-[var(--app-text-muted)]`}
              >
                Connect your provider keys
              </span>
            </div>

            {/* Gemini Config */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img
                  src="/icons/brands/gemini-color.svg"
                  className="w-3.5 h-3.5 object-contain"
                  alt="Gemini"
                />
                <span
                  className={`text-sm font-black uppercase tracking-wider`}
                  style={{ color: "var(--app-text-main)" }}
                >
                  Google Gemini
                </span>
                <VerificationBadge
                  id="gemini"
                  apiKey={settings.brain.geminiApiKey}
                  model="gemini-1.5-flash"
                  baseUrl={settings.brain.geminiBaseUrl}
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <input
                  type={settings.brain.geminiApiKey ? "password" : "text"}
                  placeholder="AIza... (Gemini Sample)"
                  value={settings.brain.geminiApiKey || ""}
                  onChange={(e) =>
                    onUpdate("brain", "geminiApiKey", e.target.value)
                  }
                  className={`w-full rounded-lg p-2 text-sm outline-none font-mono border`}
                  style={{
                    backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.4))",
                    borderColor:
                      "var(--app-border-main, rgba(255,255,255,0.1))",
                    color: "var(--app-text-main)",
                  }}
                />
              </div>
            </div>

            {/* Anthropic Config */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img
                  src="/icons/brands/anthropic.svg"
                  className={`w-[14px] h-[14px] object-contain brightness-0 invert-[var(--app-invert-value,0)]`}
                  style={{
                    filter: "var(--app-icon-filter, brightness(0) invert(1))",
                  }}
                  alt="Anthropic"
                />
                <span
                  className={`text-sm font-black uppercase tracking-wider`}
                  style={{ color: "var(--app-text-main)" }}
                >
                  Anthropic
                </span>
                <VerificationBadge
                  id="anthropic"
                  apiKey={settings.brain.anthropicApiKey}
                  model="claude-3-5-sonnet-20240620"
                  baseUrl={settings.brain.anthropicBaseUrl}
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <input
                  type={settings.brain.anthropicApiKey ? "password" : "text"}
                  placeholder="sk-ant-api03-... (Anthropic Sample)"
                  value={settings.brain.anthropicApiKey || ""}
                  onChange={(e) =>
                    onUpdate("brain", "anthropicApiKey", e.target.value)
                  }
                  className={`w-full rounded-lg p-2 text-sm outline-none font-mono border`}
                  style={{
                    backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.4))",
                    borderColor:
                      "var(--app-border-main, rgba(255,255,255,0.1))",
                    color: "var(--app-text-main)",
                  }}
                />
              </div>
            </div>

            {/* OpenAI Config */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img
                  src="/icons/brands/openai.svg"
                  className={`w-3.5 h-3.5 object-contain brightness-0 invert-[var(--app-invert-value,0)]`}
                  style={{
                    filter: "var(--app-icon-filter, brightness(0) invert(1))",
                  }}
                  alt="OpenAI"
                />
                <span
                  className={`text-sm font-black uppercase tracking-wider`}
                  style={{ color: "var(--app-text-main)" }}
                >
                  OpenAI
                </span>
                <VerificationBadge
                  id="openai"
                  apiKey={settings.brain.openaiApiKey}
                  model="gpt-4o"
                  baseUrl={settings.brain.openaiBaseUrl}
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <input
                  type={settings.brain.openaiApiKey ? "password" : "text"}
                  placeholder="sk-proj-... (OpenAI Sample)"
                  value={settings.brain.openaiApiKey || ""}
                  onChange={(e) =>
                    onUpdate("brain", "openaiApiKey", e.target.value)
                  }
                  className={`w-full rounded-lg p-2 text-sm outline-none font-mono border`}
                  style={{
                    backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.4))",
                    borderColor:
                      "var(--app-border-main, rgba(255,255,255,0.1))",
                    color: "var(--app-text-main, #ffffff)",
                  }}
                />
              </div>
            </div>

            {/* xAI Config */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img
                  src="/icons/brands/grok.svg"
                  className={`w-[14px] h-[14px] object-contain brightness-0 invert-[var(--app-invert-value,0)]`}
                  style={{
                    filter: "var(--app-icon-filter, brightness(0) invert(1))",
                  }}
                  alt="xAI"
                />
                <span
                  className={`text-sm font-black uppercase tracking-wider`}
                  style={{ color: "var(--app-text-main)" }}
                >
                  xAI (Grok)
                </span>
                <VerificationBadge
                  id="xai"
                  apiKey={settings.brain.xaiApiKey}
                  model="grok-2-1212"
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <input
                  type={settings.brain.xaiApiKey ? "password" : "text"}
                  placeholder="xai-... (xAI Sample)"
                  value={settings.brain.xaiApiKey || ""}
                  onChange={(e) =>
                    onUpdate("brain", "xaiApiKey", e.target.value)
                  }
                  className={`w-full rounded-lg p-2 text-sm outline-none font-mono border`}
                  style={{
                    backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.4))",
                    borderColor:
                      "var(--app-border-main, rgba(255,255,255,0.1))",
                    color: "var(--app-text-main)",
                  }}
                />
              </div>
            </div>

            {/* DeepSeek Config */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img
                  src="/icons/brands/deepseek.svg"
                  className={`w-[14px] h-[14px] object-contain brightness-0 invert-[var(--app-invert-value,0)]`}
                  style={{
                    filter: "var(--app-icon-filter, brightness(0) invert(1))",
                  }}
                  alt="DeepSeek"
                />
                <span
                  className={`text-sm font-black uppercase tracking-wider`}
                  style={{ color: "var(--app-text-main)" }}
                >
                  DeepSeek
                </span>
                <VerificationBadge
                  id="deepseek"
                  apiKey={settings.brain.deepseekApiKey}
                  model="deepseek-chat"
                  baseUrl={settings.brain.deepseekBaseUrl}
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <input
                  type={settings.brain.deepseekApiKey ? "password" : "text"}
                  placeholder="sk-... (DeepSeek Sample)"
                  value={settings.brain.deepseekApiKey || ""}
                  onChange={(e) =>
                    onUpdate("brain", "deepseekApiKey", e.target.value)
                  }
                  className={`w-full rounded-lg p-2 text-sm outline-none font-mono border`}
                  style={{
                    backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.4))",
                    borderColor:
                      "var(--app-border-main, rgba(255,255,255,0.1))",
                    color: "var(--app-text-main)",
                  }}
                />
              </div>
            </div>

            <SettingsAdvancedDisclosure
              title="Advanced Details"
              description="Custom provider endpoints, proxy base URLs, and validation diagnostics."
            >
              <div className="grid grid-cols-1 gap-3">
                {[
                  {
                    label: "Google Gemini endpoint",
                    key: "geminiBaseUrl",
                    value: settings.brain.geminiBaseUrl || "",
                    placeholder:
                      "Optional endpoint, e.g. https://your-proxy.com/v1",
                  },
                  {
                    label: "Anthropic endpoint",
                    key: "anthropicBaseUrl",
                    value: settings.brain.anthropicBaseUrl || "",
                    placeholder: "Optional endpoint URL",
                  },
                  {
                    label: "OpenAI endpoint",
                    key: "openaiBaseUrl",
                    value: settings.brain.openaiBaseUrl || "",
                    placeholder: "Optional endpoint URL",
                  },
                  {
                    label: "xAI endpoint",
                    key: "xaiBaseUrl",
                    value: settings.brain.xaiBaseUrl || "",
                    placeholder: "Optional endpoint, e.g. https://api.x.ai/v1",
                  },
                  {
                    label: "DeepSeek endpoint",
                    key: "deepseekBaseUrl",
                    value: settings.brain.deepseekBaseUrl || "",
                    placeholder: "Optional endpoint URL",
                  },
                ].map((endpoint) => (
                  <label key={endpoint.key} className="space-y-1">
                    <span className="text-xs font-medium text-[var(--app-text-muted)]">
                      {endpoint.label}
                    </span>
                    <input
                      type="text"
                      placeholder={endpoint.placeholder}
                      value={endpoint.value}
                      onChange={(e) =>
                        onUpdate("brain", endpoint.key, e.target.value)
                      }
                      className="w-full rounded-lg border p-2 text-xs font-mono outline-none"
                      style={{
                        backgroundColor:
                          "var(--luca-background-elevated, var(--app-bg-tint, rgba(0,0,0,0.4)))",
                        borderColor:
                          "var(--luca-border-subtle, var(--app-border-main, rgba(255,255,255,0.1)))",
                        color: "var(--luca-text-primary, var(--app-text-main))",
                      }}
                    />
                  </label>
                ))}
              </div>
              {Object.entries(verificationStatus).length > 0 && (
                <div
                  className="rounded-lg border p-3 text-xs text-[var(--app-text-muted)]"
                  style={{
                    borderColor:
                      "var(--luca-border-subtle, var(--app-border-main))",
                  }}
                >
                  Provider validation messages remain tied to each visible API
                  key above.
                </div>
              )}
            </SettingsAdvancedDisclosure>
          </motion.div>
        )}
      </motion.div>

      {/* Strategic Presets Section */}
      <motion.div variants={item} className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon
            name="MagicStick"
            variant="BoldDuotone"
            className="w-3.5 h-3.5"
            style={{ color: theme.hex }}
          />
          <h4
            className={`${isMobile ? "text-sm" : "text-base"} font-black text-[var(--app-text-muted)] uppercase tracking-widest`}
          >
            Intelligence Presets
          </h4>
        </div>
        <div
          className={`grid ${isMobile ? "grid-cols-1 gap-3" : "grid-cols-3 gap-2"}`}
        >
          {[
            {
              id: "performance",
              label: "Ultra Intelligence",
              icon: "Energy",
              desc: "Deep cloud reasoning",
            },
            {
              id: "balanced",
              label: "Balanced",
              icon: "Scale",
              desc: "Cloud brain, local eyes",
            },
            {
              id: "privacy",
              label: "Full Privacy",
              icon: "ShieldCheck",
              desc: "100% Offline brain",
            },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id as any)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center group glass-blur`}
              style={{
                backgroundColor: "var(--app-bg-tint, rgba(255,255,255,0.05))",
                borderColor:
                  (preset.id === "performance" &&
                    settings.brain.model === "gemini-3.1-pro-preview") ||
                  (preset.id === "balanced" &&
                    settings.brain.model === "gemini-3-flash-preview" &&
                    !settings.brain.visionModel.startsWith("gemini")) ||
                  (preset.id === "privacy" &&
                    !settings.brain.model.startsWith("gemini") &&
                    !settings.brain.model.includes("gpt") &&
                    !settings.brain.model.includes("claude"))
                    ? `${theme.hex}aa`
                    : "var(--app-border-main, rgba(255,255,255,0.05))",
              }}
            >
              <Icon
                name={preset.icon as any}
                variant="BoldDuotone"
                className="w-4 h-4 mb-2 group-hover:scale-110 transition-transform"
                style={{
                  color:
                    (preset.id === "performance" &&
                      settings.brain.model === "gemini-3.1-pro-preview") ||
                    (preset.id === "balanced" &&
                      settings.brain.model === "gemini-3-flash-preview" &&
                      !settings.brain.visionModel.startsWith("gemini")) ||
                    (preset.id === "privacy" &&
                      !settings.brain.model.startsWith("gemini") &&
                      !settings.brain.model.includes("gpt") &&
                      !settings.brain.model.includes("claude"))
                      ? theme.hex
                      : "var(--app-text-muted)",
                }}
              />
              <span
                className={`text-sm font-black`}
                style={{ color: "var(--app-text-main, #ffffff)" }}
              >
                {preset.label}
              </span>
              <span
                className={`text-[10px] uppercase mt-1 opacity-60`}
                style={{ color: "var(--app-text-muted, #94a3b8)" }}
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
          className={`space-y-3 transition-all border shadow-sm ${isMobile ? "border-x-0 border-y rounded-none p-6 bg-white/5" : "bg-[var(--app-bg-tint)] rounded-xl p-4 border-[var(--app-border-main)]"} glass-blur`}
          style={{
            backgroundColor: isMobile
              ? "rgba(255,255,255,0.02)"
              : "var(--app-bg-tint, #11111a)",
            borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
          }}
        >
          <div className="flex items-center justify-between">
            <Icon
              name="Cpu"
              variant="BoldDuotone"
              className="w-4 h-4"
              style={{ color: theme.hex }}
            />
            <div className="text-[10px] font-mono text-[var(--app-text-muted)] uppercase opacity-60">
              Core Intelligence
            </div>
          </div>
          <div className="space-y-1">
            <div
              className={`text-base font-black uppercase tracking-widest`}
              style={{ color: "var(--app-text-main, #ffffff)" }}
            >
              Core Intelligence
            </div>
            {settings.brain.model.includes("/") === false && (
              <p className="text-xs text-[var(--app-text-muted)] leading-tight opacity-70">
                Choose the reasoning model Luca uses for planning, conversation,
                and agent decisions.
              </p>
            )}
            <select
              value={(() => {
                const knownModels = [
                  "gemini-3.1-pro-preview",
                  "gemini-3.1-flash-lite-preview",
                  "gemini-3-flash-preview",
                  "gemini-2.5-pro",
                  "gemini-2.5-flash",
                  "gemini-2.0-flash",
                  "claude-4.5-sonnet",
                  "claude-4.5-sonnet-thinking",
                  "gpt-4o",
                  "grok-2-1212",
                  "deepseek-chat",
                  "deepseek-reasoner",
                ];
                const isKnown =
                  knownModels.includes(settings.brain.model) ||
                  localBrainModels.some((m) => m.id === settings.brain.model);
                // If it's a known model, use it. If not (it's custom), show "custom" selected.
                return isKnown ? settings.brain.model : "custom";
              })()}
              onChange={(e) => onUpdate("brain", "model", e.target.value)}
              className={`w-full rounded-lg p-2 text-sm font-mono outline-none transition-colors border`}
              style={{
                backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.4))",
                borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
                color: "var(--app-text-main, #ffffff)",
              }}
            >
              <optgroup label="Elite Intelligence (Latest / BYOK)">
                <option value="gemini-3.1-pro-preview">
                  Gemini 3.1 Pro (Elite)
                </option>
                <option value="gemini-3.1-flash-lite-preview">
                  Gemini 3.1 Flash Lite
                </option>
                <option value="claude-4.5-sonnet">
                  Claude 4.5 Sonnet (Elite)
                </option>
                <option value="claude-4.5-sonnet-thinking">
                  Claude 4.5 (Thinking)
                </option>
                <option value="deepseek-reasoner">
                  DeepSeek Reasoner (R1)
                </option>
                <option value="grok-2-1212">Grok 2 Ultra</option>
              </optgroup>
              <optgroup label="Luca Prime (Managed)">
                <option value="gemini-3-flash-preview">
                  Gemini 3 Flash (Managed)
                </option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.0-flash">
                  Gemini 2.0 Flash (Luca Prime)
                </option>
                <option value="deepseek-chat">DeepSeek Chat (V3)</option>
                <option value="gpt-4o">GPT-4o (Managed)</option>
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
                "gemini-3.1-pro-preview",
                "gemini-3.1-flash-lite-preview",
                "gemini-3-flash-preview",
                "gemini-2.5-pro",
                "gemini-2.5-flash",
                "gemini-2.0-flash",
                "claude-4.5-sonnet",
                "claude-4.5-sonnet-thinking",
                "gpt-4o",
                "grok-2-1212",
                "deepseek-chat",
                "deepseek-reasoner",
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
                  <div className="text-base text-[var(--app-text-muted)] mb-1 uppercase tracking-wider">
                    Advanced Details: external local model ID (Ollama)
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
                    className={`w-full rounded-lg p-2 text-sm outline-none transition-colors border`}
                    style={{
                      backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.4))",
                      borderColor:
                        "var(--app-border-main, rgba(255,255,255,0.2))",
                      color: "var(--app-text-main, #ffffff)",
                    }}
                  />
                  <div className="text-sm text-[var(--app-text-muted)] mt-1">
                    Uses your local Ollama service on port 11434.
                  </div>
                </motion.div>
              ) : null;
            })()}
          </div>
        </motion.div>

        {/* Memory Gateway */}
        <motion.div
          variants={item}
          className={`space-y-3 transition-all border shadow-sm ${isMobile ? "border-x-0 border-y rounded-none p-6 bg-white/5" : "bg-[var(--app-bg-tint)] rounded-xl p-4 border-[var(--app-border-main)]"} glass-blur`}
          style={{
            backgroundColor: isMobile
              ? "rgba(255,255,255,0.02)"
              : "var(--app-bg-tint, #11111a)",
            borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
          }}
        >
          <div className="flex items-center gap-2">
            <Icon
              name="Database"
              className="w-4 h-4"
              style={{ color: theme.hex }}
            />
            <div
              className={`text-base font-black uppercase tracking-widest`}
              style={{ color: "var(--app-text-main, #ffffff)" }}
            >
              Memory Gateway (RAG)
            </div>
          </div>
          <p
            className={`text-xs text-[var(--app-text-muted)] leading-tight opacity-70`}
          >
            Select the model Luca uses to index and retrieve your local
            knowledge safely.
          </p>
          <select
            value={settings.brain.memoryModel || "gemini-2.5-flash"}
            onChange={(e) => onUpdate("brain", "memoryModel", e.target.value)}
            className={`w-full rounded-lg p-2 text-sm font-mono outline-none transition-colors border`}
            style={{
              backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.4))",
              borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
              color: "var(--app-text-main, #ffffff)",
            }}
          >
            <optgroup label="Cloud Embedding (Fast)">
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="gemini-2.5-flash">
                Gemini 2.5 Flash (RECOMMENDED)
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

        {/* Knowledge Maintenance (Settings) */}
        <motion.div
          variants={item}
          className={`space-y-4 transition-all border shadow-sm ${isMobile ? "border-x-0 border-y rounded-none p-6 bg-white/5" : "bg-[var(--app-bg-tint)] rounded-xl p-4 border-[var(--app-border-main)]"} glass-blur`}
          style={{
            backgroundColor: isMobile
              ? "rgba(255,255,255,0.02)"
              : "var(--app-bg-tint, #11111a)",
            borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon
                name="ShieldCheck"
                className="w-4 h-4"
                style={{ color: theme.hex }}
              />
              <h4
                className={`text-xs font-bold uppercase tracking-widest`}
                style={{ color: "var(--app-text-main, #ffffff)" }}
              >
                Knowledge Maintenance
              </h4>
            </div>
            <div className="text-[10px] font-mono text-[var(--app-text-muted)] uppercase">
              LOCAL INDEX
            </div>
          </div>

          <div className="space-y-3">
            {/* Background Sync Toggle */}
            <div
              className={`flex items-center justify-between p-2 rounded-lg border`}
              style={{
                backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.2))",
                borderColor: "var(--app-border-main, rgba(255,255,255,0.05))",
              }}
            >
              <div className="space-y-0.5">
                <div
                  className={`text-xs font-bold`}
                  style={{ color: "var(--app-text-main, #ffffff)" }}
                >
                  Background History Indexing
                </div>
                <div className="text-[10px] text-[var(--app-text-muted)] uppercase tracking-wider">
                  Keep local search memory current in the background
                </div>
              </div>
              <button
                onClick={async () => {
                  const baseUrl =
                    (window as any).CORTEX_URL || "http://localhost:8000";
                  const current = await fetch(`${baseUrl}/api/settings`).then(
                    (r) => r.json(),
                  );
                  const newValue = !current.enable_background_sync;
                  await fetch(`${baseUrl}/api/settings/update`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      key: "enable_background_sync",
                      value: newValue,
                    }),
                  });
                  alert(`Luca Sync: ${newValue ? "ACTIVATED" : "PAUSED"}`);
                }}
                className={`w-7 h-3.5 rounded-full transition-all relative ${settings.general.debugMode ? "" : "bg-[var(--app-border-main)] opacity-40 hover:opacity-100"}`}
                style={{
                  backgroundColor: settings.general.debugMode
                    ? theme.hex
                    : undefined,
                }}
              >
                <div
                  className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-[var(--app-bg-tint)] transition-all ${settings.general.debugMode ? "translate-x-4" : "translate-x-0.5"}`}
                  style={{
                    backgroundColor: settings.general.debugMode
                      ? "white"
                      : "var(--app-text-muted)",
                  }}
                />
              </button>
            </div>

            {/* Sync Interval Dropdown */}
            <div
              className={`grid grid-cols-2 items-center gap-4 bg-[var(--app-bg-tint, rgba(255,255,255,0.1))] p-2 rounded-lg border border-[var(--app-border-main)]`}
            >
              <div className="text-[11px] text-[var(--app-text-muted)] uppercase tracking-wider font-bold">
                Indexing Interval
              </div>
              <select
                defaultValue="30"
                onChange={async (e) => {
                  const baseUrl =
                    (window as any).CORTEX_URL || "http://localhost:8000";
                  const val = parseInt(e.target.value);
                  await fetch(`${baseUrl}/api/settings/update`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      key: "sync_interval_minutes",
                      value: val,
                    }),
                  });
                }}
                className={`w-full bg-[var(--app-bg-tint)] border border-[var(--app-border-main)] rounded p-1 text-[11px] outline-none text-[var(--app-text-main)]`}
              >
                <option value="30">30 Minutes</option>
                <option value="60">1 Hour</option>
                <option value="720">12 Hours</option>
                <option value="1440">1 Day</option>
              </select>
            </div>
            <p className="text-[10px] text-[var(--app-text-muted)] italic px-1">
              Note: pausing background indexing reduces provider calls; Luca
              will still keep the current session active.
            </p>
          </div>
        </motion.div>

        {/* Quota Intelligence Card */}
        <motion.div
          variants={item}
          className={`space-y-3 transition-all border shadow-sm ${isMobile ? "border-x-0 border-y rounded-none p-6 bg-white/5" : "bg-[var(--app-bg-tint)] rounded-xl p-4 border-[var(--app-border-main)]"} glass-blur`}
          style={{
            backgroundColor: isMobile
              ? "rgba(255,255,255,0.02)"
              : "var(--app-bg-tint, #11111a)",
            borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
          }}
        >
          <div className="flex items-center justify-between">
            <Icon
              name="Activity"
              className="w-4 h-4"
              style={{ color: theme.hex }}
            />
            <div
              className={`text-[10px] font-mono ${balancerStatus.color} flex items-center gap-1`}
            >
              <span
                className={`w-1 h-1 rounded-full ${balancerStatus.dotColor} ${balancerStatus.label !== "OFFLINE" ? "animate-pulse" : ""}`}
              />
              {balancerStatus.label}
            </div>
          </div>
          <div className="space-y-2">
            <div
              className={`text-base font-black uppercase tracking-widest`}
              style={{ color: "var(--app-text-main, #ffffff)" }}
            >
              Routing Health
            </div>
            <div
              className={`w-full h-1 rounded-full overflow-hidden`}
              style={{
                backgroundColor: "var(--app-bg-tint, rgba(255,255,255,0.05))",
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width:
                    balancerStatus.label === "OFFLINE"
                      ? "0%"
                      : balancerStatus.label === "OPTIMIZED"
                        ? "75%"
                        : "40%",
                }}
                className="h-full"
                style={{ backgroundColor: theme.hex }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-[var(--app-text-muted)]">AVG RESPONSE</span>
              <span style={{ color: theme.hex }}>
                {balancerStatus.label === "OFFLINE" ? "---" : `${avgLatency}ms`}
              </span>
            </div>
            <div
              className={`text-[10px] text-[var(--app-text-muted)] font-mono leading-tight`}
            >
              Advanced Details: routing telemetry explains how Luca chooses
              cloud or local models for speed, privacy, and availability.
            </div>
          </div>
        </motion.div>

        {/* Local Brain / Runtime Card */}
        <motion.div
          variants={item}
          className={`space-y-3 transition-all border shadow-sm ${isMobile ? "border-x-0 border-y rounded-none p-6 bg-white/5" : "bg-[var(--app-bg-tint)] rounded-xl p-4 border-[var(--app-border-main)]"} glass-blur`}
          style={{
            backgroundColor: isMobile
              ? "rgba(255,255,255,0.02)"
              : "var(--app-bg-tint, #11111a)",
            borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon
                name="Zap"
                className="w-4 h-4"
                style={{
                  color: ollamaStatus.available
                    ? "#10b981"
                    : "var(--app-text-muted, rgba(255,255,255,0.3))",
                }}
              />
              <div
                className={`text-base font-black uppercase tracking-widest`}
                style={{ color: "var(--app-text-main, #ffffff)" }}
              >
                Local Brain / Runtime
              </div>
            </div>
            <div
              className={`text-[10px] font-mono ${ollamaStatus.available ? "text-[var(--luca-success,#4fbf7a)]" : "text-[var(--app-text-muted)]"} flex items-center gap-1`}
            >
              <span
                className={`w-1 h-1 rounded-full ${ollamaStatus.available ? "animate-pulse" : ""}`}
                style={{
                  backgroundColor: ollamaStatus.available
                    ? "#10b981"
                    : "var(--app-text-muted)",
                }}
              />
              {!lucaCapabilities.localOllamaInstall
                ? "DESKTOP ONLY"
                : ollamaStatus.available
                  ? "RUNNING"
                  : "OFFLINE"}
            </div>
          </div>

          {lucaCapabilities.localOllamaInstall ? (
            <div className="flex items-center justify-between gap-2">
              {!ollamaStatus.available ? (
                ollamaStatus.installed ? (
                  <button
                    onClick={async () => {
                      await modelManager.startOllama();
                      setTimeout(refreshOllama, 3000);
                    }}
                    className={`flex-1 bg-[var(--app-bg-tint)] hover:bg-white/10 border-[var(--app-border-main)] border rounded-lg py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all text-[var(--app-text-main)]`}
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
                <div className="text-[11px] text-[var(--app-text-muted)] italic">
                  Local model service is active on port 11434.
                </div>
              )}
              <button
                onClick={refreshOllama}
                disabled={isRefreshingOllama}
                className="p-1.5 hover:bg-white/5 rounded-lg transition-all"
              >
                <Icon
                  name="Activity"
                  className={`w-3 h-3 ${isRefreshingOllama ? "animate-spin" : ""}`}
                  style={{
                    color: isRefreshingOllama
                      ? theme.hex
                      : "rgba(107, 114, 128, 0.7)",
                  }}
                />
              </button>
            </div>
          ) : (
            <WebUnavailableState featureName="Local Ollama installation and service control" />
          )}
        </motion.div>
      </motion.div>

      {/* Creativity / Heat Pool */}
      <motion.div
        variants={item}
        className={`space-y-3 transition-all border shadow-sm ${isMobile ? "border-x-0 border-y rounded-none p-6 bg-white/5" : "bg-[var(--app-bg-tint)] rounded-xl p-4 border-[var(--app-border-main)]"} glass-blur`}
        style={{
          backgroundColor: isMobile
            ? "rgba(255,255,255,0.02)"
            : "var(--app-bg-tint, #11111a)",
          borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
        }}
      >
        <div
          className={`flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)]`}
        >
          <div className="flex items-center gap-2">
            <Icon name="Zap" className="w-3 h-3" style={{ color: theme.hex }} />
            Temperature (Creativity Control)
          </div>
          <span className="font-mono text-[var(--app-text-main)]">
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
          className={`w-full h-1 bg-[var(--app-bg-tint)] rounded-lg appearance-none cursor-pointer`}
          style={{ accentColor: theme.hex }}
        />
      </motion.div>

      {/* Removed ModelManager - Moved to dedicated tab */}
    </div>
  );
};

export default SettingsBrainTab;
