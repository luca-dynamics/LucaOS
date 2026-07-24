import { describe, expect, it } from "vitest";
import { settingsCodexSkinVariables } from "./settingsCodexSkin";

describe("settingsCodexSkin", () => {
  const vars = settingsCodexSkinVariables;

  it("flattens the glass into a matte surface", () => {
    expect(vars["--luca-material-glass-highlight"]).toBe("transparent");
    expect(vars["--luca-material-glass-sheen"]).toBe("transparent");
    expect(vars["--luca-material-blur"]).toBe("0px");
  });

  it("removes elevation from content surfaces", () => {
    expect(vars["--luca-material-card-shadow"]).toBe("none");
    expect(vars["--luca-material-control-shadow"]).toBe("none");
    expect(vars["--luca-material-rail-shadow"]).toBe("none");
  });

  it("preserves the modal's own float shadow (does not blank --luca-material-shadow)", () => {
    // The dialog frame floats over a dimmed backdrop; only content surfaces flatten.
    expect(vars).not.toHaveProperty("--luca-material-shadow");
  });

  it("derives hairlines from the ink so they follow the theme", () => {
    for (const key of [
      "--luca-material-border",
      "--luca-material-border-strong",
      "--luca-material-metric-surface",
      "--luca-material-control-surface",
      "--luca-material-tab-active-surface",
    ]) {
      expect(vars[key]).toContain("color-mix(in srgb");
      expect(vars[key]).toContain("var(--luca-text-primary");
    }
    // A hairline is lighter than a strong border.
    expect(vars["--luca-material-border"]).toContain("11%");
    expect(vars["--luca-material-border-strong"]).toContain("18%");
  });

  it("cards sit on the active skin's solid surface (opaque, no glass tint)", () => {
    expect(vars["--luca-material-card-surface"]).toContain(
      "var(--luca-surface-solid",
    );
    expect(vars["--luca-material-surface-solid"]).toContain(
      "var(--luca-surface-solid",
    );
  });

  it("leaves accent and text tokens to the active skin (identity-correct)", () => {
    // Codex structure, Luca identity: never override the accent or text scale.
    expect(vars).not.toHaveProperty("--luca-accent-primary");
    expect(vars).not.toHaveProperty("--luca-accent-soft");
    expect(vars).not.toHaveProperty("--luca-text-primary");
    expect(vars).not.toHaveProperty("--luca-text-secondary");
    expect(vars).not.toHaveProperty("--luca-text-tertiary");
  });

  it("only sets material override slots, never bare app values", () => {
    for (const key of Object.keys(vars)) {
      expect(key.startsWith("--luca-material-")).toBe(true);
    }
  });
});
