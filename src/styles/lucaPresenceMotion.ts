/**
 * Luca motion language.
 *
 * One easing curve, one duration scale, one breath. Every Luca surface —
 * presence mark, summon overlay, act veil, room panels — moves with the
 * same physics so the system reads as a single being rather than a set of
 * components. Do not introduce per-surface easing curves; extend this file.
 *
 * The curve is a fast departure with a long, soft landing: Luca responds
 * instantly but never stops abruptly. Calm is the settle, not the start.
 */

/** The signature easing curve. Used for every enter, exit, and state change. */
export const LUCA_EASE = "cubic-bezier(0.22, 0.88, 0.24, 1)";

/** Duration scale (ms). Pick the smallest step that reads; when unsure, go shorter. */
export const LUCA_DURATION = {
  /** Hover, focus, and other micro feedback. */
  fast: 160,
  /** A surface arriving (summon, caption, controls). */
  enter: 480,
  /** A surface leaving. Exits are quicker than entrances. */
  exit: 320,
  /** A presence state cross-fading into another (idle → listening, …). */
  state: 640,
} as const;

/**
 * Ambient cadences (ms). These are rhythms, not transitions — the tempo of
 * Luca at rest. Idle breath is ~5.2s, near a calm human breathing cycle.
 */
export const LUCA_CADENCE = {
  /** Full idle breath cycle (inhale + exhale). */
  breath: 5200,
  /** One revolution of the thinking orbit. */
  orbit: 3600,
  /** Interval between needs-you pulses — a polite knock, not an alarm. */
  attention: 2600,
} as const;

/**
 * Time constants (ms) for frame-based smoothing on canvas surfaces.
 * A value is the time to close ~63% of the gap to a target; light rises
 * quickly and falls slowly, which reads as organic rather than mechanical.
 */
export const LUCA_SMOOTHING = {
  /** State-driven parameters (halo, scale, color mix). */
  state: 280,
  /** Live audio amplitude following the user's voice. */
  amplitudeRise: 70,
  /** Amplitude release after the voice stops. */
  amplitudeFall: 240,
} as const;

/**
 * Frame-rate-independent exponential approach toward a target.
 * Returns the new current value after `dtMs` milliseconds.
 */
export function approach(
  current: number,
  target: number,
  dtMs: number,
  tauMs: number,
): number {
  if (tauMs <= 0) return target;
  const blend = 1 - Math.exp(-dtMs / tauMs);
  return current + (target - current) * blend;
}

/**
 * Presence light roles. The mark never uses raw hex: identity comes from the
 * active skin's accent, attention from the shared warning token. The only
 * glow permitted anywhere in LucaOS is this — Luca's own attention state.
 */
export const LUCA_PRESENCE_LIGHT = {
  identity: "var(--luca-accent-primary, #8a8f98)",
  attention: "var(--luca-warning, #d9a441)",
} as const;

/** CSS custom properties for DOM surfaces that share the motion language. */
export const LUCA_MOTION_CSS_VARIABLES: Record<string, string> = {
  "--luca-ease": LUCA_EASE,
  "--luca-duration-fast": `${LUCA_DURATION.fast}ms`,
  "--luca-duration-enter": `${LUCA_DURATION.enter}ms`,
  "--luca-duration-exit": `${LUCA_DURATION.exit}ms`,
  "--luca-duration-state": `${LUCA_DURATION.state}ms`,
};
