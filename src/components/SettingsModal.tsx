import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "./ui/Icon";
import { settingsService, LucaSettings } from "../services/settingsService";
import { useMobile } from "../hooks/useMobile";
import { memoryService } from "../services/memoryService";
import {
  getPersonaConfig,
  savePersonaConfig,
} from "../services/personaService";
import { PERSONA_UI_CONFIG, getDynamicContrast } from "../config/themeColors";
import { PersonaConfig } from "../types";
import { getLucaSkinMaterialVariables } from "../styles/lucaSkinMaterialBridge";

// Import Refactored Tabs
import SettingsGeneralTab from "./settings/SettingsGeneralTab";
import SettingsAppearanceTab from "./settings/SettingsAppearanceTab";
import SettingsBrainTab from "./settings/SettingsBrainTab";
import SettingsVoiceTab from "./settings/SettingsVoiceTab";
import SettingsVisionTab from "./settings/SettingsVisionTab";
import SettingsModelManagerTab from "./settings/SettingsModelManagerTab";
import SettingsIoTTab from "./settings/SettingsIoTTab";
import SettingsConnectorsTab from "./settings/SettingsConnectorsTab";
import SettingsLucaLinkTab from "./settings/SettingsLucaLinkTab";
import SettingsDataTab from "./settings/SettingsDataTab";
import SettingsMCPBridgeTab from "./settings/SettingsMCPBridgeTab";
import SettingsAboutTab from "./settings/SettingsAboutTab";
import OperatorProfilePanel from "./settings/OperatorProfilePanel";
import PersonalityDashboard from "./settings/PersonalityDashboard";
import KnowledgeBridgeTab from "./settings/KnowledgeBridgeTab";
import SettingsAutonomyTab from "./settings/SettingsAutonomyTab";
import {
  isMobileAdvancedSettingsTab,
  mobileAvailableAdvancedSettingsTabs,
  mobileSettingsNavigationTabs,
  settingsAdvancedGroup,
  settingsDesktopTabs,
  settingsNavigationGroups,
} from "./settings/settingsNavigationModel";

interface SettingsModalProps {
  onClose: () => void;
  initialTab?: string;
  themePreviewTargetRef?: React.RefObject<HTMLElement>;
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

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  initialTab,
  themePreviewTargetRef,
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
  const skinMaterialVariables = useMemo(
    () =>
      getLucaSkinMaterialVariables({
        skinId: settings.general.selectedSkinId,
        hostKind: isMobile ? "mobile-web" : "desktop-web",
      }),
    [settings.general.selectedSkinId, isMobile],
  );
  const legacyLiveTheme =
    (settings?.general?.theme
      ? PERSONA_UI_CONFIG[
          settings.general.theme as keyof typeof PERSONA_UI_CONFIG
        ]
      : theme) ||
    theme ||
    PERSONA_UI_CONFIG.ASSISTANT;
  const liveTheme = {
    ...legacyLiveTheme,
    hex: skinMaterialVariables["--luca-accent-primary"] || legacyLiveTheme.hex,
    primary:
      skinMaterialVariables["--luca-accent-primary"] ||
      legacyLiveTheme.primary,
    bg: skinMaterialVariables["--luca-background-base"] || legacyLiveTheme.bg,
  };

  // Desktop keeps every tab discoverable in grouped sections. Mobile keeps
  // standard settings primary and places advanced features behind one entry.
  const visibleTabs = isMobile
    ? mobileSettingsNavigationTabs
    : settingsDesktopTabs;
  const desktopNavigationGroups = settingsNavigationGroups.map((group) => ({
    ...group,
    tabs: group.tabs.filter((tab) => tab.platforms.includes("desktop")),
  }));

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

