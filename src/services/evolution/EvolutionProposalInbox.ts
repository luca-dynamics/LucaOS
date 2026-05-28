import { evaluateEvolutionProposalGate, getEvolutionGovernanceGateSnapshot, type EvolutionGateOutput } from "./EvolutionGovernanceGate";
import type { LucaEvolutionProposal, LucaEvolutionProposalStatus, LucaTier } from "./EvolutionProposal";

export interface EvolutionProposalInboxMetadata {
  adapterOnly: true;
  runtimeBehaviorChanged: false;
  persistenceEnabled: false;
  autonomousSelfModificationEnabled: false;
  existingEvolutionServiceCalled: false;
}

export interface EvolutionProposalDecisionMetadata {
  note?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface EvolutionProposalRecord {
  proposal: LucaEvolutionProposal;
  lastGateOutput: EvolutionGateOutput;
  reviewedByTier?: LucaTier;
  reviewDecisionMetadata?: EvolutionProposalDecisionMetadata;
  rejectedByTier?: LucaTier;
  rejectionReason?: string;
  archivedByTier?: LucaTier;
  archiveReason?: string;
}

export interface EvolutionProposalInboxFilter {
  status?: LucaEvolutionProposalStatus;
  kind?: LucaEvolutionProposal["kind"];
  source?: LucaEvolutionProposal["source"];
}

export interface EvolutionProposalInboxSnapshot {
  metadata: EvolutionProposalInboxMetadata;
  governanceGate: ReturnType<typeof getEvolutionGovernanceGateSnapshot>;
  proposalCount: number;
  proposalsByStatus: Record<LucaEvolutionProposalStatus, number>;
  proposals: EvolutionProposalRecord[];
}

export class EvolutionProposalInbox {
  private readonly proposals = new Map<string, EvolutionProposalRecord>();

  private readonly metadata: EvolutionProposalInboxMetadata = {
    adapterOnly: true,
    runtimeBehaviorChanged: false,
    persistenceEnabled: false,
    autonomousSelfModificationEnabled: false,
    existingEvolutionServiceCalled: false,
  };

  submitProposal(proposal: LucaEvolutionProposal, actorTier: LucaTier): EvolutionProposalRecord {
    if (this.proposals.has(proposal.id)) {
      throw new Error(`Proposal already exists: ${proposal.id}`);
    }

    const gateResult = evaluateEvolutionProposalGate({ proposal, requestedAction: "submit", actorTier });
    if (!gateResult.allowed) {
      throw new Error(gateResult.blockedBy?.join(",") ?? "submit_blocked");
    }

    const nextProposal = this.withStatus(proposal, gateResult.nextStatus ?? proposal.status);
    const record: EvolutionProposalRecord = { proposal: nextProposal, lastGateOutput: gateResult };
    this.proposals.set(nextProposal.id, record);
    return this.copyRecord(record);
  }

  listProposals(filter?: EvolutionProposalInboxFilter): EvolutionProposalRecord[] {
    return this.sortedRecords()
      .filter(({ proposal }) => {
        if (filter?.status && proposal.status !== filter.status) return false;
        if (filter?.kind && proposal.kind !== filter.kind) return false;
        if (filter?.source && proposal.source !== filter.source) return false;
        return true;
      })
      .map((record) => this.copyRecord(record));
  }

  getProposal(id: string): EvolutionProposalRecord | undefined {
    const record = this.proposals.get(id);
    return record ? this.copyRecord(record) : undefined;
  }

  reviewProposal(id: string, actorTier: LucaTier, decisionMetadata?: EvolutionProposalDecisionMetadata): EvolutionProposalRecord {
    return this.applyDecision(id, actorTier, "review", (record, gateResult) => ({
      ...record,
      proposal: this.withStatus(record.proposal, gateResult.nextStatus ?? "under_review"),
      reviewedByTier: actorTier,
      reviewDecisionMetadata: decisionMetadata,
      lastGateOutput: gateResult,
    }));
  }

  rejectProposal(id: string, actorTier: LucaTier, reason: string): EvolutionProposalRecord {
    return this.applyDecision(id, actorTier, "reject", (record, gateResult) => ({
      ...record,
      proposal: this.withStatus(record.proposal, gateResult.nextStatus ?? "rejected"),
      rejectedByTier: actorTier,
      rejectionReason: reason,
      lastGateOutput: gateResult,
    }));
  }

  archiveProposal(id: string, actorTier: LucaTier, reason?: string): EvolutionProposalRecord {
    return this.applyDecision(id, actorTier, "archive", (record, gateResult) => ({
      ...record,
      proposal: this.withStatus(record.proposal, gateResult.nextStatus ?? "archived"),
      archivedByTier: actorTier,
      archiveReason: reason,
      lastGateOutput: gateResult,
    }));
  }

  getSnapshot(): EvolutionProposalInboxSnapshot {
    const proposalsByStatus: Record<LucaEvolutionProposalStatus, number> = {
      draft: 0,
      submitted: 0,
      under_review: 0,
      approved: 0,
      rejected: 0,
      promoted: 0,
      rolled_back: 0,
      archived: 0,
    };

    for (const { proposal } of this.proposals.values()) {
      proposalsByStatus[proposal.status] += 1;
    }

    return {
      metadata: { ...this.metadata },
      governanceGate: getEvolutionGovernanceGateSnapshot(),
      proposalCount: this.proposals.size,
      proposalsByStatus,
      proposals: this.sortedRecords().map((record) => this.copyRecord(record)),
    };
  }

  private applyDecision(
    id: string,
    actorTier: LucaTier,
    requestedAction: "review" | "reject" | "archive",
    transform: (record: EvolutionProposalRecord, gateResult: EvolutionGateOutput) => EvolutionProposalRecord,
  ) {
    const currentRecord = this.requireRecord(id);
    const gateResult = evaluateEvolutionProposalGate({ proposal: currentRecord.proposal, requestedAction, actorTier });

    if (!gateResult.allowed) {
      throw new Error(gateResult.blockedBy?.join(",") ?? `${requestedAction}_blocked`);
    }

    const nextRecord = transform(currentRecord, gateResult);
    this.proposals.set(id, nextRecord);
    return this.copyRecord(nextRecord);
  }

  private requireRecord(id: string): EvolutionProposalRecord {
    const record = this.proposals.get(id);
    if (!record) throw new Error(`Proposal not found: ${id}`);
    return record;
  }

  private withStatus(proposal: LucaEvolutionProposal, status: LucaEvolutionProposalStatus): LucaEvolutionProposal {
    return {
      ...proposal,
      status,
      updatedAt: new Date().toISOString(),
      metadata: {
        ...proposal.metadata,
        adapterOnly: true,
        runtimeBehaviorChanged: false,
        persistenceEnabled: false,
        autonomousSelfModificationEnabled: false,
        existingEvolutionServiceCalled: false,
      },
    };
  }

  private sortedRecords(): EvolutionProposalRecord[] {
    return [...this.proposals.values()].sort((a, b) => a.proposal.createdAt.localeCompare(b.proposal.createdAt));
  }

  private copyRecord(record: EvolutionProposalRecord): EvolutionProposalRecord {
    return {
      ...record,
      proposal: { ...record.proposal, metadata: { ...record.proposal.metadata } },
      lastGateOutput: { ...record.lastGateOutput, metadata: { ...record.lastGateOutput.metadata } },
      reviewDecisionMetadata: record.reviewDecisionMetadata
        ? { ...record.reviewDecisionMetadata, metadata: { ...(record.reviewDecisionMetadata.metadata ?? {}) } }
        : undefined,
    };
  }
}
