import { describe, expect, it, vi } from "vitest";
import { ensureComputerUseMissionControl } from "./computerUseMissionControl";

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
});
