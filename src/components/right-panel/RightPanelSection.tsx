import React from "react";

import { lucaMaterialCardStyle } from "../../styles/lucaMaterialSystem";

interface RightPanelSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

// Section shell for the right-panel tabs (panel-interiors-target). The title
// is a calm sentence-case label, not an uppercase-tracked shout — this one
// change quiets ~100 sections across Now / Timeline / Memory at once.
const RightPanelSection: React.FC<RightPanelSectionProps> = ({ title, subtitle, children, action }) => (
  <section className="rounded-2xl border p-3" style={lucaMaterialCardStyle}>
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <div className="text-[12px] font-semibold tracking-tight text-[var(--luca-text-primary,var(--app-text-main))]">
          {title}
        </div>
        {subtitle && (
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--luca-text-tertiary,var(--app-text-muted))]">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
    {children}
  </section>
);

export default RightPanelSection;
