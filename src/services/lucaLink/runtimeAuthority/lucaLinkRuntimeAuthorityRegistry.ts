import { classifyLucaLinkRuntimeAuthority } from "./lucaLinkRuntimeAuthorityPolicy";
import type {
  LucaLinkRuntimeAuthorityRecord,
  LucaLinkRuntimeAuthoritySource,
  LucaLinkRuntimeCapabilityKind,
  LucaLinkRuntimeCapabilityRegistryInput,
  LucaLinkRuntimeRegistryDeclaration,
} from "./lucaLinkRuntimeAuthorityTypes";

const DEFAULT_CREATED_AT = "2026-06-08T00:00:00.000Z";
const groups: readonly [keyof LucaLinkRuntimeCapabilityRegistryInput, LucaLinkRuntimeAuthoritySource][] = [
  ["adapterSandboxPlans", "adapter_plan"],
  ["webDisplayIntents", "display_intent"],
  ["approvalNotifications", "approval_notification"],
  ["sensorSnapshots", "sensor_snapshot"],
  ["transportPermissionDecisions", "transport_decision"],
  ["adapterFileInstallDecisions", "file_install_decision"],
  ["dryRunHandoffSimulations", "dry_run_handoff"],
  ["fixtures", "fixture"],
];

function createRecord(declaration: LucaLinkRuntimeRegistryDeclaration, source: LucaLinkRuntimeAuthoritySource): LucaLinkRuntimeAuthorityRecord {
  const sourceIsReviewModel = source === "adapter_plan" || source === "display_intent" || source === "transport_decision" || source === "file_install_decision";
  const policy = classifyLucaLinkRuntimeAuthority({
    ...declaration,
    source,
    reviewOnlyDeclaration: declaration.reviewOnlyDeclaration ?? sourceIsReviewModel,
  });
  const capabilityKind = declaration.capabilityKind === "malformed_capability"
    ? "unknown"
    : declaration.capabilityKind as LucaLinkRuntimeCapabilityKind;
  return {
    authorityId: `lucalink-authority:${declaration.id}`,
    createdAt: declaration.createdAt ?? DEFAULT_CREATED_AT,
    source,
    capabilityKind,
    riskLevel: policy.riskLevel,
    requestedByHostId: declaration.requestedByHostId,
    targetHostId: declaration.targetHostId,
    targetDeviceId: declaration.targetDeviceId,
    relatedSimulationId: declaration.relatedSimulationId,
    relatedRequestId: declaration.relatedRequestId,
    authorityClass: policy.authorityClass,
    requiredEvidence: [...policy.requiredEvidence],
    requiredApprovals: [...policy.requiredApprovals],
    requiredHostBoundary: [...policy.requiredHostBoundary],
    blockedActions: [...policy.blockedActions],
    warnings: [...policy.warnings],
    blockers: [...policy.blockers],
    authorityGranted: false,
    handoffEnabled: false,
    transportSendEnabled: false,
    adapterExecutionEnabled: false,
    displayOpenEnabled: false,
    sensorCollectionEnabled: false,
    fileWriteEnabled: false,
    installEnabled: false,
    sideEffectsPerformed: false,
  };
}

export function createLucaLinkRuntimeCapabilityRegistry(input: LucaLinkRuntimeCapabilityRegistryInput): LucaLinkRuntimeAuthorityRecord[] {
  return groups.flatMap(([key, source]) => (input[key] ?? []).map((declaration) => createRecord({ ...declaration }, source)));
}
