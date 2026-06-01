/**
 * LucaLink Host Mesh — Trust & Permission Policy (PR #184)
 *
 * Pure, runtime-safe policy evaluator for LucaLink Mesh. Given a
 * {@link LucaHostManifest}, it returns structured allow / deny /
 * requires-primary-host-approval decisions for permissions and sync lanes.
 *
 * It builds on:
 * - PR #182 vocabularies (`lucaLinkArchitectureMap.ts`): permission risk bands,
 *   sync lanes.
 * - PR #183 manifest layer (`lucaHostManifest.ts` / `capabilityRegistry.ts`):
 *   host role, trust level, granted permissions, `requiresApprovalFor`.
 *
 * HARD CONSTRAINTS (do not violate when editing this file):
 * - ADDITIVE + POLICY ONLY. This module evaluates policy; it does NOT enforce
 *   it. Policy evaluation is added here; runtime enforcement (wiring into real
 *   send/receive/execute flows) is introduced in follow-up PRs.
 * - No network calls, no socket calls, no storage writes, no UI coupling.
 * - No side effects at module import — pure functions + frozen data only.
 * - Vocabularies are imported from the architecture map / manifest layer so
 *   policy stays in parity with PR #182/#183.
 */

import {
  lucaLinkPermissionCategories,
  lucaLinkSyncLanes,
  type LucaLinkPermissionCategory,
  type LucaLinkPermissionDescriptor,
  type LucaLinkSyncLaneId,
} from "./lucaLinkArchitectureMap";
import type { LucaHostManifest, LucaHostRole } from "./lucaHostManifest";

// ===========================================================================
// Result types
// ===========================================================================

export type LucaLinkPolicyDecision =
  | "allow"
  | "deny"
  | "requires-primary-host-approval";

export type LucaLinkPolicyReason =
  | "permission-granted"
  | "permission-missing"
  | "trust-level-too-low"
  | "role-not-allowed"
  | "high-risk-requires-approval"
  | "critical-risk-requires-approval"
  | "guest-restricted"
  | "embodied-safety-restricted"
  | "expired-trust"
  | "unknown-permission"
  | "unknown-lane"
  | "policy-not-enforced-yet";

export type LucaLinkRiskLevel = "low" | "medium" | "high" | "critical";

export interface LucaLinkPolicyEvaluation {
  decision: LucaLinkPolicyDecision;
  reason: LucaLinkPolicyReason;
  permission?: LucaLinkPermissionCategory;
  risk?: LucaLinkRiskLevel;
  requiresApproval: boolean;
  explain: string;
}

export interface LucaLinkLaneEvaluation {
  decision: LucaLinkPolicyDecision;
  reason: LucaLinkPolicyReason;
  laneId?: LucaLinkSyncLaneId;
  requiresApproval: boolean;
  /** Per-required-permission breakdown (empty for permissionless lanes). */
  permissionResults: LucaLinkPolicyEvaluation[];
  explain: string;
}

export interface LucaLinkPolicyOptions {
  /** True when evaluating the local/current Primary Host (or local execution) host. */
  isPrimaryHost?: boolean;
  /** Permit critical-risk permissions for the local Primary Host/execution host. */
  allowCriticalForPrimaryHost?: boolean;
  /** Permit high-risk permissions for admin (and local execution) hosts. */
  allowHighRiskForAdmin?: boolean;
  /** Clock override for deterministic tests. */
  now?: number;
}

export interface LucaLinkManifestPolicySummary {
  hostRole: LucaHostRole;
  trustLevel: LucaHostManifest["trust"]["trustLevel"];
  expired: boolean;
  permissions: LucaLinkPolicyEvaluation[];
  lanes: LucaLinkLaneEvaluation[];
}

// ===========================================================================
// Permission descriptor / risk helpers
// ===========================================================================

const PERMISSION_DESCRIPTORS: ReadonlyMap<
  LucaLinkPermissionCategory,
  LucaLinkPermissionDescriptor
> = new Map(lucaLinkPermissionCategories.map((p) => [p.id, p]));

export function getPermissionDescriptor(
  permission: LucaLinkPermissionCategory,
): LucaLinkPermissionDescriptor | undefined {
  return PERMISSION_DESCRIPTORS.get(permission);
}

