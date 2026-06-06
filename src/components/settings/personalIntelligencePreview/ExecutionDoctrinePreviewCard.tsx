import React from "react";
import type { createExecutionDoctrinePreview } from "../../../personal-intelligence";
import { PreviewCardFrame, PreviewField } from "./PreviewCardFrame";

type DoctrinePreview = ReturnType<typeof createExecutionDoctrinePreview>;

const titleCase = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

export const ExecutionDoctrinePreviewCard: React.FC<{
  doctrine: DoctrinePreview;
}> = ({ doctrine }) => (
  <PreviewCardFrame
    title="Execution Doctrine / Trace"
    description="Sense → Understand → Plan → Approve → Act → Verify → Learn. Approve and Act are evidence-only preview stages."
    badges={["Preview only", "No execution"]}
  >
    {doctrine.stages.map((stage) => (
      <PreviewField
        key={stage.stage}
        label={titleCase(stage.stage)}
        value={`${stage.purpose}${stage.stage === "approve" || stage.stage === "act" ? " Evidence only." : ""}`}
      />
    ))}
  </PreviewCardFrame>
);
