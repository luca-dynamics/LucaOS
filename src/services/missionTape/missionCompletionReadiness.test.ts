import { describe, expect, it } from "vitest";
import {
  assessMissionCompletionReadiness,
  formatGateSnapshotLines,
} from "./missionCompletionReadiness";
import type { LucaExecutionVerificationGateSnapshot } from "../execution/LucaExecutionVerificationGate";

describe("assessMissionCompletionReadiness", () => {
  it("blocks when no goals", () => {
    const r = assessMissionCompletionReadiness({ goals: [] });
    expect(r.likelyCompletable).toBe(false);
    expect(r.goalsReady).toBe(false);
    expect(r.blockers.some((b) => /No goals/i.test(b))).toBe(true);
  });

  it("ready when all goals COMPLETED", () => {
    const r = assessMissionCompletionReadiness({
      goals: [
        { status: "COMPLETED", description: "a" },
        { status: "COMPLETED", description: "b" },
      ],
    });
    expect(r.goalsReady).toBe(true);
    expect(r.likelyCompletable).toBe(true);
    expect(r.goalsCompleted).toBe(2);
    expect(r.blockers).toEqual([]);
  });

  it("lists pending and failed blockers", () => {
    const r = assessMissionCompletionReadiness({
      goals: [
        { status: "PENDING", description: "a" },
        { status: "IN_PROGRESS", description: "b" },
        { status: "FAILED", description: "c" },
      ],
    });
    expect(r.likelyCompletable).toBe(false);
    expect(r.goalsPending).toBe(1);
    expect(r.goalsInProgress).toBe(1);
    expect(r.goalsFailed).toBe(1);
    expect(r.blockers.length).toBeGreaterThanOrEqual(2);
  });

  it("summarizes tape evidence", () => {
    const r = assessMissionCompletionReadiness({
      goals: [{ status: "COMPLETED", description: "done" }],
      tape: {
        missionId: "1",
        intent: "test",
        status: "running",
        steps: [{ stepId: "s1", goal: "g", status: "verified" }],
        verification: [
          { stepId: "s1", passed: true, details: "ok" },
          { stepId: "s2", passed: false, details: "no" },
        ],
        guard: [],
        recovery: [],
        createdAt: "",
        updatedAt: "",
      } as any,
    });
    expect(r.hasTape).toBe(true);
    expect(r.tapeSteps).toBe(1);
    expect(r.tapeVerificationsPassed).toBe(1);
    expect(r.tapeVerificationsFailed).toBe(1);
    expect(r.blockers.some((b) => /verification row/i.test(b))).toBe(true);
  });
});

describe("formatGateSnapshotLines", () => {
  it("surfaces blocked gates first", () => {
    const snapshot = {
      results: [
        { gate: "receipt", ok: true, status: "passed", severity: "low" },
        {
          gate: "rollback",
          ok: false,
          status: "blocked",
          severity: "medium",
          reason: "No rollback plan",
        },
      ],
      summary: {
        ok: false,
        status: "blocked",
        blocked: true,
        warnings: 0,
        failures: 1,
        requiresUserConfirmation: false,
        requiresOriginReview: false,
        promotionAllowed: false,
        liveExecutionAllowed: false,
        runtimeBehaviorChanged: false,
      },
      runtimeBehaviorChanged: false,
      promotionAllowed: false,
      liveExecutionAllowed: false,
      persistenceEnabled: false,
      networkCallsEnabled: false,
    } as LucaExecutionVerificationGateSnapshot;

    const lines = formatGateSnapshotLines(snapshot);
    expect(lines[0]).toMatch(/rollback/);
    expect(lines[0]).toMatch(/No rollback plan/);
  });
});
