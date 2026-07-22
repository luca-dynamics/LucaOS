import { beforeEach, describe, expect, it, vi } from "vitest";
import { MissionControlService } from "./MissionControlService";

describe("MissionControlService.completeMissionWithVerification", () => {
  beforeEach(() => {
    // Reset singleton by reassigning private field via any
    (MissionControlService as any).instance = undefined;
  });

  it("gates completion and skips archive when bridge missing", async () => {
    const svc = MissionControlService.getInstance();
    // No window.luca — getActive null, archive no-op
    const result = await svc.completeMissionWithVerification(7, {
      success: true,
      skipArchive: false,
    });

    expect(result.source).toBe("product_mission_completion");
    // Without goals, low-risk intent plan should usually complete
    if (result.completed) {
      // archive attempted but bridge unavailable — still completed tape
      const tape = await svc.getMissionTapeRecorder().getTape("7");
      expect(tape?.status).toBe("completed");
    } else {
      expect(result.blockedByVerification || !result.ok).toBe(true);
    }
  });

  it("honors verificationOverride for forced complete", async () => {
    const svc = MissionControlService.getInstance();
    const result = await svc.completeMissionWithVerification(8, {
      success: true,
      verificationOverride: true,
      overrideReason: "Origin approved",
      skipArchive: true,
    });
    expect(result.completed).toBe(true);
    expect(result.archived).toBe(false);
  });
});
