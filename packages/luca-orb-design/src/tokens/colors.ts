/**
 * @package luca-orb-design
 * @file tokens/colors.ts
 *
 * Color palette for the Living Orb, sampled directly from the approved
 * VoiceHUD mockup. These are the source of truth for all orb rendering.
 * The renderer consumes these via profile mappings in src/profiles/.
 *
 * All colors are in linear sRGB [0,1] tuples for direct use as WebGL uniforms.
 * CSS hex equivalents are provided in comments for design reference.
 */

/** A linear-sRGB color triple for shader uniforms */
export type RGB = readonly [number, number, number];

/** Converts a 0-255 sRGB value to linear light */
function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Creates a linear RGB triple from 0-255 sRGB values */
function rgb(r: number, g: number, b: number): RGB {
  return [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)] as const;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core palette — sampled from the VoiceHUD mockup
// ─────────────────────────────────────────────────────────────────────────────

export const OrbColors = {
  // ── Background / Environment ───────────────────────────────────────────────
  /** Deep near-black background of VoiceHUD surface. Not orb itself. */
  surfaceBackground:   rgb( 10,  13,  18),  // #0A0D12

  // ── Core glow — the brightest interior light ───────────────────────────────
  /** Bright white-blue core. The "soul" of the orb. */
  coreWhite:           rgb(220, 235, 255),  // #DCEAFF
  /** Inner glow halo — cooler blue-white diffuse */
  coreGlowCool:        rgb(180, 210, 255),  // #B4D2FF
  /** Warm variant for speaking/success states */
  coreGlowWarm:        rgb(230, 220, 255),  // #E6DCFF

  // ── Glass body ─────────────────────────────────────────────────────────────
  /** Primary glass body tint — blue-gray translucent */
  glassPrimary:        rgb(139, 180, 208),  // #8BB4D0
  /** Darker glass for shadow regions */
  glassShadow:         rgb( 60,  90, 120),  // #3C5A78
  /** Glass highlight sheen — near-white */
  glassHighlight:      rgb(210, 228, 248),  // #D2E4F8

  // ── Specular highlights ────────────────────────────────────────────────────
  /** Key light specular — large, soft, cool white */
  specularKey:         rgb(245, 250, 255),  // #F5FAFF
  /** Secondary specular — slightly smaller, warmer */
  specularSecondary:   rgb(200, 222, 248),  // #C8DEF8

  // ── Rim lighting ──────────────────────────────────────────────────────────
  /** Rim light — cool edge glow around the silhouette */
  rimCool:             rgb(200, 222, 255),  // #C8DEFF
  /** Rim light variant for warm states */
  rimWarm:             rgb(220, 200, 255),  // #DCC8FF

  // ── Bloom / ambient pool ───────────────────────────────────────────────────
  /** Ambient bloom pool behind orb — deep blue glow */
  bloomPool:           rgb( 26,  58,  92),  // #1A3A5C
  /** Bloom color for listening state — brighter, more saturated */
  bloomListening:      rgb( 20,  60, 110),  // #143C6E
  /** Bloom color for speaking state — warmer */
  bloomSpeaking:       rgb( 40,  30,  80),  // #281E50

  // ── Ripple rings ──────────────────────────────────────────────────────────
  /** Concentric ripple rings — very subtle white */
  rippleRing:          rgb(200, 220, 245),  // #C8DCF5

  // ── State-specific accents ─────────────────────────────────────────────────
  /** Success state — soft green tint */
  accentSuccess:       rgb(140, 220, 180),  // #8CDCB4
  /** Error state — muted red, never harsh */
  accentError:         rgb(240, 130, 110),  // #F0826E
  /** Thinking state — deeper blue, crystalline */
  accentThinking:      rgb(100, 160, 230),  // #64A0E6
  /** Sleeping state — very dim, warm */
  accentSleeping:      rgb(160, 150, 190),  // #A096BE

  // ── Shadow ─────────────────────────────────────────────────────────────────
  /** Contact shadow beneath orb — deep blue-black */
  shadowColor:         rgb(  5,  10,  20),  // #050A14
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Profile color mappings
// ─────────────────────────────────────────────────────────────────────────────

export interface ProfileColors {
  coreColor:       RGB;
  glassColor:      RGB;
  rimColor:        RGB;
  bloomColor:      RGB;
  specularColor:   RGB;
  rippleColor:     RGB;
}

export const PROFILE_COLORS: Record<string, ProfileColors> = {
  idle: {
    coreColor:     OrbColors.coreGlowCool,
    glassColor:    OrbColors.glassPrimary,
    rimColor:      OrbColors.rimCool,
    bloomColor:    OrbColors.bloomPool,
    specularColor: OrbColors.specularKey,
    rippleColor:   OrbColors.rippleRing,
  },
  listening: {
    coreColor:     OrbColors.coreWhite,
    glassColor:    rgb(120, 170, 220),    // slightly more saturated
    rimColor:      OrbColors.rimCool,
    bloomColor:    OrbColors.bloomListening,
    specularColor: OrbColors.specularKey,
    rippleColor:   OrbColors.rippleRing,
  },
  thinking: {
    coreColor:     OrbColors.accentThinking,
    glassColor:    rgb(100, 140, 190),    // cooler, crystalline
    rimColor:      rgb(160, 190, 240),
    bloomColor:    rgb( 15,  40,  80),
    specularColor: rgb(180, 210, 255),
    rippleColor:   rgb(160, 190, 220),
  },
  speaking: {
    coreColor:     OrbColors.coreGlowWarm,
    glassColor:    rgb(155, 175, 220),    // slight warmth
    rimColor:      OrbColors.rimWarm,
    bloomColor:    OrbColors.bloomSpeaking,
    specularColor: OrbColors.specularKey,
    rippleColor:   rgb(210, 205, 240),
  },
  success: {
    coreColor:     OrbColors.accentSuccess,
    glassColor:    rgb(130, 190, 170),
    rimColor:      rgb(160, 230, 200),
    bloomColor:    rgb( 10,  40,  30),
    specularColor: rgb(200, 245, 230),
    rippleColor:   rgb(180, 230, 210),
  },
  error: {
    coreColor:     OrbColors.accentError,
    glassColor:    rgb(200, 140, 130),
    rimColor:      rgb(240, 170, 160),
    bloomColor:    rgb( 50,  15,  15),
    specularColor: rgb(255, 220, 215),
    rippleColor:   rgb(240, 190, 185),
  },
  sleeping: {
    coreColor:     OrbColors.accentSleeping,
    glassColor:    rgb( 90,  85, 110),
    rimColor:      rgb(130, 125, 160),
    bloomColor:    rgb( 15,  12,  22),
    specularColor: rgb(170, 165, 200),
    rippleColor:   rgb(140, 135, 170),
  },
} as const;
