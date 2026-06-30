import { describe, expect, it } from "vitest";
import { recommendVoiceRoute } from "./voiceRoutingPolicy";

const baseSettings = {
  voice: {
    provider: "gemini-genai",
  },
} as any;

describe("voiceRoutingPolicy persona normalization", () => {
  it("does not crash when persisted persona is object-shaped", () => {
    const recommendation = recommendVoiceRoute({
      currentRoute: { kind: "HYBRID_PIPELINE" } as any,
      latencyHistoryMs: [],
      localCoreConnected: false,
      settings: baseSettings,
      persona: { persona: "assistant" },
    });

    expect(recommendation.recommendationMode).toBe("HOLD");
  });
});
