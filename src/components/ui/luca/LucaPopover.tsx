import React, { useRef, type RefObject } from "react";

import { lucaMaterialPopoverStyle } from "../../../styles/lucaMaterialSystem";
import { LucaSurface, type LucaSurfaceProps } from "./LucaSurface";
import { lucaLayerStyle, useLucaDismissableLayer } from "./lucaOverlayFoundation";

export type LucaPopoverProps = Omit<LucaSurfaceProps, "materialStyle"> & {
  open?: boolean;
  onRequestClose?: () => void;
  triggerRef?: RefObject<HTMLElement>;
};

/** Popover surface — solid-leaning elevated material. */
export const LucaPopover = React.forwardRef<HTMLElement, LucaPopoverProps>(
  ({ open = true, onRequestClose, triggerRef, style, ...props }, forwardedRef) => {
    const internalRef = useRef<HTMLElement | null>(null);
    useLucaDismissableLayer({ open, containerRef: internalRef, triggerRef, onRequestClose });
    return (
      <LucaSurface
        ref={(node) => {
          internalRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        materialStyle={lucaMaterialPopoverStyle}
        data-luca-material-role="popover"
        style={{ ...style, ...lucaLayerStyle("popover") }}
        {...props}
      />
    );
  },
);

LucaPopover.displayName = "LucaPopover";
