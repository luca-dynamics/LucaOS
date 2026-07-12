import type { SandboxArtifactScanner } from "./SandboxArtifactBridge";
import type { SandboxFleetSessionBroker } from "./SandboxFleetSessionBroker";

export interface SandboxDurableStorage { read(key: string): Promise<string | null>; write(key: string, value: string): Promise<void>; }
export interface SandboxAuditEvent { eventId: string; type: string; missionId?: string; sessionId?: string; outcome: "allowed" | "blocked" | "completed" | "failed"; at: string; details: Record<string, string | number | boolean>; }

export class SandboxAuditLog {
  constructor(private readonly storage: SandboxDurableStorage, private readonly key = "lucaos:sandbox:audit:v1", private readonly id = () => crypto.randomUUID(), private readonly now = () => new Date().toISOString()) {}
  async append(event: Omit<SandboxAuditEvent, "eventId" | "at">): Promise<SandboxAuditEvent> { const entry = { ...event, eventId: this.id(), at: this.now() }; const current = await this.list(); current.push(entry); await this.storage.write(this.key, JSON.stringify(current)); return structuredClone(entry); }
  async list(): Promise<SandboxAuditEvent[]> { const raw = await this.storage.read(this.key); if (!raw) return []; const value: unknown = JSON.parse(raw); if (!Array.isArray(value)) throw new Error("Sandbox audit storage is invalid."); return structuredClone(value as SandboxAuditEvent[]); }
}

export class SandboxCleanupScheduler {
  private timer?: ReturnType<typeof setInterval>;
  constructor(private readonly broker: SandboxFleetSessionBroker, private readonly audit: SandboxAuditLog, private readonly intervalMs = 60_000) { if (intervalMs < 1_000) throw new Error("Sandbox cleanup interval is too short."); }
  start(): void { if (this.timer) return; this.timer = setInterval(() => void this.run(), this.intervalMs); }
  stop(): void { if (this.timer) clearInterval(this.timer); this.timer = undefined; }
  async run(): Promise<number> { await this.broker.expireDueSessions(); const cleaned = await this.broker.cleanupExpiredSessions(); for (const item of cleaned) await this.audit.append({ type: "session.cleanup", missionId: item.missionId, sessionId: item.sessionId, outcome: "completed", details: { snapshotId: item.snapshotId, backendId: item.backendId } }); return cleaned.length; }
}

export class SandboxSecretLeaseBroker {
  private readonly leases = new Map<string, { value: string; sessionId: string; expiresAt: number }>();
  constructor(private readonly id = () => crypto.randomUUID(), private readonly now = () => Date.now()) {}
  issue(sessionId: string, value: string, ttlMs = 60_000): string { if (!sessionId || !value) throw new Error("Secret lease requires a session and value."); if (ttlMs < 1_000 || ttlMs > 300_000) throw new Error("Secret lease TTL is invalid."); const leaseId = this.id(); this.leases.set(leaseId, { value, sessionId, expiresAt: this.now() + ttlMs }); return leaseId; }
  consume(leaseId: string, sessionId: string): string { const lease = this.leases.get(leaseId); this.leases.delete(leaseId); if (!lease || lease.sessionId !== sessionId || lease.expiresAt <= this.now()) throw new Error("Secret lease is invalid or expired."); return lease.value; }
}

export class ClamAvSandboxArtifactScanner implements SandboxArtifactScanner {
  constructor(private readonly scanBytes: (bytes: Uint8Array) => Promise<{ exitCode: number; signature?: string }>) {}
  async scan(input: { artifactId: string; bytes: Uint8Array; digest: string }) { try { const result = await this.scanBytes(new Uint8Array(input.bytes)); return result.exitCode === 0 ? { status: "passed" as const } : { status: "failed" as const, reason: result.signature || "Artifact scanner rejected the file." }; } catch { return { status: "failed" as const, reason: "Artifact scanner is unavailable." }; } }
}
