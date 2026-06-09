import type { PersonalMemoryControlAction, PersonalMemoryControlStateSummary } from "../memoryControls";
import type { PersonalIntelligencePersistenceDecision, PersonalIntelligencePersistenceImpact } from "./personalIntelligencePersistenceBoundaryTypes";

export const persistenceBoundaryEligibleActions = new Set<PersonalMemoryControlAction>([
  "approve_memory",
  "deny_memory",
  "correct_memory",
  "edit_memory",
  "make_temporary",
  "make_private",
  "mark_do_not_sync",
  "archive_memory",
  "restore_memory",
]);

export const persistenceBoundaryHighRiskActions = new Set<PersonalMemoryControlAction>([
  "forget_memory",
  "restore_memory",
  "archive_memory",
  "make_private",
  "mark_do_not_sync",
]);

export const persistenceBoundaryNeverAutoApplyActions = new Set<PersonalMemoryControlAction>([
  "forget_memory",
  "make_private",
  "mark_do_not_sync",
  "mark_sync_allowed",
  "restore_memory",
]);

const protectedSensitivities = new Set(["private", "sensitive", "secret"]);
const nonSyncableSensitivities = new Set(["sensitive", "secret"]);

export function isPersistenceBoundaryProtectedState(state: PersonalMemoryControlStateSummary | null | undefined): boolean {
  return Boolean(state && (protectedSensitivities.has(state.sensitivity) || state.localOnly));
}

export function requiresPersistenceBoundaryAuditBeforeWrite(
  action: PersonalMemoryControlAction,
  current: PersonalMemoryControlStateSummary | null | undefined,
  proposed: PersonalMemoryControlStateSummary | null | undefined,
): boolean {
  return (
    isPersistenceBoundaryProtectedState(current) ||
    isPersistenceBoundaryProtectedState(proposed) ||
    action === "make_private" ||
    action === "mark_do_not_sync" ||
    action === "forget_memory" ||
    action === "archive_memory" ||
    action === "restore_memory" ||
    action === "mark_sync_allowed"
  );
}

export function requiresPersistenceBoundaryExplicitConfirmation(action: PersonalMemoryControlAction): boolean {
  return persistenceBoundaryHighRiskActions.has(action) || persistenceBoundaryNeverAutoApplyActions.has(action);
}

export function createPrivacyImpact(
  action: PersonalMemoryControlAction,
  current: PersonalMemoryControlStateSummary | null | undefined,
  proposed: PersonalMemoryControlStateSummary | null | undefined,
): PersonalIntelligencePersistenceImpact {
  const protectedChange = isPersistenceBoundaryProtectedState(current) || isPersistenceBoundaryProtectedState(proposed);
  if (action === "make_private") {
    return { level: "high", summary: "Memory would become private/local-only; audit is required before any future write.", protected: true };
  }
  if (protectedChange) {
    return { level: "medium", summary: "Protected memory metadata is involved; raw values remain redacted.", protected: true };
  }
  return { level: "low", summary: "No protected raw values are included in this dry-run contract.", protected: false };
}

export function createSyncImpact(
  action: PersonalMemoryControlAction,
  current: PersonalMemoryControlStateSummary | null | undefined,
  proposed: PersonalMemoryControlStateSummary | null | undefined,
): PersonalIntelligencePersistenceImpact {
  if (action === "mark_sync_allowed") {
    return { level: "high", summary: "Future sync eligibility would change; sensitive and secret memory must remain blocked.", protected: true };
  }
  if (action === "mark_do_not_sync" || action === "make_private") {
    return { level: "high", summary: "Future sync must be disabled/local-only for this candidate.", protected: true };
  }
  if (current?.allowSync !== proposed?.allowSync || current?.localOnly !== proposed?.localOnly) {
    return { level: "medium", summary: "Declarative sync flags differ between previous and proposed summaries.", protected: isPersistenceBoundaryProtectedState(current) || isPersistenceBoundaryProtectedState(proposed) };
  }
  return { level: "none", summary: "No sync eligibility change is requested. No sync service is called.", protected: false };
}

export function isPersistenceBoundarySyncRestricted(
  action: PersonalMemoryControlAction,
  current: PersonalMemoryControlStateSummary | null | undefined,
  proposed: PersonalMemoryControlStateSummary | null | undefined,
): boolean {
  if (action !== "mark_sync_allowed") return false;
  return Boolean(
    (current && nonSyncableSensitivities.has(current.sensitivity)) ||
      (proposed && nonSyncableSensitivities.has(proposed.sensitivity)),
  );
}

export function decisionForPersistenceBoundary(args: {
  readonly action: PersonalMemoryControlAction;
  readonly confirmed: boolean;
  readonly previewDecision: string;
  readonly currentStateSummary: PersonalMemoryControlStateSummary | null;
  readonly proposedStateSummary: PersonalMemoryControlStateSummary | null;
}): PersonalIntelligencePersistenceDecision {
  if (!args.confirmed) return "blocked";
  if (args.previewDecision === "blocked" || args.previewDecision === "unsupported") return "blocked";
  if (isPersistenceBoundarySyncRestricted(args.action, args.currentStateSummary, args.proposedStateSummary)) return "rejected";
  if (args.action === "mark_sync_allowed") return "rejected";
  if (requiresPersistenceBoundaryExplicitConfirmation(args.action) || args.previewDecision === "approval_required") return "requires_review";
  if (!persistenceBoundaryEligibleActions.has(args.action)) return "rejected";
  return "eligible";
}
