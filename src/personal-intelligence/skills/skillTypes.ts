import type { PrivacyZone } from "../privacy/privacyZones";

export interface SkillPermission {
  id: string;
  description: string;
  required: boolean;
}

export interface SkillMemoryPolicy {
  read: PrivacyZone[];
  write: PrivacyZone[];
  retention?: "session" | "project" | "durable";
}

export interface SkillWorkflow {
  id: string;
  description: string;
  steps: string[];
}

export interface SkillTestDefinition {
  id: string;
  description: string;
  expectedOutcome: string;
}

export interface SkillManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  entrypoint: string;
  permissions: SkillPermission[];
  memoryPolicy: SkillMemoryPolicy;
  requiredModels: string[];
  requiredTools: string[];
  workflows: SkillWorkflow[];
  tests: SkillTestDefinition[];
  createdAt: string;
  updatedAt: string;
}

export type SkillManifestInput = Omit<SkillManifest, "createdAt" | "updatedAt"> &
  Partial<Pick<SkillManifest, "createdAt" | "updatedAt">>;

export interface SkillManifestValidationResult {
  valid: boolean;
  errors: string[];
}
