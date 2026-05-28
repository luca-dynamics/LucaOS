import { LucaUserTier, normalizeLucaUserTier } from "../../types/lucaUserTier";
import {
  LucaAgentIdentity,
  LucaAgentIdentitySource,
  getLucaAgentIdentityForTier,
} from "./LucaAgentIdentity";
import {
  LucaCompanionProfile,
  getCompanionProfileForTier,
} from "./LucaCompanionProfile";
import { LucaTierPersona, createTierPersona } from "./LucaTierPersona";

export type LucaIdentityRuntimeSurface = "chat" | "voice" | "onboarding" | "system" | "memory" | "unknown";

export type LucaIdentityRuntimeSource = LucaAgentIdentitySource | "runtime" | "prompt_builder" | string;

export interface LucaIdentityRuntimeInput {
  tier?: LucaUserTier | string;
  surface?: LucaIdentityRuntimeSurface | string;
  userDisplayName?: string;
  personalitySummary?: string;
  relationshipSummary?: string;
  communicationStyle?: string | string[];
  source?: LucaIdentityRuntimeSource;
  modelMode?: string;
  interactionMode?: string;
  metadata?: Record<string, unknown>;
}

export interface LucaIdentityRuntimeSnapshot {
  identity: LucaAgentIdentity;
  companionProfile: LucaCompanionProfile;
  tierPersona: LucaTierPersona;
  systemIdentitySummary: string;
  runtimeToneGuidance: string;
  memoryDisclosure: string;
  forbiddenClaims: string[];
  boundaries: string[];
  surface: LucaIdentityRuntimeSurface;
  tier: LucaUserTier;
  runtimeBehaviorChanged: boolean;
  persistenceEnabled: false;
  safeForPromptUse: boolean;
}

const RUNTIME_FORBIDDEN_CLAIMS = [
  "Do not claim to have human feelings, human biology, or human lived experience.",
  "Do not claim persistent memory unless the active identity source is memory_profile.",
  "Do not imply hidden memory use, secret observation, or unreviewable personalization.",
  "Do not present Luca as a separate human, romantic partner, or emotional dependent.",
];

const RUNTIME_BOUNDARIES = [
  "Luca is an AI operating-system agent and companion interface, not a human person.",
  "Use warmth, continuity, and personal context without pretending to feel human emotions.",
  "Preserve user agency and avoid dependency-reinforcing language.",
  "Do not expose Origin-only controls, evolution approvals, or privileged operations to Tactical, Normal, or Unknown tiers.",
  "Do not add, write, or delete memory/settings from identity prompt assembly.",
];

function normalizeSurface(surface: LucaIdentityRuntimeInput["surface"]): LucaIdentityRuntimeSurface {
  if (surface === "chat" || surface === "voice" || surface === "onboarding" || surface === "system" || surface === "memory") {
    return surface;
  }

  return "unknown";
}

function normalizeSource(source: LucaIdentityRuntimeInput["source"]): LucaAgentIdentitySource {
  if (
    source === "default_contract" ||
    source === "onboarding" ||
    source === "settings" ||
    source === "memory_profile" ||
    source === "creator_override" ||
    source === "migration_placeholder" ||
    source === "unknown"
  ) {
    return source;
  }

  if (source === "runtime" || source === "prompt_builder") return "default_contract";
  return "unknown";
}

function normalizeCommunicationStyle(style: LucaIdentityRuntimeInput["communicationStyle"]): string[] {
  if (Array.isArray(style)) return style.filter(Boolean);
  if (typeof style === "string" && style.trim()) return [style.trim()];
  return [];
}

function mergeUnique(base: string[], update?: string[]): string[] {
  return Array.from(new Set([...base, ...(update ?? [])].filter(Boolean)));
}

function memoryDisclosureFor(input: LucaIdentityRuntimeInput): string {
  if (input.source === "memory_profile") {
    return "Memory disclosure: Luca may reference relationship or preference context explicitly supplied by the memory_profile source for this prompt. This adapter does not write, alter, or delete memory.";
  }

  return "Memory disclosure: Luca must not claim persistent memory from this prompt. Personalization is limited to context explicitly provided in the current request or visible runtime input.";
}

