import { classifyLucaLinkRuntimeAuthority } from "./lucaLinkRuntimeAuthorityPolicy";
import type {
  LucaLinkRuntimeAuthorityClassificationInput,
  LucaLinkRuntimeAuthorityRecord,
  LucaLinkRuntimeAuthoritySource,
  LucaLinkRuntimeCapabilityKind,
  LucaLinkRuntimeCapabilityRegistryInput,
  LucaLinkRuntimeRegistrySourceEntry,
} from "./lucaLinkRuntimeAuthorityTypes";

const copyLabels = (values?: readonly unknown[]) => (values ?? []).map((value) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "kind" in value && typeof value.kind === "string") return value.kind;
  return "declared review evidence";
});

function toClassificationInput(
  entry: LucaLinkRuntimeRegistrySourceEntry,
  source: LucaLinkRuntimeAuthoritySource,
  defaultCapabilityKind: LucaLinkRuntimeCapabilityKind,
  index: number,
): LucaLinkRuntimeAuthorityClassificationInput {
  const capabilityKind = entry.capabilityKind
    ?? (source === "file_install_decision" && (entry.operation === "package_install" || entry.operation === "install") ? "package_install" : defaultCapabilityKind);
  const relationId = entry.simulationId ?? entry.requestId ?? entry.decisionId ?? entry.planId ?? entry.snapshotId ?? entry.id ?? `${source}-${index + 1}`;
  return {
    authorityId: `runtime-authority:${source}:${relationId}`,
    createdAt: entry.createdAt,
    source,
    capabilityKind,
    riskLevel: entry.riskLevel,
    requestedByHostId: entry.requestedByHostId ?? entry.hostId,
    targetHostId: entry.targetHostId,
    targetDeviceId: entry.targetDeviceId,
    relatedSimulationId: entry.simulationId,
    relatedRequestId: entry.requestId,
    requiredEvidence: copyLabels(entry.requiredEvidence),
    requiredApprovals: copyLabels(entry.requiredApprovals),
    requiredHostBoundary: entry.requiredHostBoundary ? [...entry.requiredHostBoundary] : [],
    blockedActions: entry.blockedActions ? [...entry.blockedActions] : [],
    warnings: entry.warnings ? [...entry.warnings] : [],
    blockers: entry.blockers ? [...entry.blockers] : [],
    candidateRequested: entry.candidateRequested,
    candidateEvidence: entry.candidateEvidence ? { ...entry.candidateEvidence } : undefined,
    declarationComplete: entry.declarationComplete ?? Boolean(capabilityKind),
    sourceSupported: entry.sourceSupported ?? true,
  };
}

export function createLucaLinkRuntimeCapabilityRegistry(
  input: LucaLinkRuntimeCapabilityRegistryInput,
): LucaLinkRuntimeAuthorityRecord[] {
  const groups: Array<{
    entries: readonly LucaLinkRuntimeRegistrySourceEntry[];
    source: LucaLinkRuntimeAuthoritySource;
    capabilityKind: LucaLinkRuntimeCapabilityKind;
  }> = [
    { entries: input.adapterSandboxPlans ?? [], source: "adapter_plan", capabilityKind: "adapter_execution" },
    { entries: input.webDisplayIntents ?? [], source: "display_intent", capabilityKind: "display_open" },
    { entries: input.approvalNotifications ?? [], source: "approval_notification", capabilityKind: "approval_notification_review" },
    { entries: input.sensorSnapshots ?? [], source: "sensor_snapshot", capabilityKind: "sensor_snapshot_review" },
    { entries: input.transportPermissionDecisions ?? [], source: "transport_decision", capabilityKind: "transport_send" },
    { entries: input.adapterFileInstallDecisions ?? [], source: "file_install_decision", capabilityKind: "file_write" },
    { entries: input.dryRunHandoffSimulations ?? [], source: "dry_run_handoff", capabilityKind: "handoff" },
  ];

  return groups.flatMap(({ entries, source, capabilityKind }) => entries.map((entry, index) =>
    classifyLucaLinkRuntimeAuthority(toClassificationInput({ ...entry }, source, capabilityKind, index))
  ));
}
