import { validateSkillManifest } from "./skillManifest";
import type { SkillManifest, SkillManifestValidationResult } from "./skillTypes";

export interface SkillRegistry {
  register(manifest: SkillManifest): SkillManifest;
  get(id: string): SkillManifest | undefined;
  list(): SkillManifest[];
  validate(manifest: SkillManifest): SkillManifestValidationResult;
}

export function createSkillRegistry(initialManifests: SkillManifest[] = []): SkillRegistry {
  const manifests = new Map<string, SkillManifest>();
  const registry: SkillRegistry = {
    register(manifest) {
      const result = validateSkillManifest(manifest);
      if (!result.valid) throw new Error(`Invalid skill manifest: ${result.errors.join(", ")}`);
      if (manifests.has(manifest.id)) throw new Error(`Skill already registered: ${manifest.id}`);
      const copy = clone(manifest);
      manifests.set(copy.id, copy);
      return clone(copy);
    },
    get(id) { const manifest = manifests.get(id); return manifest ? clone(manifest) : undefined; },
    list: () => Array.from(manifests.values(), clone),
    validate: validateSkillManifest,
  };
  initialManifests.forEach(registry.register);
  return registry;
}

function clone(manifest: SkillManifest): SkillManifest {
  return {
    ...manifest,
    permissions: manifest.permissions.map((permission) => ({ ...permission })),
    memoryPolicy: { ...manifest.memoryPolicy, read: [...manifest.memoryPolicy.read], write: [...manifest.memoryPolicy.write] },
    requiredModels: [...manifest.requiredModels],
    requiredTools: [...manifest.requiredTools],
    workflows: manifest.workflows.map((workflow) => ({ ...workflow, steps: [...workflow.steps] })),
    tests: manifest.tests.map((test) => ({ ...test })),
  };
}
