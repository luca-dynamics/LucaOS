import { getLucaLinkMessageClassPolicy } from "./transportMessageClassPolicy";
import { getLucaLinkTransportChannelPolicy } from "./transportPermissionPolicy";
import type {
  LucaLinkTransportPermissionDecision,
  LucaLinkTransportPermissionEvaluationOptions,
  LucaLinkTransportPermissionRequest,
  LucaLinkTransportTrustLevel,
} from "./transportPermissionTypes";

const TRUST_RANK: Record<LucaLinkTransportTrustLevel, number> = {
  untrusted: 0,
  guest: 1,
  paired: 2,
  trusted: 3,
  primary: 4,
};
const RISK_RANK = { low: 0, medium: 1, high: 2, critical: 3 } as const;
const SENSITIVE_CONTENT =
  /(?:hidden\s+(?:system\s+)?prompt|private\s+reasoning|chain[- ]of[- ]thought|raw\s+(?:file|memory|database|content)|credential|password|secret|api[-_ ]?key|access[-_ ]?token|refresh[-_ ]?token|session\s+cookie|bearer\s+[a-z0-9._-]+)/i;

export type LucaLinkTransportPermissionRequestInput = Omit<
  LucaLinkTransportPermissionRequest,
  "warnings" | "blockers" | "sideEffectsPerformed"
> & {
  warnings?: readonly string[];
  blockers?: readonly string[];
  sideEffectsPerformed?: false;
};

export function createTransportPermissionRequest(
  input: LucaLinkTransportPermissionRequestInput,
): LucaLinkTransportPermissionRequest {
  return {
    ...input,
    warnings: [...(input.warnings ?? [])],
    blockers: [...(input.blockers ?? [])],
    sideEffectsPerformed: false,
  };
}

function decision(
  request: LucaLinkTransportPermissionRequest,
  status: LucaLinkTransportPermissionDecision["status"],
  reason: string,
  requiredTrustLevel: LucaLinkTransportTrustLevel,
  requiredApprovals: string[],
  warnings: string[],
  blockers: string[],
  requiredSessionKind?: LucaLinkTransportPermissionDecision["requiredSessionKind"],
): LucaLinkTransportPermissionDecision {
  return {
    decisionId: `transport-decision-${request.requestId}`,
    requestId: request.requestId,
    status,
    ...(status === "allowed_preview"
      ? {
          allowedChannel: request.channel,
          allowedMessageClass: request.messageClass,
        }
      : {}),
    requiredApprovals,
    requiredTrustLevel,
    requiredSessionKind,
    reason,
    warnings,
    blockers,
    sideEffectsPerformed: false,
  };
}

