import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { LucaInput, LucaSelect } from "../ui/luca";
import { LucaSettings, settingsService } from "../../services/settingsService";
import { modelManager, LocalModel } from "../../services/local-models/LocalModelLibrary";
import {
  SettingsAdvancedDisclosure,
  SettingsRow,
  SettingsSection,
  SettingsToggle,
  settingsControlInlineStyle,
} from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";
import { eventBus } from "../../services/eventBus";
import {
  voiceCloneService,
  ClonedVoice,
} from "../../services/VoiceCloneService";
import {
  deriveVoiceRuntimeProviderPolicy,
  inferVoicePreset,
} from "../../services/voice";

interface SettingsVoiceTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme: any;
  isMobile?: boolean;
}

const SettingsVoiceTab: React.FC<SettingsVoiceTabProps> = ({
  settings,
  onUpdate,
  theme,
  isMobile,
}) => {
  const [localTTSModels, setLocalTTSModels] = useState<LocalModel[]>([]);
  const [localSTTModels, setLocalSTTModels] = useState<LocalModel[]>([]);
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null,
  );

  // Telemetry metrics
  const [metrics, setMetrics] = useState<{
    stt: { local: number; cloud: number; fastest: "local" | "cloud" };
    brain: { ttft: number; path: string };
    tts: { buffer: number; source: "local" | "neural" };
  }>({
    stt: { local: 0, cloud: 0, fastest: "local" },
    brain: { ttft: 0, path: "Awaiting Inference" },
    tts: { buffer: 0, source: "neural" },
  });

  // REAL-TIME TELEMETRY: Listen for actual latency/buffer signals from services
  useEffect(() => {
    const handleTelemetry = (data: any) => {
      setMetrics((prev) => ({
        stt: {
          ...prev.stt,
          ...(data.stt || {}),
        },
        brain: {
          ...prev.brain,
          ...(data.brain || {}),
        },
        tts: {
          ...prev.tts,
          ...(data.tts || {}),
          source: (settings.voice.provider === "local-luca"
            ? "local"
            : "neural") as "local" | "neural",
        },
      }));
    };

    eventBus.on("telemetry-update", handleTelemetry);
    return () => {
      eventBus.off("telemetry-update", handleTelemetry);
    };
  }, [settings.voice.provider]);

  useEffect(() => {
    const loadLocalModels = async () => {
      const models = await modelManager.getModels();
      setLocalTTSModels(
        models.filter((m) => m.category === "tts" && m.status === "ready"),
      );
      setLocalSTTModels(
        models.filter((m) => m.category === "stt" && m.status === "ready"),
      );
    };
    loadLocalModels();
    const unsubscribe = modelManager.subscribe((allModels) => {
      setLocalTTSModels(
        allModels.filter((m) => m.category === "tts" && m.status === "ready"),
      );
      setLocalSTTModels(
        allModels.filter((m) => m.category === "stt" && m.status === "ready"),
      );
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    voiceCloneService
      .init()
      .then(() => voiceCloneService.getVoices().then(setClonedVoices));
  }, []);

  const handleRecordVoice = async () => {
    try {
      setIsRecording(true);
      setRecordingTime(0);
      const timer = setInterval(() => setRecordingTime((v) => v + 0.1), 100);
      const audioBlob = await voiceCloneService.recordVoice(6);
      clearInterval(timer);
      const voiceName = `Clone ${new Date().toLocaleTimeString()}`;
      await voiceCloneService.saveVoice(audioBlob, voiceName);
      voiceCloneService.getVoices().then(setClonedVoices);
      setIsRecording(false);
    } catch (e) {
      console.warn("[Voice] Failed to record voice:", e);
      setIsRecording(false);
    }
  };

  const applyPreset = async (
    type: "performance" | "speedster" | "balanced" | "privacy",
  ) => {
    if (type === "performance") {
      onUpdate("voice", "sttModel", "cloud-gemini");
      onUpdate("voice", "provider", "google");
      onUpdate("voice", "voiceId", "en-US-Journey-F");
    } else if (type === "speedster") {
      const bestLocalStt = await modelManager.getOptimalModel(
        "stt",
        "efficiency",
      );
      if (bestLocalStt) onUpdate("voice", "sttModel", bestLocalStt.id);

      onUpdate("voice", "provider", "openai");
      onUpdate("voice", "voiceId", "alloy");
    } else if (type === "balanced") {
      onUpdate("voice", "sttModel", "cloud-gemini");
      onUpdate("voice", "provider", "local-luca");

      const bestLocalTts = await modelManager.getOptimalModel(
        "tts",
        "accuracy",
      );
      if (bestLocalTts) {
        if (bestLocalTts.id === "kokoro-82m") {
          onUpdate("voice", "voiceId", "kokoro-heart");
        } else {
          onUpdate("voice", "voiceId", bestLocalTts.id);
        }
      }
    } else if (type === "privacy") {
      const bestLocalStt = await modelManager.getOptimalModel(
        "stt",
        "accuracy",
      );
      if (bestLocalStt) onUpdate("voice", "sttModel", bestLocalStt.id);

      onUpdate("voice", "provider", "local-luca");

      const bestLocalTts = await modelManager.getOptimalModel(
        "tts",
        "accuracy",
      );
      if (bestLocalTts) {
        if (bestLocalTts.id === "kokoro-82m") {
          onUpdate("voice", "voiceId", "kokoro-heart");
        } else {
          onUpdate("voice", "voiceId", bestLocalTts.id);
        }
      }
    }
  };

  const runtimePolicy = deriveVoiceRuntimeProviderPolicy({
    preset: inferVoicePreset({
      provider: settings.voice.provider,
      sttModel: settings.voice.sttModel,
    }),
    provider: settings.voice.provider,
    sttModel: settings.voice.sttModel,
  });

  const handleActivateVoice = (voice: ClonedVoice) => {
    onUpdate("voice", "activeClonedVoiceId", voice.id);
    onUpdate("voice", "clonedVoiceName", voice.name);

    // Smart-Link: Voice cloning requires Gemini Native Audio to work.
    // Automatically switch the provider if it's not already Gemini.
    if (settings.voice.provider !== "gemini-genai") {
      onUpdate("voice", "provider", "gemini-genai");
      // Also ensure we are on a model that supports native audio loop
      if (!settings.brain.model.includes("flash")) {
        onUpdate("brain", "model", "gemini-2.0-flash-exp");
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const audioBlob = await voiceCloneService.uploadVoice(file);
      const voiceName = file.name.replace(/\.[^/.]+$/, "");
      await voiceCloneService.saveVoice(audioBlob, voiceName);
      voiceCloneService.getVoices().then(setClonedVoices);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const presets = [
    {
      id: "performance",
      label: "Best quality",
      desc: "Cloud speed, elite quality",
      active: settings.voice.provider === "google",
    },
    {
      id: "speedster",
      label: "Low latency",
      desc: "Local listening, cloud voice",
      active:
        settings.voice.provider === "openai" &&
        settingsService.isModelLocal(settings.voice.sttModel),
    },
    {
      id: "balanced",
      label: "Balanced",
      desc: "Fast listening, local voice",
      active:
        settings.voice.provider === "local-luca" &&
        !settingsService.isModelLocal(settings.voice.sttModel),
    },
    {
      id: "privacy",
      label: "Private / offline",
      desc: "Offline speech routing",
      active:
        settings.voice.provider === "local-luca" &&
        settingsService.isModelLocal(settings.voice.sttModel),
    },
  ] as const;

  const geminiLinked =
    (settings.voice.sttModel?.includes("gemini") ||
      settings.voice.sttModel === "cloud-gemini") &&
    settings.voice.provider === "gemini-genai";

  const engineDescription = geminiLinked
    ? settings.voice.sttModel ===
      "gemini-live-2.5-flash-preview-native-audio-09-2025"
      ? "Direct multimodal voice loop active."
      : "Linked to Luca's native voice persona."
    : "Which service synthesizes Luca's voice.";

  const selectClassName =
    "w-56 max-w-full rounded-lg border px-2.5 py-1.5 text-[13px] outline-none disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className={isMobile ? "space-y-1 px-0" : "space-y-1 pr-2"}>
      <SettingsSection
        title="Voice experience"
        description="Pick how Luca listens and speaks. Presets choose the models for you."
        icon="Sparkles"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className="rounded-lg border p-3 text-left transition-colors"
              style={{
                ...settingsControlInlineStyle,
                borderColor: preset.active
                  ? theme.hex
                  : settingsSurfaceTokens.borderSubtle,
              }}
            >
              <p
                className="text-[13px] font-medium"
                style={{
                  color: preset.active
                    ? theme.hex
                    : settingsSurfaceTokens.textPrimary,
                }}
              >
                {preset.label}
              </p>
              <p
                className="mt-0.5 text-[11.5px] leading-snug"
                style={{ color: settingsSurfaceTokens.textSecondary }}
              >
                {preset.desc}
              </p>
            </button>
          ))}
        </div>
        <SettingsRow
          label="Voice avatar"
          description="The visual Luca shows on the voice screen. Swap anytime."
          control={
            <div
              className="inline-flex gap-1 rounded-lg border p-1"
              style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
            >
              {(
                [
                  { id: "plasma", label: "Plasma orb" },
                  { id: "face", label: "Luca face" },
                ] as const
              ).map((avatar) => {
                const active =
                  (settings.voice.hudAvatar ?? "plasma") === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => onUpdate("voice", "hudAvatar", avatar.id)}
                    className="rounded-md px-2.5 py-1 text-[12.5px] transition-colors"
                    style={{
                      color: active
                        ? theme.hex
                        : settingsSurfaceTokens.textSecondary,
                      fontWeight: active ? 500 : 400,
                    }}
                  >
                    {avatar.label}
                  </button>
                );
              })}
            </div>
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Listening"
        description="Wake word and speech-to-text."
        icon="Mic"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label={'Wake word ("Hey Luca")'}
          description="Listens locally so Luca can respond hands-free."
          control={
            <SettingsToggle
              checked={!!settings.voice.wakeWordEnabled}
              onChange={() => {
                const newValue = !settings.voice.wakeWordEnabled;
                onUpdate("voice", "wakeWordEnabled", newValue);
                // INSTANT SAVE for toggle to prevent race conditions
                const updated = {
                  ...settings,
                  voice: { ...settings.voice, wakeWordEnabled: newValue },
                };
                settingsService.saveSettings(updated);
              }}
              accentColor={theme.hex}
              ariaLabel="Wake word detection"
            />
          }
        />
        <SettingsRow
          label="Speech-to-text model"
          description="Cloud models are fastest; local models keep audio on this device."
          control={
            <LucaSelect
              value={settings.voice.sttModel || "cloud-gemini"}
              onChange={(e) => {
                const val = e.target.value;
                onUpdate("voice", "sttModel", val);
                // Smart Linking: Default to Gemini Native TTS if Gemini STT is selected
                if (val.includes("gemini") || val === "cloud-gemini") {
                  onUpdate("voice", "provider", "gemini-genai");
                }
              }}
              className={selectClassName}
              style={settingsControlInlineStyle}
            >
              <optgroup label="Cloud Providers (STT)">
                <option value="cloud-gemini">
                  Gemini 2.0 Flash (Native Audio)
                </option>
                <option value="gemini-live-2.5-flash-preview-native-audio-09-2025">
                  Multimodal Live 2.5 (Native Audio Loop)
                </option>
                <option value="whisper-1">OpenAI Whisper-1</option>
                <option value="deepgram-nova-2">Deepgram Nova-2</option>
              </optgroup>
              {localSTTModels.length > 0 && (
                <optgroup label="Local Models (Offline STT)">
                  {localSTTModels.map((m) => {
                    const isIntelMac = (window as any).luca?.isIntelMac;
                    const isWindows = (window as any).luca?.isWindows;
                    // whisper-v3-turbo and distil-medium are too heavy for CPU-only real-time use
                    const isRestricted =
                      (isIntelMac || isWindows) &&
                      (m.id === "whisper-v3-turbo" ||
                        m.id === "distil-whisper-medium-en");

                    return (
                      <option key={m.id} value={m.id} disabled={isRestricted}>
                        {m.name} {isRestricted ? "(Restricted on CPU)" : ""}
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </LucaSelect>
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Speaking"
        description="Voice engine, identity, and pacing."
        icon="Volume2"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Voice engine"
          description={engineDescription}
          control={
            <LucaSelect
              value={settings.voice.provider || "gemini-genai"}
              onChange={(e) => onUpdate("voice", "provider", e.target.value)}
              disabled={
                settings.voice.sttModel ===
                "gemini-live-2.5-flash-preview-native-audio-09-2025"
              }
              className={selectClassName}
              style={settingsControlInlineStyle}
            >
              <option value="gemini-genai">Gemini Native Audio</option>
              <option value="google">Google Cloud Audio</option>
              <option value="openai">OpenAI TTS</option>
              <option value="deepgram">Deepgram Aura</option>
              <option value="local-luca">Local Offline</option>
            </LucaSelect>
          }
        />
        <SettingsRow
          label="Voice identity"
          description={
            settings.voice.provider === "gemini-genai"
              ? "Managed by the active persona."
              : "The speaker used by the selected engine."
          }
          control={
            <LucaSelect
              value={settings.voice.voiceId || "native-browser"}
              onChange={(e) => onUpdate("voice", "voiceId", e.target.value)}
              disabled={settings.voice.provider === "gemini-genai"}
              className={selectClassName}
              style={settingsControlInlineStyle}
            >
              {settings.voice.provider === "gemini-genai" ? (
                <option>Managed by Active Persona</option>
              ) : settings.voice.provider === "google" ? (
                <>
                  <optgroup label="Google Cloud Voices">
                    <option value="en-US-Journey-F">
                      Journey - Female (Recommended)
                    </option>
                    <option value="en-US-Journey-D">
                      Journey - Male (Premium)
                    </option>
                    <option value="en-US-Neural2-F">Luca - Female (F)</option>
                    <option value="en-US-Neural2-A">Luca - Female (A)</option>
                  </optgroup>
                </>
              ) : settings.voice.provider === "openai" ? (
                <>
                  <optgroup label="OpenAI (Alloy Series)">
                    <option value="alloy">Alloy (Balanced)</option>
                    <option value="shimmer">Shimmer (Clear)</option>
                    <option value="nova">Nova (Energetic)</option>
                  </optgroup>
                  <optgroup label="OpenAI (Onyx Series)">
                    <option value="echo">Echo (Warm)</option>
                    <option value="onyx">Onyx (Deep)</option>
                    <option value="fable">Fable (Narrative)</option>
                  </optgroup>
                </>
              ) : settings.voice.provider === "deepgram" ? (
                <>
                  <optgroup label="Deepgram Aura (Female)">
                    <option value="aura-asteria-en">Asteria</option>
                    <option value="aura-athena-en">Athena</option>
                    <option value="aura-stella-en">Stella</option>
                  </optgroup>
                  <optgroup label="Deepgram Aura (Male)">
                    <option value="aura-arcas-en">Arcas</option>
                    <option value="aura-orion-en">Orion</option>
                    <option value="aura-zeus-en">Zeus</option>
                  </optgroup>
                </>
              ) : (
                <>
                  <optgroup label="System Standard">
                    <option value="native-browser">Default Luca Voice</option>
                  </optgroup>
                  {localTTSModels.length > 0 && (
                    <optgroup label="Offline Local Models">
                      {localTTSModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </>
              )}
            </LucaSelect>
          }
        />
        <SettingsRow
          label="Pacing"
          description="Vocal tempo."
          control={
            <div
              className="inline-flex gap-1 rounded-lg border p-1"
              style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
            >
              {[
                { id: "Slow", rate: 0.8 },
                { id: "Normal", rate: 1.0 },
                { id: "Fast", rate: 1.25 },
                { id: "Dramatic", rate: 0.9 },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onUpdate("voice", "pacing", p.id as any);
                    onUpdate("voice", "rate", p.rate);
                  }}
                  className="rounded-md px-2.5 py-1 text-[12.5px] transition-colors"
                  style={{
                    color:
                      settings.voice.pacing === p.id
                        ? theme.hex
                        : settingsSurfaceTokens.textSecondary,
                    fontWeight: settings.voice.pacing === p.id ? 500 : 400,
                  }}
                >
                  {p.id}
                </button>
              ))}
            </div>
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Voice cloning"
        description="Record or upload only voices you own or have consent to use. Samples (2–30s) are stored encrypted and need Gemini Native Audio; activating a clone switches the engine automatically."
        icon="Lock"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Add a voice"
          description={`${clonedVoices.length} saved`}
          control={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRecordVoice}
                disabled={isRecording}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium disabled:opacity-60"
                style={settingsControlInlineStyle}
              >
                {isRecording ? (
                  <Icon name="Loader2" className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icon name="Mic" className="h-3.5 w-3.5" />
                )}
                {isRecording
                  ? `Capturing ${recordingTime.toFixed(1)}s`
                  : "Record"}
              </button>
              <label
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium"
                style={settingsControlInlineStyle}
              >
                <Icon name="Upload" className="h-3.5 w-3.5" />
                Upload
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          }
        />
        {clonedVoices.map((v) => {
          const isActive = settings.voice.activeClonedVoiceId === v.id;
          return (
            <SettingsRow
              key={v.id}
              label={v.name}
              description={isActive ? "Active clone" : undefined}
              accentColor={isActive ? theme.hex : undefined}
              control={
                <div className="flex items-center gap-1.5">
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => handleActivateVoice(v)}
                      className="rounded-md px-2 py-1 text-[12.5px] font-medium"
                      style={{ color: theme.hex }}
                    >
                      Use
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={
                      playingVoiceId === v.id ? "Pause sample" : "Play sample"
                    }
                    onClick={() => {
                      if (playingVoiceId === v.id && currentAudio) {
                        currentAudio.pause();
                        setPlayingVoiceId(null);
                        setCurrentAudio(null);
                        return;
                      }

                      // Stop current if any
                      if (currentAudio) {
                        currentAudio.pause();
                      }

                      voiceCloneService.getVoice(v.id).then((voice) => {
                        if (!voice) return;
                        const audio = new Audio(
                          URL.createObjectURL(voice.audioBlob),
                        );
                        audio.onended = () => {
                          setPlayingVoiceId(null);
                          setCurrentAudio(null);
                        };
                        setPlayingVoiceId(v.id);
                        setCurrentAudio(audio);
                        audio.play();
                      });
                    }}
                    className="rounded-md p-1.5"
                    style={{ color: settingsSurfaceTokens.textSecondary }}
                  >
                    {playingVoiceId === v.id ? (
                      <Icon name="Pause" className="h-3.5 w-3.5" />
                    ) : (
                      <Icon name="Play" className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Delete clone"
                    onClick={() =>
                      voiceCloneService
                        .deleteVoice(v.id)
                        .then(() =>
                          voiceCloneService.getVoices().then(setClonedVoices),
                        )
                    }
                    className="rounded-md p-1.5"
                    style={{ color: settingsSurfaceTokens.textSecondary }}
                  >
                    <Icon name="Trash2" className="h-3.5 w-3.5" />
                  </button>
                </div>
              }
            />
          );
        })}
      </SettingsSection>

      <SettingsSection
        title="Advanced"
        description="Realtime backend, routing policy, and live telemetry."
        isMobile={isMobile}
      >
        <SettingsAdvancedDisclosure
          title="Advanced Voice Routing"
          description="Technical routing, fallback, network, and local model policy."
        >
          <SettingsRow
            label="OpenAI Realtime local backend"
            description="Use an explicitly configured local or self-hosted speech-to-speech WebSocket endpoint."
            control={
              <SettingsToggle
                checked={settings.voice.hfRealtimeEnabled === true}
                onChange={() =>
                  onUpdate(
                    "voice",
                    "hfRealtimeEnabled",
                    settings.voice.hfRealtimeEnabled !== true,
                  )
                }
                accentColor={theme.hex}
                ariaLabel="OpenAI Realtime local backend"
              />
            }
          />
          <SettingsRow
            label="Realtime endpoint"
            control={
              <LucaInput
                type="url"
                value={
                  settings.voice.hfRealtimeEndpoint ||
                  "ws://127.0.0.1:8765/v1/realtime"
                }
                onChange={(event) =>
                  onUpdate("voice", "hfRealtimeEndpoint", event.target.value)
                }
                disabled={settings.voice.hfRealtimeEnabled !== true}
                spellCheck={false}
                className="w-64 max-w-full rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none disabled:opacity-50"
                style={settingsControlInlineStyle}
              />
            }
          />
          <p
            className="text-[12.5px] leading-relaxed"
            style={{ color: settingsSurfaceTokens.textSecondary }}
          >
            Provider kind {runtimePolicy.preferredProviderKind} ·{" "}
            {runtimePolicy.latencyMode} · {runtimePolicy.privacyMode} · fallback{" "}
            {runtimePolicy.fallbackAllowed ? "on" : "off"} · network{" "}
            {runtimePolicy.networkAllowed ? "on" : "off"} · local preferred{" "}
            {runtimePolicy.localModelPreferred ? "yes" : "no"}
          </p>
          <div
            className="space-y-1.5 border-t pt-3 text-[12.5px]"
            style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
          >
            <div className="flex items-center justify-between">
              <span style={{ color: settingsSurfaceTokens.textSecondary }}>
                Speech recognition — local
              </span>
              <span className="font-mono" style={{ color: theme.hex }}>
                {metrics.stt.local.toFixed(0)}ms
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: settingsSurfaceTokens.textSecondary }}>
                Speech recognition — cloud
              </span>
              <span
                className="font-mono"
                style={{ color: settingsSurfaceTokens.textPrimary }}
              >
                {metrics.stt.cloud.toFixed(0)}ms
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: settingsSurfaceTokens.textSecondary }}>
                Reasoning first token · via {metrics.brain.path}
              </span>
              <span className="font-mono" style={{ color: theme.hex }}>
                {metrics.brain.ttft.toFixed(0)}ms
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: settingsSurfaceTokens.textSecondary }}>
                Synthesis source
              </span>
              <span
                className="font-mono"
                style={{ color: settingsSurfaceTokens.textPrimary }}
              >
                {metrics.tts.source === "neural" ? "Cloud neural" : "Local voice"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: settingsSurfaceTokens.textSecondary }}>
                Synthesis buffer load
              </span>
              <span
                className="font-mono"
                style={{ color: settingsSurfaceTokens.textPrimary }}
              >
                {metrics.tts.buffer.toFixed(0)}%
              </span>
            </div>
          </div>
        </SettingsAdvancedDisclosure>
      </SettingsSection>
    </div>
  );
};

export default SettingsVoiceTab;
