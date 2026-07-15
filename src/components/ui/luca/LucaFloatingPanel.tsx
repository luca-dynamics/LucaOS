import React from "react";

import { lucaMaterialFloatingPanelStyle } from "../../../styles/lucaMaterialSystem";
import { LucaSurface, type LucaSurfaceProps } from "./LucaSurface";

export type LucaFloatingPanelProps = Omit<LucaSurfaceProps, "materialStyle">;

/** Detached / floating panel surface with self-contained optical capture. */
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
