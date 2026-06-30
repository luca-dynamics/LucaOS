import React from "react";
import type { CSSProperties, ElementType, HTMLAttributes } from "react";

import { mergeClassNames } from "./mergeClassNames";

export interface LucaSurfaceOwnProps {
  /** Resolved material role style from `lucaMaterialSystem`. */
  materialStyle: CSSProperties;
  /** Optional element to render instead of a `div` (e.g. `section`, `aside`). */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

export type LucaSurfaceProps = LucaSurfaceOwnProps &
  Omit<HTMLAttributes<HTMLElement>, "style">;

/**
 * Shared base for all Luca panel primitives. It applies a material role from
 * the Luca Material Engine, merges className safely, and lets caller `style`
 * win over the material defaults so per-instance overrides stay possible.
 *
 * It is intentionally presentational only — no business logic, no hardcoded
 * colors — and forwards every remaining prop (including accessibility
 * attributes and event handlers) to the rendered element.
 */
export const LucaSurface = React.forwardRef<HTMLElement, LucaSurfaceProps>(
  ({ materialStyle, as, className, style, ...rest }, ref) => {
    const Component = (as ?? "div") as any;
    return (
      <Component
        ref={ref}
        className={mergeClassNames(className)}
        style={{ ...materialStyle, ...style }}
        {...rest}
      />
    );
  },
);

LucaSurface.displayName = "LucaSurface";
