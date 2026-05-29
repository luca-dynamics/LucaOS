import React from "react";

interface RightPanelSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

const RightPanelSection: React.FC<RightPanelSectionProps> = ({ title, subtitle, children, action }) => (
  <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 shadow-[0_0_24px_rgba(0,0,0,0.18)]">
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