export function getPermissionRisk(
  permission: LucaLinkPermissionCategory,
): LucaLinkRiskLevel | undefined {
  return PERMISSION_DESCRIPTORS.get(permission)?.risk;
}

export function isKnownPermission(
  permission: string,
): permission is LucaLinkPermissionCategory {
  return PERMISSION_DESCRIPTORS.has(permission as LucaLinkPermissionCategory);
}

export function isPermissionGranted(
  manifest: LucaHostManifest,
  permission: LucaLinkPermissionCategory,
): boolean {
  return manifest.trust.permissions.includes(permission);
}

function isTrustExpired(
  manifest: LucaHostManifest,
  now: number,
): boolean {
  const { expiresAt } = manifest.trust;
  return typeof expiresAt === "number" && expiresAt < now;
}

// ===========================================================================
// Permission classification model
// ===========================================================================

/**
 * Dangerous *action* permissions — tool execution, code/file mutation, PR
 * creation, memory authority, physical actuation, and spending. These are
 * gated behind approval/deny regardless of risk band, separately from benign
 * perception/IO permissions (camera/screen/voice/location/notification/chat),
 * which can be auto-allowed for role-appropriate hosts even when their risk
 * band is "high".
 */
const TOOL_EXEC_PERMISSIONS: ReadonlySet<LucaLinkPermissionCategory> = new Set([
  "shell.execute",
  "browser.control",
  "files.write",
  "code.modify",
  "git.create_pr",
]);
const PHYSICAL_PERMISSIONS: ReadonlySet<LucaLinkPermissionCategory> = new Set([
  "robotics.motion",
  "smart_home.control",
]);

/** How a role treats a granted *dangerous* permission. */
type DangerousHandling = "approval" | "deny";

interface RolePolicy {
  /** Benign (non-dangerous) permissions this role may auto-use if granted. */
  benignAllowed: ReadonlySet<LucaLinkPermissionCategory>;
  /** Per dangerous-permission handling; default applied when not listed. */
  dangerous: Partial<Record<LucaLinkPermissionCategory, DangerousHandling>>;
  dangerousDefault: DangerousHandling;
}

const PERCEPTION_AND_IO: readonly LucaLinkPermissionCategory[] = [
  "chat.send",
  "chat.receive",
  "voice.capture",
  "voice.playback",
  "camera.capture",
  "screen.capture",
  "location.read",
  "notification.send",
  "memory.read",
  "settings.sync",
  "files.read",
];

const ROLE_POLICIES: Readonly<Record<LucaHostRole, RolePolicy>> = {
  guest: {
    benignAllowed: new Set(["chat.send", "chat.receive"]),
    dangerous: {},
    dangerousDefault: "deny",
  },
  companion: {
    benignAllowed: new Set(PERCEPTION_AND_IO),
    // Companion may *request* memory writes, but only under Primary Host approval.
    dangerous: { "memory.write": "approval" },
    dangerousDefault: "deny",
  },
  sensor: {
    benignAllowed: new Set(["voice.capture", "camera.capture", "location.read"]),
    dangerous: {},
    dangerousDefault: "deny",
  },
  display: {
    benignAllowed: new Set(["chat.receive", "notification.send"]),
    dangerous: {},
    dangerousDefault: "deny",
  },
  execution: {
    benignAllowed: new Set(PERCEPTION_AND_IO),
    // Execution never owns memory.write by default; tool perms need approval.
    dangerous: {
      "memory.write": "deny",
      "shell.execute": "approval",
      "browser.control": "approval",
      "files.write": "approval",
      "code.modify": "approval",
      "git.create_pr": "approval",
    },
    dangerousDefault: "deny",
  },
  primary: {
    benignAllowed: new Set([...PERCEPTION_AND_IO]),
    dangerous: {},
    dangerousDefault: "approval",
  },
  embodied: {
    benignAllowed: new Set([
      "chat.send",
      "chat.receive",
      "voice.capture",
      "voice.playback",
      "camera.capture",
      "screen.capture",
      "location.read",
      "notification.send",
      "memory.read",
    ]),
    // Physical actuation always needs Primary Host approval; tools/spend denied.
    dangerous: {
      "robotics.motion": "approval",
      "smart_home.control": "approval",
    },
    dangerousDefault: "deny",
  },
};

