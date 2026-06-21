import React from "react";

import { lucaMaterialFloatingPanelStyle } from "../../../styles/lucaMaterialSystem";
import { LucaSurface, type LucaSurfaceProps } from "./LucaSurface";

export type LucaFloatingPanelProps = Omit<LucaSurfaceProps, "materialStyle">;

/**
 * Detached / floating panel surface. Pair with a blur utility (or supply blur
 * via `style`) when used outside a `.glass-panel` context.
 */
export const LucaFloatingPanel = React.forwardRef<
  HTMLElement,
  LucaFloatingPanelProps
>((props, ref) => (
  <LucaSurface
    ref={ref}
    materialStyle={lucaMaterialFloatingPanelStyle}
    {...props}
  />
));

LucaFloatingPanel.displayName = "LucaFloatingPanel";
