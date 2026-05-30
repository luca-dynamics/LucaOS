// VisualCoreRemoteCommandPolicy — PR #142: VisualCore Remote Command
// Governance.
//
// Pure classification + evaluation for the remote commands that arrive over
// Electron IPC and can drive the VisualCore surface. This module decides, for
// each command, a governance status (record-only / needs-approval / blocked /
// ignored) and a conservative risk level. It NEVER executes anything.
//
// Hard guarantees:
//   - This file NEVER navigates, fetches, or opens a browser.
//   - It NEVER moves VisualCore BROWSER mode onto governed LucaBrowser.
//   - It NEVER changes VisualCore mode switching or IPC behavior.
//   - It NEVER enables capture / automation / external action / file /
//     messaging / wireless / device control.
//   - URLs are reduced to an audit-safe form (origin + path, token-like query
//     params redacted). Raw token-bearing URLs are never returned or stored.

import { getVisualCoreSurfacePolicy } from "./VisualCoreGovernancePolicy";
import { isVisualCoreModeReadyForDisplayGovernance } from "./VisualCoreDisplayGovernance";
import { VISUAL_CORE_SURFACE_MODES } from "../../types/visualCoreGovernance";
import type { VisualCoreSurfaceMode } from "../../types/visualCoreGovernance";
import type {
  VisualCoreRemoteCommandKind,
  VisualCoreRemoteCommandRiskLevel,
  VisualCoreRemoteCommandStatus,
} from "../../types/visualCoreRemoteCommands";

/** Raw remote-command input as it arrives from IPC (loosely typed on purpose). */
export interface VisualCoreRemoteCommandInput {
  /** Raw command.type as received from IPC (e.g. "BROWSER_NAVIGATE"). */
  type?: string;
  /** Explicit kind override (used when the channel implies the kind). */
  kind?: VisualCoreRemoteCommandKind;
  /** Raw command.value (URL for navigate, mode for set-mode, etc.). */
  value?: unknown;
  /** Explicit target VisualCore mode. */
  mode?: string;
  /** Explicit target URL. */
  url?: string;
}

/** Result of classifying a raw remote command. */
export interface VisualCoreRemoteCommandClassification {
  kind: VisualCoreRemoteCommandKind;
  targetMode?: string;
  targetAuditUrl?: string;
}

/** Full governance decision for a remote command. */
export interface VisualCoreRemoteCommandDecision {
  kind: VisualCoreRemoteCommandKind;
  status: VisualCoreRemoteCommandStatus;
  riskLevel: VisualCoreRemoteCommandRiskLevel;
  targetMode?: string;
  targetAuditUrl?: string;
  blockedBy?: string[];
  userSafeReason: string;
}

// Query/hash param keys whose values must never be stored in an audit URL.
const SENSITIVE_PARAM_PATTERN =
  /(token|password|passwd|pwd|secret|session|sid|auth|access|api[-_]?key|apikey|key|code|credential|otp|bearer|signature|sig)/i;

const REDACTED = "[redacted]";

/**
 * Reduce a raw URL to an audit-safe string: origin + path, with token-like
 * query params redacted and the hash fragment dropped (it commonly carries
 * tokens). Never returns raw token-bearing query/hash content. Returns
 * undefined for empty input and a safe placeholder for unparseable input.
 */
export function toVisualCoreAuditSafeUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    // Unparseable / relative: strip any query + hash defensively.
    const withoutHash = trimmed.split("#")[0];
    const withoutQuery = withoutHash.split("?")[0];
    return withoutQuery || "[unparseable-url]";
  }

  for (const key of Array.from(parsed.searchParams.keys())) {
    if (SENSITIVE_PARAM_PATTERN.test(key)) {
      parsed.searchParams.set(key, REDACTED);
    }
  }
  // Drop the hash fragment entirely — it is rarely needed for audit and often
  // carries token-like content.
  parsed.hash = "";

  const query = parsed.searchParams.toString();
  return `${parsed.origin}${parsed.pathname}${query ? `?${query}` : ""}`;
}

