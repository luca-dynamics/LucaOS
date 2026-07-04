import {
  createSkillRegistry,
  type PersonalIntelligenceSkillManifest,
  type PersonalIntelligenceSkillRegistryEntry,
} from "../../personal-intelligence/skills";
import type { SkillRegistryRecord } from "../../types/skillContinuity";

/**
 * Bridge from the LIVE skill registry (SkillRegistryService — the same one the
 * ControlPanel and left rail already use) into Personal Intelligence's skill
 * view entries. PI carried its own parallel skill registry seeded from
 * fixtures; this makes its skill surfaces reflect the REAL registered skills
 * instead.
 *
 * Lives at the services edge so the personal-intelligence subsystem stays pure
 * (it never imports the live registry). Inspection-only is preserved: PI's
 * entry builder always marks executionEnabled false, so surfacing live skills
 * grants no execution authority — it only shows what is really installed.
 */

const DISABLED_LIFECYCLES = new Set(["disabled", "deprecated", "removed"]);

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

function recordToManifest(
  record: SkillRegistryRecord,
): PersonalIntelligenceSkillManifest {
  const manifest = (record.manifest ?? {}) as Record<string, unknown>;
  const str = (value: unknown) =>
    typeof value === "string" ? value : undefined;
  return {
    id: record.skillId,
    name: record.name,
    version: record.version,
    description: str(manifest.description) ?? `${record.name} — ${record.source}`,
    category: str(manifest.category) ?? "general",
    permissions: record.requiredPermissions,
    capabilities: record.capabilities,
    requiredModels: stringArray(manifest.requiredModels),
    requiredTools: stringArray(manifest.requiredTools),
    requiredConnectors: stringArray(manifest.requiredConnectors),
    memoryPolicy:
      (manifest.memoryPolicy as PersonalIntelligenceSkillManifest["memoryPolicy"]) ??
      undefined,
    privacyZones: stringArray(
      manifest.privacyZones,
    ) as PersonalIntelligenceSkillManifest["privacyZones"],
    entrypointRef: str(manifest.entrypointRef),
    // PI's manifest validation requires an entrypoint OR declaration reference.
    // A live-registry skill IS declared — point the declaration at its registry
    // identity so it validates as inspectable instead of falsely reading as
    // "blocked" (the reference stays inert; nothing is ever loaded from it).
    declarationRef:
      str(manifest.declarationRef) ??
      str(manifest.entrypointRef) ??
      record.installPath ??
      `live-registry/${record.skillId}`,
  };
}

/** Convert live registry records into PI skill registry entries (inspection-only). */
export function buildSkillRegistryEntriesFromLive(
  records: readonly SkillRegistryRecord[],
): PersonalIntelligenceSkillRegistryEntry[] {
  const disabledSkillIds = records
    .filter((record) => DISABLED_LIFECYCLES.has(record.lifecycleState))
    .map((record) => record.skillId);

  const entries = createSkillRegistry(records.map(recordToManifest), {
    disabledSkillIds,
  });

  // A quarantined skill in the live registry is blocked, not merely disabled.
  const quarantined = new Set(
    records
      .filter((record) => record.lifecycleState === "quarantined")
      .map((record) => record.skillId),
  );
  return entries.map((entry) =>
    quarantined.has(entry.skillId)
      ? {
          ...entry,
          status: "blocked" as const,
          blockers: [
            ...entry.blockers,
            "Skill is quarantined in the live registry.",
          ],
        }
      : entry,
  );
}
