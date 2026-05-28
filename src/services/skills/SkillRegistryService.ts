import type { ProvenanceMetadata } from "../../types/provenance";
import type { SkillRegistryDiagnosticsSummary, SkillRegistryRecord, SkillUseCheck } from "../../types/skillContinuity";
import type { LucaSkillManifest, LucaSkillRiskLevel } from "./SkillManifest";

interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; }
const STORAGE_KEY = "LUCA_SKILL_REGISTRY_V1";
function nowIso(): string { return new Date().toISOString(); }
function storage(): StorageLike | undefined { if (typeof window !== "undefined" && window.localStorage) return window.localStorage; if (typeof localStorage !== "undefined") return localStorage; return undefined; }
function readRecords(store: StorageLike | undefined): SkillRegistryRecord[] { try { const raw = store?.getItem(STORAGE_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }

export class SkillRegistryService {
  private records: SkillRegistryRecord[];
  constructor(private readonly backingStorage: StorageLike | undefined = storage()) { this.records = readRecords(this.backingStorage); }

  registerSkill(input: Partial<SkillRegistryRecord> & { name: string; version: string; manifest: LucaSkillManifest | Record<string, unknown>; provenance?: ProvenanceMetadata }): SkillRegistryRecord {
    const timestamp = nowIso();
    const manifest = input.manifest as LucaSkillManifest;
    const riskLevel: LucaSkillRiskLevel = input.riskLevel ?? manifest.safetyPolicy?.riskLevel ?? "medium";
    const record: SkillRegistryRecord = {
      skillId: input.skillId ?? (manifest.id || `skill:${input.name}:${input.version}`),
      name: input.name,
      version: input.version,
      source: input.source ?? manifest.source ?? "unknown",
      manifest: input.manifest,
      capabilities: input.capabilities ?? manifest.allowedTools ?? [],
      requiredPermissions: input.requiredPermissions ?? [],
      provenance: input.provenance,
      lifecycleState: input.lifecycleState ?? "discovered",
      installPath: input.installPath,
      virtualSource: input.virtualSource,
      createdAt: input.createdAt ?? timestamp,
      updatedAt: timestamp,
      lastUsedAt: input.lastUsedAt,
      riskLevel,
      diagnostics: {
        canAutoExecute: false,
        requiresProvenanceApproval: input.diagnostics?.requiresProvenanceApproval ?? (riskLevel !== "low" || !input.provenance),
        warnings: input.diagnostics?.warnings ?? ["New/self-authored skills are registry-only until provenance approval is attached."],
      },
    };
    this.records = [...this.records.filter((item) => item.skillId !== record.skillId), record];
    this.persist();
    return record;
  }

  listSkills(): SkillRegistryRecord[] { return [...this.records]; }
  enableSkill(skillId: string): SkillRegistryRecord | undefined { return this.updateSkillMetadata(skillId, { lifecycleState: "enabled" }); }
  disableSkill(skillId: string): SkillRegistryRecord | undefined { return this.updateSkillMetadata(skillId, { lifecycleState: "disabled" }); }
  quarantineSkill(skillId: string): SkillRegistryRecord | undefined { return this.updateSkillMetadata(skillId, { lifecycleState: "quarantined", diagnostics: { canAutoExecute: false, requiresProvenanceApproval: true, warnings: ["Skill is quarantined and cannot run."] } }); }
  attachProvenance(skillId: string, provenance: ProvenanceMetadata): SkillRegistryRecord | undefined { return this.updateSkillMetadata(skillId, { provenance, diagnostics: { canAutoExecute: false, requiresProvenanceApproval: provenance.approvalState !== "not_required" && provenance.approvalState !== "approved_once", warnings: ["Skill authority remains no-op until a future execution gate consumes one-shot approval."] } }); }

  updateSkillMetadata(skillId: string, update: Partial<SkillRegistryRecord>): SkillRegistryRecord | undefined {
    const existing = this.records.find((record) => record.skillId === skillId);
    if (!existing) return undefined;
    const record: SkillRegistryRecord = { ...existing, ...update, skillId: existing.skillId, createdAt: existing.createdAt, updatedAt: nowIso(), diagnostics: { ...existing.diagnostics, ...update.diagnostics, canAutoExecute: false } };
    this.records = this.records.map((item) => item.skillId === skillId ? record : item);
    this.persist();
    return record;
  }

  checkWhetherSkillCanBeUsed(skillId: string): SkillUseCheck {
    const skill = this.records.find((record) => record.skillId === skillId);
    const blockedBy: string[] = [];
    if (!skill) return { allowed: false, userSafeReason: "Skill is not registered.", blockedBy: ["missing_skill"] };
    if (!skill.provenance) blockedBy.push("missing_provenance");
    if (skill.lifecycleState !== "enabled") blockedBy.push(`lifecycle_${skill.lifecycleState}`);
    if (skill.lifecycleState === "quarantined" || skill.provenance?.quarantineState === "quarantined") blockedBy.push("quarantined");
    if (skill.provenance?.revocationState === "revoked") blockedBy.push("revoked_provenance");
    if (skill.riskLevel === "high" || skill.riskLevel === "critical") blockedBy.push("approval_required");
    return { allowed: blockedBy.length === 0, userSafeReason: blockedBy.length === 0 ? "Skill is registered for governed use. Automatic execution remains disabled in this foundation." : "Skill cannot run until lifecycle, provenance, and approval gates are safe.", blockedBy };
  }

  getDiagnosticsSummary(): SkillRegistryDiagnosticsSummary {
    return { totalSkills: this.records.length, enabledSkills: this.records.filter((skill) => skill.lifecycleState === "enabled").length, disabledSkills: this.records.filter((skill) => skill.lifecycleState === "disabled").length, quarantinedSkills: this.records.filter((skill) => skill.lifecycleState === "quarantined" || skill.provenance?.quarantineState === "quarantined").length, skillsMissingProvenance: this.records.filter((skill) => !skill.provenance).length, highRiskSkills: this.records.filter((skill) => skill.riskLevel === "high" || skill.riskLevel === "critical").length };
  }

  private persist(): void { this.backingStorage?.setItem(STORAGE_KEY, JSON.stringify(this.records)); }
}

export const skillRegistryService = new SkillRegistryService();
