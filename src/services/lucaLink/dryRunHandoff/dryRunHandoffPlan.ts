import type { LucaLinkDryRunApprovalPath, LucaLinkDryRunHandoffInput, LucaLinkDryRunHandoffPolicyResult, LucaLinkDryRunHandoffStep } from "./dryRunHandoffTypes";

export function createLucaLinkDryRunApprovalPath(input: LucaLinkDryRunHandoffInput): LucaLinkDryRunApprovalPath {
  const required = [
    ...(input.adapterPlan?.requiredApprovals.map((item) => `host approval:${item.approverHostId}`) ?? []),
    ...(input.transportPermissionDecision?.status === "approval_required" ? ["transport approval"] : []),
    ...(input.displayIntent?.hostApprovalRequired && input.displayIntent.status !== "approved_preview" ? ["display host approval"] : []),
    ...(input.adapterFileInstallDecision?.requiredApprovals.filter((item) => !item.satisfied).map((item) => item.kind) ?? []),
    ...(input.approvalNotification?.requiresFreshPrimaryHostConfirmation ? ["primary host approval"] : []),
  ];
  const requiredApprovals = [...new Set(required)];
  return {
    primaryHostApprovalRequired: requiredApprovals.some((item) => item.includes("primary") || item.includes("host approval")),
    companionHostNotificationRequired: Boolean(input.approvalNotification),
    displayHostApprovalRequired: requiredApprovals.includes("display host approval"),
    fileInstallSecurityReviewRequired: Boolean(input.adapterFileInstallDecision && (input.adapterFileInstallDecision.operation === "install" || input.adapterFileInstallDecision.requiredApprovals.some((item) => item.kind === "security_review"))),
    transportApprovalRequired: requiredApprovals.includes("transport approval"),
    sensorLiveCollectionBlocked: true,
    informationalOnly: true,
    requiredApprovals,
    missingApprovals: requiredApprovals,
  };
}

const definitions: Array<[LucaLinkDryRunHandoffStep["stage"], string, string]> = [
  ["inspect", "Inspect LucaLink handoff request", "Inspect model-only governance inputs."],
  ["host_scope", "Scope source and target host", "Describe host and device scope without connecting."],
  ["permission_check", "Check adapter/display/sensor/file-install models", "Compare supplied governance decisions."],
  ["permission_check", "Check transport permission decision", "Apply transport policy without sending."],
  ["approval_route", "Route approval path", "Summarize approvals without notifying or deciding."],
  ["transport_preview", "Preview transport only", "Describe the transport channel and message class."],
  ["blocked_handoff", "Skip live send", "Live transport send is always blocked."],
  ["adapter_preview", "Skip adapter execution", "Adapter entrypoints are never imported or executed."],
  ["display_preview", "Skip display open/cast", "Display actions remain disabled."],
  ["sensor_preview", "Skip sensor collection", "Only an existing read-only snapshot may be inspected."],
  ["file_install_preview", "Skip file write/install", "File writes and package installation remain disabled."],
  ["verify", "Verify dry-run result", "Verify every runtime authority flag remains false."],
  ["audit", "Create audit summary", "Create deterministic review evidence in memory."],
];

export function createLucaLinkDryRunHandoffSteps(policy: LucaLinkDryRunHandoffPolicyResult): LucaLinkDryRunHandoffStep[] {
  return definitions.map(([stage, label, description], index) => {
    const forcedBlock = ["blocked_handoff", "adapter_preview", "display_preview", "sensor_preview", "file_install_preview"].includes(stage);
    const needsReview = stage === "approval_route" && policy.status === "approval_required";
    return {
      stepId: `dry-run-step-${String(index + 1).padStart(2, "0")}`,
      order: index + 1,
      label,
      description,
      stage,
      status: forcedBlock ? "blocked" : needsReview ? "requires_review" : "simulated",
      wouldRequire: stage === "approval_route" ? [...policy.requiredApprovals] : [],
      wouldBlock: forcedBlock ? [...policy.blockedActions] : [],
      sideEffectsPerformed: false,
    };
  });
}
