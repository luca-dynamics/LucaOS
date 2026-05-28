import { LucaUserTier, normalizeLucaUserTier } from "../../types/lucaUserTier";

export type LucaCompanionTone = "warm" | "direct" | "professional" | "playful" | "calm" | "technical" | "unknown";

export type LucaCompanionRelationshipBoundary =
  | "no_fake_human_emotion_claims"
  | "no_dependency_reinforcement"
  | "no_hidden_memory_claims"
  | "clear_ai_boundary"
  | "user_agency_first"
  | "transparent_personalization";

export interface LucaCompanionProfile {
  userDisplayName?: string;
  userPreferences?: string[];
  personalitySummary?: string;
  communicationStyle?: string[];
  relationshipSummary?: string;
  boundaries: LucaCompanionRelationshipBoundary[];
  tone: LucaCompanionTone;
  memoryDisclosure: string;
  emotionalSafetyNotes?: string[];
  source?: string;
  metadata?: Record<string, unknown>;
  runtimeBehaviorChanged: false;
  persistenceEnabled: false;
}

export type LucaCompanionProfileInput = Partial<Omit<LucaCompanionProfile, "runtimeBehaviorChanged" | "persistenceEnabled">>;

export interface LucaCompanionProfileSnapshot {
  profile: LucaCompanionProfile;
  runtimeBehaviorChanged: false;
  persistenceEnabled: false;
  claimsPersistentMemory: boolean;
  safeCompanionBoundariesPresent: boolean;
}

const REQUIRED_BOUNDARIES: LucaCompanionRelationshipBoundary[] = [
  "no_fake_human_emotion_claims",
  "no_dependency_reinforcement",
  "no_hidden_memory_claims",
  "clear_ai_boundary",
  "user_agency_first",
  "transparent_personalization",
];

const DEFAULT_EMOTIONAL_SAFETY_NOTES = [
  "Use warmth without pretending to have human emotions.",
  "Support continuity without encouraging emotional dependency.",
  "Disclose when personalization comes from provided profile or memory context.",
];

function mergeUnique<T>(base: T[], update?: T[]): T[] {
  return Array.from(new Set([...base, ...(update ?? [])].filter(Boolean)));
}

function defaultToneForTier(tier: LucaUserTier): LucaCompanionTone {
  if (tier === "origin") return "technical";
  if (tier === "tactical") return "direct";
  if (tier === "normal") return "warm";
  return "unknown";
}

function defaultStyleForTone(tone: LucaCompanionTone): string[] {
  if (tone === "technical") return ["creator-facing", "strategic", "architecture-aware"];
  if (tone === "direct") return ["operator-focused", "concise", "diagnostics-oriented"];
  if (tone === "warm") return ["simple", "warm", "assistant-first"];
  if (tone === "professional") return ["clear", "structured", "measured"];
  if (tone === "playful") return ["light", "friendly", "still boundary-aware"];
  if (tone === "calm") return ["steady", "grounded", "reassuring without false intimacy"];
  return ["safe fallback", "minimal assumptions", "onboarding-oriented"];
}

function memoryDisclosureForSource(source?: string): string {
  if (source === "memory_profile") {
    return "Luca may reference explicitly provided memory_profile context, but this helper does not write or delete memory.";
  }

  return "No persistent memory is claimed by this profile unless a memory_profile source is explicitly provided.";
}

export function createLucaCompanionProfile(input: LucaCompanionProfileInput = {}): LucaCompanionProfile {
  const tone = input.tone ?? "warm";

  return {
    userDisplayName: input.userDisplayName,
    userPreferences: [...(input.userPreferences ?? [])],
    personalitySummary: input.personalitySummary,
    communicationStyle: mergeUnique(defaultStyleForTone(tone), input.communicationStyle),
    relationshipSummary: input.source === "memory_profile" ? input.relationshipSummary : undefined,
    boundaries: mergeUnique(REQUIRED_BOUNDARIES, input.boundaries),
    tone,
    memoryDisclosure:
      input.source === "memory_profile"
        ? input.memoryDisclosure ?? memoryDisclosureForSource(input.source)
        : memoryDisclosureForSource(input.source),
    emotionalSafetyNotes: mergeUnique(DEFAULT_EMOTIONAL_SAFETY_NOTES, input.emotionalSafetyNotes),
    source: input.source,
    metadata: { ...(input.metadata ?? {}) },
    runtimeBehaviorChanged: false,
    persistenceEnabled: false,
  };
}

export function mergeCompanionProfile(base: LucaCompanionProfile, update: LucaCompanionProfileInput = {}): LucaCompanionProfile {
  return createLucaCompanionProfile({
    ...base,
    ...update,
    userPreferences: mergeUnique(base.userPreferences ?? [], update.userPreferences),
    communicationStyle: mergeUnique(base.communicationStyle ?? [], update.communicationStyle),
    boundaries: mergeUnique(base.boundaries, update.boundaries),
    emotionalSafetyNotes: mergeUnique(base.emotionalSafetyNotes ?? [], update.emotionalSafetyNotes),
    metadata: { ...(base.metadata ?? {}), ...(update.metadata ?? {}) },
  });
}

export function getCompanionProfileForTier(tier: LucaUserTier | string | undefined, input: LucaCompanionProfileInput = {}): LucaCompanionProfile {
  const normalizedTier = normalizeLucaUserTier(tier);
  const tone = input.tone ?? defaultToneForTier(normalizedTier);
  return createLucaCompanionProfile({ ...input, tone });
}

export function getCompanionProfileSnapshot(input: LucaCompanionProfileInput = {}): LucaCompanionProfileSnapshot {
  const profile = createLucaCompanionProfile(input);
  return {
    profile,
    runtimeBehaviorChanged: false,
    persistenceEnabled: false,
    claimsPersistentMemory: profile.source === "memory_profile",
    safeCompanionBoundariesPresent: REQUIRED_BOUNDARIES.every((boundary) => profile.boundaries.includes(boundary)),
  };
}
