import React from "react";
import type { MissionProfile } from "../../../personal-intelligence";
import { PreviewCardFrame, PreviewField } from "./PreviewCardFrame";

export const MissionProfilePreviewCard: React.FC<{
  mission: MissionProfile;
}> = ({ mission }) => (
  <PreviewCardFrame
    title="Mission profile"
    description="Draft context preview only; no mission is activated."
    badges={["Preview only", "Not saved", "No execution"]}
  >
    <PreviewField label="Mission" value={mission.title} />
    <PreviewField label="Goals" value={mission.goals.join(", ")} />
    <PreviewField label="Operating mode" value={mission.operatingMode} />
    <PreviewField label="Status" value={mission.status} />
  </PreviewCardFrame>
);
