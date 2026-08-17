#!/usr/bin/env node
/**
 * Render the orb's form as clay and measure it against the master.
 *
 * Offline tooling, and the step that closes the loop: until this ran, every orb
 * iteration was a guess, because nothing reported how far the form was from the
 * reference.
 *
 *   node scripts/orb-clay-diff.mjs [--size 360] [--json]
 *
 * Writes a three-panel PNG next to the references — the master crop, the clay
 * render, and the two silhouettes drawn over the master — plus the numbers the
 * acceptance gate is stated in.
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
const outputPath = path.join(designRoot, 'references', 'luca-orb-clay-diff.png');

const CROP = Object.freeze([400, 86, 360, 360]);
const FRAME = 360;
const GAP = 12;

/** The gate from design-spec/HeroAssembly.v3.md, computed rather than quoted. */
const GATE = Object.freeze({ rmsPx: 2, maxPx: 3, iou: 0.985 });

function argValue(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0 || index + 1 >= process.argv.length) return fallback;
  const parsed = Number(process.argv[index + 1]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function writePanels({ master, clay, overlay }) {
  const width = FRAME * 3 + GAP * 2;
  const png = new PNG({ width, height: FRAME });
  png.data.fill(16);
  const blit = (panel, offsetX) => {
    for (let y = 0; y < FRAME; y += 1) {
      for (let x = 0; x < FRAME; x += 1) {
        const from = (y * FRAME + x) * 4;
        const to = (y * width + x + offsetX) * 4;
        png.data[to] = panel[from];
        png.data[to + 1] = panel[from + 1];
        png.data[to + 2] = panel[from + 2];
        png.data[to + 3] = 255;
      }
    }
  };
  blit(master, 0);
  blit(clay, FRAME + GAP);
  blit(overlay, (FRAME + GAP) * 2);
  writeFileSync(outputPath, PNG.sync.write(png));
}

async function main() {
  const asJson = process.argv.includes('--json');
  const size = argValue('size', FRAME);

  const bytes = readFileSync(sourcePath);
  const sha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();

  const trace = await loadOrbDesignModule('trace/master-contour.ts');
  trace.verifyMasterSource(sha256);

  const hero = await loadOrbDesignModule('trace/hero-contour.v1.ts');
  const stackMod = await loadOrbDesignModule('sculpt/stack.ts');
  const clayMod = await loadOrbDesignModule('render/clay.ts');
  const deviation = await loadOrbDesignModule('trace/deviation.ts');

  const stack = stackMod.LUCA_ORB_STACK_V1;
  const contour = hero.HERO_CONTOUR_V1;

  const started = process.hrtime.bigint();
  const render = clayMod.renderClay(stack, { size });
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

  // Measure the render, not the field: this is the only check that notices a march
  // that stepped straight through the hem.
  const rendered = {
    angleCount: 360,
    radiiPx: clayMod.clayCoverageRadii(render, stack.silhouette.centerPx, 360),
    centerPx: stack.silhouette.centerPx,
    frameSize: FRAME,
  };
  const geometric = deviation.contourDeviation(rendered, contour, 360);
  const iou = deviation.silhouetteIoU(
    deviation.tracedContourToMask(rendered, 1440),
    deviation.tracedContourToMask(contour, 1440),
  );

  // ---- panels ----
  const png = PNG.sync.read(bytes);
  const master = Buffer.alloc(FRAME * FRAME * 4);
  for (let y = 0; y < FRAME; y += 1) {
    for (let x = 0; x < FRAME; x += 1) {
      const from = ((y + CROP[1]) * png.width + (x + CROP[0])) * 4;
      const to = (y * FRAME + x) * 4;
      master[to] = png.data[from];
      master[to + 1] = png.data[from + 1];
      master[to + 2] = png.data[from + 2];
      master[to + 3] = 255;
    }
  }

  const clay = Buffer.alloc(FRAME * FRAME * 4);
  const frameScale = FRAME / size;
  for (let y = 0; y < FRAME; y += 1) {
    for (let x = 0; x < FRAME; x += 1) {
      const sx = Math.min(size - 1, Math.floor(x / frameScale));
      const sy = Math.min(size - 1, Math.floor(y / frameScale));
      const index = sy * size + sx;
      const to = (y * FRAME + x) * 4;
      const shade = render.coverage[index] ? Math.round(255 * Math.min(1, render.luminance[index])) : 18;
      clay[to] = shade;
      clay[to + 1] = shade;
      clay[to + 2] = shade;
      clay[to + 3] = 255;
    }
  }

  // The master, dimmed, with the traced ring in green and the render's in magenta.
  const overlay = Buffer.alloc(FRAME * FRAME * 4);
  for (let i = 0; i < FRAME * FRAME; i += 1) {
    const from = i * 4;
    const grey = Math.round(
      0.2126 * master[from] + 0.7152 * master[from + 1] + 0.0722 * master[from + 2],
    );
    const dim = Math.round(grey * 0.45);
    overlay[from] = dim;
    overlay[from + 1] = dim;
    overlay[from + 2] = dim;
    overlay[from + 3] = 255;
  }
  const stamp = (ring, colour) => {
    for (const [x, y] of ringPoints(ring)) {
      const px = Math.round(x);
      const py = Math.round(y);
      if (px < 0 || py < 0 || px >= FRAME || py >= FRAME) continue;
      const to = (py * FRAME + px) * 4;
      overlay[to] = colour[0];
      overlay[to + 1] = colour[1];
      overlay[to + 2] = colour[2];
    }
  };
  function ringPoints(ring) {
    const points = [];
    for (let i = 0; i < 2880; i += 1) {
      const angle = (i / 2880) * Math.PI * 2;
      const radius = trace.sampleTracedRadius(ring, angle);
      points.push([
        ring.centerPx[0] + radius * Math.cos(angle),
        ring.centerPx[1] + radius * Math.sin(angle),
      ]);
    }
    return points;
  }
  stamp(contour, [70, 240, 120]);
  stamp(rendered, [255, 70, 210]);

  writePanels({ master, clay, overlay });

  const passes = {
    rms: geometric.rmsPx <= GATE.rmsPx,
    max: geometric.maxPx <= GATE.maxPx,
    iou: iou.intersectionOverUnion >= GATE.iou,
  };
  const report = {
    source: path.relative(repoRoot, sourcePath).replace(/\\/g, '/'),
    sha256,
    output: path.relative(repoRoot, outputPath).replace(/\\/g, '/'),
    renderSize: size,
    elapsedMs: Number(elapsedMs.toFixed(1)),
    marchSteps: render.steps,
    exhaustedRays: render.exhausted,
    refinedRays: render.refined,
    coveredPixels: render.coverage.reduce((sum, value) => sum + (value ? 1 : 0), 0),
    contourRmsPx: Number(geometric.rmsPx.toFixed(4)),
    contourMaxPx: Number(geometric.maxPx.toFixed(4)),
    contourMaxAtDegrees: Number(((geometric.maxAtAngle * 180) / Math.PI).toFixed(2)),
    silhouetteIoU: Number(iou.intersectionOverUnion.toFixed(5)),
    gate: GATE,
    passes,
    passesAll: passes.rms && passes.max && passes.iou,
  };

  if (asJson) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  const mark = (ok) => (ok ? 'PASS' : 'FAIL');
  process.stdout.write(`clay render of luca-living-orb/sculpt-stack@${stack.version}\n`);
  process.stdout.write(`  size            ${size} px  (${report.marchSteps.toLocaleString()} march steps, ${report.elapsedMs} ms)\n`);
  process.stdout.write(`  covered         ${report.coveredPixels.toLocaleString()} px\n`);
  process.stdout.write(
    `  march           ${report.exhaustedRays} rays starved, ${report.refinedRays} recovered from overshoot\n`,
  );
  process.stdout.write(`  contour rms     ${report.contourRmsPx} px   <= ${GATE.rmsPx}   ${mark(passes.rms)}\n`);
  process.stdout.write(`  contour max     ${report.contourMaxPx} px   <= ${GATE.maxPx}   ${mark(passes.max)}  at ${report.contourMaxAtDegrees} deg\n`);
  process.stdout.write(`  silhouette IoU  ${report.silhouetteIoU}   >= ${GATE.iou}   ${mark(passes.iou)}\n`);
  process.stdout.write(`  gate            ${report.passesAll ? 'PASS' : 'FAIL'}\n`);
  process.stdout.write(`wrote ${report.output}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
