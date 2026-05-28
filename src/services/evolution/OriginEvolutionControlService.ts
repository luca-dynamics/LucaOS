import type {
  EvolutionProposalDecisionMetadata,
  EvolutionProposalInbox,
  EvolutionProposalInboxFilter,
  EvolutionProposalInboxSnapshot,
  EvolutionProposalRecord,
} from "./EvolutionProposalInbox";
import { ExternalEvolutionImportAdapter } from "./ExternalEvolutionImportAdapter";
import type { LucaTier, LucaEvolutionProposal } from "./EvolutionProposal";
import type { LucaEvolutionCandidateBundle, LucaExternalEvolutionArtifactEnvelope } from "./ExternalEvolutionArtifacts";
import { verifyConstraintGateReport, type ConstraintGateReportVerifierInput } from "./ConstraintGateReportVerifier";
import { verifyPrBackMetadata, type PrBackMetadataInput } from "./PrBackMetadataVerifier";

export interface OriginEvolutionControlServiceSnapshot {
  serviceKind: "origin_evolution_control_service";
  originOnlyControlSurface: true;
  adapterOnly: true;
  runtimeBehaviorChanged: false;
  persistenceEnabled: false;
  optimizerExecutionEnabled: false;
  autonomousSelfModificationEnabled: false;
  existingEvolutionServiceCalled: false;
  autoApplyEnabled: false;
  networkCallsEnabled: false;
  proposalInbox: EvolutionProposalInboxSnapshot;
  importAdapter: ReturnType<typeof ExternalEvolutionImportAdapter.getSnapshot>;
}

function ensureOrigin(actorTier: LucaTier, action: string) {
  if (actorTier !== "origin") throw new Error(`${action}_requires_origin_tier`);
}

export class OriginEvolutionControlService {
  constructor(private readonly proposalInbox: EvolutionProposalInbox) {}

  submitProposal(proposal: LucaEvolutionProposal, actorTier: LucaTier): EvolutionProposalRecord {
    return this.proposalInbox.submitProposal(proposal, actorTier);
  }

  importExternalArtifact(envelope: LucaExternalEvolutionArtifactEnvelope<unknown>, actorTier: LucaTier): EvolutionProposalRecord {
    ensureOrigin(actorTier, "import_external_artifact");
    const result = ExternalEvolutionImportAdapter.importExternalArtifact(envelope, actorTier);
    if (!result.ok || !result.value?.proposal) {
      throw new Error(result.reason ?? result.blockedBy?.join(",") ?? "external_artifact_import_blocked");
    }
    return this.proposalInbox.submitProposal(result.value.proposal, "origin");
  }

  importCandidateBundle(bundle: LucaEvolutionCandidateBundle, actorTier: LucaTier): EvolutionProposalRecord {
    ensureOrigin(actorTier, "import_candidate_bundle");
    const result = ExternalEvolutionImportAdapter.importCandidateBundle(bundle, actorTier);
    if (!result.ok || !result.value?.proposal) {
      throw new Error(result.reason ?? result.blockedBy?.join(",") ?? "candidate_bundle_import_blocked");
    }
    return this.proposalInbox.submitProposal(result.value.proposal, "origin");
  }

  verifyConstraintReport(input: ConstraintGateReportVerifierInput, actorTier: LucaTier) {
    ensureOrigin(actorTier, "verify_constraint_report");
    const output = verifyConstraintGateReport(input);
    return {
      ...output,
      promotionAllowed: false as const,
      metadata: {
        ...output.metadata,
        promotionAttempted: false,
      },
    };
  }

  verifyPrBack(input: PrBackMetadataInput, actorTier: LucaTier) {
    ensureOrigin(actorTier, "verify_pr_back");
    const output = verifyPrBackMetadata(input);
    return {
      ...output,
      canAutoMerge: false as const,
      metadata: {
        ...output.metadata,
        networkVerificationAttempted: false,
      },
    };
  }

  listProposals(filter?: EvolutionProposalInboxFilter): EvolutionProposalRecord[] {
    return this.proposalInbox.listProposals(filter);
  }

  getProposal(id: string): EvolutionProposalRecord | undefined {
    return this.proposalInbox.getProposal(id);
  }

  reviewProposal(id: string, actorTier: LucaTier, decisionMetadata?: EvolutionProposalDecisionMetadata): EvolutionProposalRecord {
    return this.proposalInbox.reviewProposal(id, actorTier, decisionMetadata);
  }

  rejectProposal(id: string, actorTier: LucaTier, reason: string): EvolutionProposalRecord {
    return this.proposalInbox.rejectProposal(id, actorTier, reason);
  }

  archiveProposal(id: string, actorTier: LucaTier, reason?: string): EvolutionProposalRecord {
    return this.proposalInbox.archiveProposal(id, actorTier, reason);
  }

  getSnapshot(): OriginEvolutionControlServiceSnapshot {
    return {
      serviceKind: "origin_evolution_control_service",
      originOnlyControlSurface: true,
      adapterOnly: true,
      runtimeBehaviorChanged: false,
      persistenceEnabled: false,
      optimizerExecutionEnabled: false,
      autonomousSelfModificationEnabled: false,
      existingEvolutionServiceCalled: false,
      autoApplyEnabled: false,
      networkCallsEnabled: false,
      proposalInbox: this.proposalInbox.getSnapshot(),
      importAdapter: ExternalEvolutionImportAdapter.getSnapshot(),
    };
  }
}
