// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { missionControlService } from "./MissionControlService";

const validSnapshot = {
  mission: {
    id: 1,
    title: "Ship the release",
    status: "ACTIVE",
    created_at: 1,
    updated_at: 2,
  },
  goals: [
    { id: 1, mission_id: 1, description: "Draft notes", status: "PENDING" },
  ],
};

describe("MissionControlService.getActiveMission", () => {
  afterEach(() => {
    delete (window as unknown as { luca?: unknown }).luca;
    vi.restoreAllMocks();
  });

  it("returns null when the mission bridge is unavailable (e.g. web)", async () => {
    delete (window as unknown as { luca?: unknown }).luca;
    expect(await missionControlService.getActiveMission()).toBeNull();
  });

  it("returns the structured snapshot when the bridge yields a valid shape", async () => {
    (window as unknown as { luca: unknown }).luca = {
      missionControl: {
        getActive: vi.fn().mockResolvedValue(validSnapshot),
      },
    };
    expect(await missionControlService.getActiveMission()).toEqual(
      validSnapshot,
    );
  });

  it("returns null for a malformed bridge result", async () => {
    (window as unknown as { luca: unknown }).luca = {
      missionControl: {
        getActive: vi.fn().mockResolvedValue({ nope: true }),
      },
    };
    expect(await missionControlService.getActiveMission()).toBeNull();
  });

  it("returns null when the bridge throws", async () => {
    (window as unknown as { luca: unknown }).luca = {
      missionControl: {
        getActive: vi.fn().mockRejectedValue(new Error("ipc failed")),
      },
    };
    expect(await missionControlService.getActiveMission()).toBeNull();
  });
});