function isDangerousPermission(
  permission: LucaLinkPermissionCategory,
): boolean {
  return (
    TOOL_EXEC_PERMISSIONS.has(permission) ||
    PHYSICAL_PERMISSIONS.has(permission) ||
    permission === "memory.write" ||
    permission === "payment.spend"
  );
}

// ===========================================================================
// Evaluation construction helpers
// ===========================================================================

const REASON_TEXT: Record<LucaLinkPolicyReason, string> = {
  "permission-granted": "Permission granted for this host.",
  "permission-missing": "Host has not been granted this permission.",
  "trust-level-too-low": "Host trust level is too low for this permission.",
  "role-not-allowed": "This host role may not use this permission.",
  "high-risk-requires-approval":
    "High-risk permission requires explicit Primary Host approval.",
  "critical-risk-requires-approval":
    "Critical-risk permission requires explicit Primary Host approval.",
  "guest-restricted": "Guest hosts are limited to chat only.",
  "embodied-safety-restricted":
    "Physical-world action on an embodied host requires Primary Host approval.",
  "expired-trust": "Trust grant expired.",
  "unknown-permission": "Unknown permission category.",
  "unknown-lane": "Unknown sync lane.",
  "policy-not-enforced-yet":
    "Policy evaluated only; runtime enforcement lands in a follow-up PR.",
};

function evaluation(
  decision: LucaLinkPolicyDecision,
  reason: LucaLinkPolicyReason,
  permission: LucaLinkPermissionCategory | undefined,
  risk: LucaLinkRiskLevel | undefined,
): LucaLinkPolicyEvaluation {
  return {
    decision,
    reason,
    permission,
    risk,
    requiresApproval: decision === "requires-primary-host-approval",
    explain: REASON_TEXT[reason],
  };
}

/**
 * Decide whether a granted dangerous permission is allowed, requires approval,
 * or (via elevation) may be allowed for trusted local hosts. Conservative by
 * default: critical/high require approval unless an explicit option elevates.
 */
function decideDangerous(
  manifest: LucaHostManifest,
  permission: LucaLinkPermissionCategory,
  risk: LucaLinkRiskLevel,
  options: LucaLinkPolicyOptions,
): LucaLinkPolicyEvaluation {
  const role = manifest.hostRole;
  const isPrimaryHost = options.isPrimaryHost === true;
  const approvalReason: LucaLinkPolicyReason =
    risk === "critical"
      ? "critical-risk-requires-approval"
      : "high-risk-requires-approval";

  // Embodied physical actuation is always surfaced as a safety-gated approval.
  if (role === "embodied" && PHYSICAL_PERMISSIONS.has(permission)) {
    return evaluation(
      "requires-primary-host-approval",
      "embodied-safety-restricted",
      permission,
      risk,
    );
  }

  // Local Primary Host host: highest authority.
  if (role === "primary" && isPrimaryHost) {
    if (risk === "critical") {
      return options.allowCriticalForPrimaryHost
        ? evaluation("allow", "permission-granted", permission, risk)
        : evaluation("requires-primary-host-approval", approvalReason, permission, risk);
    }
    return evaluation("allow", "permission-granted", permission, risk);
  }

  // Admin *trust level* may be elevated for high-risk only; critical never
  // auto-bypasses. (Admin is a trust level, not a host role.)
  if (
    manifest.trust.trustLevel === "admin" &&
    risk === "high" &&
    options.allowHighRiskForAdmin
  ) {
    return evaluation("allow", "permission-granted", permission, risk);
  }

  // Local execution host may be elevated via explicit options.
  if (role === "execution" && isPrimaryHost) {
    if (risk === "critical" && options.allowCriticalForPrimaryHost) {
      return evaluation("allow", "permission-granted", permission, risk);
    }
    if (risk === "high" && options.allowHighRiskForAdmin) {
      return evaluation("allow", "permission-granted", permission, risk);
    }
  }

  return evaluation("requires-primary-host-approval", approvalReason, permission, risk);
}

// ===========================================================================
// Core permission evaluation
// ===========================================================================

/**
 * Evaluate whether a host may use a permission. Pure; no side effects.
 *
 * NOTE: Policy evaluation only — runtime enforcement lands in a follow-up PR.
 */
