import { describe, expect, it, vi } from "vitest";
import { ComputerUseMissionRunner } from "./ComputerUseMissionRunner";

describe("ComputerUseMissionRunner",()=>{
  it("runs one computer_use step",async()=>{ const r=new ComputerUseMissionRunner({runtimeEntrypoint:{runComputerUseStep:vi.fn().mockResolvedValue({stepResult:{status:"completed",reason:"ok"}}),reset:vi.fn()}} as any); const x=await r.runSteps([{missionId:"m1",stepId:"s1",kind:"computer_use"} as any]); expect(x.summary.completed).toBe(1);});
  it("runs multiple computer_use steps in order",async()=>{ const r=new ComputerUseMissionRunner({runtimeEntrypoint:{runComputerUseStep:vi.fn().mockResolvedValue({stepResult:{status:"completed",reason:"ok"}}),reset:vi.fn()}} as any); const x=await r.runSteps([{missionId:"m1",stepId:"s1",kind:"computer_use"},{missionId:"m1",stepId:"s2",kind:"computer_use"}] as any); expect(x.results.map(v=>v.stepId)).toEqual(["s1","s2"]);});
  it("non-computer step is skipped/failed safely",async()=>{ const r=new ComputerUseMissionRunner({runtimeEntrypoint:{runComputerUseStep:vi.fn(),reset:vi.fn()}} as any); const x=await r.runSteps([{missionId:"m1",stepId:"s1",kind:"not"}] as any); expect(x.results[0].status).toBe("failed");});
  it("summary counts completed/failed/inconclusive",()=>{ const r=new ComputerUseMissionRunner({runtimeEntrypoint:{runComputerUseStep:vi.fn(),reset:vi.fn()}} as any); const s=r.createRunSummary([{status:"completed"},{status:"failed"},{status:"inconclusive"}] as any); expect(s).toEqual({total:3,completed:1,failed:1,inconclusive:1});});
  it("metadata systemApisCalled false",async()=>{ const r=new ComputerUseMissionRunner({runtimeEntrypoint:{runComputerUseStep:vi.fn().mockResolvedValue({stepResult:{status:"completed",reason:"ok"}}),reset:vi.fn()}} as any); const x=await r.runSteps([{missionId:"m1",stepId:"s1",kind:"computer_use"}] as any); expect(x.metadata.systemApisCalled).toBe(false);});
});
