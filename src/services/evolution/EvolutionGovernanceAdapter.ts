import { evaluateEvolutionProposalGate, getEvolutionGovernanceGateSnapshot, type EvolutionGateInput } from "./EvolutionGovernanceGate";
import { createTraceReflectionProposal } from "./EvolutionProposalMapping";

export const EvolutionGovernanceAdapter = {
  name: "EvolutionGovernanceAdapter",
  kind: "governance_adapter",
  createProposal(input: Record<string, any>) {
    return createTraceReflectionProposal(input);
  },
  evaluateGate(input: EvolutionGateInput) {
    return evaluateEvolutionProposalGate(input);
  },
  getSnapshot() {
    return {
      ...getEvolutionGovernanceGateSnapshot(),
      adapterOnly: true,
      runtimeBehaviorChanged: false,
      autonomousSelfModificationEnabled: false,
      existingEvolutionServiceReplaced: false,
    };
  },
};

export default EvolutionGovernanceAdapter;
