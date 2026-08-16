/**
 * Likeness metrics for the orb form.
 *
 * The acceptance gate in `design-spec/HeroAssembly.v3.md` has always been stated
 * in pixels — "outer silhouette landmarks: within 2 px at the frozen 360 px
 * frame" — but nothing computed it, so no iteration could tell whether it was
 * getting closer. These functions compute it.
 *
 * Deviation is measured geometrically, as the distance from each reference point
 * to the nearest point on the candidate curve, not as a radius difference at
 * matched angle. Two rings can share every radius and still be offset from one
 * another; the geometric distance notices, the radius difference does not.
 */

import type { ContourPoint, TracedContour } from './master-contour';
import { tracedContourPoints } from './master-contour';

export interface ContourDeviation {
  readonly rmsPx: number;
  readonly maxPx: number;
  /** Angle in radians where `maxPx` occurs, measured on the reference ring. */
  readonly maxAtAngle: number;
  /** Per-sample distance from the reference ring to the candidate curve. */
  readonly perAngle: readonly number[];
}

export interface LandmarkDeviation {
  readonly id: string;
  readonly distancePx: number;
  readonly tolerancePx: number;
  readonly withinTolerance: boolean;
}

export interface FrameLandmark {
  readonly id: string;
  /** Position in frozen-frame pixels. */
  readonly point: ContourPoint;
  readonly tolerancePx: number;
}

function distanceToSegment(point: ContourPoint, a: ContourPoint, b: ContourPoint): number {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const lengthSquared = abx * abx + aby * aby;
  if (lengthSquared === 0) return Math.hypot(point[0] - a[0], point[1] - a[1]);
  let t = ((point[0] - a[0]) * abx + (point[1] - a[1]) * aby) / lengthSquared;
  t = Math.min(1, Math.max(0, t));
  return Math.hypot(point[0] - (a[0] + abx * t), point[1] - (a[1] + aby * t));
}

/** Shortest distance from a point to a closed polyline, in the polyline's units. */
export function distanceToClosedPolyline(point: ContourPoint, polyline: readonly ContourPoint[]): number {
  let shortest = Infinity;
  for (let i = 0; i < polyline.length; i += 1) {
    const distance = distanceToSegment(point, polyline[i], polyline[(i + 1) % polyline.length]);
    if (distance < shortest) shortest = distance;
  }
  return shortest;
}

/**
 * How far the candidate silhouette sits from the reference silhouette.
 *
 * Both rings are resolved to frame-pixel points about their own centres first,
 * so a candidate that is the right shape in the wrong place reports the offset
 * rather than hiding it.
 */
export function contourDeviation(
  candidate: TracedContour,
  reference: TracedContour,
  sampleCount = 360,
): ContourDeviation {
  if (candidate.frameSize !== reference.frameSize) {
    throw new Error(
      `Deviation needs one frame: candidate is ${candidate.frameSize} px, reference is ${reference.frameSize} px.`,
    );
  }
  const candidatePoints = tracedContourPoints(candidate, Math.max(sampleCount, 360));
  const referencePoints = tracedContourPoints(reference, sampleCount);

  const perAngle: number[] = [];
  let sumSquares = 0;
  let maxPx = 0;
  let maxIndex = 0;
  for (let i = 0; i < referencePoints.length; i += 1) {
    const distance = distanceToClosedPolyline(referencePoints[i], candidatePoints);
    perAngle.push(distance);
    sumSquares += distance * distance;
    if (distance > maxPx) {
      maxPx = distance;
      maxIndex = i;
    }
  }

  return {
    rmsPx: Math.sqrt(sumSquares / referencePoints.length),
    maxPx,
    maxAtAngle: (maxIndex / referencePoints.length) * Math.PI * 2,
    perAngle,
  };
}

/** Distance from each named landmark to the candidate silhouette. */
export function landmarkDeviation(
  candidate: TracedContour,
  landmarks: readonly FrameLandmark[],
  sampleCount = 720,
): readonly LandmarkDeviation[] {
  const points = tracedContourPoints(candidate, sampleCount);
  return landmarks.map((landmark) => {
    const distancePx = distanceToClosedPolyline(landmark.point, points);
    return {
      id: landmark.id,
      distancePx,
      tolerancePx: landmark.tolerancePx,
      withinTolerance: distancePx <= landmark.tolerancePx,
    };
  });
}

