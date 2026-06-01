import React from "react";
import { Icon } from "../ui/Icon";
import {
  settingsCardStyle,
  settingsControlStyle,
  settingsRowStyle,
  settingsSurfaceTokens,
} from "./settingsLayoutStyles";

interface BaseProps {
  children?: React.ReactNode;
  className?: string;
  isMobile?: boolean;
}

export const SettingsSection: React.FC<
  BaseProps & {
    title: string;
    description?: string;
    icon?: string;
    accentColor?: string;
    eyebrow?: string;
  }
> = ({
  children,
  className = "",
  isMobile,
  title,
  description,
  icon,
  accentColor,
  eyebrow,
}) => (
  <section
    className={`${isMobile ? "rounded-none border-x-0 px-4 py-5" : "rounded-2xl px-5 py-5"} border space-y-4 ${className}`}
    style={settingsCardStyle}
  >
    <div className="flex items-start gap-3">
      {icon && (
        <div
          className="mt-0.5 rounded-xl p-2"
          style={{
            backgroundColor: settingsSurfaceTokens.accentSoft,
            color: accentColor ?? settingsSurfaceTokens.accentPrimary,
          }}
        >
          <Icon name={icon as any} variant="BoldDuotone" className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p
            className="mb-1 text-[11px] font-semibold tracking-wide"
            style={{ color: settingsSurfaceTokens.textTertiary }}
          >
            {eyebrow}
          </p>
        )}
        <h3
          className="text-base font-semibold tracking-tight"
          style={{ color: settingsSurfaceTokens.textPrimary }}
        >
          {title}
        </h3>
        {description && (
          <p
            className="mt-1 text-sm leading-relaxed"
            style={{ color: settingsSurfaceTokens.textSecondary }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
    <div className="space-y-3">{children}</div>
  </section>
);

export const SettingsCard: React.FC<BaseProps> = ({
  children,
  className = "",
}) => (
  <div
    className={`rounded-xl border p-4 ${className}`}
    style={settingsCardStyle}
  >
    {children}
  </div>
);

export const SettingsStatusCard: React.FC<
  BaseProps & {
    label: string;
    value: string;
    detail?: string;
    accentColor?: string;
  }
> = ({ label, value, detail, accentColor, className = "" }) => (
  <SettingsCard className={className}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p
          className="text-sm font-medium"
          style={{ color: settingsSurfaceTokens.textSecondary }}
        >
          {label}
        </p>
        <p
          className="mt-1 text-lg font-semibold"
          style={{ color: settingsSurfaceTokens.textPrimary }}
        >
          {value}
        </p>
        {detail && (
          <p
            className="mt-1 text-xs leading-relaxed"
            style={{ color: settingsSurfaceTokens.textTertiary }}
          >
            {detail}
          </p>
        )}
      </div>
      <span
        className="mt-1 h-2.5 w-2.5 rounded-full"
        style={{
          backgroundColor: accentColor ?? settingsSurfaceTokens.accentPrimary,
        }}
      />
    </div>
  </SettingsCard>
);

export const SettingsRow: React.FC<
  BaseProps & {
    label: string;
    description?: string;
    icon?: string;
    accentColor?: string;
    control?: React.ReactNode;
  }
> = ({
  label,
  description,
  icon,
  accentColor,
  control,
  children,
  className = "",
}) => (
  <div
    className={`flex items-center justify-between gap-4 rounded-xl border px-3 py-3 ${className}`}
    style={settingsRowStyle}
  >
    <div className="flex min-w-0 items-center gap-3">
      {icon && (
        <Icon
          name={icon as any}
          variant="BoldDuotone"
          className="h-4 w-4 shrink-0"
          style={{ color: accentColor ?? settingsSurfaceTokens.accentPrimary }}
        />
      )}
      <div className="min-w-0">
        <p
          className="text-sm font-medium"
          style={{ color: settingsSurfaceTokens.textPrimary }}
        >
          {label}
        </p>
        {description && (
          <p
            className="mt-0.5 text-xs leading-relaxed"
            style={{ color: settingsSurfaceTokens.textSecondary }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
    <div className="shrink-0">{control ?? children}</div>
  </div>
);

export const SettingsToggle: React.FC<{
  checked: boolean;
  onChange: () => void;
  accentColor?: string;
  ariaLabel: string;
}> = ({ checked, onChange, accentColor, ariaLabel }) => (
  <button
    type="button"
    aria-label={ariaLabel}
    aria-pressed={checked}
    onClick={onChange}
    className="relative h-7 w-12 rounded-full transition-all"
    style={{
      backgroundColor: checked
        ? (accentColor ?? settingsSurfaceTokens.accentPrimary)
        : settingsSurfaceTokens.borderSubtle,
    }}
  >
    <span
      className="absolute top-1 h-5 w-5 rounded-full transition-all"
      style={{
        left: checked ? "1.5rem" : "0.25rem",
        backgroundColor: checked
          ? "#ffffff"
          : settingsSurfaceTokens.textTertiary,
      }}
    />
  </button>
);

export const SettingsAdvancedDisclosure: React.FC<
  BaseProps & { title?: string; description?: string; defaultOpen?: boolean }
> = ({
  children,
  className = "",
  title = "Advanced Details",
  description = "Technical configuration and diagnostics.",
  defaultOpen = false,
}) => (
  <details
    className={`group rounded-2xl border ${className}`}
    style={settingsCardStyle}
    open={defaultOpen}
  >
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
      <span>
        <span
          className="block text-sm font-semibold"
          style={{ color: settingsSurfaceTokens.textPrimary }}
        >
          {title}
        </span>
        <span
          className="mt-0.5 block text-xs"
          style={{ color: settingsSurfaceTokens.textSecondary }}
        >
          {description}
        </span>
      </span>
      <Icon
        name="ChevronDown"
        className="h-4 w-4 transition-transform group-open:rotate-180"
        style={{ color: settingsSurfaceTokens.textSecondary }}
      />
    </summary>
    <div
      className="space-y-3 border-t px-5 py-4"
      style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
    >
      {children}
    </div>
  </details>
);

export const SettingsDangerZone: React.FC<
  BaseProps & { title?: string; description?: string }
> = ({
  children,
  className = "",
  title = "Danger Zone",
  description = "Destructive or reset actions.",
}) => (
  <SettingsAdvancedDisclosure
    title={title}
    description={description}
    className={className}
  >
    {children}
  </SettingsAdvancedDisclosure>
);

export const settingsSelectClassName =
  "w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors";
export const settingsInputClassName =
  "w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors";
export const settingsControlInlineStyle = settingsControlStyle;
