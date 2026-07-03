import { describe, expect, it } from "vitest";
import { buildAwayStrip } from "./awayStripModel";
import type { RuntimeInboxEvent } from "../../types/runtimeInbox";

const event = (overrides: Partial<RuntimeInboxEvent>): RuntimeInboxEvent => ({
  inboxEventId: "e1",
  source: "system",
  sourceTrustLevel: "system" as RuntimeInboxEvent["sourceTrustLevel"],
  title: "Filed 3 receipts",
  body: "",
  eventType: "info",
  createdAt: "2026-07-03T10:00:00.000Z",
  provenance: {} as RuntimeInboxEvent["provenance"],
  requiresApproval: false,
  metadata: {},
  ...overrides,
});

describe("buildAwayStrip", () => {
  it("stays silent on first visit (no lastSeen)", () => {
    expect(buildAwayStrip([event({})], null).rows).toHaveLength(0);
  });

  it("selects only unread, unarchived, non-user events newer than lastSeen", () => {
    const model = buildAwayStrip(
      [
        event({ inboxEventId: "new" }),
        event({ inboxEventId: "old", createdAt: "2026-07-02T00:00:00.000Z" }),
        event({ inboxEventId: "read", readAt: "2026-07-03T10:01:00.000Z" }),
        event({ inboxEventId: "archived", archivedAt: "2026-07-03T10:01:00.000Z" }),
        event({ inboxEventId: "mine", source: "user" }),
      ],
      "2026-07-02T12:00:00.000Z",
    );
    expect(model.allEventIds).toEqual(["new"]);
    expect(model.rows[0]).toMatchObject({ title: "Filed 3 receipts", source: "system" });
  });

  it("caps visible rows at 3, newest first, and counts overflow", () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      event({
        inboxEventId: `e${i}`,
        createdAt: `2026-07-03T1${i}:00:00.000Z`,
      }),
    );
    const model = buildAwayStrip(events, "2026-07-01T00:00:00.000Z");
    expect(model.rows).toHaveLength(3);
    expect(model.rows[0].inboxEventId).toBe("e4");
    expect(model.overflowCount).toBe(2);
    expect(model.allEventIds).toHaveLength(5);
  });
});
