import { settingsService, type LucaSettings } from "./settingsService";
import type { VoiceSessionRoute } from "./voiceSessionRouter";

export type VoiceRoutingHealth =
  | "UNKNOWN"
  | "HEALTHY"
  | "DEGRADED"
  | "SLOW";

export type VoiceRouteConfidence = "LOW" | "MEDIUM" | "HIGH";

export interface VoiceRouteRecommendation {
  routingHealth: VoiceRoutingHealth;
  recommendedRouteKind: VoiceSessionRoute["kind"];
  shouldSwitch: boolean;
  confidence: VoiceRouteConfidence;
  avgLatencyMs: number | null;
  sampleCount: number;
  reason: string;
  recommendationMode: "HOLD" | "RECOMMEND_SWITCH";
  preferredBrainProvider?: "GEMINI" | "OPENAI" | "GROQ";
}

export interface VoiceRoutingPolicyContext {
  currentRoute: VoiceSessionRoute | null;
  latencyHistoryMs: number[];
  localCoreConnected: boolean;
  settings: LucaSettings;
  persona?: string;
}

const PERSONA_BRAIN_MAP: Record<string, "GEMINI" | "OPENAI" | "GROQ"> = {
  ASSISTANT: "GEMINI",
  RUTHLESS: "GROQ",
  ENGINEER: "OPENAI",
  HACKER: "GROQ",
};

const getPreferredBrain = (persona?: string): "GEMINI" | "OPENAI" | "GROQ" | undefined => {
  if (!persona) return undefined;
  const mapped = PERSONA_BRAIN_MAP[persona.toUpperCase()];
  if (!mapped) return undefined;

  // Check if the user actually has the key for this provider
  const hasKey = settingsService.hasValidCloudKeys(mapped.toLowerCase() as any);
  if (!hasKey && mapped !== "GEMINI") {
    // If key is missing and it's not Gemini (which usually has a fallback), don't recommend it
    return undefined;
  }

  return mapped;
};

const MIN_SAMPLES_TO_DEGRADE = 3;
const MIN_SAMPLES_TO_RECOVER = 4;

const getLatencyAverage = (samples: number[]): number | null => {
  const validSamples = samples.filter(
    (sample) => Number.isFinite(sample) && sample > 0,
  );

  if (validSamples.length === 0) return null;

  return (
    validSamples.reduce((sum, sample) => sum + sample, 0) / validSamples.length
  );
};

export const classifyVoiceRoutingHealth = (
  latencyHistoryMs: number[],
): VoiceRoutingHealth => {
  const avgLatencyMs = getLatencyAverage(latencyHistoryMs);
  if (avgLatencyMs == null) return "UNKNOWN";
  if (avgLatencyMs <= 600) return "HEALTHY";
  if (avgLatencyMs <= 1500) return "DEGRADED";
  return "SLOW";
};

