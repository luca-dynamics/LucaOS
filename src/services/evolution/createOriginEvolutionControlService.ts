import { createEvolutionProposalInbox } from "./createEvolutionProposalInbox";
import { OriginEvolutionControlService } from "./OriginEvolutionControlService";

export function createOriginEvolutionControlService() {
  return new OriginEvolutionControlService(createEvolutionProposalInbox());
}