export function evaluateHostPermission(
  manifest: LucaHostManifest,
  permission: string,
  options: LucaLinkPolicyOptions = {},
): LucaLinkPolicyEvaluation {
  if (!isKnownPermission(permission)) {
    return evaluation("deny", "unknown-permission", undefined, undefined);
  }

  const perm = permission;
  const risk = getPermissionRisk(perm);
  const now = options.now ?? Date.now();

  if (isTrustExpired(manifest, now)) {
    return evaluation("deny", "expired-trust", perm, risk);
  }

  const policy = ROLE_POLICIES[manifest.hostRole];
  const dangerous = isDangerousPermission(perm);

  // Role-level hard restriction (benign permission this role may never use).
  if (!dangerous && !policy.benignAllowed.has(perm)) {
    const reason: LucaLinkPolicyReason =
      manifest.hostRole === "guest" ? "guest-restricted" : "role-not-allowed";
    return evaluation("deny", reason, perm, risk);
  }

  // Dangerous permission denied outright for this role.
  if (dangerous) {
    const handling = policy.dangerous[perm] ?? policy.dangerousDefault;
    if (handling === "deny") {
      const reason: LucaLinkPolicyReason =
        manifest.hostRole === "guest" ? "guest-restricted" : "role-not-allowed";
      return evaluation("deny", reason, perm, risk);
    }
  }

  // Must actually be granted.
  if (!isPermissionGranted(manifest, perm)) {
    return evaluation("deny", "permission-missing", perm, risk);
  }

  // Explicit per-manifest approval requirement.
  if (manifest.trust.requiresApprovalFor.includes(perm)) {
    const reason: LucaLinkPolicyReason =
      risk === "critical"
        ? "critical-risk-requires-approval"
        : "high-risk-requires-approval";
    return evaluation("requires-primary-host-approval", reason, perm, risk);
  }

  // Dangerous permissions go through the approval/elevation path.
  if (dangerous && risk) {
    return decideDangerous(manifest, perm, risk, options);
  }

  // Benign, granted, role-appropriate → allow.
  return evaluation("allow", "permission-granted", perm, risk);
}

/** Convenience: whether the host may use the permission outright (allow). */
export function canHostUsePermission(
  manifest: LucaHostManifest,
  permission: string,
  options: LucaLinkPolicyOptions = {},
): boolean {
  return evaluateHostPermission(manifest, permission, options).decision ===
    "allow";
}

/** Convenience: whether using the permission requires Primary Host approval. */
export function requiresPrimaryHostApproval(
  manifest: LucaHostManifest,
  permission: string,
  options: LucaLinkPolicyOptions = {},
): boolean {
  return (
    evaluateHostPermission(manifest, permission, options).decision ===
    "requires-primary-host-approval"
  );
}

/** Human-readable explanation for an evaluation. */
export function explainPolicyDecision(
  evaluationResult: LucaLinkPolicyEvaluation | LucaLinkLaneEvaluation,
): string {
  return evaluationResult.explain;
}

// ===========================================================================
// Sync lane gating
// ===========================================================================

const LANE_BY_ID: ReadonlyMap<LucaLinkSyncLaneId, (typeof lucaLinkSyncLanes)[number]> =
  new Map(lucaLinkSyncLanes.map((lane) => [lane.id, lane]));

/**
 * Which host roles may participate in each lane at all (before checking that
 * the lane's required permissions are granted). Conservative defaults.
 */
const ALL_HOST_ROLES: readonly LucaHostRole[] = [
  "primary",
  "execution",
  "companion",
  "sensor",
  "display",
  "guest",
  "embodied",
];

const LANE_ALLOWED_ROLES: Readonly<
  Record<LucaLinkSyncLaneId, ReadonlySet<LucaHostRole>>
> = {
  identity: new Set(ALL_HOST_ROLES),
  presence: new Set(ALL_HOST_ROLES),
  conversation: new Set([
    "primary",
    "execution",
    "companion",
    "display",
    "guest",
    "embodied",
  ]),
  memory: new Set(["primary", "execution"]),
  settings: new Set(["primary", "execution", "companion"]),
  mission: new Set(["primary", "execution", "companion", "display"]),
  sensor: new Set(["sensor", "companion", "embodied"]),
  tool: new Set(["primary", "execution"]),
  artifact: new Set(["primary", "execution"]),
  notification: new Set(["primary", "execution", "companion", "display"]),
  model: new Set(["primary", "execution"]),
  // primary role, or any host elevated to admin/owner trust.
  safety: new Set(["primary"]),
};

