import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import {
  lucaShellControlStyle,
  lucaShellPanelSurfaceStyle,
} from "../../styles/lucaShellStyles";
import {
  settingsCardStyle,
  settingsRowStyle,
  settingsSurfaceTokens,
} from "../../components/settings/settingsLayoutStyles";

export const EXTRACTED_SURFACE_SOURCES = [
  "src/components/Onboarding/ModeCard.tsx",
  "src/components/settings/SettingsLayout.tsx",
  "src/styles/lucaShellStyles.ts",
  "src/components/settings/settingsLayoutStyles.ts",
] as const;

// Extracted from the glass choice frame in components/Onboarding/ModeCard.tsx.
export function OnboardingChoiceCard({
  active = false,
  children,
  description,
  onClick,
  title,
}: {
  active?: boolean;
  children?: ReactNode;
  description: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl border p-6 text-center transition-all duration-300 glass-blur touch-manipulation active:scale-95 hover:bg-[var(--app-bg-tint)] sm:p-8"
      style={{
        borderColor: active
          ? "var(--luca-accent-primary, var(--app-text-main))"
          : "var(--app-border-main)",
        backgroundColor: active
          ? "var(--luca-accent-soft, var(--app-bg-tint))"
          : undefined,
      }}
    >
      {children}
      <h3 className="text-lg font-bold uppercase tracking-wider text-[var(--app-text-main)] sm:text-xl">
        {title}
      </h3>
      <p className="mt-2 text-xs text-[var(--app-text-muted)] opacity-80 sm:text-sm">
        {description}
      </p>
      <div className="mt-3 inline-block rounded-lg border px-4 py-2 text-xs font-medium tracking-wide text-[var(--app-text-main)] sm:mt-4 sm:px-6 sm:text-sm" style={lucaShellControlStyle}>
        Choose
      </div>
    </button>
  );
}

export function ExtractedSettingsSection({
  children,
  className = "",
  description,
  eyebrow,
  title,
}: {
  children?: ReactNode;
  className?: string;
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className={`space-y-4 rounded-2xl border px-5 py-5 ${className}`} style={settingsCardStyle}>
      <div>
        {eyebrow && <p className="mb-1 text-[11px] font-semibold tracking-wide" style={{ color: settingsSurfaceTokens.textTertiary }}>{eyebrow}</p>}
        <h3 className="text-base font-semibold tracking-tight" style={{ color: settingsSurfaceTokens.textPrimary }}>{title}</h3>
        {description && <p className="mt-1 text-sm leading-relaxed" style={{ color: settingsSurfaceTokens.textSecondary }}>{description}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function ExtractedSettingsCard({ children, className = "" }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={`rounded-xl border p-4 ${className}`} style={settingsCardStyle}>{children}</div>;
}

export function ExtractedSettingsRow({ label, description, control }: { label: string; description?: string; control?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border px-3 py-3" style={settingsRowStyle}>
      <div className="min-w-0"><p className="text-sm font-medium" style={{ color: settingsSurfaceTokens.textPrimary }}>{label}</p>{description && <p className="mt-0.5 text-xs leading-relaxed" style={{ color: settingsSurfaceTokens.textSecondary }}>{description}</p>}</div>
      {control && <div className="shrink-0">{control}</div>}
    </div>
  );
}

export function ExtractedAction({
  children,
  className = "",
  primary = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return <button type="button" className={`rounded-lg border px-4 py-2 text-sm font-medium tracking-wide transition ${primary ? "bg-[var(--luca-accent-primary)] text-slate-950" : ""} ${className}`} style={primary ? undefined : lucaShellControlStyle} {...props}>{children}</button>;
}

export function ExtractedShellPanel({ children, className = "", ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <section className={`border ${className}`} style={lucaShellPanelSurfaceStyle} {...props}>{children}</section>;
}
