import { BRAIN_CONFIG } from "../config/brain.config";
import { settingsService, LucaSettings } from "./settingsService";
import {
  LOCAL_STT_MODEL_IDS,
  LOCAL_TTS_MODEL_IDS,
} from "./ModelManagerService";

export interface VoiceSessionRouteBase {
  brainProvider?: "GEMINI" | "OPENAI" | "GROQ";
}

export type VoiceSessionRoute =
  | ({
      kind: "CLOUD_BIDI";
      provisioning: "LUCA_PRIME" | "BYOK";
      model: string;
      requestedModel: string;
      fallbackApplied: boolean;
      reason?: string;
    } & VoiceSessionRouteBase)
  | ({
      kind: "LOCAL_PIPELINE";
      provisioning: "LOCAL";
      sttModel: string;
      ttsProvider: string;
      reason?: string;
    } & VoiceSessionRouteBase)
  | ({
      kind: "HYBRID_PIPELINE";
      provisioning: "LUCA_PRIME" | "BYOK" | "LOCAL";
      sttModel: string;
      ttsProvider: string;
      reason?: string;
    } & VoiceSessionRouteBase);

const buildCloudBidiRoute = (
  settings: LucaSettings,
  cloudProvisioning: "LUCA_PRIME" | "BYOK",
): VoiceSessionRoute => {
  const requestedModel =
    settings.brain?.voiceModel ||
    settings.brain?.model ||
    BRAIN_CONFIG.defaults.voice;
  const compatibleModel = isBidiCompatibleGeminiModel(requestedModel)
    ? requestedModel
    : BRAIN_CONFIG.defaults.voice;

  return {
    kind: "CLOUD_BIDI",
    provisioning: cloudProvisioning,
    model: compatibleModel,
    requestedModel,
    fallbackApplied: compatibleModel !== requestedModel,
    reason:
      compatibleModel !== requestedModel
        ? `Requested voice model "${requestedModel}" is not bidi-compatible; using "${compatibleModel}".`
        : undefined,
  };
};

const buildLocalPipelineRoute = (
  settings: LucaSettings,
  reason?: string,
): VoiceSessionRoute => ({
  kind: "LOCAL_PIPELINE",
  provisioning: "LOCAL",
  sttModel: settings.voice?.sttModel || "cloud-gemini",
  ttsProvider: settings.voice?.provider || "local-luca",
  reason,
});

const buildHybridPipelineRoute = (
  settings: LucaSettings,
  provisioning: "LUCA_PRIME" | "BYOK" | "LOCAL",
  reason?: string,
): VoiceSessionRoute => ({
  kind: "HYBRID_PIPELINE",
  provisioning,
  sttModel: settings.voice?.sttModel || "cloud-gemini",
  ttsProvider: settings.voice?.provider || "local-luca",
  reason,
});

const isBidiCompatibleGeminiModel = (model: string): boolean => {
  if (!model) return false;
  const lower = model.toLowerCase();
  if (!lower.includes("gemini")) return false;
  if (lower.includes("piper")) return false;
  if (lower.includes("kokoro")) return false;
  if (lower.includes("local")) return false;
  if (lower.includes("gemini-1.5")) return false;
  if (lower.includes("gemini-2.0-flash")) return false;
  if (lower.includes("gemini-3")) return false;
  return true;
};

const getVoiceCloudProvisioning = (
  settings: LucaSettings,
): "LUCA_PRIME" | "BYOK" | null => {
  if (settings.brain.useCustomApiKey) {
    return settingsService.hasValidCloudKeys("gemini") ? "BYOK" : null;
  }
  return "LUCA_PRIME";
};

export const resolveVoiceSessionRoute = (
  settings: LucaSettings = settingsService.getSettings(),
  brainProvider?: "GEMINI" | "OPENAI" | "GROQ",
): VoiceSessionRoute => {
  const sttModel = settings.voice?.sttModel || "cloud-gemini";
  const ttsProvider = settings.voice?.provider || "local-luca";
  const sttLower = sttModel.toLowerCase();

  const wantsCloudBidi =
    ttsProvider === "gemini-genai" &&
    (sttModel === "cloud-gemini" ||
      sttLower.includes("gemini") ||
      sttLower.includes("live") ||
      sttLower.includes("native-audio"));

  const explicitLocalStt =
    LOCAL_STT_MODEL_IDS.includes(sttModel) || settingsService.isModelLocal(sttModel);
  const explicitLocalTts =
    ttsProvider === "local-luca" ||
    LOCAL_TTS_MODEL_IDS.includes(settings.voice?.voiceId || "");
  const cloudProvisioning = getVoiceCloudProvisioning(settings);

  let route: VoiceSessionRoute;

  if (wantsCloudBidi && cloudProvisioning) {
    route = buildCloudBidiRoute(settings, cloudProvisioning);
  } else if (explicitLocalStt && explicitLocalTts) {
    route = buildLocalPipelineRoute(
      settings,
      wantsCloudBidi
        ? "Cloud bidi requested but unavailable; using fully local voice pipeline."
        : "Local STT and TTS selected.",
    );
  } else {
    route = buildHybridPipelineRoute(
      settings,
      cloudProvisioning ||
        (explicitLocalStt || explicitLocalTts ? "LOCAL" : "LUCA_PRIME"),
      wantsCloudBidi
        ? "Cloud bidi requested but unavailable; using hybrid voice pipeline."
        : "Mixed local/cloud voice components selected.",
    );
  }

  if (brainProvider) {
    route.brainProvider = brainProvider;
  }
  return route;
};

export const resolveVoiceSessionRouteOverride = (
  routeKind: VoiceSessionRoute["kind"],
  settings: LucaSettings = settingsService.getSettings(),
  brainProvider?: "GEMINI" | "OPENAI" | "GROQ",
): VoiceSessionRoute => {
  const cloudProvisioning = getVoiceCloudProvisioning(settings);
  let route: VoiceSessionRoute;

  if (routeKind === "CLOUD_BIDI") {
    if (!cloudProvisioning) {
      route = buildHybridPipelineRoute(
        settings,
        "LOCAL",
        "Cloud bidi was recommended, but no compatible cloud provisioning is available. Using hybrid voice instead.",
      );
    } else {
      route = buildCloudBidiRoute(settings, cloudProvisioning);
      route.reason = route.reason
        ? `${route.reason} Adaptive routing selected cloud voice for the next session.`
        : "Adaptive routing selected cloud voice for the next session.";
    }
  } else if (routeKind === "LOCAL_PIPELINE") {
    route = buildLocalPipelineRoute(
      settings,
      "Adaptive routing selected the fully local voice pipeline for the next session.",
    );
  } else {
    route = buildHybridPipelineRoute(
      settings,
      cloudProvisioning ||
        (settingsService.isModelLocal(settings.voice?.sttModel || "")
          ? "LOCAL"
          : "LUCA_PRIME"),
      "Adaptive routing selected the hybrid voice pipeline for the next session.",
    );
  }

  if (brainProvider) {
    route.brainProvider = brainProvider;
  }
  return route;
};
