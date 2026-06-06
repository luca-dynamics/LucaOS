import React from "react";
import type { LearningLogEntry } from "../../../personal-intelligence";
import { PreviewCardFrame, PreviewField } from "./PreviewCardFrame";

export const LearningEventPreviewCard: React.FC<{
  event: LearningLogEntry;
}> = ({ event }) => (
  <PreviewCardFrame
    title="Learning Event"
    description="Learning preview only — does not update memory, skills, prompts, or routing."
    badges={["Preview only", "Not saved", "Not applied"]}
  >
    <PreviewField label="Input summary" value={event.inputSummary} />
    <PreviewField label="Proposed learning" value={event.actionTaken} />
    <PreviewField label="Outcome" value={event.outcome} />
    <PreviewField label="Verification" value={event.verificationStatus} />
    <PreviewField
      label="Next adjustment"
      value={event.nextAdjustment ?? "None proposed"}
    />
  </PreviewCardFrame>
);
