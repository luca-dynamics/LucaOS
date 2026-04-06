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
}

const SettingsGeneralTab: React.FC<SettingsGeneralTabProps> = ({
  settings,
  onUpdate,
  theme,
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
    <div className="space-y-6 pr-2 overflow-y-auto">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {/* IDENTITY & AESTHETIC (Full Width) */}
        <motion.div
          variants={item}
          className={`p-5 rounded-2xl border transition-all tech-border p-4 space-y-4 glass-blur`}
          style={{
            backgroundColor: "var(--app-bg-tint, #11111a)",
            borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconEngine name="Palette" variant="BoldDuotone" className="w-4 h-4" style={{ color: theme.hex }} />
              <span
                className={`text-xs font-bold uppercase tracking-tighter`}
                style={{ color: "var(--app-text-muted, #94a3b8)" }}
              >
                Brain & Skin Configuration
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 mr-2">
                <span className="text-[10px] font-mono text-[var(--app-text-muted)] uppercase">
                  Sync Theme
                </span>
                <input
                  type="checkbox"
                  checked={settings.general.syncThemeWithPersona}
                  onChange={(e) =>
                    onUpdate(
                      "general",
                      "syncThemeWithPersona",
                      e.target.checked,
                    )
                  }
                  className={`w-3 h-3 rounded appearance-none border cursor-pointer`}
                  style={{ 
                    accentColor: theme.hex,
                    borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
                    backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.4))"
                  }}
                />
              </div>
              <div 
                className={`text-[10px] font-mono uppercase tracking-widest border-l pl-3`}
                style={{ 
                  color: "var(--app-text-muted, #94a3b8)",
                  borderLeftColor: "var(--app-border-main, rgba(255,255,255,0.1))" 
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
                <span className="text-[11px] font-bold uppercase tracking-wider">
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
                      className={`py-2 rounded border text-[11px] font-mono transition-all`}
                      style={{ 
                        borderColor: isActive ? theme.hex : "var(--app-border-main, rgba(255,255,255,0.1))",
                        backgroundColor: isActive ? "var(--app-bg-tint, rgba(255,255,255,0.1))" : "var(--app-bg-tint, rgba(0,0,0,0.2))",
                        color: "var(--app-text-main, #ffffff)"
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
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  UI Theme (Visuals)
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
                    "MIDNIGHT",
                    "VAPORWAVE",
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
                      }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: cfg.hex }}
                      />
                      {t.slice(0, 4)}
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
              className={`tech-border p-4 space-y-4 rounded-xl border glass-blur`}
              style={{
                backgroundColor: "var(--app-bg-tint, #11111a)",
                borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
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
                    style={{ color: "var(--app-text-main, #ffffff)" }}
                  >
                    Tone & Delivery
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
              className={`tech-border p-4 space-y-4 rounded-xl border glass-blur`}
              style={{
                backgroundColor: "var(--app-bg-tint, #0a0a0a)",
                borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconEngine name="Globus" variant="BoldDuotone" className="w-4 h-4" style={{ color: theme.hex }} />
                  <span
                    className={`text-xs font-bold uppercase tracking-tighter`}
                    style={{ color: "var(--app-text-main, #ffffff)" }}
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
                      borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
                    }}
                  >
                    {profileStatus.profileName && (
                      <div
                        className={`text-[11px] font-mono flex items-center gap-2`}
                        style={{ color: "var(--app-text-main, #ffffff)" }}
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
                  className={`text-[11px] leading-relaxed`}
                  style={{ color: "var(--app-text-muted, #94a3b8)" }}
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
                    color: "var(--app-text-main, #ffffff)",
                    backgroundColor: "var(--app-bg-tint, rgba(255,255,255,0.05))",
                    borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
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
              className={`tech-border p-4 space-y-4 rounded-xl border glass-blur`}
              style={{
                backgroundColor: "var(--app-bg-tint, #11111a)",
                borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconEngine name="Settings" variant="BoldDuotone" className="w-4 h-4" style={{ color: theme.hex }} />
                  <span
                    className={`text-xs font-bold uppercase tracking-tighter`}
                    style={{ color: "var(--app-text-main, #ffffff)" }}
                  >
                    SYSTEM UI CONFIG
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[var(--app-text-muted)] uppercase tracking-widest">
                  UX PREFERENCES
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
                    ].map((beh) => (
                      <div
                        key={beh.key}
                        className={`flex items-center justify-between py-1.5 px-2 rounded transition-colors group/row hover:bg-[var(--app-bg-tint)]/40`}
                      >
                        <span
                          className={`text-[10px] font-mono`}
                          style={{ color: "var(--app-text-muted, #94a3b8)" }}
                        >
                          {beh.label}
                        </span>
                        <input
                          type="checkbox"
                          checked={
                            !!settings.general[
                              beh.key as keyof typeof settings.general
                            ]
                          }
                          onChange={(e) =>
                            onUpdate("general", beh.key, e.target.checked)
                          }
                          className={`w-4 h-4 rounded appearance-none border transition-all cursor-pointer bg-[var(--app-bg-tint)]`}
                          style={{ 
                            accentColor: theme.hex,
                            borderColor: "var(--app-border-main, rgba(255,255,255,0.2))"
                          }}
                        />
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
                          style={{ color: "var(--app-text-main, #ffffff)" }}
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
                          style={{ color: "var(--app-text-main, #ffffff)" }}
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

            {/* Privacy & Awareness Card */}
            <motion.div
              variants={item}
              className={`tech-border p-4 space-y-3 rounded-xl border glass-blur`}
              style={{
                backgroundColor: "var(--app-bg-tint, #11111a)",
                borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconEngine name="ShieldCheck" variant="BoldDuotone" className="w-4 h-4" style={{ color: theme.hex }} />
                  <span
                    className={`text-xs font-bold uppercase tracking-tighter`}
                    style={{ color: "var(--app-text-main, #ffffff)" }}
                  >
                    Privacy & Awareness
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[var(--app-text-muted)] uppercase tracking-widest">
                  OBSERVATION CONTROLS
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
                            style={{ color: "var(--app-text-muted, #94a3b8)" }}
                          >
                            {privItem.label}
                          </span>
                          <span className="text-sm text-[var(--app-text-muted)] uppercasek">
                            {privItem.desc}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          onUpdate("privacy", privItem.key, !isEnabled)
                        }
                        className={`relative w-9 h-5 rounded-full transition-all duration-300 ${
                          isEnabled
                            ? ""
                            : "bg-[var(--app-border-main)]"
                        }`}
                        style={{
                          backgroundColor: isEnabled ? theme.hex : undefined,
                        }}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 shadow-sm ${
                            isEnabled ? "left-[18px]" : "left-0.5"
                          } bg-[var(--app-bg-tint)]`}
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
                      OS Link Status
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