export function evaluateLucaLinkTransportPermission(
  request: LucaLinkTransportPermissionRequest,
  options: LucaLinkTransportPermissionEvaluationOptions = {},
): LucaLinkTransportPermissionDecision {
  const channelPolicy = getLucaLinkTransportChannelPolicy(request.channel);
  const messagePolicy = getLucaLinkMessageClassPolicy(request.messageClass);
  const warnings = [...request.warnings, ...channelPolicy.warnings];
  const blockers = [...request.blockers];
  const approvals =
    messagePolicy.approvalRequired || request.requiresApproval
      ? ["explicit_host_approval"]
      : [];
  const now =
    options.now instanceof Date
      ? options.now.getTime()
      : new Date(options.now ?? Date.now()).getTime();

  if (request.sideEffectsPerformed !== false) {
    blockers.push(
      "Transport permission evaluation requires sideEffectsPerformed=false.",
    );
    return decision(
      request,
      "blocked",
      "Requests that report side effects cannot be evaluated as transport previews.",
      messagePolicy.minimumTrustLevel,
      approvals,
      warnings,
      blockers,
      messagePolicy.requiredSessionKind,
    );
  }
  if (new Date(request.expiresAt).getTime() <= now) {
    return decision(
      request,
      "expired",
      "The permission request has expired.",
      messagePolicy.minimumTrustLevel,
      approvals,
      warnings,
      blockers,
      messagePolicy.requiredSessionKind,
    );
  }
  if (!channelPolicy.supportedForPolicyPreview) {
    blockers.push(
      `${request.channel} is not enabled for policy preview or live transport.`,
    );
    return decision(
      request,
      "unsupported",
      channelPolicy.summary,
      channelPolicy.minimumTrustLevel,
      approvals,
      warnings,
      blockers,
      channelPolicy.requiredSessionKind,
    );
  }
  if (
    messagePolicy.alwaysBlocked ||
    request.messageClass === "blocked_sensitive_payload"
  ) {
    blockers.push("This message class is always blocked.");
  }
  if (
    request.privacyLevel === "sensitive" ||
    SENSITIVE_CONTENT.test(request.payloadSummary)
  ) {
    blockers.push(
      "Sensitive, secret, credential, raw, hidden-prompt, or private-reasoning content is blocked.",
    );
  }
  if (
    !channelPolicy.allowedMessageClasses.includes(request.messageClass) ||
    !messagePolicy.allowedChannels.includes(request.channel)
  ) {
    blockers.push(
      `${request.messageClass} is not permitted on ${request.channel}.`,
    );
  }
  if (
    TRUST_RANK[request.trustLevel] <
      TRUST_RANK[channelPolicy.minimumTrustLevel] ||
    TRUST_RANK[request.trustLevel] < TRUST_RANK[messagePolicy.minimumTrustLevel]
  ) {
    blockers.push(
      `Trust level ${request.trustLevel} does not meet the channel and message policy.`,
    );
  }
  const requiredSessionKind =
    channelPolicy.requiredSessionKind ?? messagePolicy.requiredSessionKind;
  if (requiredSessionKind && request.sessionKind !== requiredSessionKind) {
    blockers.push(
      `${request.messageClass} requires a ${requiredSessionKind} session.`,
    );
  }
  if (
    request.channel === "guest_relay" &&
    (request.riskLevel !== "low" ||
      request.messageClass !== "guest_message" ||
      request.sessionKind !== "guest" ||
      request.trustLevel !== "guest")
  ) {
    blockers.push(
      "Guest relay permits only low-risk, guest-scoped guest messages.",
    );
  }
  if (blockers.length > 0) {
    return decision(
      request,
      "blocked",
      "Policy blockers prevent this request from becoming an allowed preview.",
      messagePolicy.minimumTrustLevel,
      approvals,
      warnings,
      blockers,
      requiredSessionKind,
    );
  }

  const channelApprovalRequired =
    channelPolicy.approvalRequiredAtOrAbove !== undefined &&
    RISK_RANK[request.riskLevel] >=
      RISK_RANK[channelPolicy.approvalRequiredAtOrAbove];
  const privateApprovalRequired = request.privacyLevel === "private";
  if (privateApprovalRequired && !options.explicitApprovalMetadata) {
    approvals.push("explicit_private_content_approval");
  }
  if (
    messagePolicy.approvalRequired ||
    request.requiresApproval ||
    channelApprovalRequired ||
    privateApprovalRequired
  ) {
    const approvalComplete =
      request.approvalSatisfied &&
      (!privateApprovalRequired || options.explicitApprovalMetadata === true);
    if (!approvalComplete) {
      return decision(
        request,
        "approval_required",
        "Explicit approval metadata is required before this request can become an allowed preview.",
        messagePolicy.minimumTrustLevel,
        Array.from(new Set(approvals)),
        warnings,
        [],
        requiredSessionKind,
      );
    }
  }

  return decision(
    request,
    "allowed_preview",
    "Policy evaluation allows a side-effect-free preview only; no message was sent.",
    messagePolicy.minimumTrustLevel,
    Array.from(new Set(approvals)),
    warnings,
    [],
    requiredSessionKind,
  );
}

export function createTransportPermissionDecision(
  request: LucaLinkTransportPermissionRequest,
  options: LucaLinkTransportPermissionEvaluationOptions = {},
): LucaLinkTransportPermissionDecision {
  return evaluateLucaLinkTransportPermission(request, options);
}

export function summarizeTransportPermissionDecision(
  value: LucaLinkTransportPermissionDecision,
): string {
  return `${value.status}: ${value.reason} Side effects performed: false.`;
}

export interface TransportSendableOptions {
  /**
   * Live transport ships dark. Callers must pass an explicit runtime opt-in
   * (sourced from the user-facing setting) for a decision to become sendable;
   * without it every decision stays preview-only, exactly as before.
   */
  liveTransportEnabled?: boolean;
}

export function isTransportDecisionSendable(
  decision: LucaLinkTransportPermissionDecision,
  options: TransportSendableOptions = {},
): boolean {
  if (options.liveTransportEnabled !== true) return false;
  return decision.status === "allowed_preview";
}

