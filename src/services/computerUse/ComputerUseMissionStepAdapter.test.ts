import { describe, expect, it, vi } from "vitest";
import { ComputerUseMissionEngineBridge } from "./ComputerUseMissionEngineBridge";
import { ComputerUseMissionStepAdapter } from "./ComputerUseMissionStepAdapter";

const pipelineResult:any={ missionId:"m1", executionResults:[{status:"denied",action:{type:"click"}}], verificationResults:[{status:"failed"}] };

describe("ComputerUseMissionStepAdapter",()=>{
  it("can handle computer_use step",()=>{const a=new ComputerUseMissionStepAdapter({pipeline:{run:vi.fn(),reset:vi.fn()},missionEngineBridge:new ComputerUseMissionEngineBridge()}); expect(a.canHandleStep({kind:"computer_use"})).toBe(true);});
  it("rejects other kind",()=>{const a=new ComputerUseMissionStepAdapter({pipeline:{run:vi.fn(),reset:vi.fn()},missionEngineBridge:new ComputerUseMissionEngineBridge()}); expect(a.canHandleStep({kind:"x"})).toBe(false);});
  it("executes injected pipeline",async()=>{const run=vi.fn().mockResolvedValue({ ...pipelineResult, executionResults:[{status:"executed",action:{type:"click"}}], verificationResults:[{status:"passed"}]}); const a=new ComputerUseMissionStepAdapter({pipeline:{run,reset:vi.fn()},missionEngineBridge:new ComputerUseMissionEngineBridge()}); await a.executeStep({missionId:"m1",stepId:"s1",kind:"computer_use"}); expect(run).toHaveBeenCalled();});
  it("denied pipeline result becomes failed step result",async()=>{const a=new ComputerUseMissionStepAdapter({pipeline:{run:vi.fn().mockResolvedValue(pipelineResult),reset:vi.fn()},missionEngineBridge:new ComputerUseMissionEngineBridge()}); const r=await a.executeStep({missionId:"m1",stepId:"s1",kind:"computer_use"}); expect(r.status).toBe("failed");});
  it("metadata systemApisCalled false",async()=>{const a=new ComputerUseMissionStepAdapter({pipeline:{run:vi.fn().mockResolvedValue(pipelineResult),reset:vi.fn()},missionEngineBridge:new ComputerUseMissionEngineBridge()}); const r=await a.executeStep({missionId:"m1",stepId:"s1",kind:"computer_use"}); expect(r.metadata.systemApisCalled).toBe(false);});
});
