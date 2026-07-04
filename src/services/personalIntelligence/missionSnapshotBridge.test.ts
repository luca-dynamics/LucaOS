import { describe, expect, it } from "vitest";
import type { MissionSnapshot } from "../agent/MissionControlService";
import { buildMissionContextSnapshotFromLive } from "./missionSnapshotBridge";

const fixedNow = () => new Date("2026-07-04T12:00:00.000Z");

function snapshot(overrides: Partial<MissionSnapshot> = {}): MissionSnapshot {
  return {
    mission: {
      id: 7,
      title: "Ship the release",
      status: "ACTIVE",
      created_at: 1_700_000_000_000,
      updated_at: 1_700_000_100_000,
    },
    goals: [
      { id: 1, mission_id: 7, description: "Draft the notes", status: "IN_PROGRESS" },
      { id: 2, mission_id: 7, description: "Tag the build", status: "PENDING" },
    ],
    ...overrides,
  };
}

describe("buildMissionContextSnapshotFromLive", () => {
  it("carries the live title and goals into the PI snapshot", () => {
    const result = buildMissionContextSnapshotFromLive(snapshot(), fixedNow);
    expect(result.title).toBe("Ship the release");
    expect(result.missionId).toBe("7");
    expect(result.goals).toEqual(["Draft the notes", "Tag the build"]);
  });

  it("derives success criteria from goals so the snapshot is not blocked", () => {
    const result = buildMissionContextSnapshotFromLive(snapshot(), fixedNow);
    expect(result.successCriteria).toEqual([
      "Complete: Draft the notes",
      "Complete: Tag the build",
    ]);
    expect(result.blockers).toEqual([]);
  });

  it("surfaces each goal's live status as an operating assumption", () => {
    const result = buildMissionContextSnapshotFromLive(snapshot(), fixedNow);
    expect(result.operatingAssumptions).toContain(
      'Goal "Draft the notes" is in progress.',
    );
    expect(result.operatingAssumptions).toContain(
      'Goal "Tag the build" is pending.',
    );
  });

  it("flags the missing constraints for user review (honest, not invented)", () => {
    const result = buildMissionContextSnapshotFromLive(snapshot(), fixedNow);
    expect(result.constraints).toEqual([]);
    expect(result.warnings.join(" ")).toContain("no explicit constraints");
  });

  it("blocks unsafe live content through PI's own sanitizer", () => {
    const result = buildMissionContextSnapshotFromLive(
      snapshot({
        goals: [
          { id: 1, mission_id: 7, description: "Store the api_key=sk-abcdef0123456789", status: "PENDING" },
        ],
      }),
      fixedNow,
    );
    expect(result.goals[0]).toBe("[BLOCKED UNSAFE MISSION CONTENT]");
  });

  it("maps live status onto the PI mission status vocabulary via the snapshot mode", () => {
    // Snapshot is always advisory-bounded regardless of the live status.
    const result = buildMissionContextSnapshotFromLive(
      snapshot({ mission: { id: 1, title: "Done", status: "COMPLETED", created_at: 1, updated_at: 2 }, goals: [{ id: 1, mission_id: 1, description: "g", status: "COMPLETED" }] }),
      fixedNow,
    );
    expect(result.mode).toBe("advisory");
    expect(result.title).toBe("Done");
  });
});
