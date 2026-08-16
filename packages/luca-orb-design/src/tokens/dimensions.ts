/**
 * @package luca-orb-design
 * @file tokens/dimensions.ts
 *
 * Physical dimensions, scale factors, and spatial constants for the Living Orb.
 * All values are relative unless otherwise specified.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Base orb dimensions
// ─────────────────────────────────────────────────────────────────────────────

export const OrbDimensions = {
  /**
   * Default orb diameter in CSS pixels.
   * This is the "regular" size — as seen in the main VoiceHUD.
   */
  defaultDiameter: 200,

  /**
   * Orb radius as a fraction of the canvas's smaller dimension.
   * The shader uses this to place the blob SDF.
   * 0.36 means the orb takes up ~72% of the canvas height.
   */
  normalizedRadius: 0.36,

  /**
   * Inner glow radius relative to orb radius.
   * The core light is tighter than the glass body.
   */
  coreGlowRatio: 0.34,

  /**
   * Highlight size relative to orb radius.
   * The key specular covers the top 28% of the orb diameter.
   */
  keyHighlightRatio: 0.20,

  /**
   * Secondary highlight size relative to orb radius.
   */
  secondaryHighlightRatio: 0.14,

  /**
   * Bloom pool radius relative to orb radius.
   * The ambient bloom extends to ~220% of the orb radius.
   */
  bloomRadius: 2.2,

  /**
   * Ripple ring gap — spacing between concentric rings,
   * as a fraction of orb radius.
   */
  rippleRingSpacing: 0.28,

  /**
   * Number of visible ripple rings.
   */
  rippleRingCount: 4,

  /**
   * Contact shadow vertical offset (below orb center), as fraction of radius.
   */
  shadowOffsetY: 1.08,

  /**
   * Contact shadow horizontal spread relative to orb radius.
   */
  shadowSpread: 0.9,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Widget size scale factors
// Maps widget sizes to diameter multipliers relative to defaultDiameter
// ─────────────────────────────────────────────────────────────────────────────

export const OrbWidgetScales = {
  /** Compact widget — e.g. Dynamic Island-style strip */
  compact:    0.28,   // ~56px diameter
  /** Regular widget — e.g. floating sidebar orb */
  regular:    1.00,   // 200px diameter (default)
  /** Large widget — e.g. mobile voice screen */
  large:      1.60,   // 320px diameter
  /** Fullscreen — e.g. main VoiceHUD */
  fullscreen: 2.20,   // 440px diameter
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Blob shape parameters
// These control the organic deformation of the SDF
// ─────────────────────────────────────────────────────────────────────────────

export const OrbBlobShape = {
  /**
   * Low-frequency deformation amplitude (the large bumps).
   * This is the dominant irregularity that makes it "not a circle."
   */
  lowFreqAmplitude:  0.07,

  /**
   * Low-frequency deformation spatial frequency.
   * Lower = fewer, larger bumps.
   */
  lowFreqFrequency:  2.0,

  /**
   * Medium-frequency surface detail amplitude.
   */
  midFreqAmplitude:  0.035,
  midFreqFrequency:  4.0,

  /**
   * High-frequency surface tension ripple amplitude.
   * Very subtle — just makes the surface look "alive."
   */
  highFreqAmplitude: 0.012,
  highFreqFrequency: 8.0,

  /**
   * How quickly the blob shape evolves over time (very slow).
   * The blob should drift almost imperceptibly.
   */
  morphSpeed:        0.06,
} as const;
