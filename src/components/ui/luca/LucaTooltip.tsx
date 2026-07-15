import React, { cloneElement, useId, useState } from "react";
import { createPortal } from "react-dom";

import { lucaMaterialPopoverStyle } from "../../../styles/lucaMaterialSystem";
import { lucaLayerStyle } from "./lucaOverlayFoundation";

export interface LucaTooltipProps {
  label: string;
  children: React.ReactElement;
}

export function LucaTooltip({ label, children }: LucaTooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const show = (element: HTMLElement) => {
    setAnchor(element.getBoundingClientRect());
    setOpen(true);
  };
  const trigger = cloneElement(children, {
    "aria-describedby": open ? id : undefined,
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
      children.props.onMouseEnter?.(event);
      show(event.currentTarget);
    },
    onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
      children.props.onMouseLeave?.(event);
      setOpen(false);
    },
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      children.props.onFocus?.(event);
      show(event.currentTarget);
    },
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      children.props.onBlur?.(event);
      setOpen(false);
    },
  });
  return (
    <>
      {trigger}
      {open && anchor && typeof document !== "undefined" && createPortal(
        <div
          id={id}
          role="tooltip"
          className="pointer-events-none fixed max-w-64 rounded-md border px-2.5 py-1.5 text-xs"
          style={{
            ...lucaMaterialPopoverStyle,
            ...lucaLayerStyle("popover"),
            left: anchor.left + anchor.width / 2,
            top: anchor.top - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          {label}
        </div>,
        document.body,
      )}
    </>
  );
}