function isRoleAllowedInLane(
  laneId: LucaLinkSyncLaneId,
  manifest: LucaHostManifest,
): boolean {
  if (LANE_ALLOWED_ROLES[laneId].has(manifest.hostRole)) return true;
  // Safety lane additionally admits admin/owner *trust* levels.
  if (laneId === "safety") {
    return (
      manifest.trust.trustLevel === "admin" ||
      manifest.trust.trustLevel === "owner"
    );
  }
  return false;
}

function laneEvaluation(
  decision: LucaLinkPolicyDecision,
  reason: LucaLinkPolicyReason,
  laneId: LucaLinkSyncLaneId | undefined,
  permissionResults: LucaLinkPolicyEvaluation[],
): LucaLinkLaneEvaluation {
  return {
    decision,
    reason,
    laneId,
    requiresApproval: decision === "requires-primary-host-approval",
    permissionResults,
    explain: REASON_TEXT[reason],
  };
}

/**
 * Evaluate whether a host may participate in a sync lane. Pure.
 *
 * NOTE: Policy evaluation only — runtime enforcement lands in a follow-up PR.
 */
export function canHostParticipateInLane(
  manifest: LucaHostManifest,
  laneId: string,
  options: LucaLinkPolicyOptions = {},
): LucaLinkLaneEvaluation {
  const lane = LANE_BY_ID.get(laneId as LucaLinkSyncLaneId);
  if (!lane) {
    return laneEvaluation("deny", "unknown-lane", undefined, []);
  }

  const now = options.now ?? Date.now();
  if (isTrustExpired(manifest, now)) {
    return laneEvaluation("deny", "expired-trust", lane.id, []);
  }

  if (!isRoleAllowedInLane(lane.id, manifest)) {
    return laneEvaluation("deny", "role-not-allowed", lane.id, []);
  }

  // The identity lane carries host manifests, public keys, role grants, and
  // trust state. A guest host must not freely participate; it requires Primary Host
  // approval (guests may still need limited identity/bootstrap metadata later).
  if (lane.id === "identity" && manifest.hostRole === "guest") {
    return laneEvaluation(
      "requires-primary-host-approval",
      "guest-restricted",
      lane.id,
      [],
    );
  }

  // Evaluate every required permission; aggregate the strictest outcome.
  const permissionResults = lane.requiredPermissions.map((perm) =>
    evaluateHostPermission(manifest, perm, options),
  );

  if (permissionResults.some((r) => r.decision === "deny")) {
    const denied = permissionResults.find((r) => r.decision === "deny")!;
    return laneEvaluation("deny", denied.reason, lane.id, permissionResults);
  }
  if (permissionResults.some((r) => r.decision === "requires-primary-host-approval")) {
    const approval = permissionResults.find(
      (r) => r.decision === "requires-primary-host-approval",
    )!;
    return laneEvaluation(
      "requires-primary-host-approval",
      approval.reason,
      lane.id,
      permissionResults,
    );
  }

  return laneEvaluation("allow", "permission-granted", lane.id, permissionResults);
}

// ===========================================================================
// Manifest-level policy summary
// ===========================================================================

/**
 * Produce a structured policy summary for a manifest under conservative
 * defaults: each granted permission's evaluation plus per-lane participation.
 * Pure; no side effects.
 */
export function getDefaultPolicyForManifest(
  manifest: LucaHostManifest,
  options: LucaLinkPolicyOptions = {},
): LucaLinkManifestPolicySummary {
  const now = options.now ?? Date.now();
  return {
    hostRole: manifest.hostRole,
    trustLevel: manifest.trust.trustLevel,
    expired: isTrustExpired(manifest, now),
    permissions: manifest.trust.permissions.map((perm) =>
      evaluateHostPermission(manifest, perm, options),
    ),
    lanes: lucaLinkSyncLanes.map((lane) =>
      canHostParticipateInLane(manifest, lane.id, options),
    ),
  };
}
