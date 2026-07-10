/**
 * Phase 10 - Luca Link Sync
 * Cross-device checkpoint synchronization over the LucaLink manager façade.
 */

import type { Checkpoint } from "./types";
import type { LucaLinkMessage } from "../../lucaLink/manager";
import { lucaLinkManager } from "../../lucaLink/manager";

export class LucaLinkSync {
  private readonly checkpoints = new Map<string, Checkpoint>();
  private readonly unsubscribe: () => void;

  constructor() {
    this.unsubscribe = lucaLinkManager.onRelayMessage(
      (message: LucaLinkMessage) => {
        if (message.type === "CHECKPOINT_SYNC") {
          const checkpoint = this.readCheckpoint(message.payload);
          if (checkpoint) this.checkpoints.set(checkpoint.workflowId, checkpoint);
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
    return this.checkpoints.get(workflowId) ?? null;
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
}

let lucaLinkSyncInstance: LucaLinkSync | null = null;

export function getLucaLinkSync(): LucaLinkSync {
  if (!lucaLinkSyncInstance) {
    lucaLinkSyncInstance = new LucaLinkSync();
  }
  return lucaLinkSyncInstance;
}
