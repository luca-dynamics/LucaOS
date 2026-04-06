import React, { useState, useEffect } from "react";
import { Icon } from "./ui/Icon";
import { settingsService, LucaSettings } from "../services/settingsService";
import { useMobile } from "../hooks/useMobile";
import { memoryService } from "../services/memoryService";
import {
  getPersonaConfig,
  savePersonaConfig,
} from "../services/personaService";
import { PERSONA_UI_CONFIG } from "../config/themeColors";
import { PersonaConfig } from "../types";

// Import Refactored Tabs
import SettingsGeneralTab from "./settings/SettingsGeneralTab";
import SettingsBrainTab from "./settings/SettingsBrainTab";
import SettingsVoiceTab from "./settings/SettingsVoiceTab";
import SettingsVisionTab from "./settings/SettingsVisionTab";
import SettingsModelManagerTab from "./settings/SettingsModelManagerTab";
import SettingsIoTTab from "./settings/SettingsIoTTab";
import SettingsConnectorsTab from "./settings/SettingsConnectorsTab";
import SettingsLucaLinkTab from "./settings/SettingsLucaLinkTab";
import SettingsDataTab from "./settings/SettingsDataTab";
import SettingsAboutTab from "./settings/SettingsAboutTab";
import SettingsMCPTab from "./settings/SettingsMCPTab";
import OperatorProfilePanel from "./settings/OperatorProfilePanel";
import PersonalityDashboard from "./settings/PersonalityDashboard";
import KnowledgeBridgeTab from "./settings/KnowledgeBridgeTab";
import SettingsConnectivityTab from "./settings/SettingsConnectivityTab";

interface SettingsModalProps {
  onClose: () => void;
  initialTab?: string;
  theme: {
    primary: string;
    border: string;
    bg: string;
    glow: string;
    coreColor: string;
    hex: string;
    themeName: string;
  };
}

