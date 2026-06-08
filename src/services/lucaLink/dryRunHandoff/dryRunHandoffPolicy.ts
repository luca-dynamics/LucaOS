import type {
  LucaLinkDryRunHandoffInput,
  LucaLinkDryRunHandoffPolicyResult,
  LucaLinkDryRunHandoffRiskLevel,
  LucaLinkDryRunHandoffStatus,
} from "./dryRunHandoffTypes";

export const LUCA_LINK_DRY_RUN_BLOCKED_ACTIONS = Object.freeze([
  "live handoff",
  "transport send",
  "adapter execution",
  "display open/cast",
  "sensor collection",
  "file write",
  "install",
]);

const rank: Record<LucaLinkDryRunHandoffRiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const statusRank: Record<LucaLinkDryRunHandoffStatus, number> = {
  ready_for_review: 0,
  disabled: 1,
  approval_required: 2,
  unsupported: 3,
  blocked: 4,
};
const unique = (values: readonly string[]) => [...new Set(values.filter(Boolean))];

function inputs(input: LucaLinkDryRunHandoffInput): unknown[] {
  return [input.adapterPlan, input.displayIntent, input.approvalNotification, input.sensorSnapshot, input.transportPermissionDecision, input.adapterFileInstallDecision].filter(Boolean);
}

export function evaluateLucaLinkDryRunHandoffPolicy(
  input: LucaLinkDryRunHandoffInput,
): LucaLinkDryRunHandoffPolicyResult {
  let status: LucaLinkDryRunHandoffStatus = "ready_for_review";
  let riskLevel: LucaLinkDryRunHandoffRiskLevel = "low";
  const requiredApprovals: string[] = [];
  const missingApprovals: string[] = [];
  const warnings: string[] = ["Approval is informational and does not enable a LucaLink handoff."];
  const blockers: string[] = [];
  const setStatus = (candidate: LucaLinkDryRunHandoffStatus) => {
    if (statusRank[candidate] > statusRank[status]) status = candidate;
  };
  const setRisk = (candidate?: string) => {
    if (candidate && candidate in rank && rank[candidate as LucaLinkDryRunHandoffRiskLevel] > rank[riskLevel]) {
      riskLevel = candidate as LucaLinkDryRunHandoffRiskLevel;
    }
  };

  const sourceInputs = inputs(input);
  if (sourceInputs.length === 0) {
    setStatus("disabled");
    warnings.push("No LucaLink governance input was supplied for simulation.");
  }

  if (sourceInputs.some((item) => (item as { sideEffectsPerformed?: unknown }).sideEffectsPerformed !== false)) {
    setStatus("blocked");
    blockers.push("Every governance input must explicitly report sideEffectsPerformed=false.");
  }

  const transport = input.transportPermissionDecision;
  if (transport) {
    const transportText = `${transport.reason} ${transport.warnings.join(" ")} ${transport.blockers.join(" ")}`;
    if (/sensitive|credential|private|raw/i.test(transportText)) setRisk("critical");
    else if (transport.status === "blocked") setRisk("high");
    if (["blocked", "expired", "unsupported"].includes(transport.status)) {
      setStatus("blocked");
      blockers.push(`Transport permission decision is ${transport.status}.`);
    } else if (transport.status === "approval_required") {
      setStatus("approval_required");
      requiredApprovals.push(...transport.requiredApprovals, "transport approval");
      missingApprovals.push(...transport.requiredApprovals, "transport approval");
    }
    warnings.push(...transport.warnings);
    blockers.push(...transport.blockers);
  }

  const display = input.displayIntent;
  if (display) {
    setRisk(display.riskLevel);
    if (display.status === "blocked" || display.status === "expired") {
      setStatus("blocked");
      blockers.push(`Display intent is ${display.status}.`);
    } else if (display.hostApprovalRequired && display.status !== "approved_preview") {
      setStatus("approval_required");
      requiredApprovals.push("display host approval");
      missingApprovals.push("display host approval");
    }
    warnings.push(...display.warnings);
    blockers.push(...display.blockers);
  }

  const sensor = input.sensorSnapshot;
  if (sensor) {
    warnings.push("Sensor snapshot is read-only; live sensor collection remains blocked.", ...sensor.warnings);
    if (!sensor.readOnly || sensor.status === "blocked" || sensor.status === "expired" || sensor.blockedSensorKinds.length > 0) {
      setStatus("blocked");
      blockers.push("Sensor input is not eligible for a read-only handoff preview.", ...sensor.blockers);
    }
  }

  const adapter = input.adapterPlan;
  if (adapter) {
    setRisk(adapter.riskLevel);
    warnings.push("Adapter plan remains declarative and non-executable.", ...adapter.warnings);
    blockers.push(...adapter.blockers);
    if (adapter.status === "blocked" || adapter.status === "rejected") setStatus("blocked");
    if (adapter.status === "approval_required") {
      setStatus("approval_required");
      const approvals = adapter.requiredApprovals.map((item) => `host approval:${item.approverHostId}`);
      requiredApprovals.push(...approvals);
      missingApprovals.push(...approvals);
    }
    const unsafe = adapter.requestedCapabilities.filter((capability) =>
      /(shell|install|system[._-]?write|device[._-]?control|background[._-]?surveillance|credential|private|sensitive|raw)/i.test(capability),
    );
    if (unsafe.length > 0) {
      setStatus("blocked");
      blockers.push(`Blocked adapter capabilities: ${unsafe.join(", ")}.`);
    }
  }

  const fileInstall = input.adapterFileInstallDecision;
  if (fileInstall) {
    setRisk(fileInstall.riskLevel);
    warnings.push(...fileInstall.warnings);
    blockers.push(...fileInstall.blockers);
    if (fileInstall.status === "blocked" || fileInstall.status === "expired") setStatus("blocked");
    else if (fileInstall.status === "unsupported") setStatus("unsupported");
    else if (fileInstall.status === "approval_required") setStatus("approval_required");
    const approvals = fileInstall.requiredApprovals.filter((item) => !item.satisfied).map((item) => item.kind);
    requiredApprovals.push(...approvals);
    missingApprovals.push(...approvals);
  }

  const approval = input.approvalNotification;
  if (approval) {
    setRisk(approval.risk);
    warnings.push(...approval.warnings);
    blockers.push(...approval.errors);
    if (approval.status === "blocked" || approval.status === "expired") setStatus("blocked");
    else if (approval.status === "action_required" || approval.requiresFreshPrimaryHostConfirmation) {
      setStatus("approval_required");
      requiredApprovals.push("primary host approval");
      missingApprovals.push("primary host approval");
    }
  }

  return {
    status,
    riskLevel,
    requiredApprovals: unique(requiredApprovals),
    missingApprovals: unique(missingApprovals),
    blockedActions: [...LUCA_LINK_DRY_RUN_BLOCKED_ACTIONS],
    warnings: unique(warnings),
    blockers: unique(blockers),
    sideEffectsPerformed: false,
  };
}
