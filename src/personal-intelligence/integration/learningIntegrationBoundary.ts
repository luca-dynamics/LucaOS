import { validateLearningLogEntry } from "../learning/learningLog";
import type { LearningLogEntry } from "../learning/learningTypes";
import type { IntegrationMappingDescription } from "./integrationTypes";

export type LearningEventPreviewInput = LearningLogEntry;

export interface LearningEventValidationResult {
  valid: boolean;
  errors: string[];
}

export function createLearningEventPreview(input: LearningEventPreviewInput): LearningLogEntry {
  const event: LearningLogEntry = {
    ...input,
    relatedMemoryItemIds: input.relatedMemoryItemIds ? [...input.relatedMemoryItemIds] : undefined,
  };
  const validation = validateLearningEventPreview(event);
  if (!validation.valid) throw new Error(`Invalid learning event preview: ${validation.errors.join(", ")}`);
  return event;
}

export function validateLearningEventPreview(input: LearningLogEntry): LearningEventValidationResult {
  const errors = validateLearningLogEntry(input);
  return { valid: errors.length === 0, errors };
}

export function describeFeedbackMapping(): IntegrationMappingDescription {
  return {
    source: "user feedback preview",
    destination: "Learning Log event preview",
    previewFields: ["userFeedback", "outcome", "verificationStatus", "nextAdjustment", "confidence"],
    forbiddenEffects: ["memory updates", "skill updates", "model routing changes", "persistence"],
    notes: ["Feedback remains evidence until a governed learning pipeline exists."],
  };
}

export function describeRuntimeFailureLearningMapping(): IntegrationMappingDescription {
  return {
    source: "runtime failure evidence",
    destination: "Learning Log event preview",
    previewFields: ["inputSummary", "actionTaken", "outcome", "verificationStatus", "relatedMissionId", "source"],
    forbiddenEffects: ["automatic retries", "automatic remediation", "runtime mutation", "persistence"],
    notes: ["Failures may be described but are not consumed by runtime services in this PR."],
  };
}
