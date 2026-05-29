import { eventBus } from "../eventBus";
import { approvalRequestCenterService, type ApprovalRequestCenterService } from "../provenance/ApprovalRequestCenterService";
import { provenanceGateService, type ProvenanceGateService } from "../provenance/ProvenanceGateService";
import { runtimeInboxService, type RuntimeInboxService, sanitizeRuntimeMetadata } from "../runtime/RuntimeInboxService";
import type { ActionInstanceIdentity } from "../../types/provenance";
import type { ApprovalRequestRiskLevel } from "../../types/approvalCenter";
import {
  SKILL_GOVERNANCE_RISKY_CAPABILITIES,
  type SkillGovernanceDiagnosticsSummary,
  type SkillGovernanceRequest,
  type SkillGovernanceRequestType,
} from "../../types/skillGovernance";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "LUCA_SKILL_GOVERNANCE_REQUESTS_V1";
const MAX_REQUESTS = 500;

function nowIso(): string {
  return new Date().toISOString();
}

function getStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

function readRequests(store: StorageLike | undefined): SkillGovernanceRequest[] {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function flagRiskyCapabilities(capabilities: string[]): string[] {
  const risky = new Set(SKILL_GOVERNANCE_RISKY_CAPABILITIES.map((item) => item.toLowerCase()));
  return capabilities.filter((capability) =>
    Array.from(risky).some((needle) => capability.toLowerCase().includes(needle)),
  );
}

export interface CreateSkillGovernanceRequestInput {
  skillId: string;
  skillName: string;
  requestType: SkillGovernanceRequestType;
  title: string;
  description: string;
  requestedCapabilities?: string[];
  riskLevel?: ApprovalRequestRiskLevel;
  provenanceIds: string[];
  requestedBy?: string;
  metadata?: Record<string, unknown>;
  createApprovalRequest?: boolean;
}

export interface SkillGovernanceServiceDependencies {
  storage?: StorageLike;
  provenance: Pick<ProvenanceGateService, "computeActionDigest">;
  approvals: Pick<ApprovalRequestCenterService, "createApprovalRequest" | "approveOnce" | "reject" | "revoke">;
  inbox: Pick<RuntimeInboxService, "ingestEvent">;
  bus: Pick<typeof eventBus, "emitEvent" | "emit">;
}

export class SkillGovernanceService {
  private requests: SkillGovernanceRequest[];

  constructor(
    private readonly deps: SkillGovernanceServiceDependencies = {
      storage: getStorage(),
      provenance: provenanceGateService,
      approvals: approvalRequestCenterService,
      inbox: runtimeInboxService,
      bus: eventBus,
    },
  ) {
    this.requests = readRequests(this.deps.storage);
  }

  createSkillRequest(input: CreateSkillGovernanceRequestInput): SkillGovernanceRequest {
    if (input.provenanceIds.length === 0) {
      throw new Error("Skill governance requests require provenance.");
    }

    const timestamp = nowIso();
    const requestedCapabilities = (input.requestedCapabilities ?? []).map((capability) => capability.slice(0, 80));
    const riskyCapabilities = flagRiskyCapabilities(requestedCapabilities);
    const riskLevel: ApprovalRequestRiskLevel = riskyCapabilities.length > 0 ? "critical" : input.riskLevel ?? "high";

    const actionIdentity: ActionInstanceIdentity = {
      actionInstanceId: `skill-request:${input.requestType}:${input.skillId}:${timestamp}`,
      actionType: "skill",
      target: `skill:${input.skillId}`,
      parameters: sanitizeRuntimeMetadata({ requestType: input.requestType, skillName: input.skillName }),
      provenanceChain: [...input.provenanceIds],
      timestampBucket: timestamp.slice(0, 16),
    };
    const actionDigest = this.deps.provenance.computeActionDigest(actionIdentity);

    const request: SkillGovernanceRequest = {
      skillRequestId: `skill-request:${actionDigest.slice(-8)}:${timestamp}`,
      skillId: input.skillId,
      skillName: input.skillName,
      requestType: input.requestType,
      title: input.title.slice(0, 160),
      description: input.description.slice(0, 2_000),
      requestedCapabilities,
      riskLevel,
      provenanceIds: [...input.provenanceIds],
      actionDigest,
      status: "approval_required",
      createdAt: timestamp,
      updatedAt: timestamp,
      blockedBy: riskyCapabilities.length > 0 ? riskyCapabilities.map((capability) => `risky_capability:${capability}`) : undefined,
      metadata: sanitizeRuntimeMetadata({ ...(input.metadata ?? {}), riskyCapabilities }),
    };

    if (input.createApprovalRequest ?? true) {
      const approval = this.deps.approvals.createApprovalRequest(actionIdentity, {
        title: request.title,
        description: request.description,
        riskLevel,
        requestedBy: input.requestedBy ?? "luca-runtime",
        sourceType: "skill",
        sourceId: request.skillRequestId,
        actionPreview: { requestType: input.requestType, skillName: input.skillName, requestedCapabilities },
      });
      request.approvalRequestId = approval.approvalRequestId;
    }

    this.upsert(request);
    this.createInboxEvent(request, "skill_request_created", `Skill request created: ${request.title}`);
    this.emit("skill_request_created", request);
    return request;
  }

  listSkillRequests(): SkillGovernanceRequest[] {
    return [...this.requests];
  }

  getSkillRequest(skillRequestId: string): SkillGovernanceRequest | undefined {
    return this.requests.find((item) => item.skillRequestId === skillRequestId);
  }

  // State-only approval. This NEVER installs, enables, updates, removes, or runs
  // a skill. Skills remain non-autonomous (canAutoExecute: false) and require a
  // future secure execution bridge before any execution is possible.
  approveSkillRequest(skillRequestId: string): SkillGovernanceRequest | undefined {
    const request = this.getSkillRequest(skillRequestId);
    if (!request) return undefined;
    if (request.blockedBy && request.blockedBy.length > 0) {
      return this.blockSkillRequest(skillRequestId, "Cannot approve: request includes risky capabilities.");
    }
    if (request.approvalRequestId) this.deps.approvals.approveOnce(request.approvalRequestId);
    const nextStatus = request.requestType === "install" ? "approved_waiting_install" : "approved_waiting_execution";
    const updated = this.update(skillRequestId, { status: nextStatus });
    if (updated) {
      this.createInboxEvent(updated, "skill_request_approved", "Skill request approved — waiting for a future secure bridge. No skill runs in this state.");
      this.emit("skill_request_approved", updated);
    }
    return updated;
  }

  rejectSkillRequest(skillRequestId: string): SkillGovernanceRequest | undefined {
    const request = this.getSkillRequest(skillRequestId);
    if (!request) return undefined;
    if (request.approvalRequestId) this.deps.approvals.reject(request.approvalRequestId);
    const updated = this.update(skillRequestId, { status: "rejected" });
    if (updated) {
      this.createInboxEvent(updated, "skill_request_rejected", "Skill request rejected.");
      this.emit("skill_request_rejected", updated);
    }
    return updated;
  }

  revokeSkillRequest(skillRequestId: string): SkillGovernanceRequest | undefined {
    const request = this.getSkillRequest(skillRequestId);
    if (!request) return undefined;
    if (request.approvalRequestId) this.deps.approvals.revoke(request.approvalRequestId);
    const updated = this.update(skillRequestId, { status: "revoked" });
    if (updated) {
      this.createInboxEvent(updated, "skill_request_rejected", "Skill request revoked.");
      this.emit("skill_request_rejected", updated);
    }
    return updated;
  }

  blockSkillRequest(skillRequestId: string, reason: string): SkillGovernanceRequest | undefined {
    const existing = this.getSkillRequest(skillRequestId);
    const blockedBy = existing?.blockedBy && existing.blockedBy.length > 0 ? existing.blockedBy : [reason];
    const updated = this.update(skillRequestId, { status: "blocked", blockedBy });
    if (updated) {
      this.createInboxEvent(updated, "skill_request_blocked", `Skill request blocked: ${reason}`);
      this.emit("skill_request_blocked", updated, { reason });
    }
    return updated;
  }

  getDiagnosticsSummary(): SkillGovernanceDiagnosticsSummary {
    return {
      totalRequests: this.requests.length,
      proposedRequests: this.requests.filter((item) => item.status === "proposed").length,
      approvalRequiredRequests: this.requests.filter((item) => item.status === "approval_required").length,
      approvedWaitingRequests: this.requests.filter(
        (item) => item.status === "approved_waiting_install" || item.status === "approved_waiting_execution",
      ).length,
      rejectedRequests: this.requests.filter((item) => item.status === "rejected").length,
      blockedRequests: this.requests.filter((item) => item.status === "blocked").length,
      revokedRequests: this.requests.filter((item) => item.status === "revoked").length,
      expiredRequests: this.requests.filter((item) => item.status === "expired").length,
      canAutoExecute: false,
    };
  }

  private createInboxEvent(request: SkillGovernanceRequest, eventType: string, body: string): void {
    this.deps.inbox.ingestEvent({
      source: "skill",
      sourceTrustLevel: "local",
      title: request.title,
      body,
      eventType,
      relatedSkillId: request.skillId,
      provenance: {
        provenanceId: request.provenanceIds[0] ?? "unknown",
        sourceType: "skill",
        sourceId: request.skillRequestId,
        sourceTrustLevel: "local",
        createdBy: "luca-runtime",
        createdAt: nowIso(),
        digest: request.actionDigest,
        parentProvenanceIds: request.provenanceIds,
        quarantineState: "clear",
        approvalState: request.status.startsWith("approved") ? "approved_once" : "pending",
        revocationState: "active",
      },
      requiresApproval: request.status === "approval_required",
      metadata: sanitizeRuntimeMetadata({ skillRequestId: request.skillRequestId, requestType: request.requestType, riskLevel: request.riskLevel, canAutoExecute: false }),
    });
  }

  private emit(type: string, request: SkillGovernanceRequest, extra: Record<string, unknown> = {}): void {
    this.deps.bus.emitEvent({
      type,
      message: `${type}: ${request.title}`,
      priority: type === "skill_request_blocked" ? "HIGH" : "MEDIUM",
      context: { timestamp: Date.now(), skillRequestId: request.skillRequestId, ...extra },
    });
    this.deps.bus.emit(type, { skillRequestId: request.skillRequestId, ...extra });
  }

  private update(skillRequestId: string, update: Partial<SkillGovernanceRequest>): SkillGovernanceRequest | undefined {
    const existing = this.getSkillRequest(skillRequestId);
    if (!existing) return undefined;
    const next: SkillGovernanceRequest = {
      ...existing,
      ...update,
      skillRequestId: existing.skillRequestId,
      createdAt: existing.createdAt,
      updatedAt: nowIso(),
    };
    this.requests = this.requests.map((item) => (item.skillRequestId === skillRequestId ? next : item));
    this.persist();
    return next;
  }

  private upsert(request: SkillGovernanceRequest): void {
    this.requests = [request, ...this.requests.filter((item) => item.skillRequestId !== request.skillRequestId)];
    this.persist();
  }

  private persist(): void {
    if (this.requests.length > MAX_REQUESTS) this.requests = this.requests.slice(0, MAX_REQUESTS);
    this.deps.storage?.setItem(STORAGE_KEY, JSON.stringify(this.requests));
  }
}

export const skillGovernanceService = new SkillGovernanceService();
