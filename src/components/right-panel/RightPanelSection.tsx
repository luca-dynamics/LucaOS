import React from "react";

import { lucaMaterialCardStyle } from "../../styles/lucaMaterialSystem";

interface RightPanelSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

const RightPanelSection: React.FC<RightPanelSectionProps> = ({ title, subtitle, children, action }) => (
  <section className="rounded-2xl border p-3" style={lucaMaterialCardStyle}>
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--app-text-main)]">
          {title}
        </div>
        {subtitle && (
          <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">
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
