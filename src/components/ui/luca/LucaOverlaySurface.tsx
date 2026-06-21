import React from "react";

import { lucaMaterialOverlayStyle } from "../../../styles/lucaMaterialSystem";
import { LucaSurface, type LucaSurfaceProps } from "./LucaSurface";

export type LucaOverlaySurfaceProps = Omit<LucaSurfaceProps, "materialStyle">;

/** Full-bleed overlay chrome (scrims, reboot/transition surfaces). */
export const LucaOverlaySurface = React.forwardRef<
  HTMLElement,
  LucaOverlaySurfaceProps
>((props, ref) => (
  <LucaSurface ref={ref} materialStyle={lucaMaterialOverlayStyle} {...props} />
));

LucaOverlaySurface.displayName = "LucaOverlaySurface";
