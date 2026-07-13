import React from "react";
import type { createPrivacyZonesPreview } from "../../../personal-intelligence";
import { PreviewCardFrame, PreviewField } from "./PreviewCardFrame";

type PrivacyZonesPreview = ReturnType<typeof createPrivacyZonesPreview>;

export const PrivacyZonesPreviewCard: React.FC<{
  zones: PrivacyZonesPreview;
}> = ({ zones }) => (
  <PreviewCardFrame
    title="Privacy Zones"
    description="Sensitive zones stay blocked; only the governed memory approval flow below can authorize writes."
    badges={["Preview only", "Not applied"]}
  >
    {zones.map(({ zone, sensitive, blocked }) => (
      <PreviewField
        key={zone}
        label={zone.charAt(0).toUpperCase() + zone.slice(1).toLowerCase()}
        value={
          sensitive && blocked ? "Sensitive — blocked" : "Preview metadata only"
        }
      />
    ))}
  </PreviewCardFrame>
);
