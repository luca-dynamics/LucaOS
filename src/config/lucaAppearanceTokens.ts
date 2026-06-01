import { getDynamicContrast } from "./themeColors";

export type AppearanceMode = "light" | "dark" | "system";
export type ResolvedAppearanceMode = "light" | "dark";
export type LucaPlatformAppearance = ResolvedAppearanceMode;
export type ProductTheme =
  | "luca-silver"
  | "luca-graphite"
  | "luca-frost"
  | "luca-cream";
export type Accent =
  | "neutral"
  | "blue"
  | "violet"
  | "green"
  | "amber"
  | "custom";
export type MotionStyle = "calm" | "standard" | "expressive";

export const LUCA_APPEARANCE_DEFAULTS = {
  defaultPersona: "ASSISTANT",
  defaultTheme: "PROFESSIONAL",
  defaultBackgroundOpacity: 0.3,
  defaultBackgroundBlur: 40,
  syncThemeWithPersonaDefault: true,
  settingsSchemaMigrationRequired: false,
} as const;

export interface LucaAppearanceTokens {
  appearanceMode: ResolvedAppearanceMode;
  requestedAppearanceMode: AppearanceMode;
  productTheme: ProductTheme;
  accent: Accent;
  backgroundOpacity: number;
  backgroundBlur: number;
  backgroundBase: string;
  backgroundElevated: string;
  backgroundLiquid: string;
  surfaceGlass: string;
  surfaceSolid: string;
  surfaceHover: string;
  borderSubtle: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accentPrimary: string;
  accentSoft: string;
  danger: string;
  success: string;
  warning: string;
  info: string;
  shadowSoft: string;
  shadowGlow: string;
  blurLevel: string;
  motionStyle: MotionStyle;
  reducedMotion: boolean;
  reducedTransparency: boolean;
  highContrast: boolean;
}

export interface ResolveLucaAppearanceTokensInput {
  theme?: string | null;
  persona?: string | null;
  backgroundOpacity?: number | null;
  backgroundBlur?: number | null;
  appearanceMode?: AppearanceMode | null;
  platformAppearance?: LucaPlatformAppearance | null;
  productTheme?: ProductTheme | null;
  accent?: Accent | null;
  customAccentColor?: string | null;
  reducedMotion?: boolean | null;
  reducedTransparency?: boolean | null;
  highContrast?: boolean | null;
}

