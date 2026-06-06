import React from "react";
import type { IntegrationReadinessPreview } from "../../../personal-intelligence";
import { PreviewCardFrame, PreviewField } from "./PreviewCardFrame";

export const IntegrationReadinessPreviewCard: React.FC<{
  readiness: IntegrationReadinessPreview;
}> = ({ readiness }) => (
  <PreviewCardFrame
    title="Integration Readiness"
    description="Live wiring remains blocked until each boundary receives separate review and governed adapters."
    badges={["Preview only", "Not applied", "No execution"]}
  >
    {readiness.blockers.map((blocker) => (
      <PreviewField
        key={blocker.boundary}
        label={blocker.label}
        value={blocker.reason}
      />
    ))}
  </PreviewCardFrame>
);
