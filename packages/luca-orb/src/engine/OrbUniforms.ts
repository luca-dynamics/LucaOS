import { OrbAccessibility, createAccessibilityProfile } from "./OrbAccessibility";
import { OrbTheme, validateOrbTheme } from "./OrbTheme";

export interface OrbUniforms {
  resolution: [number, number];
  time: number;
  radius: number;
  intensity: number;
  audioLevel: number;
  colorCore: [number, number, number];
  colorPrimary: [number, number, number];
  colorSec: [number, number, number];
  colorRim: [number, number, number];
  fresnelStr: number;
  refractionStr: number;
  glowStrength: number;
  bloomStrength: number;
  flowSpeed: number;
  contrastBoost: number;
  opacityBoost: number;
}

export function createDefaultOrbUniforms(
  width: number,
  height: number,
  accessibility?: OrbAccessibility,
  theme?: OrbTheme
): OrbUniforms {
  const accessProfile = createAccessibilityProfile(accessibility);
  const validatedTheme = validateOrbTheme(theme);

  const primary: [number, number, number] = validatedTheme.glowTint || [0.22, 0.74, 0.97];
  const rim: [number, number, number] = validatedTheme.ambientTint || [0.06, 0.46, 0.43];
  const bloomMult = validatedTheme.bloomScale ?? 1.0;

  return {
    resolution: [width, height],
    time: 0,
    radius: 0.32,
    intensity: 0.35,
    audioLevel: 0,
    colorCore: [1.0, 1.0, 1.0],
    colorPrimary: primary,
    colorSec: [0.02, 0.71, 0.83],
    colorRim: rim,
    fresnelStr: 0.85 * accessProfile.contrastBoost,
    refractionStr: 0.7,
    glowStrength: 0.6,
    bloomStrength: 0.4 * bloomMult,
    flowSpeed: 0.6 * accessProfile.flowScale,
    contrastBoost: accessProfile.contrastBoost,
    opacityBoost: accessProfile.opacityBoost,
  };
}
