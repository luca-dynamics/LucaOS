import React from "react";
import type { HTMLMotionProps } from "framer-motion";
import { motion, useReducedMotion } from "framer-motion";

import { resolveLucaPopoverMotion } from "../../../styles/lucaFluidMotion";
import { lucaMaterialPopoverStyle } from "../../../styles/lucaMaterialSystem";
import { mergeClassNames } from "./mergeClassNames";

export type LucaMotionPopoverProps = HTMLMotionProps<"div"> & {
  /** Normalized trigger origin within the popover: 0=start, 1=end. */
  originX?: number;
  originY?: number;
};

/** Opt-in popover that materializes from the triggering control's direction. */
export const LucaMotionPopover = React.forwardRef<
  HTMLDivElement,
  LucaMotionPopoverProps
>(({ originX = 0.5, originY = 0, className, style, ...props }, ref) => {
  const reducedMotion = useReducedMotion() ?? false;
  const popoverMotion = resolveLucaPopoverMotion({ originX, originY, reducedMotion });
  return (
    <motion.div
      ref={ref}
      initial={popoverMotion.initial}
      animate={popoverMotion.animate}
      exit={popoverMotion.exit}
      transition={popoverMotion.transition}
      className={mergeClassNames(className)}
      style={{ ...lucaMaterialPopoverStyle, ...popoverMotion.style, ...style }}
      {...props}
    />
  );
});

LucaMotionPopover.displayName = "LucaMotionPopover";
