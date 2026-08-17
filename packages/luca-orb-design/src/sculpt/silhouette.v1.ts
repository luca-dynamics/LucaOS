/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by `scripts/orb-fit-silhouette.mjs`, which solves this profile against
 * `../trace/hero-contour.v1`. Regenerate rather than adjust: these numbers are a
 * measurement, and editing them turns the acceptance gate back into an opinion.
 *
 * The base shape is fitted alone and then frozen, and the wave explains only what is
 * left. That order is load-bearing — a superellipse's own two- and four-lobe content
 * is imitable by two- and four-lobe harmonics, so a joint solve returns whatever
 * exponent it happened to need, from 1.45 to 4.24 on this same contour at similar
 * residual. Staged, the exponent below is the contour's own: it does not move when
 * the wave is truncated anywhere from three lobes to sixteen.
 *
 * Accuracy against the trace, measured on the numbers as rounded here:
 * the base shape alone leaves 3.281 px RMS; with the wave that becomes
 * 0.823 px RMS and 2.617 px maximum, at 0.98819 silhouette IoU.
 *
 * The maximum is not spread around the ring. It is a single inward dent of about
 * 2.7 px over roughly 8 degrees at 166 degrees, on the left flank where the rolled hem
 * meets the outline; 345 of 360 samples are inside 1.5 px. A harmonic basis cannot
 * produce a dent that narrow without rippling the whole ring, so this residual is
 * left for the hem to own in `./stack` rather than smoothed away here.
 */

import type { OrbSilhouetteProfile, RadialHarmonic } from './steps';

const harmonics: readonly RadialHarmonic[] = Object.freeze([
  Object.freeze({ harmonic: 2, amplitude: 0.003651, phase: 0.846639 }),
  Object.freeze({ harmonic: 3, amplitude: 0.038651, phase: -1.653731 }),
  Object.freeze({ harmonic: 4, amplitude: 0.006789, phase: -1.071493 }),
  Object.freeze({ harmonic: 5, amplitude: 0.007710, phase: -2.796266 }),
  Object.freeze({ harmonic: 6, amplitude: 0.005512, phase: 2.611382 }),
  Object.freeze({ harmonic: 7, amplitude: 0.008977, phase: -2.490967 }),
  Object.freeze({ harmonic: 8, amplitude: 0.016823, phase: 1.157703 }),
]);

/** The master's outer silhouette as a solved profile. Orb units, 100 px to the unit. */
export const LUCA_ORB_SILHOUETTE_V1: OrbSilhouetteProfile = Object.freeze({
  base: Object.freeze({
    semiAxisX: 1.402201,
    semiAxisY: 1.164366,
    exponent: 1.445860,
    rotation: -0.283239,
  }),
  harmonics,
  centerPx: Object.freeze([182.836, 171.903] as const),
  unitPx: 100,
});

export const LUCA_ORB_SILHOUETTE_V1_PROVENANCE = Object.freeze({
  id: 'luca-living-orb/silhouette-profile',
  version: 1,
  /** The frozen product master, carried through the trace this was fitted to. */
  sourceSha256: '4841901ECD4222760D8E532671DA493066A82CE2CCEE4AC0CA35054AF0CA074A',
  tracedContour: 'luca-living-orb/hero-contour@1',
  harmonics: Object.freeze([2, 3, 4, 5, 6, 7, 8] as const),
  restarts: 9,
  /** Residual the base shape alone leaves, along rays from its own centre. */
  baseRmsPx: 3.2807,
  baseMaxPx: 7.7837,
  /** Geometric deviation from the traced ring, which is what the gate measures. */
  geometricRmsPx: 0.8231,
  geometricMaxPx: 2.6167,
  geometricMaxAtDegrees: 166.00,
  silhouetteIoU: 0.98819,
  /** Rotation in degrees, for reading; `base.rotation` is the radian value used. */
  rotationDegrees: -16.228,
  centerOffsetFromTracePx: Object.freeze([0.058, -3.523] as const),
});
