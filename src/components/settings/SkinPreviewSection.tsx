import React from "react";
import { getLucaSkinPreviewMetadataList } from "../../config/lucaSkinPreviewMetadata";
import { normalizeLucaSkinId, type LucaSkinId } from "../../config/lucaSkins";
import { SettingsSection } from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";
import { SkinPreviewCard } from "./SkinPreviewCard";

/**
 * Settings section for the LucaOS Skin System.
 *
 * This section renders every registered skin as a local operating environment
 * chooser.
 *
 * - The selected skin ID is persisted through Settings.
 * - App surfaces consume the selected skin at their local boundaries.
 * - No root/global appearance or theme state is mutated.
 *
 * The helper copy presents skins as the app's primary visual environment.
 */

export const SKIN_PREVIEW_HELPER_COPY =
  "Choose the visual operating environment Luca uses across the app.";

export interface SkinPreviewSectionProps {
  accentColor?: string;
  isMobile?: boolean;
  selectedSkinId?: unknown;
  onSelectedSkinChange?: (skinId: LucaSkinId) => void;
}

export const SkinPreviewSection: React.FC<SkinPreviewSectionProps> = ({
  accentColor,
  isMobile,
  selectedSkinId,
  onSelectedSkinChange,
}) => {
  // Display order is defined by the skin metadata registry.
  const skins = getLucaSkinPreviewMetadataList();
  const currentSkinId = normalizeLucaSkinId(selectedSkinId);

  return (
    <SettingsSection
      title="LucaOS Skin"
      description={SKIN_PREVIEW_HELPER_COPY}
      icon="Palette"
      accentColor={accentColor}
      isMobile={isMobile}
    >
      <p
        className="text-xs leading-relaxed"
        style={{ color: settingsSurfaceTokens.textTertiary }}
      >
        The selected skin is the active LucaOS visual environment across
        Settings, boot, onboarding, dashboard, and mobile-safe surfaces.
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {skins.map((metadata) => (
          <SkinPreviewCard
            key={metadata.id}
            metadata={metadata}
            isSelected={metadata.id === currentSkinId}
            onSelect={onSelectedSkinChange}
          />
        ))}
      </div>
    </SettingsSection>
  );
};

export default SkinPreviewSection;
