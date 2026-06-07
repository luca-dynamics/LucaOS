import { isPrivacyZone } from "../privacy/privacyZones";
import type { LearningLog, LearningLogEntry } from "./learningTypes";

export function validateLearningLogEntry(entry: LearningLogEntry): string[] {
  const errors: string[] = [];
  if (!entry.eventId.trim()) errors.push("eventId is required");
  if (Number.isNaN(Date.parse(entry.timestamp))) errors.push("timestamp must be an ISO date");
  if (!entry.inputSummary.trim()) errors.push("inputSummary is required");
  if (!entry.actionTaken.trim()) errors.push("actionTaken is required");
  if (entry.privacyZone !== undefined && !isPrivacyZone(entry.privacyZone)) errors.push("privacyZone is invalid");
  if (entry.source !== undefined && !entry.source.trim()) errors.push("source cannot be empty");
  if (entry.confidence !== undefined && (entry.confidence < 0 || entry.confidence > 1)) errors.push("confidence must be between 0 and 1");
  if (entry.relatedMemoryItemIds?.some((id) => !id.trim())) errors.push("relatedMemoryItemIds cannot contain empty ids");
  if (entry.relatedTraceId !== undefined && !entry.relatedTraceId.trim()) errors.push("relatedTraceId cannot be empty");
  return errors;
}

export function createLearningLog(initialEntries: LearningLogEntry[] = []): LearningLog {
  const entries: LearningLogEntry[] = [];
  const log: LearningLog = {
    append(entry) {
      const errors = validateLearningLogEntry(entry);
      if (errors.length) throw new Error(`Invalid learning log entry: ${errors.join(", ")}`);
      if (entries.some((candidate) => candidate.eventId === entry.eventId)) throw new Error(`Learning event already exists: ${entry.eventId}`);
      const copy = clone(entry);
      entries.push(copy);
      return clone(copy);
    },
    list: () => entries.map(clone),
  };
  initialEntries.forEach(log.append);
  return log;
}

function clone(entry: LearningLogEntry): LearningLogEntry {
  return { ...entry, relatedMemoryItemIds: entry.relatedMemoryItemIds ? [...entry.relatedMemoryItemIds] : undefined };
}
