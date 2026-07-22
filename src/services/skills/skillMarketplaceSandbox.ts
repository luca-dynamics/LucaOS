/**
 * Absorb Phase 3 — permission-scoped sandbox plan from marketplace registry skills.
 * Planning only: executionEnabled always false.
 */

import { createPersonalIntelligenceSkillSandboxPlan } from "../../personal-intelligence/skillSandbox/skillSandboxPlan";
import type { PersonalIntelligenceSkillSandboxPlan } from "../../personal-intelligence/skillSandbox/skillSandboxTypes";
import type {
  PersonalIntelligenceSkillRegistryEntry,
  PersonalIntelligenceSkillRiskLevel,
  PersonalIntelligenceSkillStatus,
} from "../../personal-intelligence/skills/skillRegistryTypes";
import type { SkillRegistryRecord } from "../../types/skillContinuity";
import type { LucaSkillManifest } from "./SkillManifest";

function mapRisk(
  risk: SkillRegistryRecord["riskLevel"],
): PersonalIntelligenceSkillRiskLevel {
  if (risk === "critical") return "critical";
  if (risk === "high") return "high";
  if (risk === "medium") return "medium";
  return "low";
}

function mapStatus(
  state: SkillRegistryRecord["lifecycleState"],
): PersonalIntelligenceSkillStatus {
  if (state === "enabled") return "available";
  if (state === "disabled") return "disabled";
  if (state === "quarantined") return "blocked";
  if (state === "deprecated") return "blocked";
  // discovered / installed / update_pending → needs review
  return "review_required";
}

function inferPermissionKinds(permissions: string[]): {
  tools: string[];
  connectors: string[];
  models: string[];
} {
  const tools: string[] = [];
  const connectors: string[] = [];
  const models: string[] = [];
  for (const p of permissions) {
    const low = p.toLowerCase();
    if (low.includes("mcp") || low.includes("connector")) connectors.push(p);
    else if (low.includes("model") || low.includes("llm")) models.push(p);
    else tools.push(p);
  }
  return { tools, connectors, models };
}

/**
 * Map a continuity SkillRegistryRecord into a PI sandbox registry entry.
 */
export function mapRegistryRecordToSandboxEntry(
  record: SkillRegistryRecord,
): PersonalIntelligenceSkillRegistryEntry {
  const manifest = record.manifest as LucaSkillManifest;
  const description =
    (manifest && typeof manifest === "object" && "description" in manifest
      ? String(manifest.description || "")
      : "") || `${record.name} skill`;
  const requiredPermissions = [
    ...record.requiredPermissions,
    ...(manifest?.safetyPolicy?.networkAllowed ? ["network"] : []),
    ...(manifest?.safetyPolicy?.fileSystemAllowed ? ["file"] : []),
    ...(manifest?.safetyPolicy?.computerUseAllowed ? ["browser", "computer_use"] : []),
    ...(manifest?.safetyPolicy?.voiceExecutionAllowed ? ["voice"] : []),
  ];
  const uniquePerms = Array.from(new Set(requiredPermissions));
  const { tools, connectors, models } = inferPermissionKinds(uniquePerms);
  const riskLevel = mapRisk(record.riskLevel);
  const status = mapStatus(record.lifecycleState);

  const blockers: string[] = [];
  if (status === "blocked") blockers.push("Skill is quarantined.");
  if (!record.provenance) blockers.push("Missing provenance approval.");
  if (record.diagnostics.requiresProvenanceApproval) {
    blockers.push("Provenance approval required.");
  }

  return {
    skillId: record.skillId,
    manifestId:
      (manifest && typeof manifest === "object" && "id" in manifest
        ? String(manifest.id)
        : record.skillId) || record.skillId,
    name: record.name,
    description,
    version: record.version,
    category:
      (manifest && typeof manifest === "object" && "category" in manifest
        ? String(manifest.category || "marketplace")
        : "marketplace") || "marketplace",
    status,
    riskLevel,
    requiredPermissions: uniquePerms,
    requiredCapabilities: record.capabilities ?? [],
    requiredModels: models.length ? models : undefined,
    requiredTools: tools.length
      ? tools
      : record.capabilities?.length
        ? record.capabilities
        : undefined,
    requiredConnectors: connectors.length ? connectors : undefined,
    memoryPolicy: {
      access: "proposal_only",
      read: ["private"],
      write: [],
    },
    privacyZones: ["private"],
    entrypointRef: record.installPath || record.virtualSource,
    manifestValidation: {
      valid: true,
      missingFields: [],
      unsupportedFields: [],
      unsafeFields: [],
      warnings: record.diagnostics.warnings ?? [],
      blockers: [...blockers],
      sideEffectsPerformed: false,
    },
    readiness: {
      readyForInspection: true,
      readyForExecution: false,
      requiresApproval: blockers.length > 0 || riskLevel !== "low",
      requiresSandbox: riskLevel === "high" || riskLevel === "critical",
      requiresRuntimeTrace: true,
      requiresToolPermission: uniquePerms.some((p) =>
        /tool|invoke/i.test(p),
      ),
      requiresModelPermission: models.length > 0,
      requiresMemoryPermission: false,
      requiresNetworkPermission:
        uniquePerms.some((p) => /network|mcp/i.test(p)) ||
        Boolean(manifest?.safetyPolicy?.networkAllowed),
      warnings: [...(record.diagnostics.warnings ?? [])],
      blockers: [...blockers],
      sideEffectsPerformed: false,
    },
    warnings: [...(record.diagnostics.warnings ?? [])],
    blockers,
    executionEnabled: false,
    sideEffectsPerformed: false,
  };
}

/**
 * Build a permission-scoped sandbox plan for a marketplace skill.
 * Never enables execution.
 */
export function planSkillMarketplaceSandbox(
  record: SkillRegistryRecord,
  options?: { planId?: string; source?: string },
): PersonalIntelligenceSkillSandboxPlan {
  const entry = mapRegistryRecordToSandboxEntry(record);
  return createPersonalIntelligenceSkillSandboxPlan(entry, {
    planId: options?.planId ?? `marketplace-sandbox:${record.skillId}`,
    source: options?.source ?? "skill-marketplace",
    sandboxMode: "dry_run_plan",
  });
}
