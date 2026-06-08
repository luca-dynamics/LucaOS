import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LucaSettings } from "../../services/settingsService";
import { apiUrl } from "../../config/api";
import { Icon as IconEngine } from "../ui/Icon";
import ToneStyleSelector from "./ToneStyleSelector";
import { PersonaMode } from "../../types/lucaPersonality";
import {
  NORMAL_LUCA_THEME_OPTIONS,
  getLucaThemeLabel,
} from "../../config/lucaThemeLabels";
import {
  SettingsAdvancedDisclosure,
  SettingsCard,
  SettingsDangerZone,
  SettingsRow,
  SettingsSection,
  SettingsStatusCard,
  SettingsToggle,
  settingsControlInlineStyle,
  settingsSelectClassName,
} from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";
import { CREATOR_ACCESS_STATE } from "../../experience/experienceModeAccess";
import { getExperienceModeOptions } from "../../experience/experienceModeSettings";

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

function normalizeDisplayValue(value: unknown, fallback = "ASSISTANT"): string {
  if (typeof value === "string") return value;
  if (value == null) return fallback;

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (
      entries.length > 0 &&
      entries.every(
        ([key, item]) => /^\d+$/.test(key) && typeof item === "string",
      )
    ) {
      return entries
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([, item]) => item)
        .join("");
    }

    const candidate =
      (value as any).persona ??
      (value as any).name ??
      (value as any).id ??
      (value as any).value;

    if (typeof candidate === "string") return candidate;
  }

  const text = String(value).trim();
  return text && text !== "[object Object]" ? text : fallback;
}

const experienceModeOptions = getExperienceModeOptions(CREATOR_ACCESS_STATE);

const personaOptions: PersonaMode[] = [
  "RUTHLESS",
  "ENGINEER",
  "ASSISTANT",
  "HACKER",
];

