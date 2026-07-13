import React from "react";
import { settingsSurfaceTokens } from "../settingsLayoutStyles";

export type PreviewBadgeLabel =
  | "Preview only"
  | "Not saved"
  | "Not applied"
  | "No execution"
  | "From your profile"
  | "Read-only";

interface PersonalIntelligencePreviewBadgeProps {
  label?: PreviewBadgeLabel;
}

export const PersonalIntelligencePreviewBadge: React.FC<
  PersonalIntelligencePreviewBadgeProps
> = ({ label = "Preview only" }) => (
  <span
    className="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium"
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
