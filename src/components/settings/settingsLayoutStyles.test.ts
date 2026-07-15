import { describe, expect, it } from "vitest";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

describe("settingsLayoutStyles", () => {
  it("uses Luca semantic surface, border, text, accent, and shadow tokens with app fallbacks", () => {
    expect(settingsSurfaceTokens.glass).toContain("--luca-surface-glass");
    expect(settingsSurfaceTokens.solid).toContain("--luca-surface-solid");
    expect(settingsSurfaceTokens.hover).toContain("--luca-surface-hover");
    expect(settingsSurfaceTokens.elevated).toContain(
      "--luca-material-control-surface",
    );
    expect(settingsSurfaceTokens.borderSubtle).toContain(
      "--luca-border-subtle",
    );
    expect(settingsSurfaceTokens.borderStrong).toContain(
      "--luca-border-strong",
    );
    expect(settingsSurfaceTokens.textPrimary).toContain("--luca-text-primary");
    expect(settingsSurfaceTokens.textSecondary).toContain(
      "--luca-text-secondary",
    );
    expect(settingsSurfaceTokens.textTertiary).toContain(
      "--luca-text-tertiary",
    );
    expect(settingsSurfaceTokens.accentPrimary).toContain(
      "--luca-accent-primary",
    );
    expect(settingsSurfaceTokens.accentSoft).toContain("--luca-accent-soft");
    expect(settingsSurfaceTokens.shadowSoft).toContain("--luca-shadow-soft");

    for (const token of Object.values(settingsSurfaceTokens)) {
      expect(token).toContain("var(--");
    }

    expect(settingsSurfaceTokens.shadowSoft).toContain(
      "var(--luca-material-shadow",
    );
  });
});
