import type {
  MemoryApprovalChecklistItem,
  PersonalIntelligenceMemoryApprovalPilotState,
} from "./approvalTypes";

export const DEFAULT_MEMORY_APPROVAL_CONFIRMATION_PHRASE =
  "REMEMBER APPROVED MEMORY";

export interface CreateMemoryApprovalPilotStateOptions {
  selectedProposalId?: string;
  approvalChecklist?: MemoryApprovalChecklistItem[];
  now?: () => Date;
}

export function createDefaultMemoryApprovalPilotState(
  options: CreateMemoryApprovalPilotStateOptions = {},
): PersonalIntelligenceMemoryApprovalPilotState {
  return {
    pilotEnabled: false,
    liveWriteEnabled: false,
    dryRunFirstRequired: true,
    explicitUserApprovalRequired: true,
    selectedProposalId: options.selectedProposalId,
    approvalConfirmed: false,
    confirmationPhrase: "",
    approvalChecklist: (options.approvalChecklist ?? []).map((item) => ({
      ...item,
    })),
    blockers: [
      "Controlled live-write pilot is disabled.",
      "Live-write toggle is disabled.",
      "Explicit user approval has not been confirmed.",
      "A successful dry-run is required before live write.",
    ],
    warnings: [],
    updatedAt: (options.now ?? (() => new Date()))().toISOString(),
  };
}
