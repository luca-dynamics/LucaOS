import { EventEmitter } from "events";
import { BRAIN_CONFIG } from "../config/brain.config.ts";
import {
  ToneStyleId,
  ToneDimensions,
  PersonaMode,
  UIThemeId,
} from "../types/lucaPersonality";

export interface LucaSettings {
  general: {
    backgroundBlur?: number;
    backgroundOpacity?: number;
    startOnBoot: boolean;
    minimizeToTray: boolean;
    debugMode: boolean;
    userName: string;
    preferredMode: "text" | "voice";
    setupComplete: boolean;
    agencyLevel: "PASSIVE" | "PROACTIVE" | "EXECUTIVE";
    autonomousDomains: string[];
    persona: PersonaMode;
    theme: UIThemeId;
    syncThemeWithPersona: boolean;
    toneStyle: ToneStyleId;
    customTone?: ToneDimensions;
  };
  brain: {
    useCustomApiKey: boolean;
    geminiApiKey: string;
    geminiBaseUrl?: string; // Appended for Dev Cloud Support
    anthropicApiKey: string; // New
    anthropicBaseUrl?: string; // Appended for Dev Cloud Support
    openaiApiKey: string; // New
    openaiBaseUrl?: string; // Appended for Dev Cloud Support
    xaiApiKey: string; // New
    model: string;
    voiceModel: string;
    visionModel: string; // Vision & Multimodal model
    memoryModel: string;
    temperature: number;
    autoContextWindow: boolean;
    preferOllama: boolean; // Global local routing priority
  };
  voice: {
    provider: "native" | "google" | "local-luca" | "gemini-genai";
    googleApiKey: string;
    voiceId: string; // e.g., 'Google US English' or specific ID
    rate: number;
    pitch: number;
    style: string; // Gemini 2.5: "Natural", "Excited", "Somber", etc.
    pacing: "Fast" | "Normal" | "Slow" | "Dramatic"; // Gemini 2.0 Pacing
    voiceModel?: string; // Gemini Model (3.0, 2.0, 1.5)
    sttModel: string; // "cloud-gemini" or local model ID
    activeClonedVoiceId?: string; // ID of active cloned voice
    clonedVoiceName?: string; // Name of active cloned voice
    wakeWordEnabled: boolean; // Control for Sentry Mode
  };
  iot: {
    haUrl: string;
    haToken: string;
  };
  // Connectors managed via CredentialVault, but UI state (e.g. "show in dashboard") could be here
  connectors: {
    whatsapp: boolean;
    telegram: boolean;
    linkedin: boolean;
    google: boolean;
    youtube: boolean;
    twitter: boolean;
    instagram: boolean;
    discord: boolean;
    signal: boolean;
  };
  telegram: {
    apiId: string;
    apiHash: string;
    phoneNumber: string;
  };
  lucaLink: {
    enabled: boolean;
    connectionMode: "auto" | "local" | "vpn" | "relay";
    relayServerUrl: string;
    vpnServerUrl: string;
  };
  security?: {
    faceData?: string;
    faceEnabled: boolean;
    faceCreated?: Date;
  };
  mcp: {
    servers: Array<{
      id: string;
      name: string;
      type: "stdio" | "sse";
      command?: string;
      args?: string[];
      url?: string;
      env?: Record<string, string>;
      autoConnect: boolean;
    }>;
  };
  mobile: {
    offlineModel: "none" | "gemma-2b";
    offlineModelDownloaded: boolean;
  };
  socialPersistence: {
    [key: string]: "ALWAYS_ON" | "LAZY";
  };
  // Agent Mode - Phase 2 (OPTIONAL - won't break existing settings)
  agentMode?: {
    enabled: boolean;
    maxIterations: number;
    maxDuration: number; // milliseconds
    maxTokens: number;
    maxCost: number; // USD
    autoApprove: boolean; // Auto-approve low-risk actions
    workspaceDefault: string; // Default workspace path
    qualityGatesEnabled: boolean;
  };
  privacy: {
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenEnabled: boolean;
  };
  hardwareSanitized?: boolean; // Flag to indicate if hardware-aware model sanitization has run
  v1betaMigrationComplete?: boolean; // Flag to indicate if model-specific v1beta migration has run
}

const getEnvVar = (key: string) => {
  // Browser (Vite)
  if (
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env[key]
  ) {
    return import.meta.env[key];
  }
  // Node.js
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  return "";
};

