/**
 * Fit the silhouette profile to a traced contour.
 *
 * This is the step that makes the acceptance gate reachable rather than aspirational.
 * The outline is not authored and then checked; it is solved for, against the
 * measurement in `../trace/hero-contour.v1`, and the residual it could not explain
 * is reported in pixels.
 *
 * THE FIT IS STAGED, AND THAT IS NOT AN OPTIMISATION. Solving all the parameters
 * at once fits better and means less. A superellipse's own two- and four-lobe
 * content is imitable by two- and four-lobe harmonics, so the two trade freely: on
 * this contour a joint solve returns exponent 1.45 with the wave restricted to
 * three lobes, and exponent 4.24 with eight lobes available, at similar residual.
 * The exponent then measures nothing — it is whatever the optimiser needed it to be
 * — and a stack whose first step reports 1.45 or 4.24 depending on an unrelated
 * choice cannot be called a measurement of the form.
 *
 * So the base shape is fitted alone, against the whole contour, where it has no
 * competitor for its six degrees of freedom and the answer is unique. It is then
 * frozen, and the wave explains only what is left. That is also exactly the order a
 * sculptor works in, which is the order this stack claims to describe.
 *
 * One degeneracy survives staging and is excluded by construction: a one-lobe
 * harmonic is an offset of the centre expressed in polar form, so allowing both
 * lets the centre walk off the form and be paid for in amplitude. A joint solve did
 * precisely that here, placing the centre 29 px from the traced one and carrying a
 * 26 px one-lobe term. `fitSilhouetteToContour` rejects a one-lobe harmonic.
 */

import type { TracedContour } from '../trace/master-contour';
import { tracedContourPoints } from '../trace/master-contour';
import type {
  BaseProfileParams,
  OrbSilhouetteProfile,
  RadialHarmonic,
  Vec2,
} from './steps';
import { baseProfileRadius, silhouetteRadiusUnits } from './steps';

export interface SilhouetteFitOptions {
  /**
   * Lobe counts the wave is allowed to use. One is rejected: it is a centre offset
   * in polar clothing, and the base fit already owns the centre.
   */
  readonly harmonics: readonly number[];
  /** Frame pixels to one orb unit. */
  readonly unitPx: number;
  /** Reference points drawn from the contour. */
  readonly sampleCount: number;
  /** Simplex steps per restart of the base fit. */
  readonly iterations: number;
}

export const DEFAULT_FIT_OPTIONS: SilhouetteFitOptions = Object.freeze({
  harmonics: Object.freeze([2, 3, 4, 5, 6, 7, 8]),
  unitPx: 100,
  sampleCount: 720,
  iterations: 3000,
});

export interface BaseProfileFit {
  readonly base: BaseProfileParams;
  /** Centre of the profile in frozen-frame pixels. */
  readonly centerPx: Vec2;
  /** Residual the base shape alone leaves, along rays from its own centre. */
  readonly rmsPx: number;
  readonly maxPx: number;
  readonly restarts: number;
}

export interface SilhouetteFitReport {
  /** What the base shape alone could explain, in frame pixels. */
  readonly baseRmsPx: number;
  readonly baseMaxPx: number;
  /**
   * What is left after the wave, along rays from the fitted centre, in frame pixels.
   * This is the quantity the second stage minimises. It is not the gate — the gate
   * is the geometric deviation, which the caller computes with `contourDeviation`
   * against the contour this profile renders to.
   */
  readonly radialRmsPx: number;
  readonly radialMaxPx: number;
  /** Amplitude the wave gave each requested harmonic, in frame pixels. */
  readonly harmonicAmplitudesPx: readonly number[];
  readonly restarts: number;
}

export interface SilhouetteFit {
  readonly profile: OrbSilhouetteProfile;
  readonly report: SilhouetteFitReport;
}

