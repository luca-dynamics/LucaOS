/**
 * Phase 10 - Luca Link Sync
 * Cross-device checkpoint synchronization over the LucaLink manager façade.
 */

import type { Checkpoint } from "./types";
import type { LucaLinkMessage } from "../../lucaLink/manager";
import { lucaLinkManager } from "../../lucaLink/manager";

export type LucaLinkCheckpointSyncStatus =
  | "local"
  | "sent"
  | "received"
  | "stale-rejected"
  | "requesting"
  | "request-timeout"
  | "deleted";

export interface LucaLinkCheckpointSyncProvenance {
  workflowId: string;
  checkpointId?: string;
  status: LucaLinkCheckpointSyncStatus;
  updatedAt: number;
  sourceDeviceId?: string;
}

export class LucaLinkSync {
  private readonly checkpoints = new Map<string, Checkpoint>();
  private readonly provenance = new Map<
    string,
    LucaLinkCheckpointSyncProvenance
  >();
  private readonly pendingRequests = new Map<
    string,
    { workflowId: string; resolve: (checkpoint: Checkpoint | null) => void; timeout: ReturnType<typeof setTimeout> }
  >();
  private readonly statusListeners = new Set<
    (status: LucaLinkCheckpointSyncProvenance) => void
  >();
  private readonly unsubscribe: () => void;

  constructor() {
    this.unsubscribe = lucaLinkManager.onRelayMessage(
      (message: LucaLinkMessage) => {
        if (message.type === "CHECKPOINT_SYNC") {
          const checkpoint = this.readCheckpoint(message.payload);
          if (checkpoint) {
            if (this.shouldAcceptCheckpoint(checkpoint)) {
              this.checkpoints.set(checkpoint.workflowId, checkpoint);
              this.setProvenance(checkpoint.workflowId, {
                workflowId: checkpoint.workflowId,
                checkpointId: checkpoint.id,
                status: "received",
                updatedAt: Date.now(),
                sourceDeviceId: message.source,
              });
            } else {
              this.setProvenance(checkpoint.workflowId, {
                workflowId: checkpoint.workflowId,
                checkpointId: checkpoint.id,
                status: "stale-rejected",
                updatedAt: Date.now(),
                sourceDeviceId: message.source,
              });
            }
            const requestId = this.readRequestId(message.payload);
            const pending = requestId ? this.pendingRequests.get(requestId) : undefined;
            if (pending && pending.workflowId === checkpoint.workflowId) {
              clearTimeout(pending.timeout);
              this.pendingRequests.delete(requestId!);
              pending.resolve(this.checkpoints.get(checkpoint.workflowId) ?? checkpoint);
            }
          }
        }

        if (message.type === "CHECKPOINT_REQUEST") {
          const workflowId = this.readWorkflowId(message.payload);
          const checkpoint = workflowId
            ? this.checkpoints.get(workflowId)
            : undefined;
          if (checkpoint) {
            lucaLinkManager.sendRelayMessage(message.source ?? "all", "CHECKPOINT_SYNC", {
              checkpoint,
              requestId: this.readRequestId(message.payload),
            });
          }
        }

        if (message.type === "CHECKPOINT_DELETE") {
          const checkpointId = this.readCheckpointId(message.payload);
          if (checkpointId) {
            for (const [workflowId, checkpoint] of this.checkpoints) {
              if (checkpoint.id === checkpointId) this.checkpoints.delete(workflowId);
            }
          }
        }
      },
    );
  }

  isConnected(): boolean {
    return lucaLinkManager.getRelayState().connected;
  }

  async syncCheckpoint(checkpoint: Checkpoint): Promise<boolean> {
    const accepted = this.shouldAcceptCheckpoint(checkpoint);
    if (accepted) this.checkpoints.set(checkpoint.workflowId, checkpoint);
    if (!accepted) return false;
    this.setProvenance(checkpoint.workflowId, {
      workflowId: checkpoint.workflowId,
      checkpointId: checkpoint.id,
      status: "local",
      updatedAt: Date.now(),
    });
    const sent = lucaLinkManager.sendRelayMessage("all", "CHECKPOINT_SYNC", {
      checkpoint,
    });
    this.setProvenance(checkpoint.workflowId, {
      workflowId: checkpoint.workflowId,
      checkpointId: checkpoint.id,
      status: sent ? "sent" : "local",
      updatedAt: Date.now(),
    });
    return sent;
  }

