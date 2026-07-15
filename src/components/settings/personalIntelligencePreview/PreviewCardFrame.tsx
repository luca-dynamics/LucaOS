import React from "react";
import {
  settingsCardStyle,
  settingsSurfaceTokens,
} from "../settingsLayoutStyles";
import PersonalIntelligencePreviewBadge, {
  type PreviewBadgeLabel,
} from "./PersonalIntelligencePreviewBadge";

interface PreviewCardFrameProps {
  title: string;
  description: string;
  badges?: PreviewBadgeLabel[];
  children: React.ReactNode;
}

export const PreviewCardFrame: React.FC<PreviewCardFrameProps> = ({
  title,
  description,
  badges = ["Preview only"],
  children,
}) => (
  <div
    className="rounded-xl border p-4"
    style={{
      ...settingsCardStyle,
    }}
  >
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p
          className="text-sm font-semibold"
          style={{ color: settingsSurfaceTokens.textPrimary }}
        >
          {title}
        </p>
        <p
          className="mt-1 text-xs leading-relaxed"
          style={{ color: settingsSurfaceTokens.textSecondary }}
        >
          {description}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <PersonalIntelligencePreviewBadge key={badge} label={badge} />
        ))}
      </div>
    </div>
    <div className="mt-4 space-y-3">{children}</div>
  </div>
);

export const PreviewField: React.FC<{
  label: string;
  value: React.ReactNode;
}> = ({ label, value }) => (
  <div className="grid gap-1 sm:grid-cols-[9rem_1fr]">
    <span
      className="text-[12px] font-medium"
      style={{ color: settingsSurfaceTokens.textTertiary }}
    >
      {label}
    </span>
    <span
      className="break-words text-xs leading-relaxed"
      style={{ color: settingsSurfaceTokens.textPrimary }}
    >
      {value}
    </span>
  </div>
);
