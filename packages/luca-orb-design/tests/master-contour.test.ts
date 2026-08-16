import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TRACE_OPTIONS,
  MASTER_SOURCE_SHA256,
  contourAnisotropy,
  contourRoughnessPx,
  extractMasterContour,
  tracedContourExtremes,
  tracedContourPoints,
  verifyMasterSource,
  type CenterSearchOptions,
  type HeroFrame,
  type Rgba8Image,
  type TracedContour,
} from '../src/trace/master-contour';
import {
  contourDeviation,
  landmarkDeviation,
  silhouetteIoU,
  tracedContourToMask,
} from '../src/trace/deviation';
import {
  HERO_CONTOUR_FRAME,
  HERO_CONTOUR_V1,
  HERO_CONTOUR_V1_LANDMARKS,
  HERO_CONTOUR_V1_PATH,
  HERO_CONTOUR_V1_PROVENANCE,
} from '../src/trace/hero-contour.v1';
import { LUCA_HERO_BLUEPRINT_V1 } from '../src/geometry/hero-blueprint';

const TAU = Math.PI * 2;

/** Semi-axes and centre of the synthetic ground truth, in pixels. */
const ELLIPSE = { size: 180, cx: 90, cy: 90, a: 70, b: 52, edgeHalfWidthPx: 1.25 } as const;

const SYNTHETIC_FRAME: HeroFrame = {
  sourceSize: [ELLIPSE.size, ELLIPSE.size],
  cropPixels: [0, 0, ELLIPSE.size, ELLIPSE.size],
  outputSize: ELLIPSE.size,
};

const SYNTHETIC_OPTIONS = {
  angleCount: 180,
  radiusMinPx: 30,
  radiusMaxPx: 88,
  seedCount: 12,
} as const;

/**
 * The synthetic ellipse's centroid is its centre by construction, so the offset
 * search has nothing to find and is reduced to a single evaluation. This keeps
 * the correctness test about the extraction method rather than the search.
 */
const NO_CENTER_SEARCH: CenterSearchOptions = {
  rangePx: 0,
  stepPx: 1,
  iterations: 1,
  probe: {},
};

/** Analytic polar radius of an axis-aligned ellipse. */
function ellipseRadius(angle: number, a: number, b: number): number {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return (a * b) / Math.hypot(b * cos, a * sin);
}

/**
 * Exact signed distance from a point to an axis-aligned ellipse, positive inside.
 *
 * Newton on the closest-point condition `(p - q(t)) . q'(t) = 0`, solved in the
 * first quadrant and mirrored back. The obvious shortcut — scaling the implicit
 * value `1 - |(x/a, y/b)|` by its own gradient — is only first order, and it
 * misplaces the edge by a measurable fraction of a pixel exactly where curvature
 * is highest. That bias would land in the extracted radii and get mistaken for
 * extractor error.
 */
function ellipseSignedDistance(px: number, py: number, a: number, b: number): number {
  const x = Math.abs(px);
  const y = Math.abs(py);
  let t = Math.atan2(y / b, x / a);
  for (let i = 0; i < 24; i += 1) {
    const cos = Math.cos(t);
    const sin = Math.sin(t);
    const dx = x - a * cos;
    const dy = y - b * sin;
    const f = dx * -a * sin + dy * b * cos;
    const df = -a * a * sin * sin - b * b * cos * cos - a * cos * dx - b * sin * dy;
    if (df === 0) break;
    const next = t - f / df;
    if (!Number.isFinite(next) || Math.abs(next - t) < 1e-14) {
      t = next;
      break;
    }
    t = next;
  }
  const distance = Math.hypot(x - a * Math.cos(t), y - b * Math.sin(t));
  const inside = Math.hypot(x / a, y / b) <= 1;
  return inside ? distance : -distance;
}

