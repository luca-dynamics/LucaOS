import type {
  LucaLinkRuntimeAuthorityPolicyInput,
  LucaLinkRuntimeAuthorityPolicyResult,
  LucaLinkRuntimeAuthoritySource,
  LucaLinkRuntimeCapabilityKind,
} from "./lucaLinkRuntimeAuthorityTypes";

const CAPABILITIES = new Set<LucaLinkRuntimeCapabilityKind>([
  "handoff", "transport_send", "adapter_execution", "display_open", "display_cast", "sensor_collection",
  "sensor_snapshot_review", "approval_notification_review", "approval_decision_send", "file_write", "package_install",
  "host_config_mutation", "pairing_mutation", "relay_mutation", "webrtc_connection", "vpn_connection",
  "guest_session_mutation", "device_control", "browser_automation", "shell_command", "credential_access",
  "raw_host_data_access", "background_surveillance", "unknown",
]);
const SOURCES = new Set<LucaLinkRuntimeAuthoritySource>([
  "adapter_plan", "display_intent", "approval_notification", "sensor_snapshot", "transport_decision",
  "file_install_decision", "dry_run_handoff", "fixture",
]);
const PERMANENT = new Set<LucaLinkRuntimeCapabilityKind>([
  "shell_command", "credential_access", "raw_host_data_access", "background_surveillance", "device_control",
  "host_config_mutation", "pairing_mutation", "relay_mutation", "vpn_connection",
]);
const REVIEW = new Set<LucaLinkRuntimeCapabilityKind>(["sensor_snapshot_review", "approval_notification_review"]);
const DRY_RUN = new Set<LucaLinkRuntimeCapabilityKind>([
  "handoff", "transport_send", "adapter_execution", "display_open", "display_cast", "sensor_collection",
  "file_write", "package_install", "approval_decision_send", "browser_automation", "webrtc_connection", "guest_session_mutation",
]);
const HANDOFF_LIKE = new Set<LucaLinkRuntimeCapabilityKind>([
  "handoff", "transport_send", "adapter_execution", "display_open", "display_cast", "webrtc_connection", "guest_session_mutation",
]);
const BLOCKED_ACTIONS = [
  "live handoff", "transport send", "adapter execution", "display open/cast", "sensor collection", "file write", "install",
  "runtime authority grant",
];
const REQUIRED_HOST_BOUNDARY = [
  "scoped source host", "scoped target host", "expiry enforcement", "redaction enforcement",
  "Operation Center visibility", "separate bounded-handoff pilot implementation",
];
const CANDIDATE_EVIDENCE = [
  "dry-run handoff simulation", "transport permission evidence", "approval path", "safe file/install decision",
  "no live sensor collection", "no permanently blocked capability", "scoped source and target hosts",
  "expiry and redaction requirements", "Operation Center visibility",
];

const FALSE_FLAGS = {
  authorityGranted: false,
  handoffEnabled: false,
  transportSendEnabled: false,
  adapterExecutionEnabled: false,
  displayOpenEnabled: false,
  sensorCollectionEnabled: false,
  fileWriteEnabled: false,
  installEnabled: false,
  sideEffectsPerformed: false,
} as const;

export function classifyLucaLinkRuntimeAuthority(input: LucaLinkRuntimeAuthorityPolicyInput): LucaLinkRuntimeAuthorityPolicyResult {
  const capabilityValid = CAPABILITIES.has(input.capabilityKind as LucaLinkRuntimeCapabilityKind);
  const sourceValid = SOURCES.has(input.source as LucaLinkRuntimeAuthoritySource);
  const capability = capabilityValid ? input.capabilityKind as LucaLinkRuntimeCapabilityKind : "unknown";
  const riskLevel = input.riskLevel ?? "high";
  const attemptedRuntimeAuthority = Boolean(
    input.authorityGranted || input.handoffEnabled || input.transportSendEnabled || input.adapterExecutionEnabled
    || input.displayOpenEnabled || input.sensorCollectionEnabled || input.fileWriteEnabled || input.installEnabled
    || input.sideEffectsPerformed,
  );
  const missingHandoffScope = HANDOFF_LIKE.has(capability) && (!input.requestedByHostId || !input.targetHostId);
  const incomplete = input.declarationsComplete === false || !capabilityValid || !sourceValid || input.sourceSupported === false;
  const transportEligible = (input.transportDecision === "allowed_preview" || input.transportDecision === "approval_required")
    && input.transportEvidenceExists === true;
  const fileInstallEligible = input.fileInstallDecision !== "blocked"
    && input.fileInstallDecision !== "unsupported"
    && input.fileInstallDecision !== "missing";
  const candidateEligible = riskLevel !== "critical"
    && (riskLevel === "low" || riskLevel === "medium")
    && input.dryRunHandoffSimulationExists === true
    && transportEligible
    && input.approvalPathExists === true
    && fileInstallEligible
    && input.liveSensorCollectionRequired === false
    && input.permanentBlockedCapabilityPresent === false
    && Boolean(input.requestedByHostId && input.targetHostId)
    && input.expiryRequirementExists === true
    && input.redactionRequirementExists === true
    && input.operationCenterVisibilityExists === true;

  let authorityClass: LucaLinkRuntimeAuthorityPolicyResult["authorityClass"];
  const blockers: string[] = [];
  const warnings = [
    "Runtime authority is not granted.",
    "Dry-run success does not authorize handoff.",
  ];

  if (attemptedRuntimeAuthority) {
    authorityClass = "permanently_blocked";
    blockers.push("Attempted runtime authority or runtime enablement flag was rejected.");
  } else if (PERMANENT.has(capability) || (capability === "unknown" && riskLevel === "critical")) {
    authorityClass = "permanently_blocked";
    blockers.push(`${capability.replace(/_/g, " ")} is permanently blocked.`);
  } else if (incomplete || capability === "unknown") {
    authorityClass = "unsupported";
    blockers.push("Capability declaration or source is incomplete, malformed, or unsupported.");
  } else if (candidateEligible) {
    authorityClass = "future_bounded_handoff_candidate";
    warnings.push("Future bounded handoff candidate does not mean sendable.");
  } else if (REVIEW.has(capability) || input.reviewOnlyDeclaration === true) {
    authorityClass = "review_only";
    if (capability === "approval_notification_review") warnings.push("Approval notification review does not authorize approval send.");
  } else if (missingHandoffScope) {
    authorityClass = "unsupported";
    blockers.push("Handoff-like capabilities require scoped source and target hosts.");
  } else if (DRY_RUN.has(capability)) {
    authorityClass = "dry_run_only";
    if (riskLevel === "critical") blockers.push("Critical risk cannot become a future bounded handoff candidate.");
  } else {
    authorityClass = "unsupported";
    blockers.push("Capability is not supported by the LucaLink authority classifier.");
  }

  return {
    authorityClass,
    riskLevel,
    requiredEvidence: authorityClass === "future_bounded_handoff_candidate" ? [...CANDIDATE_EVIDENCE] : ["human-readable declaration", "bounded review evidence"],
    requiredApprovals: authorityClass === "permanently_blocked" ? [] : ["explicit human review", "Primary Host approval path"],
    requiredHostBoundary: [...REQUIRED_HOST_BOUNDARY],
    blockedActions: [...BLOCKED_ACTIONS],
    warnings,
    blockers,
    ...FALSE_FLAGS,
  };
}
