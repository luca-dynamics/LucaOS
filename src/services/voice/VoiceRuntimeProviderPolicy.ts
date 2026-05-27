import { LucaVoiceProviderCapability, LucaVoiceProviderPreference, LucaVoiceRealProviderFeatureFlags } from "./types";

export type VoicePreset = "performance" | "speedster" | "balanced" | "privacy";
export type VoiceLatencyMode = "lowest" | "balanced" | "quality" | "privacy";
export type VoicePrivacyMode = "local_first" | "cloud_allowed" | "byok_allowed";

export interface VoiceRuntimeProviderPolicyInput {
  preset?: VoicePreset;
  provider?: string;
  sttModel?: string;
  allowCloudFallback?: boolean;
  allowByok?: boolean;
  cloudEnabled?: boolean;
  byokEnabled?: boolean;
  localStreamingAvailable?: boolean;
}

export interface VoiceRuntimeProviderPolicy {
  preset: VoicePreset;
  preferredProviderKind: LucaVoiceProviderPreference;
  sttPreference: LucaVoiceProviderPreference;
  ttsPreference: LucaVoiceProviderPreference;
  streamingPreference: LucaVoiceProviderPreference;
  latencyMode: VoiceLatencyMode;
  privacyMode: VoicePrivacyMode;
  fallbackAllowed: boolean;
  networkAllowed: boolean;
  localModelPreferred: boolean;
  enableStreaming: boolean;
  readinessHints: { preferredProviderKind: LucaVoiceProviderPreference; preferredCapabilities: LucaVoiceProviderCapability[]; networkAllowed: boolean; localModelPreferred: boolean };
  diagnosticsLabel: string;
  metadata: Record<string, unknown>;
}

export const inferVoicePreset = (input: Pick<VoiceRuntimeProviderPolicyInput, "provider" | "sttModel" | "preset">): VoicePreset => {
  if (input.preset) return input.preset;
  const provider = input.provider || "";
  const stt = input.sttModel || "";
  const localStt = stt.length > 0 && stt !== "cloud-gemini";
  if (provider === "google") return "performance";
  if (provider === "openai" && localStt) return "speedster";
  if (provider === "local-luca" && !localStt) return "balanced";
  return "privacy";
};

export function deriveVoiceRuntimeProviderPolicy(input: VoiceRuntimeProviderPolicyInput): VoiceRuntimeProviderPolicy {
  const preset = inferVoicePreset(input);
  const allowByok = Boolean(input.allowByok ?? input.byokEnabled);
  const allowCloud = Boolean(input.cloudEnabled ?? true);
  if (preset === "performance") {
    return basePolicy(preset, { preferredProviderKind: "cloud", latencyMode: "quality", privacyMode: "cloud_allowed", fallbackAllowed: true, networkAllowed: true, localModelPreferred: false, enableStreaming: true });
  }
  if (preset === "speedster") {
    return basePolicy(preset, { preferredProviderKind: "auto", latencyMode: "lowest", privacyMode: allowByok ? "byok_allowed" : "cloud_allowed", fallbackAllowed: true, networkAllowed: true, localModelPreferred: false, enableStreaming: true });
  }
  if (preset === "balanced") {
    return basePolicy(preset, { preferredProviderKind: "auto", latencyMode: "balanced", privacyMode: allowByok ? "byok_allowed" : "cloud_allowed", fallbackAllowed: true, networkAllowed: true, localModelPreferred: false, enableStreaming: true });
  }

  const networkAllowed = Boolean(input.allowCloudFallback ?? allowCloud || allowByok);
  return basePolicy(preset, {
    preferredProviderKind: "local",
    latencyMode: "privacy",
    privacyMode: "local_first",
    fallbackAllowed: Boolean(input.allowCloudFallback),
    networkAllowed,
    localModelPreferred: true,
    enableStreaming: Boolean(input.localStreamingAvailable),
  });
}

function basePolicy(preset: VoicePreset, options: { preferredProviderKind: LucaVoiceProviderPreference; latencyMode: VoiceLatencyMode; privacyMode: VoicePrivacyMode; fallbackAllowed: boolean; networkAllowed: boolean; localModelPreferred: boolean; enableStreaming: boolean }): VoiceRuntimeProviderPolicy {
  const sttPreference = options.preferredProviderKind;
  const ttsPreference = options.preferredProviderKind;
  const streamingPreference = options.preferredProviderKind;
  return {
    preset,
    preferredProviderKind: options.preferredProviderKind,
    sttPreference,
    ttsPreference,
    streamingPreference,
    latencyMode: options.latencyMode,
    privacyMode: options.privacyMode,
    fallbackAllowed: options.fallbackAllowed,
    networkAllowed: options.networkAllowed,
    localModelPreferred: options.localModelPreferred,
    enableStreaming: options.enableStreaming,
    readinessHints: {
      preferredProviderKind: options.preferredProviderKind,
      preferredCapabilities: ["stt", "tts", options.enableStreaming ? "streaming_stt" : "low_latency"],
      networkAllowed: options.networkAllowed,
      localModelPreferred: options.localModelPreferred,
    },
    diagnosticsLabel: `${preset}:${options.preferredProviderKind}:${options.latencyMode}`,
    metadata: {
      advisoryOnly: true,
      providerCallsMade: false,
      networkCallsMade: false,
      microphoneApisCalled: false,
      audioOutputApisCalled: false,
    },
  };
}

export function getVoiceRuntimeProviderPolicySnapshot(input: VoiceRuntimeProviderPolicyInput) {
  const policy = deriveVoiceRuntimeProviderPolicy(input);
  return {
    ...policy,
    routeRequestPreference: policyToRoutePreference(policy),
    realProviderFeatureFlags: policyToFeatureFlags(policy),
  };
}

export function policyToRoutePreference(policy: VoiceRuntimeProviderPolicy): LucaVoiceProviderPreference {
  return policy.preferredProviderKind;
}

export function policyToFeatureFlags(policy: VoiceRuntimeProviderPolicy): LucaVoiceRealProviderFeatureFlags {
  return {
    enableRealStreaming: policy.enableStreaming,
    enableNetworkProviderCalls: policy.networkAllowed,
    enableLocalModelLoading: policy.localModelPreferred,
  };
}
