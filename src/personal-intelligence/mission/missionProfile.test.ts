import { describe, expect, it } from "vitest";
import { createMissionProfile, validateMissionProfile } from "./missionProfile";

const now = () => new Date("2026-06-06T12:00:00.000Z");

describe("mission profile", () => {
  it("creates and validates a mission", () => {
    const mission = createMissionProfile({ missionId: "mission-1", title: "Ship foundation", description: "Build typed contracts",
      goals: ["Define contracts"], constraints: ["No runtime wiring"], successCriteria: ["Tests pass"],
      activeProjectRefs: ["luca-os"], operatingMode: "collaborative", priority: "high", status: "active" }, now);
    expect(validateMissionProfile(mission).valid).toBe(true);
    expect(mission.updatedAt).toBe("2026-06-06T12:00:00.000Z");
  });

  it("requires a goal", () => {
    expect(() => createMissionProfile({ missionId: "mission-1", title: "Title", description: "Description",
      goals: [], constraints: [], successCriteria: ["Done"], activeProjectRefs: [], operatingMode: "advisory",
      priority: "normal", status: "draft" }, now)).toThrow("at least one goal is required");
  });
});