export interface SilhouetteMask {
  readonly size: number;
  /** Non-zero where the form covers the pixel. */
  readonly data: Uint8Array;
}

export interface MaskComparison {
  readonly intersectionOverUnion: number;
  readonly candidateArea: number;
  readonly referenceArea: number;
  readonly onlyCandidate: number;
  readonly onlyReference: number;
}

/**
 * Coverage agreement between two silhouettes.
 *
 * Material independent by construction: it asks only which pixels the form
 * occupies, which is why a matte clay render can legitimately be scored against
 * a glass reference.
 */
export function silhouetteIoU(candidate: SilhouetteMask, reference: SilhouetteMask): MaskComparison {
  if (candidate.size !== reference.size) {
    throw new Error(`Mask sizes differ: ${candidate.size} vs ${reference.size}.`);
  }
  let intersection = 0;
  let union = 0;
  let candidateArea = 0;
  let referenceArea = 0;
  let onlyCandidate = 0;
  let onlyReference = 0;
  for (let i = 0; i < candidate.data.length; i += 1) {
    const inCandidate = candidate.data[i] !== 0;
    const inReference = reference.data[i] !== 0;
    if (inCandidate) candidateArea += 1;
    if (inReference) referenceArea += 1;
    if (inCandidate && inReference) intersection += 1;
    if (inCandidate || inReference) union += 1;
    if (inCandidate && !inReference) onlyCandidate += 1;
    if (!inCandidate && inReference) onlyReference += 1;
  }
  return {
    intersectionOverUnion: union === 0 ? 1 : intersection / union,
    candidateArea,
    referenceArea,
    onlyCandidate,
    onlyReference,
  };
}

/** Fill a mask from a traced ring, for comparison against a rendered coverage mask. */
export function tracedContourToMask(contour: TracedContour, sampleCount = 1440): SilhouetteMask {
  const size = contour.frameSize;
  const data = new Uint8Array(size * size);
  const points = tracedContourPoints(contour, sampleCount);
  for (let y = 0; y < size; y += 1) {
    const testY = y + 0.5;
    for (let x = 0; x < size; x += 1) {
      const testX = x + 0.5;
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        const [xi, yi] = points[i];
        const [xj, yj] = points[j];
        if (yi > testY !== yj > testY && testX < ((xj - xi) * (testY - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      if (inside) data[y * size + x] = 1;
    }
  }
  return { size, data };
}

export interface NormalizedRing {
  /** Counter-clockwise radial samples in orb-local units, starting at the positive X axis. */
  readonly radiusSamples: readonly number[];
  readonly rotation: number;
  readonly center: readonly [x: number, y: number];
}

/**
 * Place a normalized authored ring into the frozen frame so it can be compared
 * with a trace. Orb-local Y points up; frame Y points down.
 */
export function normalizedRingToTraced(
  ring: NormalizedRing,
  placement: { readonly frameSize: number; readonly unitPx: number; readonly centerPx: readonly [number, number] },
  angleCount = 360,
): TracedContour {
  const count = ring.radiusSamples.length;
  const radiiPx: number[] = [];
  const centerOffsetX = ring.center[0] * placement.unitPx;
  const centerOffsetY = ring.center[1] * placement.unitPx;
  const centerPx: readonly [number, number] = [
    placement.centerPx[0] + centerOffsetX,
    placement.centerPx[1] - centerOffsetY,
  ];

  for (let i = 0; i < angleCount; i += 1) {
    // Frame angles run clockwise in screen space; orb-local angles run counter-clockwise.
    const frameAngle = (i / angleCount) * Math.PI * 2;
    const localAngle = -frameAngle;
    const normalized = (((localAngle - ring.rotation) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const position = (normalized / (Math.PI * 2)) * count;
    const index = Math.floor(position);
    const t = position - index;
    const wrap = (value: number): number => ((value % count) + count) % count;
    const p0 = ring.radiusSamples[wrap(index - 1)];
    const p1 = ring.radiusSamples[wrap(index)];
    const p2 = ring.radiusSamples[wrap(index + 1)];
    const p3 = ring.radiusSamples[wrap(index + 2)];
    const radius =
      0.5 *
      (2 * p1 +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
    radiiPx.push(radius * placement.unitPx);
  }

  return { angleCount, radiiPx, centerPx, frameSize: placement.frameSize };
}
