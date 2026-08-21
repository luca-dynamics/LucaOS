/* eslint-disable react/prop-types -- TypeScript DOM attribute types provide validation. */
import React, { useId } from "react";

import { settingsControlStyle } from "../../settings/settingsLayoutStyles";
import { mergeClassNames } from "./mergeClassNames";

export const LucaFieldGroup = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={mergeClassNames("flex flex-col gap-4", className)} {...props} />
);

export const LucaField = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={mergeClassNames("flex flex-col gap-2", className)} {...props} />
);

export const LucaFieldLabel = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={mergeClassNames("text-sm font-medium text-[var(--luca-text-primary,var(--app-text-main))]", className)} {...props} />
);

export const LucaFieldDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={mergeClassNames("text-xs leading-relaxed text-[var(--luca-text-secondary,var(--app-text-muted))]", className)} {...props} />
);

export const LucaFieldSet = ({ className, ...props }: React.FieldsetHTMLAttributes<HTMLFieldSetElement>) => (
  <fieldset className={mergeClassNames("flex min-w-0 flex-col gap-4 border-0 p-0", className)} {...props} />
);

export const LucaFieldLegend = ({ className, ...props }: React.HTMLAttributes<HTMLLegendElement>) => (
  <legend className={mergeClassNames("mb-2 text-sm font-semibold text-[var(--luca-text-primary,var(--app-text-main))]", className)} {...props} />
);

const controlClassName = "w-full rounded-lg border px-3 text-sm outline-none placeholder:text-[var(--luca-text-tertiary,var(--app-text-muted))] focus-visible:ring-2 focus-visible:ring-[var(--luca-accent-primary,var(--app-core-hex))] disabled:cursor-not-allowed disabled:opacity-50";

export const LucaInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, style, ...props }, ref) => (
    <input
      ref={ref}
      className={mergeClassNames("h-9", controlClassName, className)}
      style={{ ...settingsControlStyle, ...style }}
      {...props}
    />
  ),
);
LucaInput.displayName = "LucaInput";

export const LucaTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, style, ...props }, ref) => (
    <textarea
      ref={ref}
      className={mergeClassNames("min-h-24 resize-y py-2", controlClassName, className)}
      style={{ ...settingsControlStyle, ...style }}
      {...props}
    />
  ),
);
LucaTextarea.displayName = "LucaTextarea";

export const LucaSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, style, ...props }, ref) => (
    <select
      ref={ref}
      className={mergeClassNames("h-9", controlClassName, className)}
      style={{ ...settingsControlStyle, ...style }}
      {...props}
    />
  ),
);
LucaSelect.displayName = "LucaSelect";

export const LucaSlider = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="range"
      className={mergeClassNames("h-2 w-full cursor-pointer appearance-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--luca-accent-primary,var(--app-core-hex))] disabled:opacity-50", className)}
      {...props}
    />
  ),
);
LucaSlider.displayName = "LucaSlider";

export interface LucaSwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /**
   * Tints the focus ring only. The "on" track is deliberately the fixed
   * --luca-control-on role and not a per-call colour: a switch has to read as
   * on or off at a glance, and twenty call sites each passing their own accent
   * is how that legibility gets lost. Platform switches work the same way.
   */
  accentColor?: string;
}

export const LucaSwitch = React.forwardRef<HTMLButtonElement, LucaSwitchProps>(
  ({ checked, onCheckedChange, accentColor, className, style, ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      type="button"
      role="switch"
      aria-checked={checked}
      className={mergeClassNames(
        // ring-offset-transparent: Tailwind's default offset colour is #fff, which
        // draws a white halo around the track on any dark surface.
        "luca-material-pressable relative h-7 w-12 rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--luca-switch-ring,var(--luca-control-on,#3b82f6))] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:opacity-50",
        className,
      )}
      style={{
        backgroundColor: checked
          ? "var(--luca-control-on,#3b82f6)"
          : "var(--luca-border-strong,var(--app-border))",
        ...(accentColor ? { "--luca-switch-ring": accentColor } as React.CSSProperties : {}),
        ...style,
      }}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) onCheckedChange(!checked);
      }}
    >
      <span
        aria-hidden="true"
        // left-0 anchors the thumb: without it the static position is the track's
        // centre (button UA text-align), and the on-state transform overflows.
        // 24px thumb in a 28px track is a 0.857 knob:track ratio, between iOS
        // (0.871) and Radix (0.833); a 2px inset is what every shipped switch
        // uses. Travel is 48 - 24 - 2 - 2 = 20px, so 2px off and 22px on.
        // Timing matches .luca-material-pressable so knob and track read as one
        // object rather than two things easing apart.
        className="absolute left-0 top-0.5 size-6 rounded-full transition-transform duration-[140ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
        style={{
          transform: checked ? "translateX(1.375rem)" : "translateX(0.125rem)",
          // Constant knob, both states: the TRACK carries the state. Changing
          // both at once is what makes a switch read as two unrelated shapes.
          backgroundColor: "var(--luca-control-knob,#fff)",
          // Elevation is what separates a rendered knob from a drawn circle.
          boxShadow: "0 1px 2px rgb(0 0 0 / 0.18), 0 2px 6px rgb(0 0 0 / 0.14)",
        }}
      />
    </button>
  ),
);
LucaSwitch.displayName = "LucaSwitch";

export function useLucaFieldIds(prefix = "luca-field") {
  const id = useId();
  return {
    controlId: `${prefix}-${id}`,
    descriptionId: `${prefix}-${id}-description`,
  };
}
