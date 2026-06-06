import { createSkillManifest, validateSkillManifest } from "../skills/skillManifest";
import type { SkillManifest, SkillManifestInput, SkillManifestValidationResult } from "../skills/skillTypes";
import type { IntegrationMappingDescription } from "./integrationTypes";

export function createSkillManifestPreview(input: SkillManifestInput, now?: () => Date): SkillManifest {
  return createSkillManifest(input, now);
}

export function validateManifestOnly(manifest: SkillManifest): SkillManifestValidationResult {
  return validateSkillManifest(manifest);
}

export function describeSkillRegistryUiMapping(): IntegrationMappingDescription {
  return {
    source: "Skill Manifest preview",
    destination: "future read-only Skill Registry UI",
    previewFields: ["name", "description", "version", "category", "permissions", "memoryPolicy", "workflows", "tests"],
    forbiddenEffects: ["entrypoint loading", "tool execution", "permission grants", "model calls", "file access", "network access"],
    notes: ["Permissions and entrypoints are declarative metadata only."],
  };
}

export function describeSkillRuntimeRequirements(): string[] {
  return [
    "A sandbox design and governed runtime PR are required before entrypoints can be loaded.",
    "Declared permissions must be reviewed and granted outside the manifest registry.",
    "Tool, model, filesystem, and network access remain unavailable from this boundary.",
  ];
}
