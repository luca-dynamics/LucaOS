import { VoiceSessionRoute } from "../voiceSessionRouter";
import { VoiceRouteShadowEvaluation } from "./VoiceRouteShadowEvaluator";
import { VoiceRuntimeProviderPolicy } from "./VoiceRuntimeProviderPolicy";
import { LucaVoiceProviderReadinessResult } from "./types";

export type VoiceRouteAuthorityMode = "existing_resolver" | "runtime_router" | "shadow_only";

export interface VoiceRouteAuthorityFeatureFlags {
  enableRuntimeRouteAuthority?: boolean;
  enableRuntimeRouteAuthorityForPrivacyPreset?: boolean;
  enableRuntimeRouteAuthorityForSpeedsterPreset?: boolean;
  enableRuntimeRouteAuthorityForPerformancePreset?: boolean;
  enableRuntimeRouteAuthorityForBalancedPreset?: boolean;
  requireShadowMatchBeforePromotion?: boolean;
  requireReadinessReadyBeforePromotion?: boolean;
}

export interface VoiceRouteAuthorityInput {
  mode?: VoiceRouteAuthorityMode;
  existingRoute: VoiceSessionRoute;
  runtimeRoute?: VoiceSessionRoute | null;
  shadowEvaluation?: VoiceRouteShadowEvaluation | null;
  providerPolicy?: VoiceRuntimeProviderPolicy | null;
  readinessSummary?: LucaVoiceProviderReadinessResult | null;
  featureFlags?: VoiceRouteAuthorityFeatureFlags;
}

export interface VoiceRouteAuthorityDecision {
  activeAuthority: "existing_resolver" | "runtime_router";
  selectedRoute: VoiceSessionRoute;
  existingRoute: VoiceSessionRoute;
  runtimeRoute?: VoiceSessionRoute;
  shadowEvaluation?: VoiceRouteShadowEvaluation | null;
  canPromoteRuntimeRoute: boolean;
  promotionBlockedReasons: string[];
  authorityChanged: boolean;
  defaultSafeMode: boolean;
  metadata: Record<string, unknown>;
}

function isPresetAllowed(input: VoiceRouteAuthorityInput): boolean {
  const preset = input.providerPolicy?.preset;
  if (!preset) return true;
  if (preset === "privacy") return Boolean(input.featureFlags?.enableRuntimeRouteAuthorityForPrivacyPreset);
  if (preset === "speedster") return Boolean(input.featureFlags?.enableRuntimeRouteAuthorityForSpeedsterPreset);
  if (preset === "performance") return Boolean(input.featureFlags?.enableRuntimeRouteAuthorityForPerformancePreset);
  if (preset === "balanced") return Boolean(input.featureFlags?.enableRuntimeRouteAuthorityForBalancedPreset);
  return false;
}

export function evaluateVoiceRouteAuthority(input: VoiceRouteAuthorityInput): VoiceRouteAuthorityDecision {
  const mode = input.mode ?? "existing_resolver";
  const blockedReasons: string[] = [];
  const runtimeAuthorityRequested = mode === "runtime_router";
  const runtimeRoute = input.runtimeRoute ?? undefined;
  const readinessRequired = Boolean(input.featureFlags?.requireReadinessReadyBeforePromotion);
  const shadowMatchRequired = Boolean(input.featureFlags?.requireShadowMatchBeforePromotion);

  if (!runtimeAuthorityRequested) blockedReasons.push("mode_not_runtime_router");
  if (!input.featureFlags?.enableRuntimeRouteAuthority) blockedReasons.push("runtime_authority_flag_disabled");
  if (!runtimeRoute) blockedReasons.push("runtime_route_missing");
  if (!isPresetAllowed(input)) blockedReasons.push("preset_not_enabled_for_runtime_authority");

  if (readinessRequired && input.readinessSummary?.status !== "ready") blockedReasons.push("readiness_not_ready");
  if (shadowMatchRequired && input.shadowEvaluation?.matched === false) blockedReasons.push("shadow_mismatch");

  const canPromoteRuntimeRoute = blockedReasons.length === 0;
  const activeAuthority: VoiceRouteAuthorityDecision["activeAuthority"] = canPromoteRuntimeRoute ? "runtime_router" : "existing_resolver";

  return {
    activeAuthority,
    selectedRoute: canPromoteRuntimeRoute ? runtimeRoute! : input.existingRoute,
    existingRoute: input.existingRoute,
    runtimeRoute,
    shadowEvaluation: input.shadowEvaluation,
    canPromoteRuntimeRoute,
    promotionBlockedReasons: blockedReasons,
    authorityChanged: false,
    defaultSafeMode: mode === "existing_resolver",
    metadata: {
      mode,
      advisoryOnly: true,
      providerCallsMade: false,
      networkCallsMade: false,
      microphoneApisCalled: false,
      audioOutputApisCalled: false,
      readinessRequired,
      shadowMatchRequired,
    },
  };
}

export function getVoiceRouteAuthoritySnapshot(input: VoiceRouteAuthorityInput) {
  const decision = evaluateVoiceRouteAuthority(input);
  return {
    ...decision,
    metadata: {
      ...decision.metadata,
      snapshotKind: "voice_route_authority_gate",
    },
  };
}
