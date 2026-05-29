import React, { useState } from "react";
import { Icon } from "../ui/Icon";

interface CollapsibleSectionProps {
  title: string;
  /** Optional leading icon name (rendered via the shared Icon component). */
  icon?: string;
  /** Collapsed on first render when true. Local state only — not persisted. */
  defaultCollapsed?: boolean;
  /** Optional compact summary shown on the header row when collapsed. */
  collapsedHint?: React.ReactNode;
  isLight?: boolean;
  children: React.ReactNode;
}

/**
 * Lightweight collapsible wrapper for left-rail sections that can list a lot of
 * detail (e.g. Runtime Status, Devices). Matches the existing tool-group
 * collapse styling (uppercase mono label + AltArrow chevron). Keeps rendering
 * cheap and side-effect free; children only mount when expanded.
 */
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  defaultCollapsed = false,
  collapsedHint,
  isLight,
  children,
}) => {
  const [open, setOpen] = useState(!defaultCollapsed);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-2 text-[var(--app-text-main)] group/collapse ${
          isLight ? "opacity-90" : "opacity-70"
        }`}
      >
        <span className="flex items-center gap-3 min-w-0">
          {icon && <Icon name={icon} size={18} variant="BoldDuotone" />}
          <h2 className="font-black tracking-widest text-xs uppercase truncate">
            {title}
          </h2>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {!open && collapsedHint}
          <Icon
            name={open ? "AltArrowUp" : "AltArrowDown"}
            size={14}
            variant="BoldDuotone"
            className="opacity-60 group-hover/collapse:opacity-100 transition-opacity"
          />
        </span>
      </button>

      {open && <div className="animate-in fade-in duration-300">{children}</div>}
    </div>
  );
};

export default CollapsibleSection;
