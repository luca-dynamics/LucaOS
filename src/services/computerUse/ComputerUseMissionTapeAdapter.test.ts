import { describe, expect, it } from "vitest";
import { ComputerUseMissionTapeAdapter } from "./ComputerUseMissionTapeAdapter";

const redactedEvent:any={ missionId:"m1", timestamp:"t", eventType:"action_plan", payload:{ actions:[{type:"type_text", text:"[REDACTED]"}]}};

describe("ComputerUseMissionTapeAdapter",()=>{
  it("converts action_plan event to step record",()=>{ const a=new ComputerUseMissionTapeAdapter(); expect(a.toMissionTapeStepRecord(redactedEvent).eventType).toBe("action_plan");});
  it("converts verification_result event to verification record",()=>{ const a=new ComputerUseMissionTapeAdapter(); expect(a.toMissionTapeVerificationRecord({...redactedEvent,eventType:"verification_result"}).eventType).toBe("verification_result");});
  it("converts recovery_plan event to recovery record",()=>{ const a=new ComputerUseMissionTapeAdapter(); expect(a.toMissionTapeRecoveryRecord({...redactedEvent,eventType:"recovery_plan"}).eventType).toBe("recovery_plan");});
  it("preserves redacted type_text payload",()=>{ const a=new ComputerUseMissionTapeAdapter(); const r=a.toMissionTapeStepRecord(redactedEvent); expect((r.payload as any).actions[0].text).toBe("[REDACTED]");});
  it("snapshot includes all converted records",()=>{ const a=new ComputerUseMissionTapeAdapter(); a.toMissionTapeStepRecord(redactedEvent); a.toMissionTapeVerificationRecord({...redactedEvent,eventType:"verification_result"}); a.toMissionTapeRecoveryRecord({...redactedEvent,eventType:"recovery_plan"}); const s=a.createMissionTapeSnapshot("m1"); expect(s.stepRecords).toHaveLength(1); expect(s.verificationRecords).toHaveLength(1); expect(s.recoveryRecords).toHaveLength(1);});
  it("metadata missionTapeImported false",()=>{ const a=new ComputerUseMissionTapeAdapter(); const r=a.toMissionTapeStepRecord(redactedEvent); expect(r.metadata.missionTapeImported).toBe(false);});
});
