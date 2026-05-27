import {
  type LucaVoiceProviderKind,
  type LucaVoiceRealProviderFeatureFlags,
  type LucaVoiceProviderReadinessGate,
  type LucaVoiceProviderReadinessResult,
} from "./types";

interface EvaluateVoiceProviderReadinessInput {
  providerKind: LucaVoiceProviderKind;
  capability: "stt" | "tts" | "streaming_stt" | "streaming_tts";
  featureFlags?: LucaVoiceRealProviderFeatureFlags;
  backendAvailable?: boolean;
  credentialsAvailable?: boolean;
  modelAvailable?: boolean;
  networkAllowed?: boolean;
  localModelLoadingAllowed?: boolean;
}

export function createVoiceProviderReadinessGate(
  gate: string,
  passed: boolean,
  reason: string,
): LucaVoiceProviderReadinessGate {
  return { gate, passed, reason };
}

export function evaluateVoiceProviderReadiness(
  input: EvaluateVoiceProviderReadinessInput,
): LucaVoiceProviderReadinessResult {
  const {
    providerKind,
    capability,
    featureFlags = {},
    backendAvailable = true,
    credentialsAvailable = false,
    modelAvailable = false,
    networkAllowed = false,
    localModelLoadingAllowed = false,
  } = input;

  const gates: LucaVoiceProviderReadinessGate[] = [];

  gates.push(
    createVoiceProviderReadinessGate(
      "backend_available",
      backendAvailable,
      backendAvailable ? "scaffold backend is registered" : "scaffold backend missing",
    ),
  );

  const isStreamingCapability = capability === "streaming_stt" || capability === "streaming_tts";
  const isSttCapability = capability === "stt" || capability === "streaming_stt";
  const isTtsCapability = capability === "tts" || capability === "streaming_tts";

  if (providerKind === "local") {
    gates.push(
      createVoiceProviderReadinessGate(
        "real_local_provider_flag",
        featureFlags.enableRealLocalVoiceProvider === true,
        featureFlags.enableRealLocalVoiceProvider === true
          ? "local real provider explicitly enabled"
          : "local real provider flag disabled",
      ),
    );
    const localModelLoadingGate =
      featureFlags.enableLocalModelLoading === true && localModelLoadingAllowed;
    gates.push(
      createVoiceProviderReadinessGate(
        "local_model_loading",
        localModelLoadingGate,
        localModelLoadingGate
          ? "local model loading explicitly enabled"
          : "local model loading not permitted",
      ),
    );
    gates.push(
      createVoiceProviderReadinessGate(
        "local_model_available",
        modelAvailable,
        modelAvailable ? "local model available" : "local model unavailable",
      ),
    );
  }

  if (providerKind === "cloud") {
    gates.push(
      createVoiceProviderReadinessGate(
        "real_cloud_provider_flag",
        featureFlags.enableRealLucaPrimeVoiceProvider === true,
        featureFlags.enableRealLucaPrimeVoiceProvider === true
          ? "Luca Prime cloud provider explicitly enabled"
          : "Luca Prime cloud provider flag disabled",
      ),
    );
    const networkGate = featureFlags.enableNetworkProviderCalls === true && networkAllowed;
    gates.push(
      createVoiceProviderReadinessGate(
        "network_provider_calls",
        networkGate,
        networkGate ? "network provider calls explicitly enabled" : "network provider calls disabled",
      ),
    );
  }

  if (providerKind === "byok") {
    gates.push(
      createVoiceProviderReadinessGate(
        "real_byok_provider_flag",
        featureFlags.enableRealByokVoiceProvider === true,
        featureFlags.enableRealByokVoiceProvider === true
          ? "BYOK provider explicitly enabled"
          : "BYOK provider flag disabled",
      ),
    );
    const networkGate = featureFlags.enableNetworkProviderCalls === true && networkAllowed;
    gates.push(
      createVoiceProviderReadinessGate(
        "network_provider_calls",
        networkGate,
        networkGate ? "network provider calls explicitly enabled" : "network provider calls disabled",
      ),
    );
    gates.push(
      createVoiceProviderReadinessGate(
        "credentials_available",
        credentialsAvailable,
        credentialsAvailable ? "BYOK credentials available" : "BYOK credentials unavailable",
      ),
    );
  }

  if (isSttCapability) {
    gates.push(
      createVoiceProviderReadinessGate(
        "real_stt_flag",
        featureFlags.enableRealStt === true,
        featureFlags.enableRealStt === true ? "real STT explicitly enabled" : "real STT flag disabled",
      ),
    );
  }

  if (isTtsCapability) {
    gates.push(
      createVoiceProviderReadinessGate(
        "real_tts_flag",
        featureFlags.enableRealTts === true,
        featureFlags.enableRealTts === true ? "real TTS explicitly enabled" : "real TTS flag disabled",
      ),
    );
  }

  if (isStreamingCapability) {
    gates.push(
      createVoiceProviderReadinessGate(
        "real_streaming_flag",
        featureFlags.enableRealStreaming === true,
        featureFlags.enableRealStreaming === true
          ? "real streaming explicitly enabled"
          : "real streaming flag disabled",
      ),
    );
  }

  const status = !backendAvailable
    ? "blocked"
    : gates.every((gate) => gate.passed)
      ? "ready"
      : "scaffold_only";

  return {
    status,
    providerKind,
    capability,
    gates,
    metadata: {
      readinessKind: "voice_provider_readiness_scaffold",
      audioApisCalled: false,
      microphoneApisCalled: false,
      sttApisCalled: false,
      ttsApisCalled: false,
      providerApisCalled: false,
      networkApisCalled: false,
      heavyModelsLoaded: false,
      systemApisCalled: false,
      requiresExplicitOptIn: true,
    },
  };
}
