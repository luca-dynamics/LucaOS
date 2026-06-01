import { describe, expect, it } from "vitest";
import {
  getMultiAgentOrchestrationAuditMap,
  multiAgentOrchestrationAuditMap,
} from "./multiAgentOrchestrationMap";

describe("multiAgentOrchestrationMap", () => {
  it("represents current LucaOS planning, checkpoint, continuity, governance, and legacy workforce primitives", () => {
    const ids = multiAgentOrchestrationAuditMap.currentPrimitives.map((entry) => entry.id);

    expect(ids).toContain("runtime-plan-service");
    expect(ids).toContain("runtime-orchestration-service");
    expect(ids).toContain("agent-planning-checkpoints");
    expect(ids).toContain("agent-session-continuity");
    expect(ids).toContain("continuity-loop");
    expect(ids).toContain("governed-tool-execution");
    expect(ids).toContain("skill-governance");
    expect(ids).toContain("single-agent-service");
    expect(ids).toContain("luca-workforce-legacy");
  });

  it("explicitly marks missing true multi-agent primitives", () => {
    const missing = multiAgentOrchestrationAuditMap.missingMultiAgentPrimitives;
    const missingIds = missing.map((entry) => entry.id);

    expect(multiAgentOrchestrationAuditMap.trueMultiAgentOrchestrationExists).toBe(false);
    expect(missing.every((entry) => entry.present === false)).toBe(true);
    expect(missingIds).toEqual(
      expect.arrayContaining([
        "agent-role-registry",
        "agent-session-records",
        "task-graph",
        "parallel-agent-workers",
        "supervisor-output-merge-review",
        "inter-agent-communication",
        "per-agent-permissions",
      ]),
    );

    const labels = missing.flatMap((entry) => entry.labels);
    expect(labels).toContain("needs-agent-role-registry");
    expect(labels).toContain("needs-agent-session-records");
    expect(labels).toContain("needs-task-graph");
    expect(labels).toContain("needs-output-merge-review");
    expect(labels).toContain("needs-per-agent-permissions");
    expect(labels).toContain("needs-memory-boundaries");
    expect(labels).toContain("needs-tool-boundaries");
  });

  it("represents the safe future roadmap without implementing it", () => {
    const phaseIds = multiAgentOrchestrationAuditMap.roadmap.map((phase) => phase.id);

    expect(phaseIds).toEqual([
      "phase-1-role-registry",
      "phase-2-session-records",
      "phase-3-task-graph",
      "phase-4-supervisor-review",
      "phase-5-boundaries",
      "phase-6-governed-parallel-execution",
    ]);
    expect(multiAgentOrchestrationAuditMap.roadmap.at(-1)?.status).toBe("blocked-until-governance");
    expect(multiAgentOrchestrationAuditMap.roadmap.at(-1)?.explicitNonGoals.join(" ")).toMatch(/Do not enable legacy LucaWorkforce parallelism as-is/);
  });

  it("adds no execution, spawn, worker-start, or parallel execution methods", () => {
    const auditMap = getMultiAgentOrchestrationAuditMap();

    expect(auditMap.auditOnly).toBe(true);
    expect(auditMap.executionAddedByThisMap).toBe(false);
    expect(auditMap.spawnMethodsAddedByThisMap).toBe(false);
    expect(auditMap.parallelExecutionAddedByThisMap).toBe(false);

    const functionEntries = Object.entries(auditMap).filter(([, value]) => typeof value === "function");
    expect(functionEntries).toEqual([]);

    const exportedHelper = getMultiAgentOrchestrationAuditMap.name.toLowerCase();
    expect(exportedHelper).not.toMatch(/spawn|execute|dispatch|startworker|runworker/);
  });

  it("answers all requested audit questions", () => {
    expect(multiAgentOrchestrationAuditMap.auditAnswers).toHaveLength(10);
    const answers = multiAgentOrchestrationAuditMap.auditAnswers.map((item) => item.answer).join(" ");

    expect(answers).toMatch(/does not currently have true governed multi-agent orchestration|No\./i);
    expect(answers).toMatch(/RuntimePlanService/);
    expect(answers).toMatch(/single-agent\/planning-only/i);
    expect(answers).toMatch(/no durable per-worker agent session records/i);
    expect(answers).toMatch(/Promise\.allSettled/);
    expect(answers).toMatch(/no per-agent memory namespace/i);
    expect(answers).toMatch(/No dedicated supervisor merge\/review step/i);
  });
});
