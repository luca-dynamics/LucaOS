/**
 * @package luca-orb-design
 * @file motion/curves.ts
 *
 * Easing curves for the Living Orb.
 * Defined as cubic bezier control points [x1, y1, x2, y2].
 * Compatible with CSS `cubic-bezier()` and the OrbAnimator interpolator.
 */

export type CubicBezier = readonly [number, number, number, number];

export const OrbEasing = {
  /**
   * Standard ease — used for most material transitions.
   * Ease in gently, ease out gently.
   */
  standard:     [0.4, 0.0, 0.2, 1.0] as CubicBezier,

  /**
   * Decelerate — starts fast, settles smoothly.
   * Used for incoming transitions (entering a state).
   */
  decelerate:   [0.0, 0.0, 0.2, 1.0] as CubicBezier,

  /**
   * Accelerate — builds momentum before landing.
   * Used for exiting transitions (leaving a state).
   */
  accelerate:   [0.4, 0.0, 1.0, 1.0] as CubicBezier,

  /**
   * Spring snap — quick snap with subtle settle.
   * Used for speaking onset and listening activation.
   */
  springSnap:   [0.34, 1.56, 0.64, 1.0] as CubicBezier,

  /**
   * Slow breathe — used for sleeping and returning to idle.
   * Mimics a real exhale.
   */
  slowBreathe:  [0.76, 0.0, 0.24, 1.0] as CubicBezier,

  /**
   * Sharp enter — immediate for error state.
   * No easing in — conveys urgency.
   */
  sharpEnter:   [0.0, 0.0, 0.58, 1.0] as CubicBezier,

  /**
   * Elastic out — used for success state.
   * Just a touch of bounce — positive and alive.
   */
  elasticOut:   [0.34, 1.36, 0.64, 1.0] as CubicBezier,

  /**
   * Linear — for shader time-driven animations only.
   * Never use linear for user-visible transitions.
   */
  linear:       [0.0, 0.0, 1.0, 1.0] as CubicBezier,
} as const;

/**
 * Evaluates a cubic bezier at t using Newton's method.
 * Used by OrbAnimator to interpolate between profile states.
 */
export function evaluateCubicBezier(
  curve: CubicBezier,
  t: number,
): number {
  const [x1, y1, x2, y2] = curve;
  // Newton iteration to find t given x
  let cx = 3 * x1;
  let bx = 3 * (x2 - x1) - cx;
  let ax = 1 - cx - bx;
  let cy = 3 * y1;
  let by = 3 * (y2 - y1) - cy;
  let ay = 1 - cy - by;

  function sampleX(t: number) { return ((ax * t + bx) * t + cx) * t; }
  function sampleY(t: number) { return ((ay * t + by) * t + cy) * t; }
  function sampleXDerivative(t: number) { return (3 * ax * t + 2 * bx) * t + cx; }

  // Newton's method
  let u = t;
  for (let i = 0; i < 8; i++) {
    const x = sampleX(u) - t;
    const dx = sampleXDerivative(u);
    if (Math.abs(dx) < 1e-6) break;
    u -= x / dx;
  }

  return sampleY(u);
}
