export type LucaSkinId = "pearl" | "carbon" | "flow" | "canvas";

export type LucaSkinModeAffinity = "light" | "dark" | "adaptive" | "warm";

export type LucaSkinHostKind =
  | "desktop-app"
  | "desktop-web"
  | "mobile-app"
  | "mobile-web";

export type LucaSkinBackgroundPattern =
  | "solid"
  | "gradient"
  | "ambient"
  | "liquid"
  | "wallpaper";

export type LucaSkinMaterialProfile =
  | "solid"
  | "glass"
  | "liquid-glass"
  | "paper"
  | "graphite";

export type LucaSkinTypographyMood =
  | "system-clean"
  | "editorial"
  | "developer"
  | "futuristic-calm";

export type LucaSkinBootMotion = "calm" | "minimal" | "fluid";

export type LucaSkinPresenceBlend = "screen" | "normal";

export interface LucaSkinDefinition {
  id: LucaSkinId;
  name: string;
  shortName: string;
  description: string;
  recommendedDefault?: boolean;
  modeAffinity: LucaSkinModeAffinity;
  backgroundProfile: {
    base: string;
    elevated: string;
    ambient: string;
    hero: string;
    pattern: LucaSkinBackgroundPattern;
  };
  materialProfile: {
    glassOpacity: number;
    glassBlurPx: number;
    borderStrength: number;
    shadowSoft: string;
    shadowFloat: string;
    profile: LucaSkinMaterialProfile;
  };
  accentProfile: {
    primary: string;
    secondary: string;
    glow: string;
  };
  typographyProfile: {
    primary: string;
    secondary: string;
    tertiary: string;
    mood: LucaSkinTypographyMood;
  };
  bootProfile: {
    background: string;
    orb: string;
    highlight: string;
    motion: LucaSkinBootMotion;
  };
  motionProfile: {
    speed: string;
    softness: string;
    glow: string;
    reducedMotionFallback: boolean;
  };
  /**
   * Presence visuals for the onboarding "three-state presence" system
   * (see docs/luca-onboarding-presence-visual-language-spec.md): the ambient
   * blurred Luca face, the sharp identity face, and the voice orb. This is
   * inert data only — no component consumes it until the staged presence work.
   * It intentionally carries no status/safety semantics.
   */
  presenceProfile: {
    /** Opacity of the ambient (blurred) Luca face background overlay. */
    ambientOpacity: number;
    /** Blend mode for the ambient face: screen on dark skins, normal on light. */
    ambientBlend: LucaSkinPresenceBlend;
    /** Blur applied to the ambient face overlay, in px (host policy may cap it). */
    ambientBlurPx: number;
    /** Edge-bloom strength (0..1) for identity moments (welcome/finish/voice). */
    bloomIntensity: number;
    /** Whether the edge bloom is iridescent (Flow) or a soft monochrome glow. */
    bloomIridescent: boolean;
    /** CSS background for the presence/voice orb, tinted per skin. */
    orbGradient: string;
    /** CSS filter for the sharp identity face (glow on dark, soft shadow on light). */
    faceSharpFilter: string;
  };
  hostPolicyHints?: Partial<
    Record<
      LucaSkinHostKind,
      {
        maxBlurPx?: number;
        preferSolidFallback?: boolean;
        allowAmbientMotion?: boolean;
      }
    >
  >;
}

export const LUCA_SKIN_IDS = ["pearl", "carbon", "flow", "canvas"] as const;

