/**
 * Silhouette extraction for the canonical Luca product master.
 *
 * The outer contour under `geometry/canonical-volume.ts` was asserted by hand.
 * This module derives one instead: it finds the single closed edge ring in the
 * frozen hero frame and reports it at subpixel accuracy, so "how far is this
 * render from the reference" becomes a number rather than a judgement.
 *
 * Pure arithmetic only. No node builtins and no image codec, because this file
 * ships to the renderer through the package barrel. Decoding, hashing and file
 * writes belong to `scripts/orb-trace-master.mjs`.
 *
 * Why a dynamic-programming ring search rather than a per-ray edge hunt: the
 * master's aura is drawn as sparse radial ticks that are locally stronger edges
 * than the membrane rim. An independent search per ray latches onto them. A
 * single path constrained to move smoothly in radius cannot, because the ticks
 * do not form a continuous ring.
 */

/** SHA-256 of the only image allowed to define the form, upper case hex. */
export const MASTER_SOURCE_SHA256 =
  '4841901ECD4222760D8E532671DA493066A82CE2CCEE4AC0CA35054AF0CA074A';

const TAU = Math.PI * 2;

export interface Rgba8Image {
  readonly width: number;
  readonly height: number;
  /** Row-major RGBA, four bytes per pixel. */
  readonly data: Uint8Array;
}

/**
 * A real-valued image.
 *
 * PIXEL CONVENTION, and everything downstream depends on it: the sample at index
 * `i` sits at coordinate `i`, not `i + 0.5`. So a 360 px frame spans coordinates
 * 0..359 and its geometric centre is 179.5. Anything that compares against a
 * traced contour — the clay renderer, a rasterized mask, a shader — has to
 * rasterize on the same convention, or it starts half a pixel behind on a budget
 * of two.
 */
export interface ScalarField {
  readonly width: number;
  readonly height: number;
  readonly data: Float64Array;
}

export interface HeroFrame {
  readonly sourceSize: readonly [width: number, height: number];
  /** Square source crop containing the hero orb and its aura. */
  readonly cropPixels: readonly [x: number, y: number, width: number, height: number];
  readonly outputSize: number;
}

/** A closed silhouette measured in frozen-frame pixels. */
export interface TracedContour {
  readonly angleCount: number;
  /** Radius per angle, angle `i` at `i / angleCount * TAU` from the positive X axis. */
  readonly radiiPx: readonly number[];
  /** Ring centre the radii are measured from, in frame pixels. */
  readonly centerPx: readonly [x: number, y: number];
  readonly frameSize: number;
}

export interface TraceOptions {
  readonly angleCount: number;
  readonly radiusMinPx: number;
  readonly radiusMaxPx: number;
  readonly radiusStepPx: number;
  /** Largest radial change permitted between adjacent angles, in pixels. */
  readonly maxRadialStepPx: number;
  /** Cost charged per pixel of radial change; the smoothness term. */
  readonly stepPenaltyPerPx: number;
  /** Ring start radii tried before keeping the cheapest closed path. */
  readonly seedCount: number;
  /**
   * Decimal places the measured radii are rounded to.
   *
   * The trace's output is committed as source, so it is quantized before the
   * diagnostics are computed rather than after. Otherwise the artifact declares a
   * roughness measured on numbers it does not contain — rounding 360 radii to a
   * thousandth of a pixel moves the summed second difference by ~0.014 px, which
   * is small but is exactly the drift the integrity test exists to catch.
   */
  readonly radiusPrecisionDigits: number;
}

/**
 * Tuned against the master, not assumed.
 *
 * The band brackets the measured rim (r 108..138 px) with room to spare rather
 * than hugging it. `maxRadialStepPx` is the term that rejects the aura: a tick
 * sits ~20 px outside the rim, and at 2 px per angle the ring cannot reach one
 * and return without paying for ten angles of detour. The penalty is then set
 * low enough that following the true shape — which needs about 0.7 px per angle
 * — costs less than the edge strength it gains.
 */
export const DEFAULT_TRACE_OPTIONS: TraceOptions = Object.freeze({
  angleCount: 360,
  radiusMinPx: 80,
  radiusMaxPx: 165,
  radiusStepPx: 0.5,
  maxRadialStepPx: 2,
  stepPenaltyPerPx: 0.25,
  seedCount: 60,
  radiusPrecisionDigits: 3,
});

