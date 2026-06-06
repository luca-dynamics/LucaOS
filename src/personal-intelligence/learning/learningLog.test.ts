import { describe, expect, it } from "vitest";
import { createLearningLog } from "./learningLog";

const entry = { eventId: "event-1", timestamp: "2026-06-06T12:00:00.000Z", inputSummary: "Create foundation",
  actionTaken: "Added passive contracts", skillUsed: "repository-edit", modelUsed: "local", outcome: "success" as const,
  verificationStatus: "verified" as const, userFeedback: "Approved", nextAdjustment: "Wire after runtime QA" };

describe("learning log", () => {
  it("appends and lists immutable copies", () => {
    const log = createLearningLog();
    log.append(entry);
    const listed = log.list();
    expect(listed).toEqual([entry]);
    listed[0].actionTaken = "mutated";
    expect(log.list()[0].actionTaken).toBe("Added passive contracts");
  });

  it("rejects duplicate event ids", () => {
    const log = createLearningLog([entry]);
    expect(() => log.append(entry)).toThrow("already exists");
  });
});