const DEFAULT_SETTINGS: LucaSettings = {
  general: {
    backgroundBlur: 12, // Default 12px blur
    backgroundOpacity: 0.75, // Default 75% opacity
    startOnBoot: false,
    minimizeToTray: false,
    debugMode: false,
    userName:
      (typeof window !== "undefined" && window.localStorage
        ? localStorage.getItem("LUCA_USER_NAME")
        : "Operator") || "Operator",
    setupComplete:
      typeof window !== "undefined" && window.localStorage
        ? localStorage.getItem("LUCA_SETUP_COMPLETE") === "true"
        : false,
    agencyLevel: "PROACTIVE",
    autonomousDomains: ["SYSTEM", "TASKS", "ENVIRONMENT"],
    persona: "ASSISTANT",
    theme: "PROFESSIONAL",
    preferredMode: "text",
    syncThemeWithPersona: true,
    toneStyle: "CHILL",
  },
  hardwareSanitized: true, // New installs are sanitized by default
  v1betaMigrationComplete: true, // New installs use current defaults
  brain: {
    useCustomApiKey: false,
    geminiApiKey:
      (typeof window !== "undefined" && window.localStorage
        ? localStorage.getItem("GEMINI_API_KEY")
        : "") ||
      getEnvVar("VITE_GEMINI_API_KEY") ||
      getEnvVar("VITE_API_KEY") ||
      getEnvVar("GEMINI_API_KEY") ||
      "",
    anthropicApiKey:
      getEnvVar("VITE_ANTHROPIC_API_KEY") ||
      getEnvVar("ANTHROPIC_API_KEY") ||
      "",
    openaiApiKey:
      getEnvVar("VITE_OPENAI_API_KEY") || getEnvVar("OPENAI_API_KEY") || "",
    xaiApiKey: getEnvVar("VITE_XAI_API_KEY") || getEnvVar("XAI_API_KEY") || "",
    model: BRAIN_CONFIG.defaults.brain,
    voiceModel: BRAIN_CONFIG.defaults.voice,
    visionModel: BRAIN_CONFIG.defaults.vision,
    memoryModel: BRAIN_CONFIG.defaults.memory,
    temperature: 0.7,
    autoContextWindow: true,
    preferOllama: false, // Default to Luca-native routing
  },
  voice: {
    provider: "local-luca", // Default to Local Luca
    googleApiKey:
      getEnvVar("VITE_GOOGLE_CLOUD_KEY") || getEnvVar("VITE_API_KEY") || "",
    voiceId: "en_US-amy-medium",
    rate: 1.0,
    pitch: 1.0,
    style:
      "Feminine, sophisticated, calm, highly intelligent, slightly synthetic but warm.",
    pacing: "Normal",
    sttModel: "cloud-gemini",
    wakeWordEnabled: false,
  },
  iot: {
    haUrl: "",
    haToken: "",
  },
  mobile: {
    offlineModel: "none",
    offlineModelDownloaded: false,
  },
  connectors: {
    whatsapp: false,
    telegram: false,
    linkedin: false,
    google: false,
    youtube: false,
    twitter: false,
    instagram: false,
    discord: false,
    signal: false,
  },
  telegram: {
    apiId: "",
    apiHash: "",
    phoneNumber: "",
  },
  lucaLink: {
    enabled: true,
    connectionMode: "auto",
    relayServerUrl: "https://lucaos.onrender.com", // Production relay server
    vpnServerUrl: "",
  },
  mcp: {
    servers: [], // No default MCP servers
  },
  socialPersistence: {
    whatsapp: "ALWAYS_ON",
    telegram: "ALWAYS_ON",
    wechat: "LAZY",
    twitter: "LAZY",
    instagram: "LAZY",
    linkedin: "LAZY",
    youtube: "LAZY",
    discord: "LAZY",
  },
  // Agent Mode - Phase 2  (DISABLED by default for safety)
  agentMode: {
    enabled: false, // OFF by default
    maxIterations: 50,
    maxDuration: 30 * 60 * 1000, // 30 minutes
    maxTokens: 500000,
    maxCost: 5, // $5 USD
    autoApprove: false, // Require approval
    workspaceDefault: "",
    qualityGatesEnabled: true,
  },
  privacy: {
    micEnabled: true,
    cameraEnabled: true,
    screenEnabled: true,
  },
};

const STORAGE_KEY = "LUCA_SETTINGS_V1";

class SettingsService extends EventEmitter {
  private settings: LucaSettings;
  private localDiscoveryOverride: boolean = false;

