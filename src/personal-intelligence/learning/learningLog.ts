import type { LearningLog, LearningLogEntry } from "./learningTypes";

export function validateLearningLogEntry(entry: LearningLogEntry): string[] {
  const errors: string[] = [];
  if (!entry.eventId.trim()) errors.push("eventId is required");
  if (Number.isNaN(Date.parse(entry.timestamp))) errors.push("timestamp must be an ISO date");
  if (!entry.inputSummary.trim()) errors.push("inputSummary is required");
  if (!entry.actionTaken.trim()) errors.push("actionTaken is required");
  return errors;
}

export function createLearningLog(initialEntries: LearningLogEntry[] = []): LearningLog {
  const entries: LearningLogEntry[] = [];
  const log: LearningLog = {
    append(entry) {
      const errors = validateLearningLogEntry(entry);
      if (errors.length) throw new Error(`Invalid learning log entry: ${errors.join(", ")}`);
      if (entries.some((candidate) => candidate.eventId === entry.eventId)) throw new Error(`Learning event already exists: ${entry.eventId}`);
      const copy = { ...entry };
      entries.push(copy);
      return { ...copy };
    },
    list: () => entries.map((entry) => ({ ...entry })),
  };
  initialEntries.forEach(log.append);
  return log;
}
