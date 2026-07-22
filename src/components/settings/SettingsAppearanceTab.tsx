import React from "react";
import type { LucaSettings } from "../../services/settingsService";
import { resolveLucaAppearanceModeForSkin } from "../../config/lucaSkins";
import AppearanceModeSection from "./AppearanceModeSection";
import SkinPreviewSection from "./SkinPreviewSection";
import {
  SettingsCard,
  SettingsRow,
  SettingsSection,
  SettingsToggle,
} from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";
import {
  LucaField,
  LucaFieldDescription,
  LucaFieldLabel,
  LucaSelect,
  LucaSlider,
} from "../ui/luca";
import AtmosphereStudio from "./AtmosphereStudio";
import OpticalMaterialControls from "./OpticalMaterialControls";

/**
 * Appearance — a first-class Settings destination (see
 * docs/mockups/settings-target.html).
 *
 * Appearance leads with the mode: LucaOS wears ONE identity (the glacier) as
 * Luca Light or Luca Dark, with System following the device. The wider
 * environment catalog sits below as an optional deeper shelf. Environments
 * change material and mood — never legibility.
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
    <div className="flex flex-col gap-6">
      {/* Appearance mode is the primary control — one identity, light or dark
          (or follow the system). It writes both the mode and the skin that
          mode resolves to, so every skin-consuming surface follows along. */}
      <AppearanceModeSection
        accentColor={theme.hex}
        isMobile={isMobile}
        appearanceMode={settings.general.appearanceMode}
        onAppearanceModeChange={(mode, resolvedSkinId) => {
          onUpdate("general", "appearanceMode", mode);
          onUpdate("general", "selectedSkinId", resolvedSkinId);
        }}
      />

      <SkinPreviewSection
        accentColor={theme.hex}
        isMobile={isMobile}
        selectedSkinId={settings.general.selectedSkinId}
        onSelectedSkinChange={(skinId) => {
          onUpdate("general", "selectedSkinId", skinId);
          // Picking an environment here overrides the mode above. Luca Light /
          // Luca Dark map back to their mode; anything else clears it, so
          // system-following can't silently undo the choice.
          onUpdate(
            "general",
            "appearanceMode",
            resolveLucaAppearanceModeForSkin(skinId),
          );
        }}
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
              <LucaField>
              <LucaFieldLabel htmlFor="appearance-interface-font">Interface font</LucaFieldLabel>
              <LucaFieldDescription id="appearance-interface-font-description">
                Choose the typeface used throughout LucaOS.
              </LucaFieldDescription>
              <LucaSelect
                id="appearance-interface-font"
                aria-describedby="appearance-interface-font-description"
                value={
                  settings.general.fontFamily ||
                  '"Inter", system-ui, sans-serif'
                }
                onChange={(e) =>
                  onUpdate("general", "fontFamily", e.target.value)
                }
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
              </LucaSelect>
              </LucaField>
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
              <LucaSlider
                aria-label="UI scale"
                aria-valuetext={`${Math.round((settings.general.fontScale || 1.0) * 100)} percent`}
                min="80"
                max="150"
                value={Math.round((settings.general.fontScale || 1.0) * 100)}
                onChange={(e) => {
                  const val = parseInt(e.target.value) / 100;
                  onUpdate("general", "fontScale", val);
                }}
                className="mt-3"
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
              <LucaSlider
                aria-label="Background opacity"
                aria-valuetext={`${Math.round((settings.general.backgroundOpacity ?? 0.75) * 100)} percent`}
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
                className="mt-3"
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
              <LucaSlider
                aria-label="Background blur"
                aria-valuetext={`${settings.general.backgroundBlur ?? 12} pixels`}
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
                className="mt-3"
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