export interface CenterSearchOptions {
  /** Half-width of the offset grid searched around the starting centre. */
  readonly rangePx: number;
  readonly stepPx: number;
  readonly iterations: number;
  /** Cheaper trace settings used while searching; the final trace uses the full set. */
  readonly probe: Partial<TraceOptions>;
}

export const DEFAULT_CENTER_SEARCH: CenterSearchOptions = Object.freeze({
  rangePx: 10,
  stepPx: 2.5,
  iterations: 3,
  probe: Object.freeze({ angleCount: 180, radiusStepPx: 1, seedCount: 12 }),
});

export interface TraceDiagnostics {
  /** Total absolute second difference of the radius ring, in pixels. */
  readonly roughnessPx: number;
  /** Widest span divided by tallest span. */
  readonly anisotropy: number;
  readonly meanRadiusPx: number;
  readonly minRadiusPx: number;
  readonly maxRadiusPx: number;
  /** Mean normalized edge strength along the accepted ring, in [0, 1]. */
  readonly meanEdgeStrength: number;
  /** The traced ring's total path cost; comparable only within one edge field. */
  readonly totalCost: number;
}

export interface MasterTraceResult {
  readonly contour: TracedContour;
  readonly diagnostics: TraceDiagnostics;
}

/**
 * Reject any source that is not the frozen master.
 *
 * `HeroAssembly.v3.md`: the reference frame "must not be adjusted to make a
 * renderer candidate appear closer". Neither may the reference image, so the
 * trace refuses to run rather than silently producing a different truth.
 */
export function verifyMasterSource(sha256Hex: string): void {
  const actual = sha256Hex.trim().toUpperCase();
  if (actual !== MASTER_SOURCE_SHA256) {
    throw new Error(
      `Refusing to trace: source SHA-256 ${actual} is not the frozen master ${MASTER_SOURCE_SHA256}.`,
    );
  }
}

/**
 * Luminance premultiplied by alpha, so anything transparent reads as the dark
 * field the master is composed against rather than as white.
 */
export function toLuminanceField(image: Rgba8Image): ScalarField {
  const { width, height, data } = image;
  const out = new Float64Array(width * height);
  for (let i = 0, p = 0; i < out.length; i += 1, p += 4) {
    const alpha = data[p + 3] / 255;
    out[i] = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) * alpha;
  }
  return { width, height, data: out };
}

export function sampleFieldBilinear(field: ScalarField, x: number, y: number): number {
  const { width, height, data } = field;
  const cx = Math.min(width - 1, Math.max(0, x));
  const cy = Math.min(height - 1, Math.max(0, y));
  const x0 = Math.min(width - 1, Math.floor(cx));
  const y0 = Math.min(height - 1, Math.floor(cy));
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = cx - x0;
  const ty = cy - y0;
  const top = data[y0 * width + x0] * (1 - tx) + data[y0 * width + x1] * tx;
  const bottom = data[y1 * width + x0] * (1 - tx) + data[y1 * width + x1] * tx;
  return top * (1 - ty) + bottom * ty;
}

/** Extract the frozen evaluation frame. A 1:1 crop is copied, not resampled. */
export function cropField(field: ScalarField, frame: HeroFrame): ScalarField {
  const [cropX, cropY, cropWidth, cropHeight] = frame.cropPixels;
  const size = frame.outputSize;
  if (cropWidth !== cropHeight) {
    throw new Error('The hero evaluation frame must be square.');
  }
  const out = new Float64Array(size * size);
  if (cropWidth === size) {
    for (let y = 0; y < size; y += 1) {
      const sourceRow = (cropY + y) * field.width + cropX;
      for (let x = 0; x < size; x += 1) out[y * size + x] = field.data[sourceRow + x];
    }
    return { width: size, height: size, data: out };
  }
  const scale = cropWidth / size;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      out[y * size + x] = sampleFieldBilinear(
        field,
        cropX + (x + 0.5) * scale - 0.5,
        cropY + (y + 0.5) * scale - 0.5,
      );
    }
  }
  return { width: size, height: size, data: out };
}

