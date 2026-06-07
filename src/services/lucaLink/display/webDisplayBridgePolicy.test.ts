import { describe, expect, it } from "vitest";
import { evaluateLucaLinkWebDisplayBridgePolicy } from "./webDisplayBridgePolicy";
import { createLucaLinkWebDisplaySessionIntent } from "./webDisplaySession";

const now = "2026-06-07T10:00:00.000Z";

function intentWith(urlPreview?: string, title = "Safe display preview") {
  return createLucaLinkWebDisplaySessionIntent({
    requestedByHostId: "primary-host",
    targetHostId: "display-host",
    title,
    urlPreview,
    contentKind: "web_url",
    createdAt: now,
    expiresAt: "2026-06-07T10:15:00.000Z",
  });
}

describe("LucaLink web display bridge policy", () => {
  it.each(["javascript:alert(1)", "data:text/html,test", "file:///tmp/test", "chrome://settings", "extension://id/page", "blob:https://example.com/id"])(
    "rejects unsafe URL scheme %s",
    (urlPreview) => {
      const result = evaluateLucaLinkWebDisplayBridgePolicy(
        intentWith(urlPreview),
        { now },
      );
      expect(result.status).toBe("blocked");
      expect(result.sideEffectsPerformed).toBe(false);
    },
  );

  it.each([
    "https://user:password@example.com/dashboard",
    "https://example.com/dashboard?access_token=super-secret-token",
    "https://example.com/dashboard?api_key=1234567890abcdef",
  ])("rejects credential or token-like URL %s", (urlPreview) => {
    const result = evaluateLucaLinkWebDisplayBridgePolicy(
      intentWith(urlPreview),
      { now },
    );
    expect(result.status).toBe("blocked");
    expect(result.blockers.join(" ")).toMatch(/credential|token/i);
  });

  it.each(["hidden system prompt", "private reasoning", "raw file contents"])(
    "rejects sensitive content phrase %s",
    (title) => {
      const result = evaluateLucaLinkWebDisplayBridgePolicy(
        intentWith(undefined, title),
        { now },
      );
      expect(result.status).toBe("blocked");
      expect(result.blockers.join(" ")).toMatch(/sensitive/i);
    },
  );

  it("rejects actions outside read-only and presentation-only modes", () => {
    const result = evaluateLucaLinkWebDisplayBridgePolicy(intentWith(), {
      now,
      requestedActions: ["remote_click", "custom_execute"],
    });
    expect(result.status).toBe("blocked");
    expect(result.blockers).toHaveLength(2);
  });
});