export const LUCA_SKINS: Readonly<Record<LucaSkinId, LucaSkinDefinition>> = {
  pearl: {
    id: "pearl",
    name: "LucaOS Pearl",
    shortName: "Pearl",
    description:
      "A bright, quiet default environment with pearl-white surfaces, gentle glass, and highly readable graphite text.",
    recommendedDefault: true,
    modeAffinity: "light",
    backgroundProfile: {
      base: "#f7f6f2",
      elevated: "#ffffff",
      ambient: "rgba(225, 232, 240, 0.72)",
      hero: "linear-gradient(135deg, #fbfaf7 0%, #eef3f7 52%, #f8f2ea 100%)",
      pattern: "ambient",
    },
    materialProfile: {
      glassOpacity: 0.74,
      glassBlurPx: 12,
      borderStrength: 0.38,
      shadowSoft: "0 18px 50px rgba(52, 64, 84, 0.12)",
      shadowFloat: "0 28px 70px rgba(52, 64, 84, 0.16)",
      profile: "glass",
    },
    accentProfile: {
      primary: "#4f7f96",
      secondary: "#8aa6b4",
      glow: "rgba(79, 127, 150, 0.16)",
    },
    typographyProfile: {
      primary: "#17202a",
      secondary: "#4f5e68",
      tertiary: "#7d8a93",
      mood: "system-clean",
    },
    bootProfile: {
      background: "#f7f6f2",
      orb: "#fdfbf7",
      highlight: "#dbe7ef",
      motion: "calm",
    },
    motionProfile: {
      speed: "calm",
      softness: "soft",
      glow: "minimal",
      reducedMotionFallback: true,
    },
    presenceProfile: {
      ambientOpacity: 0.5,
      ambientBlend: "normal",
      ambientBlurPx: 30,
      bloomIntensity: 0.25,
      bloomIridescent: false,
      orbGradient:
        "radial-gradient(60% 50% at 35% 30%, #ffffff, transparent 60%), conic-gradient(from 200deg, #bcd9e2, #9fc0d6, #cbbfe0, #bcd9e2)",
      faceSharpFilter: "drop-shadow(0 10px 22px rgba(70, 120, 140, 0.3))",
    },
  },
  carbon: {
    id: "carbon",
    name: "LucaOS Carbon",
    shortName: "Carbon",
    description:
      "A focused charcoal environment with graphite materials, restrained accents, and comfortable dark-mode readability.",
    modeAffinity: "dark",
    backgroundProfile: {
      base: "#111417",
      elevated: "#1b2025",
      ambient: "rgba(45, 52, 60, 0.66)",
      hero: "linear-gradient(135deg, #101316 0%, #1a2026 56%, #24272b 100%)",
      pattern: "solid",
    },
    materialProfile: {
      glassOpacity: 0.82,
      glassBlurPx: 10,
      borderStrength: 0.46,
      shadowSoft: "0 18px 48px rgba(0, 0, 0, 0.34)",
      shadowFloat: "0 30px 80px rgba(0, 0, 0, 0.42)",
      profile: "graphite",
    },
    accentProfile: {
      primary: "#9fb3c2",
      secondary: "#6f7f8d",
      glow: "rgba(159, 179, 194, 0.18)",
    },
    typographyProfile: {
      primary: "#f2f5f7",
      secondary: "#bac5cc",
      tertiary: "#89949c",
      mood: "developer",
    },
    bootProfile: {
      background: "#111417",
      orb: "#26313a",
      highlight: "#b4c3cf",
      motion: "minimal",
    },
    motionProfile: {
      speed: "precise",
      softness: "controlled",
      glow: "restrained",
      reducedMotionFallback: true,
    },
    presenceProfile: {
      ambientOpacity: 0.45,
      ambientBlend: "screen",
      ambientBlurPx: 34,
      bloomIntensity: 0.3,
      bloomIridescent: false,
      orbGradient:
        "radial-gradient(60% 50% at 35% 30%, rgba(255, 255, 255, 0.5), transparent 60%), conic-gradient(from 200deg, #7fa6c0, #6f88a0, #9aa6c0, #7fa6c0)",
      faceSharpFilter:
        "drop-shadow(0 0 22px rgba(150, 180, 200, 0.45)) brightness(1.05)",
    },
  },
  flow: {
    id: "flow",
    name: "LucaOS Flow",
    shortName: "Flow",
    description:
      "A gently adaptive liquid environment with soft gradients, layered glass, and motion designed to stay behind the work.",
    modeAffinity: "adaptive",
    backgroundProfile: {
      base: "#eef5f7",
      elevated: "rgba(255, 255, 255, 0.76)",
      ambient: "rgba(143, 183, 194, 0.42)",
      hero: "linear-gradient(135deg, #eaf4f6 0%, #dfe8fb 46%, #f4ece2 100%)",
      pattern: "liquid",
    },
    materialProfile: {
      glassOpacity: 0.62,
      glassBlurPx: 22,
      borderStrength: 0.34,
      shadowSoft: "0 20px 60px rgba(65, 91, 112, 0.16)",
      shadowFloat: "0 34px 90px rgba(65, 91, 112, 0.22)",
      profile: "liquid-glass",
    },
    accentProfile: {
      primary: "#5f8fa3",
      secondary: "#9d8fc7",
      glow: "rgba(95, 143, 163, 0.24)",
    },
    typographyProfile: {
      primary: "#17232c",
      secondary: "#4e6270",
      tertiary: "#78909d",
      mood: "futuristic-calm",
    },
    bootProfile: {
      background:
        "linear-gradient(135deg, #eaf4f6 0%, #dfe8fb 55%, #f4ece2 100%)",
      orb: "#f7fbff",
      highlight: "#9fc7d6",
      motion: "fluid",
    },
    motionProfile: {
      speed: "slow-fluid",
      softness: "liquid",
      glow: "soft",
      reducedMotionFallback: true,
    },
    presenceProfile: {
      ambientOpacity: 0.55,
      ambientBlend: "screen",
      ambientBlurPx: 32,
      bloomIntensity: 0.7,
      bloomIridescent: true,
      orbGradient:
        "radial-gradient(60% 50% at 35% 30%, rgba(255, 255, 255, 0.6), transparent 60%), conic-gradient(from 200deg, #69d6e6, #6aa0f2, #b58cf2, #f29ec9, #7fe0d6, #69d6e6)",
      faceSharpFilter:
        "drop-shadow(0 0 26px rgba(120, 210, 225, 0.6)) brightness(1.1)",
    },
    hostPolicyHints: {
      "desktop-web": {
        maxBlurPx: 16,
        allowAmbientMotion: false,
      },
      "mobile-app": {
        maxBlurPx: 12,
        preferSolidFallback: true,
        allowAmbientMotion: false,
      },
      "mobile-web": {
        maxBlurPx: 10,
        preferSolidFallback: true,
        allowAmbientMotion: false,
      },
    },
  },
  canvas: {
    id: "canvas",
    name: "LucaOS Canvas",
    shortName: "Canvas",
    description:
      "A warm editorial environment with cream paper surfaces, matte separation, and high-contrast text for long thinking sessions.",
    modeAffinity: "warm",
    backgroundProfile: {
      base: "#f4eadc",
      elevated: "#fff8ed",
      ambient: "rgba(202, 160, 111, 0.18)",
      hero: "linear-gradient(135deg, #fff7ea 0%, #f1e2cf 58%, #ead8bf 100%)",
      pattern: "solid",
    },
    materialProfile: {
      glassOpacity: 0.95,
      glassBlurPx: 0,
      borderStrength: 0.42,
      shadowSoft: "0 14px 34px rgba(102, 74, 43, 0.12)",
      shadowFloat: "0 24px 60px rgba(102, 74, 43, 0.16)",
      profile: "paper",
    },
    accentProfile: {
      primary: "#9b653d",
      secondary: "#c19161",
      glow: "rgba(155, 101, 61, 0.10)",
    },
    typographyProfile: {
      primary: "#2a2118",
      secondary: "#5f4c3b",
      tertiary: "#887260",
      mood: "editorial",
    },
    bootProfile: {
      background: "#f4eadc",
      orb: "#fff6e8",
      highlight: "#d6a974",
      motion: "calm",
    },
    motionProfile: {
      speed: "calm",
      softness: "matte",
      glow: "minimal",
      reducedMotionFallback: true,
    },
    presenceProfile: {
      ambientOpacity: 0.42,
      ambientBlend: "normal",
      ambientBlurPx: 30,
      bloomIntensity: 0.2,
      bloomIridescent: false,
      orbGradient:
        "radial-gradient(60% 50% at 35% 30%, #ffffff, transparent 60%), conic-gradient(from 200deg, #e6c79a, #d6a974, #c9a98a, #e6c79a)",
      faceSharpFilter: "drop-shadow(0 10px 22px rgba(120, 80, 40, 0.3))",
    },
  },
} as const;

export const DEFAULT_LUCA_SKIN_ID: LucaSkinId = "pearl";

export function isLucaSkinId(value: unknown): value is LucaSkinId {
  return typeof value === "string" && value in LUCA_SKINS;
}

export function normalizeLucaSkinId(value: unknown): LucaSkinId {
  return isLucaSkinId(value) ? value : DEFAULT_LUCA_SKIN_ID;
}

export function getLucaSkinDefinition(value?: unknown): LucaSkinDefinition {
  return LUCA_SKINS[normalizeLucaSkinId(value)];
}
