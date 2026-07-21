import { VoiceSessionRoute } from "../voiceSessionRouter";
import { VoiceRuntimeProviderPolicy, policyToRoutePreference } from "./VoiceRuntimeProviderPolicy";
import { LucaVoiceProviderPreference, LucaVoiceProviderReadinessResult } from "./types";

export type VoiceRouteShadowSeverity = "none" | "info" | "warning" | "error";
export type VoiceRouteShadowRecommendation = "keep_existing" | "observe" | "candidate_for_runtime_router" | "needs_review";

/** Optional advisory router snapshot (scaffold VoiceProviderRouter was removed). */
export interface VoiceRouteShadowRouterSnapshot {
  strategy?: string;
  totalRoutes?: number;
}

export interface VoiceRouteShadowInput {
  existingRoute: Pick<VoiceSessionRoute, "kind" | "provisioning"> & Partial<VoiceSessionRoute> & {
    routeKind?: VoiceSessionRoute["kind"];
    provider?: string;
    model?: string;
    metadata?: Record<string, unknown>;
  };
  providerPolicy: VoiceRuntimeProviderPolicy;
  providerRouter?: {
    snapshot?: VoiceRouteShadowRouterSnapshot;
    suggestion?: { providerKind?: LucaVoiceProviderPreference; capability?: string; metadata?: Record<string, unknown> };
  } | null;
  readiness?: LucaVoiceProviderReadinessResult | null;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface VoiceRouteShadowEvaluation {
  existingRoute: VoiceRouteShadowInput["existingRoute"];
  shadowRoute: {
    routeKind: VoiceSessionRoute["kind"];
    providerPreference: LucaVoiceProviderPreference;
    provisioning: VoiceSessionRoute["provisioning"] | "AUTO";
    readinessStatus?: LucaVoiceProviderReadinessResult["status"];
    metadata: Record<string, unknown>;
  };
  matched: boolean;
  mismatchReasons: string[];
  severity: VoiceRouteShadowSeverity;
  recommendation: VoiceRouteShadowRecommendation;
  providerPolicyAppliedToRouting: false;
  shadowOnly: true;
  metadata: Record<string, unknown>;
}

const toRouteKind = (preference: LucaVoiceProviderPreference): VoiceSessionRoute["kind"] => {
  if (preference === "local") return "LOCAL_PIPELINE";
  if (preference === "cloud") return "CLOUD_BIDI";
  return "HYBRID_PIPELINE";
};

const toProvisioning = (preference: LucaVoiceProviderPreference): VoiceRouteShadowEvaluation["shadowRoute"]["provisioning"] => {
  if (preference === "local") return "LOCAL";
  if (preference === "cloud") return "LUCA_PRIME";
  return "AUTO";
};

export function evaluateVoiceRouteShadow(input: VoiceRouteShadowInput): VoiceRouteShadowEvaluation {
  const preferred = policyToRoutePreference(input.providerPolicy);
  const suggested = input.providerRouter?.suggestion?.providerKind ?? preferred;
  const routeKind = toRouteKind(suggested);

  const mismatchReasons: string[] = [];
  const existingKind = input.existingRoute.routeKind ?? input.existingRoute.kind;

  if (existingKind !== routeKind) mismatchReasons.push(`route_kind_mismatch:${existingKind}->${routeKind}`);

  if (input.providerPolicy.privacyMode === "local_first" && input.providerPolicy.networkAllowed === false && existingKind === "CLOUD_BIDI") {
    mismatchReasons.push("privacy_policy_disallows_network_but_existing_is_cloud");
  }

  if (input.providerPolicy.preset === "speedster" && existingKind === "LOCAL_PIPELINE") {
    mismatchReasons.push("speedster_prefers_low_latency_non_local_route");
  }

  if (input.readiness?.status === "blocked") mismatchReasons.push("shadow_route_blocked_by_readiness");

  const matched = mismatchReasons.length === 0;

  let severity: VoiceRouteShadowSeverity = "none";
  if (!matched) severity = "info";
  if (mismatchReasons.some((r) => r.includes("privacy_policy_disallows_network") || r.includes("blocked"))) {
    severity = input.readiness?.status === "blocked" ? "error" : "warning";
  }

  let recommendation: VoiceRouteShadowRecommendation = matched ? "keep_existing" : "observe";
  if (input.providerPolicy.preset === "performance" && (routeKind === "CLOUD_BIDI" || suggested === "auto")) {
    recommendation = matched ? "observe" : "candidate_for_runtime_router";
  }
  if (severity === "warning" || severity === "error") recommendation = "needs_review";

  return {
    existingRoute: input.existingRoute,
    shadowRoute: {
      routeKind,
      providerPreference: suggested,
      provisioning: toProvisioning(suggested),
      readinessStatus: input.readiness?.status,
      metadata: {
        policyPreset: input.providerPolicy.preset,
        routerStrategy: input.providerRouter?.snapshot?.strategy,
        routerTotalRoutes: input.providerRouter?.snapshot?.totalRoutes,
      },
    },
    matched,
    mismatchReasons,
    severity,
    recommendation,
    providerPolicyAppliedToRouting: false,
    shadowOnly: true,
    metadata: {
      advisoryOnly: true,
      providerCallsMade: false,
      networkCallsMade: false,
      microphoneApisCalled: false,
      audioOutputApisCalled: false,
      ...(input.metadata ?? {}),
    },
  };
}

export function getVoiceRouteShadowSnapshot(input: VoiceRouteShadowInput) {
  const evaluation = evaluateVoiceRouteShadow(input);
  return {
    ...evaluation,
    metadata: {
      ...evaluation.metadata,
      snapshotKind: "voice_route_shadow_evaluation",
    },
  };
}
