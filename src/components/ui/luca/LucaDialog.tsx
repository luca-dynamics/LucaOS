import React, { useRef, type RefObject } from "react";

import { lucaMaterialDialogStyle } from "../../../styles/lucaMaterialSystem";
import { LucaSurface, type LucaSurfaceProps } from "./LucaSurface";
import { lucaLayerStyle, useLucaModalLayer } from "./lucaOverlayFoundation";
import { mergeClassNames } from "./mergeClassNames";

export type LucaDialogProps = Omit<LucaSurfaceProps, "materialStyle"> & {
  modal?: boolean;
  modalRole?: "dialog" | "alertdialog";
  open?: boolean;
  onRequestClose?: () => void;
  initialFocusRef?: RefObject<HTMLElement>;
  returnFocusRef?: RefObject<HTMLElement>;
  closeOnEscape?: boolean;
};

/** Dialog / modal surface with solid material and stronger framing. */
export const LucaDialog = React.forwardRef<HTMLElement, LucaDialogProps>(
  (
    {
      modal = false,
      modalRole = "dialog",
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
        role={modal ? modalRole : role}
        aria-modal={modal || undefined}
        tabIndex={modal ? -1 : tabIndex}
        className={mergeClassNames(
          "outline-none",
          modal && "max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)]",
          className,
        )}
        style={{ ...style, ...(modal ? lucaLayerStyle("modal") : {}) }}
      />
    );
  },
);

LucaDialog.displayName = "LucaDialog";

export interface LucaDialogOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  onRequestClose?: () => void;
  closeOnBackdrop?: boolean;
  layer?: Parameters<typeof lucaLayerStyle>[0];
}

/** Full-viewport modal frame with governed stacking and backdrop dismissal. */
export const LucaDialogOverlay = React.forwardRef<HTMLDivElement, LucaDialogOverlayProps>(
  (
    {
      onRequestClose,
      closeOnBackdrop = true,
      layer = "modal",
      className,
      style,
      onPointerDown,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      {...props}
      data-luca-material-role="overlay"
      className={mergeClassNames("fixed inset-0 flex items-center justify-center overflow-y-auto p-4", className)}
      style={{ ...lucaLayerStyle(layer), ...style }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (
          !event.defaultPrevented &&
          closeOnBackdrop &&
          event.target === event.currentTarget
        ) {
          onRequestClose?.();
        }
      }}
    />
  ),
);

LucaDialogOverlay.displayName = "LucaDialogOverlay";

export const LucaDialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={mergeClassNames("text-base font-semibold", className)} {...props} />
);

export const LucaDialogDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={mergeClassNames("text-sm text-[var(--luca-text-secondary,var(--app-text-muted))]", className)} {...props} />
);
