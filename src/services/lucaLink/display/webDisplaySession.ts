import type { LucaLinkAdapterExecutionPlan } from "../adapters/adapterSandboxTypes";
import { evaluateLucaLinkWebDisplayBridgePolicy } from "./webDisplayBridgePolicy";
import {
  LUCA_LINK_WEB_DISPLAY_CONTENT_KINDS,
  type LucaLinkWebDisplayContentKind,
  type LucaLinkWebDisplayPrivacyLevel,
  type LucaLinkWebDisplayRiskLevel,
  type LucaLinkWebDisplaySessionApproval,
  type LucaLinkWebDisplaySessionIntent,
} from "./webDisplayBridgeTypes";

export interface CreateLucaLinkWebDisplaySessionIntentInput {
  sessionId?: string;
  requestedByHostId: string;
  targetHostId: string;
  title: string;
  urlPreview?: string;
  contentKind: LucaLinkWebDisplayContentKind;
  riskLevel?: LucaLinkWebDisplayRiskLevel;
  createdAt?: string;
  expiresAt?: string;
  privacyLevel?: LucaLinkWebDisplayPrivacyLevel;
  blockers?: string[];
  warnings?: string[];
}

export interface CreateDisplayBridgeIntentFromAdapterPlanOptions {
  sessionId?: string;
  title?: string;
  urlPreview?: string;
  contentKind?: LucaLinkWebDisplayContentKind;
  privacyLevel?: LucaLinkWebDisplayPrivacyLevel;
  createdAt?: string;
  expiresAt?: string;
}

function safeId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-|-$/g, "");
}

function defaultExpiry(createdAt: string): string {
  return new Date(new Date(createdAt).getTime() + 15 * 60 * 1000).toISOString();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function createLucaLinkWebDisplaySessionIntent(
  input: CreateLucaLinkWebDisplaySessionIntentInput,
): LucaLinkWebDisplaySessionIntent {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    sessionId:
      input.sessionId ??
      `display-session-${safeId(input.requestedByHostId)}-${safeId(input.targetHostId)}-${new Date(createdAt).getTime()}`,
    requestedByHostId: input.requestedByHostId,
    targetHostId: input.targetHostId,
    title: input.title.trim(),
    urlPreview: input.urlPreview?.trim() || undefined,
    contentKind: input.contentKind,
    requestedCapability: "display.present",
    status: "approval_required",
    riskLevel: input.riskLevel ?? "low",
    createdAt,
    expiresAt: input.expiresAt ?? defaultExpiry(createdAt),
    privacyLevel: input.privacyLevel ?? "project",
    hostApprovalRequired: true,
    sideEffectsPerformed: false,
    blockers: unique(input.blockers ?? []),
    warnings: unique(input.warnings ?? []),
  };
}

export function validateLucaLinkWebDisplaySessionIntent(
  intent: LucaLinkWebDisplaySessionIntent,
): { valid: boolean; blockers: string[]; warnings: string[] } {
  const blockers: string[] = [];
  if (!intent.sessionId.trim()) blockers.push("sessionId is required.");
  if (!intent.requestedByHostId.trim()) blockers.push("requestedByHostId is required.");
  if (!intent.targetHostId.trim()) blockers.push("targetHostId is required.");
  if (!intent.title.trim()) blockers.push("title is required.");
  if (!LUCA_LINK_WEB_DISPLAY_CONTENT_KINDS.includes(intent.contentKind)) {
    blockers.push("contentKind is not supported.");
  }
  if (intent.requestedCapability !== "display.present") {
    blockers.push("requestedCapability must be display.present.");
  }
  if (intent.hostApprovalRequired !== true) {
    blockers.push("Host approval must be required.");
  }
  if (intent.sideEffectsPerformed !== false) {
    blockers.push("Display bridge intents cannot perform side effects.");
  }
  if (Number.isNaN(new Date(intent.createdAt).getTime())) blockers.push("createdAt is invalid.");
  if (Number.isNaN(new Date(intent.expiresAt).getTime())) blockers.push("expiresAt is invalid.");

  const policy = evaluateLucaLinkWebDisplayBridgePolicy(intent, {
    now: intent.createdAt,
  });
  blockers.push(...policy.blockers);
  return {
    valid: unique(blockers).length === 0,
    blockers: unique(blockers),
    warnings: unique([...intent.warnings, ...policy.warnings]),
  };
}

