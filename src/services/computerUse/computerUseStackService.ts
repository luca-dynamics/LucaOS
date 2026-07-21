/**
 * Product singleton for the computer-use stack.
 * Rebuilds from settings when requested; safe default is scaffold-only.
 */

import type { RealSandboxComputerUseStack } from "../browserRuntime/createRealSandboxComputerUseStack";
import { settingsService } from "../settingsService";
import { resolveComputerUseStackFromSettings } from "./resolveComputerUseStackFromSettings";

class ComputerUseStackService {
  private stack: RealSandboxComputerUseStack | null = null;
  private building: Promise<RealSandboxComputerUseStack> | null = null;
  private lastFingerprint = "";

  /**
   * Get or build the stack for current settings.
   * Rebuilds if computerUse settings fingerprint changed.
   */
  async getStack(forceRebuild = false): Promise<RealSandboxComputerUseStack> {
    const settings = settingsService.getSettings();
    const fingerprint = JSON.stringify(settings.computerUse ?? {});

    if (
      !forceRebuild &&
      this.stack &&
      this.lastFingerprint === fingerprint
    ) {
      return this.stack;
    }

    if (this.building) return this.building;

    this.building = (async () => {
      if (this.stack) {
        try {
          await this.stack.dispose();
        } catch {
          /* ignore */
        }
        this.stack = null;
      }

      const next = await resolveComputerUseStackFromSettings(settings);
      this.stack = next;
      this.lastFingerprint = fingerprint;
      return next;
    })();

    try {
      return await this.building;
    } finally {
      this.building = null;
    }
  }

  /** Convenience: run pipeline input with the active stack. */
  async runPipeline(
    input: Parameters<RealSandboxComputerUseStack["pipeline"]["run"]>[0],
  ) {
    const stack = await this.getStack();
    return stack.pipeline.run(input);
  }

  getCachedStack(): RealSandboxComputerUseStack | null {
    return this.stack;
  }

  async dispose(): Promise<void> {
    if (this.stack) {
      await this.stack.dispose();
      this.stack = null;
    }
    this.lastFingerprint = "";
  }
}

export const computerUseStackService = new ComputerUseStackService();
