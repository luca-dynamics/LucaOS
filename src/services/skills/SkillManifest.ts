export type LucaUserOperationTier = "origin" | "tactical" | "normal";

export type LucaSkillLifecycleState =
  | "draft"
  | "candidate"
  | "active"
  | "deprecated"
  | "rejected"
  | "archived";

export type LucaSkillRiskLevel = "low" | "medium" | "high" | "critical";

export type LucaSkillPromotionSource =
  | "manual"
  | "evolution_lab"
  | "trace_reflection"
  | "skill_ingestion"
  | "unknown";

export interface LucaSkillMemoryPolicy {
  readTiers?: LucaUserOperationTier[];
  writeTiers?: LucaUserOperationTier[];
  traceIngestionAllowed?: boolean;
  missionTapeIngestionAllowed?: boolean;
  profileMemoryAllowed?: boolean;
  operationalMemoryAllowed?: boolean;
}

export interface LucaSkillSafetyPolicy {
  riskLevel: LucaSkillRiskLevel;
  requiresConfirmation: boolean;
  requiresOriginApproval: boolean;
  allowedOperationTiers: LucaUserOperationTier[];
  blockedCapabilities?: string[];
  maxAutonomyLevel?: number;
  networkAllowed?: boolean;
  fileSystemAllowed?: boolean;
  computerUseAllowed?: boolean;
  voiceExecutionAllowed?: boolean;
}

export interface LucaSkillEvalPolicy {
  evalRequired: boolean;
  evalDatasetIds?: string[];
  minScore?: number;
  regressionCheckRequired: boolean;
  traceReplayRequired?: boolean;
  humanReviewRequired?: boolean;
}

export interface LucaSkillPromotionPolicy {
  promotionRequiresOrigin: boolean;
  promotionRequiresPassingEvals: boolean;
  promotionRequiresRollbackPlan: boolean;
  promotionSource: LucaSkillPromotionSource;
}

export interface LucaSkillRollbackPolicy {
  previousVersion?: string;
  rollbackAvailable: boolean;
  rollbackReason?: string;
  rollbackMetadata?: Record<string, unknown>;
}

export interface LucaSkillManifestMetadata {
  contractKind: "luca_skill_manifest";
  autonomousSelfModificationEnabled: false;
  runtimeBehaviorChanged: false;
  migrationRequired: false;
  [key: string]: unknown;
}

export interface LucaSkillManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  lifecycleState: LucaSkillLifecycleState;
  ownerTier: LucaUserOperationTier;
  allowedUserTiers: LucaUserOperationTier[];
  category?: string;
  tags?: string[];
  triggerHints?: string[];
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  allowedTools?: string[];
  deniedTools?: string[];
  memoryPolicy?: LucaSkillMemoryPolicy;
  safetyPolicy?: LucaSkillSafetyPolicy;
  evalPolicy?: LucaSkillEvalPolicy;
  promotionPolicy?: LucaSkillPromotionPolicy;
  rollbackPolicy?: LucaSkillRollbackPolicy;
  source?: string;
  createdAt: string;
  updatedAt?: string;
  metadata: LucaSkillManifestMetadata;
}

export const DEFAULT_SKILL_MANIFEST_METADATA: LucaSkillManifestMetadata = {
  contractKind: "luca_skill_manifest",
  autonomousSelfModificationEnabled: false,
  runtimeBehaviorChanged: false,
  migrationRequired: false,
};
