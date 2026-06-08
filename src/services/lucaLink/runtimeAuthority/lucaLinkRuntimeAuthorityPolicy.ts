import {
  LUCA_LINK_RUNTIME_DISABLED_FLAGS,
  type LucaLinkRuntimeAuthorityCandidateEvidence,
  type LucaLinkRuntimeAuthorityClassificationInput,
  type LucaLinkRuntimeAuthorityClass,
  type LucaLinkRuntimeAuthorityRecord,
  type LucaLinkRuntimeCapabilityKind,
} from "./lucaLinkRuntimeAuthorityTypes";

export const LUCA_LINK_RUNTIME_AUTHORITY_BLOCKED_ACTIONS = Object.freeze([
  "live handoff",
  "transport send",
  "adapter execution",
  "display open/cast",
  "sensor collection",
  "file write",
  "install",
  "runtime authority grant",
]);

const CAPABILITY_KINDS = new Set<LucaLinkRuntimeCapabilityKind>([
  "handoff", "transport_send", "adapter_execution", "display_open", "display_cast",
  "sensor_collection", "sensor_snapshot_review", "approval_notification_review",
  "approval_decision_send", "file_write", "package_install", "host_config_mutation",
  "pairing_mutation", "relay_mutation", "webrtc_connection", "vpn_connection",
  "guest_session_mutation", "device_control", "browser_automation", "shell_command",
  "credential_access", "raw_host_data_access", "background_surveillance", "unknown",
]);

const PERMANENTLY_BLOCKED = new Set<LucaLinkRuntimeCapabilityKind>([
  "shell_command", "credential_access", "raw_host_data_access", "background_surveillance",
  "device_control", "host_config_mutation", "pairing_mutation", "relay_mutation", "vpn_connection",
]);

const REVIEW_ONLY = new Set<LucaLinkRuntimeCapabilityKind>([
  "sensor_snapshot_review", "approval_notification_review",
]);

const REVIEW_SOURCES = new Set([
  "adapter_plan", "display_intent", "sensor_snapshot", "approval_notification",
  "transport_decision", "file_install_decision",
]);

const DRY_RUN_ONLY = new Set<LucaLinkRuntimeCapabilityKind>([
  "handoff", "transport_send", "adapter_execution", "display_open", "display_cast",
  "sensor_collection", "file_write", "package_install", "approval_decision_send",
  "browser_automation", "webrtc_connection", "guest_session_mutation",
]);

const HOST_SCOPED = new Set<LucaLinkRuntimeCapabilityKind>([
  "handoff", "transport_send", "display_open", "display_cast", "webrtc_connection",
  "guest_session_mutation",
]);

const unique = (values: readonly string[]) => [...new Set(values.filter(Boolean))];
const copy = (values?: readonly string[]) => values ? [...values] : [];

function iso(value?: string | number | Date): string {
  if (value === undefined) return "2026-06-08T00:00:00.000Z";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "2026-06-08T00:00:00.000Z" : date.toISOString();
}

function safeId(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9:_-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "unscoped";
}

function runtimeEnablementAttempted(input: LucaLinkRuntimeAuthorityClassificationInput): boolean {
  return [
    input.authorityGranted,
    input.handoffEnabled,
    input.transportSendEnabled,
    input.adapterExecutionEnabled,
    input.displayOpenEnabled,
    input.sensorCollectionEnabled,
    input.fileWriteEnabled,
    input.installEnabled,
    input.sideEffectsPerformed,
  ].some((value) => value === true);
}

function candidateMissingEvidence(
  input: LucaLinkRuntimeAuthorityClassificationInput,
  evidence: LucaLinkRuntimeAuthorityCandidateEvidence,
): string[] {
  const missing: string[] = [];
  if (!evidence.dryRunHandoffSimulationExists) missing.push("dry-run handoff simulation evidence");
  if (!(["allowed_preview", "approval_required"] as const).includes(evidence.transportDecision as "allowed_preview" | "approval_required")) {
    missing.push("allowed-preview or approval-required transport decision");
  }
  if (!evidence.transportEvidencePresent) missing.push("transport decision evidence");
  if (!evidence.approvalPathExists) missing.push("approval path");
  if (["blocked", "unsupported", "missing"].includes(evidence.fileInstallDecision ?? "missing")) {
    missing.push("clear or reviewable file/install decision");
  }
  if (evidence.liveSensorCollectionRequired !== false) missing.push("confirmation that live sensor collection is not required");
  if (evidence.permanentBlockedCapabilityPresent !== false) missing.push("confirmation that no permanently blocked capability is present");
  if (!input.requestedByHostId || !input.targetHostId) missing.push("scoped source and target hosts");
  if (!evidence.expiryRequirementExists) missing.push("expiry requirement");
  if (!evidence.redactionRequirementExists) missing.push("redaction requirement");
  if (!evidence.operationCenterVisibilityExists) missing.push("Operation Center visibility");
  return missing;
}

