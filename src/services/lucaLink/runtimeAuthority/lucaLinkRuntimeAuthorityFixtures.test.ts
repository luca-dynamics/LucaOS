import { describe, expect, it } from "vitest";
import { LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES } from "./lucaLinkRuntimeAuthorityFixtures";

describe("LucaLink runtime authority fixtures", () => {
  it("covers safe representative classifications without executable payloads", () => {
    const classes = LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES.map((record) => record.authorityClass);
    expect(classes).toEqual(expect.arrayContaining([
      "permanently_blocked", "review_only", "dry_run_only",
      "future_bounded_handoff_candidate", "unsupported",
    ]));
    expect(LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES.every((record) =>
      record.sideEffectsPerformed === false && record.authorityGranted === false
    )).toBe(true);
  });
});
