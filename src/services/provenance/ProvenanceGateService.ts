import type {
  ActionInstanceIdentity,
  ProvenanceApprovalRecord,
  ProvenanceApprovalState,
  ProvenanceDiagnosticsSummary,
  ProvenanceMetadata,
  ProvenanceRunCheck,
  ProvenanceSourceType,
  ProvenanceTrustLevel,
} from "../../types/provenance";
// Synchronous, cross-platform SHA-256 (works in the renderer and in Node, unlike
// WebCrypto's async-only subtle.digest). Used so the security-critical action
// digest is collision-resistant without changing every caller to be async.
import sha256 from "crypto-js/sha256";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

const RECORDS_KEY = "LUCA_PROVENANCE_RECORDS_V1";
const APPROVALS_KEY = "LUCA_PROVENANCE_APPROVALS_V1";
const MAX_RECORDS = 1000;
const MAX_APPROVALS = 1000;

function nowIso(): string {
  return new Date().toISOString();
}

function getBrowserStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

export function stableStringify(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (seen.has(value)) return '"[circular]"';
  seen.add(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item, seen)).join(",")}]`;
  const objectValue = value as Record<string, unknown>;
  return `{${Object.keys(objectValue)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key], seen)}`)
    .join(",")}}`;
}

function fnv1aFallback(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function deterministicDigest(value: unknown): string {
  const input = stableStringify(value);
  try {
    // Real SHA-256. This binds an approval to an exact action; the previous
    // 32-bit FNV-1a was collision-prone (an attacker controlling action
    // parameters could brute-force a colliding digest and reuse an approval).
    return `sha256:${sha256(input).toString()}`;
  } catch {
    // Last resort only. FNV-1a is NOT collision-resistant and must never be
    // relied on for security identity; reaching here means the hash library
    // failed to load, which is itself a defect worth surfacing.
    console.error("[Provenance] SHA-256 digest failed; using non-secure fallback.");
    return fnv1aFallback(input);
  }
}

export async function deterministicDigestAsync(value: unknown): Promise<string> {
  const input = stableStringify(value);
  if (typeof globalThis.crypto?.subtle?.digest === "function") {
    try {
      const encoded = new TextEncoder().encode(input);
      const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", encoded);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return `sha256:${hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
    } catch {
      return fnv1aFallback(input);
    }
  }
  return fnv1aFallback(input);
}

function safeReadArray<T>(storage: StorageLike | undefined, key: string): T[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteArray<T>(storage: StorageLike | undefined, key: string, value: T[]): void {
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
}

export class ProvenanceGateService {
  private records: ProvenanceMetadata[];
  private approvals: ProvenanceApprovalRecord[];

  constructor(private readonly storage: StorageLike | undefined = getBrowserStorage()) {
    this.records = safeReadArray<ProvenanceMetadata>(this.storage, RECORDS_KEY);
    this.approvals = safeReadArray<ProvenanceApprovalRecord>(this.storage, APPROVALS_KEY);
  }

  createProvenanceRecord(input: {
    sourceType: ProvenanceSourceType;
    sourceId: string;
    sourceTrustLevel?: ProvenanceTrustLevel;
    createdBy?: string;
    expiresAt?: string;
    parentProvenanceIds?: string[];
    approvalState?: ProvenanceApprovalState;
  }): ProvenanceMetadata {
    const createdAt = nowIso();
    const digest = this.computeDigest({
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceTrustLevel: input.sourceTrustLevel ?? "unknown",
      createdBy: input.createdBy ?? "luca-runtime",
      createdAt,
      parentProvenanceIds: input.parentProvenanceIds ?? [],
    });
    const record: ProvenanceMetadata = {
      provenanceId: `prov:${digest.slice(-8)}:${createdAt}`,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceTrustLevel: input.sourceTrustLevel ?? "unknown",
      createdBy: input.createdBy ?? "luca-runtime",
      createdAt,
      expiresAt: input.expiresAt,
      digest,
      parentProvenanceIds: input.parentProvenanceIds ?? [],
      quarantineState: "clear",
      approvalState: input.approvalState ?? "required",
      revocationState: "active",
    };
    this.records = [...this.records.filter((item) => item.provenanceId !== record.provenanceId), record];
    this.persist();
    return record;
  }

  computeDigest(value: unknown): string {
    return deterministicDigest(value);
  }

  computeActionDigest(identity: ActionInstanceIdentity): string {
    return this.computeDigest({
      actionInstanceId: identity.actionInstanceId,
      actionType: identity.actionType,
      target: identity.target,
      parameters: identity.parameters,
      provenanceChain: [...identity.provenanceChain].sort(),
      timestampBucket: identity.timestampBucket,
    });
  }

  listRecords(): ProvenanceMetadata[] {
    return [...this.records];
  }

  requestApproval(action: ActionInstanceIdentity, reason = "Owner approval required before this action can run."): ProvenanceApprovalRecord {
    const actionDigest = this.computeActionDigest(action);
    const record: ProvenanceApprovalRecord = {
      approvalId: `approval:${actionDigest.slice(-8)}:${nowIso()}`,
      actionDigest,
      provenanceIds: [...action.provenanceChain],
      state: "pending",
      createdAt: nowIso(),
      userSafeReason: reason,
    };
    this.approvals = [...this.approvals.filter((item) => item.actionDigest !== actionDigest || item.state !== "pending"), record];
    this.persist();
    return record;
  }

  approveOnce(actionDigest: string): ProvenanceApprovalRecord | undefined {
    const approval = this.approvals.find((item) => item.actionDigest === actionDigest && item.state === "pending");
    if (!approval) return undefined;
    const updated = { ...approval, state: "approved_once" as const, decidedAt: nowIso() };
    this.approvals = this.approvals.map((item) =>
      item.approvalId === approval.approvalId ? updated : item,
    );
    this.persist();
    return { ...updated };
  }

  reject(actionDigest: string): void {
    this.updateApproval(actionDigest, "rejected");
  }

  revoke(provenanceId: string): void {
    this.records = this.records.map((record) =>
      record.provenanceId === provenanceId ? { ...record, revocationState: "revoked", approvalState: "revoked" } : record,
    );
    this.persist();
  }

  quarantine(provenanceId: string): void {
    this.records = this.records.map((record) =>
      record.provenanceId === provenanceId ? { ...record, quarantineState: "quarantined" } : record,
    );
    this.persist();
  }

  canActionRun(action: ActionInstanceIdentity): ProvenanceRunCheck {
    const actionDigest = this.computeActionDigest(action);
    const blockedBy: string[] = [];
    const now = Date.now();
    const chain = this.records.filter((record) => action.provenanceChain.includes(record.provenanceId));

    if (action.provenanceChain.length === 0 || chain.length !== action.provenanceChain.length) blockedBy.push("missing_provenance");
    if (chain.some((record) => record.quarantineState === "quarantined")) blockedBy.push("quarantined_provenance");
    if (chain.some((record) => record.revocationState === "revoked")) blockedBy.push("revoked_provenance");
    if (chain.some((record) => record.expiresAt && Date.parse(record.expiresAt) <= now)) blockedBy.push("expired_provenance");

    const approval = this.approvals.find((item) => item.actionDigest === actionDigest && item.state === "approved_once");
    if (!approval) blockedBy.push("approval_required");

    return {
      allowed: blockedBy.length === 0,
      approvalState: approval?.state ?? "required",
      userSafeReason: blockedBy.length > 0
        ? this.reasonForBlockedBy(blockedBy)
        : "Action is approved and can run.",
      actionDigest,
      blockedBy,
    };
  }

  checkWhetherActionCanRun(action: ActionInstanceIdentity): ProvenanceRunCheck {
    const check = this.canActionRun(action);
    if (!check.allowed) return check;

    const approval = this.approvals.find(
      (item) => item.actionDigest === check.actionDigest && item.state === "approved_once",
    );
    if (approval) {
      this.approvals = this.approvals.map((item) =>
        item.approvalId === approval.approvalId
          ? { ...item, state: "expired" as const, consumedAt: nowIso() }
          : item,
      );
      this.persist();
    }
    return {
      allowed: true,
      approvalState: "approved_once",
      userSafeReason: "Approved one time for this exact action identity. The approval has now been consumed.",
      actionDigest: check.actionDigest,
      blockedBy: [],
    };
  }

  getDiagnosticsSummary(): ProvenanceDiagnosticsSummary {
    const now = Date.now();
    return {
      totalRecords: this.records.length,
      pendingApprovals: this.approvals.filter((item) => item.state === "pending").length,
      approvedOnce: this.approvals.filter((item) => item.state === "approved_once").length,
      quarantinedRecords: this.records.filter((record) => record.quarantineState === "quarantined").length,
      revokedRecords: this.records.filter((record) => record.revocationState === "revoked").length,
      expiredRecords: this.records.filter((record) => record.expiresAt && Date.parse(record.expiresAt) <= now).length,
    };
  }

  private updateApproval(actionDigest: string, state: ProvenanceApprovalState): void {
    this.approvals = this.approvals.map((approval) =>
      approval.actionDigest === actionDigest ? { ...approval, state, decidedAt: nowIso() } : approval,
    );
    this.persist();
  }

  private reasonForBlockedBy(blockedBy: string[]): string {
    if (blockedBy.includes("missing_provenance")) return "This action is blocked because Luca cannot verify where all inputs came from.";
    if (blockedBy.includes("quarantined_provenance")) return "This action is blocked because one or more source items are quarantined.";
    if (blockedBy.includes("revoked_provenance")) return "This action is blocked because source approval was revoked.";
    if (blockedBy.includes("expired_provenance")) return "This action is blocked because source approval expired.";
    return "This action requires a fresh one-time approval for its exact inputs.";
  }

  private persist(): void {
    if (this.records.length > MAX_RECORDS) this.records = this.records.slice(-MAX_RECORDS);
    if (this.approvals.length > MAX_APPROVALS) this.approvals = this.approvals.slice(-MAX_APPROVALS);
    safeWriteArray(this.storage, RECORDS_KEY, this.records);
    safeWriteArray(this.storage, APPROVALS_KEY, this.approvals);
  }
}

export const provenanceGateService = new ProvenanceGateService();
