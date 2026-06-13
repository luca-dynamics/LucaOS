import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export const lucaWebTokens = {
  surface: "var(--luca-surface-glass, var(--app-bg-tint, rgba(18,18,18,.42)))",
  border: "var(--luca-border-subtle, var(--app-border-main, rgba(255,255,255,.1)))",
  text: "var(--luca-text-primary, var(--app-text-main, #fff))",
  muted: "var(--luca-text-secondary, var(--app-text-muted, rgba(255,255,255,.65)))",
  accent: "var(--luca-accent-primary, var(--app-core-hex, #7dd3fc))",
} as const;

export function LucaPanel({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section
      className={`tech-border glass-blur rounded-2xl border p-5 sm:p-6 ${className}`}
      style={{
        background: lucaWebTokens.surface,
        borderColor: lucaWebTokens.border,
        color: lucaWebTokens.text,
      }}
      {...props}
    >
      {children}
    </section>
  );
}

export function LucaButton({
  children,
  className = "",
  variant = "secondary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "quiet";
}) {
  const variants = {
    primary:
      "border-cyan-100/30 bg-cyan-100 text-slate-950 hover:bg-white",
    secondary:
      "border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.1]",
    quiet: "border-transparent bg-transparent text-white/60 hover:text-white",
  };
  return (
    <button
      type="button"
      className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-200/40 disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function LucaStatusChip({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  const classes =
    "inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[0.68rem] text-white/65";
  return onClick ? (
    <button type="button" className={`${classes} hover:bg-white/[0.07]`} onClick={onClick}>
      {children}
    </button>
  ) : (
    <span className={classes}>{children}</span>
  );
}
