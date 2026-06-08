import { createLucaLinkDryRunApprovalPath, createLucaLinkDryRunHandoffSteps } from "./dryRunHandoffPlan";
import { evaluateLucaLinkDryRunHandoffPolicy } from "./dryRunHandoffPolicy";
import type { LucaLinkDryRunHandoffInput, LucaLinkDryRunHandoffSimulation, LucaLinkDryRunHandoffSource } from "./dryRunHandoffTypes";

const toIso = (value?: string | number | Date) => value === undefined ? new Date().toISOString() : new Date(value).toISOString();
const safeId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function inferSource(input: LucaLinkDryRunHandoffInput): LucaLinkDryRunHandoffSource {
  if (input.source) return input.source;
  if (input.adapterFileInstallDecision) return "file_install_decision";
  if (input.transportPermissionDecision) return "transport_decision";
  if (input.displayIntent) return "display_intent";
  if (input.sensorSnapshot) return "sensor_snapshot";
  if (input.adapterPlan) return "adapter_plan";
  return "future_runtime";
}

export function createLucaLinkDryRunHandoffSimulation(input: LucaLinkDryRunHandoffInput): LucaLinkDryRunHandoffSimulation {
  const createdAt = toIso(input.now);
  const source = inferSource(input);
  const policy = evaluateLucaLinkDryRunHandoffPolicy(input);
  const approvalPath = createLucaLinkDryRunApprovalPath(input);
  const identity = input.transportPermissionDecision?.decisionId
    ?? input.adapterFileInstallDecision?.decisionId
    ?? input.displayIntent?.sessionId
    ?? input.sensorSnapshot?.snapshotId
    ?? input.adapterPlan?.planId
    ?? input.approvalNotification?.notificationId
    ?? `${input.requestedByHostId ?? "unscoped"}-${input.targetHostId ?? input.targetDeviceId ?? "target"}`;

  return {
    simulationId: `lucalink-dry-run:${safeId(identity)}:${createdAt}`,
    createdAt,
    source,
    status: policy.status,
    riskLevel: policy.riskLevel,
    dryRunOnly: true,
    sideEffectsPerformed: false,
    handoffEnabled: false,
    transportSendEnabled: false,
    adapterExecutionEnabled: false,
    displayOpenEnabled: false,
    sensorCollectionEnabled: false,
    fileWriteEnabled: false,
    installEnabled: false,
    requestedByHostId: input.requestedByHostId ?? input.adapterPlan?.requestedByHostId ?? input.displayIntent?.requestedByHostId,
    targetHostId: input.targetHostId ?? input.adapterPlan?.targetHostId ?? input.displayIntent?.targetHostId ?? input.approvalNotification?.targetHostId ?? input.sensorSnapshot?.hostId,
    targetDeviceId: input.targetDeviceId ?? input.sensorSnapshot?.deviceId ?? input.approvalNotification?.requestedByDeviceId,
    messageClass: input.transportPermissionDecision?.allowedMessageClass,
    transportChannel: input.transportPermissionDecision?.allowedChannel,
    approvalPath,
    simulatedSteps: createLucaLinkDryRunHandoffSteps(policy),
    requiredApprovals: [...new Set([...policy.requiredApprovals, ...approvalPath.requiredApprovals])],
    missingApprovals: [...new Set([...policy.missingApprovals, ...approvalPath.missingApprovals])],
    transportSummary: input.transportPermissionDecision
      ? `Transport ${input.transportPermissionDecision.status}; preview only and never sendable.`
      : "No transport decision supplied; transport send remains disabled.",
    adapterSummary: input.adapterPlan
      ? `Adapter plan ${input.adapterPlan.status}; execution remains disabled.`
      : "No adapter plan supplied; adapter execution remains disabled.",
    displaySummary: input.displayIntent
      ? `Display intent ${input.displayIntent.status}; open and cast remain disabled.`
      : "No display intent supplied; display open and cast remain disabled.",
    sensorSummary: input.sensorSnapshot
      ? `Read-only sensor snapshot ${input.sensorSnapshot.status}; live collection remains disabled.`
      : "No sensor snapshot supplied; sensor collection remains disabled.",
    fileInstallSummary: input.adapterFileInstallDecision
      ? `${input.adapterFileInstallDecision.operation} decision ${input.adapterFileInstallDecision.status}; write and install remain disabled.`
      : "No file/install decision supplied; file write and install remain disabled.",
    blockedActions: policy.blockedActions,
    warnings: policy.warnings,
    blockers: policy.blockers,
  };
}
