/**
 * Absorb Phase 3 pilot — Skill Marketplace product facade.
 *
 * Catalog list/import/export + lifecycle controls over SkillRegistryService.
 * Execution remains governed/disabled (foundation posture).
 */

import type { SkillRegistryRecord, SkillUseCheck } from "../../types/skillContinuity";
import {
  evaluateSkillLifecycleGate,
  type SkillLifecycleGateResult,
} from "./SkillLifecycleGate";
import type { LucaSkillManifest, LucaUserOperationTier } from "./SkillManifest";
import {
  SkillRegistryService,
  skillRegistryService,
} from "./SkillRegistryService";
import {
  coerceSkillImport,
  LUCA_SKILL_CATALOG_FORMAT,
  type SkillCatalogExport,
  type SkillImportCandidate,
  type SkillImportFormatHint,
} from "./skillImportFormats";

export interface SkillMarketplaceImportResult {
  ok: boolean;
  imported: number;
  skipped: number;
  detected?: string;
  skillIds: string[];
  reason?: string;
}

export interface SkillMarketplaceDryRun {
  skillId: string;
  useCheck: SkillUseCheck;
  lifecycleGate: SkillLifecycleGateResult;
  executionEnabled: false;
  summary: string;
}

export class SkillMarketplaceService {
  constructor(
    private readonly registry: SkillRegistryService = skillRegistryService,
  ) {}

  listCatalog(): SkillRegistryRecord[] {
    return this.registry.listSkills();
  }

  getDiagnostics() {
    return this.registry.getDiagnosticsSummary();
  }

  exportCatalog(): SkillCatalogExport {
    const skills = this.registry.listSkills().map((record) => {
      const manifest = record.manifest as LucaSkillManifest;
      const candidate: SkillImportCandidate = {
        name: record.name,
        version: record.version,
        source: record.source,
        manifest:
          manifest && typeof manifest === "object" && "id" in manifest
            ? (manifest as LucaSkillManifest)
            : ({
                id: record.skillId,
                name: record.name,
                description: String(
                  (record.manifest as { description?: string })?.description ??
                    "",
                ),
                version: record.version,
                lifecycleState: "candidate",
                ownerTier: "normal",
                allowedUserTiers: ["normal", "tactical", "origin"],
                allowedTools: record.capabilities,
                deniedTools: [],
                safetyPolicy: {
                  riskLevel: record.riskLevel,
                  requiresConfirmation: true,
                  requiresOriginApproval: record.riskLevel !== "low",
                  allowedOperationTiers: ["origin", "tactical", "normal"],
                },
                evalPolicy: {
                  evalRequired: record.riskLevel !== "low",
                  regressionCheckRequired: record.riskLevel !== "low",
                },
                promotionPolicy: {
                  promotionRequiresOrigin: true,
                  promotionRequiresPassingEvals: true,
                  promotionRequiresRollbackPlan: false,
                  promotionSource: "skill_ingestion",
                },
                rollbackPolicy: { rollbackAvailable: true },
                source: record.source,
                createdAt: record.createdAt,
                metadata: {
                  contractKind: "luca_skill_manifest",
                  autonomousSelfModificationEnabled: false,
                  runtimeBehaviorChanged: false,
                  migrationRequired: false,
                },
              } as LucaSkillManifest),
        requiredPermissions: record.requiredPermissions,
        capabilities: record.capabilities,
        riskLevel: record.riskLevel,
      };
      return candidate;
    });

    return {
      format: LUCA_SKILL_CATALOG_FORMAT,
      exportedAt: new Date().toISOString(),
      skillCount: skills.length,
      skills,
    };
  }

  importLoose(
    payload: unknown,
    options?: { formatHint?: SkillImportFormatHint },
  ): SkillMarketplaceImportResult {
    const coerced = coerceSkillImport(payload, options?.formatHint ?? "auto");
    if ("error" in coerced) {
      return {
        ok: false,
        imported: 0,
        skipped: 0,
        skillIds: [],
        reason: coerced.error,
      };
    }

    const skillIds: string[] = [];
    let imported = 0;
    let skipped = 0;

    for (const candidate of coerced.candidates) {
      try {
        const record = this.registry.registerSkill({
          name: candidate.name,
          version: candidate.version,
          source: candidate.source,
          manifest: candidate.manifest,
          requiredPermissions: candidate.requiredPermissions,
          capabilities: candidate.capabilities,
          riskLevel: candidate.riskLevel,
          lifecycleState: "discovered",
          skillId: candidate.manifest.id,
        });
        skillIds.push(record.skillId);
        imported += 1;
      } catch {
        skipped += 1;
      }
    }

    return {
      ok: imported > 0,
      imported,
      skipped,
      detected: coerced.detected,
      skillIds,
      reason: imported === 0 ? "No skills registered" : undefined,
    };
  }

