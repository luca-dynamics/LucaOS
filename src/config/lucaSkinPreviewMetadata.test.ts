import { describe, expect, it } from "vitest";
import { LUCA_SKIN_IDS } from "./lucaSkins";
import {
  LUCA_SKIN_PREVIEW_METADATA,
  getDefaultLucaSkinPreviewMetadata,
  getLucaSkinPreviewMetadata,
  getLucaSkinPreviewMetadataList,
} from "./lucaSkinPreviewMetadata";

const COMPETITOR_NAMES = ["Apple", "Claude", "ChatGPT", "Gemini", "Cursor"];

describe("lucaSkinPreviewMetadata", () => {
  it("resolves Carbon as the default preview metadata", () => {
    expect(getDefaultLucaSkinPreviewMetadata().id).toBe("carbon");
  });

  it("falls back to Carbon for invalid skin IDs", () => {
    expect(getLucaSkinPreviewMetadata("not-a-skin").id).toBe("carbon");
  });

  it("provides metadata for every official skin ID", () => {
    for (const skinId of LUCA_SKIN_IDS) {
      expect(LUCA_SKIN_PREVIEW_METADATA[skinId]?.id).toBe(skinId);
    }
  });

  it("preserves the launch preview order", () => {
    expect(getLucaSkinPreviewMetadataList().map((metadata) => metadata.id)).toEqual([
      "pearl",
      "carbon",
      "flow",
      "canvas",
    ]);
  });

  it("does not include competitor names in user-facing metadata copy", () => {
    for (const metadata of getLucaSkinPreviewMetadataList()) {
      const copy = [
        metadata.label,
        metadata.tagline,
        metadata.description,
        ...metadata.designGuardrails,
      ].join(" ");

      for (const competitorName of COMPETITOR_NAMES) {
        expect(copy).not.toMatch(new RegExp(`\\b${competitorName}\\b`, "i"));
      }
    }
  });

  it("marks Flow as reduced-transparency-safe and mobile-safe", () => {
    expect(getLucaSkinPreviewMetadata("flow").capabilities).toEqual(
      expect.arrayContaining(["reduced-transparency-safe", "mobile-safe"]),
    );
  });

  it("keeps Carbon away from cyberpunk, neon, and terminal aesthetics", () => {
    const guardrails = getLucaSkinPreviewMetadata("carbon").designGuardrails.join(" ");

    expect(guardrails).toMatch(/cyberpunk/i);
    expect(guardrails).toMatch(/neon/i);
    expect(guardrails).toMatch(/terminal/i);
  });

  it("keeps Canvas focused on contrast and low blur", () => {
    const guardrails = getLucaSkinPreviewMetadata("canvas").designGuardrails.join(" ");

    expect(guardrails).toMatch(/contrast/i);
    expect(guardrails).toMatch(/low blur/i);
  });
});
