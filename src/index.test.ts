import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
const bootstrapSource = readFileSync("src/index.tsx", "utf8");
const viteConfigSource = readFileSync("vite.config.ts", "utf8");

describe("web bootstrap Buffer compatibility", () => {
  it("installs the browser Buffer global before importing the React app", () => {
    const bufferImportIndex = bootstrapSource.indexOf(
      'import { Buffer as BrowserBuffer } from "buffer";',
    );
    const bufferGuardIndex = bootstrapSource.indexOf(
      'if (typeof globalThis.Buffer === "undefined")',
    );
    const bufferAssignmentIndex = bootstrapSource.indexOf(
      "globalThis.Buffer = BrowserBuffer;",
    );
    const appImportIndex = bootstrapSource.indexOf('import("./reactAppEntry")');

    expect(bufferImportIndex).toBeGreaterThanOrEqual(0);
    expect(bufferGuardIndex).toBeGreaterThan(bufferImportIndex);
    expect(bufferAssignmentIndex).toBeGreaterThan(bufferGuardIndex);
    expect(appImportIndex).toBeGreaterThan(bufferAssignmentIndex);
  });

  it("bundles and pre-optimizes the browser buffer package without externalizing it", () => {
    expect(viteConfigSource).toContain('include: ["buffer",');

    const externalBlock =
      viteConfigSource.match(/external:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
    expect(externalBlock).not.toMatch(/["'](?:node:)?buffer["']/);
  });
});
