import React, { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import { motion } from "framer-motion";
import { LucaSettings } from "../../services/settingsService";
import { PERSONA_UI_CONFIG } from "../../services/lucaService";
import { apiUrl } from "../../config/api";
const {
  Chrome,
  RefreshCw,
  Trash2,
  Palette,
  Settings2,
  ShieldAlert,
  Eye,
  Camera,
  Mic2,
  Shield,
  MessageSquare,
  BrainCircuit,
  Paintbrush,
} = LucideIcons as any;
import { setHexAlpha } from "../../config/themeColors";
import ToneStyleSelector from "./ToneStyleSelector";
import {
  ToneStyleId,
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
    <div className="space-y-6 max-h-[520px] pr-2 overflow-y-auto">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {/* IDENTITY & AESTHETIC (Full Width) */}
        <motion.div
          variants={item}
          className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-card-stable-light" : "glass-card-stable"} tech-border p-4 space-y-4`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" style={{ color: theme.hex }} />
              <span
                className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-400"} uppercase tracking-tighter`}
              >
                Brain & Skin Configuration
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 mr-2">
                <span className="text-[8px] font-mono text-gray-500 uppercase">
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
                  className={`w-3 h-3 rounded appearance-none border cursor-pointer ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/10 bg-black/5" : ""}`}
                  style={{ 
                    accentColor: theme.hex,
                    borderColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.2),
                    backgroundColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : "rgba(0,0,0,0.4)"
                  }}
                />
              </div>
              <div 
                className={`text-[8px] font-mono text-gray-500 uppercase tracking-widest border-l pl-3 ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/10" : ""}`}
                style={{ borderLeftColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.1) }}
              >
                {settings.general.persona} MODE
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mind Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-1 opacity-60">
                <BrainCircuit className="w-3 h-3" style={{ color: theme.hex }} />
                <span className="text-[9px] font-bold uppercase tracking-wider">
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
                      className={`py-2 rounded border text-[9px] font-mono transition-all ${
                        isActive
                          ? theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/10" : "bg-white/10"
                          : theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.02] border-black/10 opacity-50" : ""
                      }`}
                      style={{ 
                        borderColor: isActive ? theme.hex : (theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.1)),
                        backgroundColor: isActive ? undefined : (theme.themeName?.toLowerCase() === "lucagent" ? undefined : "rgba(0,0,0,0.2)")
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
                <Paintbrush className="w-3 h-3" style={{ color: theme.hex }} />
                <span className="text-[9px] font-bold uppercase tracking-wider">
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
                      className={`py-1.5 rounded border text-[8px] font-mono transition-all flex items-center justify-center gap-1.5 ${
                        isActive 
                          ? theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/10" : "bg-white/10" 
                          : theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.02] border-black/10" : ""
                      } ${settings.general.syncThemeWithPersona ? "opacity-20 cursor-not-allowed" : "opacity-60"}`}
                      style={{
                        borderColor: isActive ? cfg.hex : (theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.1)),
                        backgroundColor: isActive ? undefined : (theme.themeName?.toLowerCase() === "lucagent" ? undefined : "rgba(0,0,0,0.2)")
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
                <div className="text-[7px] text-gray-500 italic mt-1 px-1">
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
              className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-card-stable-light" : "glass-card-stable"} tech-border p-4 space-y-4`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare
                    className="w-4 h-4"
                    style={{ color: theme.hex }}
                  />
                  <span
                    className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-400"} uppercase tracking-tighter`}
                  >
                    Tone & Delivery
                  </span>
                </div>
                <div className="text-[8px] font-mono text-gray-500 uppercase">
                  Conversational Vibe
                </div>
              </div>

              <ToneStyleSelector
                currentStyleId={settings.general.toneStyle as ToneStyleId}
                customDimensions={settings.general.customTone}
                onStyleChange={(id) => onUpdate("general", "toneStyle", id)}
                onCustomChange={(dims) =>
                  onUpdate("general", "customTone", dims)
                }
                themeHex={theme.hex}
                isLightMode={theme.themeName?.toLowerCase() === "lucagent"}
              />
            </motion.div>

            {/* Browser Sessions Card */}
            <motion.div
              variants={item}
              className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-card-stable-light" : "glass-card-stable"} tech-border p-4 space-y-4`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Chrome className="w-4 h-4" style={{ color: theme.hex }} />
                  <span
                    className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-400"} uppercase tracking-tighter`}
                  >
                    Browser Sessions
                  </span>
                </div>
                <div
                  className={`text-[8px] font-mono ${profileStatus?.imported ? "text-green-500" : "text-yellow-500"}`}
                >
                  {profileStatus?.imported ? "CONNECTED" : "UNLINKED"}
                </div>
              </div>
              <div className="space-y-3">
                {profileStatus?.imported && (
                  <div 
                    className={`space-y-1.5 p-2 rounded border ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 border-black/5" : ""}`}
                    style={{
                      backgroundColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.05),
                      borderColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.05),
                    }}
                  >
                    {profileStatus.profileName && (
                      <div
                        className={`text-[9px] ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-900" : "text-white"} font-mono flex items-center gap-2`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: theme.hex }}
                        />
                        PROFILE: {profileStatus.profileName.toUpperCase()}
                      </div>
                    )}
                    {profileStatus.lastSync && (
                      <div className="text-[8px] text-gray-500 font-mono ml-3.5">
                        SYNCED:{" "}
                        {new Date(profileStatus.lastSync).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
                {profileStatus?.chromeRunning && (
                  <div
                    className={`text-[8px] font-mono flex items-center gap-1.5 p-2 rounded border animate-pulse ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-orange-500/15 border-orange-500/40 text-orange-900 font-bold" : "bg-orange-500/5 border-orange-500/10 text-orange-400"}`}
                  >
                    <ShieldAlert className="w-3 h-3" />
                    CHROME DETECTED: CLOSE TO RE-IMPORT
                  </div>
                )}
                <p
                  className={`text-[9px] ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-600" : "text-gray-500"} leading-relaxed`}
                >
                  Link Chrome to synchronize your active sessions and
                  credentials directly with the Ghost Browser.
                </p>
              </div>
                <div 
                  className={`flex gap-2 pt-2 border-t ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/5" : ""}`}
                  style={{ borderTopColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.1) }}
                >
                <button
                  onClick={() =>
                    fetch(apiUrl("/api/chrome-profile/import"), {
                      method: "POST",
                    }).then(() => fetchProfileStatus())
                  }
                  className={`flex-1 py-1.5 rounded border ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/10 bg-black/[0.03] hover:bg-black/[0.08]" : "border-white/5 bg-white/5 hover:bg-white/10"} text-[9px] font-bold flex items-center justify-center gap-2 transition-all`}
                  style={{
                    color:
                      theme.themeName?.toLowerCase() === "lucagent"
                        ? "#111827"
                        : theme.hex,
                    borderColor:
                      theme.themeName?.toLowerCase() === "lucagent"
                        ? "rgba(0,0,0,0.1)"
                        : setHexAlpha(theme.hex, 0.2),
                  }}
                >
                  {profileStatus?.imported ? (
                    <RefreshCw className="w-3 h-3" />
                  ) : (
                    <Chrome className="w-3 h-3" />
                  )}
                  {profileStatus?.imported ? "RE-IMPORT" : "IMPORT SESSION"}
                </button>
                {profileStatus?.imported && (
                  <button
                    onClick={handleClear}
                    className="p-1.5 rounded border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
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
              className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-card-stable-light" : "glass-card-stable"} tech-border p-4 space-y-4`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4" style={{ color: theme.hex }} />
                  <span
                    className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-400"} uppercase tracking-tighter`}
                  >
                    SYSTEM UI CONFIG
                  </span>
                </div>
                <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">
                  UX PREFERENCES
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* System Behavior Sub-Section */}
                <div className="space-y-1.5">
                  <div className="text-[9px] font-bold text-gray-500 mb-1">
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
                        className={`flex items-center justify-between py-1.5 px-2 rounded transition-colors ${theme.themeName?.toLowerCase() === "lucagent" ? "hover:bg-black/5" : ""}`}
                        style={{
                          backgroundColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : "transparent"
                        }}
                        onMouseEnter={(e) => {
                          if (theme.themeName?.toLowerCase() !== "lucagent") {
                            e.currentTarget.style.backgroundColor = setHexAlpha(theme.hex, 0.05);
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (theme.themeName?.toLowerCase() !== "lucagent") {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        <span
                          className={`text-[9px] font-mono ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-800" : "text-gray-400"}`}
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
                          className={`w-4 h-4 rounded appearance-none border transition-all cursor-pointer ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] border-black/20" : ""}`}
                          style={{ 
                            accentColor: theme.hex,
                            backgroundColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : "rgba(0,0,0,0.4)",
                            borderColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.2)
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Background Visibility Sub-Section */}
                <div 
                  className={`space-y-2 border-t pt-3 ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/5" : ""}`}
                  style={{ borderTopColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.1) }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[9px] font-bold text-gray-500 uppercase">
                      Glass Controls
                    </div>
                  </div>
                  <div className="space-y-3 px-1">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className={`text-[8px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-800" : "text-gray-500"} tracking-widest`}
                        >
                          OPACITY
                        </span>
                        <span
                          className={`text-[9px] font-mono ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-white"}`}
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
                        className={`w-full accent-current h-1 rounded-lg appearance-none cursor-pointer ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/10" : ""}`}
                        style={{ 
                          accentColor: theme.hex,
                          backgroundColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.1)
                        }}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className={`text-[8px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-800" : "text-gray-500"} tracking-widest`}
                        >
                          BLUR
                        </span>
                        <span
                          className={`text-[9px] font-mono ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-white"}`}
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
                        className={`w-full accent-current h-1 rounded-lg appearance-none cursor-pointer ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/10" : ""}`}
                        style={{ 
                          accentColor: theme.hex,
                          backgroundColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.1)
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
              className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-card-stable-light" : "glass-card-stable"} tech-border p-4 space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" style={{ color: theme.hex }} />
                  <span
                    className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-400"} uppercase tracking-tighter`}
                  >
                    Privacy & Awareness
                  </span>
                </div>
                <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">
                  OBSERVATION CONTROLS
                </div>
              </div>
              <p
                className={`text-[9px] ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-600" : "text-gray-500"} leading-tight`}
              >
                Control what Luca can observe. Disabling a sensor stops it
                immediately, even mid-loop.
              </p>
              <div className="space-y-1">
                {[
                  {
                    label: "SCREEN OBSERVATION",
                    key: "screenEnabled",
                    icon: Eye,
                    desc: "Allow Luca to periodically scan your screen for context",
                  },
                  {
                    label: "CAMERA ACCESS",
                    key: "cameraEnabled",
                    icon: Camera,
                    desc: "Allow Luca to use the webcam (Room Guard, Vision)",
                  },
                  {
                    label: "MICROPHONE",
                    key: "micEnabled",
                    icon: Mic2,
                    desc: "Allow Luca to listen for voice input and ambient audio",
                  },
                ].map((privItem) => {
                  const Icon = privItem.icon;
                  const isEnabled =
                    !!settings.privacy?.[
                      privItem.key as keyof typeof settings.privacy
                    ];
                  return (
                    <div
                      key={privItem.key}
                      className={`flex items-center justify-between py-2 border-b transition-colors px-2 rounded last:border-0 ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/5 hover:bg-black/5" : ""}`}
                      style={{
                        borderBottomColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.05),
                        backgroundColor: "transparent"
                      }}
                      onMouseEnter={(e) => {
                        if (theme.themeName?.toLowerCase() !== "lucagent") {
                          e.currentTarget.style.backgroundColor = setHexAlpha(theme.hex, 0.05);
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (theme.themeName?.toLowerCase() !== "lucagent") {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className="w-3.5 h-3.5"
                          style={{
                            color: isEnabled ? theme.hex : theme.themeName?.toLowerCase() === "lucagent" ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)",
                          }}
                        />
                        <div>
                          <span
                            className={`text-[9px] font-mono block ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-800" : "text-gray-400"}`}
                          >
                            {privItem.label}
                          </span>
                          <span className="text-[8px] text-gray-500 block">
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
                            : theme.themeName?.toLowerCase() === "lucagent"
                              ? "bg-gray-300"
                              : "bg-gray-700"
                        }`}
                        style={{
                          backgroundColor: isEnabled ? theme.hex : undefined,
                        }}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 shadow-sm ${
                            isEnabled ? "left-[18px]" : "left-0.5"
                          } ${
                            theme.themeName?.toLowerCase() === "lucagent"
                              ? "bg-white"
                              : "bg-gray-200"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* System Permissions Merged Here */}
              <div 
                className={`mt-2 pt-3 border-t space-y-2 ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/5" : ""}`}
                style={{ borderTopColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.1) }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert
                      className="w-3 h-3"
                      style={{ color: theme.hex }}
                    />
                    <span
                      className={`text-[8px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-400"} uppercase tracking-tighter`}
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
                        res.success ? "Neural Link Secured." : "Access Denied.",
                      );
                    }}
                    className={`py-1 rounded-lg border ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/10 bg-black/[0.03] text-slate-800 font-bold" : "border-white/10 bg-white/5 text-gray-400 font-bold"} text-[8px] hover:bg-white/10 transition-all`}
                  >
                    CHECK STATUS
                  </button>
                  <button
                    onClick={async () => {
                      const { requestPermissions } =
                        await import("../../tools/handlers/LocalTools");
                      await requestPermissions();
                    }}
                    className={`py-1 rounded-lg border ${
                      theme.themeName?.toLowerCase() === "lucagent"
                        ? "border-black/5 bg-black/5"
                        : "border-white/10 bg-white/5"
                    } text-[8px] font-bold transition-all`}
                    style={{
                      backgroundColor:
                        theme.themeName?.toLowerCase() === "lucagent"
                          ? "rgba(0,0,0,0.02)"
                          : `${theme.hex}22`,
                      color:
                        theme.themeName?.toLowerCase() === "lucagent"
                          ? settings.general.theme === "PROFESSIONAL"
                            ? "#6b7280"
                            : theme.hex
                          : theme.hex,
                      borderColor:
                        theme.themeName?.toLowerCase() === "lucagent"
                          ? "rgba(0,0,0,0.1)"
                          : `${theme.hex}66`,
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
