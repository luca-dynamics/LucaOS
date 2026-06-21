import React from "react";

import { lucaMaterialResizableHandleStyle } from "../../../styles/lucaMaterialSystem";
import { LucaSurface, type LucaSurfaceProps } from "./LucaSurface";

export type LucaResizableHandleProps = Omit<LucaSurfaceProps, "materialStyle">;

/**
 * Resizable handle accent surface. Presentational only — drag/resize behavior
 * stays with the host component.
 */
export const LucaResizableHandle = React.forwardRef<
  HTMLElement,
  LucaResizableHandleProps
>((props, ref) => (
  <LucaSurface
    ref={ref}
    materialStyle={lucaMaterialResizableHandleStyle}
    {...props}
  />
));

LucaResizableHandle.displayName = "LucaResizableHandle";
