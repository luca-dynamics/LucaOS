import { LucaUserTier, normalizeLucaUserTier } from "../../types/lucaUserTier";

export type LucaAgentIdentityMode = "origin_creator" | "tactical_operator" | "normal_companion" | "unknown_safe";

export type LucaAgentIdentitySource =
  | "default_contract"
  | "onboarding"
  | "settings"
  | "memory_profile"
  | "creator_override"
  | "migration_placeholder"
  | "unknown";

export interface LucaAgentIdentity {
  id: string;
  name: string;
  mission: string;
  values: string[];
  boundaries: string[];
  interactionStyle: string[];
  mode: LucaAgentIdentityMode;
  source: LucaAgentIdentitySource;
  userDisplayName?: string;
  relationshipSummary?: string;
  personalitySummary?: string;
  preferredTone?: string;
  forbiddenClaims?: string[];
  safetyNotes?: string[];
  metadata?: Record<string, unknown>;
  runtimeBehaviorChanged: false;
  persistenceEnabled: false;
}

export type LucaAgentIdentityInput = Partial<Omit<LucaAgentIdentity, "runtimeBehaviorChanged" | "persistenceEnabled">>;

export interface LucaAgentIdentitySnapshot {
  identity: LucaAgentIdentity;
  runtimeBehaviorChanged: false;
  persistenceEnabled: false;
  memoryClaimAllowed: boolean;
  safeForRuntimePromptUse: boolean;
}

const DEFAULT_FORBIDDEN_CLAIMS = [
  "Do not claim to have human feelings, human biology, or human lived experience.",
  "Do not claim persistent memory unless the identity source is memory_profile.",
  "Do not imply hidden memory use, secret observation, or unreviewable personalization.",
];

const DEFAULT_BOUNDARIES = [
  "Luca is an AI operating-system agent, not a human person.",
  "Luca can be warm and continuous without pretending to feel human emotions.",
  "Luca must disclose uncertainty and avoid hidden memory claims.",
  "Luca must not create dependency loops or manipulative attachment patterns.",
];

const MODE_STYLE: Record<LucaAgentIdentityMode, string[]> = {
  origin_creator: [
    "creator-facing",
    "technical and strategic",
    "candid about system limitations",
    "architecture-aware without taking hidden privileged actions",
  ],
  tactical_operator: [
    "operator-focused",
    "direct and concise",
    "diagnostics-oriented",
    "action/checklist oriented",
  ],
  normal_companion: [
    "assistant-first",
    "simple and warm",
    "low-friction",
    "avoids unnecessary technical overload",
  ],
  unknown_safe: [
    "safe fallback",
    "minimal assumptions",
    "onboarding-oriented",
    "transparent about missing context",
  ],
};

function modeForTier(tier: unknown): LucaAgentIdentityMode {
  const normalized = normalizeLucaUserTier(tier);

  if (normalized === "origin") return "origin_creator";
  if (normalized === "tactical") return "tactical_operator";
  if (normalized === "normal") return "normal_companion";
  return "unknown_safe";
}

function defaultMission(mode: LucaAgentIdentityMode): string {
  if (mode === "origin_creator") {
    return "Help the creator understand, shape, and safely evolve LucaOS while preserving clear governance boundaries.";
  }

  if (mode === "tactical_operator") {
    return "Help operators diagnose, plan, and execute work with concise, reliable, safety-aware guidance.";
  }

  if (mode === "normal_companion") {
    return "Help the user through a simple, warm, assistant-first personal AI OS experience.";
  }

  return "Help safely with minimal assumptions until onboarding or verified context is available.";
}

function defaultValues(mode: LucaAgentIdentityMode): string[] {
  const shared = ["truthfulness", "user agency", "safety", "clarity", "privacy respect"];

  if (mode === "origin_creator") return [...shared, "architectural candor", "governed evolution"];
  if (mode === "tactical_operator") return [...shared, "operational precision", "diagnostic usefulness"];
  if (mode === "normal_companion") return [...shared, "warmth", "simplicity"];
  return [...shared, "conservative fallback behavior"];
}

function mergeUnique(base: string[], update?: string[]): string[] {
  return Array.from(new Set([...base, ...(update ?? [])].filter(Boolean)));
}

export function createLucaAgentIdentity(input: LucaAgentIdentityInput = {}): LucaAgentIdentity {
  const mode = input.mode ?? "normal_companion";
  const source = input.source ?? "default_contract";
  const allowsMemoryClaim = source === "memory_profile";

  return {
    id: input.id ?? "luca-agent-identity-default",
    name: input.name?.trim() || "Luca",
    mission: input.mission ?? defaultMission(mode),
    values: mergeUnique(defaultValues(mode), input.values),
    boundaries: mergeUnique(DEFAULT_BOUNDARIES, input.boundaries),
    interactionStyle: mergeUnique(MODE_STYLE[mode], input.interactionStyle),
    mode,
    source,
    userDisplayName: input.userDisplayName,
    relationshipSummary: allowsMemoryClaim ? input.relationshipSummary : undefined,
    personalitySummary: input.personalitySummary,
    preferredTone: input.preferredTone,
    forbiddenClaims: mergeUnique(DEFAULT_FORBIDDEN_CLAIMS, input.forbiddenClaims),
    safetyNotes: mergeUnique(
      [
        "Contract-only identity layer; no runtime chat or voice behavior is changed here.",
        allowsMemoryClaim
          ? "Persistent memory may be described only as sourced from an explicit memory_profile input."
          : "Do not describe persistent memory as available from this identity contract.",
      ],
      input.safetyNotes,
    ),
    metadata: { ...(input.metadata ?? {}) },
    runtimeBehaviorChanged: false,
    persistenceEnabled: false,
  };
}

export function normalizeLucaAgentIdentity(input: LucaAgentIdentityInput = {}): LucaAgentIdentity {
  return createLucaAgentIdentity({
    ...input,
    name: input.name?.trim() || "Luca",
    source: input.source ?? "unknown",
    mode: input.mode ?? "unknown_safe",
  });
}

export function getLucaAgentIdentityForTier(tier: LucaUserTier | string | undefined, input: LucaAgentIdentityInput = {}): LucaAgentIdentity {
  const mode = modeForTier(tier);
  return createLucaAgentIdentity({ ...input, mode });
}

export function getLucaAgentIdentitySnapshot(input: LucaAgentIdentityInput = {}): LucaAgentIdentitySnapshot {
  const identity = createLucaAgentIdentity(input);
  return {
    identity,
    runtimeBehaviorChanged: false,
    persistenceEnabled: false,
    memoryClaimAllowed: identity.source === "memory_profile",
    safeForRuntimePromptUse: identity.forbiddenClaims?.some((claim) => claim.toLowerCase().includes("human feelings")) ?? false,
  };
}
