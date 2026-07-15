import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");

describe("Electron soft-blank watchdog", () => {
  const source = readFileSync("platforms/electron/main.cjs", "utf8");

  it("scopes renderer proof-of-life to one main-frame document", () => {
    expect(source).toContain("function resetBlankWatchdogState()");
    expect(source).toContain("did-start-navigation");
    expect(source).toContain("if (isMainFrame && !isInPlace) resetBlankWatchdogState()");
  });

  it("requires a fresh document to paint before recovery reloads are armed", () => {
    const proofOfLife = source.indexOf("if (hasContent) { rendererWasAlive = true");
    const regressionGate = source.indexOf("if (!rendererWasAlive) return");
    expect(proofOfLife).toBeGreaterThan(-1);
    expect(regressionGate).toBeGreaterThan(proofOfLife);
  });
});