/**
 * Solve `A x = b` in the least-squares sense through the normal equations.
 *
 * The design columns here are cosines and sines sampled at angles that are only
 * approximately evenly spaced — the reference points are evenly spaced about the
 * trace's centre, not about the fitted one — so they are close to orthogonal but
 * not orthogonal. Projecting onto each column independently, which is what a
 * discrete Fourier transform would do, would therefore be slightly wrong in a way
 * that grows with the centre offset. Solving the system costs a 16 by 16
 * elimination and is simply correct.
 */
export function solveNormalEquations(
  design: readonly (readonly number[])[],
  target: readonly number[],
): readonly number[] {
  const columns = design[0]?.length ?? 0;
  if (columns === 0) return [];
  const matrix: number[][] = [];
  for (let i = 0; i < columns; i += 1) {
    const row = new Array<number>(columns + 1).fill(0);
    for (let j = 0; j < columns; j += 1) {
      let sum = 0;
      for (let r = 0; r < design.length; r += 1) sum += design[r][i] * design[r][j];
      row[j] = sum;
    }
    let rhs = 0;
    for (let r = 0; r < design.length; r += 1) rhs += design[r][i] * target[r];
    row[columns] = rhs;
    matrix.push(row);
  }

  for (let col = 0; col < columns; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < columns; r += 1) {
      if (Math.abs(matrix[r][col]) > Math.abs(matrix[pivot][col])) pivot = r;
    }
    if (Math.abs(matrix[pivot][col]) < 1e-12) continue;
    const swap = matrix[col];
    matrix[col] = matrix[pivot];
    matrix[pivot] = swap;
    const diagonal = matrix[col][col];
    for (let r = 0; r < columns; r += 1) {
      if (r === col) continue;
      const factor = matrix[r][col] / diagonal;
      if (factor === 0) continue;
      for (let c = col; c <= columns; c += 1) matrix[r][c] -= factor * matrix[col][c];
    }
  }

  const solution = new Array<number>(columns).fill(0);
  for (let i = 0; i < columns; i += 1) {
    const diagonal = matrix[i][i];
    solution[i] = Math.abs(diagonal) < 1e-12 ? 0 : matrix[i][columns] / diagonal;
  }
  return solution;
}

/**
 * Nelder-Mead, deterministic.
 *
 * No random restarts and no time-based termination: the same contour must yield
 * the same numbers on every machine, because those numbers get committed as a
 * generated file and compared against a frozen expectation.
 */
function nelderMead(
  objective: (p: readonly number[]) => number,
  start: readonly number[],
  step: readonly number[],
  iterations: number,
): { readonly point: readonly number[]; readonly value: number } {
  const n = start.length;
  let simplex: number[][] = [start.slice()];
  for (let i = 0; i < n; i += 1) {
    const point = start.slice();
    point[i] += step[i];
    simplex.push(point);
  }
  let values = simplex.map(objective);

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const order = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
    simplex = order.map((i) => simplex[i]);
    values = order.map((i) => values[i]);
    if (Math.abs(values[n] - values[0]) <= 1e-13 * (Math.abs(values[0]) + 1e-13)) break;

    const centroid = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i += 1) {
      for (let k = 0; k < n; k += 1) centroid[k] += simplex[i][k] / n;
    }
    const reflected = centroid.map((c, k) => c + (c - simplex[n][k]));
    const reflectedValue = objective(reflected);

    if (reflectedValue < values[0]) {
      const expanded = centroid.map((c, k) => c + 2 * (c - simplex[n][k]));
      const expandedValue = objective(expanded);
      if (expandedValue < reflectedValue) {
        simplex[n] = expanded;
        values[n] = expandedValue;
      } else {
        simplex[n] = reflected;
        values[n] = reflectedValue;
      }
    } else if (reflectedValue < values[n - 1]) {
      simplex[n] = reflected;
      values[n] = reflectedValue;
    } else {
      const contracted = centroid.map((c, k) => c - 0.5 * (c - simplex[n][k]));
      const contractedValue = objective(contracted);
      if (contractedValue < values[n]) {
        simplex[n] = contracted;
        values[n] = contractedValue;
      } else {
        for (let i = 1; i <= n; i += 1) {
          simplex[i] = simplex[i].map((v, k) => simplex[0][k] + 0.5 * (v - simplex[0][k]));
          values[i] = objective(simplex[i]);
        }
      }
    }
  }

  const order = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
  return { point: simplex[order[0]], value: values[order[0]] };
}