  // --- LEGACY LOCAL PREVIEW ENGINE ---
  // Keep old theme compatibility isolated to an explicit local preview
  // boundary. The selected skin owns the actual Settings surface.
  useEffect(() => {
    const newTheme = settings.general?.theme;
    if (newTheme) {
      const previewTarget = themePreviewTargetRef?.current;
      if (!previewTarget) return;

      const opacity = settings.general.backgroundOpacity ?? 0.3;
      const blur = settings.general.backgroundBlur ?? 40;
      const contrast = getDynamicContrast(newTheme as any, opacity);

      previewTarget.style.setProperty("--app-text-main", contrast.text);
      previewTarget.style.setProperty(
        "--app-text-muted",
        contrast.textMuted,
      );
      previewTarget.style.setProperty(
        "--app-border-main",
        contrast.border,
      );
      previewTarget.style.setProperty("--app-bg-tint", contrast.bgTint);
      previewTarget.style.setProperty(
        "--app-bg-main",
        (contrast as any).bgMain,
      );

      previewTarget.style.setProperty(
        "--app-bg-opacity",
        opacity.toString(),
      );
      previewTarget.style.setProperty("--app-bg-blur", `${blur}px`);

      const isLight = PERSONA_UI_CONFIG[newTheme as any]?.isLight || false;
      if (isLight) {
        previewTarget.classList.add("light-mode");
      } else {
        previewTarget.classList.remove("light-mode");
      }

      // Sync hex for Voice/Particles
      const cfg = PERSONA_UI_CONFIG[newTheme as any];
      if (cfg?.hex) {
        previewTarget.style.setProperty("--app-core-hex", cfg.hex);
      }
    }
  }, [
    settings.general?.theme,
    settings.general?.backgroundOpacity,
    settings.general?.backgroundBlur,
    themePreviewTargetRef,
  ]);

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
        isMobile ? "p-0" : "p-4"
      } font-sans select-none`}
      style={skinMaterialVariables as React.CSSProperties}
    >
      <div
        className={`w-full ${
          isMobile
            ? "h-full rounded-none"
            : "max-w-[1080px] h-[86%] rounded-2xl border"
        } flex flex-row overflow-hidden transition-all duration-300 glass-blur`}
        style={{
          boxShadow: isMobile
            ? "none"
            : "0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
          backgroundColor: "var(--app-bg-main, #0a0a0f)",
          borderColor: isMobile
            ? "transparent"
            : "var(--luca-border-subtle, var(--app-border-main, rgba(255,255,255,0.08)))",
        }}
      >
        {/* Unified Sidebar Navigation */}
        <div
          className={`flex flex-col shrink-0 ${isMobile ? "w-16" : "w-64"}`}
          style={{
            backgroundColor: isMobile
              ? "rgba(0,0,0,0.2)"
              : "var(--app-bg-main, #0a0a0a)",
            borderRight: "1px solid var(--app-border-main, rgba(0,0,0,0.1))",
          }}
        >
          {/* Header Area */}
          <div
            className={`flex items-center gap-2.5 shrink-0 ${
              isMobile ? "p-4 justify-center" : "h-[52px] px-4"
            }`}
            style={{
              borderBottom:
                "1px solid var(--luca-border-subtle, var(--app-border-main, rgba(255,255,255,0.07)))",
            }}
          >
            <Icon
              name="Settings"
              variant={isMobile ? "BoldDuotone" : "Linear"}
              className={`${isMobile ? "w-5 h-5" : "w-4 h-4"}`}
              style={{
                color: isMobile
                  ? "var(--luca-accent-primary, var(--app-core-hex))"
                  : "var(--luca-text-tertiary, var(--app-text-muted))",
              }}
            />
            {!isMobile && (
              <h2
                className="text-sm font-semibold tracking-tight"
                style={{
                  color: "var(--luca-text-primary, var(--app-text-main))",
                }}
              >
                Settings
              </h2>
            )}
          </div>

          {/* Navigation Tabs */}
          <div
            className={`flex-1 overflow-y-auto no-scrollbar ${isMobile ? "p-2" : "px-2.5 py-3"} space-y-4`}
          >
            {(isMobile
              ? [{ id: "mobile", label: "", tabs: visibleTabs }]
              : desktopNavigationGroups
            ).map((group) => (
              <div key={group.id} className="space-y-2">
                {!isMobile && (
                  <div className="px-2.5 pt-2 pb-1">
                    <p
                      className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
                      style={{
                        color:
                          "var(--luca-text-tertiary, var(--app-text-muted))",
                      }}
                    >
                      {group.label}
                    </p>
                  </div>
                )}
                {group.tabs.map((tab) => {
                  const isAdvancedGroup = tab.id === settingsAdvancedGroup.id;
                  const isActive = isAdvancedGroup
                    ? activeTab === settingsAdvancedGroup.id ||
                      isMobileAdvancedSettingsTab(activeTab)
                    : activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        color: isActive
                          ? "var(--luca-text-primary, var(--app-text-main, #ffffff))"
                          : "var(--luca-text-secondary, var(--app-text-muted, #9ca3af))",
                        backgroundColor: isActive
                          ? "var(--luca-surface-hover, var(--app-bg-tint, rgba(255,255,255,0.06)))"
                          : "transparent",
                        borderColor: "transparent",
                      }}
                      title={tab.label}
                      className={`w-full flex items-center border border-transparent transition-all hover:bg-[var(--luca-surface-hover,var(--app-bg-tint))] ${
                        isMobile
                          ? "flex-col justify-center rounded-xl py-3 px-1 gap-1 min-h-[54px]"
                          : "flex-row rounded-lg gap-2.5 h-[34px] px-2.5"
                      }`}
                    >
                      <Icon
                        name={tab.icon}
                        variant={isActive ? "BoldDuotone" : "Linear"}
                        className={`${isMobile ? "w-5 h-5" : "w-4 h-4"}`}
                        style={{
                          color: isActive
                            ? "var(--luca-accent-primary, var(--app-core-hex))"
                            : undefined,
                        }}
                      />
                      {!isMobile ? (
                        <span className="text-[13px] font-medium">{tab.label}</span>
                      ) : (
                        <span className="text-[9px] font-semibold tracking-tight opacity-80 text-center leading-[1.1]">
                          {tab.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Mobile Footer Exit - Since we don't have the header X on mobile anymore */}
          {isMobile && (
            <div
              className="p-4 flex justify-center border-t"
              style={{ borderColor: "var(--app-border-main)" }}
              onClick={onClose}
            >
              <Icon
                name="CloseCircle"
                className="w-5 h-5 text-[var(--app-text-muted)] hover:text-[var(--app-text-main)]"
              />
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Content Header (Desktop Only) */}
          {!isMobile && (
            <div
              className="h-[52px] px-6 flex justify-between items-center shrink-0"
              style={{
                borderBottom:
                  "1px solid var(--luca-border-subtle, var(--app-border-main, rgba(255,255,255,0.07)))",
              }}
            >
              <h3
                className="text-[15px] font-semibold tracking-tight"
                style={{
                  color: "var(--luca-text-primary, var(--app-text-main))",
                }}
              >
                {settingsDesktopTabs.find((t) => t.id === activeTab)?.label ||
                  (activeTab === settingsAdvancedGroup.id
                    ? settingsAdvancedGroup.label
                    : "Settings")}
              </h3>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 transition-colors hover:bg-[var(--luca-surface-hover,var(--app-bg-tint))]"
                style={{ color: "var(--app-text-muted)" }}
              >
                <Icon name="CloseCircle" className="w-[18px] h-[18px]" />
              </button>
            </div>
          )}

          {/* Scrollable Body */}
          <div
            className={`flex-1 basis-0 grow overflow-y-auto ${
              isMobile ? "p-4 pb-32" : "px-6 py-6 [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-[860px]"
            }`}
            style={{
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-y",
            }}
          >
            {isMobile && activeTab === settingsAdvancedGroup.id && (
              <div className="space-y-5">
                <div
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: "var(--app-border-main)",
                    backgroundColor: "var(--app-bg-tint)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      name={settingsAdvancedGroup.icon}
                      variant="BoldDuotone"
                      className="h-5 w-5"
                      style={{ color: liveTheme.hex }}
                    />
                    <div>
                      <h3
                        className="text-base font-bold"
                        style={{ color: "var(--app-text-main)" }}
                      >
                        {settingsAdvancedGroup.label}
                      </h3>
                      <p
                        className="mt-1 text-xs leading-relaxed"
                        style={{ color: "var(--app-text-muted)" }}
                      >
                        {settingsAdvancedGroup.description}
                      </p>
                    </div>
                  </div>
                  <p
                    className="mt-3 text-[11px] leading-relaxed"
                    style={{ color: "var(--app-text-muted)" }}
                  >
                    {settingsAdvancedGroup.availabilityNote}
                  </p>
                </div>

                <div className="space-y-2">
                  {mobileAvailableAdvancedSettingsTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all hover:bg-[var(--luca-surface-hover,var(--app-bg-tint))]"
                      style={{
                        borderColor: "var(--app-border-main)",
                        backgroundColor:
                          "var(--luca-surface-glass, var(--app-bg-tint))",
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <Icon
                          name={tab.icon}
                          variant="Linear"
                          className="h-5 w-5"
                          style={{ color: liveTheme.hex }}
                        />
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "var(--app-text-main)" }}
                        >
                          {tab.label}
                        </span>
                      </span>
                      <Icon
                        name="ChevronRight"
                        className="h-4 w-4"
                        style={{ color: "var(--app-text-muted)" }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {activeTab === "general" && (
              <SettingsGeneralTab
                settings={settings}
                onUpdate={updateSetting}
                theme={liveTheme}
                isMobile={isMobile}
              />
            )}
            {activeTab === "appearance" && (
              <SettingsAppearanceTab
                settings={settings}
                onUpdate={updateSetting}
                theme={liveTheme}
                isMobile={isMobile}
              />
            )}
            {activeTab === "brain" && (
              <SettingsBrainTab
                settings={settings}
                onUpdate={updateSetting}
                theme={liveTheme}
                isMobile={isMobile}
              />
            )}
            {activeTab === "personality" && (
              <PersonalityDashboard
                theme={liveTheme}
                config={personaConfig}
                onUpdate={updatePersonaConfig}
                isMobile={isMobile}
              />
            )}
            {activeTab === "autonomy" && (
              <SettingsAutonomyTab
                settings={settings}
                onUpdate={updateSetting}
                theme={liveTheme}
                isMobile={isMobile}
              />
            )}
            {activeTab === "voice" && (
              <SettingsVoiceTab
                settings={settings}
                onUpdate={updateSetting}
                theme={liveTheme}
                isMobile={isMobile}
              />
            )}
            {activeTab === "vision" && (
              <SettingsVisionTab
                settings={settings}
                onUpdate={updateSetting}
                theme={liveTheme}
                isMobile={isMobile}
              />
            )}
            {activeTab === "model-manager" && (
              <SettingsModelManagerTab theme={liveTheme} isMobile={isMobile} />
            )}
            {activeTab === "profile" && (
              <OperatorProfilePanel theme={liveTheme} isMobile={isMobile} />
            )}
            {activeTab === "iot" && (
              <SettingsIoTTab
                settings={settings}
                onUpdate={updateSetting}
                theme={liveTheme}
                isMobile={isMobile}
              />
            )}
            {activeTab === "connectors" && (
              <SettingsConnectorsTab
                settings={settings}
                theme={liveTheme}
                setStatusMsg={setStatusMsg}
                isMobile={isMobile}
              />
            )}
            {activeTab === "lucalink" && (
              <SettingsLucaLinkTab
                settings={settings}
                onUpdate={updateSetting}
                theme={liveTheme}
                isMobile={isMobile}
              />
            )}
            {activeTab === "mcp-bridge" && (
              <SettingsMCPBridgeTab
                settings={settings}
                theme={liveTheme}
                onUpdate={updateSetting}
                setStatusMsg={setStatusMsg}
                isMobile={isMobile}
              />
            )}
            {activeTab === "data" && (
              <SettingsDataTab
                memoryStats={memoryStats}
                loadMemoryStats={loadMemoryStats}
                theme={liveTheme}
                isMobile={isMobile}
              />
            )}
            {activeTab === "knowledge-bridge" && (
              <KnowledgeBridgeTab theme={liveTheme} isMobile={isMobile} />
            )}

            {activeTab === "about" && (
              <SettingsAboutTab
                theme={liveTheme}
                settings={settings}
                isMobile={isMobile}
              />
            )}
          </div>

          {/* Footer Actions */}
          <div
            className={`flex justify-between items-center ${
              isMobile ? "p-4 pb-8" : "h-[56px] px-6"
            }`}
            style={{
              borderTop:
                "1px solid var(--luca-border-subtle, var(--app-border-main, rgba(255,255,255,0.07)))",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className={`text-[10px] md:text-xs ${
                  statusMsg.includes("Error")
                    ? "text-[var(--luca-danger,#f87171)]"
                    : "text-[var(--luca-success,#4fbf7a)]"
                }`}
              >
                {statusMsg}
              </div>
            </div>
            <div className="flex gap-2 md:gap-3">
              <button
                onClick={onClose}
                className="h-8 px-3.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--luca-surface-hover,var(--app-bg-tint))]"
                style={{ color: "var(--app-text-muted)" }}
              >
                {/* On Personality tab, 'Cancel' is just 'Close' since it saves internally */}
                {/* Reverted: Unified Save uses Cancel for all tabs */}
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                style={{
                  backgroundColor: liveTheme.hex,
                  color: liveTheme.isLight ? "#ffffff" : "#0c0e12",
                }}
                className="h-8 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              >
                {loading && (
                  <Icon name="Restart" className="w-3 h-3 animate-spin" />
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
