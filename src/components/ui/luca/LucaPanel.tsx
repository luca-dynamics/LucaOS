import React from "react";

import { lucaMaterialPanelStyle } from "../../../styles/lucaMaterialSystem";
import { LucaSurface, type LucaSurfaceProps } from "./LucaSurface";
import { mergeClassNames } from "./mergeClassNames";

export type LucaPanelProps = Omit<LucaSurfaceProps, "materialStyle">;

/** Default glassy panel surface. */
export const LucaPanel = React.forwardRef<HTMLElement, LucaPanelProps>(
  (props, ref) => (
    <LucaSurface ref={ref} materialStyle={lucaMaterialPanelStyle} {...props} />
  ),
);

LucaPanel.displayName = "LucaPanel";

export const LucaPanelHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <header className={mergeClassNames("flex items-center justify-between gap-4 border-b px-4 py-3", className)} {...props} />
);
export const LucaPanelTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={mergeClassNames("truncate text-sm font-semibold", className)} {...props} />
);
export const LucaPanelDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={mergeClassNames("text-xs text-[var(--luca-text-secondary,var(--app-text-muted))]", className)} {...props} />
);
export const LucaPanelActions = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={mergeClassNames("flex shrink-0 items-center gap-2", className)} {...props} />
);
export const LucaPanelContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={mergeClassNames("min-h-0 flex-1", className)} {...props} />
);
