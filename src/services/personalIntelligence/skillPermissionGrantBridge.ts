import {
  createPersonalIntelligenceSkillSandboxPlan,
  createSkillPermissionGrantState,
  personalIntelligenceSkillSandboxRegistryFixtures,
  type PersonalIntelligenceSkillPermissionGrantState,
  type PersonalIntelligenceSkillRegistryEntry,
} from "../../personal-intelligence";
import type { SkillRegistryRecord } from "../../types/skillContinuity";
import { buildSkillRegistryEntriesFromLive } from "./skillRegistryBridge";

/**
 * Bridge that seeds the Skill Permission Grant UI from the LIVE skill registry
 * (same records SkillRegistryPanel already surfaces). Falls back to the
 * illustrative PI fixtures only when nothing is registered, so the surface
 * still explains itself.
 *
 * Plan ids match `createPersonalIntelligenceSkillSandboxPlan` defaults
 * (`skill-sandbox:${skillId}`) so SkillPermissionGrantPanel can find gates for
 * the currently selected skill. Inspection / review only — never grants
 * execution authority.
 */
export function buildSkillPermissionGrantStateFromEntries(
  entries: readonly PersonalIntelligenceSkillRegistryEntry[],
): PersonalIntelligenceSkillPermissionGrantState {
  const plans = entries.map((entry) =>
    createPersonalIntelligenceSkillSandboxPlan(entry),
  );
  return createSkillPermissionGrantState(plans);
}

/**
 * Preferred composition entry: live registry records → PI entries → grant state.
 * Empty live registry yields the fixture sandbox registry so the permission
 * center is never blank on a fresh install.
 */
export function buildSkillPermissionGrantStateFromLive(
  records: readonly SkillRegistryRecord[],
): PersonalIntelligenceSkillPermissionGrantState {
  const live = buildSkillRegistryEntriesFromLive(records);
  if (live.length > 0) {
    return buildSkillPermissionGrantStateFromEntries(live);
  }
  return buildSkillPermissionGrantStateFromEntries(
    personalIntelligenceSkillSandboxRegistryFixtures,
  );
}
