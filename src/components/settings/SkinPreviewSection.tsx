import React from "react";
import { getLucaSkinPreviewMetadataList } from "../../config/lucaSkinPreviewMetadata";
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
 * - No selected skin is persisted, and no skin-picker state exists.
 * - There are no apply/save controls and no settings updates are dispatched.
 * - No active appearance/theme state is mutated.
 *
 * The helper copy makes explicit that previews are not active yet.
 */

export const SKIN_PREVIEW_HELPER_COPY =
  "Preview the visual operating environments for LucaOS. Skins are not active yet; this preview does not change your current interface.";

export interface SkinPreviewSectionProps {
  accentColor?: string;
  isMobile?: boolean;
}

export const SkinPreviewSection: React.FC<SkinPreviewSectionProps> = ({
  accentColor,
  isMobile,
}) => {
  // Launch order is defined by the metadata list (Pearl, Carbon, Flow, Canvas).
  const skins = getLucaSkinPreviewMetadataList();

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
        Skins are not decorations; they are the visual operating environments for
        an AI-native OS. Selecting a skin is not available yet.
      </p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {skins.map((metadata) => (
          <SkinPreviewCard key={metadata.id} metadata={metadata} />
        ))}
      </div>
    </SettingsSection>
  );
};

export default SkinPreviewSection;
