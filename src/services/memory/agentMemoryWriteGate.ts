import type { MemoryNode } from "../../types";
import type { MemoryProposalKind } from "../../types/memoryProposal";

/**
 * Consent gate for memory the AGENT proposes to store about the user.
 *
 * LucaOS already had the whole approval apparatus — MemoryProposalService,
 * ApprovalRequestCenter, GovernedMemoryWriteService and four review surfaces —
 * but the `storeMemory` tool wrote straight to the archive and never touched
 * any of it. This routes the agent's own writes through the existing gate when
 * the operator opts in, rather than adding a second, parallel one.
 *
 * Scope is deliberately the tool path only. Internal bookkeeping writes
 * (equity tracking, session state) are not things the agent decided to
 * remember about the user, so they are not gated.
 */

/**
 * Inverse of GovernedMemoryWriteService's kind -> category map, so an approved
 * proposal lands back in the category it was proposed from.
 *
 * SYSTEM and PROTOCOL have no dedicated kind and round-trip to SEMANTIC. That
 * is lossy, and it is why they are named here rather than left to a default.
 */
const PROPOSAL_KIND_FOR_CATEGORY: Record<
  MemoryNode["category"],
  MemoryProposalKind
> = {
  FACT: "user_fact",
  USER_STATE: "preference",
  SEMANTIC: "project_context",
  SESSION_STATE: "session_summary",
  AGENT_STATE: "agent_state",
  SYSTEM: "other",
  PROTOCOL: "other",
};

export function proposalKindForCategory(
  category: MemoryNode["category"],
): MemoryProposalKind {
  return PROPOSAL_KIND_FOR_CATEGORY[category] ?? "other";
}

export interface AgentMemoryWriteRequest {
  key: string;
  value: string;
  category: MemoryNode["category"];
  importance?: number;
}

export type AgentMemoryWriteStatus =
  | "written"
  | "pending_approval"
  | "refused";

export interface AgentMemoryWriteOutcome {
  status: AgentMemoryWriteStatus;
  /** The text handed back to the model. */
  message: string;
  memoryId?: string;
  proposalId?: string;
}

/** Outcome of the underlying archive write. */
export interface AgentMemorySaveResult {
  memory: MemoryNode | null;
  /** Why the write was refused, when `memory` is null. */
  rejection: string | null;
}

export interface AgentMemoryWriteGateDependencies {
  /** Whether the operator has opted into staging agent memory writes. */
  isApprovalRequired(): boolean;
  saveMemory(request: AgentMemoryWriteRequest): Promise<AgentMemorySaveResult>;
  createProvenanceRecord(input: {
    sourceType: "memory";
    sourceId: string;
    sourceTrustLevel: "local";
    createdBy: string;
  }): { provenanceId: string };
  createProposal(input: {
    title: string;
    summary: string;
    proposedMemory: string;
    kind: MemoryProposalKind;
    source: string;
    provenanceIds: string[];
    createApprovalRequest: boolean;
  }): { proposalId: string };
}

export async function requestAgentMemoryWrite(
  request: AgentMemoryWriteRequest,
  deps: AgentMemoryWriteGateDependencies,
): Promise<AgentMemoryWriteOutcome> {
  if (deps.isApprovalRequired()) {
    return stageForApproval(request, deps);
  }

  const { memory, rejection } = await deps.saveMemory(request);

  if (!memory) {
    return {
      status: "refused",
      message:
        rejection ||
        "Memory not stored: the content was filtered as a system-level prompt rather than a durable fact.",
    };
  }

  return {
    status: "written",
    message: `✓ Memory Synapsed: [${memory.category}] ${memory.key} (ID: ${memory.id})`,
    memoryId: memory.id,
  };
}

function stageForApproval(
  request: AgentMemoryWriteRequest,
  deps: AgentMemoryWriteGateDependencies,
): AgentMemoryWriteOutcome {
  try {
    const provenance = deps.createProvenanceRecord({
      sourceType: "memory",
      sourceId: `agent-memory-write:${request.key}`,
      sourceTrustLevel: "local",
      createdBy: "storeMemory",
    });

    const proposal = deps.createProposal({
      title: request.key,
      summary: `Luca proposed remembering "${request.key}".`,
      proposedMemory: request.value,
      kind: proposalKindForCategory(request.category),
      source: "storeMemory",
      provenanceIds: [provenance.provenanceId],
      createApprovalRequest: true,
    });

    return {
      status: "pending_approval",
      proposalId: proposal.proposalId,
      message: [
        `Memory staged for approval, not saved yet: "${request.key}".`,
        `The operator reviews it before it is written. Do not retry this write —`,
        `carry on, and treat the fact as unconfirmed until it is approved.`,
      ].join(" "),
    };
  } catch (error: any) {
    // Staging failed. Refusing is the safe outcome: silently falling back to a
    // direct write would defeat the point of turning approval on.
    return {
      status: "refused",
      message: `Memory not stored: could not stage it for approval (${error?.message || "unknown error"}). Nothing was written.`,
    };
  }
}
