/** A normalized two-dimensional point in orb-local space. */
export type OrbVolumePoint = readonly [x: number, y: number];

export interface OrbContour {
  /** Counter-clockwise radial samples beginning at the positive X axis. */
  readonly radiusSamples: readonly number[];
  /** Rotation applied before sampling, in radians. */
  readonly rotation: number;
  /** Offset from the renderer's logical centre. */
  readonly center: OrbVolumePoint;
}

export interface OrbInnerLobe extends OrbContour {
  /** Elliptical basis applied before the authored radial contour. */
  readonly axes: OrbVolumePoint;
}

export interface OrbDepthProfile {
  /** Maximum distance from the neutral plane, in orb-local units. */
  readonly maxHalfDepth: number;
  /** Controls how long the volume keeps its depth before turning toward the rim. */
  readonly radialExponent: number;
  /** Controls the softness of the shoulder-to-rim transition. */
  readonly shoulderExponent: number;
  /** Independent front and rear scales prevent a synthetic mirrored lens. */
  readonly frontScale: number;
  readonly rearScale: number;
  /** Small authored depth lean across the face of the volume. */
  readonly tilt: OrbVolumePoint;
}

export interface CanonicalOrbVolume {
  readonly id: string;
  readonly version: 2;
  readonly sourceSha256: string;
  readonly outer: OrbContour;
  readonly innerLobe: OrbInnerLobe;
  readonly depth: OrbDepthProfile;
}

const outerRadiusSamples = Object.freeze([
  1.110, 1.120, 1.130, 1.100,
  1.020, 0.900, 0.820, 0.780,
  0.790, 0.860, 0.950, 1.050,
  1.140, 1.180, 1.180, 1.150,
  1.100, 1.030, 0.960, 0.910,
  0.880, 0.880, 0.920, 0.980,
  1.050, 1.090, 1.120, 1.140,
  1.160, 1.150, 1.140, 1.120,
]);

const innerLobeRadiusSamples = Object.freeze([
  0.980, 1.015, 1.030, 1.000,
  0.950, 0.930, 0.950, 0.995,
  1.035, 1.065, 1.080, 1.070,
  1.035, 1.000, 0.975, 0.970,
]);

/**
 * Designer-authored volume traced from the canonical Luca product mockup.
 *
 * This is identity geometry, not an animation preset. Motion may perturb the
 * contour slightly, but must always settle back to these samples.
 */
export const CANONICAL_LUCA_VOLUME_V2: CanonicalOrbVolume = Object.freeze({
  id: 'luca-living-orb/product-master',
  version: 2,
  sourceSha256: '4841901ECD4222760D8E532671DA493066A82CE2CCEE4AC0CA35054AF0CA074A',
  outer: Object.freeze({
    radiusSamples: outerRadiusSamples,
    rotation: -0.035,
    center: Object.freeze([0.005, -0.020] as const),
  }),
  innerLobe: Object.freeze({
    radiusSamples: innerLobeRadiusSamples,
    rotation: -0.16,
    center: Object.freeze([-0.065, -0.035] as const),
    axes: Object.freeze([0.76, 0.79] as const),
  }),
  depth: Object.freeze({
    maxHalfDepth: 0.92,
    radialExponent: 1.72,
    shoulderExponent: 0.58,
    frontScale: 1.0,
    rearScale: 0.86,
    tilt: Object.freeze([-0.08, 0.055] as const),
  }),
});

const TAU = Math.PI * 2;

function wrapIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

/** Sample a closed authored contour with Catmull-Rom interpolation. */
export function sampleOrbContour(contour: OrbContour, angleRadians: number): number {
  const count = contour.radiusSamples.length;
  if (count < 4) throw new Error('Orb contours require at least four radial samples.');

  const normalized = ((angleRadians - contour.rotation) % TAU + TAU) % TAU;
  const position = normalized / TAU * count;
  const index = Math.floor(position);
  const t = position - index;
  const p0 = contour.radiusSamples[wrapIndex(index - 1, count)];
  const p1 = contour.radiusSamples[wrapIndex(index, count)];
  const p2 = contour.radiusSamples[wrapIndex(index + 1, count)];
  const p3 = contour.radiusSamples[wrapIndex(index + 2, count)];

  return 0.5 * (
    2 * p1
    + (-p0 + p2) * t
    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
    + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t
  );
}

/** Sample the authored half-depth used to construct the front and rear meshes. */
export function sampleOrbHalfDepth(
  profile: OrbDepthProfile,
  radialPosition: number,
  localPoint: OrbVolumePoint,
): number {
  const radial = Math.min(1, Math.max(0, radialPosition));
  const shoulder = Math.pow(
    Math.max(0, 1 - Math.pow(radial, profile.radialExponent)),
    profile.shoulderExponent,
  );
  const lean = Math.min(1.18, Math.max(
    0.82,
    1 + localPoint[0] * profile.tilt[0] + localPoint[1] * profile.tilt[1],
  ));
  return profile.maxHalfDepth * shoulder * lean;
}

/** Structural validation used by tooling; it does not claim visual certification. */
export function validateCanonicalOrbVolume(volume: CanonicalOrbVolume): string[] {
  const issues: string[] = [];
  const contours: Array<[string, OrbContour]> = [
    ['outer', volume.outer],
    ['innerLobe', volume.innerLobe],
  ];

  for (const [name, contour] of contours) {
    if (contour.radiusSamples.length < 12) issues.push(`${name} contour has insufficient samples`);
    if (contour.radiusSamples.some((radius) => !Number.isFinite(radius) || radius <= 0)) {
      issues.push(`${name} contour contains an invalid radius`);
    }
    const largestStep = contour.radiusSamples.reduce((largest, radius, index, samples) => {
      const next = samples[(index + 1) % samples.length];
      return Math.max(largest, Math.abs(radius - next));
    }, 0);
    if (largestStep > 0.12) issues.push(`${name} contour has a discontinuity`);
  }

  if (volume.innerLobe.axes.some((axis) => axis <= 0 || axis >= 1)) {
    issues.push('innerLobe axes must remain inside the outer volume');
  }


  const { depth } = volume;
  if (depth.maxHalfDepth <= 0 || depth.maxHalfDepth > 1) issues.push('depth maximum must be in (0, 1]');
  if (depth.radialExponent <= 0 || depth.shoulderExponent <= 0) issues.push('depth exponents must be positive');
  if (depth.frontScale <= 0 || depth.rearScale <= 0) issues.push('depth surface scales must be positive');

  return issues;
}
