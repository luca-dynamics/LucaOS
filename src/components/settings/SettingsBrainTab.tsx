import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { LucaSettings, settingsService } from "../../services/settingsService";
import { modelManager, LocalModel } from "../../services/ModelManagerService";
import {
  SettingsAdvancedDisclosure,
  SettingsRow,
  SettingsSection,
  SettingsToggle,
  settingsControlInlineStyle,
} from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";
import { lucaCapabilities } from "../../config/lucaReleaseTarget";
import { WebUnavailableState } from "../ui/WebUnavailableState";
import {
  ANTHROPIC_CLAUDE_MODEL_IDS,
  ANTHROPIC_CLAUDE_MODELS,
  ANTHROPIC_MODEL_PRESETS,
  DEEPSEEK_MODEL_IDS,
  DEEPSEEK_MODELS,
  DEEPSEEK_MODEL_PRESETS,
  GEMINI_MODEL_IDS,
  GEMINI_MODELS,
  GEMINI_MODEL_PRESETS,
  OPENAI_GPT_5_6_MODEL_IDS,
  OPENAI_GPT_5_6_MODELS,
  OPENAI_MODEL_PRESETS,
  XAI_GROK_MODEL_IDS,
  XAI_GROK_MODELS,
  XAI_MODEL_PRESETS,
} from "../../config/brain.config";

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
        performance: GEMINI_MODEL_PRESETS.performance,
        balanced: GEMINI_MODEL_PRESETS.balanced,
      },
      anthropic: {
        performance: ANTHROPIC_MODEL_PRESETS.performance,
        balanced: ANTHROPIC_MODEL_PRESETS.balanced,
      },
      openai: {
        performance: OPENAI_MODEL_PRESETS.performance,
        balanced: OPENAI_MODEL_PRESETS.balanced,
      },
      deepseek: {
        performance: DEEPSEEK_MODEL_PRESETS.performance,
        balanced: DEEPSEEK_MODEL_PRESETS.balanced,
      },
      xai: {
        performance: XAI_MODEL_PRESETS.performance,
        balanced: XAI_MODEL_PRESETS.balanced,
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

  // Badge should reflect intended configuration (Cloud vs Local)
  const statusLabel = isLocalSelected ? "Local" : "Cloud";
  const statusColor =
    statusLabel === "Cloud" ? theme.hex : "var(--luca-success, #4fbf7a)";

  const toggleIntelligenceMode = () => {
    if (statusLabel === "Cloud") {
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
    label: "Optimized",
    color: "var(--luca-success, #4fbf7a)",
  });

  // Background indexing state lives in the local cortex service, not in
  // LucaSettings — read the real values so the controls reflect reality.
  const [backgroundSync, setBackgroundSync] = useState<{
    enabled: boolean;
    intervalMinutes: number;
  } | null>(null);

  useEffect(() => {
    const baseUrl = (window as any).CORTEX_URL || "http://localhost:8000";
    fetch(`${baseUrl}/api/settings`)
      .then((r) => r.json())
      .then((data) =>
        setBackgroundSync({
          enabled: !!data.enable_background_sync,
          intervalMinutes: Number(data.sync_interval_minutes) || 30,
        }),
      )
      .catch(() => setBackgroundSync(null));
  }, []);

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
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => verifyProvider(id, apiKey, model, baseUrl)}
          disabled={status?.loading}
          className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
            status?.loading ? "cursor-wait opacity-50" : "cursor-pointer"
          }`}
          style={{
            borderColor: status?.result
              ? "var(--luca-success, #4fbf7a)"
              : status?.error
                ? "var(--luca-danger, #f87171)"
                : settingsSurfaceTokens.borderSubtle,
            color: status?.result
              ? "var(--luca-success, #4fbf7a)"
              : status?.error
                ? "var(--luca-danger, #f87171)"
                : settingsSurfaceTokens.textSecondary,
          }}
        >
          {status?.loading
            ? "Verifying…"
            : status?.result
              ? "Valid"
              : status?.error
                ? "Retry"
                : "Verify"}
        </button>
        {status?.error && (
          <span
            className="max-w-[200px] truncate font-mono text-[11px]"
            style={{ color: "var(--luca-danger, #f87171)" }}
          >
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

    // 1. Determine Status Label
    if (hasCloud && hasLocal) {
      setBalancerStatus({
        label: "Optimized",
        color: "var(--luca-success, #4fbf7a)",
      });
    } else if (hasCloud && !hasLocal) {
      setBalancerStatus({
        label: "Cloud only",
        color: "var(--luca-warning, #f2b23e)",
      });
    } else if (!hasCloud && hasLocal) {
      setBalancerStatus({
        label: "Local only",
        color: "var(--luca-warning, #f2b23e)",
      });
    } else {
      setBalancerStatus({
        label: "Offline",
        color: "var(--luca-danger, #f87171)",
      });
    }
  }, [settings.brain.model, ollamaStatus.available]);

  const knownModels = [
    ...GEMINI_MODEL_IDS,
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    ...ANTHROPIC_CLAUDE_MODEL_IDS,
    ...OPENAI_GPT_5_6_MODEL_IDS,
    "gpt-4o",
    ...XAI_GROK_MODEL_IDS,
    "grok-2-1212",
    ...DEEPSEEK_MODEL_IDS,
    "deepseek-chat",
    "deepseek-reasoner",
  ];
  const isKnownModel =
    knownModels.includes(settings.brain.model) ||
    localBrainModels.some((m) => m.id === settings.brain.model);
  const showCustomModelInput =
    !isKnownModel || settings.brain.model === "custom";

  const providerKeys = [
    {
      id: "gemini",
      name: "Google Gemini",
      iconSrc: "/icons/brands/gemini-color.svg",
      iconInverted: false,
      key: "geminiApiKey",
      value: settings.brain.geminiApiKey,
      placeholder: "AIza... (Gemini Sample)",
      verifyModel: "gemini-1.5-flash",
      baseUrl: settings.brain.geminiBaseUrl,
    },
    {
      id: "anthropic",
      name: "Anthropic",
      iconSrc: "/icons/brands/anthropic.svg",
      iconInverted: true,
      key: "anthropicApiKey",
      value: settings.brain.anthropicApiKey,
      placeholder: "sk-ant-api03-... (Anthropic Sample)",
      verifyModel: "claude-3-5-sonnet-20240620",
      baseUrl: settings.brain.anthropicBaseUrl,
    },
    {
      id: "openai",
      name: "OpenAI",
      iconSrc: "/icons/brands/openai.svg",
      iconInverted: true,
      key: "openaiApiKey",
      value: settings.brain.openaiApiKey,
      placeholder: "sk-proj-... (OpenAI Sample)",
      verifyModel: "gpt-4o",
      baseUrl: settings.brain.openaiBaseUrl,
    },
    {
      id: "xai",
      name: "xAI (Grok)",
      iconSrc: "/icons/brands/grok.svg",
      iconInverted: true,
      key: "xaiApiKey",
      value: settings.brain.xaiApiKey,
      placeholder: "xai-... (xAI Sample)",
      verifyModel: "grok-2-1212",
      baseUrl: undefined as string | undefined,
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      iconSrc: "/icons/brands/deepseek.svg",
      iconInverted: true,
      key: "deepseekApiKey",
      value: settings.brain.deepseekApiKey,
      placeholder: "sk-... (DeepSeek Sample)",
      verifyModel: "deepseek-chat",
      baseUrl: settings.brain.deepseekBaseUrl,
    },
  ];

  const presets = [
    {
      id: "performance",
      label: "Ultra intelligence",
      desc: "Deep cloud reasoning",
      active: settings.brain.model === "gemini-3.1-pro-preview",
    },
    {
      id: "balanced",
      label: "Balanced",
      desc: "Cloud brain, local eyes",
      active:
        settings.brain.model === "gemini-3-flash-preview" &&
        !settings.brain.visionModel.startsWith("gemini"),
    },
    {
      id: "privacy",
      label: "Full privacy",
      desc: "100% offline brain",
      active:
        !settings.brain.model.startsWith("gemini") &&
        !settings.brain.model.includes("gpt") &&
        !settings.brain.model.includes("claude"),
    },
  ] as const;

  const selectClassName =
    "w-56 max-w-full rounded-lg border px-2.5 py-1.5 text-[13px] outline-none disabled:cursor-not-allowed disabled:opacity-50";

  const inputClassName =
    "w-full rounded-lg border px-2.5 py-1.5 font-mono text-[12.5px] outline-none";

  const ollamaStatusText = !lucaCapabilities.localOllamaInstall
    ? "Available in the desktop app."
    : ollamaStatus.available
      ? "Local model service is active on port 11434."
      : ollamaStatus.installed
        ? "Installed but not running."
        : "Not installed on this machine.";

  return (
    <div className={isMobile ? "space-y-1 px-0" : "space-y-1 pr-2"}>
      <SettingsSection
        title="Intelligence"
        description="The reasoning models Luca uses for planning, conversation, and agent decisions."
        icon="Cpu"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Intelligence mode"
          description={
            isRoutingToLocal && !isLocalSelected
              ? "No valid cloud key — Luca is auto-routing to local models."
              : statusLabel === "Cloud"
                ? "Cloud reasoning is active."
                : "Local offline reasoning is active."
          }
          control={
            <button
              type="button"
              onClick={toggleIntelligenceMode}
              className="rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors"
              style={{
                color: statusColor,
                borderColor: settingsSurfaceTokens.borderSubtle,
              }}
            >
              {statusLabel}
            </button>
          }
        />
        <div className="py-3.5">
          <div
            className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}
          >
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className="rounded-lg border p-3 text-left transition-colors"
                style={{
                  ...settingsControlInlineStyle,
                  borderColor: preset.active
                    ? theme.hex
                    : settingsSurfaceTokens.borderSubtle,
                }}
              >
                <p
                  className="text-[13px] font-medium"
                  style={{
                    color: preset.active
                      ? theme.hex
                      : settingsSurfaceTokens.textPrimary,
                  }}
                >
                  {preset.label}
                </p>
                <p
                  className="mt-0.5 text-[11.5px] leading-snug"
                  style={{ color: settingsSurfaceTokens.textSecondary }}
                >
                  {preset.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
        <SettingsRow
          label="Core model"
          description="The primary reasoning model."
          control={
            <select
              value={isKnownModel ? settings.brain.model : "custom"}
              onChange={(e) => onUpdate("brain", "model", e.target.value)}
              className={selectClassName}
              style={settingsControlInlineStyle}
            >
              <optgroup label="Google Gemini (BYOK / Managed)">
                {GEMINI_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="DeepSeek (BYOK)">
                {DEEPSEEK_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
                <option value="deepseek-chat">
                  DeepSeek Chat (Compatibility)
                </option>
                <option value="deepseek-reasoner">
                  DeepSeek Reasoner (Compatibility)
                </option>
              </optgroup>
              <optgroup label="xAI Grok (BYOK)">
                {XAI_GROK_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
                <option value="grok-2-1212">Grok 2 (Legacy)</option>
              </optgroup>
              <optgroup label="Anthropic Claude (BYOK)">
                {ANTHROPIC_CLAUDE_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="OpenAI GPT-5.6 (BYOK)">
                {OPENAI_GPT_5_6_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
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
          }
        />
        {showCustomModelInput && (
          <SettingsRow
            label="External model ID"
            description="Uses your local Ollama service on port 11434."
            control={
              <input
                type="text"
                placeholder="e.g. mistral, deepseek-coder, llama3:70b"
                value={
                  settings.brain.model === "custom" ? "" : settings.brain.model
                }
                onChange={(e) => onUpdate("brain", "model", e.target.value)}
                className="w-56 max-w-full rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none"
                style={settingsControlInlineStyle}
              />
            }
          />
        )}
        <SettingsRow
          label="Temperature"
          description="Creativity control — lower is more precise, higher is more exploratory."
          control={
            <div className="flex w-48 items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.brain.temperature}
                onChange={(e) =>
                  onUpdate("brain", "temperature", parseFloat(e.target.value))
                }
                className="h-1 w-full cursor-pointer appearance-none rounded-lg"
                style={{
                  accentColor: theme.hex,
                  backgroundColor: settingsSurfaceTokens.borderSubtle,
                }}
              />
              <span
                className="w-8 text-right font-mono text-[12.5px]"
                style={{ color: settingsSurfaceTokens.textPrimary }}
              >
                {settings.brain.temperature}
              </span>
            </div>
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Provider access"
        description="Bring your own API keys, or let Luca manage provider routing."
        icon="Key"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Use your own API keys"
          description={
            settings.brain.useCustomApiKey
              ? "Manual — your keys below are used directly."
              : "Managed — Luca routes through its own provider access."
          }
          control={
            <SettingsToggle
              checked={!!settings.brain.useCustomApiKey}
              onChange={() =>
                onUpdate(
                  "brain",
                  "useCustomApiKey",
                  !settings.brain.useCustomApiKey,
                )
              }
              accentColor={theme.hex}
              ariaLabel="Use your own API keys"
            />
          }
        />
        {settings.brain.useCustomApiKey && (
          <div className="space-y-4 pt-3.5">
            {providerKeys.map((provider) => (
              <div key={provider.id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <img
                    src={provider.iconSrc}
                    className="h-3.5 w-3.5 object-contain"
                    style={
                      provider.iconInverted
                        ? {
                            filter:
                              "var(--app-icon-filter, brightness(0) invert(1))",
                          }
                        : undefined
                    }
                    alt={provider.name}
                  />
                  <span
                    className="text-[13.5px] font-medium"
                    style={{ color: settingsSurfaceTokens.textPrimary }}
                  >
                    {provider.name}
                  </span>
                  <VerificationBadge
                    id={provider.id}
                    apiKey={provider.value}
                    model={provider.verifyModel}
                    baseUrl={provider.baseUrl}
                  />
                </div>
                <input
                  type={provider.value ? "password" : "text"}
                  placeholder={provider.placeholder}
                  value={provider.value || ""}
                  onChange={(e) =>
                    onUpdate("brain", provider.key, e.target.value)
                  }
                  className={inputClassName}
                  style={settingsControlInlineStyle}
                />
              </div>
            ))}

            <SettingsAdvancedDisclosure
              title="Advanced details"
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
                    <span
                      className="text-[12.5px] font-medium"
                      style={{ color: settingsSurfaceTokens.textSecondary }}
                    >
                      {endpoint.label}
                    </span>
                    <input
                      type="text"
                      placeholder={endpoint.placeholder}
                      value={endpoint.value}
                      onChange={(e) =>
                        onUpdate("brain", endpoint.key, e.target.value)
                      }
                      className={inputClassName}
                      style={settingsControlInlineStyle}
                    />
                  </label>
                ))}
              </div>
              {Object.entries(verificationStatus).length > 0 && (
                <p
                  className="text-[12.5px] leading-relaxed"
                  style={{ color: settingsSurfaceTokens.textSecondary }}
                >
                  Provider validation messages remain tied to each visible API
                  key above.
                </p>
              )}
            </SettingsAdvancedDisclosure>
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title="Memory"
        description="How Luca indexes and retrieves your local knowledge."
        icon="Database"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Memory gateway (RAG)"
          description="The model used to index and retrieve local knowledge safely."
          control={
            <select
              value={settings.brain.memoryModel || "gemini-2.5-flash"}
              onChange={(e) => onUpdate("brain", "memoryModel", e.target.value)}
              className={selectClassName}
              style={settingsControlInlineStyle}
            >
              <optgroup label="Cloud Embedding (Fast)">
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-2.5-flash">
                  Gemini 2.5 Flash (Recommended)
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
          }
        />
        <SettingsRow
          label="Background history indexing"
          description={
            backgroundSync === null
              ? "Requires the local cortex service — start LucaOS desktop to control indexing."
              : "Keep local search memory current in the background. Pausing reduces provider calls; the current session stays active."
          }
          control={
            <SettingsToggle
              checked={backgroundSync?.enabled === true}
              onChange={async () => {
                const baseUrl =
                  (window as any).CORTEX_URL || "http://localhost:8000";
                const next = !(backgroundSync?.enabled ?? false);
                try {
                  await fetch(`${baseUrl}/api/settings/update`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      key: "enable_background_sync",
                      value: next,
                    }),
                  });
                  setBackgroundSync((prev) => ({
                    enabled: next,
                    intervalMinutes: prev?.intervalMinutes ?? 30,
                  }));
                } catch {
                  // Cortex unreachable — leave the shown state untouched.
                }
              }}
              accentColor={theme.hex}
              ariaLabel="Background history indexing"
            />
          }
        />
        <SettingsRow
          label="Indexing interval"
          description="How often the background index refreshes."
          control={
            <select
              value={String(backgroundSync?.intervalMinutes ?? 30)}
              onChange={async (e) => {
                const baseUrl =
                  (window as any).CORTEX_URL || "http://localhost:8000";
                const val = parseInt(e.target.value);
                try {
                  await fetch(`${baseUrl}/api/settings/update`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      key: "sync_interval_minutes",
                      value: val,
                    }),
                  });
                  setBackgroundSync((prev) => ({
                    enabled: prev?.enabled ?? false,
                    intervalMinutes: val,
                  }));
                } catch {
                  // Cortex unreachable — leave the shown state untouched.
                }
              }}
              className={selectClassName}
              style={settingsControlInlineStyle}
            >
              <option value="30">30 Minutes</option>
              <option value="60">1 Hour</option>
              <option value="720">12 Hours</option>
              <option value="1440">1 Day</option>
            </select>
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Local runtime"
        description="The on-device model service used for offline intelligence."
        icon="Zap"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        {lucaCapabilities.localOllamaInstall ? (
          <SettingsRow
            label="Ollama service"
            description={ollamaStatusText}
            accentColor={
              ollamaStatus.available ? "var(--luca-success, #4fbf7a)" : undefined
            }
            control={
              <div className="flex items-center gap-2">
                {!ollamaStatus.available &&
                  (ollamaStatus.installed ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await modelManager.startOllama();
                        setTimeout(refreshOllama, 3000);
                      }}
                      className="rounded-lg border px-3 py-1.5 text-[12.5px] font-medium"
                      style={settingsControlInlineStyle}
                    >
                      Start service
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        await modelManager.installOllama();
                        setTimeout(refreshOllama, 5000);
                      }}
                      className="rounded-lg border px-3 py-1.5 text-[12.5px] font-medium"
                      style={settingsControlInlineStyle}
                    >
                      Install Ollama
                    </button>
                  ))}
                <button
                  type="button"
                  aria-label="Refresh Ollama status"
                  onClick={refreshOllama}
                  disabled={isRefreshingOllama}
                  className="rounded-md p-1.5"
                  style={{
                    color: isRefreshingOllama
                      ? theme.hex
                      : settingsSurfaceTokens.textSecondary,
                  }}
                >
                  <Icon
                    name="Activity"
                    className={`h-3.5 w-3.5 ${isRefreshingOllama ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            }
          />
        ) : (
          <WebUnavailableState featureName="Local Ollama installation and service control" />
        )}
        <SettingsAdvancedDisclosure
          title="Routing diagnostics"
          description="How Luca chooses cloud or local models for speed, privacy, and availability."
        >
          <div className="space-y-1.5 text-[12.5px]">
            <div className="flex items-center justify-between">
              <span style={{ color: settingsSurfaceTokens.textSecondary }}>
                Routing status
              </span>
              <span className="font-mono" style={{ color: balancerStatus.color }}>
                {balancerStatus.label}
              </span>
            </div>
          </div>
        </SettingsAdvancedDisclosure>
      </SettingsSection>
    </div>
  );
};

export default SettingsBrainTab;
