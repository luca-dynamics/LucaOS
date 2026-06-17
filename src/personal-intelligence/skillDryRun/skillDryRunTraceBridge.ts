import type { PersonalIntelligenceRuntimeTrace, PersonalIntelligenceRuntimeTraceStage } from "../runtime";
import type { PersonalIntelligenceSkillDryRunSimulation } from "./skillDryRunTypes";

export interface SkillDryRunTraceContext {
  privacyZone?: PersonalIntelligenceRuntimeTrace["privacyZone"];
  relatedMissionId?: string;
  now?: () => Date;
}

export function createRuntimeTraceFromSkillDryRunSimulation(
  simulation: Omit<PersonalIntelligenceSkillDryRunSimulation, "runtimeTracePreview"> | PersonalIntelligenceSkillDryRunSimulation,
  context: SkillDryRunTraceContext = {},
): PersonalIntelligenceRuntimeTrace {
  const timestamp = (context.now ?? (() => new Date(simulation.createdAt)))().toISOString();
  const actBlocked = simulation.status === "blocked" || simulation.status === "disabled";
  const stages: PersonalIntelligenceRuntimeTraceStage[] = [
    { stage: "sense", status: "completed", summary: "Selected skill and sandbox plan observed as inert review inputs.", timestamp, sideEffectsPerformed: false },
    { stage: "understand", status: "completed", summary: "Permission gates and mission constraints evaluated without external calls.", timestamp, sideEffectsPerformed: false },
    { stage: "plan", status: "completed", summary: "Deterministic dry-run steps prepared.", timestamp, sideEffectsPerformed: false },
    { stage: "approve", status: simulation.status === "ready_for_review" ? "completed" : "blocked", summary: "Gates remain review-only; grant-for-review is not execution approval.", timestamp, requiresApproval: true, approvalSatisfied: false, sideEffectsPerformed: false },
    { stage: "act", status: actBlocked ? "blocked" : "skipped", summary: "Act stage skipped or blocked; no skill execution occurred.", timestamp, sideEffectsPerformed: false },
    { stage: "verify", status: "completed", summary: "Dry-run evidence generated with runtime authority disabled.", timestamp, sideEffectsPerformed: false },
    { stage: "learn", status: "skipped", summary: "Learning candidate prepared for review only and not persisted.", timestamp, sideEffectsPerformed: false },
  ];
  return {
    traceId: `skill-dry-run-trace:${simulation.simulationId}`,
    title: "Skill dry-run runtime trace preview",
    source: "personal-intelligence-skill-dry-run",
    createdAt: timestamp,
    updatedAt: timestamp,
    privacyZone: context.privacyZone ?? "private",
    relatedMissionId: context.relatedMissionId ?? simulation.missionAlignmentSummary.missionId,
    relatedProposalId: simulation.planId,
    status: actBlocked ? "blocked" : "verified",
    stages,
    warnings: ["Trace preview is in-memory evidence only and is not persisted."],
    blockers: ["Skill execution and learning persistence remain disabled."],
    sideEffectsPerformed: false,
  };
}
