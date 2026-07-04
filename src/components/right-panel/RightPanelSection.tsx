import React from "react";

interface RightPanelSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

// Section shell for the right-panel tabs. Flat, not a card: a bold header and
// a subtitle, separated from the previous section by a hairline and generous
// space — Claude's airy pattern, not a bordered box per section. This one
// change de-boxes ~100 sections across Now / Timeline / Memory at once.
const RightPanelSection: React.FC<RightPanelSectionProps> = ({
  title,
  subtitle,
  children,
  action,
}) => (
  <section
    className="border-t pt-5 pb-1"
    style={{
      borderColor: "var(--luca-border-subtle, var(--app-border-main))",
    }}
  >
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <div className="text-[14px] font-semibold tracking-tight text-[var(--luca-text-primary,var(--app-text-main))]">
          {title}
        </div>
        {subtitle && (
          <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--luca-text-secondary,var(--app-text-muted))]">
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