function baseClass(
  input: LucaLinkRuntimeAuthorityClassificationInput,
  capabilityKind: LucaLinkRuntimeCapabilityKind,
): LucaLinkRuntimeAuthorityClass {
  if (PERMANENTLY_BLOCKED.has(capabilityKind) || (capabilityKind === "unknown" && input.riskLevel === "critical")) {
    return "permanently_blocked";
  }
  if (capabilityKind === "unknown") return "unsupported";
  if (REVIEW_ONLY.has(capabilityKind) || REVIEW_SOURCES.has(input.source)) return "review_only";
  if (DRY_RUN_ONLY.has(capabilityKind)) return "dry_run_only";
  return "unsupported";
}

export function classifyLucaLinkRuntimeAuthority(
  input: LucaLinkRuntimeAuthorityClassificationInput,
): LucaLinkRuntimeAuthorityRecord {
  const malformedCapability = !CAPABILITY_KINDS.has(input.capabilityKind as LucaLinkRuntimeCapabilityKind);
  const capabilityKind = malformedCapability ? "unknown" : input.capabilityKind as LucaLinkRuntimeCapabilityKind;
  const riskLevel = input.riskLevel ?? "high";
  const warnings = copy(input.warnings);
  const blockers = copy(input.blockers);
  const requiredEvidence = copy(input.requiredEvidence);
  const requiredApprovals = copy(input.requiredApprovals);
  const requiredHostBoundary = copy(input.requiredHostBoundary);
  const attemptedEnablement = runtimeEnablementAttempted(input);
  let authorityClass = baseClass(input, capabilityKind);

  if (malformedCapability) {
    authorityClass = "unsupported";
    blockers.push("Capability declaration is malformed or unrecognized.");
  }
  if (input.declarationComplete === false) {
    authorityClass = "unsupported";
    blockers.push("Capability declaration is incomplete.");
  }
  if (input.sourceSupported === false) {
    authorityClass = "unsupported";
    blockers.push("Capability source is unsupported.");
  }
  if (HOST_SCOPED.has(capabilityKind) && (!input.requestedByHostId || !input.targetHostId)) {
    authorityClass = "unsupported";
    blockers.push("Handoff-like capabilities require scoped source and target hosts.");
  }
  if (attemptedEnablement) {
    authorityClass = "permanently_blocked";
    blockers.push("Runtime authority or runtime enablement was requested, but this boundary never grants it.");
  }

  if (input.candidateRequested && authorityClass === "dry_run_only") {
    const candidateRequirements = [
      "dry-run handoff simulation evidence",
      "allowed-preview or approval-required transport decision evidence",
      "approval path",
      "clear or reviewable file/install decision",
      "no live sensor collection requirement",
      "no permanently blocked capability",
      "scoped source and target hosts",
      "expiry requirement",
      "redaction requirement",
      "Operation Center visibility",
    ];
    const missing = candidateMissingEvidence(input, input.candidateEvidence ?? {});
    requiredEvidence.push(...candidateRequirements);
    if (riskLevel === "critical") {
      blockers.push("Critical-risk capabilities cannot become future bounded handoff candidates.");
    } else if ((riskLevel === "low" || riskLevel === "medium") && missing.length === 0) {
      authorityClass = "future_bounded_handoff_candidate";
      warnings.push("Candidate status is evidence for a future pilot review only and grants no runtime authority.");
    } else {
      blockers.push(...missing.map((item) => `Future pilot evidence missing: ${item}.`));
    }
  }

  if (capabilityKind === "handoff") warnings.push("Dry-run handoff success does not grant authority.");
  if (capabilityKind === "approval_notification_review") {
    warnings.push("Approval notification review does not authorize an approval decision send.");
  }
  if (authorityClass === "future_bounded_handoff_candidate") {
    warnings.push("Future bounded handoff candidate does not mean sendable or executable.");
  }
  if (authorityClass === "permanently_blocked") blockers.push("This capability is outside the LucaLink runtime authority boundary.");
  if (authorityClass === "unsupported") blockers.push("Unsupported capabilities cannot enter a handoff pilot.");

  return {
    authorityId: input.authorityId ?? `runtime-authority:${safeId(input.relatedSimulationId ?? input.relatedRequestId ?? capabilityKind)}`,
    createdAt: iso(input.createdAt),
    source: input.source,
    capabilityKind,
    authorityClass,
    riskLevel,
    requestedByHostId: input.requestedByHostId,
    targetHostId: input.targetHostId,
    targetDeviceId: input.targetDeviceId,
    relatedSimulationId: input.relatedSimulationId,
    relatedRequestId: input.relatedRequestId,
    requiredEvidence: unique(requiredEvidence),
    requiredApprovals: unique(requiredApprovals),
    requiredHostBoundary: unique(requiredHostBoundary),
    blockedActions: unique([...LUCA_LINK_RUNTIME_AUTHORITY_BLOCKED_ACTIONS, ...copy(input.blockedActions)]),
    warnings: unique(warnings),
    blockers: unique(blockers),
    ...LUCA_LINK_RUNTIME_DISABLED_FLAGS,
  };
}
