import { runtimeInboxService, RuntimeInboxService, sanitizeRuntimeMetadata } from "../runtime/RuntimeInboxService";
import { provenanceGateService, ProvenanceGateService } from "./ProvenanceGateService";
import type { ActionInstanceIdentity } from "../../types/provenance";
import type { ApprovalRequest, ApprovalRequestDiagnosticsSummary, CreateApprovalRequestMetadata } from "../../types/approvalCenter";

interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; }
const STORAGE_KEY = "LUCA_APPROVAL_CENTER_REQUESTS_V1";
const LOG_PREFIX = "[ApprovalRequestCenter]";
const MAX_REQUESTS = 500;
function nowIso(): string { return new Date().toISOString(); }
function storage(): StorageLike | undefined { if (typeof window !== "undefined" && window.localStorage) return window.localStorage; if (typeof localStorage !== "undefined") return localStorage; return undefined; }
function readRequests(store: StorageLike | undefined): ApprovalRequest[] { try { const raw = store?.getItem(STORAGE_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }

export class ApprovalRequestCenterService {
  private requests: ApprovalRequest[];
  private inProgressDigests = new Set<string>();
  constructor(private readonly deps: { storage?: StorageLike; provenance: Pick<ProvenanceGateService, "requestApproval" | "approveOnce" | "reject" | "revoke" | "computeActionDigest">; inbox: Pick<RuntimeInboxService, "ingestEvent"> } = { storage: storage(), provenance: provenanceGateService, inbox: runtimeInboxService }) { this.requests = readRequests(deps.storage); }
  createApprovalRequest(actionIdentity: ActionInstanceIdentity, metadata: CreateApprovalRequestMetadata): ApprovalRequest {
    this.refreshFromStorage();
    const actionDigest = this.deps.provenance.computeActionDigest(actionIdentity);
    const dedupeKey = `${actionDigest}:${metadata.sourceType}:${metadata.sourceId}`;
    const existing = this.findPendingRequestByActionDigest(actionDigest, metadata.sourceType, metadata.sourceId);
    if (existing) {
      console.info(`${LOG_PREFIX} Deduplicated approval request for digest=${actionDigest.slice(-8)} source=${metadata.sourceType}:${metadata.sourceId} existingId=${existing.approvalRequestId}`);
      return existing;
    }
    if (this.inProgressDigests.has(dedupeKey)) {
      console.warn(`${LOG_PREFIX} Concurrent creation blocked for digest=${actionDigest.slice(-8)} source=${metadata.sourceType}:${metadata.sourceId} — already in progress`);
      const retry = this.findPendingRequestByActionDigest(actionDigest, metadata.sourceType, metadata.sourceId);
      if (retry) return retry;
    }
    this.inProgressDigests.add(dedupeKey);
    try {
      const approval = this.deps.provenance.requestApproval(actionIdentity, metadata.userSafeReason ?? "Owner approval is required before any future gated bridge can run this action.");
      const timestamp = nowIso();
      const request: ApprovalRequest = { approvalRequestId: `approval-request:${approval.actionDigest.slice(-8)}:${timestamp}`, actionDigest: approval.actionDigest, title: metadata.title, description: metadata.description, riskLevel: metadata.riskLevel ?? "high", requestedBy: metadata.requestedBy ?? "luca-runtime", sourceType: metadata.sourceType, sourceId: metadata.sourceId, provenanceIds: [...actionIdentity.provenanceChain], status: "pending", createdAt: timestamp, expiresAt: metadata.expiresAt, userSafeReason: approval.userSafeReason, actionPreview: sanitizeRuntimeMetadata(metadata.actionPreview ?? actionIdentity.parameters) };
      this.upsert(request);
      this.deps.inbox.ingestEvent({ source: metadata.sourceType === "skill" ? "skill" : metadata.sourceType === "tool" ? "tool_request" : "system", sourceTrustLevel: "local", title: request.title, body: request.description, eventType: "approval_request_created", provenance: { provenanceId: actionIdentity.provenanceChain[0] ?? "missing", sourceType: "runtime_snapshot", sourceId: request.approvalRequestId, sourceTrustLevel: "local", createdBy: request.requestedBy, createdAt: timestamp, digest: request.actionDigest, parentProvenanceIds: actionIdentity.provenanceChain, quarantineState: "clear", approvalState: "pending", revocationState: "active" }, requiresApproval: true, metadata: { approvalRequestId: request.approvalRequestId, riskLevel: request.riskLevel } });
      console.info(`${LOG_PREFIX} Created approval request id=${request.approvalRequestId} digest=${actionDigest.slice(-8)} source=${metadata.sourceType}:${metadata.sourceId}`);
      return request;
    } finally {
      this.inProgressDigests.delete(dedupeKey);
    }
  }
  listRequests(): ApprovalRequest[] { return [...this.requests]; }
  getRequest(approvalRequestId: string): ApprovalRequest | undefined { return this.requests.find((item) => item.approvalRequestId === approvalRequestId); }
  findRequestByActionDigest(actionDigest: string): ApprovalRequest | undefined { return this.requests.find((item) => item.actionDigest === actionDigest); }
  hasApprovedOnce(approvalRequestId: string): boolean { const request = this.requests.find((item) => item.approvalRequestId === approvalRequestId); return request?.status === "approved_once"; }
  findPendingRequestByActionDigest(actionDigest: string, sourceType?: ApprovalRequest["sourceType"], sourceId?: string): ApprovalRequest | undefined {
    return this.requests.find((item) => item.status === "pending"
      && item.actionDigest === actionDigest
      && (sourceType ? item.sourceType === sourceType : true)
      && (sourceId ? item.sourceId === sourceId : true));
  }
  approveOnce(requestId: string): ApprovalRequest | undefined { const request = this.requests.find((item) => item.approvalRequestId === requestId); if (!request) return undefined; const approved = this.deps.provenance.approveOnce(request.actionDigest); if (!approved) return undefined; return this.update(requestId, { status: "approved_once", decidedAt: approved.decidedAt ?? nowIso() }); }
  reject(requestId: string): ApprovalRequest | undefined { const request = this.requests.find((item) => item.approvalRequestId === requestId); if (!request) return undefined; this.deps.provenance.reject(request.actionDigest); return this.update(requestId, { status: "rejected", decidedAt: nowIso() }); }
  revoke(requestId: string): ApprovalRequest | undefined {
    const request = this.requests.find((item) => item.approvalRequestId === requestId);
    if (!request) return undefined;
    for (const provenanceId of request.provenanceIds) {
      this.deps.provenance.revoke(provenanceId);
    }
    return this.update(requestId, { status: "revoked", decidedAt: nowIso() });
  }
  expireOldRequests(at: string = nowIso()): ApprovalRequest[] { const expired = this.requests.filter((item) => item.status === "pending" && item.expiresAt && Date.parse(item.expiresAt) <= Date.parse(at)); expired.forEach((item) => this.update(item.approvalRequestId, { status: "expired", decidedAt: at })); return expired.map((item) => ({ ...item, status: "expired", decidedAt: at })); }
  getDiagnosticsSummary(): ApprovalRequestDiagnosticsSummary { return { totalRequests: this.requests.length, pendingRequests: this.requests.filter((item) => item.status === "pending").length, approvedOnceRequests: this.requests.filter((item) => item.status === "approved_once").length, rejectedRequests: this.requests.filter((item) => item.status === "rejected").length, expiredRequests: this.requests.filter((item) => item.status === "expired").length, revokedRequests: this.requests.filter((item) => item.status === "revoked").length }; }
  private refreshFromStorage(): void {
    const stored = readRequests(this.deps.storage);
    if (stored.length === 0) return;
    const knownIds = new Set(this.requests.map((r) => r.approvalRequestId));
    let merged = false;
    for (const item of stored) {
      if (!knownIds.has(item.approvalRequestId)) {
        this.requests.push(item);
        merged = true;
      }
    }
    if (merged) {
      console.info(`${LOG_PREFIX} Merged externally created approval requests from storage`);
    }
  }
  private update(requestId: string, update: Partial<ApprovalRequest>): ApprovalRequest | undefined { const existing = this.requests.find((item) => item.approvalRequestId === requestId); if (!existing) return undefined; const next = { ...existing, ...update }; this.upsert(next); return next; }
  private upsert(request: ApprovalRequest): void { this.requests = [request, ...this.requests.filter((item) => item.approvalRequestId !== request.approvalRequestId)]; if (this.requests.length > MAX_REQUESTS) this.requests = this.requests.slice(0, MAX_REQUESTS); this.deps.storage?.setItem(STORAGE_KEY, JSON.stringify(this.requests)); }
}
export const approvalRequestCenterService = new ApprovalRequestCenterService();
