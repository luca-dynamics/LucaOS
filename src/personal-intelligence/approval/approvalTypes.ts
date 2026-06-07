import type {
  GovernedMemoryAdapterConfig,
  GovernedMemoryAdapterResult,
  MemoryServiceAdapterDependency,
} from "../adapters";
import type {
  MemoryPersistenceProposal,
  PersistencePolicyEvaluation,
  PersonalIntelligencePersistenceAuditRecord,
  PersistenceSafetyPlan,
} from "../persistence";

export type MemoryApprovalChecklistStatus =
  | "passed"
  | "failed"
  | "pending"
  | "blocked";

export interface MemoryApprovalChecklistItem {
  id: string;
  label: string;
  status: MemoryApprovalChecklistStatus;
  required: boolean;
  detail: string;
}

export interface PersonalIntelligenceMemoryApprovalPilotState {
  pilotEnabled: boolean;
  liveWriteEnabled: boolean;
  dryRunFirstRequired: boolean;
  explicitUserApprovalRequired: boolean;
  selectedProposalId?: string;
  approvalConfirmed: boolean;
  confirmationPhrase?: string;
  lastDryRunResult?: GovernedMemoryAdapterResult;
  lastLiveWriteResult?: GovernedMemoryAdapterResult;
  approvalChecklist: MemoryApprovalChecklistItem[];
  blockers: string[];
  warnings: string[];
  updatedAt: string;
}

export interface MemoryApprovalChecklistInput {
  proposal?: MemoryPersistenceProposal;
  policy?: PersistencePolicyEvaluation;
  auditRecords?: readonly PersonalIntelligencePersistenceAuditRecord[];
  rollbackPlans?: readonly PersistenceSafetyPlan[];
  adapterConfig?: GovernedMemoryAdapterConfig;
  pilotState: PersonalIntelligenceMemoryApprovalPilotState;
  lastDryRunResult?: GovernedMemoryAdapterResult;
  requiredConfirmationPhrase?: string;
}

export interface MemoryApprovalPilotReadiness {
  readyForDryRun: boolean;
  readyForLiveWrite: boolean;
  checklist: MemoryApprovalChecklistItem[];
  blockers: string[];
  warnings: string[];
}

export interface MemoryApprovalPilotSummary {
  pilotStatus: "enabled" | "disabled";
  liveWriteStatus: "enabled" | "disabled";
  dryRunRequired: boolean;
  explicitApprovalRequired: boolean;
  passedRequiredChecks: number;
  totalRequiredChecks: number;
  blockerCount: number;
  warningCount: number;
  readyForLiveWrite: boolean;
  updatedAt: string;
}

export interface GovernedMemoryApprovalDryRunInput {
  proposal: MemoryPersistenceProposal;
  policy: PersistencePolicyEvaluation;
  auditRecords: readonly PersonalIntelligencePersistenceAuditRecord[];
  rollbackPlans: readonly PersistenceSafetyPlan[];
  memoryService: MemoryServiceAdapterDependency;
  configOverrides?: Partial<GovernedMemoryAdapterConfig>;
  now?: () => Date;
}

export interface GovernedMemoryApprovalLiveWriteInput
  extends GovernedMemoryApprovalDryRunInput {
  pilotState: PersonalIntelligenceMemoryApprovalPilotState;
  lastDryRunResult?: GovernedMemoryAdapterResult;
  requiredConfirmationPhrase?: string;
}
