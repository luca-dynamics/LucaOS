import React from "react";
import type { HTMLMotionProps } from "framer-motion";
import { motion, useReducedMotion } from "framer-motion";

import { lucaMaterialSheetStyle } from "../../../styles/lucaMaterialSystem";
import {
  resolveLucaSheetMotion,
  type LucaSheetEdge,
} from "../../../styles/lucaFluidMotion";
import { mergeClassNames } from "./mergeClassNames";
import { lucaLayerStyle } from "./lucaOverlayFoundation";

export type LucaMotionSheetProps = HTMLMotionProps<"div"> & {
  edge?: LucaSheetEdge;
};

/** Opt-in animated sheet with symmetric, edge-aware spatial motion. */
export const LucaMotionSheet = React.forwardRef<HTMLDivElement, LucaMotionSheetProps>(
  ({ edge = "bottom", className, style, ...props }, ref) => {
    const reducedMotion = useReducedMotion() ?? false;
    const sheetMotion = resolveLucaSheetMotion(edge, reducedMotion);
    return (
      <motion.div
        ref={ref}
        initial={sheetMotion.initial}
        animate={sheetMotion.animate}
        exit={sheetMotion.exit}
        transition={sheetMotion.transition}
        className={mergeClassNames(className)}
        style={{ ...lucaMaterialSheetStyle, ...style, ...lucaLayerStyle("panel") }}
        {...props}
      />
    );
  },
);

LucaMotionSheet.displayName = "LucaMotionSheet";