const SettingsGeneralTab: React.FC<SettingsGeneralTabProps> = ({
  settings,
  onUpdate,
  theme,
  isMobile,
}) => {
  const personaLabel = normalizeDisplayValue(settings.general.persona);
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
        "Clear imported Chrome session data? Luca will use clean browser sessions.",
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
      transition: { staggerChildren: 0.04 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  const toggleGeneral = (key: keyof LucaSettings["general"]) =>
    onUpdate("general", key, !settings.general[key]);

  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : "pr-2"} overflow-y-auto`}>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        <motion.div variants={item}>
          <SettingsSection
            title="Experience Mode"
            description="Choose how much of LucaOS is surfaced. Full dashboard gating comes in a later phase."
            icon="Layers"
            accentColor={theme.hex}
            isMobile={isMobile}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {experienceModeOptions.map((option) => {
                const isActive =
                  settings.general.experienceMode === option.mode;
                return (
                  <button
                    key={option.mode}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() =>
                      onUpdate("general", "experienceMode", option.mode)
                    }
                    className="rounded-xl border p-4 text-left transition-all hover:opacity-90"
                    style={{
                      borderColor: isActive
                        ? theme.hex
                        : settingsSurfaceTokens.borderSubtle,
                      background: isActive
                        ? `${theme.hex}18`
                        : settingsSurfaceTokens.elevated,
                    }}
                  >
                    <div
                      className="text-sm font-semibold"
                      style={{ color: settingsSurfaceTokens.textPrimary }}
                    >
                      {option.label}
                    </div>
                    <p
                      className="mt-1 text-xs leading-relaxed"
                      style={{ color: settingsSurfaceTokens.textSecondary }}
                    >
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </SettingsSection>
        </motion.div>

        <motion.div variants={item}>
          <SettingsSection
            title="Appearance"
            description="Choose Luca's persona and visual theme without exposing raw theme internals."
            icon="Palette"
            accentColor={theme.hex}
            isMobile={isMobile}
          >
            <SettingsRow
              label="Sync appearance with persona"
              description="Let Luca choose the matching appearance when you switch persona."
              icon="RefreshCircle"
              accentColor={theme.hex}
              control={
                <SettingsToggle
                  checked={!!settings.general.syncThemeWithPersona}
                  onChange={() => toggleGeneral("syncThemeWithPersona")}
                  accentColor={theme.hex}
                  ariaLabel="Sync appearance with persona"
                />
              }
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SettingsCard>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h4
                      className="text-sm font-semibold"
                      style={{ color: settingsSurfaceTokens.textPrimary }}
                    >
                      Luca Persona
                    </h4>
                    <p
                      className="text-xs"
                      style={{ color: settingsSurfaceTokens.textSecondary }}
                    >
                      Current mode: {personaLabel}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {personaOptions.map((p) => {
                    const isActive = personaLabel === p;
                    return (
                      <button
                        key={p}
                        onClick={() => onUpdate("general", "persona", p)}
                        className="rounded-xl border px-3 py-2 text-sm font-medium transition-all"
                        style={{
                          borderColor: isActive
                            ? theme.hex
                            : settingsSurfaceTokens.borderSubtle,
                          backgroundColor: isActive
                            ? settingsSurfaceTokens.accentSoft
                            : settingsSurfaceTokens.elevated,
                          color: settingsSurfaceTokens.textPrimary,
                        }}
                      >
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </button>
                    );
                  })}
                </div>
              </SettingsCard>

              <SettingsCard>
                <h4
                  className="text-sm font-semibold"
                  style={{ color: settingsSurfaceTokens.textPrimary }}
                >
                  Theme
                </h4>
                <p
                  className="mb-3 text-xs"
                  style={{ color: settingsSurfaceTokens.textSecondary }}
                >
                  Pick the surface style Luca uses across Settings and shell UI.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {NORMAL_LUCA_THEME_OPTIONS.map((option) => {
                    const isActive =
                      getLucaThemeLabel(settings.general.theme)
                        .canonicalThemeId === option.canonicalThemeId;
                    return (
                      <button
                        key={option.id}
                        disabled={settings.general.syncThemeWithPersona}
                        onClick={() =>
                          onUpdate("general", "theme", option.canonicalThemeId)
                        }
                        title={option.description}
                        aria-label={`${option.label}: ${option.description}`}
                        className="flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-all disabled:cursor-not-allowed disabled:opacity-40"
                        style={{
                          borderColor: isActive
                            ? theme.hex
                            : settingsSurfaceTokens.borderSubtle,
                          backgroundColor: isActive
                            ? settingsSurfaceTokens.accentSoft
                            : settingsSurfaceTokens.elevated,
                          color: settingsSurfaceTokens.textPrimary,
                        }}
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: option.hex }}
                        />
                        <span className="truncate">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                {settings.general.syncThemeWithPersona && (
                  <p
                    className="mt-2 text-xs"
                    style={{ color: settingsSurfaceTokens.textTertiary }}
                  >
                    Disable sync to customize theme manually.
                  </p>
                )}
              </SettingsCard>
            </div>
          </SettingsSection>
        </motion.div>

        <motion.div variants={item}>
          <SettingsSection
            title="Material & Display"
            description="Tune readability, glass material, and global text scale."
            icon="TextField"
            accentColor={theme.hex}
            isMobile={isMobile}
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SettingsCard>
                <label
                  className="text-sm font-medium"
                  style={{ color: settingsSurfaceTokens.textPrimary }}
                >
                  Interface font
                </label>
                <select
                  value={
                    settings.general.fontFamily ||
                    '"Inter", system-ui, sans-serif'
                  }
                  onChange={(e) =>
                    onUpdate("general", "fontFamily", e.target.value)
                  }
                  className={`${settingsSelectClassName} mt-2`}
                  style={settingsControlInlineStyle}
                >
                  <option value='"Inter", system-ui, sans-serif'>
                    Inter — Standard
                  </option>
                  <option value='"JetBrains Mono", monospace'>
                    JetBrains Mono — Technical
                  </option>
                  <option value='"Outfit", sans-serif'>Outfit — Premium</option>
                  <option value='"Fraunces", serif'>
                    Fraunces — Editorial
                  </option>
                  <option value='"Space Mono", monospace'>
                    Space Mono — Tactical
                  </option>
                  <option value="system-ui, sans-serif">System Native</option>
                </select>
              </SettingsCard>

              <SettingsCard>
                <div
                  className="flex justify-between text-sm font-medium"
                  style={{ color: settingsSurfaceTokens.textPrimary }}
                >
                  <span>UI scale</span>
                  <span>
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
                    document.documentElement.style.setProperty(
                      "--app-font-scale",
                      val.toString(),
                    );
                  }}
                  className="mt-3 h-1 w-full cursor-pointer appearance-none rounded-lg"
                  style={{
                    accentColor: theme.hex,
                    backgroundColor: settingsSurfaceTokens.borderSubtle,
                  }}
                />
              </SettingsCard>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SettingsCard>
                <div
                  className="flex justify-between text-sm font-medium"
                  style={{ color: settingsSurfaceTokens.textPrimary }}
                >
                  <span>Background opacity</span>
                  <span>
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
                    document.documentElement.style.setProperty(
                      "--app-bg-opacity",
                      val.toString(),
                    );
                  }}
                  className="mt-3 h-1 w-full cursor-pointer appearance-none rounded-lg"
                  style={{
                    accentColor: theme.hex,
                    backgroundColor: settingsSurfaceTokens.borderSubtle,
                  }}
                />
              </SettingsCard>
              <SettingsCard>
                <div
                  className="flex justify-between text-sm font-medium"
                  style={{ color: settingsSurfaceTokens.textPrimary }}
                >
                  <span>Background blur</span>
                  <span>{settings.general.backgroundBlur ?? 12}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={settings.general.backgroundBlur ?? 12}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    onUpdate("general", "backgroundBlur", val);
                    document.documentElement.style.setProperty(
                      "--app-bg-blur",
                      `${val}px`,
                    );
                  }}
                  className="mt-3 h-1 w-full cursor-pointer appearance-none rounded-lg"
                  style={{
                    accentColor: theme.hex,
                    backgroundColor: settingsSurfaceTokens.borderSubtle,
                  }}
                />
              </SettingsCard>
            </div>
          </SettingsSection>
        </motion.div>

        <motion.div variants={item}>
          <SettingsSection
            title="Luca Behavior"
            description="Set how Luca responds in conversation."
            icon="ChatRoundUnread"
            accentColor={theme.hex}
            isMobile={isMobile}
          >
            <ToneStyleSelector
              currentStyleId={settings.general.toneStyle}
              customDimensions={settings.general.customTone}
              onStyleChange={(id) => onUpdate("general", "toneStyle", id)}
              onCustomChange={(dims) => onUpdate("general", "customTone", dims)}
              themeHex={theme.hex}
            />
          </SettingsSection>
        </motion.div>

        <motion.div variants={item}>
          <SettingsSection
            title="Privacy & Awareness"
            description="Control what Luca can observe. Turning off a sensor stops that awareness immediately."
            icon="ShieldCheck"
            accentColor={theme.hex}
            isMobile={isMobile}
          >
            {[
              [
                "screenEnabled",
                "Screen observation",
                "Allow Luca to read screen context only when awareness features need it",
                "Eye",
              ],
              [
                "cameraEnabled",
                "Camera access",
                "Allow camera-based awareness for approved vision features",
                "Camera",
              ],
              [
                "micEnabled",
                "Microphone",
                "Allow microphone input for voice commands and audio awareness",
                "Microphone",
              ],
              [
                "telemetryEnabled",
                "Product improvement",
                "Share anonymized diagnostics to improve LucaOS reliability",
                "Link",
              ],
            ].map(([key, label, desc, icon]) => {
              const isEnabled =
                !!settings.privacy?.[key as keyof typeof settings.privacy];
              return (
                <SettingsRow
                  key={key}
                  label={label}
                  description={desc}
                  icon={icon}
                  accentColor={theme.hex}
                  control={
                    <SettingsToggle
                      checked={isEnabled}
                      onChange={() => onUpdate("privacy", key, !isEnabled)}
                      accentColor={theme.hex}
                      ariaLabel={label}
                    />
                  }
                />
              );
            })}
          </SettingsSection>
        </motion.div>

        <motion.div variants={item}>
          <SettingsSection
            title="Browser Sessions"
            description="Import approved browser sessions so Luca can use signed-in websites without asking for passwords."
            icon="Globus"
            accentColor={theme.hex}
            isMobile={isMobile}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <SettingsStatusCard
                label="Session status"
                value={profileStatus?.imported ? "Connected" : "Not linked"}
                detail={
                  profileStatus?.profileName
                    ? `Profile: ${profileStatus.profileName}`
                    : "Import a browser profile when needed."
                }
                accentColor={
                  profileStatus?.imported
                    ? theme.hex
                    : settingsSurfaceTokens.textTertiary
                }
              />
              <SettingsStatusCard
                label="Chrome"
                value={profileStatus?.chromeRunning ? "Open" : "Ready"}
                detail={
                  profileStatus?.chromeRunning
                    ? "Close Chrome before re-importing."
                    : "Ready for import or refresh."
                }
                accentColor={theme.hex}
              />
            </div>
            {profileStatus?.lastSync && (
              <p
                className="text-xs"
                style={{ color: settingsSurfaceTokens.textSecondary }}
              >
                Last synced {new Date(profileStatus.lastSync).toLocaleString()}.
              </p>
            )}
            <button
              onClick={() =>
                fetch(apiUrl("/api/chrome-profile/import"), {
                  method: "POST",
                }).then(() => fetchProfileStatus())
              }
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all hover:bg-[var(--luca-surface-hover,var(--app-bg-tint))]"
              style={settingsControlInlineStyle}
            >
              <IconEngine
                name={profileStatus?.imported ? "Restart" : "Globus"}
                variant="BoldDuotone"
                className="h-4 w-4"
              />
              {profileStatus?.imported ? "Re-import session" : "Import session"}
            </button>
          </SettingsSection>
        </motion.div>

        <motion.div variants={item}>
          <SettingsSection
            title="Startup & Window Behavior"
            description="Choose how Luca opens and stays available on this device."
            icon="WindowFrame"
            accentColor={theme.hex}
            isMobile={isMobile}
          >
            <SettingsRow
              label="Start Luca when this device boots"
              description="Launch LucaOS automatically after sign-in."
              icon="Power"
              accentColor={theme.hex}
              control={
                <SettingsToggle
                  checked={!!settings.general.startOnBoot}
                  onChange={() => toggleGeneral("startOnBoot")}
                  accentColor={theme.hex}
                  ariaLabel="Start Luca on boot"
                />
              }
            />
            <SettingsRow
              label="Minimize to tray"
              description="Keep Luca running in the background when the window closes."
              icon="Tray"
              accentColor={theme.hex}
              control={
                <SettingsToggle
                  checked={!!settings.general.minimizeToTray}
                  onChange={() => toggleGeneral("minimizeToTray")}
                  accentColor={theme.hex}
                  ariaLabel="Minimize to tray"
                />
              }
            />
          </SettingsSection>
        </motion.div>

        <motion.div variants={item}>
          <SettingsAdvancedDisclosure
            title="Advanced Settings"
            description="Diagnostics, experimental switches, permissions, and destructive session maintenance."
            defaultOpen={false}
          >
            <SettingsRow
              label="Diagnostic mode"
              description="Show additional debug information while troubleshooting."
              icon="Bug"
              accentColor={theme.hex}
              control={
                <SettingsToggle
                  checked={!!settings.general.debugMode}
                  onChange={() => toggleGeneral("debugMode")}
                  accentColor={theme.hex}
                  ariaLabel="Diagnostic mode"
                />
              }
            />
            <SettingsRow
              label="Experimental features"
              description="Enable features still in evaluation. Existing settings keys remain unchanged."
              icon="TestTube"
              accentColor={theme.hex}
              control={
                <SettingsToggle
                  checked={!!settings.general.experimentalMode}
                  onChange={() => toggleGeneral("experimentalMode")}
                  accentColor={theme.hex}
                  ariaLabel="Experimental features"
                />
              }
            />

            <SettingsCard>
              <h4
                className="text-sm font-semibold"
                style={{ color: settingsSurfaceTokens.textPrimary }}
              >
                System Permissions
              </h4>
              <p
                className="mt-1 text-xs"
                style={{ color: settingsSurfaceTokens.textSecondary }}
              >
                Verify or request OS-level permissions for local tools and
                awareness features.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  onClick={async () => {
                    const { checkPermissions } =
                      await import("../../tools/handlers/LocalTools");
                    const res = await checkPermissions();
                    alert(
                      res.success ? "Permissions verified." : "Access denied.",
                    );
                  }}
                  className="rounded-xl border px-3 py-2 text-sm font-semibold transition-all hover:bg-[var(--luca-surface-hover,var(--app-bg-tint))]"
                  style={settingsControlInlineStyle}
                >
                  Check status
                </button>
                <button
                  onClick={async () => {
                    const { requestPermissions } =
                      await import("../../tools/handlers/LocalTools");
                    await requestPermissions();
                  }}
                  className="rounded-xl border px-3 py-2 text-sm font-semibold transition-all hover:bg-[var(--luca-surface-hover,var(--app-bg-tint))]"
                  style={{ ...settingsControlInlineStyle, color: theme.hex }}
                >
                  Grant access
                </button>
              </div>
            </SettingsCard>

            {profileStatus?.imported && (
              <SettingsDangerZone
                title="Browser Session Maintenance"
                description="Clear imported browser session data from Luca."
              >
                <button
                  onClick={handleClear}
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all hover:bg-[var(--luca-surface-hover,var(--app-bg-tint))]"
                  style={{
                    ...settingsControlInlineStyle,
                    borderColor:
                      "var(--luca-border-strong, var(--app-border-main))",
                  }}
                >
                  <IconEngine
                    name="TrashBinMinimalistic"
                    variant="BoldDuotone"
                    className="h-4 w-4"
                  />
                  Clear imported session
                </button>
              </SettingsDangerZone>
            )}
          </SettingsAdvancedDisclosure>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SettingsGeneralTab;
