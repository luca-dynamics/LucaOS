/**
 * Render the sculpting stack as matte clay on the CPU.
 *
 * Clay, not glass, and that is the point. The founder's rule is that the grayscale
 * form has to match before anything touches materials, so this renderer is
 * deliberately incapable of flattering the form: one matte lambert term, one ambient
 * term, no specular, no refraction, no bloom. If the shape reads wrong here it is
 * wrong, and no material will fix it.
 *
 * No GPU and no randomness, so a test can call it and get the same image twice.
 *
 * PIXEL CONVENTION. Pixel `(x, y)` is sampled at exactly `(x, y)`, matching
 * `ScalarField` in `../trace/master-contour` and `tracedContourToMask` in
 * `../trace/deviation`. The render therefore lands in the same frozen frame as the
 * trace and its coverage mask can be compared against the traced ring directly. A
 * half-pixel disagreement here would show up as form error the form had not
 * committed, applied equally to every candidate so it would never look like a bug.
 */

import type { OrbSculptStack } from '../sculpt/stack';
import type { Vec3 } from '../sculpt/steps';
import { MARCH_SAFETY, evaluateOrbSdf, orbDepthBoundUnits, orbSdfNormal } from '../sculpt/sdf';

export interface ClayRenderOptions {
  /** Output edge length in pixels. The frozen review frame is 360. */
  readonly size: number;
  /** Maximum sphere-trace steps per pixel. */
  readonly maxSteps: number;
  /** Bisection steps used to recover a step that overshot the surface. */
  readonly refineSteps: number;
  /** Field value below which a non-crossing ray counts as having landed, in orb units. */
  readonly hitEpsilon: number;
  /** Direction from the surface toward the key light, in frame axes. Normalized on use. */
  readonly light: Vec3;
  /** Fraction of the shading that is present regardless of facing. */
  readonly ambient: number;
  /** Epsilon for the central-difference normal, in orb units. */
  readonly normalEpsilon: number;
}

export const DEFAULT_CLAY_OPTIONS: ClayRenderOptions = Object.freeze({
  size: 360,
  // High enough that no ray runs out — `ClayRender.exhausted` reports it, and at 72 it
  // was 473 rays at this size. Starved rays are grazing ones at the rim, so the cost of
  // raising the cap is close to nothing while the alternative is a measurement that is
  // partly a property of the step budget rather than of the form.
  maxSteps: 320,
  // Twelve halvings of the last step, so a recovered landing point is within about
  // 1e-4 units of the surface — two orders below `normalEpsilon`.
  refineSteps: 12,
  hitEpsilon: 0.0015,
  // Upper left and toward the viewer. Frame y runs down, so a negative y is above.
  light: Object.freeze([-0.45, -0.6, 0.66] as const),
  ambient: 0.18,
  normalEpsilon: 0.006,
});

export interface ClayRender {
  readonly size: number;
  /** Shaded luminance in 0..1, zero where the form is absent. */
  readonly luminance: Float32Array;
  /** Non-zero where a ray landed on the form. */
  readonly coverage: Uint8Array;
  /** Depth of the landing point in orb units, for diagnostics. */
  readonly depth: Float32Array;
  /** Total march steps taken, for reasoning about cost. */
  readonly steps: number;
  /**
   * Rays that ran out of steps while still close to the form. Non-zero means
   * `maxSteps` is starving the march and the silhouette is being clipped, which would
   * otherwise show up only as a form that is mysteriously slightly too small.
   */
  readonly exhausted: number;
  /** Rays that overshot and were recovered by bisection. Diagnostic only. */
  readonly refined: number;
}

/**
 * Sphere-trace the stack under an orthographic camera looking along -z.
 *
 * Orthographic is not a simplification for speed — it is what the frozen frame is.
 * The master was measured as a flat 360 px crop, so a perspective camera would
 * introduce a projection the trace never had and the deviation would then include
 * the camera's opinion as well as the form's.
 *
 * Because every ray is parallel to z, marching by the field value along z is exact
 * sphere tracing rather than an approximation of it.
 *
 * A CROSSING IS BISECTED RATHER THAN ACCEPTED. The field is only first-order
 * Euclidean, so a step of `MARCH_SAFETY` times its value can overshoot in principle;
 * the obvious test, "stop once the field is below `hitEpsilon`", is then satisfied by a
 * point an arbitrary distance INSIDE the surface, and the normal would be taken there.
 * `LUCA_ORB_STACK_V1` does not actually provoke it — `ClayRender.refined` is 0 across
 * every resolution and normal epsilon measured — so this is a guard, not a fix for an
 * observed fault. It is here because the failure it prevents is invisible: the render
 * would simply look faceted, and the form would be blamed. `refined` is reported so
 * that if a later stack does provoke it, that shows up as a number instead of as a
 * puzzling render.
 */
