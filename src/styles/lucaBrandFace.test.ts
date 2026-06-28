import { describe, it, expect } from "vitest";
import { BASE_MOTION } from "../config/quietMachineTokens";
import {
  LUCA_FACE_BREATHE_MS,
  LUCA_FACE_DAWN_FILTER,
  lucaBrandFaceStyle,
} from "./lucaBrandFace";

describe("lucaBrandFace", () => {
  it("breathes on the OS-wide cadence (single source, no orphan 6.4s)", () => {
    expect(LUCA_FACE_BREATHE_MS).toBe(BASE_MOTION.breatheMs);
    expect(LUCA_FACE_BREATHE_MS).toBe(4500);
  });

  it("neutralizes the legacy teal cast and carries no neon/cyber glow", () => {
    expect(LUCA_FACE_DAWN_FILTER).toContain("grayscale(1)");
    expect(LUCA_FACE_DAWN_FILTER).not.toMatch(/cyan|#4f8cff|0 0 \d+px var\(--luca-accent/);
  });

  it("style drives the unified breath animation by the keyframe name", () => {
    const style = lucaBrandFaceStyle(0.92);
    expect(style.opacity).toBe(0.92);
    expect(style.animation).toBe(
      `luca-hologram-breathe ${LUCA_FACE_BREATHE_MS}ms ease-in-out infinite`,
    );
    expect(style.maskImage).toContain("transparent 90%");
  });
});