interface DisplayIntentModel {
  sessionId: string;
  requestedByHostId: string;
  targetHostId: string;
  title: string;
  contentKind: string;
  riskLevel: "low" | "medium" | "high";
  createdAt: string;
  expiresAt: string;
  privacyLevel: "public" | "project" | "private";
  warnings: string[];
  blockers: string[];
}
interface SensorSnapshotModel {
  snapshotId: string;
  hostId: string;
  capturedAt: string;
  expiresAt: string;
  privacyLevel: "public" | "project" | "private";
  sensorKinds: string[];
  warnings: string[];
  blockers: string[];
  readOnly: true;
  sideEffectsPerformed: false;
}
interface ApprovalNotificationModel {
  notificationId: string;
  createdAt: number;
  expiresAt: number;
  requestedByDeviceId?: string;
  targetHostId?: string;
  title: string;
  summary: string;
  risk: "low" | "medium" | "high" | "critical";
  warnings: string[];
  errors: string[];
  sideEffectsPerformed: false;
}
interface AdapterPlanModel {
  planId: string;
  adapterId: string;
  requestedByHostId: string;
  targetHostId: string;
  requestedCapabilities: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

interface ConversionOptions {
  channel?: LucaLinkTransportPermissionRequest["channel"];
  trustLevel?: LucaLinkTransportPermissionRequest["trustLevel"];
  approvalSatisfied?: boolean;
}

export function createTransportPermissionRequestFromDisplayIntent(
  intent: DisplayIntentModel,
  options: ConversionOptions = {},
): LucaLinkTransportPermissionRequest {
  return createTransportPermissionRequest({
    requestId: `transport-${intent.sessionId}`,
    createdAt: intent.createdAt,
    requestedByHostId: intent.requestedByHostId,
    targetHostId: intent.targetHostId,
    channel: options.channel ?? "local_only",
    messageClass: "display_intent",
    riskLevel: intent.riskLevel,
    trustLevel: options.trustLevel ?? "trusted",
    sessionKind: "display",
    requiresApproval: true,
    approvalSatisfied: options.approvalSatisfied ?? false,
    payloadSummary: `${intent.title}; ${intent.contentKind}; display preview only`,
    privacyLevel: intent.privacyLevel,
    expiresAt: intent.expiresAt,
    warnings: intent.warnings,
    blockers: intent.blockers,
  });
}

export function createTransportPermissionRequestFromSensorSnapshot(
  snapshot: SensorSnapshotModel,
  options: ConversionOptions = {},
): LucaLinkTransportPermissionRequest {
  return createTransportPermissionRequest({
    requestId: `transport-${snapshot.snapshotId}`,
    createdAt: snapshot.capturedAt,
    requestedByHostId: snapshot.hostId,
    channel: options.channel ?? "local_only",
    messageClass: "sensor_snapshot",
    riskLevel: "low",
    trustLevel: options.trustLevel ?? "paired",
    sessionKind: "sensor",
    requiresApproval: snapshot.privacyLevel === "private",
    approvalSatisfied: options.approvalSatisfied ?? false,
    payloadSummary: `Read-only sensor metadata: ${snapshot.sensorKinds.join(", ") || "none"}`,
    privacyLevel: snapshot.privacyLevel,
    expiresAt: snapshot.expiresAt,
    warnings: snapshot.warnings,
    blockers: snapshot.blockers,
  });
}

export function createTransportPermissionRequestFromApprovalNotification(
  notification: ApprovalNotificationModel,
  options: ConversionOptions = {},
): LucaLinkTransportPermissionRequest {
  return createTransportPermissionRequest({
    requestId: `transport-${notification.notificationId}`,
    createdAt: new Date(notification.createdAt).toISOString(),
    requestedByHostId:
      notification.requestedByDeviceId ?? "unknown-requesting-host",
    targetHostId: notification.targetHostId,
    channel: options.channel ?? "relay",
    messageClass: "approval_notification",
    riskLevel: notification.risk,
    trustLevel: options.trustLevel ?? "trusted",
    sessionKind: "companion",
    requiresApproval: false,
    approvalSatisfied: options.approvalSatisfied ?? false,
    payloadSummary: `${notification.title}; ${notification.summary}`,
    privacyLevel: "project",
    expiresAt: new Date(notification.expiresAt).toISOString(),
    warnings: notification.warnings,
    blockers: notification.errors,
  });
}

export function createTransportPermissionRequestFromAdapterPlan(
  plan: AdapterPlanModel,
  options: ConversionOptions = {},
): LucaLinkTransportPermissionRequest {
  return createTransportPermissionRequest({
    requestId: `transport-${plan.planId}`,
    createdAt: new Date(0).toISOString(),
    requestedByHostId: plan.requestedByHostId,
    targetHostId: plan.targetHostId,
    channel: options.channel ?? "local_only",
    messageClass: "adapter_plan",
    riskLevel: plan.riskLevel,
    trustLevel: options.trustLevel ?? "trusted",
    sessionKind: "adapter",
    requiresApproval: true,
    approvalSatisfied: options.approvalSatisfied ?? false,
    payloadSummary: `Adapter plan for ${plan.adapterId}; capabilities: ${plan.requestedCapabilities.join(", ")}`,
    privacyLevel: "project",
    expiresAt: new Date(8640000000000000).toISOString(),
    warnings: plan.warnings,
    blockers: plan.blockers,
  });
}
