import { DEFAULT_LUCA_SKIN_ID, type LucaSkinHostKind } from "../config/lucaSkins";
import { getLucaSkinCssVariables } from "./lucaSkinRegistry";

export const LUCA_SKIN_MATERIAL_VARIABLE_NAMES = [
  "--luca-background-base",
  "--luca-background-elevated",
  "--luca-background-liquid",
  "--luca-surface-glass",
  "--luca-surface-solid",
  "--luca-surface-hover",
  "--luca-text-primary",
  "--luca-text-secondary",
  "--luca-text-tertiary",
  "--luca-accent-primary",
  "--luca-accent-soft",
  "--luca-material-opacity",
  "--luca-material-blur",
  "--luca-material-glass-highlight",
  "--luca-material-glass-rim",
  "--luca-material-glass-shadow",
  "--luca-material-glass-sheen",
  "--luca-material-border-strength",
  "--luca-material-shadow",
  "--luca-shadow-soft",
  "--luca-shadow-glow",
] as const;

export type LucaSkinMaterialVariableName =
  (typeof LUCA_SKIN_MATERIAL_VARIABLE_NAMES)[number];

export type LucaSkinMaterialVariableMap = Record<LucaSkinMaterialVariableName, string>;

export interface LucaSkinMaterialBridgeOptions {
  /** User-chosen glass opacity (0..1) — overrides the skin default. */
  userMaterialOpacity?: number;
  /** User-chosen material blur in px — overrides the skin default. */
  userMaterialBlurPx?: number;
  skinId?: unknown;
  hostKind?: LucaSkinHostKind;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
}

/**
 * Maps resolved skin environment variables into Luca Material/appearance targets.
 *
 * This bridge is pure/inert plumbing: it does not write to the DOM, apply CSS
 * variables, import React, or wire any root/provider consumption. Existing Luca
 * Material roles remain the component-facing enforcement layer.
 *
 * Safety and status colors intentionally remain outside skin control. Do not add
 * danger, warning, success, info, approval, permission, blocked-action,
 * mission-pending, active voice/listening, active vision/screen-context, or
 * stop-generation variables to this bridge.
 */
export function getLucaSkinMaterialVariables(
  options: LucaSkinMaterialBridgeOptions = {},
): LucaSkinMaterialVariableMap {
  const skinVariables = getLucaSkinCssVariables(options);

  return {
    "--luca-background-base": skinVariables["--luca-skin-bg-base"],
    "--luca-background-elevated": skinVariables["--luca-skin-bg-elevated"],
    "--luca-background-liquid":
      skinVariables["--luca-skin-bg-hero"] || skinVariables["--luca-skin-bg-ambient"],
    "--luca-surface-glass": skinVariables["--luca-skin-bg-elevated"],
    "--luca-surface-solid": skinVariables["--luca-skin-bg-elevated"],
    "--luca-surface-hover": skinVariables["--luca-skin-bg-ambient"],
    "--luca-text-primary": skinVariables["--luca-skin-text-primary"],
    "--luca-text-secondary": skinVariables["--luca-skin-text-secondary"],
    "--luca-text-tertiary": skinVariables["--luca-skin-text-tertiary"],
    "--luca-accent-primary": skinVariables["--luca-skin-accent-primary"],
    "--luca-accent-soft": skinVariables["--luca-skin-accent-secondary"],
    // User-chosen material values (Settings -> Appearance) override the
    // skin defaults — this is what lets the sliders act on the WHOLE app:
    // boundaries apply these inline, which would otherwise shadow any
    // :root-level live writes.
    "--luca-material-opacity":
      options.userMaterialOpacity !== undefined
        ? String(options.userMaterialOpacity)
        : skinVariables["--luca-skin-glass-opacity"],
    "--luca-material-blur":
      options.userMaterialBlurPx !== undefined
        ? `${options.userMaterialBlurPx}px`
        : skinVariables["--luca-skin-glass-blur"],
    "--luca-material-glass-highlight": skinVariables["--luca-skin-glass-highlight"],
    "--luca-material-glass-rim": skinVariables["--luca-skin-glass-rim"],
    "--luca-material-glass-shadow": skinVariables["--luca-skin-glass-shadow"],
    "--luca-material-glass-sheen": skinVariables["--luca-skin-glass-sheen"],
    "--luca-material-border-strength": skinVariables["--luca-skin-border-strength"],
    "--luca-material-shadow": skinVariables["--luca-skin-shadow-float"],
    "--luca-shadow-soft": skinVariables["--luca-skin-shadow-soft"],
    "--luca-shadow-glow": skinVariables["--luca-skin-accent-glow"],
  };
}

export function getDefaultLucaSkinMaterialVariables(): LucaSkinMaterialVariableMap {
  return getLucaSkinMaterialVariables({ skinId: DEFAULT_LUCA_SKIN_ID });
}

export function getLucaSkinMaterialVariableEntries(
  options?: LucaSkinMaterialBridgeOptions,
): Array<[LucaSkinMaterialVariableName, string]> {
  const variables = getLucaSkinMaterialVariables(options);

  return LUCA_SKIN_MATERIAL_VARIABLE_NAMES.map((name) => [name, variables[name]]);
}
