import type { PrivacyZone } from "../privacy/privacyZones";

export type PersonalIntelligenceSkillStatus =
  | "available"
  | "review_required"
  | "blocked"
  | "disabled";

export type PersonalIntelligenceSkillRiskLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

export interface PersonalIntelligenceSkillManifest {
  id?: string;
  manifestId?: string;
  name?: string;
  description?: string;
  version?: string;
  category?: string;
  permissions?: string[];
  capabilities?: string[];
  requiredModels?: string[];
  requiredTools?: string[];
  requiredConnectors?: string[];
  memoryPolicy?: {
    access: "none" | "proposal_only" | "read_requested" | "write_requested";
    read?: PrivacyZone[];
    write?: PrivacyZone[];
  };
  privacyZones?: PrivacyZone[];
  entrypointRef?: string;
  declarationRef?: string;
  [key: string]: unknown;
}

export interface PersonalIntelligenceSkillManifestValidation {
  valid: boolean;
  missingFields: string[];
  unsupportedFields: string[];
  unsafeFields: string[];
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export interface PersonalIntelligenceSkillReadiness {
  readyForInspection: boolean;
  readyForExecution: false;
  requiresApproval: boolean;
  requiresSandbox: boolean;
  requiresRuntimeTrace: boolean;
  requiresToolPermission: boolean;
  requiresModelPermission: boolean;
  requiresMemoryPermission: boolean;
  requiresNetworkPermission: boolean;
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export interface PersonalIntelligenceSkillRegistryEntry {
  skillId: string;
  manifestId: string;
  name: string;
  description: string;
  version: string;
  category: string;
  status: PersonalIntelligenceSkillStatus;
  riskLevel: PersonalIntelligenceSkillRiskLevel;
  requiredPermissions: string[];
  requiredCapabilities: string[];
  requiredModels?: string[];
  requiredTools?: string[];
  requiredConnectors?: string[];
  memoryPolicy: PersonalIntelligenceSkillManifest["memoryPolicy"];
  privacyZones: PrivacyZone[];
  entrypointRef?: string;
  manifestValidation: PersonalIntelligenceSkillManifestValidation;
  readiness: PersonalIntelligenceSkillReadiness;
  warnings: string[];
  blockers: string[];
  executionEnabled: false;
  sideEffectsPerformed: false;
}

export interface PersonalIntelligenceSkillPermissionPolicy {
  riskLevel: PersonalIntelligenceSkillRiskLevel;
  requiresApproval: boolean;
  requiresSandbox: boolean;
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export interface PersonalIntelligenceSkillRegistryOptions {
  disabledSkillIds?: readonly string[];
}

export interface PersonalIntelligenceSkillRegistryFilter {
  query?: string;
  category?: string;
  status?: PersonalIntelligenceSkillStatus | "all";
  riskLevel?: PersonalIntelligenceSkillRiskLevel | "all";
}

export interface PersonalIntelligenceSkillRegistrySummary {
  total: number;
  available: number;
  reviewRequired: number;
  blocked: number;
  disabled: number;
  executionEnabled: false;
  sideEffectsPerformed: false;
}

export interface PersonalIntelligenceSkillRegistryReadinessSummary {
  total: number;
  readyForInspection: number;
  blockedFromInspection: number;
  readyForExecution: 0;
  requiresApproval: number;
  requiresSandbox: number;
  executionEnabled: false;
  sideEffectsPerformed: false;
}
