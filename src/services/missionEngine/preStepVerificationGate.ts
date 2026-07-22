/**
 * Absorb Phase 1 — pre-step verification gate.
 * Run GSD verification on an atomic step *before* treating it as executable.
 * Representation-only: does not invoke tools or host APIs.
 */

import {
  getExecutionVerificationGateSnapshot,
  type LucaExecutionVerificationContext,
  type LucaExecutionVerificationGateSnapshot,
} from "../execution/LucaExecutionVerificationGate";
import {
  atomicUnitToExecutionStep,
  type AtomicOperationUnit,
  validateAtomicOperationUnit,
} from "./AtomicOperationUnit";

export interface PreStepVerificationInput {
  unit: unknown;
  context?: LucaExecutionVerificationContext;
  /**
   * When true (default for sensitive/dangerous), require contract validation
   * before gate evaluation.
   */
  requireValidContract?: boolean;
}

export interface PreStepVerificationResult {
  ok: boolean;
  allowed: boolean;
  blocked: boolean;
  unit?: AtomicOperationUnit;
  gateSnapshot: LucaExecutionVerificationGateSnapshot;
  contractIssues: Array<{ field: string; message: string }>;
  reason?: string;
}

/**
 * Validate atomic contract + run execution verification gates for one step.
 */
export function verifyBeforeStep(
  input: PreStepVerificationInput,
): PreStepVerificationResult {
  const requireValid = input.requireValidContract !== false;
  const validation = validateAtomicOperationUnit(input.unit);

  if (requireValid && !validation.ok) {
    return {
      ok: false,
      allowed: false,
      blocked: true,
      contractIssues: validation.issues,
      gateSnapshot: getExecutionVerificationGateSnapshot({ results: [] }),
      reason: `Atomic operation contract invalid: ${validation.issues
        .map((i) => i.field)
        .join(", ")}`,
    };
  }

  const unit = validation.unit!;
  const step = atomicUnitToExecutionStep(unit, {
    rollbackAvailable: Boolean(unit.rollback?.trim()),
    // Pre-step: receipts not yet produced.
    receiptAvailable: false,
  });

  const gateSnapshot = getExecutionVerificationGateSnapshot({
    step,
    context: {
      intentClear: true,
      permissionGranted: true,
      capabilityAvailable: true,
      rollbackAvailable: Boolean(unit.rollback?.trim()),
      receiptAvailable: false,
      ...input.context,
    },
  });

  const blocked = gateSnapshot.summary.blocked || !gateSnapshot.summary.ok;
  // Low-risk steps may pass with warnings; medium+ may require confirmation.
  const allowed =
    !blocked ||
    (gateSnapshot.summary.requiresUserConfirmation &&
      Boolean(input.context?.userConfirmationProvided)) ||
    (gateSnapshot.summary.requiresOriginReview &&
      Boolean(input.context?.originReviewProvided));

  return {
    ok: !blocked || allowed,
    allowed: !blocked || allowed,
    blocked,
    unit,
    contractIssues: validation.issues,
    gateSnapshot,
    reason: blocked
      ? gateSnapshot.results
          .filter((r) => !r.ok)
          .map((r) => `${r.gate}: ${r.reason ?? r.status}`)
          .join("; ") || "Pre-step verification blocked."
      : "Pre-step verification passed.",
  };
}
