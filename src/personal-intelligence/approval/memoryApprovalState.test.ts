import { describe, expect, it } from "vitest";
import {
  createDefaultMemoryApprovalPilotState,
  summarizeMemoryApprovalPilotState,
} from "./index";

describe("memory approval pilot state", () => {
  it("defaults to disabled, dry-run-first, explicit approval required", () => {
    const state = createDefaultMemoryApprovalPilotState({
      now: () => new Date("2026-06-07T12:00:00.000Z"),
    });

    expect(state).toMatchObject({
      pilotEnabled: false,
      liveWriteEnabled: false,
      dryRunFirstRequired: true,
      explicitUserApprovalRequired: true,
      approvalConfirmed: false,
      confirmationPhrase: "",
      updatedAt: "2026-06-07T12:00:00.000Z",
    });
    expect(state.blockers).toContain("Controlled live-write pilot is disabled.");
    expect(summarizeMemoryApprovalPilotState(state).readyForLiveWrite).toBe(false);
  });
});