const TABS = [
  {
    id: "general",
    label: "General",
    icon: "Settings",
    platforms: ["desktop", "mobile"],
  },
  { id: "brain", label: "Brain", icon: "Cpu", platforms: ["desktop", "mobile"] },
  { id: "voice", label: "Voice", icon: "Microphone", platforms: ["desktop", "mobile"] },
  {
    id: "vision",
    label: "Vision",
    icon: "Share",
    platforms: ["desktop", "mobile"],
  },
  {
    id: "model-manager",
    label: "Model Manager",
    icon: "Database",
    platforms: ["desktop", "mobile"],
  },
  {
    id: "personality",
    label: "Personality",
    icon: "User",
    platforms: ["desktop", "mobile"],
  },
  {
    id: "profile",
    label: "Profile",
    icon: "InfoCircle",
    platforms: ["desktop", "mobile"],
  },
  {
    id: "lucalink",
    label: "Luca Link",
    icon: "Wifi",
    platforms: ["desktop", "mobile"],
  },
  { id: "mcp", label: "MCP Skills", icon: "Plug", platforms: ["desktop"] },
  {
    id: "iot",
    label: "Smart Home",
    icon: "Home",
    platforms: ["desktop", "mobile"],
  },
  {
    id: "connectors",
    label: "Connectors",
    icon: "Link",
    platforms: ["desktop"],
  },
  {
    id: "data",
    label: "Data & Memory",
    icon: "Database",
    platforms: ["desktop", "mobile"],
  },
  {
    id: "knowledge-bridge",
    label: "Knowledge Bridge",
    icon: "Share",
    platforms: ["desktop", "mobile"],
  },
  {
    id: "connectivity",
    label: "Luca MCP",
    icon: "Link",
    platforms: ["desktop"],
  },
  { id: "about", label: "About", icon: "InfoCircle", platforms: ["desktop", "mobile"] },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  initialTab,
  theme,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab || "general");
  const [settings, setSettings] = useState<LucaSettings>(
    settingsService.getSettings(),
  );
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Persona Config (Lifted State for Unified Save)
  const [personaConfig, setPersonaConfig] = useState<PersonaConfig | null>(
    null,
  );

  // Memory Stats
  const [memoryStats, setMemoryStats] = useState({ count: 0 });
  const isMobile = useMobile();
  const liveTheme =
    (settings?.general?.theme
      ? PERSONA_UI_CONFIG[
          settings.general.theme as keyof typeof PERSONA_UI_CONFIG
        ]
      : theme) ||
    theme ||
    PERSONA_UI_CONFIG.ASSISTANT;

  // Filter tabs by platform
  const currentPlatform = isMobile ? "mobile" : "desktop";
  const visibleTabs = TABS.filter((tab) =>
    tab.platforms.includes(currentPlatform),
  );

  useEffect(() => {
    // Load initial data
    loadMemoryStats();
    loadPersonaData();

    // LISTEN FOR EXTERNAL UPDATES (e.g. Kill Switch)
    const handleSettingsChanged = (newSettings: LucaSettings) => {
      console.log("[SettingsModal] Received external update, syncing...");
      setSettings(newSettings);
    };
    settingsService.on("settings-changed", handleSettingsChanged);

    return () => {
      settingsService.off("settings-changed", handleSettingsChanged);
    };
  }, []);

  const loadMemoryStats = () => {
    const mems = memoryService.getAllMemories();
    setMemoryStats({ count: mems.length });
  };

  const loadPersonaData = async () => {
    const cfg = await getPersonaConfig();
    if (cfg) setPersonaConfig(cfg);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Save General Settings
      await settingsService.saveSettings(settings);

      // 2. Save Persona Config (if loaded)
      if (personaConfig) {
        await savePersonaConfig(personaConfig);
      }

      // Apply System Settings (IPC)
      if (window.luca?.applySystemSettings) {
        window.luca.applySystemSettings(settings.general);
      }

      setStatusMsg("Settings Saved Successfully");
      setTimeout(() => setStatusMsg(""), 2000);
    } catch {
      setStatusMsg("Error Saving Settings");
    }
    setLoading(false);
  };

  const updatePersonaConfig = (
    personaName: string,
    key: string,
    value: string,
  ) => {
    if (!personaConfig) return;

    setPersonaConfig((prev) => {
      if (!prev) return null;

      // Handle ROOT level keys like 'globalInstructions'
      if (personaName === "ROOT") {
        return {
          ...prev,
          [key]: value,
        };
      }

      // Standard per-persona update
      return {
        ...prev,
        personas: {
          ...prev.personas,
          [personaName]: {
            ...prev.personas[personaName],
            [key]: value,
          },
        },
      };
    });
  };

  const updateSetting = (
    section: keyof LucaSettings,
    key: string,
    value: any,
  ) => {
    setSettings((prev) => {
      const sectionData = prev[section];
      if (typeof sectionData === "object" && sectionData !== null) {
        return {
          ...prev,
          [section]: {
            ...sectionData,
            [key]: value,
          },
        };
      }
      return {
        ...prev,
        [section]: value,
      };
    });
  };

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center bg-black/60 glass-blur ${
        isMobile ? "p-2" : "p-4"
      } font-sans select-none`}
    >
      <div
        className={`w-full ${
          isMobile
            ? "max-w-[95vw] h-[85vh] rounded-2xl"
            : "max-w-[90%] h-[90%] rounded-xl"
        } flex flex-row overflow-hidden transition-colors duration-300 tech-border glass-blur`}
        style={{
          boxShadow: `0 0 50px -20px rgba(0,0,0,0.5)`,
          backgroundColor: "var(--app-bg-tint, #050505)",
          borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
        }}
      >
        {/* Unified Sidebar Navigation */}
        <div
          className={`flex flex-col shrink-0 ${isMobile ? "w-20" : "w-64"}`}
          style={{
            backgroundColor: "var(--app-bg-tint, #0a0a0a)",
            borderRight: "1px solid var(--app-border-main, rgba(255,255,255,0.1))",
          }}
        >
          {/* Header Area */}
          <div
            className={`flex items-center gap-2 ${isMobile ? "p-4 justify-center" : "p-5"}`}
            style={{
              borderBottom: "1px solid var(--app-border-main, rgba(255,255,255,0.1))",
            }}
          >
            <Icon
              name="Settings"
              variant="BoldDuotone"
              className={`${isMobile ? "w-5 h-5" : "w-4 h-4"}`}
              style={{ color: liveTheme.hex }}
            />
            {!isMobile && (
              <h2
                className={`text-md font-bold tracking-wider ${liveTheme.primary}`}
              >
                SETTINGS
              </h2>
            )}
          </div>

          {/* Navigation Tabs */}
          <div
            className={`flex-1 overflow-y-auto no-scrollbar ${isMobile ? "p-2" : "p-3"} space-y-2`}
          >
            {visibleTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    color: isActive
                      ? "var(--app-text-main, #ffffff)"
                      : "var(--app-text-muted, #9ca3af)",
                    backgroundColor: isActive
                      ? "var(--app-bg-tint, rgba(255,255,255,0.05))"
                      : "transparent",
                    borderColor: isActive
                      ? "var(--app-border-main, rgba(255,255,255,0.1))"
                      : "transparent",
                  }}
                  title={tab.label}
                  className={`w-full flex items-center rounded-lg border border-transparent transition-all ${liveTheme.themeName?.toLowerCase() === "lucagent" ? "hover:bg-slate-100" : "hover:bg-white/5"} ${
                    isMobile
                      ? "flex-col justify-center py-3 px-1 gap-1"
                      : "flex-row gap-3 p-2.5"
                  }`}
                >
                  <Icon name={tab.icon} variant={isActive ? "BoldDuotone" : "Linear"} className={`${isMobile ? "w-5 h-5" : "w-5 h-5"}`} />
                  {!isMobile ? (
                    <span className="text-sm font-medium">{tab.label}</span>
                  ) : (
                    <span className="text-[8px] font-bold uppercase tracking-tighter opacity-70 text-center leading-[1.1]">
                      {tab.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile Footer Exit - Since we don't have the header X on mobile anymore */}
          {isMobile && (
            <div
              className="p-4 flex justify-center border-t border-white/5"
              onClick={onClose}
            >
              <Icon name="CloseCircle" className="w-5 h-5 text-[var(--app-text-muted)] hover:text-[var(--app-text-main)]" />
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Content Header (Desktop Only) */}
          {!isMobile && (
            <div
              className={`p-5 flex justify-between items-center ${liveTheme.themeName?.toLowerCase() === "lucagent" ? "bg-slate-50/30" : "bg-white/5"}`}
              style={{ borderBottom: `1px solid rgba(255,255,255,0.1)` }}
            >
              <h3
                className={`text-lg font-bold ${liveTheme.themeName?.toLowerCase() === "lucagent" ? "text-[var(--app-text-muted)]" : "text-[var(--app-text-muted)]"}`}
              >
                {TABS.find((t) => t.id === activeTab)?.label}
              </h3>
              <button
                onClick={onClose}
                className={`${liveTheme.themeName?.toLowerCase() === "lucagent" ? "text-[var(--app-text-muted)] hover:text-[var(--app-text-muted)]" : "text-[var(--app-text-muted)] hover:text-[var(--app-text-main)]"} transition-colors`}
              >
                <Icon name="CloseCircle" className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Scrollable Body */}
          <div
            className={`flex-1 basis-0 grow overflow-y-auto ${
              isMobile ? "p-4 pb-32" : "p-6"
            }`}
            style={{
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-y",
            }}
          >
            {activeTab === "general" && (
              <SettingsGeneralTab
                settings={settings}
                onUpdate={updateSetting}
                theme={liveTheme}
              />
            )}
            {activeTab === "brain" && (
              <SettingsBrainTab
                settings={settings}
                onUpdate={updateSetting}
                theme={liveTheme}
              />
            )}
            {activeTab === "personality" && (
              <PersonalityDashboard
                theme={liveTheme}
                config={personaConfig}
                onUpdate={updatePersonaConfig}
              />
            )}
            {activeTab === "voice" && (
              <SettingsVoiceTab
                settings={settings}
                onUpdate={updateSetting}
                theme={liveTheme}
              />
            )}
            {activeTab === "vision" && (
              <SettingsVisionTab
                settings={settings}
                onUpdate={updateSetting}
                theme={liveTheme}
              />
            )}
            {activeTab === "model-manager" && (
              <SettingsModelManagerTab theme={liveTheme} />
            )}
            {activeTab === "profile" && (
              <OperatorProfilePanel theme={liveTheme} />
            )}
            {activeTab === "iot" && (
              <SettingsIoTTab
                settings={settings}
                onUpdate={updateSetting}
                theme={liveTheme}
              />
            )}
            {activeTab === "connectors" && (
              <SettingsConnectorsTab
                settings={settings}
                theme={liveTheme}
                setStatusMsg={setStatusMsg}
              />
            )}
            {activeTab === "lucalink" && (
              <SettingsLucaLinkTab
                settings={settings}
                onUpdate={updateSetting}
                theme={liveTheme}
              />
            )}
            {activeTab === "mcp" && (
              <SettingsMCPTab
                settings={settings}
                theme={liveTheme}
                setStatusMsg={setStatusMsg}
              />
            )}
            {activeTab === "data" && (
              <SettingsDataTab
                memoryStats={memoryStats}
                loadMemoryStats={loadMemoryStats}
                theme={liveTheme}
              />
            )}
            {activeTab === "knowledge-bridge" && (
              <KnowledgeBridgeTab theme={liveTheme} />
            )}
            {activeTab === "connectivity" && (
              <SettingsConnectivityTab />
            )}
            {activeTab === "about" && (
              <SettingsAboutTab theme={liveTheme} settings={settings} />
            )}
          </div>

          {/* Footer Actions */}
            <div
            className={`p-4 flex justify-between items-center ${
              isMobile ? "pb-8" : ""
            }`}
            style={{
              backgroundColor: "var(--app-bg-tint, #0a0a0f)",
              borderTop: "1px solid var(--app-border-main, rgba(255,255,255,0.1))",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className={`text-[10px] md:text-xs ${
                  statusMsg.includes("Error")
                    ? "text-red-500"
                    : "text-green-500"
                }`}
              >
                {statusMsg}
              </div>
            </div>
            <div className="flex gap-2 md:gap-3">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded text-xs ${liveTheme.themeName?.toLowerCase() === "lucagent" ? "text-[var(--app-text-muted)] hover:text-[var(--app-text-muted)] hover:bg-slate-100" : "text-[var(--app-text-muted)] hover:text-[var(--app-text-main)] hover:bg-white/10"} transition-colors`}
              >
                {/* On Personality tab, 'Cancel' is just 'Close' since it saves internally */}
                {/* Reverted: Unified Save uses Cancel for all tabs */}
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                style={{
                  borderColor:
                    liveTheme.themeName?.toLowerCase() === "lucagent"
                      ? "rgba(0,0,0,0.1)"
                      : liveTheme.hex,
                  backgroundColor:
                    liveTheme.themeName?.toLowerCase() === "lucagent"
                      ? "#0f172a"
                      : `${liveTheme.hex}20`,
                  color: "#ffffff",
                }}
                className="px-6 py-2 border hover:opacity-90 rounded text-xs font-bold shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Icon name="Restart" className="w-3 h-3 animate-spin" />
                ) : (
                  <Icon name="Disk" className="w-3 h-3" />
                )}
                {isMobile ? "Save" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
