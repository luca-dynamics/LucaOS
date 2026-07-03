import { describe, expect, it } from "vitest";
import { buildSessionsRailRows } from "./sessionsRailModel";
import type { AgentSessionContinuityRecord } from "../../types/agentSessionContinuity";

const record = (
  overrides: Partial<AgentSessionContinuityRecord>,
): AgentSessionContinuityRecord => ({
  sessionId: "s1",
  title: "Session",
  mode: "chat",
  lifecycleState: "active",
  lastUserIntentSummary: "",
  lastAgentStateSummary: "",
  pendingActions: [],
  pendingApprovalIds: [],
  relatedMemoryIds: [],
  relatedSkillIds: [],
  relatedJobIds: [],
  provenanceIds: [],
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  userVisible: true,
  safeToResume: true,
  ...overrides,
});

describe("buildSessionsRailRows", () => {
  it("maps pending approvals to the needs-you tone above all else", () => {
    const rows = buildSessionsRailRows([
      record({ sessionId: "a", pendingApprovalIds: ["x"], lifecycleState: "active" }),
    ]);
    expect(rows[0]).toMatchObject({ tone: "warn", sub: "needs you" });
  });

  it("marks active sessions ok, auto when actions are pending", () => {
    const rows = buildSessionsRailRows([
      record({ sessionId: "a", pendingActions: ["step"] }),
      record({ sessionId: "b", updatedAt: "2026-06-30T00:00:00.000Z" }),
    ]);
    expect(rows[0]).toMatchObject({ tone: "ok", sub: "auto" });
    expect(rows[1]).toMatchObject({ tone: "ok", sub: "active" });
  });

  it("hides invisible and finished sessions, caps rows, sorts by recency", () => {
    const records = [
      record({ sessionId: "hidden", userVisible: false }),
      record({ sessionId: "done", lifecycleState: "completed" }),
      ...Array.from({ length: 8 }, (_, i) =>
        record({
          sessionId: `s${i}`,
          lifecycleState: "paused",
          updatedAt: `2026-07-0${(i % 7) + 1}T00:00:00.000Z`,
        }),
      ),
    ];
    const rows = buildSessionsRailRows(records);
    expect(rows).toHaveLength(6);
    expect(rows.map((r) => r.sessionId)).not.toContain("hidden");
    expect(rows.map((r) => r.sessionId)).not.toContain("done");
    expect(rows[0].tone).toBe("idle");
    expect(rows[0].sub).toBe("paused");
  });
});
