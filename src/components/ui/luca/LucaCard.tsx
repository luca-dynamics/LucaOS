import React from "react";

import { lucaMaterialCardStyle } from "../../../styles/lucaMaterialSystem";
import { LucaSurface, type LucaSurfaceProps } from "./LucaSurface";
import { mergeClassNames } from "./mergeClassNames";

export type LucaCardProps = Omit<LucaSurfaceProps, "materialStyle">;

export const LucaCard = React.forwardRef<HTMLElement, LucaCardProps>(
  ({ className, ...props }, ref) => (
    <LucaSurface
      ref={ref}
      data-luca-material-role="card"
      materialStyle={lucaMaterialCardStyle}
      className={mergeClassNames("rounded-xl border", className)}
      {...props}
    />
  ),
);
LucaCard.displayName = "LucaCard";

export const LucaCardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={mergeClassNames("flex items-start justify-between gap-4 p-4 pb-2", className)} {...props} />
);
export const LucaCardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={mergeClassNames("text-sm font-semibold", className)} {...props} />
);
export const LucaCardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={mergeClassNames("mt-1 text-xs text-[var(--luca-text-secondary,var(--app-text-muted))]", className)} {...props} />
);
export const LucaCardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={mergeClassNames("p-4", className)} {...props} />
);
export const LucaCardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={mergeClassNames("flex items-center justify-end gap-2 p-4 pt-2", className)} {...props} />
);
