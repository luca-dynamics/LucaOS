import React, { useState, useEffect, useRef } from "react";
import { Icon } from "../ui/Icon";
import { settingsService, LucaSettings } from "../../services/settingsService";
import { modelManager, LocalModel } from "../../services/ModelManagerService";
import {
  ANTHROPIC_CLAUDE_MODELS,
  DEEPSEEK_MODELS,
  GEMINI_MODELS,
  OPENAI_GPT_5_6_MODELS,
  XAI_GROK_MODELS,
} from "../../config/brain.config";
import {
  lucaMaterialControlActiveStyle,
  lucaMaterialControlStyle,
  lucaMaterialPopoverStyle,
} from "../../styles/lucaMaterialSystem";

interface ChatModelSwitcherProps {
  themeName?: string;
  primaryColor?: string;
}

// Map of core display models matching SettingsBrainTab
const CLOUD_MODELS = [
  // Elite Intelligence
  ...OPENAI_GPT_5_6_MODELS.map((model) => ({ id: model.id, name: model.name, provider: "OpenAI" })),
  ...ANTHROPIC_CLAUDE_MODELS.map((model) => ({ id: model.id, name: model.name, provider: "Anthropic" })),
  ...GEMINI_MODELS.map((model) => ({ id: model.id, name: model.name, provider: "Google" })),
  ...DEEPSEEK_MODELS.map((model) => ({ id: model.id, name: model.name, provider: "DeepSeek" })),
  ...XAI_GROK_MODELS.map((model) => ({ id: model.id, name: model.name, provider: "xAI" })),
  { id: "gemini-2.5-pro",          name: "Gemini 2.5 Pro (Legacy)",          provider: "Google" },
  { id: "gemini-2.5-flash",        name: "Gemini 2.5 Flash (Legacy)",        provider: "Google" },
  { id: "deepseek-reasoner",       name: "DeepSeek Reasoner (Compatibility)", provider: "DeepSeek" },
  { id: "grok-2-1212",             name: "Grok 2 (Legacy)",                  provider: "xAI" },
  { id: "gpt-4o",                  name: "GPT-4o (Legacy)",                  provider: "OpenAI" },

  // Luca Prime (Managed — enterprise key, no setup needed)
  { id: "gemini-2.0-flash",        name: "Gemini 2.0 Flash (Luca Prime ★)", provider: "Google" },
  { id: "deepseek-chat",           name: "DeepSeek Chat (V3)",               provider: "DeepSeek" },
];


const ADVANCED_MODELS = [
  { id: "custom", name: "Custom / External (Ollama)", provider: "Ollama" },
];

// Combine all for easy lookup
const ALL_CLOUD_MODELS = [...CLOUD_MODELS, ...ADVANCED_MODELS];


