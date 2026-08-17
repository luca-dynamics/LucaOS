/**
 * The orb's form as an ordered stack of sculpting steps.
 *
 * Each step below is one operation a sculptor would perform in order, and each is
 * a pure function of its own named parameters, so a step can be tested and
 * corrected without disturbing the ones around it. The stack that binds them into
 * the actual Luca orb is `LUCA_ORB_STACK_V1` in `./stack`.
 *
 * COORDINATE FRAME. Points are in orb units, `unitPx` frame pixels to the unit,
 * about the form's own centre. `x` runs right and `y` runs DOWN, matching the
 * traced frame, and `z` runs toward the viewer. That makes the frame left-handed,
 * which is deliberate: the alternative is a y-flip, and the only place it could
 * live is the boundary where a candidate form is compared against the trace —
 * exactly where a sign error would be invisible and would corrupt the one number
 * this whole effort exists to produce.
 *
 * WHY A DISTANCE FIELD AND NOT A HEIGHT FIELD. The form this describes has a rim
 * that rolls back toward the viewer. A height field stores one depth per (x, y)
 * and so cannot represent a fold at all — `design-spec/OpticalMaterial.v2.md` says
 * as much in its own words, "the mesh is an orthographic height-field volume" —
 * which is why the fold has until now been approximated by separate authored
 * ribbons laid over the surface. `rollHem` below is the fold itself: a tube whose
 * surface has two depths at the same (x, y).
 */

export type Vec2 = readonly [x: number, y: number];
export type Vec3 = readonly [x: number, y: number, z: number];

const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ *
 * Step 1 — baseProfile: the closed planar outline the form is built on
 * ------------------------------------------------------------------ */

export interface BaseProfileParams {
  /** Semi-axis along the profile's own x, in orb units. */
  readonly semiAxisX: number;
  /** Semi-axis along the profile's own y, in orb units. */
  readonly semiAxisY: number;
  /**
   * Superellipse exponent. 2 is an ellipse; above 2 flattens the flanks toward a
   * squircle; below 2 pinches them inward toward a diamond.
   */
  readonly exponent: number;
  /** Rotation of the profile within the frame, in radians. */
  readonly rotation: number;
}

/**
 * Superellipse radius at `angle`, in closed form.
 *
 * `|x/a|^n + |y/b|^n = 1` along a ray from the centre reduces to
 * `t = (|cos|^n / a^n + |sin|^n / b^n)^(-1/n)`, so no root finding is needed. The
 * root find is only unavoidable when the profile is sampled about some *other*
 * centre, which is what `orbSilhouetteRadius` has to do to compare against a
 * trace centred elsewhere.
 */
export function baseProfileRadius(params: BaseProfileParams, angle: number): number {
  const local = angle - params.rotation;
  const { exponent: n, semiAxisX: a, semiAxisY: b } = params;
  const sum =
    Math.abs(Math.cos(local)) ** n / a ** n + Math.abs(Math.sin(local)) ** n / b ** n;
  return sum ** (-1 / n);
}

/**
 * `d/dangle` of `baseProfileRadius`, analytically.
 *
 * Needed to turn the radial field into an approximately Euclidean one; a field
 * that is off by the local slope makes a sphere-tracer overstep and punch through
 * thin features, and the hem is the thinnest feature here.
 */
export function baseProfileRadiusDerivative(params: BaseProfileParams, angle: number): number {
  const local = angle - params.rotation;
  const { exponent: n, semiAxisX: a, semiAxisY: b } = params;
  const cos = Math.cos(local);
  const sin = Math.sin(local);
  const sum = Math.abs(cos) ** n / a ** n + Math.abs(sin) ** n / b ** n;
  const dCos = (Math.abs(cos) ** (n - 1) * Math.sign(cos) * sin) / a ** n;
  const dSin = (Math.abs(sin) ** (n - 1) * Math.sign(sin) * cos) / b ** n;
  const dSum = n * (dSin - dCos);
  return (-1 / n) * sum ** (-1 / n - 1) * dSum;
}

/* ------------------------------------------------------- *
 * Step 2 — radialWave: the harmonics the profile can't make
 * ------------------------------------------------------- */

export interface RadialHarmonic {
  /** Lobe count. 1 is a centre offset in disguise; 2 and 4 are the profile's job. */
  readonly harmonic: number;
  /** Peak radial displacement, in orb units. */
  readonly amplitude: number;
  /** Phase, in radians. */
  readonly phase: number;
}

/**
 * Summed radial displacement of the harmonic terms at `angle`, in orb units.
 *
 * A superellipse is symmetric about both its axes, so it can only produce even
 * harmonics, and their phases are locked together by its single rotation. Odd
 * harmonics — the master's largest residual is a three-lobe term — have to come
 * from here or not at all.
 */
