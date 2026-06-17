import { createLucaLinkRuntimeCapabilityRegistry } from "./lucaLinkRuntimeAuthorityRegistry";
import type { LucaLinkRuntimeRegistryDeclaration } from "./lucaLinkRuntimeAuthorityTypes";

const sourceHost = "host:fixture-source";
const targetHost = "host:fixture-target";
const definitions: readonly LucaLinkRuntimeRegistryDeclaration[] = [
  { id: "handoff-dry-run", source: "fixture", capabilityKind: "handoff", riskLevel: "medium", requestedByHostId: sourceHost, targetHostId: targetHost },
  { id: "transport-dry-run", source: "fixture", capabilityKind: "transport_send", riskLevel: "medium", requestedByHostId: sourceHost, targetHostId: targetHost },
  { id: "sensor-review", source: "fixture", capabilityKind: "sensor_snapshot_review", riskLevel: "low" },
  { id: "approval-review", source: "fixture", capabilityKind: "approval_notification_review", riskLevel: "low" },
  { id: "display-dry-run", source: "fixture", capabilityKind: "display_open", riskLevel: "medium", requestedByHostId: sourceHost, targetHostId: targetHost },
  { id: "adapter-dry-run", source: "fixture", capabilityKind: "adapter_execution", riskLevel: "high", requestedByHostId: sourceHost, targetHostId: targetHost },
  { id: "file-dry-run", source: "fixture", capabilityKind: "file_write", riskLevel: "high" },
  { id: "install-dry-run", source: "fixture", capabilityKind: "package_install", riskLevel: "high" },
  { id: "shell-blocked", source: "fixture", capabilityKind: "shell_command", riskLevel: "critical" },
  { id: "credential-blocked", source: "fixture", capabilityKind: "credential_access", riskLevel: "critical" },
  { id: "raw-host-data-blocked", source: "fixture", capabilityKind: "raw_host_data_access", riskLevel: "critical" },
  { id: "device-control-blocked", source: "fixture", capabilityKind: "device_control", riskLevel: "critical" },
  {
    id: "future-bounded-handoff", source: "fixture", capabilityKind: "handoff", riskLevel: "low",
    requestedByHostId: sourceHost, targetHostId: targetHost, dryRunHandoffSimulationExists: true,
    dryRunHandoffSuccessful: true, transportDecision: "allowed_preview", transportEvidenceExists: true,
    approvalPathExists: true, fileInstallDecision: "not_required", liveSensorCollectionRequired: false,
    permanentBlockedCapabilityPresent: false, expiryRequirementExists: true, redactionRequirementExists: true,
    operationCenterVisibilityExists: true,
  },
  { id: "malformed", source: "fixture", capabilityKind: "malformed_capability", riskLevel: "medium", declarationsComplete: false },
];

export const LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES = Object.freeze(
  createLucaLinkRuntimeCapabilityRegistry({ fixtures: definitions }),
);
