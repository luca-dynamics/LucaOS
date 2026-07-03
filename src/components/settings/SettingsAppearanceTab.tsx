import React from "react";
import type { LucaSettings } from "../../services/settingsService";
import SkinPreviewSection from "./SkinPreviewSection";

/**
 * Appearance — a first-class Settings destination (see
 * docs/mockups/settings-target.html).
 *
 * Hosts the LucaOS skin system: the eight visual operating environments
 * (darks Carbon/Graphite/Onyx/Dusk · lights Pearl/Mist/Canvas · living Flow).
 * Skins change material and mood — never legibility.
 *
 * Future "Feel" rows (accent, density, reduce motion/transparency, text size)
 * land here as their settings keys are introduced; nothing is invented ahead
 * of a real backing setting.
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
    </div>
  );
};

export default SettingsAppearanceTab;
