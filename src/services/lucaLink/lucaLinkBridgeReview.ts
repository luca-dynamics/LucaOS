/** Pure model-only bridge blueprint review for sandbox/static-check preparation. */
import type { LucaLinkHostBridgeBlueprint } from "./lucaLinkHostAdaptation";

export type LucaLinkBridgeReviewStatus =
  | "draft"
  | "pending-review"
  | "approved-for-sandbox"
  | "rejected"
  | "blocked"
  | "sandbox-ready"
  | "expired"
  | "cancelled";
export type LucaLinkBridgeReviewDecision =
  | "allow-review"
  | "require-primary-host-approval"
  | "approve-for-sandbox-only"
  | "reject"
  | "block"
  | "invalid";
export interface LucaLinkBridgeStaticCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail" | "not-run";
  explain: string;
}
export interface LucaLinkBridgeSandboxPlan {
  id: string;
  steps: string[];
  allowedOperations: string[];
  deniedOperations: string[];
  requiresNetworkIsolation: boolean;
  requiresFileSystemIsolation: boolean;
  requiresHumanReview: boolean;
}
export interface LucaLinkBridgeReviewRecord {
  id: string;
  blueprintId: string;
  strategyKind: string;
  title: string;
  summary: string;
  status: LucaLinkBridgeReviewStatus;
  decision: LucaLinkBridgeReviewDecision;
  risk: "low" | "medium" | "high" | "critical";
  requiresPrimaryHostApproval: boolean;
  requiresSandbox: boolean;
  approvedByDeviceId?: string;
  blueprintSummary: string;
  pseudoCodePreview?: string;
  configPreview?: Record<string, unknown>;
  staticChecks: LucaLinkBridgeStaticCheck[];
  sandboxPlan: LucaLinkBridgeSandboxPlan;
  warnings: string[];
  errors: string[];
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}
export interface LucaLinkBridgeReviewRegistry {
  records: LucaLinkBridgeReviewRecord[];
  maxRecords: number;
}
export interface LucaLinkBridgeReviewSummary {
  total: number;
  pendingReview: number;
  approvedForSandbox: number;
  sandboxReady: number;
  rejected: number;
  blocked: number;
  cancelled: number;
  byRisk: Record<"low" | "medium" | "high" | "critical", number>;
  warnings: string[];
  errors: string[];
}

const TTL = 24 * 60 * 60 * 1000;
const UNSAFE = [
  "credential bypass",
  "bypass credentials",
  "defeat authentication",
  "unauthorized access",
  "exploit",
  "stealth",
  "persistence",
  "malware",
  "scrape secrets",
  "payment execution",
  "physical actuation",
  "run generated code",
  "write files",
  "open sockets",
];
const CODE_KINDS = [
  "python-host-agent",
  "node-host-adapter",
  "electron-host-adapter",
];
const READ_ONLY_KINDS = [
  "iot-api-bridge",
  "mqtt-bridge",
  "matter-like-bridge",
  "ros-sensor-bridge",
  "serial-sensor-bridge",
];
function text(input: unknown): string {
  return JSON.stringify(input ?? {}).toLowerCase();
}
function unsafe(input: unknown): boolean {
  const t = text(input);
  return UNSAFE.some((term) => t.includes(term));
}
function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function createLucaLinkBridgeReviewRegistry(
  maxRecords = 100,
): LucaLinkBridgeReviewRegistry {
  return { records: [], maxRecords };
}

export function evaluateLucaLinkBridgeBlueprintForReview(
  blueprint: Partial<LucaLinkHostBridgeBlueprint>,
): Pick<
  LucaLinkBridgeReviewRecord,
  | "status"
  | "decision"
  | "risk"
  | "requiresPrimaryHostApproval"
  | "requiresSandbox"
  | "staticChecks"
  | "sandboxPlan"
  | "warnings"
  | "errors"