export const recommendVoiceRoute = ({
  currentRoute,
  latencyHistoryMs,
  localCoreConnected,
  settings,
  persona,
}: VoiceRoutingPolicyContext): VoiceRouteRecommendation => {
  const currentKind = currentRoute?.kind ?? "HYBRID_PIPELINE";
  const avgLatencyMs = getLatencyAverage(latencyHistoryMs);
  const routingHealth = classifyVoiceRoutingHealth(latencyHistoryMs);
  const sampleCount = latencyHistoryMs.length;
  const prefersLocalVoice = settings.voice.provider === "local-luca";
  const prefersCloudBidi = settings.voice.provider === "gemini-genai";
  const preferredBrainProvider = getPreferredBrain(persona);

  if (routingHealth === "UNKNOWN" || avgLatencyMs == null) {
    return {
      routingHealth,
      recommendedRouteKind: currentKind,
      shouldSwitch: false,
      confidence: "LOW",
      avgLatencyMs: null,
      sampleCount,
      reason: "Waiting for more voice latency samples before advising a route.",
      recommendationMode: "HOLD",
      preferredBrainProvider,
    };
  }

  if (sampleCount < MIN_SAMPLES_TO_DEGRADE) {
    return {
      routingHealth,
      recommendedRouteKind: currentKind,
      shouldSwitch: false,
      confidence: "LOW",
      avgLatencyMs,
      sampleCount,
      reason:
        "Collecting more voice latency samples before changing routes to avoid reacting to short spikes.",
      recommendationMode: "HOLD",
      preferredBrainProvider,
    };
  }

  if (!localCoreConnected) {
    return {
      routingHealth,
      recommendedRouteKind: currentKind,
      shouldSwitch: false,
      confidence: routingHealth === "SLOW" ? "MEDIUM" : "LOW",
      avgLatencyMs,
      sampleCount,
      reason:
        "Local core is offline, so Luca should stay on the current voice route for now.",
      recommendationMode: "HOLD",
      preferredBrainProvider,
    };
  }

  if (prefersLocalVoice) {
    return {
      routingHealth,
      recommendedRouteKind: "LOCAL_PIPELINE",
      shouldSwitch: currentKind !== "LOCAL_PIPELINE",
      confidence: "HIGH",
      avgLatencyMs,
      sampleCount,
      reason:
        "Local voice is the user's active preference, so Luca should favor the fully local pipeline whenever the local core is available.",
      recommendationMode: currentKind !== "LOCAL_PIPELINE" ? "RECOMMEND_SWITCH" : "HOLD",
      preferredBrainProvider,
    };
  }

  if (currentKind === "CLOUD_BIDI") {
    if (routingHealth === "SLOW") {
      return {
        routingHealth,
        recommendedRouteKind: "LOCAL_PIPELINE",
        shouldSwitch: true,
        confidence: "HIGH",
        avgLatencyMs,
        sampleCount,
        reason:
          "Cloud voice responsiveness is trending slow. A local voice pipeline would likely feel more responsive on the next turn.",
        recommendationMode: "RECOMMEND_SWITCH",
        preferredBrainProvider,
      };
    }

    if (routingHealth === "DEGRADED") {
      return {
        routingHealth,
        recommendedRouteKind: "HYBRID_PIPELINE",
        shouldSwitch: true,
        confidence: "MEDIUM",
        avgLatencyMs,
        sampleCount,
        reason:
          "Cloud voice is slowing down. A hybrid route is recommended next to preserve responsiveness while keeping cloud quality where possible.",
        recommendationMode: "RECOMMEND_SWITCH",
        preferredBrainProvider,
      };
    }
  }

  if (
    currentKind === "LOCAL_PIPELINE" ||
    currentKind === "HYBRID_PIPELINE"
  ) {
    if (
      prefersCloudBidi &&
      routingHealth === "HEALTHY" &&
      sampleCount >= MIN_SAMPLES_TO_RECOVER &&
      avgLatencyMs <= 500
    ) {
      return {
        routingHealth,
        recommendedRouteKind: "CLOUD_BIDI",
        shouldSwitch: true,
        confidence: "MEDIUM",
        avgLatencyMs,
        sampleCount,
        reason:
          "Cloud bidi is the preferred voice mode and latency has recovered consistently enough to return without flapping.",
        recommendationMode: "RECOMMEND_SWITCH",
        preferredBrainProvider,
      };
    }

    return {
      routingHealth,
      recommendedRouteKind: currentKind,
      shouldSwitch: false,
      confidence: routingHealth === "HEALTHY" ? "MEDIUM" : "LOW",
      avgLatencyMs,
      sampleCount,
      reason:
        "The current voice route is already using local-capable components, so no advisory switch is needed right now.",
      recommendationMode: "HOLD",
      preferredBrainProvider,
    };
  }

  return {
    routingHealth,
    recommendedRouteKind: currentKind,
    shouldSwitch: false,
    confidence: "LOW",
    avgLatencyMs,
    sampleCount,
    reason: "No alternate voice route is recommended right now.",
    recommendationMode: "HOLD",
    preferredBrainProvider,
  };
};
