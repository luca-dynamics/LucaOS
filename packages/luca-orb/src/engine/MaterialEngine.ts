export interface OrbMaterial {
  name: string;
  baseColors: [string, string, string, string]; // Core White -> Primary -> Secondary -> Rim
  fresnelStrength: number;
  refractionStrength: number;
  glowStrength: number;
  noiseScale: number;
  bloomStrength: number;
}

export const ORB_MATERIALS: Record<string, OrbMaterial> = {
  liquidGlass: {
    name: "Liquid Glass",
    baseColors: ["#ffffff", "#38bdf8", "#06b6d4", "#0f766e"],
    fresnelStrength: 0.85,
    refractionStrength: 0.7,
    glowStrength: 0.6,
    noiseScale: 1.0,
    bloomStrength: 0.4,
  },
  crystal: {
    name: "Crystal",
    baseColors: ["#ffffff", "#a855f7", "#ec4899", "#6b21a8"],
    fresnelStrength: 0.95,
    refractionStrength: 0.9,
    glowStrength: 0.8,
    noiseScale: 0.8,
    bloomStrength: 0.5,
  },
  aurora: {
    name: "Aurora",
    baseColors: ["#ffffff", "#34d399", "#818cf8", "#4338ca"],
    fresnelStrength: 0.75,
    refractionStrength: 0.65,
    glowStrength: 0.7,
    noiseScale: 1.2,
    bloomStrength: 0.6,
  },
  energy: {
    name: "Energy",
    baseColors: ["#ffffff", "#fbbf24", "#f97316", "#c2410c"],
    fresnelStrength: 0.9,
    refractionStrength: 0.5,
    glowStrength: 0.95,
    noiseScale: 1.5,
    bloomStrength: 0.8,
  },
  hologram: {
    name: "Hologram",
    baseColors: ["#ffffff", "#22d3ee", "#818cf8", "#312e81"],
    fresnelStrength: 0.8,
    refractionStrength: 0.8,
    glowStrength: 0.5,
    noiseScale: 1.1,
    bloomStrength: 0.3,
  },
  nebula: {
    name: "Nebula",
    baseColors: ["#ffffff", "#f43f5e", "#8b5cf6", "#1e1b4b"],
    fresnelStrength: 0.88,
    refractionStrength: 0.75,
    glowStrength: 0.75,
    noiseScale: 1.3,
    bloomStrength: 0.7,
  },
};

export class MaterialEngine {
  public static getMaterial(preset: string | OrbMaterial): OrbMaterial {
    if (typeof preset === "string") {
      return ORB_MATERIALS[preset] || ORB_MATERIALS.liquidGlass;
    }
    return preset;
  }
}