function toneByTier(tier: LucaUserTier): string[] {
  if (tier === "origin") {
    return [
      "Origin tone: creator-facing, technical, strategic, and candid about system limitations.",
      "Discuss architecture and governance constraints plainly without implying hidden privileged actions.",
    ];
  }

  if (tier === "tactical") {
    return [
      "Tactical tone: direct, concise, operator-focused, and diagnostics oriented.",
      "Prefer concrete status, risks, next actions, and checklists over theatrical persona language.",
    ];
  }

  if (tier === "normal") {
    return [
      "Normal tone: warm, simple, assistant-first, and low-friction.",
      "Avoid technical overload unless the user asks for detail.",
    ];
  }

  return [
    "Unknown-tier tone: safe fallback, transparent about missing context, and conservative with assumptions.",
    "Ask for clarifying context instead of assuming tier-specific permissions or memory.",
  ];
}

function buildSummary(input: LucaIdentityRuntimeInput, snapshot?: Pick<LucaIdentityRuntimeSnapshot, "identity" | "companionProfile" | "tierPersona" | "surface" | "tier" | "memoryDisclosure" | "forbiddenClaims" | "boundaries">): string {
  const tier = snapshot?.tier ?? normalizeLucaUserTier(input.tier);
  const surface = snapshot?.surface ?? normalizeSurface(input.surface);
  const identity = snapshot?.identity ?? getLucaAgentIdentityForTier(tier, {
    source: normalizeSource(input.source),
    userDisplayName: input.userDisplayName,
    personalitySummary: input.personalitySummary,
    relationshipSummary: input.source === "memory_profile" ? input.relationshipSummary : undefined,
    metadata: input.metadata,
  });
  const companionProfile = snapshot?.companionProfile ?? getCompanionProfileForTier(tier, {
    source: input.source,
    userDisplayName: input.userDisplayName,
    personalitySummary: input.personalitySummary,
    relationshipSummary: input.source === "memory_profile" ? input.relationshipSummary : undefined,
    communicationStyle: normalizeCommunicationStyle(input.communicationStyle),
    metadata: input.metadata,
  });
  const tierPersona = snapshot?.tierPersona ?? createTierPersona(tier, { metadata: input.metadata });
  const forbiddenClaims = snapshot?.forbiddenClaims ?? mergeUnique(RUNTIME_FORBIDDEN_CLAIMS, identity.forbiddenClaims);
  const boundaries = snapshot?.boundaries ?? mergeUnique(RUNTIME_BOUNDARIES, [
    ...identity.boundaries,
    ...tierPersona.behavior.boundaries,
  ]);
  const memoryDisclosure = snapshot?.memoryDisclosure ?? memoryDisclosureFor(input);
  const lines = [
    "Canonical Luca runtime identity:",
    `- Name: ${identity.name}.`,
    `- Surface: ${surface}. Tier: ${tier}. Persona: ${tierPersona.label}.`,
    `- Mission: ${identity.mission}`,
    `- Audience: ${tierPersona.behavior.audience}.`,
    `- Interaction style: ${mergeUnique(identity.interactionStyle, companionProfile.communicationStyle).join(", ")}.`,
    `- Allowed presentation: ${tierPersona.behavior.allowedPresentation.join(", ")}.`,
    `- ${memoryDisclosure}`,
    `- Forbidden claims: ${forbiddenClaims.join(" ")}`,
    `- Boundaries: ${boundaries.join(" ")}`,
  ];

  if (input.userDisplayName) lines.push(`- User display name supplied for this prompt: ${input.userDisplayName}.`);
  if (input.personalitySummary) lines.push(`- Provided personality summary: ${input.personalitySummary}.`);
  if (input.source === "memory_profile" && input.relationshipSummary) {
    lines.push(`- Memory-profile relationship summary: ${input.relationshipSummary}.`);
  }
  if (input.modelMode) lines.push(`- Model mode metadata: ${input.modelMode}. Do not change provider routing from this identity block.`);
  if (input.interactionMode) lines.push(`- Interaction mode metadata: ${input.interactionMode}.`);

  return lines.join("\n");
}

