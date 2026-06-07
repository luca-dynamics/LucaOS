import { evaluateSkillPermissionPolicy } from "./skillPermissionPolicy";
import { validatePersonalIntelligenceSkillManifest } from "./skillManifestValidation";
import type {
  PersonalIntelligenceSkillManifest,
  PersonalIntelligenceSkillReadiness,
  PersonalIntelligenceSkillRegistryEntry,
  PersonalIntelligenceSkillRegistryFilter,
  PersonalIntelligenceSkillRegistryOptions,
  PersonalIntelligenceSkillRegistrySummary,
  PersonalIntelligenceSkillStatus,
} from "./skillRegistryTypes";

const EMPTY_MEMORY_POLICY: NonNullable<PersonalIntelligenceSkillManifest["memoryPolicy"]> = {
  access: "none",
  read: [],
  write: [],
};

function copyStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim())
    : [];
}

function createReadiness(
  manifest: PersonalIntelligenceSkillManifest,
  readyForInspection: boolean,
  riskLevel: PersonalIntelligenceSkillRegistryEntry["riskLevel"],
  warnings: readonly string[],
  blockers: readonly string[],
): PersonalIntelligenceSkillReadiness {
  const declarations = [...copyStrings(manifest.permissions), ...copyStrings(manifest.capabilities)];
  const requiresNetworkPermission = declarations.some((value) => /(network|connector|browser|lucalink|handoff)/i.test(value));
  const requiresMemoryPermission = manifest.memoryPolicy?.access !== undefined && manifest.memoryPolicy.access !== "none";
  const requiresToolPermission = copyStrings(manifest.requiredTools).length > 0;
  const requiresModelPermission = copyStrings(manifest.requiredModels).length > 0;

  return {
    readyForInspection,
    readyForExecution: false,
    requiresApproval: riskLevel !== "low" || blockers.length > 0,
    requiresSandbox: riskLevel === "high" || riskLevel === "critical",
    requiresRuntimeTrace: riskLevel !== "low" || requiresMemoryPermission || requiresToolPermission || requiresModelPermission,
    requiresToolPermission,
    requiresModelPermission,
    requiresMemoryPermission,
    requiresNetworkPermission,
    warnings: [...warnings],
    blockers: [...blockers, "Skill execution is disabled in the manifest-inspection phase."],
    sideEffectsPerformed: false,
  };
}

function determineStatus(
  skillId: string,
  validationValid: boolean,
  riskLevel: PersonalIntelligenceSkillRegistryEntry["riskLevel"],
  options: PersonalIntelligenceSkillRegistryOptions,
): PersonalIntelligenceSkillStatus {
  if (!validationValid || riskLevel === "critical") return "blocked";
  if (options.disabledSkillIds?.includes(skillId)) return "disabled";
  if (riskLevel === "high" || riskLevel === "medium") return "review_required";
  return "available";
}

export function createSkillRegistryEntry(
  manifest: PersonalIntelligenceSkillManifest,
  options: PersonalIntelligenceSkillRegistryOptions = {},
): PersonalIntelligenceSkillRegistryEntry {
  const validation = validatePersonalIntelligenceSkillManifest(manifest);
  const policy = evaluateSkillPermissionPolicy(manifest);
  const skillId = typeof manifest.id === "string" && manifest.id.trim() ? manifest.id.trim() : "invalid-skill";
  const warnings = [...new Set([...validation.warnings, ...policy.warnings])];
  const blockers = [...new Set([...validation.blockers, ...policy.blockers])];
  const readiness = createReadiness(
    manifest,
    validation.missingFields.length === 0,
    policy.riskLevel,
    warnings,
    blockers,
  );
  const memoryPolicy = manifest.memoryPolicy
    ? {
        ...manifest.memoryPolicy,
        read: [...(manifest.memoryPolicy.read ?? [])],
        write: [...(manifest.memoryPolicy.write ?? [])],
      }
    : { ...EMPTY_MEMORY_POLICY, read: [], write: [] };

  return {
    skillId,
    manifestId: typeof manifest.manifestId === "string" && manifest.manifestId.trim()
      ? manifest.manifestId.trim()
      : skillId,
    name: typeof manifest.name === "string" && manifest.name.trim() ? manifest.name.trim() : "Invalid manifest",
    description: typeof manifest.description === "string" ? manifest.description : "Manifest description unavailable.",
    version: typeof manifest.version === "string" ? manifest.version : "unknown",
    category: typeof manifest.category === "string" ? manifest.category : "uncategorized",
    status: determineStatus(skillId, validation.valid, policy.riskLevel, options),
    riskLevel: policy.riskLevel,
    requiredPermissions: copyStrings(manifest.permissions),
    requiredCapabilities: copyStrings(manifest.capabilities),
    requiredModels: copyStrings(manifest.requiredModels),
    requiredTools: copyStrings(manifest.requiredTools),
    requiredConnectors: copyStrings(manifest.requiredConnectors),
    memoryPolicy,
    privacyZones: [...(manifest.privacyZones ?? [])],
    entrypointRef: typeof manifest.entrypointRef === "string"
      ? manifest.entrypointRef
      : typeof manifest.declarationRef === "string"
        ? manifest.declarationRef
        : undefined,
    manifestValidation: {
      ...validation,
      missingFields: [...validation.missingFields],
      unsupportedFields: [...validation.unsupportedFields],
      unsafeFields: [...validation.unsafeFields],
      warnings: [...validation.warnings],
      blockers: [...validation.blockers],
      sideEffectsPerformed: false,
    },
    readiness,
    warnings,
    blockers,
    executionEnabled: false,
    sideEffectsPerformed: false,
  };
}

export function createSkillRegistry(
  manifests: readonly PersonalIntelligenceSkillManifest[],
  options: PersonalIntelligenceSkillRegistryOptions = {},
): PersonalIntelligenceSkillRegistryEntry[] {
  return manifests.map((manifest) => createSkillRegistryEntry({ ...manifest }, options));
}

export function filterSkillRegistry(
  entries: readonly PersonalIntelligenceSkillRegistryEntry[],
  filter: PersonalIntelligenceSkillRegistryFilter,
): PersonalIntelligenceSkillRegistryEntry[] {
  const query = filter.query?.trim().toLowerCase() ?? "";
  return entries.filter((entry) => {
    const searchable = [entry.name, entry.description, entry.category, entry.skillId].join(" ").toLowerCase();
    return (!query || searchable.includes(query))
      && (!filter.category || filter.category === "all" || entry.category === filter.category)
      && (!filter.status || filter.status === "all" || entry.status === filter.status)
      && (!filter.riskLevel || filter.riskLevel === "all" || entry.riskLevel === filter.riskLevel);
  });
}

export function summarizeSkillRegistry(
  entries: readonly PersonalIntelligenceSkillRegistryEntry[],
): PersonalIntelligenceSkillRegistrySummary {
  return {
    total: entries.length,
    available: entries.filter((entry) => entry.status === "available").length,
    reviewRequired: entries.filter((entry) => entry.status === "review_required").length,
    blocked: entries.filter((entry) => entry.status === "blocked").length,
    disabled: entries.filter((entry) => entry.status === "disabled").length,
    executionEnabled: false,
    sideEffectsPerformed: false,
  };
}
