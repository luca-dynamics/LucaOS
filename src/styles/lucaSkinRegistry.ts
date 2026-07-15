import {
  DEFAULT_LUCA_SKIN_ID,
  getLucaSkinDefinition,
  type LucaSkinHostKind,
} from "../config/lucaSkins";

export const LUCA_SKIN_CSS_VARIABLE_NAMES = [
  "--luca-skin-bg-base",
  "--luca-skin-bg-elevated",
  "--luca-skin-bg-ambient",
  "--luca-skin-bg-hero",
  "--luca-skin-glass-opacity",
  "--luca-skin-glass-blur",
  "--luca-skin-glass-highlight",
  "--luca-skin-glass-rim",
  "--luca-skin-glass-shadow",
  "--luca-skin-glass-sheen",
  "--luca-skin-border-strength",
  "--luca-skin-shadow-soft",
  "--luca-skin-shadow-float",
  "--luca-skin-accent-primary",
  "--luca-skin-accent-secondary",
  "--luca-skin-accent-glow",
  "--luca-skin-text-primary",
  "--luca-skin-text-secondary",
  "--luca-skin-text-tertiary",
  "--luca-skin-boot-bg",
  "--luca-skin-boot-orb",
  "--luca-skin-boot-highlight",
  "--luca-skin-motion-speed",
  "--luca-skin-motion-softness",
  "--luca-skin-motion-glow",
] as const;

export type LucaSkinCssVariableName = (typeof LUCA_SKIN_CSS_VARIABLE_NAMES)[number];

export type LucaSkinCssVariableMap = Record<LucaSkinCssVariableName, string>;

export interface LucaSkinRegistryOptions {
  skinId?: unknown;
  hostKind?: LucaSkinHostKind;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
}

const STATIC_MOTION_VALUES = {
  speed: "static",
  softness: "none",
  glow: "none",
} as const;

function toCssNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : "0";
}

function toCssPx(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  return `${safeValue}px`;
}

function capBlurPx(value: number, maxBlurPx?: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const safeValue = Math.max(0, value);
  return typeof maxBlurPx === "number" && Number.isFinite(maxBlurPx)
    ? Math.min(safeValue, Math.max(0, maxBlurPx))
    : safeValue;
}

export function getLucaSkinCssVariables(
  options: LucaSkinRegistryOptions = {},
): LucaSkinCssVariableMap {
  const skin = getLucaSkinDefinition(options.skinId);
  const hostPolicy = options.hostKind
    ? skin.hostPolicyHints?.[options.hostKind]
    : undefined;

  let glassBlurPx = capBlurPx(skin.materialProfile.glassBlurPx, hostPolicy?.maxBlurPx);
  let glassOpacity = skin.materialProfile.glassOpacity;

  if (hostPolicy?.preferSolidFallback) {
    glassBlurPx = Math.min(glassBlurPx, 4);
    glassOpacity = Math.min(1, Math.max(glassOpacity, 0.9));
  }

  if (options.reducedTransparency) {
    glassBlurPx = 0;
    glassOpacity = 1;
  }

  const shouldUseStaticMotion =
    options.reducedMotion || hostPolicy?.allowAmbientMotion === false;
  const motion = shouldUseStaticMotion
    ? STATIC_MOTION_VALUES
    : skin.motionProfile;

  const lightSurface = skin.materialTone === "light";
  const glassHighlight = lightSurface
    ? `color-mix(in srgb, white 78%, ${skin.accentProfile.primary})`
    : "rgb(255 255 255 / 0.14)";
  const glassRim = lightSurface
    ? `color-mix(in srgb, ${skin.typographyProfile.secondary} 42%, transparent)`
    : "rgb(255 255 255 / 0.24)";
  const glassShadow = lightSurface
    ? `color-mix(in srgb, ${skin.typographyProfile.primary} 26%, transparent)`
    : "rgb(0 0 0 / 0.18)";
  const glassSheen = lightSurface
    ? `color-mix(in srgb, ${skin.accentProfile.secondary} 20%, transparent)`
    : "rgb(255 255 255 / 0.07)";

  return {
    "--luca-skin-bg-base": skin.backgroundProfile.base,
    "--luca-skin-bg-elevated": skin.backgroundProfile.elevated,
    "--luca-skin-bg-ambient": skin.backgroundProfile.ambient,
    "--luca-skin-bg-hero": skin.backgroundProfile.hero,
    "--luca-skin-glass-opacity": toCssNumber(glassOpacity),
    "--luca-skin-glass-blur": toCssPx(glassBlurPx),
    "--luca-skin-glass-highlight": glassHighlight,
    "--luca-skin-glass-rim": glassRim,
    "--luca-skin-glass-shadow": glassShadow,
    "--luca-skin-glass-sheen": glassSheen,
    "--luca-skin-border-strength": toCssNumber(skin.materialProfile.borderStrength),
    "--luca-skin-shadow-soft": skin.materialProfile.shadowSoft,
    "--luca-skin-shadow-float": skin.materialProfile.shadowFloat,
    "--luca-skin-accent-primary": skin.accentProfile.primary,
    "--luca-skin-accent-secondary": skin.accentProfile.secondary,
    "--luca-skin-accent-glow": skin.accentProfile.glow,
    "--luca-skin-text-primary": skin.typographyProfile.primary,
    "--luca-skin-text-secondary": skin.typographyProfile.secondary,
    "--luca-skin-text-tertiary": skin.typographyProfile.tertiary,
    "--luca-skin-boot-bg": skin.bootProfile.background,
    "--luca-skin-boot-orb": skin.bootProfile.orb,
    "--luca-skin-boot-highlight": skin.bootProfile.highlight,
    "--luca-skin-motion-speed": motion.speed,
    "--luca-skin-motion-softness": motion.softness,
    "--luca-skin-motion-glow": motion.glow,
  };
}

export function getDefaultLucaSkinCssVariables(): LucaSkinCssVariableMap {
  return getLucaSkinCssVariables({ skinId: DEFAULT_LUCA_SKIN_ID });
}

export function getLucaSkinCssVariableEntries(
  options?: LucaSkinRegistryOptions,
): Array<[LucaSkinCssVariableName, string]> {
  const variables = getLucaSkinCssVariables(options);

  return LUCA_SKIN_CSS_VARIABLE_NAMES.map((name) => [name, variables[name]]);
}
