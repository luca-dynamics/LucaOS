/**
 * Evaluate the sculpting stack as a signed distance field.
 *
 * `evaluateOrbSdf` is the single definition of the orb's form. The GLSL in
 * `@luca/orb/living-orb/shaders/orb-sdf.glsl` is emitted from the same constants and
 * must agree with it; `render/clay.ts` marches this one on the CPU so a test can
 * measure the form without a GPU.
 *
 * Negative inside, positive outside, in orb units.
 */

import type { OrbSculptStack } from './stack';
import type { Vec3 } from './steps';
import {
  blend,
  cushionDome,
  rollHem,
  silhouetteRadiusUnits,
  solidify,
  tilt,
} from './steps';

/**
 * Fraction of the field value a sphere-tracer may step.
 *
 * The field is not a true Euclidean distance — `silhouetteDistanceUnits` corrects
 * the radial residual only to first order in the outline's slope, and `blend`
 * shortens distances near the join — so a full step can overshoot a thin feature.
 * The hem's tube is the thinnest thing here, and marching through it would remove
 * the fold from the render while leaving the field that contains it intact, which
 * is the kind of failure that looks like a modelling mistake.
 */
export const MARCH_SAFETY = 0.85;

/** The form's signed distance at a point in orb units, negative inside. */
export function evaluateOrbSdf(stack: OrbSculptStack, p: Vec3): number {
  const [x, y, z] = tilt(stack.tilt, p);
  const body = solidify(
    cushionDome(stack.dome, stack.silhouette, x, y, z),
    stack.shellThicknessUnits,
  );
  const hem = rollHem(stack.hem, stack.dome, stack.silhouette, x, y, z);
  return blend(body, hem, stack.blendUnits);
}

/**
 * Surface normal by central difference.
 *
 * `epsilon` is in orb units and defaults to a hundredth of a unit — coarse enough
 * to average over the field's first-order error, fine enough to resolve the hem.
 */
export function orbSdfNormal(stack: OrbSculptStack, p: Vec3, epsilon = 0.01): Vec3 {
  const [x, y, z] = p;
  const nx =
    evaluateOrbSdf(stack, [x + epsilon, y, z]) - evaluateOrbSdf(stack, [x - epsilon, y, z]);
  const ny =
    evaluateOrbSdf(stack, [x, y + epsilon, z]) - evaluateOrbSdf(stack, [x, y - epsilon, z]);
  const nz =
    evaluateOrbSdf(stack, [x, y, z + epsilon]) - evaluateOrbSdf(stack, [x, y, z - epsilon]);
  const length = Math.hypot(nx, ny, nz);
  if (length < 1e-12) return [0, 0, 1];
  return [nx / length, ny / length, nz / length];
}

/**
 * How far in depth the form can possibly reach, in orb units.
 *
 * A strict upper bound, not a measurement: a tracer starts its march here, so it has
 * to be at or beyond the frontmost surface at every pixel or the form is silently
 * clipped. The outline's radius is bounded by its semi-axes plus the total harmonic
 * amplitude rather than sampled, which keeps this cheap and keeps it an upper bound
 * even if the harmonics change.
 */
export function orbDepthBoundUnits(stack: OrbSculptStack): number {
  const { dome, hem, silhouette } = stack;
  const maxRadius =
    Math.max(silhouette.base.semiAxisX, silhouette.base.semiAxisY) +
    silhouette.harmonics.reduce((sum, harmonic) => sum + Math.abs(harmonic.amplitude), 0);
  // The lean is a shear, so it displaces depth by its slope times the reach in x and y.
  const shear = (Math.abs(dome.lean[0]) + Math.abs(dome.lean[1])) * maxRadius;
  const apex = dome.halfDepthUnits * Math.max(dome.frontScale, dome.rearScale) + shear;
  // The hem rides the body, so its spine is at most the apex plus its own lift.
  const roll = apex + Math.abs(hem.liftUnits) + Math.abs(hem.tuckUnits) + hem.minorRadiusUnits;
  return Math.max(apex, roll) + stack.blendUnits + 0.05;
}

