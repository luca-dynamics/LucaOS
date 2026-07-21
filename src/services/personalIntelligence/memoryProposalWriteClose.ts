import { memoryGovernanceService } from "../memory/MemoryGovernanceService";
import { memoryProposalService } from "../memory/MemoryProposalService";
import type { MemoryProposalRecord } from "../../types/memoryProposal";

/**
 * Close the live memory-proposal loop after the governed pilot persists a
 * memory. Marks the proposal written (inbox + bus), and advances governance
 * so the queue no longer offers it for a second write.
 *
 * Composition-edge only: the pilot UI resolves this lazily so render never
 * touches the proposal store.
 */
export function closeMemoryProposalAfterPilotWrite(
  proposalId: string,
  memoryId: string,
): MemoryProposalRecord | undefined {
  try {
    memoryGovernanceService.markProposalWritten(proposalId, memoryId);
  } catch {
    // Governance is best-effort; the proposal status is the source of truth.
  }
  try {
    return memoryProposalService.markWritten(proposalId, memoryId);
  } catch {
    return undefined;
  }
}