/**
 * An anti-aliased filled ellipse, white on black.
 *
 * The edge ramp is a smoothstep over the exact signed distance, so the gradient
 * magnitude peaks precisely on the true boundary. A linear ramp would have
 * constant gradient across its whole width and give the subpixel fit nothing to
 * locate.
 *
 * Pixel `(x, y)` samples the plane at exactly `(x, y)` — the convention documented
 * on `ScalarField`, and not the graphics-conventional `(x + 0.5, y + 0.5)`. Using
 * pixel-corner sampling here while the extractor reads pixel centres put the
 * synthetic boundary half a pixel off its nominal place, which then showed up as
 * extractor error it had not committed.
 */
function renderEllipseImage(): Rgba8Image {
  const { size, cx, cy, a, b, edgeHalfWidthPx } = ELLIPSE;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distancePx = ellipseSignedDistance(x - cx, y - cy, a, b);
      const t = Math.min(1, Math.max(0, distancePx / (2 * edgeHalfWidthPx) + 0.5));
      const value = Math.round(255 * t * t * (3 - 2 * t));
      const p = (y * size + x) * 4;
      data[p] = value;
      data[p + 1] = value;
      data[p + 2] = value;
      data[p + 3] = 255;
    }
  }
  return { width: size, height: size, data };
}

function analyticEllipseContour(angleCount: number): TracedContour {
  const radiiPx: number[] = [];
  for (let i = 0; i < angleCount; i += 1) {
    radiiPx.push(ellipseRadius((i / angleCount) * TAU, ELLIPSE.a, ELLIPSE.b));
  }
  return {
    angleCount,
    radiiPx,
    centerPx: [ELLIPSE.cx, ELLIPSE.cy],
    frameSize: ELLIPSE.size,
  };
}

describe('silhouette extraction, against a shape whose answer is known', () => {
  const image = renderEllipseImage();
  const traced = extractMasterContour(image, SYNTHETIC_FRAME, SYNTHETIC_OPTIONS, NO_CENTER_SEARCH);

  it('recovers an analytic ellipse to subpixel accuracy', () => {
    const truth = analyticEllipseContour(SYNTHETIC_OPTIONS.angleCount);
    const deviation = contourDeviation(traced.contour, truth);

    expect(deviation.rmsPx).toBeLessThan(0.5);
    expect(deviation.maxPx).toBeLessThan(1.2);
    expect(traced.diagnostics.meanEdgeStrength).toBeGreaterThan(0.8);
  });

  it('measures the ellipse proportions rather than assuming them', () => {
    // 2a / 2b for a = 70, b = 52.
    expect(contourAnisotropy(traced.contour.radiiPx)).toBeCloseTo(140 / 104, 2);
    expect(traced.diagnostics.minRadiusPx).toBeCloseTo(ELLIPSE.b, 0);
    expect(traced.diagnostics.maxRadiusPx).toBeCloseTo(ELLIPSE.a, 0);
  });

  it('is deterministic — the same source yields byte-identical numbers', () => {
    const again = extractMasterContour(image, SYNTHETIC_FRAME, SYNTHETIC_OPTIONS, NO_CENTER_SEARCH);

    expect(again.contour).toEqual(traced.contour);
    expect(again.diagnostics).toEqual(traced.diagnostics);
  });

  it('finds the extremes on the axes, where an axis-aligned ellipse puts them', () => {
    const extremes = tracedContourExtremes(traced.contour);

    expect(extremes.top[1]).toBeCloseTo(ELLIPSE.cy - ELLIPSE.b, 0);
    expect(extremes.bottom[1]).toBeCloseTo(ELLIPSE.cy + ELLIPSE.b, 0);
    expect(extremes.left[0]).toBeCloseTo(ELLIPSE.cx - ELLIPSE.a, 0);
    expect(extremes.right[0]).toBeCloseTo(ELLIPSE.cx + ELLIPSE.a, 0);

    /*
     * Only the extremal coordinate of each extreme is well conditioned. The ring
     * is nearly flat where it turns — radius of curvature a^2/b is 94 px at the
     * top — so a tenth of a pixel of radial noise slides the argmax several
     * pixels sideways while its height stays correct. The transverse coordinate
     * is therefore bounded loosely and on purpose; a gate must not depend on it.
     */
    expect(extremes.top[0]).toBeGreaterThan(ELLIPSE.cx - 4);
    expect(extremes.top[0]).toBeLessThan(ELLIPSE.cx + 4);
    expect(extremes.right[1]).toBeGreaterThan(ELLIPSE.cy - 4);
    expect(extremes.right[1]).toBeLessThan(ELLIPSE.cy + 4);
  });
});

