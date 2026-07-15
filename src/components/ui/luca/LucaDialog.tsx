import React, { useRef, type RefObject } from "react";

import { lucaMaterialDialogStyle } from "../../../styles/lucaMaterialSystem";
import { LucaSurface, type LucaSurfaceProps } from "./LucaSurface";
import { lucaLayerStyle, useLucaModalLayer } from "./lucaOverlayFoundation";
import { mergeClassNames } from "./mergeClassNames";

export type LucaDialogProps = Omit<LucaSurfaceProps, "materialStyle"> & {
  modal?: boolean;
  open?: boolean;
  onRequestClose?: () => void;
  initialFocusRef?: RefObject<HTMLElement>;
  returnFocusRef?: RefObject<HTMLElement>;
  closeOnEscape?: boolean;
};

/** Dialog / modal surface — solid material with stronger framing. */
export const LucaDialog = React.forwardRef<HTMLElement, LucaDialogProps>(
  (
    {
      modal = false,
      open = true,
      onRequestClose,
      initialFocusRef,
      returnFocusRef,
      closeOnEscape,
      className,
      style,
      tabIndex,
      role,
      ...props
    },
    forwardedRef,
  ) => {
    const internalRef = useRef<HTMLElement | null>(null);
    useLucaModalLayer({
      open: modal && open,
      containerRef: internalRef,
      initialFocusRef,
      returnFocusRef,
      onRequestClose,
      closeOnEscape,
    });
    return (
      <LucaSurface
        ref={(node) => {
          internalRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        materialStyle={lucaMaterialDialogStyle}
        {...props}
        data-luca-material-role="dialog"
        role={modal ? "dialog" : role}
        aria-modal={modal || undefined}
        tabIndex={modal ? -1 : tabIndex}
        className={mergeClassNames("outline-none", className)}
        style={{ ...style, ...(modal ? lucaLayerStyle("modal") : {}) }}
      />
    );
  },
);

LucaDialog.displayName = "LucaDialog";

export const LucaDialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={mergeClassNames("text-base font-semibold", className)} {...props} />
);

export const LucaDialogDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={mergeClassNames("text-sm text-[var(--luca-text-secondary,var(--app-text-muted))]", className)} {...props} />
);
