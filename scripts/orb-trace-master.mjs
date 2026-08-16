#!/usr/bin/env node
/**
 * Derive the Luca orb's silhouette from the frozen product master.
 *
 * Offline tooling. Run it when the extraction method changes, commit the
 * artifact it writes, and let the tests read the committed numbers. The renderer
 * never decodes a PNG.
 *
 *   node scripts/orb-trace-master.mjs [--json]
 *
 * The script hashes the source first and exits non-zero if it is not the frozen
 * master, so a swapped reference cannot quietly redefine the form.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

import { loadOrbDesignModule } from './lib/load-orb-design.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const designRoot = path.join(repoRoot, 'packages', 'luca-orb-design');
const sourcePath = path.join(designRoot, 'references', 'luca-living-orb-master.png');
const artifactPath = path.join(designRoot, 'src', 'trace', 'hero-contour.v1.ts');

/** The frozen evaluation frame from design-spec/HeroAssembly.v3.md. */
const HERO_FRAME = Object.freeze({
  sourceSize: [1536, 1024],
  cropPixels: [400, 86, 360, 360],
  outputSize: 360,
});

function formatNumberRows(values, perRow, precision) {
  const rows = [];
  for (let i = 0; i < values.length; i += perRow) {
    rows.push(
      `  ${values
        .slice(i, i + perRow)
        .map((value) => value.toFixed(precision))
        .join(', ')},`,
    );
  }
  return rows.join('\n');
}

function renderArtifact({ contour, diagnostics, sha256, svgPath, extremes }) {
  const landmark = (point) => `Object.freeze([${point[0].toFixed(3)}, ${point[1].toFixed(3)}] as const)`;
  return `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by \`scripts/orb-trace-master.mjs\` from
 * \`references/luca-living-orb-master.png\`. Regenerate rather than adjust: the
 * numbers below are a measurement of the master, and editing them turns the
 * acceptance gate back into an opinion.
 *
 * Measured over ${contour.angleCount} samples: anisotropy ${diagnostics.anisotropy.toFixed(3)}, ring roughness ${diagnostics.roughnessPx.toFixed(1)} px,
 * mean edge strength ${diagnostics.meanEdgeStrength.toFixed(3)} of a possible 1.0.
 */

import type { HeroFrame, TracedContour } from './master-contour';

export const HERO_CONTOUR_FRAME: HeroFrame = Object.freeze({
  sourceSize: Object.freeze([${HERO_FRAME.sourceSize.join(', ')}] as const),
  cropPixels: Object.freeze([${HERO_FRAME.cropPixels.join(', ')}] as const),
  outputSize: ${HERO_FRAME.outputSize},
});

const radiiPx = Object.freeze([
${formatNumberRows(contour.radiiPx, 6, 3)}
]);

/** The master's outer silhouette, in frozen-frame pixels. */
export const HERO_CONTOUR_V1: TracedContour = Object.freeze({
  angleCount: ${contour.angleCount},
  radiiPx,
  centerPx: Object.freeze([${contour.centerPx[0].toFixed(3)}, ${contour.centerPx[1].toFixed(3)}] as const),
  frameSize: ${contour.frameSize},
});

/**
 * The four silhouette landmarks the acceptance gate names, read off the trace
 * rather than typed in. Frame pixels.
 */
export const HERO_CONTOUR_V1_LANDMARKS = Object.freeze({
  crownApex: ${landmark(extremes.top)},
  rightmostReturn: ${landmark(extremes.right)},
  lowerFoldApex: ${landmark(extremes.bottom)},
  leftmostMembrane: ${landmark(extremes.left)},
});

export const HERO_CONTOUR_V1_PROVENANCE = Object.freeze({
  id: 'luca-living-orb/hero-contour',
  version: 1,
  sourceSha256: '${sha256}',
  anisotropy: ${diagnostics.anisotropy.toFixed(4)},
  roughnessPx: ${diagnostics.roughnessPx.toFixed(3)},
  meanRadiusPx: ${diagnostics.meanRadiusPx.toFixed(3)},
  minRadiusPx: ${diagnostics.minRadiusPx.toFixed(3)},
  maxRadiusPx: ${diagnostics.maxRadiusPx.toFixed(3)},
  meanEdgeStrength: ${diagnostics.meanEdgeStrength.toFixed(4)},
});

/** Closed cubic path for the review overlay, in the 360 px frame. */
export const HERO_CONTOUR_V1_PATH =
  '${svgPath}';
`;
}

async function main() {
  const asJson = process.argv.includes('--json');
  const bytes = readFileSync(sourcePath);
  const sha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();

  const trace = await loadOrbDesignModule('trace/master-contour.ts');
  trace.verifyMasterSource(sha256);

  const png = PNG.sync.read(bytes);
  const image = { width: png.width, height: png.height, data: new Uint8Array(png.data) };

  const started = process.hrtime.bigint();
  const { contour, diagnostics } = trace.extractMasterContour(image, HERO_FRAME);
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

  const svgPath = trace.tracedContourToSvgPath(contour, 48, 2);
  const extremes = trace.tracedContourExtremes(contour);
  writeFileSync(
    artifactPath,
    renderArtifact({ contour, diagnostics, sha256, svgPath, extremes }),
    'utf8',
  );

  const report = {
    source: path.relative(repoRoot, sourcePath).replace(/\\/g, '/'),
    sha256,
    artifact: path.relative(repoRoot, artifactPath).replace(/\\/g, '/'),
    angleCount: contour.angleCount,
    centerPx: contour.centerPx.map((value) => Number(value.toFixed(3))),
    elapsedMs: Number(elapsedMs.toFixed(1)),
    ...Object.fromEntries(
      Object.entries(diagnostics).map(([key, value]) => [key, Number(value.toFixed(4))]),
    ),
  };

  if (asJson) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  process.stdout.write(`traced ${report.source}\n`);
  process.stdout.write(`  sha256          ${report.sha256}\n`);
  process.stdout.write(`  centre          ${report.centerPx[0]}, ${report.centerPx[1]} px\n`);
  process.stdout.write(`  radius          ${report.minRadiusPx} .. ${report.maxRadiusPx} px (mean ${report.meanRadiusPx})\n`);
  process.stdout.write(`  anisotropy      ${report.anisotropy}\n`);
  process.stdout.write(`  roughness       ${report.roughnessPx} px over ${report.angleCount} samples\n`);
  process.stdout.write(`  edge strength   ${report.meanEdgeStrength}\n`);
  process.stdout.write(`  elapsed         ${report.elapsedMs} ms\n`);
  process.stdout.write(`wrote ${report.artifact}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