interface HarmonicSolve {
  readonly harmonics: readonly RadialHarmonic[];
  readonly rms: number;
  readonly max: number;
}

/** Exact harmonic solve against a frozen base shape, in orb units. */
function solveHarmonics(
  base: BaseProfileParams,
  centerPx: Vec2,
  points: readonly (readonly [number, number])[],
  harmonics: readonly number[],
  unitPx: number,
): HarmonicSolve {
  const design: number[][] = [];
  const target: number[] = [];

  for (const [px, py] of points) {
    const x = (px - centerPx[0]) / unitPx;
    const y = (py - centerPx[1]) / unitPx;
    const angle = Math.atan2(y, x);
    target.push(Math.hypot(x, y) - baseProfileRadius(base, angle));
    const row: number[] = [];
    for (const k of harmonics) {
      row.push(Math.cos(k * angle), Math.sin(k * angle));
    }
    design.push(row);
  }

  const solution = solveNormalEquations(design, target);
  const solved: RadialHarmonic[] = harmonics.map((k, index) => {
    const cosine = solution[index * 2] ?? 0;
    const sine = solution[index * 2 + 1] ?? 0;
    return { harmonic: k, amplitude: Math.hypot(cosine, sine), phase: Math.atan2(sine, cosine) };
  });

  let sumSquares = 0;
  let max = 0;
  for (let i = 0; i < target.length; i += 1) {
    let modelled = 0;
    for (let index = 0; index < harmonics.length; index += 1) {
      modelled += (solution[index * 2] ?? 0) * design[i][index * 2];
      modelled += (solution[index * 2 + 1] ?? 0) * design[i][index * 2 + 1];
    }
    const residual = target[i] - modelled;
    sumSquares += residual * residual;
    if (Math.abs(residual) > max) max = Math.abs(residual);
  }

  return { harmonics: solved, rms: Math.sqrt(sumSquares / target.length), max };
}

/** What a base shape alone leaves unexplained, along rays from its own centre. */
function baseResidual(
  base: BaseProfileParams,
  centerPx: Vec2,
  points: readonly (readonly [number, number])[],
  unitPx: number,
): { readonly rms: number; readonly max: number } {
  let sumSquares = 0;
  let max = 0;
  for (const [px, py] of points) {
    const x = (px - centerPx[0]) / unitPx;
    const y = (py - centerPx[1]) / unitPx;
    const residual = Math.hypot(x, y) - baseProfileRadius(base, Math.atan2(y, x));
    sumSquares += residual * residual;
    if (Math.abs(residual) > max) max = Math.abs(residual);
  }
  return { rms: Math.sqrt(sumSquares / points.length), max };
}

/** Seeds for the base fit. Fixed, because the result is committed as a measurement. */
const BASE_SEED_EXPONENTS = Object.freeze([1.4, 2, 3]);
const BASE_SEED_ROTATIONS = Object.freeze([0, -Math.PI / 12, -Math.PI / 6]);

/**
 * Stage one: the base shape alone, against the whole contour.
 *
 * Six parameters, no harmonics, so nothing can imitate the exponent and the answer
 * is the contour's own. `restarts` seeds cover the ambiguity that a superellipse
 * genuinely has — a flatter exponent at one rotation resembles a rounder one at
 * another — rather than the ambiguity staging removes.
 */
