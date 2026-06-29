import React from "react";
import { getLucaSkinPreviewMetadataList } from "../../config/lucaSkinPreviewMetadata";
import { normalizeLucaSkinId, type LucaSkinId } from "../../config/lucaSkins";
import { SettingsSection } from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";
import { SkinPreviewCard } from "./SkinPreviewCard";

/**
 * Settings section for the LucaOS Skin System.
 *
 * This section renders the four launch skins (Pearl, Carbon, Flow, Canvas) as
 * local-only "operating environment samples".
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
  // Launch order is defined by the metadata list (Pearl, Carbon, Flow, Canvas).
  const skins = getLucaSkinPreviewMetadataList();
  const currentSkinId = normalizeLucaSkinId(selectedSkinId);

  return (
    <SettingsSection
      title="LucaOS Skins"
      description={SKIN_PREVIEW_HELPER_COPY}
      icon="Palette"
      accentColor={accentColor}
      isMobile={isMobile}
    >
      <p
        className="text-xs leading-relaxed"
        style={{ color: settingsSurfaceTokens.textTertiary }}
      >
        Skins are LucaOS visual operating environments. Choose the one that
        best fits how you want the app to feel while you work.
      </p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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