/** Separable 3x3 mean. Suppresses the single-pixel aura ticks before differencing. */
export function boxBlur3Field(field: ScalarField): ScalarField {
  const { width, height, data } = field;
  const horizontal = new Float64Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      const left = data[row + Math.max(0, x - 1)];
      const right = data[row + Math.min(width - 1, x + 1)];
      horizontal[row + x] = (left + data[row + x] + right) / 3;
    }
  }
  const out = new Float64Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const up = Math.max(0, y - 1) * width;
    const down = Math.min(height - 1, y + 1) * width;
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      out[row + x] = (horizontal[up + x] + horizontal[row + x] + horizontal[down + x]) / 3;
    }
  }
  return { width, height, data: out };
}

/** Central-difference gradient magnitude, forward/backward at the borders. */
export function gradientMagnitudeField(field: ScalarField): ScalarField {
  const { width, height, data } = field;
  const out = new Float64Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    const up = Math.max(0, y - 1) * width;
    const down = Math.min(height - 1, y + 1) * width;
    for (let x = 0; x < width; x += 1) {
      const left = row + Math.max(0, x - 1);
      const right = row + Math.min(width - 1, x + 1);
      const dx = (data[right] - data[left]) / (Math.min(width - 1, x + 1) - Math.max(0, x - 1) || 1);
      const dy = (data[down + x] - data[up + x]) / (Math.min(height - 1, y + 1) - Math.max(0, y - 1) || 1);
      out[row + x] = Math.hypot(dx, dy);
    }
  }
  return { width, height, data: out };
}

/** Scale a field so its strongest value is 1, leaving the penalty units meaningful. */
export function normalizeField(field: ScalarField): ScalarField {
  let peak = 0;
  for (let i = 0; i < field.data.length; i += 1) {
    if (field.data[i] > peak) peak = field.data[i];
  }
  if (peak <= 0) return field;
  const out = new Float64Array(field.data.length);
  for (let i = 0; i < out.length; i += 1) out[i] = field.data[i] / peak;
  return { width: field.width, height: field.height, data: out };
}

/**
 * Scale a field by a high percentile of the values inside the search annulus.
 *
 * Normalizing by the global peak is what first collapsed this trace to a circle:
 * in the master the strongest gradient in the frame is where the crop cuts a
 * bright plinth reflection at the bottom edge, roughly 40% stronger than the
 * membrane rim. Dividing by it pushed the rim down to ~0.4 and let the smoothness
 * term win everywhere. Measuring the scale over the region the ring can actually
 * occupy keeps the rim near 1 and the penalty comparable to it.
 */
export function normalizeEdgeField(
  field: ScalarField,
  annulus: {
    readonly centerPx: readonly [number, number];
    readonly radiusMinPx: number;
    readonly radiusMaxPx: number;
    readonly percentile?: number;
  },
): ScalarField {
  const percentile = annulus.percentile ?? 0.99;
  const inner = annulus.radiusMinPx * annulus.radiusMinPx;
  const outer = annulus.radiusMaxPx * annulus.radiusMaxPx;
  const inside: number[] = [];
  for (let y = 0; y < field.height; y += 1) {
    const dy = y + 0.5 - annulus.centerPx[1];
    for (let x = 0; x < field.width; x += 1) {
      const dx = x + 0.5 - annulus.centerPx[0];
      const distance = dx * dx + dy * dy;
      if (distance >= inner && distance <= outer) inside.push(field.data[y * field.width + x]);
    }
  }
  if (inside.length === 0) return normalizeField(field);
  inside.sort((a, b) => a - b);
  const scale = inside[Math.min(inside.length - 1, Math.floor(percentile * inside.length))];
  if (!(scale > 0)) return normalizeField(field);
  const out = new Float64Array(field.data.length);
  for (let i = 0; i < out.length; i += 1) out[i] = Math.min(1, field.data[i] / scale);
  return { width: field.width, height: field.height, data: out };
}

/**
 * Intensity-weighted centre of the frame; the starting guess for the ring centre.
 *
 * Weighted by `x`, not `x + 0.5`: sample index and sample position are the same
 * number in this module (see `ScalarField`). Using pixel-corner coordinates here
 * while `sampleFieldBilinear` uses pixel-centre coordinates seeded the centre
 * search half a pixel off, which is a quarter of the entire 2 px gate.
 */
