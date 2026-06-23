import React from "react";
import { getLucaSkinPreviewMetadataList } from "../../config/lucaSkinPreviewMetadata";
import { normalizeLucaSkinId, type LucaSkinId } from "../../config/lucaSkins";
import { SettingsSection } from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";
import { SkinPreviewCard } from "./SkinPreviewCard";

/**
 * Preview-only Settings section for the LucaOS Skin System.
 *
 * This section renders the four launch skins (Pearl, Carbon, Flow, Canvas) as
 * local-only "operating environment samples". It is intentionally inert:
 *
 * - No skin is applied globally.
 * - The selected skin ID can be persisted as a preference only.
 * - There are no apply/save controls.
 * - No active appearance/theme state is mutated.
 *
 * The helper copy makes explicit that previews are not active yet.
 */

export const SKIN_PREVIEW_HELPER_COPY =
  "Choose the visual operating environment LucaOS should use when skin application is enabled. For now, this saves your preference only and does not change the live interface.";

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
      eyebrow="Preview only"
    >
      <p
        className="text-xs leading-relaxed"
        style={{ color: settingsSurfaceTokens.textTertiary }}
      >
        Skins are not decorations; they are the visual operating environments
        for an AI-native OS. Your selection is saved as a preference only and
        does not change the live interface yet.
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