export function radialWave(harmonics: readonly RadialHarmonic[], angle: number): number {
  let sum = 0;
  for (const { harmonic, amplitude, phase } of harmonics) {
    sum += amplitude * Math.cos(harmonic * angle - phase);
  }
  return sum;
}

/** `d/dangle` of `radialWave`. */
export function radialWaveDerivative(harmonics: readonly RadialHarmonic[], angle: number): number {
  let sum = 0;
  for (const { harmonic, amplitude, phase } of harmonics) {
    sum -= harmonic * amplitude * Math.sin(harmonic * angle - phase);
  }
  return sum;
}

export interface OrbSilhouetteProfile {
  readonly base: BaseProfileParams;
  readonly harmonics: readonly RadialHarmonic[];
  /** Centre of the profile in frozen-frame pixels. */
  readonly centerPx: Vec2;
  /** Frame pixels to one orb unit. */
  readonly unitPx: number;
}

/** Outline radius at `angle`, in orb units, about the profile's own centre. */
export function silhouetteRadiusUnits(profile: OrbSilhouetteProfile, angle: number): number {
  return baseProfileRadius(profile.base, angle) + radialWave(profile.harmonics, angle);
}

/** `d/dangle` of `silhouetteRadiusUnits`. */
export function silhouetteRadiusDerivative(profile: OrbSilhouetteProfile, angle: number): number {
  return (
    baseProfileRadiusDerivative(profile.base, angle) +
    radialWaveDerivative(profile.harmonics, angle)
  );
}

/**
 * Approximately Euclidean signed distance to the outline, negative inside.
 *
 * The raw radial residual `|q| - R(theta)` is not a distance: where the outline
 * turns quickly it overstates how far away the curve is, by roughly the secant of
 * the outline's slope. Dividing by `sqrt(1 + (R'/R)^2)` removes that to first
 * order. It is not exact, so anything marching along this field still needs a
 * step-size safety factor — `MARCH_SAFETY` in `./sdf` — but without the
 * correction the error is large enough near the flanks to march straight through
 * the hem.
 */
export function silhouetteDistanceUnits(
  profile: OrbSilhouetteProfile,
  x: number,
  y: number,
): number {
  const radius = Math.hypot(x, y);
  if (radius < 1e-9) return -silhouetteRadiusUnits(profile, 0);
  const angle = Math.atan2(y, x);
  const outline = silhouetteRadiusUnits(profile, angle);
  const slope = silhouetteRadiusDerivative(profile, angle) / Math.max(outline, 1e-9);
  return (radius - outline) / Math.sqrt(1 + slope * slope);
}

/* --------------------------------------------- *
 * Step 3 — cushionDome: the puffy body of the orb
 * --------------------------------------------- */

export interface CushionDomeParams {
  /** Half-thickness at the apex, in orb units. */
  readonly halfDepthUnits: number;
  /**
   * Superellipsoid exponent in the (radius, depth) plane.
   *
   * 2 is a plain ellipsoid. Above 2 broadens the face and tightens the turn at the
   * shoulder; below 2 pinches the face toward a cone. This is a shape exponent, not
   * a fillet radius, because the face has to curve everywhere — see below.
   */
  readonly shoulderExponent: number;
  /** Depth scale toward the viewer; kept separate so the form is not a mirrored lens. */
  readonly frontScale: number;
  /** Depth scale away from the viewer. */
  readonly rearScale: number;
  /**
   * Authored depth lean across the face, in orb units of depth per orb unit of x
   * and y. Applied as a shear, so it tilts the form without moving the silhouette.
   */
  readonly lean: Vec2;
}

/**
 * The body: the outline inflated into a cushion.
 *
 * NOT A ROUNDED BOX, AND THAT IS THE WHOLE POINT. The obvious construction — extrude
 * the outline in depth, then fillet the shoulder — is the standard SDF idiom and it
 * is wrong here, because a box with a fillet has a flat top. The fillet only engages
 * within its own radius of the outline, so everything inside that band is the plane
 * `z = halfDepth`, and the form reads as a plate with a chamfered edge rather than as
 * something inflated. It was measurably a plane: an earlier version of this step held
 * `d(front z)/dx` constant at -0.0736 across nine tenths of a unit of the face, with
 * 77 of 183 cross-section samples flatter than `normal z > 0.995`. Under the matte
 * render that is unmistakable, and no material would have hidden it.
 *
 * So the body is a superellipsoid of revolution about the outline instead. Working in
 * the normalized pair `t = radius / R(theta)` and `v = depth / halfDepth`, the surface
 * is `t^m + |v|^m = 1`: one smooth sheet from the apex to the rim, curving everywhere,
 * with no flat region and no `max()` seam to crease along.
 *
 * The silhouette survives the change exactly. At `v = 0` the constraint reduces to
 * `t = 1`, which is `radius = R(theta)` — the outline itself, for every exponent. So
 * the measured half of the stack is untouched by this hand-authored half, which is the
 * separation `./stack` promises.
 *
 * Returned as an approximately Euclidean distance, `F / |grad F|`, with the gradient
 * analytic. Far outside the form this degrades exactly to `silhouetteDistanceUnits`,
 * as it should. It is first-order, so a tracer still needs `MARCH_SAFETY`.
 *
 * The body's own silhouette is therefore the outline, exactly, with no render needed.
 * That does not extend to the finished stack: `rollHem` can sit outside the outline
 * wherever its tube radius exceeds its inset, and `blend` pulls the joined surface
 * outward by up to `k / 6` more, so the silhouette of `evaluateOrbSdf` is not
 * available in closed form — `orbSilhouetteRadius` in `./sdf` solves for it instead.
 */