describe('the frozen master gate', () => {
  it('accepts the frozen digest in either case, with surrounding whitespace', () => {
    expect(() => verifyMasterSource(MASTER_SOURCE_SHA256)).not.toThrow();
    expect(() => verifyMasterSource(` ${MASTER_SOURCE_SHA256.toLowerCase()}\n`)).not.toThrow();
  });

  it('refuses a source that is not the master, however close', () => {
    const nudged = `${MASTER_SOURCE_SHA256.slice(0, -1)}${MASTER_SOURCE_SHA256.endsWith('A') ? 'B' : 'A'}`;

    expect(() => verifyMasterSource(nudged)).toThrow(/not the frozen master/);
    expect(() => verifyMasterSource('')).toThrow(/not the frozen master/);
  });
});

describe('deviation metrics', () => {
  const truth = analyticEllipseContour(180);

  it('reports zero against itself', () => {
    const deviation = contourDeviation(truth, truth);

    expect(deviation.rmsPx).toBeLessThan(1e-9);
    expect(deviation.maxPx).toBeLessThan(1e-9);
    expect(deviation.perAngle).toHaveLength(360);
  });

  it('notices a right shape in the wrong place, which matched radii would not', () => {
    const shifted: TracedContour = { ...truth, centerPx: [ELLIPSE.cx + 6, ELLIPSE.cy] };

    expect(shifted.radiiPx).toEqual(truth.radiiPx);
    expect(contourDeviation(shifted, truth).maxPx).toBeGreaterThan(3);
  });

  it('refuses to compare across two different frames', () => {
    const other: TracedContour = { ...truth, frameSize: truth.frameSize * 2 };

    expect(() => contourDeviation(other, truth)).toThrow(/one frame/);
  });

  it('scores a silhouette against itself as full overlap', () => {
    const mask = tracedContourToMask(truth, 360);
    const comparison = silhouetteIoU(mask, mask);

    expect(comparison.intersectionOverUnion).toBe(1);
    expect(comparison.onlyCandidate).toBe(0);
    expect(comparison.onlyReference).toBe(0);
    // Area of the ellipse, within a percent of pi*a*b.
    expect(comparison.candidateArea / (Math.PI * ELLIPSE.a * ELLIPSE.b)).toBeCloseTo(1, 2);
  });
});

