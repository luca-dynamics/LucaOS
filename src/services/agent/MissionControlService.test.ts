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

describe("MissionControlService.completeMissionWithVerification", () => {
  afterEach(() => {
    delete (window as unknown as { luca?: unknown }).luca;
    vi.restoreAllMocks();
  });

  function bridgeWithGoals(
    missionId: number,
    goals: Array<{ id: number; description: string; status: string }>,
  ) {
    const archive = vi.fn().mockResolvedValue(undefined);
    (window as unknown as { luca: unknown }).luca = {
      missionControl: {
        getActive: vi.fn().mockResolvedValue({
          mission: {
            id: missionId,
            title: "Ship the onboarding revamp",
            status: "ACTIVE",
            created_at: 1,
            updated_at: 2,
          },
          goals: goals.map((g) => ({ ...g, mission_id: missionId })),
        }),
        archive,
      },
    };
    return archive;
  }

  it("completes and archives a workforce mission whose tasks all finished", async () => {
    const archive = bridgeWithGoals(101, [
      { id: 1, description: "[ENGINEER] implement module", status: "COMPLETED" },
      { id: 2, description: "[AUDITOR] review code", status: "COMPLETED" },
    ]);

    const result =
      await missionControlService.completeMissionWithVerification(101);

    expect(result.blockedByVerification).toBe(false);
    expect(result.completed).toBe(true);
    expect(archive).toHaveBeenCalledWith(101);
  });

  it("blocks and does not archive while workforce tasks are unfinished", async () => {
    const archive = bridgeWithGoals(102, [
      { id: 1, description: "[ENGINEER] implement module", status: "COMPLETED" },
      { id: 2, description: "[AUDITOR] review code", status: "IN_PROGRESS" },
    ]);

    const result =
      await missionControlService.completeMissionWithVerification(102);

    expect(result.completed).toBe(false);
    expect(result.blockedByVerification).toBe(true);
    expect(result.reason).toContain("1/2 goals completed");
    expect(archive).not.toHaveBeenCalled();
  });
});