export function luminanceCentroid(field: ScalarField): readonly [number, number] {
  let mass = 0;
  let sumX = 0;
  let sumY = 0;
  for (let y = 0; y < field.height; y += 1) {
    for (let x = 0; x < field.width; x += 1) {
      const value = field.data[y * field.width + x];
      mass += value;
      sumX += value * x;
      sumY += value * y;
    }
  }
  if (mass <= 0) return [(field.width - 1) / 2, (field.height - 1) / 2];
  return [sumX / mass, sumY / mass];
}

export interface HeroEdgeField {
  readonly edge: ScalarField;
  readonly luminance: ScalarField;
  readonly startCenterPx: readonly [number, number];
}

/** Luminance, cropped to the frozen frame, blurred, differenced and normalized. */
export function buildHeroEdgeField(
  image: Rgba8Image,
  frame: HeroFrame,
  options: Partial<TraceOptions> = {},
): HeroEdgeField {
  const [sourceWidth, sourceHeight] = frame.sourceSize;
  if (image.width !== sourceWidth || image.height !== sourceHeight) {
    throw new Error(
      `Source is ${image.width}x${image.height}; the frozen frame declares ${sourceWidth}x${sourceHeight}.`,
    );
  }
  const settings: TraceOptions = { ...DEFAULT_TRACE_OPTIONS, ...options };
  const luminance = cropField(toLuminanceField(image), frame);
  const startCenterPx = luminanceCentroid(luminance);
  const edge = normalizeEdgeField(gradientMagnitudeField(boxBlur3Field(luminance)), {
    centerPx: startCenterPx,
    radiusMinPx: settings.radiusMinPx,
    radiusMaxPx: settings.radiusMaxPx,
  });
  return { edge, luminance, startCenterPx };
}

export interface ClosedRing {
  readonly radiiPx: readonly number[];
  /** Total path cost: negated edge strength plus smoothness penalty. Lower is better. */
  readonly totalCost: number;
}

/**
 * Cheapest closed ring through the edge field.
 *
 * Node cost is the negated edge strength; every pixel of radial change between
 * adjacent angles costs `stepPenaltyPerPx`. The ring is closed by charging the
 * wrap from the last angle back to the seed, so the result is a genuine loop
 * rather than a spiral that happens to start and end nearby.
 *
 * Closing the loop means pinning the radius at angle 0, so that one ray can only
 * take a value the seed sweep offered it. A coarse sweep alone therefore leaves a
 * single ray quantized to the seed spacing — 1.4 px on the master, which is where
 * a reported maximum radius of exactly 143.000 came from, and 1 px on a synthetic
 * ellipse whose other 179 rays were inside 0.09 px. The coarse sweep locates the
 * band, then the pinned ray is freed over every level within one radial step of
 * the winner, for the price of a few more passes rather than one per level.
 */
