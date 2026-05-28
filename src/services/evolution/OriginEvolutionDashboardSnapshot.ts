import type { OriginEvolutionControlServiceSnapshot } from "./OriginEvolutionControlService";

export interface OriginEvolutionDashboardSnapshot {
  proposalSummary: string;
  externalArtifactSummary: string;
  constraintSummary: string;
  prBackSummary: string;
  safetyStatus: "safe" | "warning";
  warnings: string[];
  readOnly: true;
  mockOnly?: boolean;
  runtimeBehaviorChanged: false;
  uiWiringChanged: false;
  privilegedActionsEnabled: false;
  metadata?: Record<string, unknown>;
}

export type OriginEvolutionDashboardSnapshotInput = Partial<OriginEvolutionDashboardSnapshot> | OriginEvolutionControlServiceSnapshot;

export function createOriginEvolutionDashboardSnapshot(input?: OriginEvolutionDashboardSnapshotInput): OriginEvolutionDashboardSnapshot {
  const maybeService = input as OriginEvolutionControlServiceSnapshot | undefined;
  const fromService = maybeService?.serviceKind === "origin_evolution_control_service";
  const warnings = ["display_only_snapshot", "privileged_actions_disabled", ...(input?.warnings ?? [])];

  return {
    proposalSummary: fromService ? `Proposals: ${maybeService.proposalInbox.total}` : input?.proposalSummary ?? "No proposals linked (mock).",
    externalArtifactSummary: fromService ? "External artifact import status available via adapter snapshot." : input?.externalArtifactSummary ?? "No external artifacts linked (mock).",
    constraintSummary: input?.constraintSummary ?? "Constraint verification shown as read-only summary.",
    prBackSummary: input?.prBackSummary ?? "PR-back verification shown as read-only summary.",
    safetyStatus: warnings.length > 0 ? "warning" : "safe",
    warnings,
    readOnly: true,
    mockOnly: input?.mockOnly ?? !fromService,
    runtimeBehaviorChanged: false,
    uiWiringChanged: false,
    privilegedActionsEnabled: false,
    metadata: { ...(input?.metadata ?? {}), source: fromService ? "control_service_snapshot" : "mock_or_partial" },
  };
}

export function getOriginEvolutionDashboardSnapshotSafety(input?: OriginEvolutionDashboardSnapshotInput) {
  const snapshot = createOriginEvolutionDashboardSnapshot(input);
  return { snapshot, runtimeBehaviorChanged: false as const, uiWiringChanged: false as const, privilegedActionsEnabled: false as const };
}