export function cushionDome(
  params: CushionDomeParams,
  profile: OrbSilhouetteProfile,
  x: number,
  y: number,
  z: number,
): number {
  const radius = Math.hypot(x, y);
  const angle = radius < 1e-9 ? 0 : Math.atan2(y, x);
  const outline = silhouetteRadiusUnits(profile, angle);

  const sheared = z - params.lean[0] * x - params.lean[1] * y;
  const halfDepth =
    params.halfDepthUnits * (sheared >= 0 ? params.frontScale : params.rearScale);

  const t = radius / outline;
  const v = sheared / halfDepth;
  const m = params.shoulderExponent;
  const sum = t ** m + Math.abs(v) ** m;
  // The exact centre of the form, where the normalized coordinates are degenerate and
  // the field has a conical singularity. Any underestimate of the distance is safe for
  // a tracer, and the nearest surface is at least this far.
  if (sum < 1e-12) return -Math.min(outline, halfDepth);
  const s = sum ** (1 / m);

  // dF/dt and dF/dv for F = s - 1. Both vanish as their coordinate does, which is what
  // keeps the depth axis smooth despite `angle` being undefined there.
  const dFdt = (t / s) ** (m - 1);
  const dFdv = (Math.abs(v) / s) ** (m - 1) * Math.sign(v);

  // grad t, from t = radius / R(theta). Its magnitude is sqrt(1 + (R'/R)^2) / R, which
  // is where the outline's slope correction enters this construction.
  const outlineSlope = silhouetteRadiusDerivative(profile, angle);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tx = cos / outline + (outlineSlope * sin) / (outline * outline);
  const ty = sin / outline - (outlineSlope * cos) / (outline * outline);

  // grad v. The shear puts the lean into the x and y components rather than into a
  // clamped scale on halfDepth, whose clamp used to crease the face.
  const vx = -params.lean[0] / halfDepth;
  const vy = -params.lean[1] / halfDepth;
  const vz = 1 / halfDepth;

  const gradient = Math.hypot(dFdt * tx + dFdv * vx, dFdt * ty + dFdv * vy, dFdv * vz);
  if (gradient < 1e-12) return -Math.min(outline, halfDepth);
  return (s - 1) / gradient;
}

/**
 * Depth of the body's front surface above `(x, y)`, in orb units.
 *
 * Closed form, from the same `t^m + |v|^m = 1` the field encodes, so it cannot drift
 * from `cushionDome`. Outside the outline it returns the sheared depth of the rim,
 * which is where the surface has receded to.
 *
 * `rollHem` uses this to ride the body rather than float at an authored depth.
 */
export function cushionFrontDepth(
  params: CushionDomeParams,
  profile: OrbSilhouetteProfile,
  x: number,
  y: number,
): number {
  const radius = Math.hypot(x, y);
  const angle = radius < 1e-9 ? 0 : Math.atan2(y, x);
  const outline = silhouetteRadiusUnits(profile, angle);
  const t = Math.min(1, radius / outline);
  const m = params.shoulderExponent;
  const height = (1 - t ** m) ** (1 / m);
  return (
    params.halfDepthUnits * params.frontScale * height +
    params.lean[0] * x +
    params.lean[1] * y
  );
}

/* ------------------------------------------- *
 * Step 4 — solidify: an inner wall for the body
 * ------------------------------------------- */

/**
 * Hollow the body into a shell of the given thickness.
 *
 * A shell is invisible to the silhouette gate and shows up only under a material,
 * so nothing measurable in this phase constrains the thickness. `LUCA_ORB_STACK_V1`
 * therefore leaves it off rather than carrying a number chosen by eye; the step
 * exists, tested, for the material phase to switch on.
 */