export function renderClay(
  stack: OrbSculptStack,
  options: Partial<ClayRenderOptions> = {},
): ClayRender {
  const settings: ClayRenderOptions = { ...DEFAULT_CLAY_OPTIONS, ...options };
  const { size } = settings;
  const luminance = new Float32Array(size * size);
  const coverage = new Uint8Array(size * size);
  const depth = new Float32Array(size * size);

  const { centerPx, unitPx } = stack.silhouette;
  // The frozen frame is 360 px; a smaller render is the same frame at lower
  // resolution, so the scale has to follow or the form would be measured in a
  // frame the trace never used.
  const frameScale = 360 / size;
  const bound = orbDepthBoundUnits(stack);

  const lightLength = Math.hypot(...settings.light);
  const light: Vec3 = [
    settings.light[0] / lightLength,
    settings.light[1] / lightLength,
    settings.light[2] / lightLength,
  ];

  let steps = 0;
  let exhausted = 0;
  let refined = 0;
  for (let py = 0; py < size; py += 1) {
    const framePixelY = py * frameScale;
    const uy = (framePixelY - centerPx[1]) / unitPx;
    for (let px = 0; px < size; px += 1) {
      const framePixelX = px * frameScale;
      const ux = (framePixelX - centerPx[0]) / unitPx;

      let z = bound;
      let previousZ = bound;
      let landed = false;
      let ranOut = true;
      for (let step = 0; step < settings.maxSteps; step += 1) {
        steps += 1;
        const distance = evaluateOrbSdf(stack, [ux, uy, z]);
        if (distance < 0) {
          // Overshot. `previousZ` was outside and `z` is inside, so the surface is
          // bracketed; bisect for it instead of shading wherever the step happened
          // to land.
          refined += 1;
          let outside = previousZ;
          let inside = z;
          for (let i = 0; i < settings.refineSteps; i += 1) {
            steps += 1;
            const middle = 0.5 * (outside + inside);
            if (evaluateOrbSdf(stack, [ux, uy, middle]) < 0) inside = middle;
            else outside = middle;
          }
          z = 0.5 * (outside + inside);
          landed = true;
          ranOut = false;
          break;
        }
        if (distance < settings.hitEpsilon) {
          // Approached without crossing — a grazing ray at the terminator. Already
          // within `hitEpsilon` of the surface, so shade here.
          landed = true;
          ranOut = false;
          break;
        }
        previousZ = z;
        z -= Math.max(distance * MARCH_SAFETY, settings.hitEpsilon * 0.5);
        if (z < -bound) {
          ranOut = false;
          break;
        }
      }
      if (ranOut) exhausted += 1;
      if (!landed) continue;

      const normal = orbSdfNormal(stack, [ux, uy, z], settings.normalEpsilon);
      const facing = Math.max(
        0,
        normal[0] * light[0] + normal[1] * light[1] + normal[2] * light[2],
      );
      const index = py * size + px;
      coverage[index] = 1;
      depth[index] = z;
      luminance[index] = settings.ambient + (1 - settings.ambient) * facing;
    }
  }

  return { size, luminance, coverage, depth, steps, exhausted, refined };
}

/** The render's coverage as a mask, for `silhouetteIoU`. */
export function clayCoverageMask(render: ClayRender): { size: number; data: Uint8Array } {
  return { size: render.size, data: render.coverage };
}

/**
 * The rendered form's outer silhouette, read back off the coverage mask.
 *
 * Measuring the render rather than the field is deliberate: it is the only check
 * that catches a march that punched through a thin feature. `orbSilhouetteRadius`
 * would report the hem the field contains even if every ray had stepped straight
 * past it.
 */
export function clayCoverageRadii(
  render: ClayRender,
  centerPx: readonly [number, number],
  angleCount = 360,
): number[] {
  const frameScale = 360 / render.size;
  const radii: number[] = [];
  for (let i = 0; i < angleCount; i += 1) {
    const angle = (i / angleCount) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    let outermost = 0;
    // Walk inward from beyond the frame and stop at the first covered sample, so a
    // detached speck outside the form cannot be mistaken for the silhouette.
    for (let r = 200; r >= 0; r -= 0.25) {
      const fx = centerPx[0] + r * cos;
      const fy = centerPx[1] + r * sin;
      const sx = Math.round(fx / frameScale);
      const sy = Math.round(fy / frameScale);
      if (sx < 0 || sy < 0 || sx >= render.size || sy >= render.size) continue;
      if (render.coverage[sy * render.size + sx] !== 0) {
        outermost = r;
        break;
      }
    }
    radii.push(outermost);
  }
  return radii;
}
