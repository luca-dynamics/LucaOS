import React, { useRef, type RefObject } from "react";

import { lucaMaterialSheetStyle } from "../../../styles/lucaMaterialSystem";
import { LucaDialogDescription, LucaDialogTitle } from "./LucaDialog";
import { LucaSurface, type LucaSurfaceProps } from "./LucaSurface";
import { lucaLayerStyle, useLucaModalLayer } from "./lucaOverlayFoundation";
import { mergeClassNames } from "./mergeClassNames";

export type LucaSheetProps = Omit<LucaSurfaceProps, "materialStyle"> & {
  modal?: boolean;
  open?: boolean;
  onRequestClose?: () => void;
  initialFocusRef?: RefObject<HTMLElement>;
  returnFocusRef?: RefObject<HTMLElement>;
};

/** Bottom/side sheet surface. */
export const LucaSheet = React.forwardRef<HTMLElement, LucaSheetProps>(
  ({ modal = false, open = true, onRequestClose, initialFocusRef, returnFocusRef, className, style, tabIndex, role, ...props }, forwardedRef) => {
    const internalRef = useRef<HTMLElement | null>(null);
    useLucaModalLayer({
      open: modal && open,
      containerRef: internalRef,
      initialFocusRef,
      returnFocusRef,
      onRequestClose,
    });
    return (
      <LucaSurface
        ref={(node) => {
          internalRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        materialStyle={lucaMaterialSheetStyle}
        {...props}
        data-luca-material-role="sheet"
        role={modal ? "dialog" : role}
        aria-modal={modal || undefined}
        tabIndex={modal ? -1 : tabIndex}
        className={mergeClassNames("outline-none", className)}
        style={{ ...style, ...(modal ? lucaLayerStyle("modal") : {}) }}
      />
    );
  },
);

LucaSheet.displayName = "LucaSheet";

export const LucaSheetTitle = LucaDialogTitle;
export const LucaSheetDescription = LucaDialogDescription;