  enable(skillId: string): SkillRegistryRecord | undefined {
    return this.registry.enableSkill(skillId);
  }

  disable(skillId: string): SkillRegistryRecord | undefined {
    return this.registry.disableSkill(skillId);
  }

  quarantine(skillId: string): SkillRegistryRecord | undefined {
    return this.registry.quarantineSkill(skillId);
  }

  /**
   * Dry-run use check + lifecycle gate. Never executes tools.
   */
  dryRun(
    skillId: string,
    options?: { tier?: LucaUserOperationTier; action?: "view" | "invoke" },
  ): SkillMarketplaceDryRun | null {
    const skill = this.registry.listSkills().find((s) => s.skillId === skillId);
    if (!skill) return null;

    const useCheck = this.registry.checkWhetherSkillCanBeUsed(skillId);
    const manifest = (skill.manifest || {
      id: skill.skillId,
      name: skill.name,
      description: "",
      version: skill.version,
      lifecycleState: "candidate",
      ownerTier: "normal",
      allowedUserTiers: ["normal"],
      safetyPolicy: {
        riskLevel: skill.riskLevel,
        requiresConfirmation: true,
        requiresOriginApproval: true,
        allowedOperationTiers: ["origin"],
      },
    }) as LucaSkillManifest;

    // Map continuity lifecycle → manifest lifecycle for gate
    const mappedLifecycle =
      skill.lifecycleState === "enabled"
        ? "active"
        : skill.lifecycleState === "quarantined"
          ? "rejected"
          : skill.lifecycleState === "deprecated"
            ? "deprecated"
            : "candidate";

    const gateManifest: LucaSkillManifest = {
      ...manifest,
      lifecycleState: mappedLifecycle as LucaSkillManifest["lifecycleState"],
    };

    const lifecycleGate = evaluateSkillLifecycleGate({
      manifest: gateManifest,
      requestedTier: options?.tier ?? "normal",
      requestedAction: options?.action ?? "invoke",
    });

    const summary = useCheck.allowed
      ? lifecycleGate.allowed
        ? "Gates look open for governed use; auto-execution remains disabled."
        : `Lifecycle gate blocked: ${lifecycleGate.reason || "policy"}`
      : `Use check blocked: ${useCheck.blockedBy.join(", ") || useCheck.userSafeReason}`;

    return {
      skillId,
      useCheck,
      lifecycleGate,
      executionEnabled: false,
      summary,
    };
  }
}

let singleton: SkillMarketplaceService | null = null;

export function getSkillMarketplaceService(
  registry?: SkillRegistryService,
): SkillMarketplaceService {
  if (registry) return new SkillMarketplaceService(registry);
  if (!singleton) singleton = new SkillMarketplaceService();
  return singleton;
}

export const skillMarketplaceService = {
  listCatalog: () => getSkillMarketplaceService().listCatalog(),
  getDiagnostics: () => getSkillMarketplaceService().getDiagnostics(),
  exportCatalog: () => getSkillMarketplaceService().exportCatalog(),
  importLoose: (
    payload: unknown,
    options?: { formatHint?: SkillImportFormatHint },
  ) => getSkillMarketplaceService().importLoose(payload, options),
  enable: (skillId: string) => getSkillMarketplaceService().enable(skillId),
  disable: (skillId: string) => getSkillMarketplaceService().disable(skillId),
  quarantine: (skillId: string) =>
    getSkillMarketplaceService().quarantine(skillId),
  dryRun: (
    skillId: string,
    options?: { tier?: LucaUserOperationTier; action?: "view" | "invoke" },
  ) => getSkillMarketplaceService().dryRun(skillId, options),
};