const ChatModelSwitcher: React.FC<ChatModelSwitcherProps> = ({ primaryColor = "#10b981" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>("gemini-1.5-flash");
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sanitize color
  const safeColor = primaryColor.startsWith("#") && primaryColor.length > 7 ? primaryColor.slice(0, 7) : primaryColor;

  useEffect(() => {
    // Initial load from settings
    setCurrentModel(settingsService.get("brain").model);

    // Subscribe to settings changes
    const handleSettingsChange = (newSettings: LucaSettings) => {
      setCurrentModel(newSettings.brain.model);
    };
    settingsService.on("settings-changed", handleSettingsChange);

    // Load available local models
    const loadLocalModels = async () => {
      const models = await modelManager.getModels();
      setLocalModels(models.filter((m) => m.category === "brain" && m.status === "ready"));
    };
    loadLocalModels();

    const unsubscribeModelManager = modelManager.subscribe((allModels: LocalModel[]) => {
      setLocalModels(allModels.filter((m: LocalModel) => m.category === "brain" && m.status === "ready"));
    });

    // Click outside listener
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      settingsService.off("settings-changed", handleSettingsChange);
      unsubscribeModelManager();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectModel = (modelId: string) => {
    settingsService.saveSettings({
      brain: { ...settingsService.get("brain"), model: modelId }
    });
    setIsOpen(false);
  };

  // Determine current active config
  let activeDisplay = "Unknown Model";
  const isReasoningActive = [
    "gemini-2.5-pro",
    "claude-fable-5",
    "claude-opus-4-8",
    "claude-sonnet-5",
    "deepseek-reasoner",
    "deepseek-v4-pro",
    "deepseek-v4-flash",
    "grok-4.5",
    "grok-2-1212",
  ].includes(currentModel) ||
    currentModel.includes("thinking") ||
    currentModel.includes("reasoner") ||
    currentModel.includes("o1") ||
    currentModel.startsWith("gpt-5.6") ||
    currentModel.includes("-pro");

                          
  const baseCloudModel = ALL_CLOUD_MODELS.find(m => m.id === currentModel);

  if (baseCloudModel) {
    activeDisplay = baseCloudModel.name;
  } else {
    // Could be a local model or obscure cloud
    const localMatch = localModels.find(m => m.id === currentModel);
    if (localMatch) {
      // Local models in Settings show size, e.g. "Gemma 2B - 2.1 GB".
      // Let's just use the friendly base name or size string if we have it.
      // E.g. "Gemma 2B"
      activeDisplay = localMatch.name;
    } else {
      // Formatted fallback
      activeDisplay = currentModel.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
  }


  return (
    <div className="relative pointer-events-auto" ref={dropdownRef} style={{ WebkitAppRegion: "no-drag" } as any}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="luca-material-pressable group flex h-[24px] items-center gap-1.5 rounded-md border px-2 py-1 transition-colors hover:bg-[var(--luca-surface-hover)] sm:h-[27px] sm:px-2.5 sm:py-1.5"
        style={lucaMaterialControlStyle}
        title="Change Intelligence Model"
      >
        <span
          className="text-[10px] sm:text-[11px] font-medium truncate max-w-[100px] sm:max-w-[130px] whitespace-nowrap"
          style={{ color: "var(--luca-text-secondary, var(--app-text-muted))" }}
        >
          {activeDisplay}
        </span>

        {/* Reasoning Status Indicator */}
        {isReasoningActive && (
          <Icon name="Sparkles" className="w-2.5 h-2.5 text-[var(--luca-warning,#f2b23e)] animate-pulse ml-0.5" />
        )}

        <Icon
          name="AltArrowDown"
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          style={{ color: "var(--luca-text-tertiary, var(--app-text-muted))" }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 z-[100] mb-2 w-64 overflow-hidden rounded-xl border shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={lucaMaterialPopoverStyle}
        >

          <div className="p-1 max-h-[350px] overflow-y-auto">
            {/* Cloud Models */}
            <div className="mt-1 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--luca-text-tertiary)]">
               Cloud Intelligence
            </div>
            {CLOUD_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => handleSelectModel(model.id)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[var(--luca-text-secondary)] transition-colors hover:bg-[var(--luca-surface-hover)] hover:text-[var(--luca-text-primary)]"
                style={currentModel === model.id ? lucaMaterialControlActiveStyle : undefined}
              >
                <div className="flex items-center gap-2">
                  <Icon name="Cloud" className="h-3 w-3 text-[var(--luca-text-tertiary)]" />
                  <span className="text-xs font-medium">{model.name}</span>
                </div>
                {currentModel === model.id && <Icon name="Check" className="w-3.5 h-3.5" style={{ color: safeColor }} />}
              </button>
            ))}

            {/* Local Models List */}
            {localModels.length > 0 && (
              <>
                <div className="mt-2 border-t border-[var(--luca-border-subtle)] px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--luca-text-tertiary)]">
                   Local Models (Offline)
                </div>
                {localModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleSelectModel(model.id)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[var(--luca-text-secondary)] transition-colors hover:bg-[var(--luca-surface-hover)] hover:text-[var(--luca-text-primary)]"
                    style={currentModel === model.id ? lucaMaterialControlActiveStyle : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <Icon name="Lock" className="h-3 w-3 text-[var(--luca-success,#4fbf7a)]" />
                      <span className="text-xs font-medium">{model.name}</span>
                    </div>
                    {currentModel === model.id && <Icon name="Check" className="w-3.5 h-3.5" style={{ color: safeColor }} />}
                  </button>
                ))}
              </>
            )}

            {/* Advanced Models */}
            <div className="mt-2 border-t border-[var(--luca-border-subtle)] px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--luca-text-tertiary)]">
               Advanced
            </div>
            {ADVANCED_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => handleSelectModel(model.id)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[var(--luca-text-secondary)] transition-colors hover:bg-[var(--luca-surface-hover)] hover:text-[var(--luca-text-primary)]"
                style={currentModel === model.id ? lucaMaterialControlActiveStyle : undefined}
              >
                <div className="flex items-center gap-2">
                  <Icon name="Server" className="h-3 w-3 text-[var(--luca-text-tertiary)]" />
                  <span className="text-xs font-medium">{model.name}</span>
                </div>
                {currentModel === model.id && <Icon name="Check" className="w-3.5 h-3.5" style={{ color: safeColor }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatModelSwitcher;