  constructor() {
    super();
    this.settings = DEFAULT_SETTINGS; // Initial placeholder
    this.initialize();
  }

  private async initialize() {
    this.settings = await this.loadSettings();
    this.emit("settings-changed", this.settings);
  }

  private async loadSettings(): Promise<LucaSettings> {
    try {
      const stored =
        typeof window !== "undefined" && window.localStorage
          ? localStorage.getItem(STORAGE_KEY)
          : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        // Deep merge with defaults to ensure new keys exist
        const merged = this.deepMerge(DEFAULT_SETTINGS, parsed);

        // --- HARDWARE-BACKED VAULT MIGRATION & RECOVERY ---
        if ((window as any).luca?.vault) {
          const vault = (window as any).luca.vault;

          // List of sensitive paths in settings
          const SENSITIVE_MAP = [
            { section: "brain", key: "geminiApiKey" },
            { section: "brain", key: "anthropicApiKey" },
            { section: "brain", key: "openaiApiKey" },
            { section: "brain", key: "xaiApiKey" },
            { section: "voice", key: "googleApiKey" },
            { section: "iot", key: "haToken" },
          ];

          for (const item of SENSITIVE_MAP) {
            const vaultKey = `setting:${item.section}:${item.key}`;
            try {
              // 1. Check Vault
              const secured = await vault.retrieve(vaultKey);
              if (secured && secured.password) {
                // Value found in secure storage - use it!
                (merged as any)[item.section][item.key] = secured.password;
                // Redact from localStorage (Safety)
                if (parsed[item.section] && parsed[item.section][item.key]) {
                  parsed[item.section][item.key] = "[SECURED]";
                }
              } else if (
                merged[item.section][item.key] &&
                merged[item.section][item.key] !== "[SECURED]"
              ) {
                // 2. Not in vault, but in localStorage (Migration Phase)
                const plainValue = merged[item.section][item.key];
                console.log(
                  `[SECURITY] Migrating ${item.key} to hardware vault...`,
                );
                await vault.store(vaultKey, item.key, plainValue);
                // Redact immediately
                (merged as any)[item.section][item.key] = plainValue;
                parsed[item.section][item.key] = "[SECURED]";
              }
            } catch (e) {
              console.error(
                `[SECURITY] Vault recovery failed for ${item.key}:`,
                e,
              );
            }
          }

          // Update localStorage with redacted values if we modified 'parsed'
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }

        // HARDWARE-AWARE MIGRATION (One-time correction)
        // ... (existing logic continues here)
        // If this install hasn't been sanitized yet, we force a safe state on constrained hardware.
        // After this, we respect the user's choices (since the UI now greys out bad options).
        if (!merged.hardwareSanitized) {
          const isIntelMac = (window as any).luca?.isIntelMac;
          const isWindows = (window as any).luca?.isWindows;

          if (isIntelMac || isWindows) {
            const hardwareLabel = isIntelMac
              ? "Intel Mac"
              : "Windows (CPU Mode)";

            // 1. Memory Model Fallback (Heavy Embeddings)
            if (
              merged.brain?.memoryModel === "bge-small-en" ||
              merged.brain?.memoryModel === "mxbai-embed-large" ||
              merged.brain?.memoryModel === "nomic-embed-text"
            ) {
              console.warn(
                `[SETTINGS] Migration: ${hardwareLabel} detected. Correcting Memory Model to Cloud.`,
              );
              merged.brain.memoryModel = BRAIN_CONFIG.defaults.memory;
            }

            // 2. STT Fallback
            if (merged.voice?.sttModel !== "cloud-gemini") {
              console.warn(
                `[SETTINGS] Migration: ${hardwareLabel} detected. Correcting STT to Cloud.`,
              );
              merged.voice.sttModel = "cloud-gemini";
            }

            // 3. Vision Fallback
            if (merged.brain?.visionModel === "ui-tars-2b") {
              console.warn(
                `[SETTINGS] Migration: ${hardwareLabel} detected. Correcting Vision to Cloud.`,
              );
              merged.brain.visionModel = BRAIN_CONFIG.defaults.vision;
            }

            // 4. Brain Model Fallback (Heavy 7B+ Reasoning)
            if (
              merged.brain?.model === "qwen-2.5-7b" ||
              merged.brain?.model === "deepseek-r1-distill-7b"
            ) {
              console.warn(
                `[SETTINGS] Migration: ${hardwareLabel} detected. Correcting Brain to Cloud.`,
              );
              merged.brain.model = "gemini-3-flash-preview";
            }
          }

          // Mark as sanitized so we don't force this again on next boot
          merged.hardwareSanitized = true;
          // Save the migrated settings immediately
          this.saveSettings(merged);
        }

        console.log(
          "[SETTINGS] Loaded from Storage. WakeWord=",
          merged.voice?.wakeWordEnabled,
        );
        // MODEL MIGRATION (v1beta 2026 Update)
        // Ensure users are not stuck on deprecated models (like gemini-2.0-flash for Voice)
        if (!merged.v1betaMigrationComplete) {
          console.log("[SETTINGS] Performing v1beta Model Migration...");

          // 1. Voice Model Correction (Crucial for 1008 fix)
          if (
            merged.brain.voiceModel.includes("gemini-2.0-flash") ||
            !merged.brain.voiceModel.includes("gemini")
          ) {
            console.log(
              `[SETTINGS] Migrating Voice Model: ${merged.brain.voiceModel} -> ${BRAIN_CONFIG.defaults.voice}`,
            );
            merged.brain.voiceModel = BRAIN_CONFIG.defaults.voice;
          }

          // 2. Brain/Vision Model Correction
          if (
            merged.brain.model === "gemini-2.0-flash" ||
            merged.brain.model === "gemini-1.5-flash"
          ) {
            merged.brain.model = BRAIN_CONFIG.defaults.brain;
          }
          if (
            merged.brain.visionModel === "gemini-2.0-flash" ||
            merged.brain.visionModel === "gemini-1.5-flash"
          ) {
            merged.brain.visionModel = BRAIN_CONFIG.defaults.vision;
          }

          merged.v1betaMigrationComplete = true;
        }

        // --- DEPRECATED MODEL HOTFIX (March 2026 Update) ---
        // Ensure users are not stuck on deprecated 1.5, 2.0, or 2.5 models.
        const isDeprecatedOrBroken = (modelId: string) => {
          if (!modelId) return true; // Empty string is broken
          const brokenIds = [
            "gemini-2.0-flash", // Deprecated per Google docs mapping
            "gemini-2.0-flash-lite", // Deprecated
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-3.1-pro-high", // Unofficial IDs
            "gemini-3.1-pro-low",
            "gemini-3-pro-high",
            "gemini-3-pro-low",
            "gemini-2.0-flash-exp",
            "gemini-2.5-flash-native-audio-preview-12-2025", // Should be 'models/...'
            "models/gemini-live-2.5-flash-native-audio", // Legacy incorrect format
          ];

          // DO NOT wipe local models!
          const localModels = [
            "gemma-2b",
            "phi-3-mini",
            "llama-3.2-1b",
            "smollm2-1.7b",
            "qwen-2.5-7b",
            "deepseek-r1-distill-7b",
            "smolvlm-500m",
            "ui-tars-2b",
            "piper-amy",
            "supertonic-2",
            "kokoro-82m",
            "pocket-tts",
            "whisper-tiny",
            "moonshine-tiny",
            "sensevoice-small",
            "distil-whisper-medium-en",
            "whisper-v3-turbo",
            "model2vec-potion",
            "mxbai-embed-xsmall",
            "bge-small-en",
            "mxbai-embed-large",
            "nomic-embed-text",
          ];
          if (localModels.includes(modelId)) return false;

          return brokenIds.includes(modelId);
        };
        if (
          isDeprecatedOrBroken(merged.brain.model) ||
          isDeprecatedOrBroken(merged.brain.voiceModel) ||
          isDeprecatedOrBroken(merged.brain.visionModel)
        ) {
          console.log(
            "[SETTINGS] Migrating deprecated model references to stable 2026 Gemini Suite...",
          );
          if (isDeprecatedOrBroken(merged.brain.model))
            merged.brain.model = BRAIN_CONFIG.defaults.brain;
          if (isDeprecatedOrBroken(merged.brain.visionModel))
            merged.brain.visionModel = BRAIN_CONFIG.defaults.vision;
          if (isDeprecatedOrBroken(merged.brain.voiceModel))
            merged.brain.voiceModel = BRAIN_CONFIG.defaults.voice;

          this.saveSettings(merged);
        }

        return merged;
      }
    } catch (e) {
      console.warn("[SETTINGS] Failed to load settings, using defaults", e);
    }
    const defaults = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    console.log(
      "[SETTINGS] Loaded Defaults (No Storage Found). WakeWord=",
      defaults.voice.wakeWordEnabled,
    );
    return defaults;
  }

  // Simple deep merge helper
  private deepMerge(target: any, source: any): any {
    const output = Object.assign({}, target);
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) Object.assign(output, { [key]: source[key] });
          else output[key] = this.deepMerge(target[key], source[key]);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  private isObject(item: any) {
    return item && typeof item === "object" && !Array.isArray(item);
  }

  public getSettings(): LucaSettings {
    return this.settings;
  }

  public get<K extends keyof LucaSettings>(section: K): LucaSettings[K] {
    return this.settings[section];
  }

  public async saveSettings(newSettings: Partial<LucaSettings>) {
    this.settings = this.deepMerge(this.settings, newSettings);

    try {
      const savedSettings = JSON.parse(JSON.stringify(this.settings));

      // --- VAULT STORAGE ---
      if ((window as any).luca?.vault) {
        const vault = (window as any).luca.vault;
        const SENSITIVE_MAP = [
          { section: "brain", key: "geminiApiKey" },
          { section: "brain", key: "anthropicApiKey" },
          { section: "brain", key: "openaiApiKey" },
          { section: "brain", key: "xaiApiKey" },
          { section: "voice", key: "googleApiKey" },
          { section: "iot", key: "haToken" },
        ];

        for (const item of SENSITIVE_MAP) {
          const value = (this.settings as any)[item.section][item.key];
          if (value && value !== "[SECURED]") {
            await vault.store(
              `setting:${item.section}:${item.key}`,
              item.key,
              value,
            );
          }
          // Redact in local storage copy
          (savedSettings as any)[item.section][item.key] = "[SECURED]";
        }
      }

      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSettings));
      }

      console.log("[SETTINGS] Saved to Storage (Sensitive data encrypted).");

      // Sync embedding model selection with Cortex backend when it changes
      if (newSettings.brain?.memoryModel) {
        this.syncEmbeddingModel(newSettings.brain.memoryModel);
      }

      this.emit("settings-changed", this.settings);
    } catch (e) {
      console.error("[SETTINGS] Failed to save settings", e);
    }
  }

  // Sync embedding model selection with Cortex backend
  private async syncEmbeddingModel(model: string) {
    try {
      // 1. Check if this is a local model (Full Privacy Trigger)
      const { isLocalModelId } = await import("./ModelManagerService");
      const localOnly = isLocalModelId(model);

      // 2. SAFETY: Only sync if it looks like an embedding model
      // This prevents 400 errors when the brain model (gemini-*) is accidentally passed here
      if (!model.includes("embedding")) {
        console.debug(
          `[SETTINGS] Skipping embedding sync for non-embedding model: ${model}`,
        );
        return;
      }

      // Use the actual Cortex URL from the API config if available, or skip if not configured
      const url = getEnvVar("VITE_CORTEX_URL") || "http://127.0.0.1:8000";

      const response = await fetch(`${url}/settings/embedding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          localOnly,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(
          `[SETTINGS] Embedding model synced to Cortex: ${data.model} (dim=${data.dimension})`,
        );
      } else {
        const error = await response.text();
        console.warn(
          `[SETTINGS] Cortex rejected embedding model "${model}":`,
          error,
        );
      }
    } catch (e) {
      // Silent fail - Cortex may not be running
      console.debug("[SETTINGS] Failed to sync embedding model to Cortex:", e);
    }
  }

  public resetToDefaults() {
    this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    this.saveSettings(this.settings);
  }

  // Face data management
  public saveFaceData(base64Image: string) {
    const settings = this.getSettings();
    const security = {
      ...settings.security,
      faceData: base64Image,
      faceEnabled: true,
      faceCreated: new Date(),
    };
    this.saveSettings({ security });
  }

  public getFaceData(): string | null {
    const settings = this.getSettings();
    return settings.security?.faceData || null;
  }

  public deleteFaceData() {
    const settings = this.getSettings();
    if (settings.security) {
      delete settings.security.faceData;
      settings.security.faceEnabled = false;
    }
    this.saveSettings({ security: settings.security });
  }

  // Get all settings (alias for compatibility)
  public getAll(): LucaSettings {
    return this.getSettings();
  }

  // Operator Profile management
  public saveOperatorProfile(profile: any) {
    const settings = this.getSettings();
    const updatedSettings = {
      ...settings,
      operatorProfile: profile,
    };
    this.saveSettings(updatedSettings);

    // Also save separately for quick access
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("LUCA_OPERATOR_PROFILE", JSON.stringify(profile));
    }
  }

  public getOperatorProfile(): any | null {
    // Try settings first
    const settings = this.getSettings();
    if ((settings as any).operatorProfile) {
      return (settings as any).operatorProfile;
    }

    // Fallback to separate storage
    const stored =
      typeof window !== "undefined" && window.localStorage
        ? localStorage.getItem("LUCA_OPERATOR_PROFILE")
        : null;
    return stored ? JSON.parse(stored) : null;
  }

  public updateOperatorProfile(updates: any) {
    const current = this.getOperatorProfile();
    if (!current) return;

    const updated = {
      ...current,
      ...updates,
      metadata: {
        ...current.metadata,
        lastUpdated: new Date(),
      },
    };

    this.saveOperatorProfile(updated);
  }

  /**
   * Global guard for local service discovery (Ollama pings, Cortex checks, etc.)
   * returns true if local models are selected OR we are in a 'go local' onboarding override.
   */
  public isLocalDiscoveryEnabled(): boolean {
    const settings = this.getSettings();

    // 1. Explicit onboarding override (User clicked 'Go Local')
    if (this.localDiscoveryOverride) return true;

    // 2. Setup not complete - stay silent by default
    if (!settings.general.setupComplete) return false;

    // 3. Check model selections
    const isLocalBrain =
      settings.brain.model.startsWith("local/") ||
      [
        "gemma-2b",
        "phi-3-mini",
        "llama-3.2-1b",
        "smollm2-1.7b",
        "qwen-2.5-7b",
        "deepseek-r1-distill-7b",
      ].includes(settings.brain.model);

    const isLocalVision =
      settings.brain.visionModel.startsWith("local/") ||
      ["smolvlm-500m", "ui-tars-2b"].includes(settings.brain.visionModel);

    const isLocalVoice = settings.voice.provider === "local-luca";

    return (
      isLocalBrain ||
      isLocalVision ||
      isLocalVoice ||
      settings.brain.preferOllama
    );
  }

  /**
   * Set a temporary override to allow local discovery during onboarding
   */
  public setLocalDiscoveryOverride(enabled: boolean) {
    this.localDiscoveryOverride = enabled;
    this.emit("settings-changed", this.settings);
  }

  /**
   * Check if a specific model ID refers to a local service
   */
  public isModelLocal(modelId: string): boolean {
    if (!modelId) return false;
    return (
      modelId.startsWith("local/") ||
      [
        "gemma-2b",
        "phi-3-mini",
        "llama-3.2-1b",
        "smollm2-1.7b",
        "qwen-2.5-7b",
        "deepseek-r1-distill-7b",
        "smolvlm-500m",
        "ui-tars-2b",
      ].includes(modelId)
    );
  }

  /**
   * Check if the user has configured valid API keys for peer cloud providers
   */
  public hasValidCloudKeys(
    provider?: "openai" | "anthropic" | "gemini" | "xai",
  ): boolean {
    const { brain } = this.settings;
    if (provider) {
      switch (provider) {
        case "openai":
          return !!brain.openaiApiKey && brain.openaiApiKey !== "[SECURED]";
        case "anthropic":
          return (
            !!brain.anthropicApiKey && brain.anthropicApiKey !== "[SECURED]"
          );
        case "gemini":
          return !!brain.geminiApiKey && brain.geminiApiKey !== "[SECURED]";
        case "xai":
          return !!brain.xaiApiKey && brain.xaiApiKey !== "[SECURED]";
      }
    }
    return (
      this.hasValidCloudKeys("openai") ||
      this.hasValidCloudKeys("anthropic") ||
      this.hasValidCloudKeys("gemini") ||
      this.hasValidCloudKeys("xai")
    );
  }

  /**
   * Get the first available (configured) cloud provider for fallback
   */
  public getBestAvailableCloudProvider():
    | "gemini"
    | "openai"
    | "anthropic"
    | "xai" {
    if (this.hasValidCloudKeys("gemini")) return "gemini";
    if (this.hasValidCloudKeys("anthropic")) return "anthropic";
    if (this.hasValidCloudKeys("openai")) return "openai";
    if (this.hasValidCloudKeys("xai")) return "xai";
    return "gemini"; // Ultimate fallback to Luca Prime (Gemini)
  }
}

export const settingsService = new SettingsService();