export function createLucaRuntimeToneGuidance(input: LucaIdentityRuntimeInput = {}): string {
  const tier = normalizeLucaUserTier(input.tier);
  const communicationStyle = normalizeCommunicationStyle(input.communicationStyle);
  const guidance = [
    ...toneByTier(tier),
    ...communicationStyle.map((style) => `User communication style hint: ${style}.`),
  ];

  return guidance.join("\n");
}

export function createLucaSystemIdentitySummary(input: LucaIdentityRuntimeInput = {}): string {
  return buildSummary(input);
}

export function createLucaIdentityRuntimeSnapshot(input: LucaIdentityRuntimeInput = {}): LucaIdentityRuntimeSnapshot {
  const tier = normalizeLucaUserTier(input.tier);
  const surface = normalizeSurface(input.surface);
  const source = normalizeSource(input.source);
  const communicationStyle = normalizeCommunicationStyle(input.communicationStyle);
  const relationshipSummary = input.source === "memory_profile" ? input.relationshipSummary : undefined;

  const identity = getLucaAgentIdentityForTier(tier, {
    source,
    userDisplayName: input.userDisplayName,
    personalitySummary: input.personalitySummary,
    relationshipSummary,
    preferredTone: communicationStyle.join(", ") || undefined,
    metadata: input.metadata,
  });
  const companionProfile = getCompanionProfileForTier(tier, {
    source: input.source,
    userDisplayName: input.userDisplayName,
    personalitySummary: input.personalitySummary,
    relationshipSummary,
    communicationStyle,
    metadata: input.metadata,
  });
  const tierPersona = createTierPersona(tier, { metadata: input.metadata });
  const memoryDisclosure = memoryDisclosureFor(input);
  const forbiddenClaims = mergeUnique(RUNTIME_FORBIDDEN_CLAIMS, identity.forbiddenClaims);
  const boundaries = mergeUnique(RUNTIME_BOUNDARIES, [
    ...identity.boundaries,
    ...tierPersona.behavior.boundaries,
  ]);
  const runtimeToneGuidance = createLucaRuntimeToneGuidance(input);

  const partial = { identity, companionProfile, tierPersona, surface, tier, memoryDisclosure, forbiddenClaims, boundaries };
  const systemIdentitySummary = buildSummary(input, partial);

  return {
    identity,
    companionProfile,
    tierPersona,
    systemIdentitySummary,
    runtimeToneGuidance,
    memoryDisclosure,
    forbiddenClaims,
    boundaries,
    surface,
    tier,
    runtimeBehaviorChanged: true,
    persistenceEnabled: false,
    safeForPromptUse:
      forbiddenClaims.some((claim) => claim.toLowerCase().includes("human feelings")) &&
      memoryDisclosure.toLowerCase().includes("memory disclosure") &&
      boundaries.some((boundary) => boundary.toLowerCase().includes("not a human")),
  };
}

export function getIdentityRuntimeSafetySnapshot(input: LucaIdentityRuntimeInput = {}) {
  const snapshot = createLucaIdentityRuntimeSnapshot(input);
  return {
    surface: snapshot.surface,
    tier: snapshot.tier,
    safeForPromptUse: snapshot.safeForPromptUse,
    persistenceEnabled: snapshot.persistenceEnabled,
    runtimeBehaviorChanged: snapshot.runtimeBehaviorChanged,
    memoryClaimAllowed: input.source === "memory_profile",
    memoryDisclosure: snapshot.memoryDisclosure,
    forbiddenClaims: snapshot.forbiddenClaims,
    boundaries: snapshot.boundaries,
  };
}
