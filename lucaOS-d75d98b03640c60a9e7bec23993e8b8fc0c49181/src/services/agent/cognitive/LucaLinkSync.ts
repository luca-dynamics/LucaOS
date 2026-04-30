/**
 * Phase 10 - Luca Link Sync
 * Cross-device checkpoint synchronization (stub for future integration)
 */

import type { Checkpoint } from "./types";

export class LucaLinkSync {
  private isEnabled: boolean = false;

  constructor() {
    this.isEnabled = false;
    console.log("[LucaLinkSync] Offline mode (Luca Link not integrated yet)");
  }

  isConnected(): boolean {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async syncCheckpoint(checkpoint: Checkpoint): Promise<boolean> {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetchCheckpoint(workflowId: string): Promise<Checkpoint | null> {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteCheckpoint(checkpointId: string): Promise<boolean> {
    return false;
  }
}

let lucaLinkSyncInstance: LucaLinkSync | null = null;

export function getLucaLinkSync(): LucaLinkSync {
  if (!lucaLinkSyncInstance) {
    lucaLinkSyncInstance = new LucaLinkSync();
  }
  return lucaLinkSyncInstance;
}