function normalizeKind(input: VisualCoreRemoteCommandInput): VisualCoreRemoteCommandKind {
  if (input.kind) return input.kind;
  const raw = (input.type ?? "").toString().trim().toUpperCase().replace(/-/g, "_");
  switch (raw) {
    case "BROWSER_NAVIGATE":
    case "SET_MODE":
    case "SHOW_DISPLAY":
    case "CAST_SELECT":
    case "SYNC_APP_STATE":
    case "WIDGET_VOICE_DATA":
    case "VISUAL_CORE_INTERACTION":
      return raw as VisualCoreRemoteCommandKind;
    default:
      return "UNKNOWN";
  }
}

function coerceModeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.toUpperCase() : undefined;
}

function asSurfaceMode(mode: string | undefined): VisualCoreSurfaceMode | undefined {
  if (!mode) return undefined;
  return VISUAL_CORE_SURFACE_MODES.includes(mode as VisualCoreSurfaceMode)
    ? (mode as VisualCoreSurfaceMode)
    : undefined;
}

/**
 * Classify a raw remote command into a known kind plus any audit-safe target
 * (mode and/or URL). Never executes anything.
 */
export function classifyVisualCoreRemoteCommand(
  input: VisualCoreRemoteCommandInput,
): VisualCoreRemoteCommandClassification {
  const kind = normalizeKind(input);

  if (kind === "BROWSER_NAVIGATE") {
    const url = input.url ?? input.value;
    return { kind, targetAuditUrl: toVisualCoreAuditSafeUrl(url) };
  }

  if (kind === "SET_MODE" || kind === "SHOW_DISPLAY") {
    const targetMode = coerceModeString(input.mode) ?? coerceModeString(input.value);
    return { kind, targetMode };
  }

  return { kind };
}

/** True when a target mode is a low-risk display mode (PR #141 ready set). */
function isLowRiskDisplayMode(mode: string | undefined): boolean {
  const surfaceMode = asSurfaceMode(mode);
  return surfaceMode ? isVisualCoreModeReadyForDisplayGovernance(surfaceMode) : false;
}

/**
 * Map a sensitive mode to a status + risk. Critical / blocked-until-dedicated
 * modes are `blocked`; other sensitive modes are `needs_approval`.
 */
function evaluateModeTarget(mode: string | undefined): {
  status: VisualCoreRemoteCommandStatus;
  riskLevel: VisualCoreRemoteCommandRiskLevel;
  blockedBy?: string[];
} {
  const surfaceMode = asSurfaceMode(mode);
  if (!surfaceMode) {
    return {
      status: "blocked",
      riskLevel: "high",
      blockedBy: [`unknown_target_mode:${mode ?? "none"}`],
    };
  }

  if (isVisualCoreModeReadyForDisplayGovernance(surfaceMode)) {
    return { status: "allowed_record_only", riskLevel: "low" };
  }

  const policy = getVisualCoreSurfacePolicy(surfaceMode);
  const riskLevel: VisualCoreRemoteCommandRiskLevel = policy?.riskLevel ?? "high";
  const blocked =
    policy?.riskLevel === "critical" ||
    policy?.readiness === "blocked_until_dedicated_policy";

  return {
    status: blocked ? "blocked" : "needs_approval",
    riskLevel,
    blockedBy: [
      blocked
        ? `sensitive_mode_blocked:${policy?.readiness ?? "needs_manual_review"}`
        : `sensitive_mode_needs_approval:${policy?.readiness ?? "needs_manual_review"}`,
    ],
  };
}

/**
 * Build a user-safe, non-sensitive reason string for a decision. Exposed so
 * callers can render the same copy used to populate records.
 */
