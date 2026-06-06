import React from "react";
import type { SkillManifest } from "../../../personal-intelligence";
import { PreviewCardFrame, PreviewField } from "./PreviewCardFrame";

export const SkillManifestPreviewCard: React.FC<{
  manifest: SkillManifest;
}> = ({ manifest }) => (
  <PreviewCardFrame
    title="Skill Manifest / Registry"
    description="Manifest preview only — entrypoint not loaded, no execution."
    badges={["Preview only", "No execution"]}
  >
    <PreviewField
      label="Name"
      value={`${manifest.name} v${manifest.version}`}
    />
    <PreviewField label="Category" value={manifest.category} />
    <PreviewField
      label="Permissions"
      value={
        manifest.permissions.map((permission) => permission.id).join(", ") ||
        "none"
      }
    />
    <PreviewField
      label="Memory policy"
      value={`read: ${manifest.memoryPolicy.read.join(", ") || "none"}; write: ${manifest.memoryPolicy.write.join(", ") || "none"}`}
    />
    <PreviewField
      label="Workflows"
      value={
        manifest.workflows.map((workflow) => workflow.id).join(", ") || "none"
      }
    />
    <PreviewField
      label="Tests"
      value={manifest.tests.map((test) => test.id).join(", ") || "none"}
    />
    <PreviewField label="Entrypoint" value="entrypoint not loaded" />
  </PreviewCardFrame>
);
