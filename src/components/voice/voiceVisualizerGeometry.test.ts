import { describe, expect, it } from "vitest";
import { resolveVoiceVisualizerGeometry } from "./voiceVisualizerGeometry";

describe("resolveVoiceVisualizerGeometry", () => {
  it.each([
    [1440, 900],
    [720, 900],
    [900, 420],
    [420, 280],
  ])("keeps every animated ring inside a %ix%i surface", (width, height) => {
    const geometry = resolveVoiceVisualizerGeometry(width, height);
    const outerContainmentRing = geometry.baseRadius * 2.2;
    const outerSpectrumRing = geometry.baseOrbRadius * 2.5 + geometry.spectrumPulse;
    const availableRadius = Math.min(width, height) / 2 - geometry.edgeMargin;

    expect(outerContainmentRing).toBeLessThanOrEqual(availableRadius);
    expect(outerSpectrumRing).toBeLessThanOrEqual(availableRadius);
  });

  it("preserves the established maximum scale in a spacious window", () => {
    const geometry = resolveVoiceVisualizerGeometry(1600, 1000);

    expect(geometry.baseRadius).toBe(150);
    expect(geometry.baseOrbRadius).toBe(132);
  });
});
