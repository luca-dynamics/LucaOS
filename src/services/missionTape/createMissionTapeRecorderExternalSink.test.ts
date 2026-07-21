import { describe, expect, it } from "vitest";
import { createMissionTapeRecorderExternalSink } from "./createMissionTapeRecorderExternalSink";

describe("createMissionTapeRecorderExternalSink", () => {
  it("creates tape and appends step records", async () => {
    const sink = createMissionTapeRecorderExternalSink();
    const result = await sink.record({
      missionId: "m-tape-1",
      timestamp: "2026-07-21T00:00:00.000Z",
      eventType: "computer_use_dispatch_completed",
      payload: { reason: "ok", requestId: "req-1" },
      metadata: {
        tapeSinkKind: "scaffold",
        eventBridgeKind: "scaffold",
        storageWritesEnabled: false,
        missionTapeImported: false,
        systemApisCalled: false,
      },
    });

    expect(result.ok).toBe(true);
    const tape = await sink.recorder.getTape("m-tape-1");
    expect(tape?.steps.length).toBe(1);
    expect(tape?.steps[0].goal).toBe("computer_use_dispatch_completed");
  });

  it("appends guard decisions for guard events", async () => {
    const sink = createMissionTapeRecorderExternalSink();
    await sink.record({
      missionId: "m-guard-1",
      timestamp: "2026-07-21T00:00:00.000Z",
      eventType: "computer_use_guard_allowed",
      payload: { status: "allowed", reason: "ok" },
      metadata: {
        tapeSinkKind: "scaffold",
        eventBridgeKind: "scaffold",
        storageWritesEnabled: false,
        missionTapeImported: false,
        systemApisCalled: false,
      },
    });

    const tape = await sink.recorder.getTape("m-guard-1");
    expect(tape?.guard.length).toBe(1);
    expect(tape?.guard[0].allowed).toBe(true);
  });

  it("completeMission uses verification gate", async () => {
    const sink = createMissionTapeRecorderExternalSink();
    await sink.record({
      missionId: "m-complete-1",
      timestamp: "2026-07-21T00:00:00.000Z",
      eventType: "computer_use_step_executed",
      payload: { stepId: "s1", reason: "ok" },
      metadata: {
        tapeSinkKind: "scaffold",
        eventBridgeKind: "scaffold",
        storageWritesEnabled: false,
        missionTapeImported: false,
        systemApisCalled: false,
      },
    });

    const completion = await sink.completeMission("m-complete-1", {
      success: true,
    });
    // Low-risk inferred plan or blocked — either way completeMission is wired.
    expect(completion.tape.verification.some((v) =>
      v.stepId.includes("mission-completion"),
    )).toBe(true);
  });

  it("auto-finalizes on mission_failed terminal event", async () => {
    const sink = createMissionTapeRecorderExternalSink();
    await sink.record({
      missionId: "m-term-fail",
      timestamp: "2026-07-21T00:00:00.000Z",
      eventType: "mission_failed",
      payload: { reason: "boom" },
      metadata: {
        tapeSinkKind: "scaffold",
        eventBridgeKind: "scaffold",
        storageWritesEnabled: false,
        missionTapeImported: false,
        systemApisCalled: false,
      },
    });
    const tape = await sink.recorder.getTape("m-term-fail");
    expect(tape?.status).toBe("failed");
  });
});

