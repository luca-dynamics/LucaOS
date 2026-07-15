import React, { useRef, type RefObject } from "react";
import type { HTMLMotionProps } from "framer-motion";
import { motion, useReducedMotion } from "framer-motion";

import { resolveLucaPopoverMotion } from "../../../styles/lucaFluidMotion";
import { lucaMaterialPopoverStyle } from "../../../styles/lucaMaterialSystem";
import { mergeClassNames } from "./mergeClassNames";
import { lucaLayerStyle, useLucaDismissableLayer } from "./lucaOverlayFoundation";

export type LucaMotionPopoverProps = HTMLMotionProps<"div"> & {
  /** Normalized trigger origin within the popover: 0=start, 1=end. */
  originX?: number;
  originY?: number;
  open?: boolean;
  onRequestClose?: () => void;
  triggerRef?: RefObject<HTMLElement>;
};

/** Opt-in popover that materializes from the triggering control's direction. */
export const LucaMotionPopover = React.forwardRef<
  HTMLDivElement,
  LucaMotionPopoverProps
>(({ originX = 0.5, originY = 0, open = true, onRequestClose, triggerRef, className, style, ...props }, forwardedRef) => {
  const reducedMotion = useReducedMotion() ?? false;
  const popoverMotion = resolveLucaPopoverMotion({ originX, originY, reducedMotion });
  const internalRef = useRef<HTMLDivElement>(null);
  useLucaDismissableLayer({ open, containerRef: internalRef, triggerRef, onRequestClose });
  return (
    <motion.div
      ref={(node) => {
        internalRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      initial={popoverMotion.initial}
      animate={popoverMotion.animate}
      exit={popoverMotion.exit}
      transition={popoverMotion.transition}
      className={mergeClassNames(className)}
      style={{ ...lucaMaterialPopoverStyle, ...popoverMotion.style, ...style, ...lucaLayerStyle("popover") }}
      {...props}
    />
  );
});

LucaMotionPopover.displayName = "LucaMotionPopover";