export function getVisualCoreRemoteCommandUserSafeReason(
  decision: Pick<
    VisualCoreRemoteCommandDecision,
    "kind" | "status" | "riskLevel" | "targetMode"
  >,
): string {
  const target = decision.targetMode ? ` (${decision.targetMode})` : "";
  switch (decision.status) {
    case "allowed_record_only":
      return `${decision.kind}${target}: low-risk display/telemetry command — recorded for audit only. No execution, browser navigation, capture, or external action.`;
    case "needs_approval":
      return `${decision.kind}${target}: ${decision.riskLevel}-risk command — held as needs-approval. Requires dedicated governance before it can drive VisualCore.`;
    case "blocked":
      return `${decision.kind}${target}: ${decision.riskLevel}-risk command — blocked. Sensitive commands require a dedicated policy before execution.`;
    case "ignored":
      return `${decision.kind}${target}: ignored — no governed action recorded.`;
    case "received":
    default:
      return `${decision.kind}${target}: received and pending governance evaluation.`;
  }
}

/**
 * Evaluate a raw remote command and return its full governance decision.
 * Conservative by design: anything not clearly a low-risk display/telemetry
 * command is held for approval or blocked.
 */
export function evaluateVisualCoreRemoteCommand(
  input: VisualCoreRemoteCommandInput,
): VisualCoreRemoteCommandDecision {
  const { kind, targetMode, targetAuditUrl } = classifyVisualCoreRemoteCommand(input);

  let status: VisualCoreRemoteCommandStatus;
  let riskLevel: VisualCoreRemoteCommandRiskLevel;
  let blockedBy: string[] | undefined;

  switch (kind) {
    case "BROWSER_NAVIGATE": {
      // BROWSER mode still renders embedded LucaBrowser, not the governed
      // adapter — so navigation must not proceed without dedicated governance.
      status = "needs_approval";
      riskLevel = "high";
      blockedBy = ["browser_mode_uses_embedded_lucabrowser"];
      break;
    }
    case "SET_MODE": {
      const decision = evaluateModeTarget(targetMode);
      status = decision.status;
      riskLevel = decision.riskLevel;
      blockedBy = decision.blockedBy;
      break;
    }
    case "SHOW_DISPLAY": {
      if (isLowRiskDisplayMode(targetMode)) {
        status = "allowed_record_only";
        riskLevel = "low";
      } else {
        status = "needs_approval";
        riskLevel = "elevated";
        blockedBy = [
          targetMode
            ? `show_display_target_not_low_risk:${targetMode}`
            : "show_display_target_unknown",
        ];
      }
      break;
    }
    case "CAST_SELECT": {
      status = "blocked";
      riskLevel = "high";
      blockedBy = ["needs_dedicated_device_cast_policy"];
      break;
    }
    case "SYNC_APP_STATE":
    case "WIDGET_VOICE_DATA":
    case "VISUAL_CORE_INTERACTION": {
      // Record-only telemetry / feedback — no execution change.
      status = "allowed_record_only";
      riskLevel = "low";
      break;
    }
    case "UNKNOWN":
    default: {
      status = "blocked";
      riskLevel = "elevated";
      blockedBy = ["unknown_remote_command"];
      break;
    }
  }

  const decision: VisualCoreRemoteCommandDecision = {
    kind,
    status,
    riskLevel,
    targetMode,
    targetAuditUrl,
    blockedBy,
    userSafeReason: "",
  };
  decision.userSafeReason = getVisualCoreRemoteCommandUserSafeReason(decision);
  return decision;
}

/** Fixed boundary labels describing what remote-command governance does NOT do. */
export function getVisualCoreRemoteCommandBoundaryLabels(): string[] {
  return [
    "Remote command audit only",
    "No browser navigation approval yet",
    "No capture",
    "No automation",
    "No external action",
    "No file access",
    "No messaging",
    "No wireless/device control",
    "Sensitive commands require dedicated policy",
  ];
}
