import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LucaSettings } from "../../services/settingsService";
import { PERSONA_UI_CONFIG } from "../../services/lucaService";
import { apiUrl } from "../../config/api";
import { Icon as IconEngine } from "../ui/Icon";
import ToneStyleSelector from "./ToneStyleSelector";
import {
  UIThemeId,
  PersonaMode,
} from "../../types/lucaPersonality";


interface ChromeProfileStatus {
  imported: boolean;
  lastSync?: string;
  profileName?: string;
  size?: number;
  availableProfiles?: {
    folderName: string;
    displayName: string;
    email?: string;
  }[];
  chromeRunning?: boolean;
}

interface SettingsGeneralTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme: {
    primary: string;
    hex: string;
    themeName: string;
  };
  isMobile?: boolean;
}

const SettingsGeneralTab: React.FC<SettingsGeneralTabProps> = ({
  settings,
  onUpdate,
  theme,
  isMobile,
}) => {
  const [profileStatus, setProfileStatus] =
    useState<ChromeProfileStatus | null>(null);

  const fetchProfileStatus = async () => {
    try {
      const res = await fetch(apiUrl("/api/chrome-profile/status"));
      setProfileStatus(await res.json());
    } catch (e) {
      console.error("[Settings] Failed to fetch Chrome profile status:", e);
    }
  };

  useEffect(() => {
    fetchProfileStatus();
  }, []);

  const handleClear = async () => {
    if (
      !confirm(
        "Clear imported Chrome data? Ghost Browser will use clean sessions.",
      )
    )
      return;
    try {
      await fetch(apiUrl("/api/chrome-profile/clear"), { method: "POST" });
      fetchProfileStatus();
    } catch (e) {
      console.warn("[Settings] Failed to clear Chrome profile:", e);
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

  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : "pr-2"} overflow-y-auto`}>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {/* IDENTITY & AESTHETIC (Full Width) */}
        <motion.div
          variants={item}
          className={`${isMobile ? "p-4 py-6 border-x-0 border-y rounded-none" : "p-4 rounded-xl border"} transition-all duration-300`}
          style={{
            backgroundColor: isMobile ? "rgba(255,255,255,0.02)" : "var(--app-bg-tint, rgba(0,0,0,0.1))",
            borderColor: "var(--app-border-main, rgba(0,0,0,0.2))",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconEngine name="Palette" variant="BoldDuotone" className="w-4 h-4" style={{ color: theme.hex }} />
              <span
                className={`text-xs font-bold uppercase tracking-tighter`}
                style={{ color: "var(--app-text-main)" }}
              >
                Persona & Appearance
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 mr-2">
                  <span className="text-[10px] font-mono text-[var(--app-text-muted)] uppercase">
                    Sync Theme
                  </span>
                  <button
                    onClick={() =>
                      onUpdate(
                        "general",
                        "syncThemeWithPersona",
                        !settings.general.syncThemeWithPersona,
                      )
                    }
                    className={`w-7 h-3.5 rounded-full transition-all relative ${settings.general.syncThemeWithPersona ? "" : "bg-[var(--app-border-main)] opacity-40 hover:opacity-100"}`}
                    style={{
                      backgroundColor: settings.general.syncThemeWithPersona ? theme.hex : undefined,
                    }}
                  >
                    <div
                      className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-[var(--app-bg-tint)] transition-all ${settings.general.syncThemeWithPersona ? "translate-x-4" : "translate-x-0.5"}`}
                      style={{ 
                        backgroundColor: settings.general.syncThemeWithPersona ? "white" : "var(--app-text-muted)" 
                      }}
                    />
                  </button>
              </div>
              <div 
                className={`text-[10px] font-mono uppercase tracking-widest border-l pl-3`}
                style={{ 
                  color: "var(--app-text-main)",
                  borderLeftColor: "var(--app-border-main)" 
                }}
              >
                {settings.general.persona} MODE
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mind Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-1 opacity-60">
                <IconEngine name="BrainCircuit" variant="BoldDuotone" className="w-3 h-3" style={{ color: theme.hex }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--app-text-main)" }}>
                  Persona (Capabilities)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    "RUTHLESS",
                    "ENGINEER",
                    "ASSISTANT",
                    "HACKER",
                  ] as PersonaMode[]
                ).map((p) => {
                  const isActive = settings.general.persona === p;
                  return (
                    <button
                      key={p}
                      onClick={() => onUpdate("general", "persona", p)}
                      className={`py-2 rounded border text-[10px] font-mono transition-all`}
                      style={{ 
                        borderColor: isActive ? theme.hex : "var(--app-border-main, rgba(255,255,255,0.1))",
                        backgroundColor: isActive ? "var(--app-bg-tint, rgba(255,255,255,0.1))" : "var(--app-bg-tint, rgba(0,0,0,0.2))",
                        color: "var(--app-text-main, #475569)"
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Skin Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-1 opacity-60">
                <IconEngine name="Paintbrush" variant="BoldDuotone" className="w-3 h-3" style={{ color: theme.hex }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--app-text-main)" }}>
                  App Theme (Visuals)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    "MASTER_SYSTEM",
                    "BUILDER",
                    "PROFESSIONAL",
                    "TERMINAL",
                    "AGENTIC_SLATE",
                    "LIGHTCREAM",
                    "VAPORWAVE",
                    "DICTATION",
                    "FROST",
                  ] as UIThemeId[]
                ).map((t) => {
                  const isActive = settings.general.theme === t;
                  const cfg = PERSONA_UI_CONFIG[t];
                  if (!cfg) return null; // Safety guard: Skip if theme config is missing
                  return (
                    <button
                      key={t}
                      disabled={settings.general.syncThemeWithPersona}
                      onClick={() => onUpdate("general", "theme", t)}
                      className={`py-1.5 rounded border text-[10px] font-mono transition-all flex items-center justify-center gap-1.5 glass-blur
                        ${settings.general.syncThemeWithPersona ? "opacity-20 cursor-not-allowed" : "opacity-80"}
                      `}
                      style={{
                        backgroundColor: isActive ? "var(--app-bg-tint)" : "var(--app-bg-tint, rgba(0,0,0,0.1))",
                        borderColor: isActive ? `${theme.hex}66` : "var(--app-border-main, rgba(255,255,255,0.1))",
                        color: "var(--app-text-main, #475569)"
                      }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: cfg.hex }}
                      />
                      {t === "LIGHTCREAM" ? "CREA" : t.slice(0, 4)}
                    </button>
                  );
                })}
              </div>
              {settings.general.syncThemeWithPersona && (
                <div className="text-[9px] text-[var(--app-text-muted)] italic mt-1 px-1">
                  * Themes are locked to Persona. Disable &quot;Sync&quot; to
                  customize.
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Dual Column Stacks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Column 1: Tone & Browser */}
          <div className="flex flex-col gap-4">
            {/* Tone Styles Card */}
            <motion.div
              variants={item}
              className={`${isMobile ? "p-4 py-6 border-x-0 border-y rounded-none" : "tech-border p-4 space-y-4 rounded-lg glass-blur"}`}
              style={{
                backgroundColor: isMobile ? "rgba(255,255,255,0.02)" : "var(--app-bg-tint, rgba(0,0,0,0.1))",
                borderColor: "var(--app-border-main, rgba(0,0,0,0.2))",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconEngine
                    name="ChatRoundUnread" 
                    variant="BoldDuotone"
                    className="w-4 h-4"
                    style={{ color: theme.hex }}
                  />
                  <span
                    className={`text-xs font-bold uppercase tracking-tighter`}
                    style={{ color: "var(--app-text-main)" }}
                  >
                    Response Style
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[var(--app-text-muted)] uppercase">
                  Conversational Vibe
                </div>
              </div>
              <ToneStyleSelector
                currentStyleId={settings.general.toneStyle}
                customDimensions={settings.general.customTone}
                onStyleChange={(id) => onUpdate("general", "toneStyle", id)}
                onCustomChange={(dims) =>
                  onUpdate("general", "customTone", dims)
                }
                themeHex={theme.hex}
              />
            </motion.div>

            {/* Browser Sessions Card */}
            <motion.div
              variants={item}
              className={`${isMobile ? "p-4 py-6 border-x-0 border-y rounded-none" : "tech-border p-4 space-y-4 rounded-lg glass-blur"}`}
              style={{
                backgroundColor: isMobile ? "rgba(255,255,255,0.02)" : "var(--app-bg-tint, #0a0a0a)",
                borderColor: "var(--app-border-main, rgba(0,0,0,0.2))",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconEngine name="Globus" variant="BoldDuotone" className="w-4 h-4" style={{ color: theme.hex }} />
                  <span
                    className={`text-xs font-bold uppercase tracking-tighter`}
                    style={{ color: "var(--app-text-main)" }}
                  >
                    Browser Sessions
                  </span>
                </div>
                <div
                  className={`text-[10px] font-mono ${profileStatus?.imported ? "text-green-500" : "text-yellow-500"}`}
                >
                  {profileStatus?.imported ? "CONNECTED" : "UNLINKED"}
                </div>
              </div>
              <div className="space-y-3">
                {profileStatus?.imported && (
                  <div 
                    className={`space-y-1.5 p-2 rounded border glass-blur`}
                    style={{
                      backgroundColor: "var(--app-bg-tint, rgba(255,255,255,0.05))",
                      borderColor: "var(--app-border-main, rgba(0,0,0,0.2))",
                    }}
                  >
                    {profileStatus.profileName && (
                      <div
                        className={`text-[11px] font-mono flex items-center gap-2`}
                        style={{ color: "var(--app-text-main, #475569)" }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: theme.hex }}
                        />
                        PROFILE: {profileStatus.profileName.toUpperCase()}
                      </div>
                    )}
                    {profileStatus.lastSync && (
                      <div className="text-[10px] text-[var(--app-text-muted)] font-mono ml-3.5">
                        SYNCED:{" "}
                        {new Date(profileStatus.lastSync).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
                {profileStatus?.chromeRunning && (
                  <div
                    className={`text-[10px] font-mono flex items-center gap-1.5 p-2 rounded border animate-pulse`}
                    style={{
                      backgroundColor: "rgba(249, 115, 22, 0.1)",
                      borderColor: "rgba(249, 115, 22, 0.3)",
                      color: "rgb(249, 115, 22)"
                    }}
                  >
                    <IconEngine name="ShieldWarning" variant="BoldDuotone" className="w-3 h-3" />
                    CHROME DETECTED: CLOSE TO RE-IMPORT
                  </div>
                )}
                <p
                  className={`text-[10px] leading-relaxed`}
                  style={{ color: "var(--app-text-main, #64748b)" }}
                >
                  Link Chrome to synchronize your active sessions and
                  credentials directly with the Ghost Browser.
                </p>
              </div>
              <div 
                className={`flex gap-2 pt-2 border-t`}
                style={{ borderTopColor: "var(--app-border-main, rgba(255,255,255,0.1))" }}
              >
                <button
                  onClick={() =>
                    fetch(apiUrl("/api/chrome-profile/import"), {
                      method: "POST",
                    }).then(() => fetchProfileStatus())
                  }
                  className={`flex-1 py-1.5 rounded border text-[11px] font-bold flex items-center justify-center gap-2 transition-all glass-blur`}
                  style={{
                    color: "var(--app-text-main, #475569)",
                    backgroundColor: "var(--app-bg-tint, rgba(255,255,255,0.05))",
                    borderColor: "var(--app-border-main, rgba(0,0,0,0.2))",
                  }}
                >
                  {profileStatus?.imported ? (
                    <IconEngine name="Restart" variant="BoldDuotone" className="w-3 h-3" />
                  ) : (
                    <IconEngine name="Globus" variant="BoldDuotone" className="w-3 h-3" />
                  )}
                  {profileStatus?.imported ? "RE-IMPORT" : "IMPORT SESSION"}
                </button>
                {profileStatus?.imported && (
                  <button
                    onClick={handleClear}
                    className="p-1.5 rounded border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <IconEngine name="TrashBinMinimalistic" variant="BoldDuotone" className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>

          {/* Column 2: Behavior & Privacy */}
          <div className="flex flex-col gap-4">
            {/* Global UI Preferences Card */}
            <motion.div
              variants={item}
              className={`${isMobile ? "p-4 py-6 border-x-0 border-y rounded-none" : "tech-border p-4 space-y-4 rounded-lg glass-blur"}`}
              style={{
                backgroundColor: isMobile ? "rgba(255,255,255,0.02)" : "var(--app-bg-tint, rgba(0,0,0,0.1))",
                borderColor: "var(--app-border-main, rgba(0,0,0,0.2))",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconEngine name="Settings" variant="BoldDuotone" className="w-4 h-4" style={{ color: theme.hex }} />
                  <span
                    className={`text-xs font-bold uppercase tracking-tighter`}
                    style={{ color: "var(--app-text-main)" }}
                  >
                    INTERFACE SETTINGS
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[var(--app-text-muted)] uppercase tracking-widest">
                  USER EXPERIENCE
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* System Behavior Sub-Section */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-[var(--app-text-muted)] mb-1">
                    BEHAVIOR
                  </div>
                  <div className="space-y-1">
                    {[
                      { label: "AUTO BOOT", key: "startOnBoot" },
                      { label: "TRAY MINIMIZE", key: "minimizeToTray" },
                      { label: "DEBUG MATRIX", key: "debugMode" },
                      { label: "TACTICAL MODE", key: "experimentalMode" },
                    ].map((beh) => (
                      <div
                        key={beh.key}
                        className={`flex items-center justify-between py-1.5 px-2 rounded transition-colors group/row hover:bg-[var(--app-bg-tint)]/40`}
                      >
                        <span
                          className={`text-[10px] font-mono`}
                          style={{ color: "var(--app-text-main, #64748b)" }}
                        >
                          {beh.label}
                        </span>
                        <button
                          onClick={() =>
                            onUpdate("general", beh.key, !settings.general[beh.key as keyof typeof settings.general])
                          }
                          className={`w-7 h-3.5 rounded-full transition-all relative ${settings.general[beh.key as keyof typeof settings.general] ? "" : "bg-[var(--app-border-main)] opacity-40 hover:opacity-100"}`}
                          style={{
                            backgroundColor: settings.general[beh.key as keyof typeof settings.general] ? theme.hex : undefined,
                          }}
                        >
                          <div
                            className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-[var(--app-bg-tint)] transition-all ${settings.general[beh.key as keyof typeof settings.general] ? "translate-x-4" : "translate-x-0.5"}`}
                            style={{ 
                              backgroundColor: settings.general[beh.key as keyof typeof settings.general] ? "white" : "var(--app-text-muted)" 
                            }}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Background Visibility Sub-Section */}
                <div 
                  className={`space-y-2 border-t pt-3`}
                  style={{ borderTopColor: "var(--app-border-main, rgba(255,255,255,0.1))" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-bold text-[var(--app-text-muted)] uppercase">
                      Glass Controls
                    </div>
                  </div>
                  <div className="space-y-3 px-1">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className={`text-[9px] font-bold text-[var(--app-text-muted)] tracking-widest`}
                        >
                          OPACITY
                        </span>
                        <span
                          className={`text-[10px] font-mono`}
                          style={{ color: "var(--app-text-main, #475569)" }}
                        >
                          {Math.round(
                            (settings.general.backgroundOpacity ?? 0.75) * 100,
                          )}
                          %
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(
                          (settings.general.backgroundOpacity ?? 0.75) * 100,
                        )}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) / 100;
                          onUpdate("general", "backgroundOpacity", val);
                          // Live Preview
                          document.documentElement.style.setProperty(
                            "--app-bg-opacity",
                            val.toString(),
                          );
                        }}
                        className={`w-full accent-current h-1 rounded-lg appearance-none cursor-pointer`}
                        style={{ 
                          accentColor: theme.hex,
                          backgroundColor: "var(--app-border-main, rgba(255,255,255,0.2))"
                        }}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className={`text-[9px] font-bold text-[var(--app-text-muted)] tracking-widest`}
                        >
                          BLUR
                        </span>
                        <span
                          className={`text-[10px] font-mono`}
                          style={{ color: "var(--app-text-main, #475569)" }}
                        >
                          {settings.general.backgroundBlur ?? 12}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="40"
                        value={settings.general.backgroundBlur ?? 12}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          onUpdate("general", "backgroundBlur", val);
                          // Live Preview
                          document.documentElement.style.setProperty(
                            "--app-bg-blur",
                            `${val}px`,
                          );
                        }}
                        className={`w-full accent-current h-1 rounded-lg appearance-none cursor-pointer`}
                        style={{ 
                          accentColor: theme.hex,
                          backgroundColor: "var(--app-border-main, rgba(255,255,255,0.2))"
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Typography & Global Scaling Card */}
            <motion.div
              variants={item}
              className={`${isMobile ? "p-4 py-6 border-x-0 border-y rounded-none" : "tech-border p-4 space-y-4 rounded-lg glass-blur"}`}
              style={{
                backgroundColor: isMobile ? "rgba(255,255,255,0.02)" : "var(--app-bg-tint, rgba(0,0,0,0.1))",
                borderColor: "var(--app-border-main, rgba(0,0,0,0.2))",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconEngine name="TextField" variant="BoldDuotone" className="w-4 h-4" style={{ color: theme.hex }} />
                  <span
                    className={`text-xs font-bold uppercase tracking-tighter`}
                    style={{ color: "var(--app-text-main, #475569)" }}
                  >
                    Display & Text
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[var(--app-text-muted)] uppercase tracking-widest">
                  GLOBAL SCALING
                </div>
              </div>

              <div className="space-y-4">
                {/* Font Family Selection */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-[var(--app-text-muted)] mb-1 uppercase tracking-wider">
                    Interface Font
                  </div>
                  <select
                    value={settings.general.fontFamily || '"Inter", system-ui, sans-serif'}
                    onChange={(e) => onUpdate("general", "fontFamily", e.target.value)}
                    className={`w-full rounded-lg p-2 text-xs font-mono outline-none transition-colors border tech-border`}
                    style={{
                      backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.4))",
                      borderColor: "var(--app-border-main, rgba(0,0,0,0.2))",
                      color: "var(--app-text-main, #475569)"
                    }}
                  >
                    <option value='"Inter", system-ui, sans-serif'>INTER (STANDARD)</option>
                    <option value='"JetBrains Mono", monospace'>JETBRAINS MONO (TECH)</option>
                    <option value='"Outfit", sans-serif'>OUTFIT (PREMIUM)</option>
                    <option value='"Fraunces", serif'>FRAUNCES (EDITORIAL)</option>
                    <option value='"Space Mono", monospace'>SPACE MONO (TACTICAL)</option>
                    <option value='system-ui, sans-serif'>SYSTEM NATIVE</option>
                  </select>
                </div>

                {/* Font Scaling Slider */}
                <div className="space-y-2 border-t pt-3" style={{ borderTopColor: "var(--app-border-main, rgba(255,255,255,0.1))" }}>
                   <div className="flex justify-between items-center mb-1">
                    <span className={`text-[11px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider`}>
                      UI SCALE
                    </span>
                    <span className={`text-[10px] font-mono`} style={{ color: "var(--app-text-main, #475569)" }}>
                      {Math.round((settings.general.fontScale || 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="150"
                    value={Math.round((settings.general.fontScale || 1.0) * 100)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) / 100;
                      onUpdate("general", "fontScale", val);
                      // Live Preview
                      document.documentElement.style.setProperty("--app-font-scale", val.toString());
                    }}
                    className={`w-full h-1 bg-[var(--app-bg-tint)] rounded-lg appearance-none cursor-pointer`}
                    style={{ 
                      accentColor: theme.hex,
                      backgroundColor: "var(--app-border-main, rgba(255,255,255,0.2))"
                    }}
                  />
                  <div className="text-[9px] text-[var(--app-text-muted)] italic px-1">
                    * Adjusting scale impacts all tactical panels and text density.
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Privacy & Awareness Card */}
            <motion.div
              variants={item}
              className={`${isMobile ? "p-4 py-6 border-x-0 border-y rounded-none" : "tech-border p-4 space-y-3 rounded-xl border glass-blur"}`}
              style={{
                backgroundColor: isMobile ? "rgba(255,255,255,0.02)" : "var(--app-bg-tint, rgba(0,0,0,0.1))",
                borderColor: "var(--app-border-main, rgba(0,0,0,0.2))",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconEngine name="ShieldCheck" variant="BoldDuotone" className="w-4 h-4" style={{ color: theme.hex }} />
                  <span
                    className={`text-xs font-bold uppercase tracking-tighter`}
                    style={{ color: "var(--app-text-main, #475569)" }}
                  >
                    Privacy & Awareness
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[var(--app-text-muted)] uppercase tracking-widest">
                  PRIVACY & SENSORS
                </div>
              </div>
              <p
                className={`text-[10px] text-[var(--app-text-muted)] leading-tight`}
              >
                Control what Luca can observe. Disabling a sensor stops it
                immediately, even mid-loop.
              </p>
              <div className="space-y-1">
                {[
                  {
                    label: "SCREEN OBSERVATION",
                    key: "screenEnabled",
                    icon: "Eye",
                    desc: "Allow Luca to periodically scan your screen for context",
                  },
                  {
                    label: "CAMERA ACCESS",
                    key: "cameraEnabled",
                    icon: "Camera",
                    desc: "Allow Luca to use the webcam (Room Guard, Vision)",
                  },
                  {
                    label: "MICROPHONE",
                    key: "micEnabled",
                    icon: "Microphone",
                    desc: "Allow Luca to listen for voice input and ambient audio",
                  },
                  {
                    label: "GLOBAL FORGE",
                    key: "telemetryEnabled",
                    icon: "Link",
                    desc: "Anonymously share architectural improvements to evolve LUCA",
                  },
                ].map((privItem) => {
                  const isEnabled =
                    !!settings.privacy?.[
                      privItem.key as keyof typeof settings.privacy
                    ];
                  return (
                    <div
                      key={privItem.key}
                      className={`flex items-center justify-between py-2 border-b border-[var(--app-border-main)] transition-colors px-2 rounded last:border-0 hover:bg-[var(--app-bg-tint)]/40`}
                    >
                      <div className="flex items-center gap-2.5">
                        <IconEngine
                          name={privItem.icon as any}
                          variant="BoldDuotone"
                          className="w-3.5 h-3.5"
                          style={{
                            color: isEnabled ? theme.hex : "var(--app-text-muted)",
                            opacity: isEnabled ? 1 : 0.5
                          }}
                        />
                        <div>
                          <span
                            className={`text-[9px] font-mono block`}
                            style={{ color: "var(--app-text-main, #64748b)" }}
                          >
                            {privItem.label}
                          </span>
                          <span className="text-xs text-[var(--app-text-muted)] uppercase italic opacity-60">
                            {privItem.desc}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          onUpdate("privacy", privItem.key, !isEnabled)
                        }
                        className={`w-7 h-3.5 rounded-full transition-all relative ${isEnabled ? "" : "bg-[var(--app-border-main)] opacity-40 hover:opacity-100"}`}
                        style={{
                          backgroundColor: isEnabled ? theme.hex : undefined,
                        }}
                      >
                        <div
                          className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-[var(--app-bg-tint)] transition-all ${isEnabled ? "translate-x-4" : "translate-x-0.5"}`}
                          style={{ 
                            backgroundColor: isEnabled ? "white" : "var(--app-text-muted)" 
                          }}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* System Permissions Merged Here */}
              <div 
                className={`mt-2 pt-3 border-t border-[var(--app-border-main)] space-y-2`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconEngine
                      name="ShieldWarning"
                      variant="BoldDuotone"
                      className="w-3 h-3"
                      style={{ color: theme.hex }}
                    />
                    <span
                      className={`text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-tighter`}
                    >
                      System Permissions
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={async () => {
                      const { checkPermissions } =
                        await import("../../tools/handlers/LocalTools");
                      const res = await checkPermissions();
                      alert(
                        res.success ? "Manual Link Secured." : "Access Denied.",
                      );
                    }}
                    className={`py-1 rounded-lg border border-[var(--app-border-main)] bg-[var(--app-bg-tint)] text-[var(--app-text-main)] font-bold text-[10px] hover:bg-white/10 transition-all shadow-sm`}
                  >
                    CHECK STATUS
                  </button>
                  <button
                    onClick={async () => {
                      const { requestPermissions } =
                        await import("../../tools/handlers/LocalTools");
                      await requestPermissions();
                    }}
                    className={`py-1 rounded-lg border border-[var(--app-border-main)] text-[10px] font-bold transition-all shadow-sm`}
                    style={{
                      backgroundColor: "var(--app-bg-tint, rgba(234, 179, 8, 0.1))",
                      color: theme.hex,
                    }}
                  >
                    GRANT ACCESS
                  </button>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsGeneralTab;
