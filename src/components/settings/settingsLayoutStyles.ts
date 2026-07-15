import {
  LUCA_MATERIAL_BORDER,
  LUCA_MATERIAL_BORDER_STRONG,
  LUCA_MATERIAL_CONTROL_SURFACE,
  LUCA_MATERIAL_FLAT_CARD_SURFACE,
  LUCA_MATERIAL_SHADOW,
  LUCA_MATERIAL_SURFACE_SOLID,
  LUCA_MATERIAL_TEXT_PRIMARY,
  LUCA_MATERIAL_TEXT_SECONDARY,
  LUCA_MATERIAL_TEXT_TERTIARY,
  lucaMaterialCardStyle,
  lucaMaterialControlStyle,
  lucaMaterialDividerStyle,
  lucaMaterialSolidCardStyle,
} from "../../styles/lucaMaterialSystem";

export const settingsSurfaceTokens = {
  glass: LUCA_MATERIAL_FLAT_CARD_SURFACE,
  solid: LUCA_MATERIAL_SURFACE_SOLID,
  hover:
    "var(--luca-surface-hover, var(--app-bg-tint, rgba(255,255,255,0.08)))",
  elevated: LUCA_MATERIAL_CONTROL_SURFACE,
  borderSubtle: LUCA_MATERIAL_BORDER,
  borderStrong: LUCA_MATERIAL_BORDER_STRONG,
  textPrimary: LUCA_MATERIAL_TEXT_PRIMARY,
  textSecondary: LUCA_MATERIAL_TEXT_SECONDARY,
  textTertiary: LUCA_MATERIAL_TEXT_TERTIARY,
  accentPrimary: "var(--luca-accent-primary, var(--app-core-hex, #7dd3fc))",
  accentSoft:
    "var(--luca-accent-soft, var(--app-bg-tint, rgba(125,211,252,0.14)))",
  shadowSoft: LUCA_MATERIAL_SHADOW,
} as const;

export const settingsCardStyle = {
  ...lucaMaterialCardStyle,
} as const;

export const settingsSolidCardStyle = {
  ...lucaMaterialSolidCardStyle,
} as const;

export const settingsRowStyle = {
  ...lucaMaterialDividerStyle,
  color: settingsSurfaceTokens.textPrimary,
} as const;

export const settingsControlStyle = {
  ...lucaMaterialControlStyle,
  color: settingsSurfaceTokens.textPrimary,
} as const;
