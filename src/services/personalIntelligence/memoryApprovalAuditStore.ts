import {
  summarizeMemoryApprovalAudit,
  type MemoryApprovalAuditSummary,
  type PersonalIntelligenceMemoryApprovalAuditRecord,
} from "../../personal-intelligence/approval";

/**
 * Durable store for the Personal Intelligence governed-write audit trail.
 *
 * The pilot's approval events (dry-run, live-write completed / blocked /
 * failed) were in-memory only, so the record of what was written — and what
 * was refused — vanished on reload. This persists them to localStorage (the
 * app's storage convention), at the services edge so the pure
 * personal-intelligence subsystem never touches storage. Storage is injectable
 * for tests and degrades to a no-op in hardened / SSR contexts.
 */

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "LUCA_PI_MEMORY_APPROVAL_AUDIT_V1";
const MAX_RECORDS = 500;

function resolveStorage(explicit?: StorageLike): StorageLike | undefined {
  if (explicit) return explicit;
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    /* storage access can throw in hardened contexts */
  }
  return undefined;
}

export function readMemoryApprovalAuditRecords(
  storage?: StorageLike,
): PersonalIntelligenceMemoryApprovalAuditRecord[] {
  const store = resolveStorage(storage);
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Append records (newest last), cap the history, and persist. Returns the new trail. */
export function appendMemoryApprovalAuditRecords(
  records: readonly PersonalIntelligenceMemoryApprovalAuditRecord[],
  storage?: StorageLike,
): PersonalIntelligenceMemoryApprovalAuditRecord[] {
  const store = resolveStorage(storage);
  const next = [...readMemoryApprovalAuditRecords(store), ...records].slice(
    -MAX_RECORDS,
  );
  if (store) {
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota / disabled storage — the trail is best-effort, never fatal */
    }
  }
  return next;
}

export function summarizeStoredMemoryApprovalAudit(
  storage?: StorageLike,
): MemoryApprovalAuditSummary {
  return summarizeMemoryApprovalAudit(readMemoryApprovalAuditRecords(storage));
}
