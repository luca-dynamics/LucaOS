import { describe, expect, it } from "vitest";

import {
  getLucaAppearanceCssVariables,
  resolveLucaAppearanceTokens,
} from "../../../config/lucaAppearanceTokens";

const { readFileSync } = process.getBuiltinModule("node:fs");
const source = readFileSync("src/components/ui/luca/LucaField.tsx", "utf8");
const switchSource = source.slice(source.indexOf("export const LucaSwitch"));
const knobSource = switchSource.slice(switchSource.indexOf("<span"));

// Tailwind spacing: 1 unit = 0.25rem = 4px at the default root size.
const UNIT_PX = 4;
const REM_PX = 16;

const units = (pattern: RegExp) => {
  const match = switchSource.match(pattern);
  if (!match) throw new Error(`LucaSwitch no longer declares ${pattern}`);
  return Number(match[1]) * UNIT_PX;
};

describe("LucaSwitch appearance", () => {
  // The knob:track ratio is what separates a switch from a dot in a pill. Every
  // shipped reference sits in a narrow band: iOS/macOS 27/31 = 0.871, Radix and
  // shadcn (Linear, Vercel, Stripe) 20/24 = 0.833. This tab's switch was 20/28
  // = 0.714, which is why it read as amateur.
  it("keeps the knob:track ratio inside the shipped-product band", () => {
    const track = units(/\bh-(\d+)\b/);
    const knob = units(/\bsize-(\d+)\b/);

    expect(track).toBe(28);
    expect(knob / track).toBeGreaterThanOrEqual(0.83);
    expect(knob / track).toBeLessThanOrEqual(0.88);
  });

  // Guards the defect class directly: change the knob size without changing the
  // travel and the knob either overflows the track or stops short of the end.
  it("travels the full track with an equal inset at both ends", () => {
    const trackWidth = units(/\bw-(\d+)\b/);
    const knob = units(/\bsize-(\d+)\b/);
    const inset = units(/\btop-([\d.]+)\b/);

    const travel = knobSource.match(
      /checked \? "translateX\(([\d.]+)rem\)" : "translateX\(([\d.]+)rem\)"/,
    );
    if (!travel) throw new Error("LucaSwitch no longer declares a translateX pair");
    const onX = Number(travel[1]) * REM_PX;
    const offX = Number(travel[2]) * REM_PX;

    expect(inset).toBe(2);
    expect(offX).toBe(inset);
    // Right-hand gap in the on state must equal the left-hand gap in the off
    // state, or the knob looks mis-seated at one end.
    expect(trackWidth - (onX + knob)).toBe(inset);
  });

  // Changing the knob colour alongside the track is what made the on and off
  // states read as two unrelated shapes instead of one object moving.
  it("holds the knob constant and lets the track carry the state", () => {
    expect(knobSource).toContain('backgroundColor: "var(--luca-control-knob,#fff)"');
    expect(knobSource).not.toMatch(/backgroundColor: checked/);
    expect(knobSource).toContain("boxShadow:");
    expect(switchSource).toMatch(
      /backgroundColor: checked\s*\?\s*"var\(--luca-control-on,#3b82f6\)"/,
    );
  });

  // Tailwind's default --tw-ring-offset-color is #fff, so ring-offset-2 with no
  // offset colour draws a white halo around the track on any dark surface.
  it("does not draw a white ring offset on dark surfaces", () => {
    expect(switchSource).toContain("focus-visible:ring-offset-transparent");
  });

  // A control role, not the brand accent: skin accents are tuned to sit quietly
  // behind content, and a quiet accent cannot signal binary state.
  it.each(["dark", "light"] as const)("publishes control tokens in %s mode", (mode) => {
    const tokens = resolveLucaAppearanceTokens({
      appearanceMode: mode,
      platformAppearance: mode,
      accent: "neutral",
    });
    const variables = getLucaAppearanceCssVariables(tokens);

    expect(variables["--luca-control-on"]).toBe(tokens.controlOn);
    expect(variables["--luca-control-knob"]).toBe("#ffffff");
    expect(tokens.controlOn).not.toBe(tokens.accentPrimary);
  });
});
