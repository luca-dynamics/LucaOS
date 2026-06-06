import type { ExecutionTrace } from "../doctrine/executionDoctrine";
import type { IdentityCore } from "../identity/identityTypes";
import type { LearningLogEntry } from "../learning/learningTypes";
import type { MemoryItem } from "../memory/memoryTypes";
import type { MissionProfile } from "../mission/missionTypes";
import type { SkillManifest } from "../skills/skillTypes";
import { evaluateIntegrationReadiness, summarizeIntegrationReadiness } from "./integrationReadiness";
import type { IntegrationReadinessSummary, IntegrationTarget } from "./integrationTypes";

export interface PersonalIntelligencePreview {
  identityProfile?: IdentityCore;
  missionProfiles: MissionProfile[];
  memoryItems: MemoryItem[];
  skillManifests: SkillManifest[];
  learningEvents: LearningLogEntry[];
  executionTraces: ExecutionTrace[];
  readinessSummary: IntegrationReadinessSummary;
  warnings: string[];
}

export interface PersonalIntelligencePreviewInput {
  identityProfile?: IdentityCore;
  missionProfiles?: MissionProfile[];
  memoryItems?: MemoryItem[];
  skillManifests?: SkillManifest[];
  learningEvents?: LearningLogEntry[];
  executionTraces?: ExecutionTrace[];
  integrationTargets?: IntegrationTarget[];
  warnings?: string[];
}

export interface PersonalIntelligencePreviewSummary {
  identityProfiles: number;
  missionProfiles: number;
  memoryItems: number;
  skillManifests: number;
  learningEvents: number;
  executionTraces: number;
  readiness: IntegrationReadinessSummary;
  warningCount: number;
}

export function createPersonalIntelligencePreview(input: PersonalIntelligencePreviewInput): PersonalIntelligencePreview {
  const targets = (input.integrationTargets ?? []).map(evaluateIntegrationReadiness);
  const draft: PersonalIntelligencePreview = {
    identityProfile: input.identityProfile ? cloneIdentity(input.identityProfile) : undefined,
    missionProfiles: (input.missionProfiles ?? []).map(cloneMission),
    memoryItems: (input.memoryItems ?? []).map((item) => ({ ...item, tags: [...item.tags] })),
    skillManifests: (input.skillManifests ?? []).map(cloneSkill),
    learningEvents: (input.learningEvents ?? []).map((event) => ({ ...event, relatedMemoryItemIds: event.relatedMemoryItemIds ? [...event.relatedMemoryItemIds] : undefined })),
    executionTraces: (input.executionTraces ?? []).map((trace) => ({ ...trace, events: trace.events.map((event) => ({ ...event, detail: event.detail ? { ...event.detail } : undefined })) })),
    readinessSummary: summarizeIntegrationReadiness(targets),
    warnings: [...(input.warnings ?? [])],
  };
  draft.warnings = listPersonalIntelligenceWarnings(draft);
  return draft;
}

export function summarizePersonalIntelligencePreview(preview: PersonalIntelligencePreview): PersonalIntelligencePreviewSummary {
  return {
    identityProfiles: preview.identityProfile ? 1 : 0,
    missionProfiles: preview.missionProfiles.length,
    memoryItems: preview.memoryItems.length,
    skillManifests: preview.skillManifests.length,
    learningEvents: preview.learningEvents.length,
    executionTraces: preview.executionTraces.length,
    readiness: { ...preview.readinessSummary, blockers: [...preview.readinessSummary.blockers] },
    warningCount: preview.warnings.length,
  };
}

export function listPersonalIntelligenceWarnings(preview: PersonalIntelligencePreview): string[] {
  const warnings = [...preview.warnings, ...preview.readinessSummary.blockers];
  if (preview.memoryItems.some((item) => ["credential", "financial", "health", "enterprise"].includes(item.privacyZone))) {
    warnings.push("Sensitive memory previews require an explicit governed approval policy before persistence or runtime use.");
  }
  if (preview.missionProfiles.some((mission) => mission.operatingMode === "supervised_execution")) {
    warnings.push("supervised_execution is future-only and cannot execute from this preview.");
  }
  if (preview.executionTraces.some((trace) => trace.events.some((event) => event.stage === "act"))) {
    warnings.push("Act-stage trace events are evidence only and do not trigger execution.");
  }
  return Array.from(new Set(warnings));
}

function cloneIdentity(profile: IdentityCore): IdentityCore {
  return {
    ...profile,
    lucaPersonality: { ...profile.lucaPersonality, traits: [...profile.lucaPersonality.traits], boundaries: [...profile.lucaPersonality.boundaries] },
    activeProjects: [...profile.activeProjects],
    preferredModels: [...profile.preferredModels],
    devicePreferences: profile.devicePreferences.map((device) => ({ ...device, preferences: { ...device.preferences } })),
    privacyDefaults: { ...profile.privacyDefaults },
  };
}

function cloneMission(profile: MissionProfile): MissionProfile {
  return { ...profile, goals: [...profile.goals], constraints: [...profile.constraints], successCriteria: [...profile.successCriteria], activeProjectRefs: [...profile.activeProjectRefs] };
}

function cloneSkill(manifest: SkillManifest): SkillManifest {
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