export function traceClosedRing(
  edge: ScalarField,
  centerPx: readonly [number, number],
  options: TraceOptions,
): ClosedRing {
  const { angleCount, radiusMinPx, radiusMaxPx, radiusStepPx, seedCount } = options;
  const radiusCount = Math.floor((radiusMaxPx - radiusMinPx) / radiusStepPx) + 1;
  if (radiusCount < 4) throw new Error('The radial search band is too narrow to trace.');

  const maxStep = Math.max(1, Math.round(options.maxRadialStepPx / radiusStepPx));
  const stepPenalty = options.stepPenaltyPerPx * radiusStepPx;

  const cost = new Float64Array(angleCount * radiusCount);
  for (let a = 0; a < angleCount; a += 1) {
    const angle = (a / angleCount) * TAU;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    for (let k = 0; k < radiusCount; k += 1) {
      const radius = radiusMinPx + k * radiusStepPx;
      cost[a * radiusCount + k] = -sampleFieldBilinear(
        edge,
        centerPx[0] + dirX * radius,
        centerPx[1] + dirY * radius,
      );
    }
  }

  const dp = new Float64Array(angleCount * radiusCount);
  const parent = new Int32Array(angleCount * radiusCount);
  const bestPath = new Int32Array(angleCount);
  const path = new Int32Array(angleCount);
  let bestTotal = Infinity;
  let bestSeed = -1;

  /** Cheapest loop whose angle-0 radius is pinned to `seed`; keeps it if it wins. */
  const considerSeed = (seed: number): void => {
    for (let k = 0; k < radiusCount; k += 1) {
      dp[k] = k === seed ? cost[k] : Infinity;
      parent[k] = -1;
    }
    for (let a = 1; a < angleCount; a += 1) {
      const row = a * radiusCount;
      const previous = row - radiusCount;
      for (let k = 0; k < radiusCount; k += 1) {
        let best = Infinity;
        let from = -1;
        const low = Math.max(0, k - maxStep);
        const high = Math.min(radiusCount - 1, k + maxStep);
        for (let j = low; j <= high; j += 1) {
          const candidate = dp[previous + j] + stepPenalty * Math.abs(k - j);
          if (candidate < best) {
            best = candidate;
            from = j;
          }
        }
        dp[row + k] = best + cost[row + k];
        parent[row + k] = from;
      }
    }

    const lastRow = (angleCount - 1) * radiusCount;
    let total = Infinity;
    let tail = -1;
    const low = Math.max(0, seed - maxStep);
    const high = Math.min(radiusCount - 1, seed + maxStep);
    for (let k = low; k <= high; k += 1) {
      const candidate = dp[lastRow + k] + stepPenalty * Math.abs(seed - k);
      if (candidate < total) {
        total = candidate;
        tail = k;
      }
    }
    if (tail < 0 || !(total < bestTotal)) return;

    let node = tail;
    for (let a = angleCount - 1; a >= 0; a -= 1) {
      path[a] = node;
      node = parent[a * radiusCount + node];
      // A truncated reconstruction is not a ring; discard it rather than patch it.
      if (node < 0 && a > 0) return;
    }
    bestTotal = total;
    bestSeed = seed;
    bestPath.set(path);
  };

  for (let s = 0; s < seedCount; s += 1) {
    considerSeed(Math.round(((s + 0.5) / seedCount) * (radiusCount - 1)));
  }
  if (bestSeed < 0) throw new Error('No closed ring survived the radial search.');

  const coarseSeed = bestSeed;
  const seedLow = Math.max(0, coarseSeed - maxStep);
  const seedHigh = Math.min(radiusCount - 1, coarseSeed + maxStep);
  for (let seed = seedLow; seed <= seedHigh; seed += 1) {
    if (seed !== coarseSeed) considerSeed(seed);
  }

  return {
    radiiPx: Array.from(bestPath, (k) => radiusMinPx + k * radiusStepPx),
    totalCost: bestTotal,
  };
}

/**
 * Nudge each radius to the true gradient peak by fitting a parabola through the
 * edge strength one probe either side of the accepted sample.
 *
 * The fit is retried at wider spacings when the tight triple is too flat to be
 * concave. Without that fallback a ray whose accepted level happens to sit on the
 * straight part of the gradient flank keeps its raw half-pixel level: on a
 * synthetic ellipse that left one ray of 180 a full 0.5 px out while the rest
 * landed inside 0.09 px, and the master's trace showed the same fingerprint — a
 * radius of exactly 143.000. The correction stays clamped to one probe width
 * whichever spacing succeeds, because a wide parabola is a poor local model and
 * should only ever break the tie, never make a large move.
 */
export function refineRadiiSubpixel(
  edge: ScalarField,
  centerPx: readonly [number, number],
  radiiPx: readonly number[],
  probePx: number,
): readonly number[] {
  return radiiPx.map((radius, index) => {
    const angle = (index / radiiPx.length) * TAU;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const at = (r: number): number =>
      sampleFieldBilinear(edge, centerPx[0] + dirX * r, centerPx[1] + dirY * r);
    for (const spread of [probePx, probePx * 2, probePx * 3]) {
      const before = at(radius - spread);
      const here = at(radius);
      const after = at(radius + spread);
      const curvature = before + after - 2 * here;
      if (!(curvature < 0)) continue;
      const offset = ((before - after) / (2 * curvature)) * spread;
      if (!Number.isFinite(offset)) continue;
      return radius + Math.min(probePx, Math.max(-probePx, offset));
    }
    return radius;
  });
}

