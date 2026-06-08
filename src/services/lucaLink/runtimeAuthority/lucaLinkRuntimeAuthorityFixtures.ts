import { classifyLucaLinkRuntimeAuthority } from "./lucaLinkRuntimeAuthorityPolicy";
import type { LucaLinkRuntimeAuthorityClassificationInput } from "./lucaLinkRuntimeAuthorityTypes";

const fixture = (
  authorityId: string,
  capabilityKind: LucaLinkRuntimeAuthorityClassificationInput["capabilityKind"],
  riskLevel: LucaLinkRuntimeAuthorityClassificationInput["riskLevel"],
  extra: Partial<LucaLinkRuntimeAuthorityClassificationInput> = {},
) => classifyLucaLinkRuntimeAuthority({
  authorityId,
  createdAt: "2026-06-08T00:00:00.000Z",
  source: "fixture",
  capabilityKind,
  riskLevel,
  requestedByHostId: "fixture-primary-host",
  targetHostId: "fixture-companion-host",
  ...extra,
});

export const LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES = Object.freeze([
  fixture("authority-fixture-handoff", "handoff", "medium", { source: "dry_run_handoff", relatedSimulationId: "simulation-fixture-handoff" }),
  fixture("authority-fixture-transport", "transport_send", "medium"),
  fixture("authority-fixture-sensor-review", "sensor_snapshot_review", "low", { source: "sensor_snapshot" }),
  fixture("authority-fixture-approval-review", "approval_notification_review", "low", { source: "approval_notification" }),
  fixture("authority-fixture-display", "display_open", "medium"),
  fixture("authority-fixture-adapter", "adapter_execution", "high"),
  fixture("authority-fixture-file-write", "file_write", "high"),
  fixture("authority-fixture-install", "package_install", "high"),
  fixture("authority-fixture-shell", "shell_command", "critical"),
  fixture("authority-fixture-credential", "credential_access", "critical"),
  fixture("authority-fixture-host-data", "raw_host_data_access", "critical"),
  fixture("authority-fixture-device-control", "device_control", "critical"),
  fixture("authority-fixture-future-candidate", "handoff", "medium", {
    source: "dry_run_handoff",
    relatedSimulationId: "simulation-fixture-candidate",
    candidateRequested: true,
    requiredApprovals: ["primary host review", "target host review"],
    requiredHostBoundary: ["fixture-primary-host", "fixture-companion-host"],
    candidateEvidence: {
      dryRunHandoffSimulationExists: true,
      dryRunHandoffSucceeded: true,
      transportDecision: "approval_required",
      transportEvidencePresent: true,
      approvalPathExists: true,
      fileInstallDecision: "clear",
      liveSensorCollectionRequired: false,
      permanentBlockedCapabilityPresent: false,
      expiryRequirementExists: true,
      redactionRequirementExists: true,
      operationCenterVisibilityExists: true,
    },
  }),
  fixture("authority-fixture-unsupported", "malformed_fixture_capability", "high", { declarationComplete: false }),
]);