type LegacyAppearanceMapping = {
  productTheme: ProductTheme;
  accent: Accent;
  appearanceMode?: ResolvedAppearanceMode;
  compatibilityMode?: "accent-heavy";
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeNumber = (
  value: number | null | undefined,
  fallback: number,
  min: number,
  max: number,
) => (typeof value === "number" && Number.isFinite(value)
  ? clamp(value, min, max)
  : fallback);

const alpha = (base: number, opacity: number, range = 0.28) =>
  Number(clamp(base + opacity * range, 0, 1).toFixed(3));

const legacyMappings: Record<string, LegacyAppearanceMapping> = {
  PROFESSIONAL: { productTheme: "luca-silver", accent: "neutral", appearanceMode: "light" },
  ASSISTANT: { productTheme: "luca-silver", accent: "neutral", appearanceMode: "light" },
  AGENTIC_SLATE: { productTheme: "luca-silver", accent: "neutral", appearanceMode: "light" },
  LUCAGENT: { productTheme: "luca-silver", accent: "neutral", appearanceMode: "light" },
  LIGHTCREAM: { productTheme: "luca-cream", accent: "neutral", appearanceMode: "light" },
  FROST: { productTheme: "luca-frost", accent: "blue", appearanceMode: "light" },
  MASTER_SYSTEM: { productTheme: "luca-graphite", accent: "blue", appearanceMode: "dark" },
  RUTHLESS: { productTheme: "luca-graphite", accent: "blue", appearanceMode: "dark" },
  TERMINAL: { productTheme: "luca-graphite", accent: "green", appearanceMode: "dark" },
  HACKER: { productTheme: "luca-graphite", accent: "green", appearanceMode: "dark" },
  BUILDER: { productTheme: "luca-graphite", accent: "amber", appearanceMode: "dark" },
  ENGINEER: { productTheme: "luca-graphite", accent: "amber", appearanceMode: "dark" },
  DICTATION: { productTheme: "luca-graphite", accent: "violet", appearanceMode: "dark" },
  VAPORWAVE: {
    productTheme: "luca-graphite",
    accent: "custom",
    appearanceMode: "dark",
    compatibilityMode: "accent-heavy",
  },
};

const accentColors: Record<Accent, { primary: string; soft: string; glow: string }> = {
  neutral: {
    primary: "#5f6b7a",
    soft: "rgba(95, 107, 122, 0.16)",
    glow: "rgba(95, 107, 122, 0.2)",
  },
  blue: {
    primary: "#4f8cff",
    soft: "rgba(79, 140, 255, 0.15)",
    glow: "rgba(79, 140, 255, 0.22)",
  },
  violet: {
    primary: "#9b7cff",
    soft: "rgba(155, 124, 255, 0.15)",
    glow: "rgba(155, 124, 255, 0.22)",
  },
  green: {
    primary: "#4fbf7a",
    soft: "rgba(79, 191, 122, 0.14)",
    glow: "rgba(79, 191, 122, 0.2)",
  },
  amber: {
    primary: "#c7893f",
    soft: "rgba(199, 137, 63, 0.15)",
    glow: "rgba(199, 137, 63, 0.21)",
  },
  custom: {
    primary: "#d37cff",
    soft: "rgba(211, 124, 255, 0.2)",
    glow: "rgba(211, 124, 255, 0.26)",
  },
};

export const isExplicitLegacyTheme = (theme?: string | null): boolean =>
  typeof theme === "string" && theme.trim().length > 0;

export const readLucaPlatformAppearance = (): LucaPlatformAppearance | null => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

// First-run policy only applies when no explicit theme id is supplied by
// Settings. Saved legacy ids (including PROFESSIONAL) remain user-owned and
// continue through the legacy compatibility map without automatic migration.
export const resolveFirstRunAppearancePreference = (
  platformAppearance?: LucaPlatformAppearance | null,
): LegacyAppearanceMapping & { requestedAppearanceMode: AppearanceMode } => {
  const resolvedPlatformAppearance = platformAppearance ?? readLucaPlatformAppearance();
  const appearanceMode = resolvedPlatformAppearance ?? "light";

  return {
    requestedAppearanceMode: "system",
    appearanceMode,
    productTheme: appearanceMode === "dark" ? "luca-graphite" : "luca-silver",
    accent: "neutral",
  };
};

const resolveLegacyMapping = (theme?: string | null, persona?: string | null) => {
  const themeKey = theme?.toUpperCase() ?? "";
  const personaKey = persona?.toUpperCase() ?? "";
  return (
    legacyMappings[themeKey] ??
    legacyMappings[personaKey] ??
    legacyMappings[LUCA_APPEARANCE_DEFAULTS.defaultTheme]
  );
};

const resolveMode = (
  requestedMode: AppearanceMode,
  mapping: LegacyAppearanceMapping,
  platformAppearance?: LucaPlatformAppearance | null,
): ResolvedAppearanceMode => {
  if (requestedMode === "system") {
    return platformAppearance ?? mapping.appearanceMode ?? "light";
  }

  return requestedMode;
};

const buildProductTokens = ({
  productTheme,
  mode,
  accent,
  backgroundOpacity,
  backgroundBlur,
  reducedTransparency,
  highContrast,
  customAccentColor,
  compatibilityMode,
}: {
  productTheme: ProductTheme;
  mode: ResolvedAppearanceMode;
  accent: Accent;
  backgroundOpacity: number;
  backgroundBlur: number;
  reducedTransparency: boolean;
  highContrast: boolean;
  customAccentColor?: string | null;
  compatibilityMode?: LegacyAppearanceMapping["compatibilityMode"];
}): LucaAppearanceTokens => {
  const accentSet = accentColors[accent];
  const accentPrimary = customAccentColor && accent === "custom"
    ? customAccentColor
    : accentSet.primary;
  const glassAlpha = reducedTransparency ? 0.92 : alpha(mode === "light" ? 0.2 : 0.18, backgroundOpacity, 0.42);
  const elevatedAlpha = alpha(mode === "light" ? 0.54 : 0.34, backgroundOpacity, 0.28);
  const hoverAlpha = alpha(mode === "light" ? 0.44 : 0.28, backgroundOpacity, 0.22);
  const glowMultiplier = compatibilityMode === "accent-heavy" ? 1.6 : 1;

  const lightCommon = {
    appearanceMode: mode,
    requestedAppearanceMode: mode,
    productTheme,
    accent,
    backgroundOpacity,
    backgroundBlur,
    danger: "#d94a4a",
    success: "#2f9d69",
    warning: "#b7791f",
    info: "#4778d8",
    blurLevel: `${backgroundBlur}px`,
    motionStyle: "calm" as MotionStyle,
    reducedMotion: false,
    reducedTransparency,
    highContrast,
  };

  if (productTheme === "luca-graphite" || mode === "dark") {
    return {
      ...lightCommon,
      appearanceMode: "dark",
      requestedAppearanceMode: mode,
      backgroundBase: "#101215",
      backgroundElevated: `rgba(35, 38, 43, ${elevatedAlpha})`,
      backgroundLiquid:
        "radial-gradient(circle at 50% 18%, rgba(104, 112, 124, 0.2), transparent 52%), linear-gradient(180deg, #181a1f 0%, #0c0d10 100%)",
      surfaceGlass: `rgba(24, 27, 32, ${glassAlpha})`,
      surfaceSolid: "#1b1e23",
      surfaceHover: `rgba(68, 73, 82, ${hoverAlpha})`,
      borderSubtle: highContrast ? "rgba(232, 236, 242, 0.34)" : "rgba(232, 236, 242, 0.14)",
      borderStrong: highContrast ? "rgba(255, 255, 255, 0.56)" : "rgba(255, 255, 255, 0.26)",
      textPrimary: "#f4f6f8",
      textSecondary: "rgba(226, 232, 240, 0.76)",
      textTertiary: "rgba(203, 213, 225, 0.56)",
      accentPrimary,
      accentSoft: accentSet.soft,
      shadowSoft: `0 24px 80px rgba(0, 0, 0, ${0.22 + backgroundOpacity * 0.24})`,
      shadowGlow: `0 0 ${Math.round(18 + backgroundBlur * 0.45)}px color-mix(in srgb, ${accentSet.glow} ${Math.round(36 * glowMultiplier)}%, transparent)`,
    };
  }

  const themeBase = {
    "luca-silver": {
      backgroundBase: "#f6f7f9",
      backgroundLiquid:
        "radial-gradient(circle at 50% -10%, rgba(191, 197, 207, 0.34), transparent 58%), linear-gradient(180deg, #ffffff 0%, #eef1f5 100%)",
      surfaceSolid: "#ffffff",
      textPrimary: "#161a20",
      borderSubtle: "rgba(55, 65, 81, 0.14)",
    },
    "luca-frost": {
      backgroundBase: "#f7fbfd",
      backgroundLiquid:
        "radial-gradient(circle at 50% -8%, rgba(189, 214, 224, 0.32), transparent 60%), linear-gradient(180deg, #ffffff 0%, #eef6fa 100%)",
      surfaceSolid: "#fbfdff",
      textPrimary: "#14202a",
      borderSubtle: "rgba(45, 74, 91, 0.14)",
    },
    "luca-cream": {
      backgroundBase: "#f4efe2",
      backgroundLiquid:
        "radial-gradient(circle at 50% -8%, rgba(218, 202, 166, 0.28), transparent 58%), linear-gradient(180deg, #fffaf0 0%, #ece3cf 100%)",
      surfaceSolid: "#fff8ea",
      textPrimary: "#2d2a22",
      borderSubtle: "rgba(87, 80, 61, 0.16)",
    },
  }[productTheme];

  return {
    ...lightCommon,
    appearanceMode: "light",
    requestedAppearanceMode: mode,
    backgroundBase: themeBase.backgroundBase,
    backgroundElevated: `rgba(255, 255, 255, ${elevatedAlpha})`,
    backgroundLiquid: themeBase.backgroundLiquid,
    surfaceGlass: `rgba(255, 255, 255, ${glassAlpha})`,
    surfaceSolid: themeBase.surfaceSolid,
    surfaceHover: `rgba(255, 255, 255, ${hoverAlpha})`,
    borderSubtle: highContrast ? "rgba(22, 26, 32, 0.32)" : themeBase.borderSubtle,
    borderStrong: highContrast ? "rgba(22, 26, 32, 0.48)" : "rgba(22, 26, 32, 0.24)",
    textPrimary: themeBase.textPrimary,
    textSecondary: "rgba(42, 48, 58, 0.74)",
    textTertiary: "rgba(67, 75, 87, 0.54)",
    accentPrimary,
    accentSoft: accentSet.soft,
    shadowSoft: `0 22px 70px rgba(78, 86, 98, ${0.1 + backgroundOpacity * 0.16})`,
    shadowGlow: `0 0 ${Math.round(14 + backgroundBlur * 0.35)}px color-mix(in srgb, ${accentSet.glow} ${Math.round(24 * glowMultiplier)}%, transparent)`,
  };
};

export const resolveLucaAppearanceTokens = (
  input: ResolveLucaAppearanceTokensInput = {},
): LucaAppearanceTokens => {
  const platformAppearance = input.platformAppearance ?? readLucaPlatformAppearance();
  const firstRunPreference = !isExplicitLegacyTheme(input.theme)
    ? resolveFirstRunAppearancePreference(platformAppearance)
    : null;
  const mapping = firstRunPreference ?? resolveLegacyMapping(input.theme, input.persona);
  const backgroundOpacity = normalizeNumber(
    input.backgroundOpacity,
    LUCA_APPEARANCE_DEFAULTS.defaultBackgroundOpacity,
    0,
    1,
  );
  const backgroundBlur = normalizeNumber(
    input.backgroundBlur,
    LUCA_APPEARANCE_DEFAULTS.defaultBackgroundBlur,
    0,
    120,
  );
  const requestedMode = input.appearanceMode ?? firstRunPreference?.requestedAppearanceMode ?? "system";
  const productTheme = input.productTheme ?? mapping.productTheme;
  const accent = input.accent ?? mapping.accent;
  const mode = resolveMode(requestedMode, mapping, platformAppearance);

  const tokens = buildProductTokens({
    productTheme,
    mode,
    accent,
    backgroundOpacity,
    backgroundBlur,
    reducedTransparency: Boolean(input.reducedTransparency),
    highContrast: Boolean(input.highContrast),
    customAccentColor: input.customAccentColor,
    compatibilityMode: mapping.compatibilityMode,
  });

  return {
    ...tokens,
    requestedAppearanceMode: requestedMode,
    reducedMotion: Boolean(input.reducedMotion),
  };
};

export const getLucaAppearanceCssVariables = (
  tokens: LucaAppearanceTokens,
): Record<string, string> => ({
  "--luca-background-base": tokens.backgroundBase,
  "--luca-background-elevated": tokens.backgroundElevated,
  "--luca-background-liquid": tokens.backgroundLiquid,
  "--luca-surface-glass": tokens.surfaceGlass,
  "--luca-surface-solid": tokens.surfaceSolid,
  "--luca-surface-hover": tokens.surfaceHover,
  "--luca-border-subtle": tokens.borderSubtle,
  "--luca-border-strong": tokens.borderStrong,
  "--luca-text-primary": tokens.textPrimary,
  "--luca-text-secondary": tokens.textSecondary,
  "--luca-text-tertiary": tokens.textTertiary,
  "--luca-accent-primary": tokens.accentPrimary,
  "--luca-accent-soft": tokens.accentSoft,
  "--luca-danger": tokens.danger,
  "--luca-success": tokens.success,
  "--luca-warning": tokens.warning,
  "--luca-info": tokens.info,
  "--luca-shadow-soft": tokens.shadowSoft,
  "--luca-shadow-glow": tokens.shadowGlow,
  "--luca-blur-level": tokens.blurLevel,
});

export interface LucaAppearanceCssVariableState {
  tokens: LucaAppearanceTokens;
  appearanceMode: ResolvedAppearanceMode;
  variables: Record<string, string>;
}

export const buildLucaAppearanceCssVariableState = (
  input: ResolveLucaAppearanceTokensInput & {
    fontScale?: number | null;
    fontFamily?: string | null;
  } = {},
): LucaAppearanceCssVariableState => {
  const tokens = resolveLucaAppearanceTokens(input);
  const legacyContrastTheme = input.theme ?? (
    tokens.appearanceMode === "dark"
      ? "MASTER_SYSTEM"
      : LUCA_APPEARANCE_DEFAULTS.defaultTheme
  );
  const legacyContrast = getDynamicContrast(
    legacyContrastTheme,
    tokens.backgroundOpacity,
  );

  return {
    tokens,
    appearanceMode: tokens.appearanceMode,
    variables: {
      "--app-bg-opacity": tokens.backgroundOpacity.toString(),
      "--app-bg-blur": tokens.blurLevel,
      "--app-text-main": legacyContrast.text,
      "--app-text-muted": legacyContrast.textMuted,
      "--app-border-main": legacyContrast.border,
      "--app-bg-tint": legacyContrast.bgTint,
      "--app-bg-main": legacyContrast.bgMain,
      "--app-font-scale": (input.fontScale ?? 1).toString(),
      "--app-font-family": input.fontFamily ?? '"Inter", system-ui, sans-serif',
      ...getLucaAppearanceCssVariables(tokens),
    },
  };
};

export const buildLucaAppearanceCssVariables = (
  input: ResolveLucaAppearanceTokensInput & {
    fontScale?: number | null;
    fontFamily?: string | null;
  } = {},
): Record<string, string> => buildLucaAppearanceCssVariableState(input).variables;

export const applyLucaAppearanceCssVariables = (
  target: HTMLElement,
  variables: Record<string, string>,
) => {
  for (const [name, value] of Object.entries(variables)) {
    target.style.setProperty(name, value);
  }
};
