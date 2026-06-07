import type { CreateMissionContextSnapshotInput, PersonalIntelligenceMissionContextSnapshot } from "./missionRuntimeTypes";

const UNSAFE_CONTENT_RULES: ReadonlyArray<[RegExp, string]> = [
  [/\b(hidden|system|developer)\s+prompt\b/i, "Hidden or system prompt material is not allowed in mission context."],
  [/\b(private reasoning|chain[- ]of[- ]thought|internal reasoning)\b/i, "Private reasoning is not allowed in mission context."],
  [/\b(raw (user )?file|file contents?|attachment contents?)\b/i, "Raw user files are not allowed in mission context."],
  [/\b(password|passphrase|credential|private key|client secret|api[_ -]?key)\b/i, "Credential or secret material is not allowed in mission context."],
  [/\b(?:sk|pk|api|token)[_-][a-z0-9_-]{16,}\b/i, "Token-like material is not allowed in mission context."],
  [/\b(?:bearer|token)\s+[a-z0-9._~+/-]{16,}\b/i, "Token-like material is not allowed in mission context."],
];

export function findUnsafeMissionContent(values: readonly string[]): string[] {
  const combined = values.join("\n");
  return Array.from(new Set(UNSAFE_CONTENT_RULES.filter(([pattern]) => pattern.test(combined)).map(([, message]) => message)));
}

export function sanitizeMissionText(value: string): string {
  return findUnsafeMissionContent([value]).length > 0 ? "[BLOCKED UNSAFE MISSION CONTENT]" : value;
}

export function createMissionContextSnapshot(
  input: CreateMissionContextSnapshotInput,
): PersonalIntelligenceMissionContextSnapshot {
  const timestamp = (input.now ?? (() => new Date()))().toISOString();
  const goals = [...input.mission.goals];
  const constraints = [...input.mission.constraints];
  const successCriteria = [...input.mission.successCriteria];
  const operatingAssumptions = input.operatingAssumptions
    ? [...input.operatingAssumptions]
    : [
        `Mission status is ${input.mission.status}.`,
        `Mission priority is ${input.mission.priority}.`,
        `Mission profile operating mode is ${input.mission.operatingMode}; this snapshot is bounded to ${input.mode}.`,
      ];
  const warnings: string[] = [];
  const blockers: string[] = [];

  if (goals.length === 0) blockers.push("Mission context requires at least one goal.");
  if (constraints.length === 0) warnings.push("Mission context has no explicit constraints; user review is required.");
  if (successCriteria.length === 0) blockers.push("Mission context requires at least one success criterion.");
  if (input.mission.operatingMode === "supervised_execution") {
    warnings.push("Supervised-execution profile mode was reduced to advisory/collaborative context; no execution authority was carried forward.");
  }

  blockers.push(...findUnsafeMissionContent([
    input.mission.title,
    input.mission.description,
    ...goals,
    ...constraints,
    ...successCriteria,
    ...operatingAssumptions,
  ]));

  return {
    snapshotId: `mission-snapshot:${input.mission.missionId}:${timestamp}`,
    missionId: input.mission.missionId,
    title: sanitizeMissionText(input.mission.title),
    source: input.source ?? "personal-intelligence-mission-profile",
    createdAt: timestamp,
    updatedAt: input.mission.updatedAt,
    mode: input.mode,
    privacyZone: input.privacyZone ?? "project",
    goals: goals.map(sanitizeMissionText),
    constraints: constraints.map(sanitizeMissionText),
    successCriteria: successCriteria.map(sanitizeMissionText),
    operatingAssumptions: operatingAssumptions.map(sanitizeMissionText),
    relatedProjectIds: copyOptional(input.relatedProjectIds ?? input.mission.activeProjectRefs),
    relatedMemoryItemIds: copyOptional(input.relatedMemoryItemIds),
    relatedTraceIds: copyOptional(input.relatedTraceIds),
    warnings: Array.from(new Set(warnings)),
    blockers: Array.from(new Set(blockers)),
    sideEffectsPerformed: false,
  };
}

function copyOptional(values?: readonly string[]): string[] | undefined {
  return values?.length ? [...values] : undefined;
}