export function solidify(distance: number, thicknessUnits: number | null): number {
  if (thicknessUnits === null) return distance;
  return Math.abs(distance + thicknessUnits * 0.5) - thicknessUnits * 0.5;
}

/* ------------------------------- *
 * Step 5 — rollHem: the fold itself
 * ------------------------------- */

export interface RollHemParams {
  /** Tube radius, in orb units. */
  readonly minorRadiusUnits: number;
  /** How far inside the outline the tube's spine sits. */
  readonly insetUnits: number;
  /** How far in front of the body's own surface the spine rides, in orb units. */
  readonly liftUnits: number;
  /** How much further forward the spine rises on one side. */
  readonly tuckUnits: number;
  /** Angle at which the tuck is greatest, in radians. */
  readonly tuckPhase: number;
}

/**
 * Depth of the hem's spine at `angle`, in orb units.
 *
 * The spine RIDES THE BODY rather than sitting at an authored depth. A constant depth
 * only works on a flat face: the moment the body is a real cushion, the surface at the
 * spine's radius is at a different depth at every angle — the outline here runs from
 * 1.06 to 1.40 units, so a single number is on the surface at one angle and floating
 * or buried at the rest. A rim rolls the material of the body it belongs to, so the
 * spine is placed relative to that surface and `liftUnits` is the small offset from it.
 *
 * `tuckUnits` is then the authored gather: the one side where the roll lifts further
 * forward, which is what the reference does and what a single swept tube otherwise
 * cannot express.
 */
export function rollHemSpineDepth(
  params: RollHemParams,
  dome: CushionDomeParams,
  profile: OrbSilhouetteProfile,
  angle: number,
  spineRadius: number,
): number {
  const surface = cushionFrontDepth(
    dome,
    profile,
    spineRadius * Math.cos(angle),
    spineRadius * Math.sin(angle),
  );
  return surface + params.liftUnits + params.tuckUnits * Math.cos(angle - params.tuckPhase);
}

/**
 * A tube swept along a closed curve that runs just inside the outline.
 *
 * This is the step the height field could not express. The tube's surface has two
 * depths at the same (x, y) — one where the rim turns away from the viewer and one
 * where it comes back — so the rim reads as rolled material rather than as a
 * bright band painted on a shoulder. The spine's depth follows the body and is
 * gathered on one side, which is what makes the roll behave the way the reference does.
 */
export function rollHem(
  params: RollHemParams,
  dome: CushionDomeParams,
  profile: OrbSilhouetteProfile,
  x: number,
  y: number,
  z: number,
): number {
  const radius = Math.hypot(x, y);
  const angle = Math.atan2(y, x);
  const spineRadius = silhouetteRadiusUnits(profile, angle) - params.insetUnits;
  const slope = silhouetteRadiusDerivative(profile, angle) / Math.max(spineRadius, 1e-9);
  const radial = (radius - spineRadius) / Math.sqrt(1 + slope * slope);
  const depth = z - rollHemSpineDepth(params, dome, profile, angle, spineRadius);
  return Math.hypot(radial, depth) - params.minorRadiusUnits;
}

/* ------------------------------------- *
 * Step 6 — blend: join the body and the hem
 * ------------------------------------- */

/**
 * Smooth minimum, cubic form.
 *
 * Cubic rather than the more common quadratic because the quadratic is only C1:
 * its curvature jumps at the edges of the blend region, and a curvature
 * discontinuity on a rim is visible as a crease under a specular material even
 * though the surface itself is continuous. `k` is the blend width in orb units.
 */
export function blend(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - (h * h * h * k) / 6;
}

/* ---------------------------- *
 * Step 7 — tilt: the global lean
 * ---------------------------- */

export interface TiltParams {
  /** Rotation about the frame's x axis, in radians; nods the form toward the viewer. */
  readonly pitch: number;
  /** Rotation about the frame's y axis, in radians; turns it left or right. */
  readonly yaw: number;
}

/**
 * Bring a world point into the form's own frame.
 *
 * Roll is deliberately absent: rotation within the frame is already carried by
 * `BaseProfileParams.rotation`, where the trace can measure it, and having it in
 * two places would let a fit trade one against the other and report a form that
 * matches for the wrong reason. Pitch and yaw are out-of-plane, so a silhouette
 * cannot constrain them at all.
 */
export function tilt(params: TiltParams, p: Vec3): Vec3 {
  const [x, y, z] = p;
  const cy = Math.cos(-params.yaw);
  const sy = Math.sin(-params.yaw);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const cp = Math.cos(-params.pitch);
  const sp = Math.sin(-params.pitch);
  const y2 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;
  return [x1, y2, z2];
}

/** Angle of the `index`-th of `count` evenly spaced samples, in radians. */
export function sampleAngle(index: number, count: number): number {
  return (index / count) * TAU;
}
