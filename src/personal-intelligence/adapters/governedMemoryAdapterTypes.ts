import type { MemoryNode } from "../../types";
import type { MemoryItem } from "../memory/memoryTypes";
import type { PersistencePolicyEvaluation } from "../persistence/persistencePolicy";
import type { PersonalIntelligencePersistenceAuditRecord } from "../persistence/persistenceAudit";
import type {
  MemoryPersistenceProposal,
  PersistenceRequestedOperation,
} from "../persistence/persistenceTypes";
import type { PersistenceSafetyPlan } from "../persistence/rollbackPlan";
import type { PrivacyZone } from "../privacy/privacyZones";

export type GovernedMemoryAdapterStatus =
  | "blocked"
  | "dry_run"
  | "persisted"
  | "failed";

export interface GovernedMemoryAdapterConfig {
  enabled: boolean;
  dryRun: boolean;
  allowPrivateWrites: boolean;
  allowSensitiveWrites: boolean;
  allowLucaLinkSync: false;
  requireExplicitApproval: boolean;
  requireRollbackPlan: boolean;
  requireValidationAudit: boolean;
  allowedOperations: Array<
    Extract<PersistenceRequestedOperation, "create" | "update">
  >;
  blockedPrivacyZones: PrivacyZone[];
  maxContentLength: number;
  sourceLabel: string;
}

export const DEFAULT_GOVERNED_MEMORY_ADAPTER_CONFIG: GovernedMemoryAdapterConfig =
  {
    enabled: false,
    dryRun: true,
    allowPrivateWrites: false,
    allowSensitiveWrites: false,
    allowLucaLinkSync: false,
    requireExplicitApproval: true,
    requireRollbackPlan: true,
    requireValidationAudit: true,
    allowedOperations: ["create"],
    blockedPrivacyZones: ["credential", "financial", "health", "enterprise"],
    maxContentLength: 2000,
    sourceLabel: "personal-intelligence-governed-memory-adapter",
  };

export interface LegacyMemoryServicePayload {
  key: string;
  value: string;
  category: MemoryNode["category"];
  autoConsolidate: false;
  importance: number;
}

export interface GovernedMemoryAdapterAuditRecord {
  auditId: string;
  proposalId: string;
  timestamp: string;
  sourceLabel: string;
  status: GovernedMemoryAdapterStatus;
  summary: string;
  blockers: string[];
  warnings: string[];
  sideEffectsPerformed: boolean;
  memoryNodeId?: string;
}

export interface GovernedMemoryAdapterResult {
  attempted: boolean;
  performed: boolean;
  dryRun: boolean;
  status: GovernedMemoryAdapterStatus;
  proposalId: string;
  memoryKey?: string;
  memoryValue?: string;
  memoryCategory?: MemoryNode["category"];
  memoryNodeId?: string;
  blockers: string[];
  warnings: string[];
  auditRecord: GovernedMemoryAdapterAuditRecord;
  sideEffectsPerformed: boolean;
}

export interface MemoryServiceAdapterDependency {
  saveMemory(
    key: string,
    value: string,
    category: MemoryNode["category"],
    autoConsolidate: false,
    importance: number,
  ): Promise<MemoryNode | null>;
}

export interface GovernedMemoryAdapterGateContext {
  config: GovernedMemoryAdapterConfig;
  policy: PersistencePolicyEvaluation;
  auditRecords: readonly PersonalIntelligencePersistenceAuditRecord[];
  rollbackPlans: readonly PersistenceSafetyPlan[];
}

export interface GovernedMemoryAdapterGateResult {
  allowed: boolean;
  blockers: string[];
  warnings: string[];
  convertedMemory?: LegacyMemoryServicePayload;
}

export interface PersistApprovedMemoryProposalInput {
  proposal: MemoryPersistenceProposal;
  config: GovernedMemoryAdapterConfig;
  policy: PersistencePolicyEvaluation;
  auditRecords: readonly PersonalIntelligencePersistenceAuditRecord[];
  rollbackPlans: readonly PersistenceSafetyPlan[];
  memoryService: MemoryServiceAdapterDependency;
  now?: () => Date;
}

export interface SanitizedMemoryContentResult {
  allowed: boolean;
  content?: string;
  blockers: string[];
  warnings: string[];
  truncated: boolean;
}

export interface ConvertMemoryItemOptions {
  maxContentLength: number;
}

export type GovernedMemoryItem = MemoryItem;
