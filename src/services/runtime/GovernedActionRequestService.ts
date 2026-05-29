import { approvalRequestCenterService, ApprovalRequestCenterService } from "../provenance/ApprovalRequestCenterService";
import { provenanceGateService, ProvenanceGateService } from "../provenance/ProvenanceGateService";
import { runtimeInboxService, RuntimeInboxService, sanitizeRuntimeMetadata } from "./RuntimeInboxService";
import type { GovernedActionRequest, GovernedActionRequestDiagnosticsSummary, GovernedActionRequestKind } from "../../types/governedActionRequest";
import type { ApprovalRequestRiskLevel } from "../../types/approvalCenter";

interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; }
const STORAGE_KEY = "LUCA_GOVERNED_ACTION_REQUESTS_V1";
const MAX_REQUESTS = 500;
function nowIso(): string { return new Date().toISOString(); }
function storage(): StorageLike | undefined { if (typeof window !== "undefined" && window.localStorage) return window.localStorage; if (typeof localStorage !== "undefined") return localStorage; return undefined; }
function readRequests(store: StorageLike | undefined): GovernedActionRequest[] { try { const raw = store?.getItem(STORAGE_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }

export interface CreateGovernedActionRequestInput {
  kind: GovernedActionRequestKind;
  title: string;
  description: string;
  requestedCapability: string;
  target: string;
  parametersPreview?: Record<string, unknown>;
  provenanceIds: string[];
  riskLevel?: ApprovalRequestRiskLevel;
  requestedBy?: string;
  createApprovalRequest?: boolean;
}

export class GovernedActionRequestService {
  private requests: GovernedActionRequest[];
  constructor(private readonly deps: { storage?: StorageLike; provenance: Pick<ProvenanceGateService, "computeActionDigest">; approvals: Pick<ApprovalRequestCenterService, "createApprovalRequest">; inbox: Pick<RuntimeInboxService, "ingestEvent"> } = { storage: storage(), provenance: provenanceGateService, approvals: approvalRequestCenterService, inbox: runtimeInboxService }) { this.requests = readRequests(deps.storage); }
  createRequest(input: CreateGovernedActionRequestInput): GovernedActionRequest {
    if (input.provenanceIds.length === 0) throw new Error("Governed action requests require provenance.");
    const timestamp = nowIso();
    const actionIdentity = { actionInstanceId: `governed:${input.kind}:${timestamp}`, actionType: input.kind, target: input.target, parameters: sanitizeRuntimeMetadata(input.parametersPreview ?? {}), provenanceChain: input.provenanceIds, timestampBucket: timestamp.slice(0, 16) };
    const actionDigest = this.deps.provenance.computeActionDigest(actionIdentity);
    const request: GovernedActionRequest = { requestId: `governed-request:${actionDigest.slice(-8)}:${timestamp}`, kind: input.kind, title: input.title, description: input.description, requestedCapability: input.requestedCapability, target: input.target, parametersPreview: sanitizeRuntimeMetadata(input.parametersPreview ?? {}), provenanceIds: [...input.provenanceIds], actionDigest, status: "approval_required", createdAt: timestamp, updatedAt: timestamp, riskLevel: input.riskLevel ?? "high", dryRunOnly: true };
    if (input.createApprovalRequest ?? true) {
      const approval = this.deps.approvals.createApprovalRequest(actionIdentity, { title: input.title, description: input.description, riskLevel: request.riskLevel, requestedBy: input.requestedBy, sourceType: input.kind, sourceId: request.requestId, actionPreview: request.parametersPreview });
      request.approvalRequestId = approval.approvalRequestId;
    }
    this.upsert(request);
    this.deps.inbox.ingestEvent({ source: input.kind === "skill" ? "skill" : "tool_request", sourceTrustLevel: "local", title: input.title, body: input.description, eventType: "governed_action_request_created", provenance: { provenanceId: input.provenanceIds[0], sourceType: input.kind === "skill" ? "skill" : "tool_action", sourceId: request.requestId, sourceTrustLevel: "local", createdBy: input.requestedBy ?? "luca-runtime", createdAt: timestamp, digest: actionDigest, parentProvenanceIds: input.provenanceIds, quarantineState: "clear", approvalState: "pending", revocationState: "active" }, requiresApproval: true, metadata: { requestId: request.requestId, kind: input.kind, dryRunOnly: true } });
    return request;
  }
  listRequests(): GovernedActionRequest[] { return [...this.requests]; }
  blockRequest(requestId: string, reason = "Blocked by runtime governance."): GovernedActionRequest | undefined { return this.update(requestId, { status: "blocked", parametersPreview: { reason } }); }
  linkApprovalRequest(requestId: string, approvalRequestId: string): GovernedActionRequest | undefined { return this.update(requestId, { approvalRequestId, status: "approval_required" }); }
  markRejected(requestId: string): GovernedActionRequest | undefined { return this.update(requestId, { status: "rejected" }); }
  getDiagnosticsSummary(): GovernedActionRequestDiagnosticsSummary { return { totalRequests: this.requests.length, proposedRequests: this.requests.filter((item) => item.status === "proposed").length, approvalRequiredRequests: this.requests.filter((item) => item.status === "approval_required").length, approvedWaitingExecutionRequests: this.requests.filter((item) => item.status === "approved_waiting_execution").length, rejectedRequests: this.requests.filter((item) => item.status === "rejected").length, blockedRequests: this.requests.filter((item) => item.status === "blocked").length, dryRunOnly: true }; }
  private update(requestId: string, update: Partial<GovernedActionRequest>): GovernedActionRequest | undefined { const existing = this.requests.find((item) => item.requestId === requestId); if (!existing) return undefined; const next = { ...existing, ...update, requestId: existing.requestId, createdAt: existing.createdAt, dryRunOnly: true as const, updatedAt: nowIso() }; this.upsert(next); return next; }
  private upsert(request: GovernedActionRequest): void { this.requests = [request, ...this.requests.filter((item) => item.requestId !== request.requestId)]; if (this.requests.length > MAX_REQUESTS) this.requests = this.requests.slice(0, MAX_REQUESTS); this.deps.storage?.setItem(STORAGE_KEY, JSON.stringify(this.requests)); }
}
export const governedActionRequestService = new GovernedActionRequestService();
