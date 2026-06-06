import React from "react";
import { settingsSurfaceTokens } from "../settingsLayoutStyles";

export type PreviewBadgeLabel =
  | "Preview only"
  | "Not saved"
  | "Not applied"
  | "No execution";

interface PersonalIntelligencePreviewBadgeProps {
  label?: PreviewBadgeLabel;
}

export const PersonalIntelligencePreviewBadge: React.FC<
  PersonalIntelligencePreviewBadgeProps
> = ({ label = "Preview only" }) => (
  <span
    className="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
    style={{
      borderColor: settingsSurfaceTokens.borderSubtle,
      backgroundColor: settingsSurfaceTokens.accentSoft,
      color: settingsSurfaceTokens.textSecondary,
    }}
  >
    {label}
  </span>
);

export default PersonalIntelligencePreviewBadge;
