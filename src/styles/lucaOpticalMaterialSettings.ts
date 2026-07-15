export interface LucaLiquidGlassTuning {
  light: number;
  refraction: number;
  depth: number;
  dispersion: number;
  frost: number;
  edgeFalloff: number;
}

export interface LucaChromaticMetalTuning {
  rounding: number;
  depth: number;
  roughness: number;
  rgbSplit: number;
  scale: number;
  stretch: number;
  angle: number;
  repeats: number;
  offset: number;
  phase: number;
  evolution: number;
  gradient: readonly string[];
}

export interface LucaOpticalMaterialSettings {
  glass: LucaLiquidGlassTuning;
  metal: LucaChromaticMetalTuning;
}

export const DEFAULT_LUCA_OPTICAL_MATERIAL: LucaOpticalMaterialSettings = {
  glass: {
    light: 0.72,
    refraction: 0.58,
    depth: 0.64,
    dispersion: 0.28,
    frost: 0.08,
    edgeFalloff: 0.76,
  },
  metal: {
    rounding: 1,
    depth: 0.74,
    roughness: 0.18,
    rgbSplit: 0.34,
    scale: 1,
    stretch: 1.18,
    angle: -18,
    repeats: 4.5,
    offset: 0,
    phase: 0.18,
    evolution: 0.24,
    gradient: ["#050607", "#f9fbff", "#293038", "#ffffff", "#0b0d10", "#8fe5ed"],
  },
};

const finite = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const clamp = (value: unknown, fallback: number, min: number, max: number) =>
  Math.min(max, Math.max(min, finite(value, fallback)));

export function normalizeLucaOpticalMaterialSettings(
  value?: Partial<LucaOpticalMaterialSettings> | null,
): LucaOpticalMaterialSettings {
  const glass = value?.glass ?? {};
  const metal = value?.metal ?? {};
  const defaults = DEFAULT_LUCA_OPTICAL_MATERIAL;
  const gradient = Array.isArray(metal.gradient)
    ? metal.gradient.filter((stop): stop is string => typeof stop === "string").slice(0, 8)
    : [];

  return {
    glass: {
      light: clamp(glass.light, defaults.glass.light, 0, 1),
      refraction: clamp(glass.refraction, defaults.glass.refraction, 0, 1),
      depth: clamp(glass.depth, defaults.glass.depth, 0, 1),
      dispersion: clamp(glass.dispersion, defaults.glass.dispersion, 0, 1),
      frost: clamp(glass.frost, defaults.glass.frost, 0, 1),
      edgeFalloff: clamp(glass.edgeFalloff, defaults.glass.edgeFalloff, 0.2, 1),
    },
    metal: {
      rounding: clamp(metal.rounding, defaults.metal.rounding, 0, 1),
      depth: clamp(metal.depth, defaults.metal.depth, 0, 1),
      roughness: clamp(metal.roughness, defaults.metal.roughness, 0, 1),
      rgbSplit: clamp(metal.rgbSplit, defaults.metal.rgbSplit, 0, 1),
      scale: clamp(metal.scale, defaults.metal.scale, 0.25, 4),
      stretch: clamp(metal.stretch, defaults.metal.stretch, 0.25, 4),
      angle: clamp(metal.angle, defaults.metal.angle, -180, 180),
      repeats: clamp(metal.repeats, defaults.metal.repeats, 1, 12),
      offset: clamp(metal.offset, defaults.metal.offset, -2, 2),
      phase: clamp(metal.phase, defaults.metal.phase, 0, 1),
      evolution: clamp(metal.evolution, defaults.metal.evolution, 0, 1),
      gradient: gradient.length >= 2 ? gradient : [...defaults.metal.gradient],
    },
  };
}

export function getLucaOpticalMaterialCssVariables(
  value?: Partial<LucaOpticalMaterialSettings> | null,
): Record<string, string> {
  const tuning = normalizeLucaOpticalMaterialSettings(value);
  return {
    "--luca-glass-light": String(tuning.glass.light),
    "--luca-glass-refraction": String(tuning.glass.refraction),
    "--luca-glass-depth": String(tuning.glass.depth),
    "--luca-glass-dispersion": String(tuning.glass.dispersion),
    "--luca-glass-frost": String(tuning.glass.frost),
    "--luca-glass-edge-falloff": String(tuning.glass.edgeFalloff),
    "--luca-metal-depth": String(tuning.metal.depth),
    "--luca-metal-roughness": String(tuning.metal.roughness),
    "--luca-metal-rgb-split": String(tuning.metal.rgbSplit),
    "--luca-metal-evolution": String(tuning.metal.evolution),
  };
}
