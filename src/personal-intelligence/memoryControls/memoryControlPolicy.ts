import { NON_SYNCABLE_SENSITIVITIES, isMemoryExpired } from "../memoryGraph";
import type { PersonalMemoryNode } from "../memoryGraph";
import type {
  PersonalMemoryControlAction,
  PersonalMemoryControlEvaluation,
  PersonalMemoryControlOptions,
  PersonalMemoryControlRequest,
  PersonalMemoryControlRisk,
} from "./memoryControlTypes";

const SENSITIVE_LEVELS = new Set(["sensitive", "secret"]);
const PRIVATE_LEVELS = new Set(["private", "sensitive", "secret"]);

function riskFor(node: PersonalMemoryNode, action: PersonalMemoryControlAction): PersonalMemoryControlRisk {
  if (SENSITIVE_LEVELS.has(node.sensitivity)) return "sensitive";
  if (action === "forget_memory" || action === "restore_memory") return "high";
  if (PRIVATE_LEVELS.has(node.sensitivity) || action === "make_private") return "medium";
  return "low";
}

function result(
  node: PersonalMemoryNode,
  action: PersonalMemoryControlAction,
  evaluation: Omit<PersonalMemoryControlEvaluation, "risk">,
): PersonalMemoryControlEvaluation {
  return { ...evaluation, risk: riskFor(node, action) };
}

export function evaluateMemoryControlAction(
  node: PersonalMemoryNode,
  action: PersonalMemoryControlAction,
  options: PersonalMemoryControlOptions & Pick<PersonalMemoryControlRequest, "changes" | "expiresAt"> = {},
): PersonalMemoryControlEvaluation {
  const now = options.now ?? new Date();
  const inactiveForEditing =
    node.lifecycle === "forgotten" || node.lifecycle === "archived" || isMemoryExpired(node, now);

  if ((action === "edit_memory" || action === "correct_memory") && inactiveForEditing) {
    return result(node, action, {
      decision: "blocked",
      reason: "inactive_memory_requires_restore",
      warnings: ["Restore and review this memory before changing its contents."],
    });
  }

  switch (action) {
    case "approve_memory":
      return result(node, action, {
        decision: node.approvalState === "approved" ? "review_only" : "allowed",
        reason:
          node.approvalState === "approved"
            ? "already_in_requested_state"
            : "pending_memory_can_be_approved",
        warnings: ["This is a preview; approval is not persisted."],
      });
    case "deny_memory":
      return result(node, action, {
        decision: node.approvalState === "denied" ? "review_only" : "allowed",
        reason:
          node.approvalState === "denied"
            ? "already_in_requested_state"
            : "pending_memory_can_be_denied",
        warnings: ["Denied memory must not be surfaced as active context."],
      });
    case "forget_memory":
      return result(node, action, {
        decision: node.lifecycle === "forgotten" ? "review_only" : "approval_required",
        reason:
          node.lifecycle === "forgotten" ? "already_in_requested_state" : "memory_can_be_forgotten",
        warnings: ["Forgetting is destructive and requires explicit user approval outside this preview."],
      });
    case "correct_memory":
    case "edit_memory":
      if (!options.changes || Object.keys(options.changes).length === 0) {
        return result(node, action, {
          decision: "blocked",
          reason: "missing_changes",
          warnings: ["Provide at least one title, summary, value, or expiration change."],
        });
      }
      if (SENSITIVE_LEVELS.has(node.sensitivity)) {
        return result(node, action, {
          decision: "approval_required",
          reason: "sensitive_change_requires_review",
          warnings: ["Sensitive memory content stays protected while the correction is reviewed."],
        });
      }
      if (node.sensitivity === "private" || node.privacy.localOnly) {
        return result(node, action, {
          decision: "approval_required",
          reason: "private_change_requires_review",
          warnings: ["Private or local-only memory changes require explicit review."],
        });
      }
      return result(node, action, {
        decision: "allowed",
        reason: "action_available",
        warnings: ["No content is changed until a future approved mutation path applies it."],
      });
    case "make_temporary": {
      const expiresAt = options.expiresAt ?? options.changes?.expiresAt;
      if (!expiresAt) {
        return result(node, action, {
          decision: "blocked",
          reason: "expiration_required",
          warnings: ["Temporary memory requires an explicit expiration date."],
        });
      }
      const expiration = Date.parse(expiresAt);
      if (Number.isNaN(expiration) || expiration <= now.getTime()) {
        return result(node, action, {
          decision: "blocked",
          reason: "invalid_expiration",
          warnings: ["Choose a valid expiration date in the future."],
        });
      }
      return result(node, action, {
        decision: "allowed",
        reason: "action_available",
        warnings: ["Expiration is previewed only; no timer or deletion is scheduled."],
      });
    }
    case "make_private":
      return result(node, action, {
        decision:
          node.sensitivity === "private" && node.privacy.localOnly && !node.privacy.allowSync
            ? "review_only"
            : "allowed",
        reason:
          node.sensitivity === "private" && node.privacy.localOnly && !node.privacy.allowSync
            ? "already_in_requested_state"
            : "action_available",
        warnings: ["Private memory is previewed as local-only and excluded from sync."],
      });
    case "mark_do_not_sync":
      return result(node, action, {
        decision: !node.privacy.allowSync && node.privacy.localOnly ? "review_only" : "allowed",
        reason:
          !node.privacy.allowSync && node.privacy.localOnly
            ? "already_in_requested_state"
            : "action_available",
        warnings: ["This setting is declarative; no sync service is called."],
      });
    case "mark_sync_allowed":
      if (NON_SYNCABLE_SENSITIVITIES.has(node.sensitivity)) {
        return result(node, action, {
          decision: "blocked",
          reason: "sensitive_memory_cannot_sync",
          warnings: ["Sensitive and secret memory cannot be marked sync-allowed."],
        });
      }
      return result(node, action, {
        decision: node.privacy.allowSync && !node.privacy.localOnly ? "review_only" : "allowed",
        reason:
          node.privacy.allowSync && !node.privacy.localOnly
            ? "already_in_requested_state"
            : "action_available",
        warnings: ["Sync eligibility is previewed only; cross-device sync is not implemented."],
      });
    case "archive_memory":
      return result(node, action, {
        decision: node.lifecycle === "archived" ? "review_only" : "allowed",
        reason: node.lifecycle === "archived" ? "already_in_requested_state" : "action_available",
        warnings: ["Archiving is previewed only."],
      });
    case "restore_memory":
      return result(node, action, {
        decision:
          node.lifecycle === "active" && !isMemoryExpired(node, now)
            ? "review_only"
            : "approval_required",
        reason:
          node.lifecycle === "active" && !isMemoryExpired(node, now)
            ? "already_in_requested_state"
            : "restore_requires_review",
        warnings: ["Forgotten, archived, or expired memory requires review before restoration."],
      });
    default: {
      const exhaustiveAction: never = action;
      void exhaustiveAction;
      return result(node, action, {
        decision: "unsupported",
        reason: "unsupported_action",
        warnings: ["This memory control action is not supported."],
      });
    }
  }
}
