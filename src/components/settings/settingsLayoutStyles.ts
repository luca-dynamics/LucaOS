export const settingsSurfaceTokens = {
  glass:
    "var(--luca-surface-glass, var(--app-bg-tint, rgba(255,255,255,0.04)))",
  solid: "var(--luca-surface-solid, var(--app-bg-main, #0a0a0f))",
  hover:
    "var(--luca-surface-hover, var(--app-bg-tint, rgba(255,255,255,0.08)))",
  elevated: "var(--luca-background-elevated, var(--app-bg-main, #101018))",
  borderSubtle:
    "var(--luca-border-subtle, var(--app-border-main, rgba(255,255,255,0.10)))",
  borderStrong:
    "var(--luca-border-strong, var(--app-border-main, rgba(255,255,255,0.18)))",
  textPrimary: "var(--luca-text-primary, var(--app-text-main, #ffffff))",
  textSecondary: "var(--luca-text-secondary, var(--app-text-muted, #a1a1aa))",
  textTertiary: "var(--luca-text-tertiary, var(--app-text-muted, #71717a))",
  accentPrimary: "var(--luca-accent-primary, var(--app-core-hex, #7dd3fc))",
  accentSoft:
    "var(--luca-accent-soft, var(--app-bg-tint, rgba(125,211,252,0.14)))",
  shadowSoft:
    "var(--luca-shadow-soft, var(--app-shadow-soft, 0 18px 45px rgba(0,0,0,0.22)))",
} as const;

export const settingsCardStyle = {
  backgroundColor: settingsSurfaceTokens.glass,
  borderColor: settingsSurfaceTokens.borderSubtle,
  color: settingsSurfaceTokens.textPrimary,
  boxShadow: settingsSurfaceTokens.shadowSoft,
} as const;

export const settingsSolidCardStyle = {
  backgroundColor: settingsSurfaceTokens.solid,
  borderColor: settingsSurfaceTokens.borderSubtle,
  color: settingsSurfaceTokens.textPrimary,
} as const;

export const settingsRowStyle = {
  borderColor: settingsSurfaceTokens.borderSubtle,
  color: settingsSurfaceTokens.textPrimary,
} as const;

export const settingsControlStyle = {
  backgroundColor: settingsSurfaceTokens.elevated,
  borderColor: settingsSurfaceTokens.borderSubtle,
  color: settingsSurfaceTokens.textPrimary,
} as const;
