import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import {
  lucaShellControlStyle,
  lucaShellMutedTextStyle,
  lucaShellPanelSurfaceStyle,
} from "../../styles/lucaShellStyles";

export function LucaSurface({ children, className = "", ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <section className={`luca-shell-panel rounded-2xl border p-5 sm:p-6 ${className}`} style={lucaShellPanelSurfaceStyle} {...props}>{children}</section>;
}

export function LucaAction({ children, className = "", emphasis = "secondary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; emphasis?: "primary" | "secondary" | "quiet" }) {
  const emphasisClass = {
    primary: "border-[var(--luca-accent-soft)] bg-[var(--luca-accent-primary)] text-slate-950",
    secondary: "hover:bg-[var(--luca-surface-hover)]",
    quiet: "border-transparent bg-transparent",
  }[emphasis];
  return <button type="button" className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--luca-accent-soft)] disabled:opacity-40 ${emphasisClass} ${className}`} style={emphasis === "primary" ? undefined : lucaShellControlStyle} {...props}>{children}</button>;
}

export function LucaStatus({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  const className = "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.68rem]";
  const content = <><span className="h-1.5 w-1.5 rounded-full bg-[var(--luca-accent-primary)]" />{children}</>;
  return onClick
    ? <button type="button" className={`${className} hover:bg-[var(--luca-surface-hover)]`} style={{ ...lucaShellControlStyle, ...lucaShellMutedTextStyle }} onClick={onClick}>{content}</button>
    : <span className={className} style={{ ...lucaShellControlStyle, ...lucaShellMutedTextStyle }}>{content}</span>;
}