> {
  const kind = blueprint.strategyKind ?? "unsupported";
  const warnings = [...(blueprint.warnings ?? [])];
  const errors = [...(blueprint.errors ?? [])];
  const blocked =
    unsafe(blueprint) ||
    kind === "unsupported" ||
    blueprint.generatedProgramLanguage === "shell" ||
    text(blueprint).includes("motion command");
  if (blueprint.generatedProgramAllowed)
    warnings.push(
      "Generated program allowance still requires Primary Host approval and sandbox preparation only.",
    );
  if (READ_ONLY_KINDS.includes(kind))
    warnings.push(
      "IoT, MQTT, Matter, ROS, and Serial bridge reviews are read-only by default.",
    );
  if (kind === "ros-sensor-bridge" && text(blueprint).includes("motion"))
    errors.push("ROS/embodied motion is blocked for this review layer.");
  const requiresSandbox =
    blueprint.requiresSandbox ||
    blueprint.generatedProgramAllowed ||
    CODE_KINDS.includes(kind) ||
    READ_ONLY_KINDS.includes(kind);
  const requiresPrimaryHostApproval =
    blueprint.requiresPrimaryHostApproval ||
    requiresSandbox ||
    blueprint.generatedProgramAllowed ||
    (blueprint.risk ?? "medium") !== "low";
  const staticChecks: LucaLinkBridgeStaticCheck[] = [
    {
      id: "no-execution",
      label: "No execution",
      status: "pass",
      explain: "Review approval does not execute generated adapters.",
    },
    {
      id: "no-install",
      label: "No install",
      status: "pass",
      explain:
        "Review approval does not install adapters or write generated files.",
    },
    {
      id: "unsafe-content",
      label: "Unsafe content",
      status: blocked ? "fail" : "pass",
      explain: blocked
        ? "Unsafe bridge intent was detected."
        : "No credential bypass, exploit, stealth, persistence, or unauthorized-access intent detected.",
    },
    {
      id: "sandbox-required",
      label: "Sandbox required",
      status: requiresSandbox ? "warn" : "pass",
      explain: requiresSandbox
        ? "Static checks and isolated sandbox preparation are required before any future execution layer."
        : "Config-only review can remain sandbox-ready.",
    },
  ];
  const sandboxPlan: LucaLinkBridgeSandboxPlan = {
    id: `sandbox-plan-${blueprint.id ?? kind}`,
    steps: [
      "Human review",
      "Static capability check",
      "Confirm Primary Host approval path",
      "Prepare isolated non-network sandbox plan",
    ],
    allowedOperations: [
      "read blueprint",
      "render pseudocode",
      "render config sketch",
      "record sandbox checklist",
    ],
    deniedOperations: [
      "execute adapter",
      "install adapter",
      "write generated files",
      "open sockets",
      "send to host",
      "probe live network",
      "control devices",
    ],
    requiresNetworkIsolation: requiresSandbox,
    requiresFileSystemIsolation: requiresSandbox,
    requiresHumanReview: true,
  };
  return {
    status: blocked
      ? "blocked"
      : kind === "web-display-bridge"
        ? "sandbox-ready"
        : "pending-review",
    decision: blocked
      ? "block"
      : requiresPrimaryHostApproval
        ? "require-primary-host-approval"
        : "allow-review",
    risk: blocked ? "critical" : (blueprint.risk ?? "medium"),
    requiresPrimaryHostApproval,
    requiresSandbox,
    staticChecks,
    sandboxPlan,
    warnings: unique(warnings),
    errors: unique(errors),
  };
}

export function createLucaLinkBridgeReviewRecord(
  blueprint: Partial<LucaLinkHostBridgeBlueprint>,
  options: { now?: number; ttlMs?: number } = {},
): LucaLinkBridgeReviewRecord {
  const now = options.now ?? Date.now();
  const evaluation = evaluateLucaLinkBridgeBlueprintForReview(blueprint);
  return {
    id: `bridge-review-${blueprint.id ?? now}`,
    blueprintId: blueprint.id ?? `blueprint-${now}`,
    strategyKind: blueprint.strategyKind ?? "unsupported",
    title: `Bridge review: ${blueprint.title ?? blueprint.strategyKind ?? "Unsupported blueprint"}`,
    summary:
      evaluation.status === "blocked"
        ? "Bridge blueprint is blocked by static safety review."
        : "Bridge blueprint is reviewable for sandbox/static-check preparation only.",
    status: evaluation.status,
    decision: evaluation.decision,
    risk: evaluation.risk,
    requiresPrimaryHostApproval: evaluation.requiresPrimaryHostApproval,
    requiresSandbox: evaluation.requiresSandbox,
    blueprintSummary: blueprint.summary ?? "No blueprint summary provided.",
    pseudoCodePreview: blueprint.pseudoCode,
    configPreview: blueprint.configSketch,
    staticChecks: evaluation.staticChecks,
    sandboxPlan: evaluation.sandboxPlan,
    warnings: evaluation.warnings,
    errors: evaluation.errors,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + (options.ttlMs ?? TTL),
  };
}

