import { describe, expect, it } from "vitest";
import {
  SESSIONS_RAIL_MAX_ROWS,
  buildSessionsRailRows,
  buildThreadRailRows,
  bucketSessionRow,
  type ThreadRailThread,
} from "./sessionsRailModel";
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

  it("carries updatedAt through for bucketing", () => {
    const rows = buildSessionsRailRows([
      record({ sessionId: "a", updatedAt: "2026-07-04T09:00:00.000Z" }),
    ]);
    expect(rows[0].updatedAt).toBe("2026-07-04T09:00:00.000Z");
  });
});

describe("bucketSessionRow", () => {
  // Local noon as the reference "now" keeps every offset below on the correct
  // side of local midnight regardless of the runner's timezone (the function
  // buckets by the user's LOCAL day, so the test must reason in local time).
  const now = new Date(2026, 6, 4, 12, 0, 0).getTime();
  const iso = (ms: number) => new Date(now + ms).toISOString();
  const HOUR = 60 * 60 * 1000;

  it("buckets earlier-the-same-day updates as today", () => {
    expect(bucketSessionRow(iso(-3 * HOUR), now)).toBe("today");
  });

  it("buckets updates from the day before as earlier", () => {
    expect(bucketSessionRow(iso(-25 * HOUR), now)).toBe("earlier");
  });

  it("treats an unparseable timestamp as earlier", () => {
    expect(bucketSessionRow("not-a-date", now)).toBe("earlier");
  });
});

describe("buildThreadRailRows", () => {
  // Local noon, for the same reason bucketSessionRow's block uses it: the
  // buckets are the user's LOCAL day, so the offsets below must be reasoned in
  // local time or they land on the wrong side of midnight in some timezones.
  const now = new Date(2026, 6, 4, 12, 0, 0).getTime();
  const iso = (ms: number) => new Date(now + ms).toISOString();
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  const thread = (
    overrides: Partial<ThreadRailThread> & { id: string },
  ): ThreadRailThread => ({
    title: "A conversation",
    updatedAt: iso(-HOUR),
    messages: ["hello"],
    ...overrides,
  });

  it("buckets by local day, newest first", () => {
    const rows = buildThreadRailRows(
      [
        thread({ id: "old", title: "Trip planning", updatedAt: iso(-3 * DAY) }),
        thread({ id: "new", title: "Q3 update", updatedAt: iso(-2 * HOUR) }),
      ],
      undefined,
      now,
    );
    expect(rows.map((row) => [row.id, row.bucket])).toEqual([
      ["new", "today"],
      ["old", "earlier"],
    ]);
  });

  it("marks exactly one row active, and only when it is in the list", () => {
    const rows = buildThreadRailRows(
      [thread({ id: "a" }), thread({ id: "b" })],
      "b",
      now,
    );
    expect(rows.filter((row) => row.active).map((row) => row.id)).toEqual(["b"]);
  });

  it("hides empty threads, because three presses of New chat are not three conversations", () => {
    const rows = buildThreadRailRows(
      [
        thread({ id: "typed", messages: ["hi"] }),
        thread({ id: "blank-1", messages: [] }),
        thread({ id: "blank-2", messages: [] }),
      ],
      undefined,
      now,
    );
    expect(rows.map((row) => row.id)).toEqual(["typed"]);
  });

  it("keeps the empty thread you are actually in — the rail must show where you are", () => {
    const rows = buildThreadRailRows(
      [thread({ id: "typed", messages: ["hi"] }), thread({ id: "fresh", messages: [] })],
      "fresh",
      now,
    );
    expect(rows.map((row) => row.id)).toContain("fresh");
  });

  it("caps at the same row budget the agent rail uses", () => {
    const many = Array.from({ length: SESSIONS_RAIL_MAX_ROWS + 4 }, (_, i) =>
      thread({ id: `t${i}`, updatedAt: iso(-i * HOUR) }),
    );
    expect(buildThreadRailRows(many, undefined, now)).toHaveLength(
      SESSIONS_RAIL_MAX_ROWS,
    );
  });

  it("says a time for today, a weekday this week, and a date beyond it", () => {
    const [today, thisWeek, older] = buildThreadRailRows(
      [
        thread({ id: "a", updatedAt: iso(-2 * HOUR) }),
        thread({ id: "b", updatedAt: iso(-3 * DAY) }),
        thread({ id: "c", updatedAt: iso(-40 * DAY) }),
      ],
      undefined,
      now,
    );
    // Locale formatting varies by runner, so assert the SHAPE, not the string:
    // a clock time contains a colon; a weekday and a short date do not.
    expect(today.when).toMatch(/\d/);
    expect(today.when).toContain(":");
    expect(thisWeek.when).not.toContain(":");
    expect(thisWeek.when).not.toBe("");
    expect(older.when).not.toContain(":");
    expect(older.when).not.toBe(thisWeek.when);
  });

  it("does not crash on an unparseable timestamp", () => {
    const rows = buildThreadRailRows(
      [thread({ id: "a", updatedAt: "not-a-date" })],
      "a",
      now,
    );
    expect(rows).toEqual([
      { id: "a", title: "A conversation", when: "", bucket: "earlier", active: true },
    ]);
  });
});
