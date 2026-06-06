import React from "react";
import type { MemoryPreview } from "../../../personal-intelligence";
import { PreviewCardFrame, PreviewField } from "./PreviewCardFrame";

export const MemoryItemPreviewCard: React.FC<{ preview: MemoryPreview }> = ({
  preview,
}) => (
  <PreviewCardFrame
    title="Memory / Knowledge Item"
    description="Serialization preview only — no file write."
    badges={["Preview only", "Not saved"]}
  >
    <PreviewField label="Kind" value={preview.item.kind} />
    <PreviewField label="Title" value={preview.item.title} />
    <PreviewField label="Source" value={preview.item.source} />
    <PreviewField
      label="Confidence"
      value={`${Math.round(preview.item.confidence * 100)}%`}
    />
    <PreviewField label="Privacy zone" value={preview.item.privacyZone} />
    <PreviewField label="Tags" value={preview.item.tags.join(", ") || "none"} />
    <PreviewField label="Proposed path" value={preview.proposedPath} />
  </PreviewCardFrame>
);
