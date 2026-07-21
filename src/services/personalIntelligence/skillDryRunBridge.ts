/**
 * Live skill dry-run bridge — composition edge for the skill pipeline finish.
 *
 * Builds controlled dry-run simulations for REAL registry entries (via the
 * existing skillRegistryBridge) against the live permission grant gates, and
 * optionally a live MissionControl alignment evaluation. Never executes skills,
 * tools, models, memory writes, or LucaLink handoffs.
 */

import {
  createPersonalIntelligenceSkillDryRunSimulation,
  createPersonalIntelligenceSkillSandboxPlan,
  createSkillRegistry,
  personalIntelligenceSkillRegistryFixtures,
  summarizeSkillDryRunReadiness,
  type MissionAlignmentEvaluation,
  type PersonalIntelligenceSkillDryRunReadiness,
  type PersonalIntelligenceSkillDryRunSimulation,
  type PersonalIntelligenceSkillPermissionGate,
  type PersonalIntelligenceSkillRegistryEntry,
} from "../../personal-intelligence";
import type { SkillRegistryRecord } from "../../types/skillContinuity";
import { buildSkillRegistryEntriesFromLive } from "./skillRegistryBridge";

export interface SkillDryRunBridgeOptions {
  permissionGates?: readonly PersonalIntelligenceSkillPermissionGate[];
  missionEvaluation?: MissionAlignmentEvaluation;
  source?: PersonalIntelligenceSkillDryRunSimulation["source"];
  now?: () => Date;
  /** Cap simulations for Operation Center previews (default unlimited). */
  limit?: number;
}

/**
 * One dry-run simulation for a single PI registry entry (live or fixture).
 * Plan id matches SkillPermissionGrantPanel / createPersonalIntelligenceSkillSandboxPlan.
 */
export function buildSkillDryRunSimulationForEntry(
  entry: PersonalIntelligenceSkillRegistryEntry,
  options: SkillDryRunBridgeOptions = {},
): PersonalIntelligenceSkillDryRunSimulation {
  const sandboxPlan = createPersonalIntelligenceSkillSandboxPlan(entry);
  return createPersonalIntelligenceSkillDryRunSimulation({
    skillRegistryEntry: entry,
    sandboxPlan,
    permissionGates: options.permissionGates ?? [],
    missionEvaluation: options.missionEvaluation,
    source: options.source ?? "selected_skill",
    now: options.now,
  });
}

/**
 * Dry-run every entry in a registry snapshot (live first; fixtures if empty).
 * Order is registry order; optional limit for compact surfaces.
 */
export function buildSkillDryRunSimulationsFromEntries(
  entries: readonly PersonalIntelligenceSkillRegistryEntry[],
  options: SkillDryRunBridgeOptions = {},
): PersonalIntelligenceSkillDryRunSimulation[] {
  const slice =
    typeof options.limit === "number" && options.limit >= 0
      ? entries.slice(0, options.limit)
      : entries;
  return slice.map((entry) => buildSkillDryRunSimulationForEntry(entry, options));
}

/**
 * Preferred composition entry: live SkillRegistryService records → PI entries →
 * dry-runs. Empty live registry falls back to fixtures so the surface still
 * explains itself.
 */
export function buildSkillDryRunSimulationsFromLive(
  records: readonly SkillRegistryRecord[],
  options: SkillDryRunBridgeOptions = {},
): {
  entries: PersonalIntelligenceSkillRegistryEntry[];
  simulations: PersonalIntelligenceSkillDryRunSimulation[];
  isLive: boolean;
  readiness: PersonalIntelligenceSkillDryRunReadiness;
} {
  const live = buildSkillRegistryEntriesFromLive(records);
  const isLive = live.length > 0;
  const entries = isLive
    ? live
    : createSkillRegistry(personalIntelligenceSkillRegistryFixtures);
  const simulations = buildSkillDryRunSimulationsFromEntries(entries, {
    ...options,
    source: options.source ?? (isLive ? "selected_skill" : "fixture"),
  });
  return {
    entries,
    simulations,
    isLive,
    readiness: summarizeSkillDryRunReadiness(simulations),
  };
}

export function summarizeSkillDryRunPipeline(
  simulations: readonly PersonalIntelligenceSkillDryRunSimulation[],
): {
  total: number;
  readyForReview: number;
  approvalRequired: number;
  blocked: number;
  disabled: number;
  withMissionContext: number;
  canExecute: false;
  executionEnabled: false;
  sideEffectsPerformed: false;
} {
  const readiness = summarizeSkillDryRunReadiness(simulations);
  return {
    total: readiness.totalSimulations,
    readyForReview: readiness.readyForReview,
    approvalRequired: readiness.approvalRequired,
    blocked: readiness.blocked,
    disabled: readiness.disabled,
    withMissionContext: simulations.filter(
      (sim) => sim.missionAlignmentSummary.status !== "not_provided",
    ).length,
    canExecute: false,
    executionEnabled: false,
    sideEffectsPerformed: false,
  };
}
