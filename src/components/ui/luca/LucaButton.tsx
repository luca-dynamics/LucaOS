import React from "react";

import {
  lucaMaterialControlActiveStyle,
  lucaMaterialControlStyle,
} from "../../../styles/lucaMaterialSystem";
import { mergeClassNames } from "./mergeClassNames";

export type LucaButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type LucaButtonSize = "sm" | "md" | "lg" | "icon";

export interface LucaButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: LucaButtonVariant;
  size?: LucaButtonSize;
}

const sizeClasses: Record<LucaButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
  icon: "size-8 p-0",
};

export const LucaButton = React.forwardRef<HTMLButtonElement, LucaButtonProps>(
  ({ className, style, type = "button", variant = "secondary", size = "md", ...props }, ref) => {
    const materialStyle =
      variant === "primary" ? lucaMaterialControlActiveStyle : lucaMaterialControlStyle;
    return (
      <button
        ref={ref}
        type={type}
        data-luca-material-role={variant === "primary" ? "control-active" : "control"}
        data-variant={variant}
        className={mergeClassNames(
          "luca-shell-control luca-material-pressable inline-flex items-center justify-center gap-2 rounded-lg border font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--luca-accent-primary,var(--app-core-hex))] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50 [&_[data-icon]]:size-4",
          sizeClasses[size],
          variant === "ghost" && "border-transparent bg-transparent shadow-none",
          variant === "danger" && "text-[var(--luca-danger,#d95454)]",
          className,
        )}
        style={{ ...materialStyle, ...style }}
        {...props}
      />
    );
  },
);

LucaButton.displayName = "LucaButton";

export interface LucaIconButtonProps
  extends Omit<LucaButtonProps, "size" | "children"> {
  "aria-label": string;
  children: React.ReactNode;
  size?: Extract<LucaButtonSize, "icon">;
}

export const LucaIconButton = React.forwardRef<
  HTMLButtonElement,
  LucaIconButtonProps
>(({ children, ...props }, ref) => (
  <LucaButton ref={ref} size="icon" {...props}>
    {React.isValidElement(children)
      ? React.cloneElement(children, {
          "aria-hidden": true,
          focusable: false,
          "data-icon": "inline-start",
        } as React.HTMLAttributes<HTMLElement>)
      : children}
  </LucaButton>
));

LucaIconButton.displayName = "LucaIconButton";