export function expireLucaLinkWebDisplaySessionIntent(
  intent: LucaLinkWebDisplaySessionIntent,
  now: string | Date = new Date(),
): LucaLinkWebDisplaySessionIntent {
  if (new Date(intent.expiresAt).getTime() > new Date(now).getTime()) return intent;
  return {
    ...intent,
    status: "expired",
    blockers: unique([...intent.blockers, "Display session intent has expired."]),
    sideEffectsPerformed: false,
  };
}

export function markLucaLinkWebDisplaySessionApprovedForPreview(
  intent: LucaLinkWebDisplaySessionIntent,
  approval: LucaLinkWebDisplaySessionApproval,
): LucaLinkWebDisplaySessionIntent {
  const expired = expireLucaLinkWebDisplaySessionIntent(
    intent,
    approval.approvedAt,
  );
  if (expired.status === "expired" || expired.status === "blocked") {
    return expired;
  }
  if (!approval.approvedByHostId.trim()) {
    return blockLucaLinkWebDisplaySession(intent, "Approving host id is required.");
  }
  if (intent.privacyLevel === "private" && !approval.explicitPrivateApproval) {
    return blockLucaLinkWebDisplaySession(
      intent,
      "Private display content requires explicit host approval.",
    );
  }

  const policy = evaluateLucaLinkWebDisplayBridgePolicy(intent, {
    now: approval.approvedAt,
    explicitPrivateApproval: approval.explicitPrivateApproval,
  });
  if (policy.status === "blocked" || policy.status === "expired") {
    return {
      ...intent,
      status: policy.status,
      blockers: policy.blockers,
      warnings: policy.warnings,
      sideEffectsPerformed: false,
    };
  }
  return {
    ...intent,
    status: "approved_preview",
    warnings: policy.warnings,
    sideEffectsPerformed: false,
  };
}

export function blockLucaLinkWebDisplaySession(
  intent: LucaLinkWebDisplaySessionIntent,
  reason: string,
): LucaLinkWebDisplaySessionIntent {
  return {
    ...intent,
    status: "blocked",
    blockers: unique([...intent.blockers, reason]),
    sideEffectsPerformed: false,
  };
}

export function createDisplayBridgeIntentFromAdapterPlan(
  plan: LucaLinkAdapterExecutionPlan,
  options: CreateDisplayBridgeIntentFromAdapterPlanOptions = {},
): LucaLinkWebDisplaySessionIntent {
  const supportsDisplay = plan.requestedCapabilities.includes("display.present");
  const planBlocked = plan.status === "blocked" || plan.status === "rejected";
  const intent = createLucaLinkWebDisplaySessionIntent({
    sessionId: options.sessionId ?? `display-session-${safeId(plan.planId)}`,
    requestedByHostId: plan.requestedByHostId,
    targetHostId: plan.targetHostId,
    title: options.title ?? `Display preview for ${plan.adapterId}`,
    urlPreview: options.urlPreview,
    contentKind: options.contentKind ?? "presentation",
    riskLevel: plan.riskLevel === "critical" ? "high" : plan.riskLevel,
    privacyLevel: options.privacyLevel,
    createdAt: options.createdAt,
    expiresAt: options.expiresAt,
    blockers: [
      ...plan.blockers,
      ...(!supportsDisplay
        ? ["Adapter plan did not request display.present."]
        : []),
      ...(planBlocked ? [`Adapter plan is ${plan.status}.`] : []),
    ],
    warnings: [
      ...plan.warnings,
      "Adapter approval does not grant display execution or open a display.",
    ],
  });

  return intent.blockers.length > 0
    ? { ...intent, status: "blocked", sideEffectsPerformed: false }
    : { ...intent, status: "approval_required", sideEffectsPerformed: false };
}
