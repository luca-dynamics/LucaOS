import { describe, expect, it, vi } from "vitest";
import { ComputerUseRuntimeEntrypoint } from "./ComputerUseRuntimeEntrypoint";

describe("ComputerUseRuntimeEntrypoint",()=>{
  it("runs mission step input through adapter",async()=>{ const executeStep=vi.fn().mockResolvedValue({status:"completed"}); const e=new ComputerUseRuntimeEntrypoint({missionStepAdapter:{executeStep,reset:vi.fn()},pipeline:{run:vi.fn(),reset:vi.fn()}} as any); await e.runComputerUseStep({missionId:"m1",stepId:"s1",kind:"computer_use"}); expect(executeStep).toHaveBeenCalled();});
  it("runs raw pipeline input through pipeline",async()=>{ const run=vi.fn().mockResolvedValue({missionId:"m1"}); const e=new ComputerUseRuntimeEntrypoint({missionStepAdapter:{executeStep:vi.fn(),reset:vi.fn()},pipeline:{run,reset:vi.fn()}} as any); await e.runPipelineInput({pipelineInput:{missionId:"m1"}}); expect(run).toHaveBeenCalled();});
  it("invalid input fails safely",async()=>{ const e=new ComputerUseRuntimeEntrypoint({missionStepAdapter:{executeStep:vi.fn(),reset:vi.fn()},pipeline:{run:vi.fn(),reset:vi.fn()}} as any); const r=await e.runPipelineInput({}); expect(r.ok).toBe(false);});
  it("metadata systemApisCalled false",async()=>{ const e=new ComputerUseRuntimeEntrypoint({missionStepAdapter:{executeStep:vi.fn().mockResolvedValue({status:"completed"}),reset:vi.fn()},pipeline:{run:vi.fn(),reset:vi.fn()}} as any); const r=await e.runComputerUseStep({missionId:"m1",stepId:"s1",kind:"computer_use"}); expect(r.metadata.systemApisCalled).toBe(false);});
});
