import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
const css = readFileSync("src/index.css", "utf8");

describe("legacy Luca glass compatibility bridge", () => {
  it("routes the legacy panel and pill utilities through skin material tokens", () => {
    expect(css).toContain(".glass-panel {");
    expect(css).toContain("var(--luca-material-glass-highlight");
    expect(css).toContain("var(--luca-material-glass-sheen");
    expect(css).toContain("var(--luca-surface-glass");
    expect(css).toContain(".glass-pill {");
    expect(css).toContain("var(--luca-material-control-surface");
  });

  it("adds optics only to shaped glass-blur foregrounds", () => {
    expect(css).toContain(".glass-blur:is(");
    expect(css).toContain(".rounded-none");
    expect(css).toContain(".rounded-3xl");
    expect(css).toContain("background-color: var(--luca-surface-glass");
    expect(css).toContain(':not([class*="--luca-danger"])');
    expect(css).not.toContain(".glass-blur {\n  background-image:");
  });

  it("provides operating-system transparency and contrast fallbacks", () => {
    expect(css).toContain("@media (prefers-reduced-transparency: reduce)");
    expect(css).toContain("backdrop-filter: none !important");
    expect(css).toContain("@media (prefers-contrast: more)");
    expect(css).toContain("var(--luca-border-strong, currentColor)");
  });
});
