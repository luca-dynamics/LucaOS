import { describe, expect, it } from "vitest";
import { getLucaLinkMessageClassPolicy } from "./transportMessageClassPolicy";

describe("LucaLink message class policy", () => {
  it("requires approval for display, adapter, and bounded handoff previews", () => {
    for (const messageClass of [
      "display_intent",
      "adapter_plan",
      "bounded_handoff_preview",
    ] as const) {
      expect(getLucaLinkMessageClassPolicy(messageClass).approvalRequired).toBe(
        true,
      );
    }
  });
  it("keeps diagnostics local and sensitive payloads blocked", () => {
    expect(
      getLucaLinkMessageClassPolicy("debug_diagnostic").allowedChannels,
    ).toEqual(["local_only"]);
    expect(
      getLucaLinkMessageClassPolicy("blocked_sensitive_payload").alwaysBlocked,
    ).toBe(true);
  });
});