/** Total absolute second difference around the ring; the smoothness read-out. */
export function contourRoughnessPx(radiiPx: readonly number[]): number {
  const count = radiiPx.length;
  let total = 0;
  for (let i = 0; i < count; i += 1) {
    const previous = radiiPx[(i - 1 + count) % count];
    const next = radiiPx[(i + 1) % count];
    total += Math.abs(next - 2 * radiiPx[i] + previous);
  }
  return total;
}

/** Widest span over tallest span, both measured through the ring centre. */
export function contourAnisotropy(radiiPx: readonly number[]): number {
  const count = radiiPx.length;
  let widest = 0;
  let tallest = 0;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * TAU;
    const opposite = radiiPx[(i + Math.round(count / 2)) % count];
    const span = radiiPx[i] + opposite;
    const horizontal = Math.abs(Math.cos(angle));
    if (horizontal > 0.999 && span > widest) widest = span;
    if (horizontal < 0.001 && span > tallest) tallest = span;
  }
  if (widest === 0 || tallest === 0) {
    const spans = radiiPx.map((radius, i) => radius + radiiPx[(i + Math.round(count / 2)) % count]);
    return Math.max(...spans) / Math.min(...spans);
  }
  return widest / tallest;
}

function meanEdgeStrength(
  edge: ScalarField,
  centerPx: readonly [number, number],
  radiiPx: readonly number[],
): number {
  let total = 0;
  for (let i = 0; i < radiiPx.length; i += 1) {
    const angle = (i / radiiPx.length) * TAU;
    total += sampleFieldBilinear(
      edge,
      centerPx[0] + Math.cos(angle) * radiiPx[i],
      centerPx[1] + Math.sin(angle) * radiiPx[i],
    );
  }
  return total / radiiPx.length;
}

/**
 * Search a small offset grid for the centre that scores the best ring.
 *
 * Total path cost is the right objective because it is the same quantity the
 * trace itself minimises: an off-centre polar transform forces the radius to
 * swing further, so the smoothness term pays for it. Minimising ring roughness
 * instead — the first thing tried here — rewards any centre that lets the trace
 * settle on a circle, which is how a genuinely oval silhouette came back with an
 * anisotropy of 1.008.
 */
export function refineRingCenter(
  edge: ScalarField,
  startPx: readonly [number, number],
  options: TraceOptions,
  search: CenterSearchOptions = DEFAULT_CENTER_SEARCH,
): readonly [number, number] {
  const probeOptions: TraceOptions = { ...options, ...search.probe };
  let center: readonly [number, number] = startPx;
  let step = search.stepPx;

  for (let iteration = 0; iteration < search.iterations; iteration += 1) {
    let bestCenter = center;
    let bestCost = Infinity;
    for (let dy = -search.rangePx; dy <= search.rangePx; dy += step) {
      for (let dx = -search.rangePx; dx <= search.rangePx; dx += step) {
        const candidate: readonly [number, number] = [center[0] + dx, center[1] + dy];
        let cost: number;
        try {
          cost = traceClosedRing(edge, candidate, probeOptions).totalCost;
        } catch {
          continue;
        }
        if (cost < bestCost) {
          bestCost = cost;
          bestCenter = candidate;
        }
      }
    }
    center = bestCenter;
    step = Math.max(0.25, step / 2);
  }
  return center;
}

