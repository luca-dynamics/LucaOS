import type { RuntimeInboxDiagnosticsSummary, RuntimeInboxEvent } from "../../types/runtimeInbox";

interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; }
const STORAGE_KEY = "LUCA_RUNTIME_INBOX_EVENTS_V1";
const MAX_EVENTS = 500;
const SECRET_PATTERNS = [/sk-[A-Za-z0-9_-]{8,}/g, /gh[pousr]_[A-Za-z0-9_]{12,}/g, /AIza[A-Za-z0-9_-]{12,}/g, /token[:=][^\s]+/gi];
function nowIso(): string { return new Date().toISOString(); }
function storage(): StorageLike | undefined { if (typeof window !== "undefined" && window.localStorage) return window.localStorage; if (typeof localStorage !== "undefined") return localStorage; return undefined; }
function readEvents(store: StorageLike | undefined): RuntimeInboxEvent[] { try { const raw = store?.getItem(STORAGE_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function sanitizeString(value: string): string { return SECRET_PATTERNS.reduce((current, pattern) => current.replace(pattern, "[redacted]"), value).slice(0, 2_000); }
export function sanitizeRuntimeMetadata(value: Record<string, unknown> = {}): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).slice(0, 50).map(([key, item]) => {
    const safeKey = sanitizeString(key).slice(0, 80);
    if (/secret|token|password|api[_-]?key|credential/i.test(key)) return [safeKey, "[redacted]"];
    if (typeof item === "string") return [safeKey, sanitizeString(item)];
    if (typeof item === "number" || typeof item === "boolean" || item === null) return [safeKey, item];
    if (Array.isArray(item)) return [safeKey, item.slice(0, 20).map((entry) => typeof entry === "string" ? sanitizeString(entry) : typeof entry === "number" || typeof entry === "boolean" ? entry : "[object]")];
    return [safeKey, "[object]"];
  }));
}
function sanitizeEvent(event: RuntimeInboxEvent): RuntimeInboxEvent {
  const external = event.source === "external_stub";
  return {
    ...event,
    title: sanitizeString(event.title).slice(0, 160),
    body: sanitizeString(event.body).slice(0, 2_000),
    requiresApproval: external ? Boolean(event.requiresApproval) : event.requiresApproval,
    metadata: { ...sanitizeRuntimeMetadata(event.metadata), inert: external ? true : event.metadata?.inert },
  };
}

export class RuntimeInboxService {
  private events: RuntimeInboxEvent[];
  constructor(private readonly backingStorage: StorageLike | undefined = storage()) { this.events = readEvents(this.backingStorage); }

  ingestEvent(input: Omit<RuntimeInboxEvent, "inboxEventId" | "createdAt" | "metadata"> & { inboxEventId?: string; createdAt?: string; metadata?: Record<string, unknown> }): RuntimeInboxEvent {
    const timestamp = input.createdAt ?? nowIso();
    const event = sanitizeEvent({ ...input, inboxEventId: input.inboxEventId ?? `inbox:${timestamp}:${Math.random().toString(36).slice(2, 8)}`, createdAt: timestamp, metadata: input.metadata ?? {} });
    this.events = [event, ...this.events.filter((item) => item.inboxEventId !== event.inboxEventId)];
    this.persist();
    return event;
  }
  listEvents(): RuntimeInboxEvent[] { return [...this.events]; }
  markRead(inboxEventId: string, readAt = nowIso()): RuntimeInboxEvent | undefined { return this.update(inboxEventId, { readAt }); }
  archiveEvent(inboxEventId: string, archivedAt = nowIso()): RuntimeInboxEvent | undefined { return this.update(inboxEventId, { archivedAt }); }
  getUnreadCount(): number { return this.events.filter((event) => !event.readAt && !event.archivedAt).length; }
  getDiagnosticsSummary(): RuntimeInboxDiagnosticsSummary { return { totalEvents: this.events.length, unreadEvents: this.getUnreadCount(), archivedEvents: this.events.filter((event) => event.archivedAt).length, externalInertEvents: this.events.filter((event) => event.source === "external_stub" && event.metadata.inert === true).length, approvalEvents: this.events.filter((event) => event.requiresApproval).length }; }
  private update(inboxEventId: string, update: Partial<RuntimeInboxEvent>): RuntimeInboxEvent | undefined { const event = this.events.find((item) => item.inboxEventId === inboxEventId); if (!event) return undefined; const next = sanitizeEvent({ ...event, ...update }); this.events = this.events.map((item) => item.inboxEventId === inboxEventId ? next : item); this.persist(); return next; }
  private persist(): void { if (this.events.length > MAX_EVENTS) this.events = this.events.slice(0, MAX_EVENTS); this.backingStorage?.setItem(STORAGE_KEY, JSON.stringify(this.events)); }
}
export const runtimeInboxService = new RuntimeInboxService();
