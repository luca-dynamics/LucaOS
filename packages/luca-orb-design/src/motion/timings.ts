/**
 * @package luca-orb-design
 * @file motion/timings.ts
 *
 * Animation timing constants for the Living Orb.
 *
 * Design principle (Pixar / Apple): Things that feel alive don't move
 * at perfectly regular intervals. Every value here is tuned to avoid
 * mechanical sine-wave appearance.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Idle motion (always running)
// ─────────────────────────────────────────────────────────────────────────────

export const IdleMotion = {
  /**
   * Breathing cycle duration in seconds.
   * 4.2s is slightly longer than a standard breath — feels calm, not anxious.
   * Intentionally not 4.0 to avoid metronome feeling.
   */
  breathingPeriod: 4.2,

  /**
   * Breathing amplitude: how much the orb scale changes each breath.
   * 0.028 = ±2.8% radius change. Barely perceptible — just "alive."
   */
  breathingAmplitude: 0.028,

  /**
   * Float drift period. The orb gently bobs up and down.
   * Longer than breathing so the two oscillators create beats.
   */
  floatPeriod: 7.3,

  /**
   * Float amplitude in CSS pixels.
   */
  floatAmplitude: 4.0,

  /**
   * Highlight drift period — the specular slowly wanders.
   * Very long. The highlight should feel like it's reacting to
   * ambient light shifts, not animated.
   */
  highlightDriftPeriod: 18.0,

  /**
   * Micro-jitter frequency — tiny surface trembling.
   * High frequency, tiny amplitude — just "surface tension."
   */
  microJitterFrequency: 3.7,

  /**
   * Micro-jitter amplitude (fraction of orb radius).
   */
  microJitterAmplitude: 0.007,

  /**
   * Blob morph speed — how fast the organic shape slowly evolves.
   * Very slow — nearly imperceptible. Ensures no two moments look identical.
   */
  morphSpeed: 0.055,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Profile transition timings
// ─────────────────────────────────────────────────────────────────────────────

export interface ProfileTransition {
  /** Total duration of the transition in milliseconds */
  durationMs:    number;
  /** How long to pause before the main move (anticipation) */
  anticipationMs: number;
  /** Overshoot amount (spring bounce) — 0 to 0.3 */
  overshoot:     number;
}

export const PROFILE_TRANSITIONS: Record<string, ProfileTransition> = {
  // From any state → idle
  toIdle: {
    durationMs:    1200,
    anticipationMs: 0,
    overshoot:     0.0,    // Slow exhale — no bounce
  },
  // → listening
  toListening: {
    durationMs:    480,
    anticipationMs: 20,    // Tiny breath in before opening
    overshoot:     0.06,
  },
  // → thinking
  toThinking: {
    durationMs:    650,
    anticipationMs: 0,
    overshoot:     0.0,
  },
  // → speaking
  toSpeaking: {
    durationMs:    380,
    anticipationMs: 30,    // Quick inhale before speaking
    overshoot:     0.10,
  },
  // → success
  toSuccess: {
    durationMs:    520,
    anticipationMs: 0,
    overshoot:     0.12,   // Slight bounce — positive energy
  },
  // → error
  toError: {
    durationMs:    300,
    anticipationMs: 0,
    overshoot:     0.0,    // Sharp, immediate — no playfulness
  },
  // → sleeping
  toSleeping: {
    durationMs:    1800,
    anticipationMs: 0,
    overshoot:     0.0,    // Long, slow fade — like closing eyes
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Audio reactivity timings
// ─────────────────────────────────────────────────────────────────────────────

export const AudioReactivity = {
  /**
   * How quickly the surface displacement follows audio energy.
   * Low value = fast response (immediate). High = sluggish.
   * 0.08 = very fast (matches speech onset).
   */
  attackTime:  0.08,

  /**
   * How quickly the surface displacement returns to rest.
   * Longer than attack — the orb "breathes out" after a word.
   */
  releaseTime: 0.25,

  /**
   * Maximum surface displacement from audio at full amplitude.
   * Fraction of orb radius.
   */
  maxDisplacement: 0.06,

  /**
   * Onset burst duration — the transient spike on word boundaries.
   * Very short (milliseconds).
   */
  onsetBurstMs: 80,

  /**
   * Onset burst amplitude multiplier.
   */
  onsetBurstAmplitude: 2.5,
} as const;
