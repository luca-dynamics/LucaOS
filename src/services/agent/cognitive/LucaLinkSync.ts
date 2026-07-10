/**
 * Phase 10 - Luca Link Sync
 * Cross-device checkpoint synchronization over the LucaLink manager façade.
 */

import type { Checkpoint } from "./types";
import type { LucaLinkMessage } from "../../lucaLink/manager";
import { lucaLinkManager } from "../../lucaLink/manager";

export class LucaLinkSync {
  private readonly checkpoints = new Map<string, Checkpoint>();
  private readonly pendingRequests = new Map<
    string,
    { workflowId: string; resolve: (checkpoint: Checkpoint | null) => void; timeout: ReturnType<typeof setTimeout> }
  >();
  private readonly unsubscribe: () => void;

  constructor() {
    this.unsubscribe = lucaLinkManager.onRelayMessage(
      (message: LucaLinkMessage) => {
        if (message.type === "CHECKPOINT_SYNC") {
          const checkpoint = this.readCheckpoint(message.payload);
          if (checkpoint) {
            this.checkpoints.set(checkpoint.workflowId, checkpoint);
            const requestId = this.readRequestId(message.payload);
            const pending = requestId ? this.pendingRequests.get(requestId) : undefined;
            if (pending && pending.workflowId === checkpoint.workflowId) {
              clearTimeout(pending.timeout);
              this.pendingRequests.delete(requestId!);
              pending.resolve(checkpoint);
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
    this.checkpoints.set(checkpoint.workflowId, checkpoint);
    return lucaLinkManager.sendRelayMessage("all", "CHECKPOINT_SYNC", {
      checkpoint,
    });
  }

  async fetchCheckpoint(workflowId: string): Promise<Checkpoint | null> {
    const local = this.checkpoints.get(workflowId);
    if (local || !this.isConnected()) return local ?? null;

    const requestId = `checkpoint-request-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
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
        resolve(null);
      }
    });
  }

  async deleteCheckpoint(checkpointId: string): Promise<boolean> {
    for (const [workflowId, checkpoint] of this.checkpoints) {
      if (checkpoint.id === checkpointId) this.checkpoints.delete(workflowId);
    }
    return lucaLinkManager.sendRelayMessage("all", "CHECKPOINT_DELETE", {
      checkpointId,
    });
  }

  dispose(): void {
    this.unsubscribe();
    this.checkpoints.clear();
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.resolve(null);
    }
    this.pendingRequests.clear();
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
}

let lucaLinkSyncInstance: LucaLinkSync | null = null;

export function getLucaLinkSync(): LucaLinkSync {
  if (!lucaLinkSyncInstance) {
    lucaLinkSyncInstance = new LucaLinkSync();
  }
  return lucaLinkSyncInstance;
}
