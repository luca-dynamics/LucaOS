export interface QualityPreset {
  name: string;
  fbmOctaves: number;
  particleCount: number;
  bloomResolution: number;
  enableFilmGrain: boolean;
  enableChromaticAberration: boolean;
}

export type QualityTier = "ultra" | "high" | "medium" | "low";

export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  ultra: {
    name: "Ultra (120Hz)",
    fbmOctaves: 6,
    particleCount: 24,
    bloomResolution: 1.0,
    enableFilmGrain: true,
    enableChromaticAberration: true,
  },
  high: {
    name: "High (60Hz)",
    fbmOctaves: 5,
    particleCount: 16,
    bloomResolution: 0.8,
    enableFilmGrain: true,
    enableChromaticAberration: true,
  },
  medium: {
    name: "Medium (Balanced)",
    fbmOctaves: 4,
    particleCount: 8,
    bloomResolution: 0.5,
    enableFilmGrain: false,
    enableChromaticAberration: true,
  },
  low: {
    name: "Low (Power Saver)",
    fbmOctaves: 3,
    particleCount: 0,
    bloomResolution: 0.25,
    enableFilmGrain: false,
    enableChromaticAberration: false,
  },
};

export class AdaptiveQualityEngine {
  public static getPreset(tier: QualityTier): QualityPreset {
    return QUALITY_PRESETS[tier] || QUALITY_PRESETS.high;
  }
}