export interface SilhouetteSolveOptions {
  /** Depth samples per radius test. */
  readonly depthSamples: number;
  /** Bisection steps in radius. */
  readonly radiusSteps: number;
}

export const DEFAULT_SILHOUETTE_SOLVE: SilhouetteSolveOptions = Object.freeze({
  depthSamples: 96,
  radiusSteps: 30,
});

/**
 * The outermost extent of the whole form at one angle, in orb units.
 *
 * This is what the silhouette gate compares against the master, so it has to be the
 * silhouette of `evaluateOrbSdf` and not of the outline the outline step produced.
 * The two are only equal while the hem stays inside the outline, which
 * `LUCA_ORB_STACK_V1` arranges and a test checks — and if a later stack stops
 * arranging it, this function notices and the outline alone would not.
 *
 * Solved rather than derived: the body's own silhouette is closed-form, but `blend`
 * pulls the joined surface outward by up to `blendUnits / 6` and a hem outside the
 * outline would push it further, neither of which has a closed form. The solve
 * brackets the radius where the form's nearest depth stops being inside, then
 * bisects. It is far cheaper than marching an image, and unlike the closed form it
 * cannot be quietly wrong.
 */
export function orbSilhouetteRadius(
  stack: OrbSculptStack,
  angle: number,
  options: Partial<SilhouetteSolveOptions> = {},
): number {
  const settings: SilhouetteSolveOptions = { ...DEFAULT_SILHOUETTE_SOLVE, ...options };
  const bound = orbDepthBoundUnits(stack);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  /** Closest the form comes to the surface anywhere along the depth of this ray. */
  const nearestAlongDepth = (radius: number): number => {
    let nearest = Infinity;
    for (let i = 0; i < settings.depthSamples; i += 1) {
      const z = -bound + (2 * bound * i) / (settings.depthSamples - 1);
      const value = evaluateOrbSdf(stack, [radius * cos, radius * sin, z]);
      if (value < nearest) nearest = value;
    }
    return nearest;
  };

  const outline = silhouetteRadiusUnits(stack.silhouette, angle);
  let inside = 0;
  let outside = outline * 1.6;
  if (nearestAlongDepth(inside) > 0) return 0;
  // Widen if a hem or a blend has pushed the form past the guessed bracket, rather
  // than silently returning the bracket's edge as though it were the silhouette.
  for (let i = 0; i < 8 && nearestAlongDepth(outside) <= 0; i += 1) outside *= 1.5;
  if (nearestAlongDepth(outside) <= 0) {
    throw new Error(`The form is unbounded along the ray at ${angle.toFixed(4)} rad.`);
  }

  for (let step = 0; step < settings.radiusSteps; step += 1) {
    const middle = 0.5 * (inside + outside);
    if (nearestAlongDepth(middle) <= 0) inside = middle;
    else outside = middle;
  }
  return 0.5 * (inside + outside);
}

export interface FramePlacement {
  readonly frameSize: number;
  readonly angleCount: number;
}

/**
 * The form's silhouette as a ring in the frozen frame, ready for `contourDeviation`.
 *
 * The ring is centred on the silhouette profile's own centre so the comparison is
 * against the same origin the fit used; a form that is the right shape in the wrong
 * place still reports the offset, because `contourDeviation` resolves both rings to
 * frame points before measuring.
 */
export function orbSilhouetteToTracedContour(
  stack: OrbSculptStack,
  placement: Partial<FramePlacement> = {},
  solve: Partial<SilhouetteSolveOptions> = {},
): { angleCount: number; radiiPx: number[]; centerPx: readonly [number, number]; frameSize: number } {
  const frameSize = placement.frameSize ?? 360;
  const angleCount = placement.angleCount ?? 360;
  const radiiPx: number[] = [];
  for (let i = 0; i < angleCount; i += 1) {
    const angle = (i / angleCount) * Math.PI * 2;
    radiiPx.push(orbSilhouetteRadius(stack, angle, solve) * stack.silhouette.unitPx);
  }
  return {
    angleCount,
    radiiPx,
    centerPx: stack.silhouette.centerPx,
    frameSize,
  };
}
