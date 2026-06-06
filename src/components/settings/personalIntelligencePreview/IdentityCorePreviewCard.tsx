import React from "react";
import type { IdentityCore } from "../../../personal-intelligence";
import { PreviewCardFrame, PreviewField } from "./PreviewCardFrame";

export const IdentityCorePreviewCard: React.FC<{ identity: IdentityCore }> = ({
  identity,
}) => (
  <PreviewCardFrame
    title="Identity Core + Luca personality"
    description="Preview only — not saved or applied."
    badges={["Preview only", "Not saved", "Not applied"]}
  >
    <PreviewField
      label="Communication style"
      value={identity.communicationStyle}
    />
    <PreviewField
      label="Luca personality"
      value={`${identity.lucaPersonality.tone}; traits: ${identity.lucaPersonality.traits.join(", ") || "none"}; boundaries: ${identity.lucaPersonality.boundaries.join(", ") || "none"}`}
    />
    <PreviewField
      label="Active projects"
      value={identity.activeProjects.join(", ") || "No projects proposed"}
    />
    <PreviewField
      label="Preferred models"
      value={
        identity.preferredModels.join(", ") || "No model preferences proposed"
      }
    />
    <PreviewField
      label="Privacy defaults"
      value={
        Object.entries(identity.privacyDefaults)
          .map(([zone, access]) => `${zone}: ${access}`)
          .join(", ") || "Default deny"
      }
    />
  </PreviewCardFrame>
);
