import { OrbMaterial } from "./MaterialEngine";

export interface OrbTheme {
  material?: OrbMaterial;
  glowTint?: [number, number, number];
  ambientTint?: [number, number, number];
  bloomScale?: number;
  reflectionTint?: [number, number, number];
  rimTint?: [number, number, number];
}

export function validateOrbTheme(theme?: OrbTheme): OrbTheme {
  if (!theme) return {};
  return {
    ...theme,
    bloomScale: theme.bloomScale !== undefined ? Math.max(0, Math.min(2.0, theme.bloomScale)) : undefined,
  };
}
