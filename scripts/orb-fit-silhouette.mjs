#!/usr/bin/env node
/**
 * Derive the orb's silhouette profile from the traced master.
 *
 * Offline tooling, the second link in the chain that starts at the product master:
 * `orb-trace-master.mjs` measures the master's outline, and this script solves the
 * profile that explains it. Run it when the fit or the trace changes, commit the
 * artifact, and let the tests read the committed numbers.
 *
 *   node scripts/orb-fit-silhouette.mjs [--json]
 *
 * The fit takes a couple of seconds and nine restarts, which is why it lives here
 * rather than in a test. The test's job is to check that the committed numbers
 * still describe the master, not to re-derive them on every run.
 */

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadOrbDesignModule } from './lib/load-orb-design.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const designRoot = path.join(repoRoot, 'packages', 'luca-orb-design');
const artifactPath = path.join(designRoot, 'src', 'sculpt', 'silhouette.v1.ts');

/**
 * Lobe counts the wave may use.
 *
 * Measured, not chosen by taste: against the frozen base shape the residual
 * spectrum has real spikes at three lobes (3.87 px) and eight (1.68 px), and
 * nothing above eight exceeds 0.60 px, which is the trace's own 0.5 px radial
 * quantization. Extending to sixteen lobes lowers the residual to 0.554 px, but it
 * does it by fitting the extractor's noise into a committed form.
 */
const HARMONICS = Object.freeze([2, 3, 4, 5, 6, 7, 8]);

/** Digits kept in the artifact. Diagnostics are measured after rounding to these. */
const PRECISION = Object.freeze({
  center: 3,
  axis: 6,
  exponent: 6,
  rotation: 6,
  amplitude: 6,
  phase: 6,
});

function formatFloat(value, digits) {
  return value.toFixed(digits);
}

function renderArtifact({ profile, provenance, worst }) {
  const harmonicRows = profile.harmonics
    .map(
      ({ harmonic, amplitude, phase }) =>
        `  Object.freeze({ harmonic: ${harmonic}, amplitude: ${formatFloat(amplitude, PRECISION.amplitude)}, phase: ${formatFloat(phase, PRECISION.phase)} }),`,
    )
    .join('\n');

  return `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by \`scripts/orb-fit-silhouette.mjs\`, which solves this profile against
 * \`../trace/hero-contour.v1\`. Regenerate rather than adjust: these numbers are a
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
 * the base shape alone leaves ${provenance.baseRmsPx.toFixed(3)} px RMS; with the wave that becomes
 * ${provenance.geometricRmsPx.toFixed(3)} px RMS and ${provenance.geometricMaxPx.toFixed(3)} px maximum, at ${provenance.silhouetteIoU.toFixed(5)} silhouette IoU.
 *
 * The maximum is not spread around the ring. It is a single inward dent of about
 * ${Math.abs(worst.signedPx).toFixed(1)} px over roughly ${worst.arcDegrees} degrees at ${worst.atDegrees} degrees, on the left flank where the rolled hem
 * meets the outline; ${worst.withinOnePointFive} of 360 samples are inside 1.5 px. A harmonic basis cannot
 * produce a dent that narrow without rippling the whole ring, so this residual is
 * left for the hem to own in \`./stack\` rather than smoothed away here.
 */

import type { OrbSilhouetteProfile, RadialHarmonic } from './steps';

const harmonics: readonly RadialHarmonic[] = Object.freeze([
${harmonicRows}
]);

/** The master's outer silhouette as a solved profile. Orb units, ${profile.unitPx} px to the unit. */
export const LUCA_ORB_SILHOUETTE_V1: OrbSilhouetteProfile = Object.freeze({
  base: Object.freeze({
    semiAxisX: ${formatFloat(profile.base.semiAxisX, PRECISION.axis)},
    semiAxisY: ${formatFloat(profile.base.semiAxisY, PRECISION.axis)},
    exponent: ${formatFloat(profile.base.exponent, PRECISION.exponent)},
    rotation: ${formatFloat(profile.base.rotation, PRECISION.rotation)},
  }),
  harmonics,
  centerPx: Object.freeze([${formatFloat(profile.centerPx[0], PRECISION.center)}, ${formatFloat(profile.centerPx[1], PRECISION.center)}] as const),
  unitPx: ${profile.unitPx},
});

export const LUCA_ORB_SILHOUETTE_V1_PROVENANCE = Object.freeze({
  id: 'luca-living-orb/silhouette-profile',
  version: 1,
  /** The frozen product master, carried through the trace this was fitted to. */
  sourceSha256: '${provenance.sourceSha256}',
  tracedContour: 'luca-living-orb/hero-contour@1',
  harmonics: Object.freeze([${HARMONICS.join(', ')}] as const),
  restarts: ${provenance.restarts},
  /** Residual the base shape alone leaves, along rays from its own centre. */
  baseRmsPx: ${provenance.baseRmsPx.toFixed(4)},
  baseMaxPx: ${provenance.baseMaxPx.toFixed(4)},
  /** Geometric deviation from the traced ring, which is what the gate measures. */
  geometricRmsPx: ${provenance.geometricRmsPx.toFixed(4)},
  geometricMaxPx: ${provenance.geometricMaxPx.toFixed(4)},
  geometricMaxAtDegrees: ${provenance.geometricMaxAtDegrees.toFixed(2)},
  silhouetteIoU: ${provenance.silhouetteIoU.toFixed(5)},
  /** Rotation in degrees, for reading; \`base.rotation\` is the radian value used. */
  rotationDegrees: ${provenance.rotationDegrees.toFixed(3)},
  centerOffsetFromTracePx: Object.freeze([${provenance.centerOffsetPx[0].toFixed(3)}, ${provenance.centerOffsetPx[1].toFixed(3)}] as const),
});
`;
}

