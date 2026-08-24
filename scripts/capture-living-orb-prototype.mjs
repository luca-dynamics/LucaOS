import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const browserPaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const executablePath = browserPaths.find(existsSync);

if (!executablePath) {
  throw new Error('No supported local Chromium browser was found.');
}

const outputPath = process.argv[2];
if (!outputPath) {
  throw new Error('Usage: node scripts/capture-living-orb-prototype.mjs <output.png>');
}

const useSwiftShader = process.argv.includes('--swiftshader');
const captureOnly = process.argv.includes('--capture-only');
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: useSwiftShader ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];

page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));

const response = await page.goto(
  'http://127.0.0.1:4180/living-orb-prototype.html?variant=idle',
  { waitUntil: 'domcontentloaded' },
);
await page.waitForTimeout(1600);
const canvases = await page.locator('canvas').evaluateAll((elements) => elements.map((canvas) => ({
  width: canvas.width,
  height: canvas.height,
  className: canvas.className,
  context: canvas.getContext('webgl2') ? 'webgl2' : canvas.getContext('2d') ? '2d' : 'none',
  contextLost: canvas.getContext('webgl2')?.isContextLost() ?? false,
  glError: canvas.getContext('webgl2')?.getError() ?? null,
  rect: canvas.getBoundingClientRect().toJSON(),
})));
const images = await page.locator('img').evaluateAll((elements) => elements.map((element) => ({
  src: element.currentSrc || element.src,
  complete: element.complete,
  naturalWidth: element.naturalWidth,
  naturalHeight: element.naturalHeight,
  rect: element.getBoundingClientRect().toJSON(),
})));
await page.screenshot({ path: outputPath, type: 'png', fullPage: true });

let evidenceVisible = null;
let passWarningVisible = null;
let splitControlVisible = null;
if (!captureOnly) {
  await page.getByRole('button', { name: 'Evidence' }).click();
  evidenceVisible = await page.getByText('Certification stays closed until the renderer earns it.').isVisible();
  await page.getByRole('button', { name: 'Passes' }).click();
  passWarningVisible = await page.getByText('Not yet implemented').isVisible();
  await page.getByRole('button', { name: 'Split wipe' }).click();
  splitControlVisible = await page.getByText('Split position').isVisible();
}

console.log(JSON.stringify({
  status: response?.status(),
  title: await page.title(),
  errors,
  canvases,
  images,
  checks: {
    evidenceVisible,
    passWarningVisible,
    splitControlVisible,
  },
  outputPath,
}, null, 2));

await browser.close();
