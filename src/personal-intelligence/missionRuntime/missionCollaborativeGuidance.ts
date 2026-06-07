import { createMissionNextStepSuggestions } from "./missionAdvisoryPlanner";
import type { MissionAlignmentEvaluation, MissionCollaborativeGuidance, PersonalIntelligenceMissionContextSnapshot } from "./missionRuntimeTypes";

interface CreateMissionCollaborativeGuidanceInput {
  snapshot: PersonalIntelligenceMissionContextSnapshot;
  userIntentSummary: string;
  evaluation?: MissionAlignmentEvaluation;
  runtimeTraceSummary?: string;
  now?: () => Date;
}

export function createMissionCollaborativeGuidance(
  input: CreateMissionCollaborativeGuidanceInput,
): MissionCollaborativeGuidance {
  const timestamp = (input.now ?? (() => new Date()))().toISOString();
  const context = [
    `Mission: ${input.snapshot.title}`,
    `Goals: ${input.snapshot.goals.join("; ") || "not defined"}`,
    `Constraints: ${input.snapshot.constraints.join("; ") || "not defined"}`,
    `Success criteria: ${input.snapshot.successCriteria.join("; ") || "not defined"}`,
  ];
  if (input.runtimeTraceSummary) context.push(`Runtime evidence summary: ${input.runtimeTraceSummary}`);

  return {
    guidanceId: `mission-guidance:${input.snapshot.missionId}:${timestamp}`,
    mode: "collaborative",
    userIntentSummary: input.userIntentSummary,
    missionRelevantContext: context,
    suggestedQuestions: [
      "Which mission goal should take priority for this proposal?",
      "Are the current constraints complete and still applicable?",
      "What evidence should count as satisfying the success criteria?",
    ],
    suggestedNextSteps: input.evaluation
      ? createMissionNextStepSuggestions(input.snapshot, input.evaluation)
      : ["Ask the user to review the mission context.", "Prepare a bounded proposal for review.", "Defer action until explicit approval."],
    approvalBoundaries: [
      "Mission alignment is planning evidence, not approval.",
      "The user must explicitly approve any future action through the relevant runtime gate.",
      "Memory writes, prompt changes, model routing, provider calls, tools, and device handoffs remain outside this guidance layer.",
    ],
    blockedAutonomousActions: [
      "Executing tools, skills, workflows, shell commands, generated code, or browser actions",
      "Writing memory, files, browser storage, databases, or audit records",
      "Calling providers, networks, sockets, Electron IPC, or LucaLink handoffs",
      "Changing prompts, personality, model routing, skills, or runtime state",
    ],
    sideEffectsPerformed: false,
  };
}