async function main() {
  const asJson = process.argv.includes('--json');

  const trace = await loadOrbDesignModule('trace/master-contour.ts');
  const hero = await loadOrbDesignModule('trace/hero-contour.v1.ts');
  const fit = await loadOrbDesignModule('sculpt/fit.ts');
  const steps = await loadOrbDesignModule('sculpt/steps.ts');
  const deviation = await loadOrbDesignModule('trace/deviation.ts');

  const contour = hero.HERO_CONTOUR_V1;
  const sourceSha256 = hero.HERO_CONTOUR_V1_PROVENANCE.sourceSha256;

  // The trace records which master it came from; refuse to fit a trace of anything
  // else, so a swapped reference cannot redefine the form two hops from the check.
  trace.verifyMasterSource(sourceSha256);

  const started = process.hrtime.bigint();
  const solved = fit.fitSilhouetteToContour(contour, { harmonics: HARMONICS });
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

  // Quantize before measuring, so the accuracy the artifact declares is the accuracy
  // of the numbers the artifact contains rather than of the solver's full precision.
  const q = trace.quantize;
  const profile = {
    base: {
      semiAxisX: q(solved.profile.base.semiAxisX, PRECISION.axis),
      semiAxisY: q(solved.profile.base.semiAxisY, PRECISION.axis),
      exponent: q(solved.profile.base.exponent, PRECISION.exponent),
      rotation: q(solved.profile.base.rotation, PRECISION.rotation),
    },
    harmonics: solved.profile.harmonics.map(({ harmonic, amplitude, phase }) => ({
      harmonic,
      amplitude: q(amplitude, PRECISION.amplitude),
      phase: q(phase, PRECISION.phase),
    })),
    centerPx: [
      q(solved.profile.centerPx[0], PRECISION.center),
      q(solved.profile.centerPx[1], PRECISION.center),
    ],
    unitPx: solved.profile.unitPx,
  };

  const candidate = fit.silhouetteProfileToTracedContour(profile, contour.frameSize, 720);
  const geometric = deviation.contourDeviation(candidate, contour, 360);
  const iou = deviation.silhouetteIoU(
    deviation.tracedContourToMask(candidate, 1440),
    deviation.tracedContourToMask(contour, 1440),
  );

  // Locate the worst deviation and how wide it is, so the artifact says where its
  // own error lives instead of reporting one number with no address. The width is
  // the run of samples that stays above half the peak while walking out from the
  // peak in both directions — counting every sample above half-max anywhere on the
  // ring would report a total as though it were one contiguous dent.
  let worstIndex = 0;
  for (let i = 0; i < geometric.perAngle.length; i += 1) {
    if (geometric.perAngle[i] > geometric.perAngle[worstIndex]) worstIndex = i;
  }
  const count = geometric.perAngle.length;
  const half = geometric.perAngle[worstIndex] / 2;
  let arcDegrees = 1;
  for (let step = 1; step < count; step += 1) {
    if (geometric.perAngle[(worstIndex + step) % count] < half) break;
    arcDegrees += 1;
  }
  for (let step = 1; step < count; step += 1) {
    if (geometric.perAngle[(worstIndex - step + count) % count] < half) break;
    arcDegrees += 1;
  }
  const frameAngle = (worstIndex / 360) * Math.PI * 2;
  const wx =
    (contour.centerPx[0] + contour.radiiPx[worstIndex] * Math.cos(frameAngle) - profile.centerPx[0]) /
    profile.unitPx;
  const wy =
    (contour.centerPx[1] + contour.radiiPx[worstIndex] * Math.sin(frameAngle) - profile.centerPx[1]) /
    profile.unitPx;
  const signedPx =
    (Math.hypot(wx, wy) - steps.silhouetteRadiusUnits(profile, Math.atan2(wy, wx))) * profile.unitPx;

  const provenance = {
    sourceSha256,
    restarts: solved.report.restarts,
    baseRmsPx: solved.report.baseRmsPx,
    baseMaxPx: solved.report.baseMaxPx,
    geometricRmsPx: geometric.rmsPx,
    geometricMaxPx: geometric.maxPx,
    geometricMaxAtDegrees: (geometric.maxAtAngle * 180) / Math.PI,
    silhouetteIoU: iou.intersectionOverUnion,
    rotationDegrees: (profile.base.rotation * 180) / Math.PI,
    centerOffsetPx: [
      profile.centerPx[0] - contour.centerPx[0],
      profile.centerPx[1] - contour.centerPx[1],
    ],
  };
  const worst = {
    atDegrees: worstIndex,
    arcDegrees,
    signedPx,
    withinOnePointFive: geometric.perAngle.filter((value) => value <= 1.5).length,
  };

  writeFileSync(artifactPath, renderArtifact({ profile, provenance, worst }), 'utf8');

  const report = {
    artifact: path.relative(repoRoot, artifactPath).replace(/\\/g, '/'),
    sourceSha256,
    harmonics: [...HARMONICS],
    elapsedMs: Number(elapsedMs.toFixed(1)),
    semiAxesPx: [
      Number((profile.base.semiAxisX * profile.unitPx).toFixed(3)),
      Number((profile.base.semiAxisY * profile.unitPx).toFixed(3)),
    ],
    exponent: profile.base.exponent,
    rotationDegrees: Number(provenance.rotationDegrees.toFixed(3)),
    centerPx: profile.centerPx,
    baseRmsPx: Number(provenance.baseRmsPx.toFixed(4)),
    geometricRmsPx: Number(geometric.rmsPx.toFixed(4)),
    geometricMaxPx: Number(geometric.maxPx.toFixed(4)),
    silhouetteIoU: Number(iou.intersectionOverUnion.toFixed(5)),
    worst,
  };

  if (asJson) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  process.stdout.write(`fitted the silhouette to luca-living-orb/hero-contour@1\n`);
  process.stdout.write(`  semi-axes       ${report.semiAxesPx[0]} x ${report.semiAxesPx[1]} px\n`);
  process.stdout.write(`  exponent        ${report.exponent}\n`);
  process.stdout.write(`  rotation        ${report.rotationDegrees} deg\n`);
  process.stdout.write(`  centre          ${report.centerPx[0]}, ${report.centerPx[1]} px\n`);
  process.stdout.write(`  base alone      ${report.baseRmsPx} px rms\n`);
  process.stdout.write(`  with the wave   ${report.geometricRmsPx} px rms, ${report.geometricMaxPx} px max\n`);
  process.stdout.write(`  silhouette IoU  ${report.silhouetteIoU}\n`);
  process.stdout.write(
    `  worst           ${Math.abs(worst.signedPx).toFixed(2)} px ${worst.signedPx < 0 ? 'inward' : 'outward'} at ${worst.atDegrees} deg over ~${worst.arcDegrees} deg\n`,
  );
  process.stdout.write(`  elapsed         ${report.elapsedMs} ms\n`);
  process.stdout.write(`wrote ${report.artifact}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
