import {
  LUCA_EVOLUTION_PROPOSAL_DEFAULT_METADATA,
  type LucaEvolutionProposal,
  type LucaEvolutionProposalKind,
  type LucaTier,
} from "./EvolutionProposal";

interface MappingOptions {
  id?: string;
  nowIso?: string;
  metadata?: Record<string, unknown>;
  requestedByTier?: LucaTier;
}

const now = () => new Date().toISOString();
const genId = (prefix: string) => `${prefix}_${Date.now().toString(36)}`;

const baseProposal = (
  kind: LucaEvolutionProposalKind,
  title: string,
  summary: string,
  source: LucaEvolutionProposal["source"],
  options?: MappingOptions,
): LucaEvolutionProposal => ({
  id: options?.id ?? genId("evo"),
  kind,
  status: "draft",
  title,
  summary,
  source,
  requestedByTier: options?.requestedByTier ?? "origin",
  createdAt: options?.nowIso ?? now(),
  metadata: {
    ...LUCA_EVOLUTION_PROPOSAL_DEFAULT_METADATA,
    ...(options?.metadata ?? {}),
  },
});

export function createSkillUpdateProposalFromManifest(manifest: Record<string, any>, options?: MappingOptions): LucaEvolutionProposal {
  return {
    ...baseProposal("skill_update", `Skill update: ${manifest.name ?? manifest.id ?? "unknown"}`, "Skill manifest evolution candidate", "skill_ingestion", options),
    targetSkillManifestId: manifest.id,
    targetSkillVersion: manifest.version,
    proposedChanges: manifest.changes ?? [],
    approvalPolicy: {
      requiredTier: "origin",
      requiresOriginApproval: true,
      requiresPassingEvals: true,
      requiresRollbackPlan: true,
      allowsExternalLabProposal: true,
      allowsRuntimeAutoApply: false,
    },
  };
}

export function createTraceReflectionProposal(input: Record<string, any>): LucaEvolutionProposal {
  return {
    ...baseProposal("workflow_update", input.title ?? "Trace reflection proposal", input.summary ?? "Generated from trace and mission analysis.", "trace_reflection", input),
    evidence: {
      traceMemoryItemIds: input.traceMemoryItemIds,
      missionTapeIds: input.missionTapeIds,
      diagnostics: input.diagnostics,
      metadata: input.evidenceMetadata,
    },
    metadata: {
      ...LUCA_EVOLUTION_PROPOSAL_DEFAULT_METADATA,
      ...(input.metadata ?? {}),
    },
  };
}

export function createExternalLabCandidateProposal(input: Record<string, any>): LucaEvolutionProposal {
  return {
    ...baseProposal("external_lab_candidate", input.title ?? "External lab candidate", input.summary ?? "Proposal from external lab.", input.source ?? "external_lab", {
      ...input,
      requestedByTier: input.requestedByTier ?? "origin",
    }),
    riskAssessment: {
      riskLevel: input.riskLevel ?? "medium",
      requiresOriginApproval: true,
      requiresHumanReview: true,
      canAutoPromote: false,
      affectedCapabilities: input.affectedCapabilities,
      safetyNotes: input.safetyNotes,
    },
    approvalPolicy: {
      requiredTier: "origin",
      requiresOriginApproval: true,
      requiresPassingEvals: true,
      requiresRollbackPlan: true,
      allowsExternalLabProposal: true,
      allowsRuntimeAutoApply: false,
    },
  };
}

export function createTacticalImprovementRequest(input: Record<string, any>): LucaEvolutionProposal {
  return {
    ...baseProposal(input.kind ?? "ui_ux_suggestion", input.title ?? "Tactical improvement request", input.summary ?? "Tactical-level request", "tactical_request", {
      ...input,
      requestedByTier: "tactical",
    }),
    approvalPolicy: {
      requiredTier: "origin",
      requiresOriginApproval: input.requiresOriginApproval ?? true,
      requiresPassingEvals: input.requiresPassingEvals ?? true,
      requiresRollbackPlan: input.requiresRollbackPlan ?? true,
      allowsExternalLabProposal: true,
      allowsRuntimeAutoApply: false,
    },
  };
}

export function getEvolutionProposalContractSnapshot(input?: Record<string, unknown>) {
  return {
    contractKind: "luca_evolution_proposal",
    autonomousSelfModificationEnabled: false,
    runtimeBehaviorChanged: false,
    externalLabSupported: true,
    originGoverned: true,
    ...input,
  };
}
