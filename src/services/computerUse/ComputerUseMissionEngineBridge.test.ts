import { describe, expect, it } from "vitest";
import { ComputerUseMissionEngineBridge } from "./ComputerUseMissionEngineBridge";
import { ComputerUsePipelineResult } from "./types";

const base = (status: "executed"|"failed"|"denied"|"skipped", verification: "passed"|"failed"|"inconclusive", actionType: "click"|"observe"="click"): ComputerUsePipelineResult => ({
  missionId: "m1", focusContext: {} as any, actionPlan: {} as any,
  executionResults: [{ status, action: { type: actionType, reason:"x", requiresGuardApproval:false }, metadata:{ delegatesOnly:true,noDirectSystemCalls:true,systemApisCalled:false,executorKind:"scaffold" } }],
  verificationResults: [{ status: verification, followUpObservationRequired:false, reason:"r", metadata:{ verifierKind:"scaffold", systemApisCalled:false, screenshotsCaptured:false } }],
  recoveryPlan: {} as any, metadata:{ pipelineKind:"scaffold", systemApisCalled:false }
});

describe("ComputerUseMissionEngineBridge",()=>{
  it("identifies computer_use step",()=>{ const b=new ComputerUseMissionEngineBridge(); expect(b.isComputerUseStep({kind:"computer_use"})).toBe(true);});
  it("rejects non-computer step",()=>{ const b=new ComputerUseMissionEngineBridge(); expect(b.isComputerUseStep({kind:"other"})).toBe(false);});
  it("failed execution maps to failed step result",()=>{ const b=new ComputerUseMissionEngineBridge(); expect(b.fromPipelineResult(base("failed","failed")).status).toBe("failed");});
  it("executed + passed verification maps to completed step result",()=>{ const b=new ComputerUseMissionEngineBridge(); expect(b.fromPipelineResult(base("executed","passed")).status).toBe("completed");});
  it("skipped observe + inconclusive maps to inconclusive",()=>{ const b=new ComputerUseMissionEngineBridge(); expect(b.fromPipelineResult(base("skipped","inconclusive","observe")).status).toBe("inconclusive");});
  it("metadata missionEngineImported false",()=>{ const b=new ComputerUseMissionEngineBridge(); const r=b.toMissionStepResult({missionStep:{missionId:"m1",stepId:"s1",kind:"computer_use"},pipelineResult:base("executed","passed")}); expect(r.metadata.missionEngineImported).toBe(false);});
});
