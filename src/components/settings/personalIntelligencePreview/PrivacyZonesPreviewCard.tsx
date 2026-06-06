import React from "react";
import type { createPrivacyZonesPreview } from "../../../personal-intelligence";
import { PreviewCardFrame, PreviewField } from "./PreviewCardFrame";

type PrivacyZonesPreview = ReturnType<typeof createPrivacyZonesPreview>;

export const PrivacyZonesPreviewCard: React.FC<{
  zones: PrivacyZonesPreview;
}> = ({ zones }) => (
  <PreviewCardFrame
    title="Privacy Zones"
    description="Sensitive zones remain blocked until a future governed adapter authorizes access."
    badges={["Preview only", "Not applied"]}
  >
    {zones.map(({ zone, sensitive, blocked }) => (
      <PreviewField
        key={zone}
        label={zone}
        value={
          sensitive && blocked ? "Sensitive — blocked" : "Preview metadata only"
        }
      />
    ))}
  </PreviewCardFrame>
);
