import type { ProvenanceMetadata } from "./provenance";
import type { LucaSkillManifest, LucaSkillRiskLevel } from "../services/skills/SkillManifest";

export type SkillContinuityLifecycleState = "discovered" | "installed" | "enabled" | "disabled" | "quarantined" | "deprecated" | "update_pending" | "removed";

export interface SkillRegistryRecord {
  skillId: string;
  name: string;
  version: string;
  source: string;
  manifest: LucaSkillManifest | Record<string, unknown>;
  capabilities: string[];
  requiredPermissions: string[];
  provenance?: ProvenanceMetadata;
  lifecycleState: SkillContinuityLifecycleState;
  installPath?: string;
  virtualSource?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  riskLevel: LucaSkillRiskLevel;
  diagnostics: {
    canAutoExecute: false;
    requiresProvenanceApproval: boolean;
    warnings: string[];
  };
}

export interface SkillUseCheck {
  allowed: boolean;
  userSafeReason: string;
  blockedBy: string[];
}

export interface SkillRegistryDiagnosticsSummary {
  totalSkills: number;
  enabledSkills: number;
  disabledSkills: number;
  quarantinedSkills: number;
  skillsMissingProvenance: number;
  highRiskSkills: number;
}