  async fetchCheckpoint(workflowId: string): Promise<Checkpoint | null> {
    const local = this.checkpoints.get(workflowId);
    if (local || !this.isConnected()) return local ?? null;

    const requestId = `checkpoint-request-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    return new Promise((resolve) => {
      this.setProvenance(workflowId, {
        workflowId,
        status: "requesting",
        updatedAt: Date.now(),
      });
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        this.setProvenance(workflowId, {
          workflowId,
          status: "request-timeout",
          updatedAt: Date.now(),
        });
        resolve(null);
      }, 1500);
      this.pendingRequests.set(requestId, { workflowId, resolve, timeout });
      const sent = lucaLinkManager.sendRelayMessage("all", "CHECKPOINT_REQUEST", {
        workflowId,
        requestId,
      });
      if (!sent) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        this.setProvenance(workflowId, {
          workflowId,
          status: "request-timeout",
          updatedAt: Date.now(),
        });
        resolve(null);
      }
    });
  }

  async deleteCheckpoint(checkpointId: string): Promise<boolean> {
    for (const [workflowId, checkpoint] of this.checkpoints) {
      if (checkpoint.id === checkpointId) {
        this.checkpoints.delete(workflowId);
        this.setProvenance(workflowId, {
          workflowId,
          checkpointId,
          status: "deleted",
          updatedAt: Date.now(),
        });
      }
    }
    return lucaLinkManager.sendRelayMessage("all", "CHECKPOINT_DELETE", {
      checkpointId,
    });
  }

  dispose(): void {
    this.unsubscribe();
    this.checkpoints.clear();
    this.provenance.clear();
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.resolve(null);
    }
    this.pendingRequests.clear();
  }

  getSyncStatus(workflowId: string): LucaLinkCheckpointSyncProvenance | null {
    return this.provenance.get(workflowId) ?? null;
  }

  getSyncStatuses(): LucaLinkCheckpointSyncProvenance[] {
    return [...this.provenance.values()].map((status) => ({ ...status }));
  }

  onStatusChange(
    listener: (status: LucaLinkCheckpointSyncProvenance) => void,
  ): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private readCheckpoint(payload: unknown): Checkpoint | null {
    if (!payload || typeof payload !== "object") return null;
    const value = (payload as { checkpoint?: unknown }).checkpoint;
    if (!value || typeof value !== "object") return null;
    const checkpoint = value as Partial<Checkpoint>;
    if (
      typeof checkpoint.id !== "string" ||
      typeof checkpoint.workflowId !== "string" ||
      typeof checkpoint.timestamp !== "number" ||
      typeof checkpoint.currentStep !== "number" ||
      !Array.isArray(checkpoint.completedSteps) ||
      !checkpoint.context
    ) {
      return null;
    }
    return checkpoint as Checkpoint;
  }

  private readCheckpointId(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") return null;
    const checkpointId = (payload as { checkpointId?: unknown }).checkpointId;
    return typeof checkpointId === "string" ? checkpointId : null;
  }

  private readWorkflowId(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") return null;
    const workflowId = (payload as { workflowId?: unknown }).workflowId;
    return typeof workflowId === "string" ? workflowId : null;
  }

  private readRequestId(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") return null;
    const requestId = (payload as { requestId?: unknown }).requestId;
    return typeof requestId === "string" ? requestId : null;
  }

  private shouldAcceptCheckpoint(checkpoint: Checkpoint): boolean {
    const current = this.checkpoints.get(checkpoint.workflowId);
    if (!current) return true;
    if (checkpoint.timestamp !== current.timestamp) {
      return checkpoint.timestamp > current.timestamp;
    }
    return checkpoint.id > current.id;
  }

  private setProvenance(
    workflowId: string,
    status: LucaLinkCheckpointSyncProvenance,
  ): void {
    this.provenance.set(workflowId, status);
    for (const listener of this.statusListeners) listener({ ...status });
  }
}

let lucaLinkSyncInstance: LucaLinkSync | null = null;

export function getLucaLinkSync(): LucaLinkSync {
  if (!lucaLinkSyncInstance) {
    lucaLinkSyncInstance = new LucaLinkSync();
  }
  return lucaLinkSyncInstance;
}
