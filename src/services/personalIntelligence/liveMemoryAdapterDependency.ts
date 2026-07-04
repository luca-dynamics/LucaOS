import { memoryService } from "../memoryService";
import type { MemoryServiceAdapterDependency } from "../../personal-intelligence/adapters";
import type { MemoryNode } from "../../types";

/**
 * Live binding of the Personal Intelligence governed-memory adapter to the
 * real memoryService.
 *
 * The personal-intelligence subsystem is deliberately dependency-injected: it
 * accepts a `MemoryServiceAdapterDependency` and never imports memoryService
 * itself, which keeps it pure and testable. This factory provides the REAL
 * binding at the composition edge (the services layer), so the subsystem's
 * clean boundary is preserved while the pilot UI can hand it a live writer.
 *
 * IMPORTANT: holding this dependency writes nothing. The governed adapter
 * (`persistApprovedMemoryProposalWithGovernance`) only calls `saveMemory`
 * after every governance gate passes AND `config.dryRun === false`. Under a
 * dry-run — the pilot's default and required-first posture — it is never
 * invoked. This is the write capability, not the decision to write.
 */
export function createLiveMemoryServiceDependency(): MemoryServiceAdapterDependency {
  return {
    saveMemory(
      key: string,
      value: string,
      category: MemoryNode["category"],
      autoConsolidate: false,
      importance: number,
    ): Promise<MemoryNode | null> {
      return memoryService.saveMemory(
        key,
        value,
        category,
        autoConsolidate,
        importance,
      );
    },
  };
}
