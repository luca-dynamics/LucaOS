/**
 * `LUCA_ORB_STACK_V1` — the ordered sculpting steps that make the Luca orb.
 *
 * The steps themselves are in `./steps`; this is the one binding of them that is
 * the orb. Frozen and versioned, because a form that can be edited in place cannot
 * be regressed against.
 *
 * PROVENANCE IS NOT UNIFORM, AND THE DIFFERENCE MATTERS. The silhouette is
 * measured: `./silhouette.v1` is solved from the traced master by
 * `scripts/orb-fit-silhouette.mjs`, and no one should hand-edit it. Everything
 * below it — depth, the hem, the blend, the global lean — is hand-authored, because
 * a silhouette is a projection and cannot constrain depth at all. Those numbers are
 * a starting point for the founder's review of the fold, not a measurement, and
 * `LUCA_ORB_STACK_V1_PROVENANCE.steps` says so for each one.
 *
 * ONE RULE HOLDS THE TWO APART. A hand-authored number must not be able to move a
 * measured one. `rollHem` would break that if its tube reached the outline: the hem
 * would then set the silhouette, and the 0.82 px agreement with the master would
 * start depending on values chosen by eye. So `insetUnits` is set past
 * `minorRadiusUnits + blendUnits`, which puts the whole tube — and the blend's
 * reach — strictly inside the outline, leaving the body alone to define the
 * silhouette. `tests/orb-sdf.test.ts` asserts it rather than trusting it.
 */

import type {
  CushionDomeParams,
  OrbSilhouetteProfile,
  RollHemParams,
  TiltParams,
} from './steps';
import { LUCA_ORB_SILHOUETTE_V1, LUCA_ORB_SILHOUETTE_V1_PROVENANCE } from './silhouette.v1';

/** Where a step's numbers came from. Read before trusting one. */
export type StepProvenance = 'measured' | 'hand-authored' | 'off';

export interface OrbSculptStack {
  readonly id: string;
  readonly version: number;
  /** Step 1 and 2: the closed outline. Measured. */
  readonly silhouette: OrbSilhouetteProfile;
  /** Step 3: the body. */
  readonly dome: CushionDomeParams;
  /** Step 4: shell thickness in orb units, or null for a solid form. */
  readonly shellThicknessUnits: number | null;
  /** Step 5: the fold. */
  readonly hem: RollHemParams;
  /** Step 6: blend width where the hem joins the body, in orb units. */
  readonly blendUnits: number;
  /** Step 7: the global lean. */
  readonly tilt: TiltParams;
}

const MINOR_RADIUS_UNITS = 0.085;
const BLEND_UNITS = 0.11;

/**
 * The angle the hem gathers toward, in radians.
 *
 * Seeded from measurement rather than taste, though it is not itself a measurement:
 * the silhouette fit's residual is a single 2.66 px inward dent over about 8 degrees
 * at 166 degrees, on the left flank, and a dent that narrow is where a rolled rim
 * crosses the outline rather than anything a harmonic basis left behind. So the roll
 * is gathered there, and the founder's review decides whether that reads correctly.
 */
const HEM_TUCK_PHASE = 2.897;

export const LUCA_ORB_STACK_V1: OrbSculptStack = Object.freeze({
  id: 'luca-living-orb/sculpt-stack',
  version: 1,
  silhouette: LUCA_ORB_SILHOUETTE_V1,
  dome: Object.freeze({
    // Carried from the superseded height field's `maxHalfDepth`, whose unit space
    // was the same scale as this one, so the form's plumpness does not change as
    // the representation does.
    halfDepthUnits: 0.92,
    // Above 2, so the face is broader than an ellipsoid's and the turn at the
    // shoulder is tighter — the reference reads as inflated with a defined edge
    // rather than as a sphere clipped to an outline. Hand-authored: a silhouette
    // says nothing about how depth is distributed across the face.
    shoulderExponent: 2.6,
    frontScale: 1,
    rearScale: 0.86,
    // A shear, in depth units per unit of x and y. Carried over from the earlier
    // multiplicative lean at the depth slope it actually produced at the apex
    // (0.92 * 0.08 and 0.92 * 0.055), so the form leans the same way it did.
    lean: Object.freeze([-0.074, 0.051] as const),
  }),
  // Off. A shell is invisible in silhouette and shows only under a material, so
  // there is nothing in this phase that could tell a right thickness from a wrong
  // one. `solidify` is implemented and tested, waiting for the material phase.
  shellThicknessUnits: null,
  hem: Object.freeze({
    minorRadiusUnits: MINOR_RADIUS_UNITS,
    // Past `minorRadiusUnits + blendUnits`, so the hem cannot reach the outline and
    // cannot move the measured silhouette. See the note at the top of this file.
    insetUnits: 0.21,
    // Negative, and measured from the body's own surface: the spine sits just BEHIND
    // the cushion so the tube straddles it. Together with the tuck below, the front
    // of the tube stands off the surface by `lift + tuck * cos + minorRadius`, which
    // runs from about -0.03 to +0.08 units around the ring — buried on one side,
    // a lip just under one tube radius proud on the other.
    liftUnits: -0.06,
    // The gather, and the number that has to stay small. The roll reads as the body's
    // own edge only while it remains attached to it; at 0.14 (its value while `lift`
    // was still an absolute depth of 0.7, where it was a 20 percent modulation) the
    // tube stood off 0.27 units on the left, which renders as a separate ring
    // floating in front of the face with a groove behind it.
    tuckUnits: 0.05,
    tuckPhase: HEM_TUCK_PHASE,
  }),
  blendUnits: BLEND_UNITS,
  // Zero, and deliberately so. Pitch and yaw are out-of-plane, so the silhouette
  // cannot constrain them; leaving them at zero keeps the form's orientation the
  // trace's rather than an invention layered on top of it.
  tilt: Object.freeze({ pitch: 0, yaw: 0 }),
});

export const LUCA_ORB_STACK_V1_PROVENANCE = Object.freeze({
  id: 'luca-living-orb/sculpt-stack',
  version: 1,
  /** The frozen product master, carried through the trace and the fit. */
  sourceSha256: LUCA_ORB_SILHOUETTE_V1_PROVENANCE.sourceSha256,
  silhouetteProfile: 'luca-living-orb/silhouette-profile@1',
  steps: Object.freeze({
    baseProfile: 'measured',
    radialWave: 'measured',
    cushionDome: 'hand-authored',
    solidify: 'off',
    rollHem: 'hand-authored',
    blend: 'hand-authored',
    tilt: 'hand-authored',
  } satisfies Record<string, StepProvenance>),
  /**
   * The margin by which the hem stays inside the outline, in orb units. Positive is
   * the invariant holding; at zero or below, a hand-authored number has reached the
   * silhouette and the measured agreement is no longer only about the measurement.
   */
  hemSilhouetteMarginUnits:
    LUCA_ORB_STACK_V1.hem.insetUnits - MINOR_RADIUS_UNITS - BLEND_UNITS,
});
