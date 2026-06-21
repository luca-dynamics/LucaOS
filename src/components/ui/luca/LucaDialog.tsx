import React from "react";

import { lucaMaterialDialogStyle } from "../../../styles/lucaMaterialSystem";
import { LucaSurface, type LucaSurfaceProps } from "./LucaSurface";

export type LucaDialogProps = Omit<LucaSurfaceProps, "materialStyle">;

/** Dialog / modal surface — solid material with stronger framing. */
export const LucaDialog = React.forwardRef<HTMLElement, LucaDialogProps>(
  (props, ref) => (
    <LucaSurface ref={ref} materialStyle={lucaMaterialDialogStyle} {...props} />
  ),
);

LucaDialog.displayName = "LucaDialog";
