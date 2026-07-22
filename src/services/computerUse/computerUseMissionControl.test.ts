import { describe, expect, it, vi } from "vitest";
import {
  ensureComputerUseMissionControl,
  syncComputerUseStepGoalStatus,
} from "./computerUseMissionControl";

describe("ensureComputerUseMissionControl", () => {
  it("returns not linked when bridge missing", async () => {
    const result = await ensureComputerUseMissionControl("cu-1", {
      hasBridge: () => false,
    });
    expect(result.linked).toBe(false);
  });

  it("reuses active mission when numeric id matches", async () => {
    const result = await ensureComputerUseMissionControl("42", {
      hasBridge: () => true,
      getActiveMission: vi.fn(async () => ({
        mission: { id: 42, title: "Active", status: "ACTIVE", created_at: 0, updated_at: 0 },
        goals: [],
      })) as any,
      startMission: vi.fn(async () => 99) as any,
    });
    expect(result.linked).toBe(true);
    expect(result.missionControlId).toBe(42);
  });

  it("starts a new mission for string cu mission ids", async () => {
    const startMission = vi.fn(async () => 7);
    const result = await ensureComputerUseMissionControl("cu-run-9", {
      hasBridge: () => true,
      startMission: startMission as any,
      getActiveMission: vi.fn(async () => null) as any,
      intent: "computer-use:cu-run-9",
    });
    expect(result.linked).toBe(true);
    expect(result.missionControlId).toBe(7);
    expect(startMission).toHaveBeenCalledWith(
      "computer-use:cu-run-9",
      expect.objectContaining({
        source: "computer_use",
        computerUseMissionId: "cu-run-9",
      }),
    );
  });

  it("adds one goal per step when steps provided", async () => {
    let goalSeq = 10;
    const addGoal = vi.fn(async () => ++goalSeq);
    const result = await ensureComputerUseMissionControl("cu-a", {
      hasBridge: () => true,
      startMission: vi.fn(async () => 3) as any,
      getActiveMission: vi.fn(async () => null) as any,
      addGoal: addGoal as any,
      steps: [
        { stepId: "s1", description: "click button" },
        { stepId: "s2" },
      ],
    });
    expect(result.linked).toBe(true);
    expect(result.missionControlId).toBe(3);
    expect(result.stepGoalIds).toEqual({ s1: 11, s2: 12 });
    expect(addGoal).toHaveBeenCalledTimes(2);
    expect(addGoal).toHaveBeenNthCalledWith(1, 3, "click button");
    expect(addGoal).toHaveBeenNthCalledWith(2, 3, "computer_use:s2");
  });
});

describe("syncComputerUseStepGoalStatus", () => {
  it("maps completed/failed statuses", async () => {
    const updateGoalStatus = vi.fn(async () => undefined);
    const map = { s1: 55, s2: 56 };

    expect(
      await syncComputerUseStepGoalStatus(map, "s1", "completed", {
        updateGoalStatus: updateGoalStatus as any,
      }),
    ).toBe(true);
    expect(updateGoalStatus).toHaveBeenCalledWith(55, "COMPLETED");

    expect(
      await syncComputerUseStepGoalStatus(map, "s2", "failed", {
        updateGoalStatus: updateGoalStatus as any,
      }),
    ).toBe(true);
    expect(updateGoalStatus).toHaveBeenCalledWith(56, "FAILED");
  });

  it("returns false when step has no mapped goal", async () => {
    expect(await syncComputerUseStepGoalStatus({}, "missing", "completed")).toBe(
      false,
    );
  });
});
