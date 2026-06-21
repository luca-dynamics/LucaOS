import React from "react";

import { lucaMaterialPopoverStyle } from "../../../styles/lucaMaterialSystem";
import { LucaSurface, type LucaSurfaceProps } from "./LucaSurface";

export type LucaPopoverProps = Omit<LucaSurfaceProps, "materialStyle">;

/** Popover surface — solid-leaning elevated material. */
export const LucaPopover = React.forwardRef<HTMLElement, LucaPopoverProps>(
  (props, ref) => (
    <LucaSurface ref={ref} materialStyle={lucaMaterialPopoverStyle} {...props} />
  ),
);

LucaPopover.displayName = "LucaPopover";
