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
    expect(bootstrapSource).not.toContain('from "buffer"');
  });

  it("bundles and pre-optimizes the browser buffer package without externalizing it", () => {
    expect(viteConfigSource).toContain('include: ["buffer",');

    const externalBlock =
      viteConfigSource.match(/external:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
    expect(externalBlock).not.toMatch(/["'](?:node:)?buffer["']/);
  });
});
