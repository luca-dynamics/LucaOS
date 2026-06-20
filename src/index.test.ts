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
});
