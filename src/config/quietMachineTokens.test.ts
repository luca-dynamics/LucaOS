import { describe, expect, it } from "vitest";
import {
  presenceCssVariables,
  resolvePresenceTokens,
} from "./quietMachineTokens";

describe("resolvePresenceTokens", () => {
  it("uses the accent color for ordinary intents", () => {
    const t = resolvePresenceTokens({
      intent: "listening",
      accentPrimary: "#4f8cff",
    });
    expect(t.color).toBe("#4f8cff");
    expect(t.edge.color).toBe("#4f8cff");
  });

  it("uses the warning token for attention", () => {
    const t = resolvePresenceTokens({
      intent: "attention",
      accentPrimary: "#4f8cff",
      warning: "#f2b23e",
    });
    expect(t.color).toBe("#f2b23e");
  });

  it("falls back to the warning CSS variable when none is supplied", () => {
    const t = resolvePresenceTokens({ intent: "attention" });
    expect(t.color).toBe("var(--luca-warning)");
  });

  it("uses a muted neutral for a dormant body and suppresses motion", () => {
    const t = resolvePresenceTokens({ intent: "dormant" });
    expect(t.color).toBe("var(--luca-text-tertiary)");
    expect(t.motion).toBeNull();
    expect(t.coreScale).toBeLessThan(1);
  });

  it("suppresses motion under reduced motion", () => {
    const t = resolvePresenceTokens({ intent: "working", reducedMotion: true });
    expect(t.motion).toBeNull();
  });

  it("spins faster for working than for thinking", () => {
    const working = resolvePresenceTokens({ intent: "working" });
    const thinking = resolvePresenceTokens({ intent: "thinking" });
    expect(working.motion?.sparkSpinMs).toBeLessThan(
      thinking.motion!.sparkSpinMs,
    );
  });

  it("tightens the edge and raises opacity under high contrast", () => {
    const normal = resolvePresenceTokens({ intent: "working" });
    const hc = resolvePresenceTokens({ intent: "working", highContrast: true });
    expect(hc.edge.blurPx).toBeLessThan(normal.edge.blurPx);
    expect(hc.edge.opacity).toBeGreaterThan(normal.edge.opacity);
  });
});

describe("presenceCssVariables", () => {
  it("emits color and scale vars and omits durations when motion is null", () => {
    const tokens = resolvePresenceTokens({ intent: "dormant" });
    const vars = presenceCssVariables(tokens);
    expect(vars["--pm-color"]).toBeDefined();
    expect(vars["--pm-core-scale"]).toBeDefined();
    expect(vars["--pm-breathe"]).toBeUndefined();
  });

  it("emits duration vars when motion is present", () => {
    const tokens = resolvePresenceTokens({
      intent: "working",
      accentPrimary: "#fff",
    });
    const vars = presenceCssVariables(tokens);
    expect(vars["--pm-spark"]).toBe("1800ms");
    expect(vars["--pm-orbit"]).toBeDefined();
  });
});
