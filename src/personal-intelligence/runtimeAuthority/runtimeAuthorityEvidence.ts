import type {
  PersonalIntelligenceRuntimeAuthorityEvidence,
  PersonalIntelligenceRuntimeAuthorityRecord,
} from "./runtimeAuthorityTypes";

export interface RuntimeAuthorityEvidenceContext {
  sourceItem?: string;
  dryRunEvidence?: readonly string[];
  rollbackExpectations?: readonly string[];
  runtimeTracePresent?: boolean;
  missionAlignment?: string;
  safetyBlockers?: readonly string[];
}

export function createPersonalIntelligenceRuntimeAuthorityEvidence(
  record: PersonalIntelligenceRuntimeAuthorityRecord,
  context: RuntimeAuthorityEvidenceContext = {},
): PersonalIntelligenceRuntimeAuthorityEvidence {
  return {
    authorityId: record.authorityId,
    sourceItem: context.sourceItem ?? `${record.source}:${record.skillId ?? record.authorityId}`,
    requiredApprovals: [...record.requiredApprovals],
    dryRunEvidence: [...(context.dryRunEvidence ?? [])],
    blockedActions: [...record.blockedActions],
    rollbackExpectations: [...(context.rollbackExpectations ?? [])],
    runtimeTracePresence: context.runtimeTracePresent === true,
    missionAlignment: context.missionAlignment ?? "not_provided",
    safetyBlockers: [...record.blockers, ...(context.safetyBlockers ?? [])],
    futurePilotRequirements: [...record.requiredEvidence, ...record.requiredRuntimeBoundary],
    authorityGranted: false,
    executionEnabled: false,
    canExecute: false,
    readyForExecution: false,
    sideEffectsPerformed: false,
  };
}
