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

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

const RECORDS_KEY = "LUCA_PROVENANCE_RECORDS_V1";
const APPROVALS_KEY = "LUCA_PROVENANCE_APPROVALS_V1";

function nowIso(): string {
  return new Date().toISOString();
}

function getBrowserStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const objectValue = value as Record<string, unknown>;
  return `{${Object.keys(objectValue)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`)
    .join(",")}}`;
}

export function deterministicDigest(value: unknown): string {
  const input = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, "0")}`;
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
    approval.state = "approved_once";
    approval.decidedAt = nowIso();
    this.persist();
    return { ...approval };
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

  checkWhetherActionCanRun(action: ActionInstanceIdentity): ProvenanceRunCheck {
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

    if (blockedBy.length > 0) {
      return {
        allowed: false,
        approvalState: approval?.state ?? "required",
        userSafeReason: this.reasonForBlockedBy(blockedBy),
        actionDigest,
        blockedBy,
      };
    }

    const approved = approval as ProvenanceApprovalRecord;
    approved.state = "expired";
    approved.consumedAt = nowIso();
    this.persist();
    return {
      allowed: true,
      approvalState: "approved_once",
      userSafeReason: "Approved one time for this exact action identity. The approval has now been consumed.",
      actionDigest,
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
    safeWriteArray(this.storage, RECORDS_KEY, this.records);
    safeWriteArray(this.storage, APPROVALS_KEY, this.approvals);
  }
}

export const provenanceGateService = new ProvenanceGateService();
