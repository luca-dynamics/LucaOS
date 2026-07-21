/**
 * Absorb Phase 1 — attach execution receipt evidence onto a mission tape.
 * Records a verification row + optional recovery note; does not promote live action.
 */

import {
  createExecutionReceipt,
  type LucaExecutionReceipt,
  type LucaExecutionEvidenceRef,
} from "../execution/LucaExecutionReceipt";
import type { MissionTapeRecorderService } from "./MissionTapeRecorder";

export interface AttachMissionTapeReceiptInput {
  missionId: string;
  stepId: string;
  summary: string;
  passed?: boolean;
  evidence?: Array<Partial<LucaExecutionEvidenceRef> & { summary: string }>;
  source?: LucaExecutionReceipt["source"];
}

export interface AttachMissionTapeReceiptResult {
  ok: boolean;
  receipt: LucaExecutionReceipt;
  reason?: string;
}

/**
 * Create a representation receipt and append a matching tape verification row.
 */
export async function attachMissionTapeReceipt(
  recorder: MissionTapeRecorderService,
  input: AttachMissionTapeReceiptInput,
): Promise<AttachMissionTapeReceiptResult> {
  const tape = await recorder.getTape(input.missionId);
  if (!tape) {
    throw new Error(`Mission tape not found: ${input.missionId}`);
  }

  const passed = input.passed !== false;
  const receipt = createExecutionReceipt({
    summary: input.summary,
    status: passed ? "verified" : "failed",
    source: input.source ?? "system",
    stepIds: [input.stepId],
    evidenceRefs: input.evidence,
  });

  const evidenceNote =
    receipt.evidenceRefs
      ?.map((e) => `${e.kind}:${e.summary}`)
      .join("; ") || input.summary;

  await recorder.appendVerification(input.missionId, {
    stepId: input.stepId,
    passed,
    details: `receipt:${receipt.id} ${evidenceNote}`.slice(0, 1000),
    verificationCommand: "attachMissionTapeReceipt",
  });

  return {
    ok: true,
    receipt,
    reason: passed
      ? "Receipt attached and verification row recorded."
      : "Failed receipt attached for audit.",
  };
}
