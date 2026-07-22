export type LucaSkinId =
  | "pearl"
  | "carbon"
  | "flow"
  | "canvas"
  | "graphite"
  | "onyx"
  | "dusk"
  | "mist";

export type LucaSkinModeAffinity = "light" | "dark" | "adaptive" | "warm";
export type LucaSkinMaterialTone = "light" | "dark";

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
  /** Optical polarity for rims, highlights, and shadows; independent of mode behavior. */
  materialTone: LucaSkinMaterialTone;
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

export const LUCA_SKIN_IDS = [
  "pearl",
  "carbon",
  "flow",
  "canvas",
  "graphite",
  "onyx",
  "dusk",
  "mist",
] as const;

export const LUCA_SKINS: Readonly<Record<LucaSkinId, LucaSkinDefinition>> = {
  pearl: {
    id: "pearl",
    name: "Luca Light",
    shortName: "Luca Light",
    description:
      "The glacier-light default environment: an ice-blue luminous base, frosted glass, ink-graphite text, and the hologram's own palette — one look from boot to workspace.",
    recommendedDefault: true,
    modeAffinity: "light",
    materialTone: "light",
    backgroundProfile: {
      // The boot/onboarding glacier, verbatim — the app opens into the same
      // world the splash faded up from.
      base: "#e2edf2",
      elevated: "#f3f9fc",
      ambient: "rgba(158, 186, 202, 0.42)",
      hero: "radial-gradient(55% 70% at 72% 42%, rgba(238, 249, 251, 0.92) 0%, rgba(238, 249, 251, 0) 60%), radial-gradient(80% 100% at 18% 28%, rgba(243, 250, 252, 0.7) 0%, rgba(243, 250, 252, 0) 55%), linear-gradient(160deg, #e2edf2 0%, #d8e4ec 48%, #c9d9e3 100%)",
      pattern: "ambient",
    },
    materialProfile: {
      glassOpacity: 0.82,
      glassBlurPx: 16,
      borderStrength: 0.62,
      shadowSoft: "0 12px 30px rgba(120, 150, 190, 0.16)",
      shadowFloat: "0 24px 60px rgba(118, 150, 192, 0.24)",
      profile: "glass",
    },
    accentProfile: {
      primary: "#3d8fa6",
      secondary: "#7fa9d8",
      glow: "rgba(61, 143, 166, 0.16)",
    },
    typographyProfile: {
      primary: "#2b303a",
      secondary: "#5b636f",
      tertiary: "#8b929d",
      mood: "system-clean",
    },
    bootProfile: {
      background: "#e2edf2",
      orb: "#f3f9fc",
      highlight: "#d8f3f8",
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
    name: "Luca Dark",
    shortName: "Luca Dark",
    description:
      "The glacier identity after dark: deep ice-slate materials, the same teal light and frosted glass, tuned for comfortable night readability.",
    modeAffinity: "dark",
    materialTone: "dark",
    backgroundProfile: {
      // The dark sibling of Pearl's glacier — same gradient structure
      // (luminous glow right-of-center, soft light upper-left, cool base),
      // rendered in deep ice-slate instead of daylight ice.
      base: "#10161b",
      elevated: "#182128",
      ambient: "rgba(40, 58, 70, 0.6)",
      hero: "radial-gradient(55% 70% at 72% 42%, rgba(32, 48, 58, 0.9) 0%, rgba(32, 48, 58, 0) 60%), radial-gradient(80% 100% at 18% 28%, rgba(24, 36, 44, 0.7) 0%, rgba(24, 36, 44, 0) 55%), linear-gradient(160deg, #121a20 0%, #10171d 48%, #0b1115 100%)",
      pattern: "ambient",
    },
    materialProfile: {
      glassOpacity: 0.82,
      glassBlurPx: 14,
      borderStrength: 0.46,
      shadowSoft: "0 18px 48px rgba(0, 0, 0, 0.34)",
      shadowFloat: "0 30px 80px rgba(0, 0, 0, 0.42)",
      profile: "graphite",
    },
    accentProfile: {
      // The same teal/blue family as Pearl, brightened for dark surfaces.
      primary: "#57b2c9",
      secondary: "#8fb8e8",
      glow: "rgba(87, 178, 201, 0.2)",
    },
    typographyProfile: {
      primary: "#e8edf2",
      secondary: "#a8b3bd",
      tertiary: "#76818c",
      mood: "developer",
    },
    bootProfile: {
      background: "#10161b",
      orb: "#182128",
      highlight: "#1d3540",
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
        "radial-gradient(60% 50% at 35% 30%, rgba(255, 255, 255, 0.5), transparent 60%), conic-gradient(from 200deg, #6fc2d8, #4f92ac, #8fb8e8, #6fc2d8)",
      faceSharpFilter:
        "drop-shadow(0 4px 14px rgba(0, 0, 0, 0.45)) brightness(1.03)",
    },
  },
  flow: {
    id: "flow",
    name: "Luca Flow",
    shortName: "Luca Flow",
    description:
      "A gently adaptive liquid environment with soft gradients, layered glass, and motion designed to stay behind the work.",
    modeAffinity: "adaptive",
    materialTone: "light",
    backgroundProfile: {
      base: "#e5eef2",
      elevated: "#f8fbfc",
      ambient: "rgba(100, 147, 165, 0.36)",
      hero: "linear-gradient(135deg, #edf6f7 0%, #d7e4f5 46%, #f0e7dc 100%)",
      pattern: "liquid",
    },
    materialProfile: {
      glassOpacity: 0.78,
      glassBlurPx: 22,
      borderStrength: 0.56,
      shadowSoft: "0 16px 46px rgba(52, 78, 98, 0.19)",
      shadowFloat: "0 28px 74px rgba(52, 78, 98, 0.25)",
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
    name: "Luca Canvas",
    shortName: "Luca Canvas",
    description:
      "A warm editorial environment with cream paper surfaces, matte separation, and high-contrast text for long thinking sessions.",
    modeAffinity: "warm",
    materialTone: "light",
    backgroundProfile: {
      base: "#eee2d1",
      elevated: "#fff8ec",
      ambient: "rgba(170, 118, 65, 0.24)",
      hero: "linear-gradient(135deg, #fff9ef 0%, #ead8c1 58%, #dfc8a9 100%)",
      pattern: "solid",
    },
    materialProfile: {
      glassOpacity: 0.95,
      glassBlurPx: 0,
      borderStrength: 0.58,
      shadowSoft: "0 12px 32px rgba(92, 63, 34, 0.17)",
      shadowFloat: "0 22px 56px rgba(92, 63, 34, 0.22)",
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
  graphite: {
    id: "graphite",
    name: "Luca Graphite",
    shortName: "Luca Graphite",
    description:
      "A neutral grey dark environment — no color cast, steady contrast, easy on the eyes for long sessions.",
    modeAffinity: "dark",
    materialTone: "dark",
    backgroundProfile: {
      base: "#1a1c1f",
      elevated: "#232629",
      ambient: "rgba(60, 63, 68, 0.6)",
      hero: "linear-gradient(135deg, #191b1e 0%, #232629 56%, #2a2d31 100%)",
      pattern: "solid",
    },
    materialProfile: {
      glassOpacity: 0.84,
      glassBlurPx: 10,
      borderStrength: 0.44,
      shadowSoft: "0 18px 48px rgba(0, 0, 0, 0.32)",
      shadowFloat: "0 30px 80px rgba(0, 0, 0, 0.4)",
      profile: "graphite",
    },
    accentProfile: {
      primary: "#9aa4b2",
      secondary: "#6b7684",
      glow: "rgba(154, 164, 178, 0.16)",
    },
    typographyProfile: {
      primary: "#ececec",
      secondary: "#b6bcc4",
      tertiary: "#878e97",
      mood: "system-clean",
    },
    bootProfile: {
      background: "#1a1c1f",
      orb: "#2c3034",
      highlight: "#c2c8cf",
      motion: "minimal",
    },
    motionProfile: {
      speed: "precise",
      softness: "controlled",
      glow: "restrained",
      reducedMotionFallback: true,
    },
    presenceProfile: {
      ambientOpacity: 0.42,
      ambientBlend: "screen",
      ambientBlurPx: 34,
      bloomIntensity: 0.26,
      bloomIridescent: false,
      orbGradient:
        "radial-gradient(60% 50% at 35% 30%, rgba(255, 255, 255, 0.5), transparent 60%), conic-gradient(from 200deg, #aeb6c0, #8d949d, #b9bfc7, #aeb6c0)",
      faceSharpFilter:
        "drop-shadow(0 4px 14px rgba(0, 0, 0, 0.42)) brightness(1.02)",
    },
  },
  onyx: {
    id: "onyx",
    name: "Luca Onyx",
    shortName: "Luca Onyx",
    description:
      "True black with OLED-grade contrast — structure carried by hairlines and one cool accent, nothing else.",
    modeAffinity: "dark",
    materialTone: "dark",
    backgroundProfile: {
      base: "#0a0a0b",
      elevated: "#141416",
      ambient: "rgba(30, 30, 34, 0.6)",
      hero: "linear-gradient(135deg, #050506 0%, #101012 56%, #161618 100%)",
      pattern: "solid",
    },
    materialProfile: {
      glassOpacity: 0.88,
      glassBlurPx: 8,
      borderStrength: 0.5,
      shadowSoft: "0 18px 48px rgba(0, 0, 0, 0.5)",
      shadowFloat: "0 30px 80px rgba(0, 0, 0, 0.6)",
      profile: "graphite",
    },
    accentProfile: {
      primary: "#7aa2ff",
      secondary: "#5670a8",
      glow: "rgba(122, 162, 255, 0.18)",
    },
    typographyProfile: {
      primary: "#f2f2f2",
      secondary: "#b8bcc2",
      tertiary: "#82868d",
      mood: "system-clean",
    },
    bootProfile: {
      background: "#0a0a0b",
      orb: "#1b1d22",
      highlight: "#9fb4e8",
      motion: "minimal",
    },
    motionProfile: {
      speed: "precise",
      softness: "controlled",
      glow: "restrained",
      reducedMotionFallback: true,
    },
    presenceProfile: {
      ambientOpacity: 0.4,
      ambientBlend: "screen",
      ambientBlurPx: 32,
      bloomIntensity: 0.32,
      bloomIridescent: false,
      orbGradient:
        "radial-gradient(60% 50% at 35% 30%, rgba(255, 255, 255, 0.5), transparent 60%), conic-gradient(from 200deg, #7aa2ff, #5670a8, #8fb0e8, #7aa2ff)",
      faceSharpFilter:
        "drop-shadow(0 4px 14px rgba(0, 0, 0, 0.55)) brightness(1.04)",
    },
  },
  dusk: {
    id: "dusk",
    name: "Luca Dusk",
    shortName: "Luca Dusk",
    description:
      "A warm charcoal environment with a soft amber undertone — dark mode that feels like evening, not machinery.",
    modeAffinity: "dark",
    materialTone: "dark",
    backgroundProfile: {
      base: "#191512",
      elevated: "#241e19",
      ambient: "rgba(64, 52, 42, 0.6)",
      hero: "linear-gradient(135deg, #181411 0%, #241d17 56%, #2b221a 100%)",
      pattern: "ambient",
    },
    materialProfile: {
      glassOpacity: 0.82,
      glassBlurPx: 10,
      borderStrength: 0.44,
      shadowSoft: "0 18px 48px rgba(20, 12, 6, 0.4)",
      shadowFloat: "0 30px 80px rgba(20, 12, 6, 0.5)",
      profile: "graphite",
    },
    accentProfile: {
      primary: "#d8a25e",
      secondary: "#a5713f",
      glow: "rgba(216, 162, 94, 0.16)",
    },
    typographyProfile: {
      primary: "#efe6da",
      secondary: "#c4b7a8",
      tertiary: "#94897c",
      mood: "editorial",
    },
    bootProfile: {
      background: "#191512",
      orb: "#2e251d",
      highlight: "#e2c49a",
      motion: "calm",
    },
    motionProfile: {
      speed: "calm",
      softness: "soft",
      glow: "minimal",
      reducedMotionFallback: true,
    },
    presenceProfile: {
      ambientOpacity: 0.45,
      ambientBlend: "screen",
      ambientBlurPx: 34,
      bloomIntensity: 0.28,
      bloomIridescent: false,
      orbGradient:
        "radial-gradient(60% 50% at 35% 30%, rgba(255, 250, 240, 0.5), transparent 60%), conic-gradient(from 200deg, #d8a25e, #a5713f, #c9b08a, #d8a25e)",
      faceSharpFilter:
        "drop-shadow(0 4px 14px rgba(20, 12, 6, 0.5)) brightness(1.02) sepia(0.06)",
    },
  },
  mist: {
    id: "mist",
    name: "Luca Mist",
    shortName: "Luca Mist",
    description:
      "Clean neutral light — quiet grey-white surfaces with no warmth cast, the working daylight environment.",
    modeAffinity: "light",
    materialTone: "light",
    backgroundProfile: {
      base: "#e8ecef",
      elevated: "#f8fafb",
      ambient: "rgba(145, 154, 166, 0.36)",
      hero: "linear-gradient(135deg, #f4f6f7 0%, #dfe4e8 52%, #eef1f3 100%)",
      pattern: "solid",
    },
    materialProfile: {
      glassOpacity: 0.84,
      glassBlurPx: 14,
      borderStrength: 0.6,
      shadowSoft: "0 14px 38px rgba(37, 46, 58, 0.16)",
      shadowFloat: "0 24px 64px rgba(37, 46, 58, 0.21)",
      profile: "glass",
    },
    accentProfile: {
      primary: "#5f6b7a",
      secondary: "#8b95a1",
      glow: "rgba(95, 107, 122, 0.14)",
    },
    typographyProfile: {
      primary: "#1c2126",
      secondary: "#4c555f",
      tertiary: "#7b838c",
      mood: "system-clean",
    },
    bootProfile: {
      background: "#eef0f2",
      orb: "#ffffff",
      highlight: "#d4dae1",
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
      bloomIntensity: 0.22,
      bloomIridescent: false,
      orbGradient:
        "radial-gradient(60% 50% at 35% 30%, #ffffff, transparent 60%), conic-gradient(from 200deg, #c3ccd6, #a8b2bd, #d2d8df, #c3ccd6)",
      faceSharpFilter: "drop-shadow(0 10px 22px rgba(60, 72, 86, 0.26))",
    },
  },
} as const;

export const DEFAULT_LUCA_SKIN_ID: LucaSkinId = "pearl";

/**
 * Appearance modes (Claude-desktop style): LucaOS has ONE identity — the
 * glacier — worn light (Pearl) or dark (Carbon), with "system" following the
 * host OS. The wider skin catalog remains available as explicit choices, but
 * the product's default experience is a mode, not a gallery.
 */
export type LucaAppearanceMode = "light" | "dark" | "system";

export const DEFAULT_LUCA_APPEARANCE_MODE: LucaAppearanceMode = "light";

export function isLucaAppearanceMode(
  value: unknown,
): value is LucaAppearanceMode {
  return value === "light" || value === "dark" || value === "system";
}

/** Resolve an appearance mode to its skin. Pure: the caller supplies the OS signal. */
export function resolveLucaAppearanceSkinId(
  mode: LucaAppearanceMode,
  prefersDark: boolean,
): LucaSkinId {
  if (mode === "dark") return "carbon";
  if (mode === "system") return prefersDark ? "carbon" : "pearl";
  return "pearl";
}

/**
 * The appearance mode a concrete skin corresponds to, if any.
 *
 * Luca Light / Luca Dark map back to their modes. Any other environment from
 * the wider catalog returns `undefined` — an explicit environment choice is
 * not a mode, and it must stop system-following so the OS cannot silently
 * undo the user's pick.
 */
export function resolveLucaAppearanceModeForSkin(
  skinId: LucaSkinId,
): LucaAppearanceMode | undefined {
  if (skinId === "pearl") return "light";
  if (skinId === "carbon") return "dark";
  return undefined;
}

export function isLucaSkinId(value: unknown): value is LucaSkinId {
  return typeof value === "string" && value in LUCA_SKINS;
}

export function normalizeLucaSkinId(value: unknown): LucaSkinId {
  return isLucaSkinId(value) ? value : DEFAULT_LUCA_SKIN_ID;
}

export function getLucaSkinDefinition(value?: unknown): LucaSkinDefinition {
  return LUCA_SKINS[normalizeLucaSkinId(value)];
}
