import React from "react";

import { lucaMaterialPanelStyle } from "../../../styles/lucaMaterialSystem";
import { LucaSurface, type LucaSurfaceProps } from "./LucaSurface";

export type LucaPanelProps = Omit<LucaSurfaceProps, "materialStyle">;

/** Default glassy panel surface. */
export const LucaPanel = React.forwardRef<HTMLElement, LucaPanelProps>(
  (props, ref) => (
    <LucaSurface ref={ref} materialStyle={lucaMaterialPanelStyle} {...props} />
  ),
);

LucaPanel.displayName = "LucaPanel";