export function fitBaseProfileToContour(
  contour: TracedContour,
  options: Partial<SilhouetteFitOptions> = {},
): BaseProfileFit {
  const settings: SilhouetteFitOptions = { ...DEFAULT_FIT_OPTIONS, ...options };
  const points = tracedContourPoints(contour, settings.sampleCount);
  const meanRadius =
    contour.radiiPx.reduce((sum, radius) => sum + radius, 0) / contour.radiiPx.length;

  const unpack = (p: readonly number[]): { base: BaseProfileParams; center: Vec2 } | null => {
    const [cx, cy, semiAxisX, semiAxisY, exponent, rotation] = p;
    if (!(semiAxisX > 0.1) || !(semiAxisY > 0.1)) return null;
    if (!(exponent > 0.6) || !(exponent < 12)) return null;
    return { base: { semiAxisX, semiAxisY, exponent, rotation }, center: [cx, cy] };
  };
  const objective = (p: readonly number[]): number => {
    const candidate = unpack(p);
    if (!candidate) return 1e9;
    return baseResidual(candidate.base, candidate.center, points, settings.unitPx).rms;
  };

  const seedAxis = (meanRadius * 1.1) / settings.unitPx;
  let best: { point: readonly number[]; value: number } | null = null;
  let restarts = 0;
  for (const exponent of BASE_SEED_EXPONENTS) {
    for (const rotation of BASE_SEED_ROTATIONS) {
      restarts += 1;
      const attempt = nelderMead(
        objective,
        [contour.centerPx[0], contour.centerPx[1], seedAxis, seedAxis * 0.85, exponent, rotation],
        [2, 2, 0.06, 0.06, 0.3, 0.12],
        settings.iterations,
      );
      if (!best || attempt.value < best.value) best = attempt;
    }
  }

  const solved = best === null ? null : unpack(best.point);
  if (!solved) throw new Error('The base profile fit produced no candidate in bounds.');
  const residual = baseResidual(solved.base, solved.center, points, settings.unitPx);

  return {
    base: solved.base,
    centerPx: solved.center,
    rmsPx: residual.rms * settings.unitPx,
    maxPx: residual.max * settings.unitPx,
    restarts,
  };
}

/**
 * Both stages: solve the base shape, freeze it, then let the wave explain the rest.
 */
export function fitSilhouetteToContour(
  contour: TracedContour,
  options: Partial<SilhouetteFitOptions> = {},
): SilhouetteFit {
  const settings: SilhouetteFitOptions = { ...DEFAULT_FIT_OPTIONS, ...options };
  if (settings.harmonics.includes(1)) {
    throw new Error(
      'A one-lobe harmonic is a centre offset in polar form, which the base fit already ' +
        'owns; allowing both lets the centre leave the form and be paid for in amplitude.',
    );
  }

  const base = fitBaseProfileToContour(contour, settings);
  const points = tracedContourPoints(contour, settings.sampleCount);
  const wave = solveHarmonics(
    base.base,
    base.centerPx,
    points,
    settings.harmonics,
    settings.unitPx,
  );

  const profile: OrbSilhouetteProfile = {
    base: base.base,
    harmonics: wave.harmonics,
    centerPx: base.centerPx,
    unitPx: settings.unitPx,
  };

  return {
    profile,
    report: {
      baseRmsPx: base.rmsPx,
      baseMaxPx: base.maxPx,
      radialRmsPx: wave.rms * settings.unitPx,
      radialMaxPx: wave.max * settings.unitPx,
      harmonicAmplitudesPx: wave.harmonics.map(({ amplitude }) => amplitude * settings.unitPx),
      restarts: base.restarts,
    },
  };
}

/**
 * Express a fitted profile as a traced contour, so it can be compared against the
 * master with the same geometric metric the gate uses.
 *
 * The radii are taken about the profile's own centre rather than the trace's;
 * `contourDeviation` resolves both rings to frame points before comparing, so a
 * profile that is the right shape in the wrong place reports the offset instead of
 * having it cancelled out by the change of origin.
 */
export function silhouetteProfileToTracedContour(
  profile: OrbSilhouetteProfile,
  frameSize: number,
  angleCount = 360,
): TracedContour {
  const radiiPx: number[] = [];
  for (let i = 0; i < angleCount; i += 1) {
    const angle = (i / angleCount) * Math.PI * 2;
    radiiPx.push(silhouetteRadiusUnits(profile, angle) * profile.unitPx);
  }
  return { angleCount, radiiPx, centerPx: profile.centerPx, frameSize };
}
