import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
const bootstrapSource = readFileSync("src/index.tsx", "utf8");
const viteConfigSource = readFileSync("vite.config.ts", "utf8");

describe("web bootstrap entry boundary", () => {
  it("selects WebBridge before importing either runtime entry", () => {
    const selectorIndex = bootstrapSource.indexOf("selectLucaBootstrapEntry({");
    const webImportIndex = bootstrapSource.indexOf('import("./web/webBridgeEntry")');
    const desktopImportIndex = bootstrapSource.indexOf('import("./reactAppEntry")');

    expect(selectorIndex).toBeGreaterThanOrEqual(0);
    expect(webImportIndex).toBeGreaterThan(selectorIndex);
    expect(desktopImportIndex).toBeGreaterThan(webImportIndex);
    expect(bootstrapSource.startsWith('import "./web/webBootPolyfills";')).toBe(
      true,
    );
  });

  it("bundles, pre-optimizes, and explicitly boot-polyfills the browser buffer package", () => {
    const polyfillSource = readFileSync("src/web/webBootPolyfills.ts", "utf8");

    expect(viteConfigSource).toContain('include: ["buffer",');
    expect(polyfillSource).toContain('from "buffer"');
    expect(polyfillSource).toContain("globalThis.Buffer");
    expect(polyfillSource).toContain("window.Buffer");

    const externalBlock =
      viteConfigSource.match(/external:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
    expect(externalBlock).not.toMatch(/["'](?:node:)?buffer["']/);
  });

  it("aliases Node EventEmitter imports away from Vite's browser external", () => {
    const nodePolyfillsSource = readFileSync(
      "src/mocks/node_polyfills.js",
      "utf8",
    );

    expect(viteConfigSource).toContain("events: path.resolve");
    expect(viteConfigSource).toContain('"node:events": path.resolve');
    expect(nodePolyfillsSource).toContain("export class EventEmitter");
    expect(nodePolyfillsSource).toContain("removeAllListeners(eventName)");
    expect(nodePolyfillsSource).toContain("setMaxListeners(count)");
    expect(nodePolyfillsSource).toContain("getMaxListeners()");
  });

  it("keeps the static boot loader responsive to short Electron windows", () => {
    const htmlSource = readFileSync("index.html", "utf8");

    expect(htmlSource).toContain("gap: clamp(7px, 2.4dvh, 18px)");
    expect(htmlSource).toContain("width: min(86vw, 62dvh, 500px)");
    expect(htmlSource).toContain("max-height: min(54dvh, 500px)");
    expect(htmlSource).toContain("@media (max-height: 460px)");
    expect(htmlSource).toContain("width: min(78vw, 50dvh, 420px)");
  });

  it("shows live boot process detail while the static loader waits", () => {
    const htmlSource = readFileSync("index.html", "utf8");

    expect(htmlSource).toContain('class="loader-phase"');
    expect(htmlSource).toContain("Loading saved setup");
    expect(htmlSource).toContain("Loading your workspace");
    expect(htmlSource).toContain("Finishing app setup");
    expect(htmlSource).toContain("loader.querySelector(\".loader-phase\")");
    expect(bootstrapSource).toContain("Starting the app");
    expect(bootstrapSource).toContain("Choosing the best app experience");
    expect(bootstrapSource).toContain("Loading the workspace");
  });
});
