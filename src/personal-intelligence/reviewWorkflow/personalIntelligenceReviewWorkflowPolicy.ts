import type { PersonalMemoryControlAction, PersonalMemoryControlPreview } from "../memoryControls";
import type { PersonalMemoryNode } from "../memoryGraph";

const explicitlyDestructiveActions = new Set<PersonalMemoryControlAction>([
  "forget_memory",
  "restore_memory",
]);

export function actionRequiresExplicitReviewConfirmation(
  action: PersonalMemoryControlAction,
  preview: Pick<PersonalMemoryControlPreview, "decision" | "reason">,
  node?: Pick<PersonalMemoryNode, "sensitivity" | "privacy"> | null,
): boolean {
  if (explicitlyDestructiveActions.has(action)) return true;
  if (preview.decision === "approval_required") return true;
  if (
    preview.reason === "sensitive_change_requires_review" ||
    preview.reason === "private_change_requires_review" ||
    preview.reason === "restore_requires_review"
  ) {
    return true;
  }
  return Boolean(
    node &&
      (node.sensitivity === "private" ||
        node.sensitivity === "sensitive" ||
        node.sensitivity === "secret" ||
        node.privacy.localOnly ||
        node.privacy.redactValueInSummaries),
  );
}

export function phaseForPreview(
  preview: Pick<PersonalMemoryControlPreview, "decision">,
  requiresConfirmation: boolean,
): "blocked" | "review_only" | "confirmation_required" | "preview_ready" {
  if (preview.decision === "blocked" || preview.decision === "unsupported") return "blocked";
  if (preview.decision === "review_only") return "review_only";
  return requiresConfirmation ? "confirmation_required" : "preview_ready";
}
