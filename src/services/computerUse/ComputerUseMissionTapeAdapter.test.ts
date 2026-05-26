import { describe, expect, it } from "vitest";
import { ComputerUseMissionTapeAdapter } from "./ComputerUseMissionTapeAdapter";
import { ComputerUseTapeEvent } from "./types";

const makeEvent = (eventType: ComputerUseTapeEvent["eventType"]): ComputerUseTapeEvent => ({
  missionId: "m1",
  timestamp: "2026-01-01T00:00:00.000Z",
  eventType,
  payload: { actions: [{ type: "type_text", text: "[REDACTED]" }] },
});

describe("ComputerUseMissionTapeAdapter", () => {
  it("converts action_plan event to step record", () => {
    const adapter = new ComputerUseMissionTapeAdapter();
    expect(adapter.toMissionTapeStepRecord(makeEvent("action_plan")).eventType).toBe("action_plan");
  });

  it("converts verification_result event to verification record", () => {
    const adapter = new ComputerUseMissionTapeAdapter();
    expect(adapter.toMissionTapeVerificationRecord(makeEvent("verification_result")).eventType).toBe("verification_result");
  });

  it("converts recovery_plan event to recovery record", () => {
    const adapter = new ComputerUseMissionTapeAdapter();
    expect(adapter.toMissionTapeRecoveryRecord(makeEvent("recovery_plan")).eventType).toBe("recovery_plan");
  });

  it("passing verification_result into toMissionTapeStepRecord throws", () => {
    const adapter = new ComputerUseMissionTapeAdapter();
    expect(() => adapter.toMissionTapeStepRecord(makeEvent("verification_result"))).toThrow("Expected action_plan event");
  });

  it("passing action_plan into toMissionTapeVerificationRecord throws", () => {
    const adapter = new ComputerUseMissionTapeAdapter();
    expect(() => adapter.toMissionTapeVerificationRecord(makeEvent("action_plan"))).toThrow("Expected verification_result event");
  });

  it("passing action_plan into toMissionTapeRecoveryRecord throws", () => {
    const adapter = new ComputerUseMissionTapeAdapter();
    expect(() => adapter.toMissionTapeRecoveryRecord(makeEvent("action_plan"))).toThrow("Expected recovery_plan event");
  });

  it("preserves redacted type_text payload", () => {
    const adapter = new ComputerUseMissionTapeAdapter();
    const record = adapter.toMissionTapeStepRecord(makeEvent("action_plan"));
    const payload = record.payload as { actions: Array<{ text: string }> };
    expect(payload.actions[0].text).toBe("[REDACTED]");
  });

  it("snapshot includes all converted records", () => {
    const adapter = new ComputerUseMissionTapeAdapter();
    adapter.toMissionTapeStepRecord(makeEvent("action_plan"));
    adapter.toMissionTapeVerificationRecord(makeEvent("verification_result"));
    adapter.toMissionTapeRecoveryRecord(makeEvent("recovery_plan"));

    const snapshot = adapter.createMissionTapeSnapshot("m1");
    expect(snapshot.stepRecords).toHaveLength(1);
    expect(snapshot.verificationRecords).toHaveLength(1);
    expect(snapshot.recoveryRecords).toHaveLength(1);
  });

  it("metadata missionTapeImported false", () => {
    const adapter = new ComputerUseMissionTapeAdapter();
    const record = adapter.toMissionTapeStepRecord(makeEvent("action_plan"));
    expect(record.metadata.missionTapeImported).toBe(false);
  });
});
