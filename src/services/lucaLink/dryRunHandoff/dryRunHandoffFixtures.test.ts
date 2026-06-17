import { describe, expect, it } from "vitest";
import { LUCA_LINK_DRY_RUN_ADAPTER_APPROVAL_FIXTURE, LUCA_LINK_DRY_RUN_HANDOFF_FIXTURES } from "./dryRunHandoffFixtures";

describe("LucaLink dry-run fixtures", () => {
  it("covers governance outcomes using inert model data", () => {
    expect(LUCA_LINK_DRY_RUN_HANDOFF_FIXTURES.map((item) => item.status)).toEqual(expect.arrayContaining(["ready_for_review", "approval_required", "blocked", "unsupported"]));
    expect(LUCA_LINK_DRY_RUN_ADAPTER_APPROVAL_FIXTURE.status).toBe("approval_required");
    expect(LUCA_LINK_DRY_RUN_HANDOFF_FIXTURES.every((item) => item.source === "fixture" && item.sideEffectsPerformed === false)).toBe(true);
  });
});
