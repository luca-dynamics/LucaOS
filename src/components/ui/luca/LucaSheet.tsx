import React from "react";

import { lucaMaterialSheetStyle } from "../../../styles/lucaMaterialSystem";
import { LucaSurface, type LucaSurfaceProps } from "./LucaSurface";

export type LucaSheetProps = Omit<LucaSurfaceProps, "materialStyle">;

/** Bottom/side sheet surface. */
export const LucaSheet = React.forwardRef<HTMLElement, LucaSheetProps>(
  (props, ref) => (
    <LucaSurface ref={ref} materialStyle={lucaMaterialSheetStyle} {...props} />
  ),
);

LucaSheet.displayName = "LucaSheet";
