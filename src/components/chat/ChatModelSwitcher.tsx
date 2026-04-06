import React, { useState, useEffect, useRef } from "react";
import { Icon } from "../ui/Icon";
import { settingsService, LucaSettings } from "../../services/settingsService";
import { modelManager, LocalModel } from "../../services/ModelManagerService";

interface ChatModelSwitcherProps {
  themeName?: string;
  primaryColor?: string;
}

// Map of core display models matching SettingsBrainTab
const CLOUD_MODELS = [
  // Elite Intelligence
  { id: "gemini-2.5-pro",          name: "Gemini 2.5 Pro (Elite)",          provider: "Google" },
  { id: "gemini-2.5-flash",        name: "Gemini 2.5 Flash (Recommended)",  provider: "Google" },
  { id: "claude-4.5-sonnet",       name: "Claude 4.5 Sonnet (Elite)",        provider: "Anthropic" },
  { id: "claude-4.5-sonnet-thinking", name: "Claude 4.5 (Thinking)",        provider: "Anthropic" },
  { id: "deepseek-reasoner",       name: "DeepSeek Reasoner (R1)",           provider: "DeepSeek" },
  { id: "grok-2-1212",             name: "Grok 2 Ultra",                     provider: "xAI" },

  // Luca Prime (Managed — enterprise key, no setup needed)
  { id: "gemini-2.0-flash",        name: "Gemini 2.0 Flash (Luca Prime ★)", provider: "Google" },
  { id: "deepseek-chat",           name: "DeepSeek Chat (V3)",               provider: "DeepSeek" },
  { id: "gpt-4o",                  name: "GPT-4o",                           provider: "OpenAI" },
];


const ADVANCED_MODELS = [
  { id: "custom", name: "Custom / External (Ollama)", provider: "Ollama" },
];

// Combine all for easy lookup
const ALL_CLOUD_MODELS = [...CLOUD_MODELS, ...ADVANCED_MODELS];


const ChatModelSwitcher: React.FC<ChatModelSwitcherProps> = ({ themeName = "default", primaryColor = "#10b981" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>("gemini-1.5-flash");
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isLight = themeName.toLowerCase() === "lucagent" || themeName.toLowerCase() === "agentic-slate" || themeName.toLowerCase() === "light";

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
    "claude-4.5-sonnet-thinking",
    "deepseek-reasoner",
    "grok-2-1212",
  ].includes(currentModel) ||
    currentModel.includes("thinking") ||
    currentModel.includes("reasoner") ||
    currentModel.includes("o1") ||
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
        className={`flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-md border transition-all active:scale-95 ${
          isLight ? "hover:bg-gray-100 bg-white shadow-sm" : "hover:bg-white/10 bg-black/20"
        } group`}
        style={{ borderColor: `${safeColor}40` }}
        title="Change Intelligence Model"
      >
        <span className={`text-[11px] sm:text-xs font-bold ${isLight ? "text-gray-700" : "text-gray-200"}`}>
          {activeDisplay}
        </span>
        
        {/* Reasoning Status Indicator */}
        {isReasoningActive && (
          <Icon name="Sparkles" className="w-2.5 h-2.5 text-amber-500 animate-pulse ml-0.5" />
        )}

        <Icon name="AltArrowDown" className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${isLight ? "text-gray-400" : "text-gray-500"}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className={`absolute bottom-full left-0 mb-2 w-64 rounded-xl border shadow-2xl overflow-hidden z-[100] animate-in slide-in-from-bottom-2 fade-in duration-200 ${
            isLight ? "bg-white border-gray-200" : "bg-[#1e1e24] border-white/10"
          }`}
        >

          <div className="p-1 max-h-[350px] overflow-y-auto">
            {/* Cloud Models */}
            <div className={`mt-1 px-2 py-1.5 text-[9px] font-bold tracking-wider uppercase ${isLight ? "text-gray-400" : "text-gray-500"}`}>
               Cloud Intelligence
            </div>
            {CLOUD_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => handleSelectModel(model.id)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${
                  currentModel === model.id
                    ? (isLight ? "bg-emerald-50 text-emerald-700" : "bg-white/10 text-white")
                    : (isLight ? "hover:bg-gray-100 text-gray-700" : "hover:bg-white/5 text-gray-300")
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon name="Cloud" className={`w-3 h-3 ${isLight ? "text-gray-500" : "opacity-50"}`} />
                  <span className="text-xs font-medium">{model.name}</span>
                </div>
                {currentModel === model.id && <Icon name="Check" className="w-3.5 h-3.5" style={{ color: safeColor }} />}
              </button>
            ))}

            {/* Local Models List */}
            {localModels.length > 0 && (
              <>
                <div className={`mt-2 px-2 py-1.5 text-[9px] font-bold tracking-wider uppercase border-t ${isLight ? "border-gray-100 text-gray-400" : "border-white/5 text-gray-500"}`}>
                   Local Models (Offline)
                </div>
                {localModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleSelectModel(model.id)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${
                       currentModel === model.id
                        ? (isLight ? "bg-emerald-50 text-emerald-700" : "bg-white/10 text-white")
                        : (isLight ? "hover:bg-gray-100 text-gray-700" : "hover:bg-white/5 text-gray-300")
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon name="Lock" className={`w-3 h-3 ${isLight ? "text-emerald-600" : "text-emerald-500"}`} />
                      <span className="text-xs font-medium">{model.name}</span>
                    </div>
                    {currentModel === model.id && <Icon name="Check" className="w-3.5 h-3.5" style={{ color: safeColor }} />}
                  </button>
                ))}
              </>
            )}

            {/* Advanced Models */}
            <div className={`mt-2 px-2 py-1.5 text-[9px] font-bold tracking-wider uppercase border-t ${isLight ? "border-gray-100 text-gray-400" : "border-white/5 text-gray-500"}`}>
               Advanced
            </div>
            {ADVANCED_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => handleSelectModel(model.id)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${
                  currentModel === model.id
                    ? (isLight ? "bg-emerald-50 text-emerald-700" : "bg-white/10 text-white")
                    : (isLight ? "hover:bg-gray-100 text-gray-700" : "hover:bg-white/5 text-gray-300")
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon name="Server" className={`w-3 h-3 ${isLight ? "text-gray-500" : "opacity-50"}`} />
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
