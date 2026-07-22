import { provenanceGateService } from "../provenance/ProvenanceGateService";
import { settingsService } from "../settingsService";
import { memoryProposalService } from "./MemoryProposalService";
import type { AgentMemoryWriteGateDependencies } from "./agentMemoryWriteGate";

/**
 * Binds the agent memory write gate to the live services. Kept apart from the
 * gate itself so the decision logic stays free of service imports and can be
 * tested without the browser-only memory stack.
 */
export function runtimeAgentMemoryWriteDependencies(): AgentMemoryWriteGateDependencies {
  return {
    isApprovalRequired: () =>
      settingsService.getSettings().memory?.writeApproval === true,

    // memoryService is resolved lazily so importing this module never eagerly
    // pulls the browser-only memory stack into non-DOM environments. The
    // rejection reason is read from the same module instance that performed
    // the write, immediately after it.
    saveMemory: async (request) => {
      const { memoryService } = await import("../memoryService");
      const memory = await memoryService.saveMemory(
        request.key,
        request.value,
        request.category,
        false,
        request.importance,
      );
      return {
        memory,
        rejection: memory ? null : memoryService.getLastWriteRejection(),
      };
    },

    createProvenanceRecord: (input) =>
      provenanceGateService.createProvenanceRecord(input),

    createProposal: (input) => memoryProposalService.createProposal(input),
  };
}
