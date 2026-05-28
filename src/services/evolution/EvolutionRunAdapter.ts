import { evaluateEvolutionRunGate, getEvolutionRunGateSnapshot, type EvolutionRunGateInput } from "./EvolutionRunGate";
import { createCandidateVariantFromProposal, createEvolutionRunFromProposal, getEvolutionRunContractSnapshot } from "./EvolutionRunMapping";

export const EvolutionRunAdapter = {
  name: "EvolutionRunAdapter",
  kind: "evolution_run_adapter",
  createRun(input: Record<string, any>) {
    return createEvolutionRunFromProposal(input.proposal, input.options);
  },
  createCandidate(input: Record<string, any>) {
    return createCandidateVariantFromProposal(input.proposal, input.options);
  },
  evaluateRunGate(input: EvolutionRunGateInput) {
    return evaluateEvolutionRunGate(input);
  },
  getSnapshot() {
    return {
      ...getEvolutionRunContractSnapshot(),
      ...getEvolutionRunGateSnapshot(),
      adapterOnly: true,
      runtimeBehaviorChanged: false,
      optimizerExecutionEnabled: false,
      localExecutionAllowed: false,
      autonomousPromotionEnabled: false,
      externalLabSupported: true,
    };
  },
};

export default EvolutionRunAdapter;
