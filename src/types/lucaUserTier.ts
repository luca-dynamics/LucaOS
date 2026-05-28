export type LucaUserTier = "origin" | "tactical" | "normal" | "unknown";

export type LucaUserTierCapability =
  | "view_origin_evolution_dashboard"
  | "submit_evolution_request"
  | "import_external_evolution_artifact"
  | "review_evolution_proposal"
  | "approve_evolution_proposal"
  | "promote_evolution_candidate"
  | "rollback_evolution_candidate"
  | "view_safe_evolution_summary"
  | "provide_feedback_evidence";

export type LucaUserTierSource =
  | "onboarding"
  | "settings"
  | "local_capability_detection"
  | "creator_override"
  | "migration_placeholder"
  | "unknown";

export interface LucaUserTierContext {
  tier: LucaUserTier;
  source: LucaUserTierSource;
  confidence?: number;
  isPrivateMacbookArchitectureExpected?: boolean;
  metadata?: Record<string, unknown>;
}

export interface LucaUserTierContractSafetyMetadata {
  runtimeBehaviorChanged: false;
  uiWiringChanged: false;
  originControlsExposed: false;
  evolutionServiceCalled: false;
  persistenceEnabled: false;
}

const ALL_CAPABILITIES: LucaUserTierCapability[] = [
  "view_origin_evolution_dashboard",
  "submit_evolution_request",
  "import_external_evolution_artifact",
  "review_evolution_proposal",
  "approve_evolution_proposal",
  "promote_evolution_candidate",
  "rollback_evolution_candidate",
  "view_safe_evolution_summary",
  "provide_feedback_evidence",
];

const CAPABILITIES_BY_TIER: Record<LucaUserTier, LucaUserTierCapability[]> = {
  origin: [...ALL_CAPABILITIES],
  tactical: ["submit_evolution_request", "view_safe_evolution_summary", "provide_feedback_evidence"],
  normal: ["view_safe_evolution_summary", "provide_feedback_evidence"],
  unknown: ["provide_feedback_evidence"],
};

export function normalizeLucaUserTier(value: unknown): LucaUserTier {
  if (typeof value !== "string") return "unknown";

  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, "");

  if (["origin", "creator", "ownertier", "creatortier"].includes(normalized)) return "origin";
  if (["tactical", "poweruser", "advanced", "developertier"].includes(normalized)) return "tactical";
  if (["normal", "core", "standard", "default"].includes(normalized)) return "normal";

  return "unknown";
}

export function isOriginTier(tier: LucaUserTier): boolean {
  return tier === "origin";
}

export function isTacticalTier(tier: LucaUserTier): boolean {
  return tier === "tactical";
}

export function isNormalTier(tier: LucaUserTier): boolean {
  return tier === "normal";
}

export function getTierCapabilities(tier: LucaUserTier): LucaUserTierCapability[] {
  return [...CAPABILITIES_BY_TIER[tier]];
}

export function canTierAccessCapability(tier: LucaUserTier, capability: LucaUserTierCapability): boolean {
  return CAPABILITIES_BY_TIER[tier].includes(capability);
}

export function getDefaultTierContext(input?: Partial<LucaUserTierContext>): LucaUserTierContext & LucaUserTierContractSafetyMetadata {
  const tier = normalizeLucaUserTier(input?.tier);

  return {
    tier,
    source: input?.source ?? "unknown",
    confidence: input?.confidence,
    isPrivateMacbookArchitectureExpected: input?.isPrivateMacbookArchitectureExpected ?? true,
    metadata: {
      ...(input?.metadata ?? {}),
      runtimeBehaviorChanged: false,
      uiWiringChanged: false,
      originControlsExposed: false,
      evolutionServiceCalled: false,
      persistenceEnabled: false,
    },
    runtimeBehaviorChanged: false,
    uiWiringChanged: false,
    originControlsExposed: false,
    evolutionServiceCalled: false,
    persistenceEnabled: false,
  };
}
