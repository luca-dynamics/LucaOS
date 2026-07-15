import React from "react";
import type { LucaSettings } from "../../services/settingsService";
import SkinPreviewSection from "./SkinPreviewSection";
import {
  SettingsCard,
  SettingsRow,
  SettingsSection,
  SettingsToggle,
  settingsControlInlineStyle,
  settingsSelectClassName,
} from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";
import AtmosphereStudio from "./AtmosphereStudio";
import OpticalMaterialControls from "./OpticalMaterialControls";

/**
 * Appearance — a first-class Settings destination (see
 * docs/mockups/settings-target.html).
 *
 * Hosts the LucaOS skin system: the eight visual operating environments
 * (darks Carbon/Graphite/Onyx/Dusk · lights Pearl/Mist/Canvas · living Flow).
 * Skins change material and mood — never legibility.
 *
 * Also hosts Material & Display (font, scale, glass) and the Feel rows —
 * every control here is backed by a real settings key; nothing is invented
 * ahead of one.
 */

export interface SettingsAppearanceTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme: { hex: string };
  isMobile?: boolean;
}

export const SettingsAppearanceTab: React.FC<SettingsAppearanceTabProps> = ({
  settings,
  onUpdate,
  theme,
  isMobile,
}) => {
  return (
    <div className="space-y-6">
      <SkinPreviewSection
        accentColor={theme.hex}
        isMobile={isMobile}
        selectedSkinId={settings.general.selectedSkinId}
        onSelectedSkinChange={(skinId) =>
          onUpdate("general", "selectedSkinId", skinId)
        }
      />

      <SettingsSection
        title="Atmosphere"
        description="Create a personal background while Luca keeps the selected skin readable and consistent."
        icon="Palette"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <AtmosphereStudio
          value={settings.general.atmosphere}
          accentColor={theme.hex}
          onChange={(atmosphere) => {
            onUpdate("general", "atmosphere", atmosphere);
            window.dispatchEvent(
              new CustomEvent("luca:atmosphere-preview", { detail: atmosphere }),
            );
          }}
        />
      </SettingsSection>

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
                  window.dispatchEvent(
                    new CustomEvent("luca:material-preview", {
                      detail: { opacity: val },
                    }),
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
                  window.dispatchEvent(
                    new CustomEvent("luca:material-preview", {
                      detail: { blur: val },
                    }),
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
          <div className="mt-4">
            <OpticalMaterialControls
              value={settings.general.opticalMaterial}
              accentColor={theme.hex}
              onChange={(opticalMaterial) => {
                onUpdate("general", "opticalMaterial", opticalMaterial);
                window.dispatchEvent(
                  new CustomEvent("luca:optical-material-preview", { detail: opticalMaterial }),
                );
              }}
            />
          </div>
        </SettingsSection>

      <SettingsSection
        title="Feel"
        description="How the interface moves. Skins change material — never motion honesty."
        icon="Pulse"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsCard>
          <SettingsRow
            label="Reduce motion"
            description="Softens interface animation — entrances and transitions settle instantly."
            control={
              <SettingsToggle
                checked={Boolean(settings.general.reduceMotion)}
                onChange={() =>
                  onUpdate(
                    "general",
                    "reduceMotion",
                    !settings.general.reduceMotion,
                  )
                }
                accentColor={theme.hex}
                ariaLabel="Reduce motion"
              />
            }
          />
        </SettingsCard>
      </SettingsSection>
    </div>
  );
};

export default SettingsAppearanceTab;
