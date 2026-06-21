import React from "react";

import { lucaMaterialSidebarStyle } from "../../../styles/lucaMaterialSystem";
import { LucaSurface, type LucaSurfaceProps } from "./LucaSurface";

export type LucaSidebarProps = Omit<LucaSurfaceProps, "materialStyle">;

/** Sidebar / rail surface. */
export const LucaSidebar = React.forwardRef<HTMLElement, LucaSidebarProps>(
  (props, ref) => (
    <LucaSurface ref={ref} materialStyle={lucaMaterialSidebarStyle} {...props} />
  ),
);

LucaSidebar.displayName = "LucaSidebar";
