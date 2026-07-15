import React from "react";

import { mergeClassNames } from "./mergeClassNames";

export type LucaBadgeVariant = "neutral" | "success" | "warning" | "danger" | "accent";

const BADGE_VARIANTS: Record<LucaBadgeVariant, string> = {
  neutral: "border-[var(--luca-border-subtle,var(--app-border))] text-[var(--luca-text-secondary,var(--app-text-muted))]",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  accent: "border-[var(--luca-accent-primary,var(--app-core-hex))]/30 bg-[var(--luca-accent-primary,var(--app-core-hex))]/10 text-[var(--luca-accent-primary,var(--app-core-hex))]",
};

export interface LucaBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: LucaBadgeVariant;
}

export const LucaBadge = ({ variant = "neutral", className, ...props }: LucaBadgeProps) => (
  <span
    className={mergeClassNames(
      "inline-flex min-h-5 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
      BADGE_VARIANTS[variant],
      className,
    )}
    {...props}
  />
);

export const LucaSeparator = ({ className, ...props }: React.HTMLAttributes<HTMLHRElement>) => (
  <hr
    aria-orientation="horizontal"
    className={mergeClassNames("h-px w-full border-0 bg-[var(--luca-border-subtle,var(--app-border))]", className)}
    {...props}
  />
);

export const LucaEmpty = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={mergeClassNames("flex min-h-32 flex-col items-center justify-center gap-3 px-6 py-8 text-center", className)} {...props} />
);

export const LucaEmptyTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={mergeClassNames("text-sm font-semibold text-[var(--luca-text-primary,var(--app-text-main))]", className)} {...props} />
);

export const LucaEmptyDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={mergeClassNames("max-w-sm text-sm leading-relaxed text-[var(--luca-text-secondary,var(--app-text-muted))]", className)} {...props} />
);

export interface LucaAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: "info" | "success" | "warning" | "danger";
}

export const LucaAlert = ({ tone = "info", className, role, ...props }: LucaAlertProps) => (
  <div
    role={role ?? (tone === "danger" ? "alert" : "status")}
    className={mergeClassNames(
      "rounded-xl border px-4 py-3 text-sm",
      tone === "danger" && "border-red-500/30 bg-red-500/10",
      tone === "warning" && "border-amber-500/30 bg-amber-500/10",
      tone === "success" && "border-emerald-500/30 bg-emerald-500/10",
      tone === "info" && "border-[var(--luca-border-subtle,var(--app-border))] bg-[var(--luca-surface-soft,transparent)]",
      className,
    )}
    {...props}
  />
);