describe('the committed hero contour', () => {
  it('carries the frozen frame from the specification', () => {
    expect(HERO_CONTOUR_FRAME.sourceSize).toEqual([1536, 1024]);
    expect(HERO_CONTOUR_FRAME.cropPixels).toEqual([400, 86, 360, 360]);
    expect(HERO_CONTOUR_V1.frameSize).toBe(HERO_CONTOUR_FRAME.outputSize);
    expect(HERO_CONTOUR_V1.radiiPx).toHaveLength(HERO_CONTOUR_V1.angleCount);
    expect(HERO_CONTOUR_V1.angleCount).toBe(DEFAULT_TRACE_OPTIONS.angleCount);
    expect(HERO_CONTOUR_V1_PROVENANCE.sourceSha256).toBe(MASTER_SOURCE_SHA256);
  });

  /**
   * The generated file says "do not edit by hand". This is what enforces it: the
   * declared measurements are recomputed from the radii they describe, so
   * adjusting a radius to flatter a renderer breaks the file that records it.
   */
  it('agrees with the measurements it declares', () => {
    const radii = HERO_CONTOUR_V1.radiiPx;

    expect(contourRoughnessPx(radii)).toBeCloseTo(HERO_CONTOUR_V1_PROVENANCE.roughnessPx, 2);
    expect(contourAnisotropy(radii)).toBeCloseTo(HERO_CONTOUR_V1_PROVENANCE.anisotropy, 3);
    expect(Math.min(...radii)).toBeCloseTo(HERO_CONTOUR_V1_PROVENANCE.minRadiusPx, 2);
    expect(Math.max(...radii)).toBeCloseTo(HERO_CONTOUR_V1_PROVENANCE.maxRadiusPx, 2);
    expect(radii.reduce((sum, r) => sum + r, 0) / radii.length).toBeCloseTo(
      HERO_CONTOUR_V1_PROVENANCE.meanRadiusPx,
      2,
    );
  });

  it('is a smooth closed ring, not a jagged one', () => {
    const radii = HERO_CONTOUR_V1.radiiPx;
    const perSampleCurvature = contourRoughnessPx(radii) / radii.length;

    expect(perSampleCurvature).toBeLessThan(0.5);
    expect(radii.every((radius) => Number.isFinite(radius) && radius > 0)).toBe(true);
    // The ring closes: the wrap-around step is no larger than a typical one.
    const wrapStep = Math.abs(radii[0] - radii[radii.length - 1]);
    expect(wrapStep).toBeLessThanOrEqual(DEFAULT_TRACE_OPTIONS.maxRadialStepPx);
  });

  it('places its landmarks on its own ring', () => {
    const points = tracedContourPoints(HERO_CONTOUR_V1, 2880);
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);

    expect(HERO_CONTOUR_V1_LANDMARKS.crownApex[1]).toBeCloseTo(Math.min(...ys), 3);
    expect(HERO_CONTOUR_V1_LANDMARKS.lowerFoldApex[1]).toBeCloseTo(Math.max(...ys), 3);
    expect(HERO_CONTOUR_V1_LANDMARKS.leftmostMembrane[0]).toBeCloseTo(Math.min(...xs), 3);
    expect(HERO_CONTOUR_V1_LANDMARKS.rightmostReturn[0]).toBeCloseTo(Math.max(...xs), 3);
  });
});

describe('the 2D identity gate surface', () => {
  const measuredLayers = LUCA_HERO_BLUEPRINT_V1.layers.filter(
    ({ provenance }) => provenance === 'measured',
  );

  it('draws its outer silhouette from the trace, not from a transcription', () => {
    const silhouette = LUCA_HERO_BLUEPRINT_V1.layers.find(({ id }) => id === 'outer-silhouette');

    expect(silhouette?.provenance).toBe('measured');
    expect(silhouette?.path).toBe(HERO_CONTOUR_V1_PATH);
    expect(measuredLayers).toHaveLength(1);
  });

  /**
   * The guard on the `measured` tag. Anything claiming to be measured must sit on
   * the traced ring, so the label cannot be applied to a guess.
   */
  it('keeps every measured landmark on the traced silhouette', () => {
    const measured = LUCA_HERO_BLUEPRINT_V1.landmarks.filter(
      ({ provenance }) => provenance === 'measured',
    );

    expect(measured).toHaveLength(4);
    const deviations = landmarkDeviation(
      HERO_CONTOUR_V1,
      measured.map(({ id, x, y }) => ({ id, point: [x, y] as const, tolerancePx: 0.5 })),
    );
    expect(deviations.filter(({ withinTolerance }) => !withinTolerance)).toEqual([]);
  });

  it('marks the interior layers as unverified so they are not approved as traced', () => {
    const interior = LUCA_HERO_BLUEPRINT_V1.layers.filter(({ id }) => id !== 'outer-silhouette');

    expect(interior).toHaveLength(4);
    expect(interior.every(({ provenance }) => provenance === 'hand-authored')).toBe(true);
    // The label is what the review surface renders, so the caveat has to live there.
    expect(interior.every(({ label }) => label.includes('drawn by eye'))).toBe(true);
  });
});
