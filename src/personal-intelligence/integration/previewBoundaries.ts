import { LUCA_EXECUTION_DOCTRINE } from "../doctrine/executionDoctrine";
import { createIdentityProfile } from "../identity/identityProfile";
import type {
  IdentityCore,
  IdentityCoreInput,
} from "../identity/identityTypes";
import { validateLearningLogEntry } from "../learning/learningLog";
import type { LearningLogEntry } from "../learning/learningTypes";
import { serializeMemoryItem } from "../memory/memoryFilesystem";
import { createMemoryItem } from "../memory/memoryStore";
import type { MemoryItem, MemoryItemInput } from "../memory/memoryTypes";
import { createMissionProfile } from "../mission/missionProfile";
import type {
  MissionProfile,
  MissionProfileInput,
} from "../mission/missionTypes";
import { PRIVACY_ZONES, type PrivacyZone } from "../privacy/privacyZones";
import { createSkillManifest } from "../skills/skillManifest";
import type { SkillManifest, SkillManifestInput } from "../skills/skillTypes";

const PREVIEW_TIMESTAMP = "2026-06-06T00:00:00.000Z";
const previewNow = () => new Date(PREVIEW_TIMESTAMP);

export interface MemoryPreview {
  item: MemoryItem;
  proposedPath: string;
  serializedContent: string;
  format: "json";
  writePerformed: false;
}

export interface IntegrationReadinessBlocker {
  boundary: "persistence" | "network" | "execution" | "sensitive-zones";
  label: string;
  reason: string;
}

export interface IntegrationReadinessPreview {
  ready: false;
  previewOnly: true;
  blockers: IntegrationReadinessBlocker[];
}

export function createIdentityProfilePreview(
  input: IdentityCoreInput,
): IdentityCore {
  return createIdentityProfile(input, previewNow);
}

export function createMissionProfilePreview(
  input: MissionProfileInput,
): MissionProfile {
  return createMissionProfile(input, previewNow);
}

export function createMemoryPreview(input: MemoryItemInput): MemoryPreview {
  return serializeMemoryPreviewOnly(createMemoryItem(input, previewNow));
}

export function serializeMemoryPreviewOnly(item: MemoryItem): MemoryPreview {
  const serialized = serializeMemoryItem(item, "json");
  return {
    item: { ...item, tags: [...item.tags] },
    proposedPath: serialized.path,
    serializedContent: serialized.content,
    format: "json",
    writePerformed: false,
  };
}

export function createLearningEventPreview(
  entry: LearningLogEntry,
): LearningLogEntry {
  const preview = { ...entry };
  const errors = validateLearningLogEntry(preview);
  if (errors.length > 0) {
    throw new Error(`Invalid learning event preview: ${errors.join(", ")}`);
  }
  return preview;
}

export function createSkillManifestPreview(
  input: SkillManifestInput,
): SkillManifest {
  return createSkillManifest(input, previewNow);
}

export function createExecutionDoctrinePreview() {
  return {
    ...LUCA_EXECUTION_DOCTRINE,
    stages: LUCA_EXECUTION_DOCTRINE.stages.map((stage) => ({ ...stage })),
    evidenceOnlyStages: ["approve", "act"] as const,
    executionPerformed: false as const,
  };
}

export function createPrivacyZonesPreview(): Array<{
  zone: PrivacyZone;
  sensitive: boolean;
  blocked: boolean;
}> {
  const sensitiveZones = new Set<PrivacyZone>([
    "private",
    "credential",
    "financial",
    "health",
    "enterprise",
  ]);
  return PRIVACY_ZONES.map((zone) => ({
    zone,
    sensitive: sensitiveZones.has(zone),
    blocked: sensitiveZones.has(zone),
  }));
}

export function evaluateIntegrationReadinessPreview(): IntegrationReadinessPreview {
  return {
    ready: false,
    previewOnly: true,
    blockers: [
      {
        boundary: "persistence",
        label: "Persistence blocked",
        reason:
          "No filesystem, database, or browser-storage adapter is connected.",
      },
      {
        boundary: "network",
        label: "Network blocked",
        reason:
          "No provider, socket, LucaLink, or remote transport is connected.",
      },
      {
        boundary: "execution",
        label: "Execution blocked",
        reason:
          "Skills, tools, workflows, adapters, and entrypoints remain inert.",
      },
      {
        boundary: "sensitive-zones",
        label: "Sensitive zones blocked",
        reason:
          "Private, credential, financial, health, and enterprise data require future governed authorization.",
      },
    ],
  };
}