/** Round to a fixed number of decimals, so stored and measured numbers agree. */
export function quantize(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

/**
 * Derive the master silhouette: build the edge field, settle the ring centre,
 * trace the cheapest closed ring, then refine every radius to subpixel.
 *
 * The result is quantized to the precision it will be committed at before the
 * diagnostics are taken, so the numbers in the artifact, the numbers the tests
 * check, and the numbers the renderer consumes are one set of numbers.
 */
export function extractMasterContour(
  image: Rgba8Image,
  frame: HeroFrame,
  options: Partial<TraceOptions> = {},
  search: CenterSearchOptions = DEFAULT_CENTER_SEARCH,
): MasterTraceResult {
  const settings: TraceOptions = { ...DEFAULT_TRACE_OPTIONS, ...options };
  const { edge, startCenterPx } = buildHeroEdgeField(image, frame, settings);
  const frameSize = frame.outputSize;
  const searched = refineRingCenter(edge, startCenterPx, settings, search);
  const digits = settings.radiusPrecisionDigits;
  const centerPx: readonly [number, number] = [
    quantize(searched[0], digits),
    quantize(searched[1], digits),
  ];
  const ring = traceClosedRing(edge, centerPx, settings);
  const refined = refineRadiiSubpixel(edge, centerPx, ring.radiiPx, settings.radiusStepPx);
  const radiiPx = refined.map((radius) => quantize(radius, digits));

  return {
    contour: {
      angleCount: settings.angleCount,
      radiiPx,
      centerPx,
      frameSize,
    },
    diagnostics: {
      roughnessPx: contourRoughnessPx(radiiPx),
      anisotropy: contourAnisotropy(radiiPx),
      meanRadiusPx: radiiPx.reduce((sum, radius) => sum + radius, 0) / radiiPx.length,
      minRadiusPx: Math.min(...radiiPx),
      maxRadiusPx: Math.max(...radiiPx),
      meanEdgeStrength: meanEdgeStrength(edge, centerPx, radiiPx),
      totalCost: ring.totalCost,
    },
  };
}

function wrapIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

/** Sample a traced ring at an arbitrary angle with periodic Catmull-Rom. */
export function sampleTracedRadius(contour: TracedContour, angleRadians: number): number {
  const count = contour.radiiPx.length;
  const normalized = ((angleRadians % TAU) + TAU) % TAU;
  const position = (normalized / TAU) * count;
  const index = Math.floor(position);
  const t = position - index;
  const p0 = contour.radiiPx[wrapIndex(index - 1, count)];
  const p1 = contour.radiiPx[wrapIndex(index, count)];
  const p2 = contour.radiiPx[wrapIndex(index + 1, count)];
  const p3 = contour.radiiPx[wrapIndex(index + 2, count)];
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
  );
}

export type ContourPoint = readonly [x: number, y: number];

/** Ring as frame-pixel points, evenly spaced in angle. */
export function tracedContourPoints(contour: TracedContour, sampleCount?: number): ContourPoint[] {
  const count = sampleCount ?? contour.radiiPx.length;
  const points: ContourPoint[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * TAU;
    const radius = sampleTracedRadius(contour, angle);
    points.push([
      contour.centerPx[0] + Math.cos(angle) * radius,
      contour.centerPx[1] + Math.sin(angle) * radius,
    ]);
  }
  return points;
}

export interface ContourExtremes {
  readonly top: ContourPoint;
  readonly right: ContourPoint;
  readonly bottom: ContourPoint;
  readonly left: ContourPoint;
}

/**
 * The four silhouette extremes, in frame pixels.
 *
 * These are the landmarks the acceptance gate names — crown apex, rightmost
 * return, lower fold apex, leftmost membrane — so deriving them from the trace
 * means the gate's own reference points stop being typed in by hand.
 */
export function tracedContourExtremes(contour: TracedContour, sampleCount = 2880): ContourExtremes {
  const points = tracedContourPoints(contour, sampleCount);
  let top = points[0];
  let right = points[0];
  let bottom = points[0];
  let left = points[0];
  for (const point of points) {
    if (point[1] < top[1]) top = point;
    if (point[0] > right[0]) right = point;
    if (point[1] > bottom[1]) bottom = point;
    if (point[0] < left[0]) left = point;
  }
  return { top, right, bottom, left };
}

/**
 * Closed cubic path through the ring, for the review overlay.
 *
 * Catmull-Rom control points converted to Bézier so a few dozen segments
 * reproduce a 360-sample ring without a kilobyte of `L` commands.
 */
export function tracedContourToSvgPath(contour: TracedContour, segmentCount = 48, precision = 2): string {
  const points = tracedContourPoints(contour, segmentCount);
  const count = points.length;
  const round = (value: number): string => value.toFixed(precision);
  let path = `M ${round(points[0][0])} ${round(points[0][1])}`;
  for (let i = 0; i < count; i += 1) {
    const p0 = points[wrapIndex(i - 1, count)];
    const p1 = points[i];
    const p2 = points[wrapIndex(i + 1, count)];
    const p3 = points[wrapIndex(i + 2, count)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    path += ` C ${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(p2[0])} ${round(p2[1])}`;
  }
  return `${path} Z`;
}
