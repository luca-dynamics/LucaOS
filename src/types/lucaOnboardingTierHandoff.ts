import { getDefaultTierRoutingContext, type LucaTierRoutingContext } from "./lucaTierRouting";
import { normalizeLucaUserTier, type LucaUserTier } from "./lucaUserTier";

export type LucaInteractionMode = "chat" | "voice" | "unknown";
export type LucaModelMode = "luca_prime" | "local_models" | "byok" | "unknown";
export type LucaOnboardingSource = "private_macbook_onboarding" | "current_repo_onboarding" | "migration_placeholder" | "unknown";

export interface LucaOnboardingTierHandoff { userTier: LucaUserTier; interactionMode: LucaInteractionMode; modelMode: LucaModelMode; themeId?: string; backgroundOpacity?: number; backgroundBlur?: number; personalitySummary?: string; preferences?: Record<string, unknown>; source: LucaOnboardingSource; setupComplete?: boolean; metadata?: Record<string, unknown>; }
export interface LucaOnboardingTierHandoffValidation { ok: boolean; warnings: string[]; blockedReasons: string[]; normalizedContext?: LucaOnboardingTierHandoff; runtimeBehaviorChanged: false; persistenceChanged: false; uiWiringChanged: false; }

export function normalizeOnboardingTierHandoff(input?: Partial<LucaOnboardingTierHandoff>): LucaOnboardingTierHandoff {
  return {
    userTier: normalizeLucaUserTier(input?.userTier),
    interactionMode: input?.interactionMode ?? "unknown",
    modelMode: input?.modelMode ?? "unknown",
    themeId: input?.themeId,
    backgroundOpacity: input?.backgroundOpacity,
    backgroundBlur: input?.backgroundBlur,
    personalitySummary: input?.personalitySummary,
    preferences: input?.preferences,
    source: input?.source ?? "unknown",
    setupComplete: input?.setupComplete,
    metadata: input?.metadata,
  };
}

export function validateOnboardingTierHandoff(input?: Partial<LucaOnboardingTierHandoff>): LucaOnboardingTierHandoffValidation {
  const normalized = normalizeOnboardingTierHandoff(input);
  const warnings: string[] = [];
  const blockedReasons: string[] = [];
  if (!input?.modelMode) warnings.push("model_mode_missing_defaults_to_unknown");
  if (normalized.modelMode === "local_models") warnings.push("local_models_requires_explicit_install_download_consent_later");
  if (normalized.modelMode === "byok") warnings.push("byok_requires_secure_key_handling");
  if (normalized.interactionMode === "voice") warnings.push("voice_provider_routing_remains_separately_gated");
  return { ok: blockedReasons.length === 0, warnings, blockedReasons, normalizedContext: normalized, runtimeBehaviorChanged: false, persistenceChanged: false, uiWiringChanged: false };
}

export function createTierRoutingContextFromOnboardingHandoff(input?: Partial<LucaOnboardingTierHandoff>): LucaTierRoutingContext {
  const normalized = normalizeOnboardingTierHandoff(input);
  return getDefaultTierRoutingContext({
    userTier: normalized.userTier,
    source: normalized.source === "unknown" ? "default_safe_fallback" : "onboarding",
    setupComplete: normalized.setupComplete,
    preferredInteractionMode: normalized.interactionMode,
    modelMode: normalized.modelMode,
    metadata: { onboardingSource: normalized.source },
  });
}

export function getOnboardingTierHandoffSnapshot(input?: Partial<LucaOnboardingTierHandoff>) {
  return { validation: validateOnboardingTierHandoff(input), routingContext: createTierRoutingContextFromOnboardingHandoff(input), runtimeBehaviorChanged: false as const, persistenceChanged: false as const, uiWiringChanged: false as const };
}
