import { isPrivacyZone } from "../privacy/privacyZones";
import type { SkillManifest, SkillManifestInput, SkillManifestValidationResult } from "./skillTypes";

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export function validateSkillManifest(manifest: SkillManifest): SkillManifestValidationResult {
  const errors: string[] = [];
  if (!manifest.id.trim()) errors.push("id is required");
  if (!manifest.name.trim()) errors.push("name is required");
  if (!manifest.description.trim()) errors.push("description is required");
  if (!SEMVER.test(manifest.version)) errors.push("version must use semantic versioning");
  if (!manifest.category.trim()) errors.push("category is required");
  if (!manifest.entrypoint.trim()) errors.push("entrypoint is required");
  if (!manifest.memoryPolicy.read.every(isPrivacyZone)) errors.push("memoryPolicy.read contains an invalid zone");
  if (!manifest.memoryPolicy.write.every(isPrivacyZone)) errors.push("memoryPolicy.write contains an invalid zone");
  if (manifest.workflows.some((workflow) => !workflow.id.trim() || workflow.steps.length === 0)) errors.push("each workflow requires an id and steps");
  if (manifest.tests.some((test) => !test.id.trim() || !test.expectedOutcome.trim())) errors.push("each test requires an id and expectedOutcome");
  if (Number.isNaN(Date.parse(manifest.createdAt))) errors.push("createdAt must be an ISO date");
  if (Number.isNaN(Date.parse(manifest.updatedAt))) errors.push("updatedAt must be an ISO date");
  return { valid: errors.length === 0, errors };
}

export function createSkillManifest(input: SkillManifestInput, now: () => Date = () => new Date()): SkillManifest {
  const timestamp = now().toISOString();
  const manifest: SkillManifest = {
    ...input,
    permissions: input.permissions.map((permission) => ({ ...permission })),
    memoryPolicy: { ...input.memoryPolicy, read: [...input.memoryPolicy.read], write: [...input.memoryPolicy.write] },
    requiredModels: [...input.requiredModels],
    requiredTools: [...input.requiredTools],
    workflows: input.workflows.map((workflow) => ({ ...workflow, steps: [...workflow.steps] })),
    tests: input.tests.map((test) => ({ ...test })),
    createdAt: input.createdAt ?? timestamp,
    updatedAt: input.updatedAt ?? timestamp,
  };
  const validation = validateSkillManifest(manifest);
  if (!validation.valid) throw new Error(`Invalid skill manifest: ${validation.errors.join(", ")}`);
  return manifest;
}