export function approveBridgeReviewForSandbox(
  review: LucaLinkBridgeReviewRecord,
  options: { now?: number; approvedByDeviceId?: string } = {},
): LucaLinkBridgeReviewRecord {
  if (review.status === "blocked")
    return {
      ...review,
      decision: "block",
      warnings: unique([
        ...review.warnings,
        "Blocked bridge reviews cannot be approved for sandbox.",
      ]),
    };
  const now = options.now ?? Date.now();
  return {
    ...review,
    status: "approved-for-sandbox",
    decision: "approve-for-sandbox-only",
    approvedByDeviceId: options.approvedByDeviceId,
    updatedAt: now,
    warnings: unique([
      ...review.warnings,
      "Approval for sandbox does not execute, install, write files, open sockets, or connect the adapter.",
    ]),
  };
}
export function rejectBridgeReview(
  review: LucaLinkBridgeReviewRecord,
  options: { now?: number; reason?: string } = {},
): LucaLinkBridgeReviewRecord {
  return {
    ...review,
    status: "rejected",
    decision: "reject",
    updatedAt: options.now ?? Date.now(),
    warnings: unique([
      ...review.warnings,
      options.reason ?? "Bridge review rejected.",
    ]),
  };
}
export function cancelBridgeReview(
  review: LucaLinkBridgeReviewRecord,
  options: { now?: number; reason?: string } = {},
): LucaLinkBridgeReviewRecord {
  return {
    ...review,
    status: "cancelled",
    decision: "reject",
    updatedAt: options.now ?? Date.now(),
    warnings: unique([
      ...review.warnings,
      options.reason ?? "Bridge review cancelled.",
    ]),
  };
}
export function summarizeBridgeReviews(
  reviews: LucaLinkBridgeReviewRecord[],
): LucaLinkBridgeReviewSummary {
  const byRisk = { low: 0, medium: 0, high: 0, critical: 0 };
  reviews.forEach((r) => {
    byRisk[r.risk] += 1;
  });
  return {
    total: reviews.length,
    pendingReview: reviews.filter((r) => r.status === "pending-review").length,
    approvedForSandbox: reviews.filter(
      (r) => r.status === "approved-for-sandbox",
    ).length,
    sandboxReady: reviews.filter((r) => r.status === "sandbox-ready").length,
    rejected: reviews.filter((r) => r.status === "rejected").length,
    blocked: reviews.filter((r) => r.status === "blocked").length,
    cancelled: reviews.filter((r) => r.status === "cancelled").length,
    byRisk,
    warnings: reviews.flatMap((r) => r.warnings),
    errors: reviews.flatMap((r) => r.errors),
  };
}
export function registerBridgeReview(
  registry: LucaLinkBridgeReviewRegistry,
  review: LucaLinkBridgeReviewRecord,
): LucaLinkBridgeReviewRecord {
  registry.records = [
    review,
    ...registry.records.filter((r) => r.id !== review.id),
  ].slice(0, registry.maxRecords);
  return review;
}
export function updateBridgeReview(
  registry: LucaLinkBridgeReviewRegistry,
  review: LucaLinkBridgeReviewRecord,
): LucaLinkBridgeReviewRecord | undefined {
  const index = registry.records.findIndex((r) => r.id === review.id);
  if (index === -1) return undefined;
  registry.records[index] = review;
  return review;
}
export function getBridgeReview(
  registry: LucaLinkBridgeReviewRegistry,
  id: string,
): LucaLinkBridgeReviewRecord | undefined {
  return registry.records.find((r) => r.id === id);
}
export function listBridgeReviews(
  registry: LucaLinkBridgeReviewRegistry,
): LucaLinkBridgeReviewRecord[] {
  return [...registry.records];
}
