import { LucaUserTier, normalizeLucaUserTier } from "./lucaUserTier";

export type LucaTierShellMode = "origin_creator_shell" | "tactical_shell" | "normal_shell" | "unknown_safe_shell";

export type LucaTierRoutingSource =
  | "onboarding"
  | "settings"
  | "private_macbook_migration"
  | "local_capability_detection"
  | "creator_override"
  | "default_safe_fallback"
  | "unknown";

export interface LucaTierRoutingContext {
  userTier: LucaUserTier;
  source: LucaTierRoutingSource;
  setupComplete?: boolean;
  preferredInteractionMode?: "chat" | "voice" | "unknown";
  modelMode?: "luca_prime" | "local_models" | "byok" | "unknown";
  privateMacbookArchitectureExpected?: boolean;
  localCapabilitySignals?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface LucaTierRoutingDecision {
  shellMode: LucaTierShellMode;
  userTier: LucaUserTier;
  source: LucaTierRoutingSource;
  reason: string;
  originControlsAllowed: boolean;
  tacticalControlsAllowed: boolean;
  normalControlsAllowed: boolean;
  evolutionDashboardMountAllowed: boolean;
  requiresExplicitOriginGate: boolean;
  runtimeBehaviorChanged: false;
  uiWiringChanged: false;
  metadata?: Record<string, unknown>;
}

const TIER_TO_SHELL_MODE: Record<LucaUserTier, LucaTierShellMode> = {
  origin: "origin_creator_shell",
  tactical: "tactical_shell",
  normal: "normal_shell",
  unknown: "unknown_safe_shell",
};

export function getDefaultTierRoutingContext(input?: Partial<LucaTierRoutingContext>): LucaTierRoutingContext {
  return {
    userTier: normalizeLucaUserTier(input?.userTier),
    source: input?.source ?? "default_safe_fallback",
    setupComplete: input?.setupComplete,
    preferredInteractionMode: input?.preferredInteractionMode ?? "unknown",
    modelMode: input?.modelMode ?? "unknown",
    privateMacbookArchitectureExpected: input?.privateMacbookArchitectureExpected ?? true,
    localCapabilitySignals: input?.localCapabilitySignals,
    metadata: {
      ...(input?.metadata ?? {}),
      runtimeBehaviorChanged: false,
      uiWiringChanged: false,
    },
  };
}

export function resolveLucaTierShellMode(context: LucaTierRoutingContext): LucaTierRoutingDecision {
  const safeContext = getDefaultTierRoutingContext(context);
  const shellMode = TIER_TO_SHELL_MODE[safeContext.userTier];
  const requiresExplicitOriginGate = safeContext.userTier === "origin";

  const decision: LucaTierRoutingDecision = {
    shellMode,
    userTier: safeContext.userTier,
    source: safeContext.source,
    reason: `Resolved ${shellMode} from user tier ${safeContext.userTier} via ${safeContext.source}.`,
    originControlsAllowed: safeContext.userTier === "origin",
    tacticalControlsAllowed: safeContext.userTier === "tactical",
    normalControlsAllowed: safeContext.userTier === "normal",
    evolutionDashboardMountAllowed: false,
    requiresExplicitOriginGate,
    runtimeBehaviorChanged: false,
    uiWiringChanged: false,
    metadata: {
      ...(safeContext.metadata ?? {}),
      runtimeBehaviorChanged: false,
      uiWiringChanged: false,
      contractLayerOnly: true,
    },
  };

  decision.evolutionDashboardMountAllowed = canMountOriginEvolutionDashboard(decision);
  return decision;
}

export function canMountOriginEvolutionDashboard(decision: LucaTierRoutingDecision): boolean {
  return (
    decision.shellMode === "origin_creator_shell" &&
    decision.userTier === "origin" &&
    decision.requiresExplicitOriginGate === true
  );
}

export function getTierRoutingSafetySnapshot(input?: Partial<LucaTierRoutingContext>) {
  const context = getDefaultTierRoutingContext(input);
  const decision = resolveLucaTierShellMode(context);

  return {
    context,
    decision,
    runtimeBehaviorChanged: false as const,
    uiWiringChanged: false as const,
  };
}
