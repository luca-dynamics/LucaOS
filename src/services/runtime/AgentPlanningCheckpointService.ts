import { eventBus } from "../eventBus";
import { runtimeInboxService, type RuntimeInboxService, sanitizeRuntimeMetadata } from "./RuntimeInboxService";
import type { ApprovalRequestRiskLevel } from "../../types/approvalCenter";
import {
  type AgentPlanningCheckpoint,
  type AgentPlanningCheckpointDiagnosticsSummary,
  type AgentPlanningCheckpointStatus,
} from "../../types/agentPlanningCheckpoint";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "LUCA_AGENT_PLANNING_CHECKPOINTS_V1";
const MAX_CHECKPOINTS = 300;

function nowIso(): string {
  return new Date().toISOString();
}

function getStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

function readCheckpoints(store: StorageLike | undefined): AgentPlanningCheckpoint[] {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sanitizeList(values: string[] | undefined, max = 20): string[] {
  return (values ?? []).slice(0, max).map((value) => String(value).slice(0, 240));
}

export interface CreateAgentPlanningCheckpointInput {
  title: string;
  summary: string;
  proposedNextSteps?: string[];
  sessionId?: string;
  riskLevel?: ApprovalRequestRiskLevel;
  requiredApprovals?: string[];
  relatedGovernedRequestIds?: string[];
  relatedMemoryProposalIds?: string[];
  relatedSkillRequestIds?: string[];
  provenanceIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface AgentPlanningCheckpointDependencies {
  storage?: StorageLike;
  inbox: Pick<RuntimeInboxService, "ingestEvent">;
  bus: Pick<typeof eventBus, "emitEvent" | "emit">;
}

export class AgentPlanningCheckpointService {
  private checkpoints: AgentPlanningCheckpoint[];

  constructor(
    private readonly deps: AgentPlanningCheckpointDependencies = {
      storage: getStorage(),
      inbox: runtimeInboxService,
      bus: eventBus,
    },
  ) {
    this.checkpoints = readCheckpoints(this.deps.storage);
  }

  createCheckpoint(input: CreateAgentPlanningCheckpointInput): AgentPlanningCheckpoint {
    const timestamp = nowIso();
    const checkpoint: AgentPlanningCheckpoint = {
      checkpointId: `planning-checkpoint:${timestamp}:${Math.random().toString(36).slice(2, 8)}`,
      sessionId: input.sessionId,
      title: input.title.slice(0, 160),
      summary: input.summary.slice(0, 2_000),
      proposedNextSteps: sanitizeList(input.proposedNextSteps),
      riskLevel: input.riskLevel ?? "medium",
      requiredApprovals: sanitizeList(input.requiredApprovals),
      relatedGovernedRequestIds: sanitizeList(input.relatedGovernedRequestIds),
      relatedMemoryProposalIds: sanitizeList(input.relatedMemoryProposalIds),
      relatedSkillRequestIds: sanitizeList(input.relatedSkillRequestIds),
      status: "proposed",
      provenanceIds: sanitizeList(input.provenanceIds),
      createdAt: timestamp,
      updatedAt: timestamp,
      metadata: sanitizeRuntimeMetadata(input.metadata ?? {}),
    };
    this.upsert(checkpoint);
    this.createInboxEvent(checkpoint, "planning_checkpoint_created", "Planning checkpoint recorded. No tools or skills run from this checkpoint.");
    this.emit("planning_checkpoint_created", checkpoint);
    return checkpoint;
  }

  listCheckpoints(): AgentPlanningCheckpoint[] {
    return [...this.checkpoints];
  }

  getCheckpoint(checkpointId: string): AgentPlanningCheckpoint | undefined {
    return this.checkpoints.find((item) => item.checkpointId === checkpointId);
  }

  // Approving a checkpoint NEVER runs tools or skills. It only marks the plan as
  // allowed to proceed to future governed-request creation.
  approveCheckpoint(checkpointId: string): AgentPlanningCheckpoint | undefined {
    const updated = this.update(checkpointId, { status: "approved" });
    if (updated) {
      this.createInboxEvent(updated, "planning_checkpoint_approved", "Planning checkpoint approved. The plan may proceed to governed requests; nothing executes automatically.");
      this.emit("planning_checkpoint_approved", updated);
    }
    return updated;
  }

  rejectCheckpoint(checkpointId: string): AgentPlanningCheckpoint | undefined {
    const updated = this.update(checkpointId, { status: "rejected" });
    if (updated) {
      this.createInboxEvent(updated, "planning_checkpoint_rejected", "Planning checkpoint rejected.");
      this.emit("planning_checkpoint_rejected", updated);
    }
    return updated;
  }

  blockCheckpoint(checkpointId: string, reason: string): AgentPlanningCheckpoint | undefined {
    const updated = this.update(checkpointId, { status: "blocked", blockedBy: [reason] });
    if (updated) {
      this.createInboxEvent(updated, "planning_checkpoint_blocked", `Planning checkpoint blocked: ${reason}`);
      this.emit("planning_checkpoint_blocked", updated, { reason });
    }
    return updated;
  }

  completeCheckpoint(checkpointId: string): AgentPlanningCheckpoint | undefined {
    return this.update(checkpointId, { status: "completed" });
  }

  archiveCheckpoint(checkpointId: string): AgentPlanningCheckpoint | undefined {
    return this.update(checkpointId, { status: "archived" });
  }

  getDiagnosticsSummary(): AgentPlanningCheckpointDiagnosticsSummary {
    const countByStatus = (status: AgentPlanningCheckpointStatus) =>
      this.checkpoints.filter((item) => item.status === status).length;
    return {
      totalCheckpoints: this.checkpoints.length,
      proposedCheckpoints: countByStatus("proposed"),
      approvedCheckpoints: countByStatus("approved"),
      rejectedCheckpoints: countByStatus("rejected"),
      blockedCheckpoints: countByStatus("blocked"),
      completedCheckpoints: countByStatus("completed"),
      archivedCheckpoints: countByStatus("archived"),
      canAutoExecute: false,
    };
  }

  private createInboxEvent(checkpoint: AgentPlanningCheckpoint, eventType: string, body: string): void {
    this.deps.inbox.ingestEvent({
      source: "system",
      sourceTrustLevel: "local",
      title: checkpoint.title,
      body,
      eventType,
      relatedSessionId: checkpoint.sessionId,
      provenance: {
        provenanceId: checkpoint.provenanceIds[0] ?? "unknown",
        sourceType: "runtime_snapshot",
        sourceId: checkpoint.checkpointId,
        sourceTrustLevel: "local",
        createdBy: "luca-runtime",
        createdAt: nowIso(),
        digest: checkpoint.checkpointId,
        parentProvenanceIds: checkpoint.provenanceIds,
        quarantineState: "clear",
        approvalState: checkpoint.status === "approved" ? "approved_once" : "pending",
        revocationState: "active",
      },
      requiresApproval: checkpoint.status === "proposed",
      metadata: sanitizeRuntimeMetadata({ checkpointId: checkpoint.checkpointId, riskLevel: checkpoint.riskLevel, canAutoExecute: false }),
    });
  }

  private emit(type: string, checkpoint: AgentPlanningCheckpoint, extra: Record<string, unknown> = {}): void {
    this.deps.bus.emitEvent({
      type,
      message: `${type}: ${checkpoint.title}`,
      priority: type === "planning_checkpoint_blocked" ? "HIGH" : "LOW",
      context: { timestamp: Date.now(), checkpointId: checkpoint.checkpointId, ...extra },
    });
    this.deps.bus.emit(type, { checkpointId: checkpoint.checkpointId, ...extra });
  }

  private update(checkpointId: string, update: Partial<AgentPlanningCheckpoint>): AgentPlanningCheckpoint | undefined {
    const existing = this.getCheckpoint(checkpointId);
    if (!existing) return undefined;
    const next: AgentPlanningCheckpoint = {
      ...existing,
      ...update,
      checkpointId: existing.checkpointId,
      createdAt: existing.createdAt,
      updatedAt: nowIso(),
    };
    this.checkpoints = this.checkpoints.map((item) => (item.checkpointId === checkpointId ? next : item));
    this.persist();
    return next;
  }

  private upsert(checkpoint: AgentPlanningCheckpoint): void {
    this.checkpoints = [checkpoint, ...this.checkpoints.filter((item) => item.checkpointId !== checkpoint.checkpointId)];
    this.persist();
  }

  private persist(): void {
    if (this.checkpoints.length > MAX_CHECKPOINTS) this.checkpoints = this.checkpoints.slice(0, MAX_CHECKPOINTS);
    this.deps.storage?.setItem(STORAGE_KEY, JSON.stringify(this.checkpoints));
  }
}

export const agentPlanningCheckpointService = new AgentPlanningCheckpointService();
