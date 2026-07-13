import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LucaSettings } from "../../services/settingsService";
import { apiUrl } from "../../config/api";
import { Icon as IconEngine } from "../ui/Icon";
import ToneStyleSelector from "./ToneStyleSelector";
import { PersonaMode } from "../../types/lucaPersonality";
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
import {
  getExperienceModeOptions,
  getIntentionalExperienceModeSettingsUpdate,
} from "../../experience/experienceModeSettings";
import {
  getExperienceModeLabel,
  type LucaExperienceMode,
} from "../../experience/experienceMode";

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

  const handleExperienceModeChange = (mode: LucaExperienceMode) => {
    const update = getIntentionalExperienceModeSettingsUpdate(
      settings.general.experienceMode,
      mode,
    );
    if (!update) return;

    onUpdate("general", "theme", update.theme);
    onUpdate("general", "experienceMode", update.experienceMode);
  };

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
            description="Choose the level of detail and controls that feels right for you."
            icon="Layers"
            accentColor={theme.hex}
            isMobile={isMobile}
          >
            <div>
              <div
                role="radiogroup"
                aria-label="Experience Mode"
                className="grid grid-cols-1 gap-2 md:grid-cols-3"
              >
                {experienceModeOptions.map((option) => {
                  const isActive =
                    settings.general.experienceMode === option.mode;
                  return (
                    <button
                      key={option.mode}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      aria-label={`${option.label}: ${option.description}`}
                      onClick={() => handleExperienceModeChange(option.mode)}
                      className="group rounded-xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      style={{
                        borderColor: isActive
                          ? theme.hex
                          : settingsSurfaceTokens.borderSubtle,
                        background: isActive
                          ? `${theme.hex}14`
                          : settingsSurfaceTokens.elevated,
                        outlineColor: theme.hex,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: settingsSurfaceTokens.textPrimary }}
                        >
                          {option.label}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-opacity ${
                            isActive ? "opacity-100" : "opacity-40"
                          }`}
                          style={{
                            borderColor: isActive
                              ? theme.hex
                              : settingsSurfaceTokens.borderSubtle,
                            backgroundColor: isActive
                              ? theme.hex
                              : "transparent",
                            color: isActive
                              ? "#ffffff"
                              : settingsSurfaceTokens.textTertiary,
                          }}
                        >
                          {isActive ? "✓" : ""}
                        </span>
                      </div>
                      <p
                        className="mt-1.5 text-xs leading-relaxed"
                        style={{ color: settingsSurfaceTokens.textSecondary }}
                      >
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
                <p
                  className="text-xs"
                  style={{ color: settingsSurfaceTokens.textSecondary }}
                >
                  Current mode:{" "}
                  {getExperienceModeLabel(settings.general.experienceMode)}
                </p>
                <p
                  className="text-xs"
                  style={{ color: settingsSurfaceTokens.textTertiary }}
                >
                  You can customize appearance later.
                </p>
              </div>
            </div>
          </SettingsSection>
        </motion.div>

        <motion.div variants={item}>
          <SettingsSection
            title="Appearance"
            description="Choose Luca's persona and visual operating environment."
            icon="Palette"
            accentColor={theme.hex}
            isMobile={isMobile}
          >
            <div>
              <div className="mb-2">
                <p
                  className="text-[13.5px] font-medium"
                  style={{ color: settingsSurfaceTokens.textPrimary }}
                >
                  Luca Persona
                </p>
                <p
                  className="text-[12.5px]"
                  style={{ color: settingsSurfaceTokens.textSecondary }}
                >
                  Current mode: {personaLabel}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {personaOptions.map((p) => {
                  const isActive = personaLabel === p;
                  return (
                    <button
                      key={p}
                      onClick={() => onUpdate("general", "persona", p)}
                      className="rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors"
                      style={{
                        borderColor: isActive
                          ? theme.hex
                          : settingsSurfaceTokens.borderSubtle,
                        backgroundColor: isActive
                          ? `${theme.hex}14`
                          : "transparent",
                        color: isActive
                          ? settingsSurfaceTokens.textPrimary
                          : settingsSurfaceTokens.textSecondary,
                      }}
                    >
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </button>
                  );
                })}
              </div>
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
            <div className="space-y-4">
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
            </div>
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
                  style={{
                    ...settingsControlInlineStyle,
                    color: "var(--luca-accent-primary, var(--app-text-main))",
                  }}
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
