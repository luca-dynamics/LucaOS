import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Icon } from "../ui/Icon";
import { LucaSettings, settingsService } from "../../services/settingsService";
import { modelManager, LocalModel } from "../../services/ModelManagerService";
import { eventBus } from "../../services/eventBus";
import {
  voiceCloneService,
  ClonedVoice,
} from "../../services/VoiceCloneService";

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
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
 
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
          source: (settings.voice.provider === "local-luca" ? "local" : "neural") as "local" | "neural",
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

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

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

  const applyPreset = async (type: "performance" | "speedster" | "balanced" | "privacy") => {
    if (type === "performance") {
      onUpdate("voice", "sttModel", "cloud-gemini");
      onUpdate("voice", "provider", "google");
      onUpdate("voice", "voiceId", "en-US-Journey-F");
    } else if (type === "speedster") {
      const bestLocalStt = await modelManager.getOptimalModel("stt", "efficiency");
      if (bestLocalStt) onUpdate("voice", "sttModel", bestLocalStt.id);
      
      onUpdate("voice", "provider", "openai");
      onUpdate("voice", "voiceId", "alloy");
    } else if (type === "balanced") {
      onUpdate("voice", "sttModel", "cloud-gemini");
      onUpdate("voice", "provider", "local-luca");

      const bestLocalTts = await modelManager.getOptimalModel("tts", "accuracy");
      if (bestLocalTts) {
        if (bestLocalTts.id === "kokoro-82m") {
          onUpdate("voice", "voiceId", "kokoro-heart");
        } else {
          onUpdate("voice", "voiceId", bestLocalTts.id);
        }
      }
    } else if (type === "privacy") {
      const bestLocalStt = await modelManager.getOptimalModel("stt", "accuracy");
      if (bestLocalStt) onUpdate("voice", "sttModel", bestLocalStt.id);

      onUpdate("voice", "provider", "local-luca");

      const bestLocalTts = await modelManager.getOptimalModel("tts", "accuracy");
      if (bestLocalTts) {
        if (bestLocalTts.id === "kokoro-82m") {
          onUpdate("voice", "voiceId", "kokoro-heart");
        } else {
          onUpdate("voice", "voiceId", bestLocalTts.id);
        }
      }
    }
  };

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

  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : "pr-2"}`}>
      {/* Strategic Presets Section */}
      <motion.div variants={item} className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="Sparkles" className="w-3.5 h-3.5" style={{ color: theme.hex }} />
          <h4
            className={`${isMobile ? "text-sm" : "text-base"} font-black uppercase tracking-widest`}
            style={{ color: "var(--app-text-main)" }}
          >
            Strategic Performance Presets
          </h4>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            {
              id: "performance",
              label: "Ultra Performance",
              icon: "Zap",
              desc: "Cloud speed, elite quality",
            },
            {
              id: "speedster",
              label: "Hybrid Speedster",
              icon: "Sparkles",
              desc: "Local Ear, Cloud Voice",
            },
            {
              id: "balanced",
              label: "Balanced",
              icon: "Scale",
              desc: "Fast STT, local-fi voice",
            },
            {
              id: "privacy",
              label: "Full Privacy",
              icon: "Shield",
              desc: "100% Offline, ultra-fast",
            },
          ].map((preset) => {
            const isActive = 
              (preset.id === "performance" && settings.voice.provider === "google") ||
              (preset.id === "speedster" && settings.voice.provider === "openai" && settingsService.isModelLocal(settings.voice.sttModel)) ||
              (preset.id === "balanced" && settings.voice.provider === "local-luca" && !settingsService.isModelLocal(settings.voice.sttModel)) ||
              (preset.id === "privacy" && settings.voice.provider === "local-luca" && settingsService.isModelLocal(settings.voice.sttModel));

            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id as any)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all text-center group tech-border`}
                style={{
                  backgroundColor: isMobile ? "rgba(255,255,255,0.02)" : "var(--app-bg-tint, rgba(0,0,0,0.1))",
                  background: isActive ? `${theme.hex}11` : undefined
                }}
              >
                <Icon
                  name={preset.icon}
                  className="w-3.5 h-3.5 mb-1.5 group-hover:scale-110 transition-transform"
                  style={{
                    color: isActive
                      ? theme.hex
                      : "var(--app-text-muted, rgba(255,255,255,0.3))",
                  }}
                />
                <span
                  className="text-sm font-black"
                  style={{ color: "var(--app-text-main)" }}
                >
                  {preset.label}
                </span>
                <span
                  className="text-[10px] uppercase mt-0.5 opacity-70"
                  style={{ color: "var(--app-text-muted)" }}
                >
                  {preset.desc}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {/* Acoustic Detection (Wake Word) */}
        <motion.div
          variants={item}
          className={`${isMobile ? "p-4 py-8 border-x-0 border-y rounded-none" : "tech-border p-4 space-y-3 rounded-lg"} glass-blur`}
          style={{
            backgroundColor: isMobile ? "rgba(255,255,255,0.02)" : "var(--app-bg-tint, #11111a)",
            borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <Icon
                name="Mic"
                className={`w-4 h-4 flex-shrink-0 ${settings.voice.wakeWordEnabled ? "animate-pulse" : ""}`}
                style={{
                  color: settings.voice.wakeWordEnabled ? theme.hex : "var(--app-text-muted, rgba(255,255,255,0.3))",
                }}
              />
              <div
                className={`${isMobile ? "text-xs" : "text-sm"} font-black uppercase tracking-widest truncate`}
                style={{ color: "var(--app-text-main)" }}
              >
                Wake Word Detection (&quot;Hey Luca&quot;)
              </div>
            </div>
            <div
              className={`text-[9px] font-black font-mono px-2 py-0.5 rounded border border-white/5 opacity-80 flex-shrink-0 ${settings.voice.wakeWordEnabled ? "bg-green-500/10 text-green-500" : "bg-black/20 text-[var(--app-text-muted)]"}`}
            >
              {settings.voice.wakeWordEnabled ? "ACTIVE" : "DISABLED"}
            </div>
          </div>
          <div className="space-y-2">
            <p 
              className="text-xs leading-tight opacity-70"
              style={{ color: "var(--app-text-muted)" }}
            >
              Background listening for &quot;Hey Luca&quot; to bring the AI to
              front.
            </p>
            <button
              onClick={() => {
                const newValue = !settings.voice.wakeWordEnabled;
                onUpdate("voice", "wakeWordEnabled", newValue);
                // INSTANT SAVE for toggle to prevent race conditions
                const updated = {
                  ...settings,
                  voice: { ...settings.voice, wakeWordEnabled: newValue },
                };
                settingsService.saveSettings(updated);
              }}
              className={`w-full py-1.5 rounded-lg border text-sm font-black outline-none transition-all tech-border`}
              style={{
                backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.2))",
                color: settings.voice.wakeWordEnabled
                  ? theme.hex
                  : "var(--app-text-muted, #94a3b8)",
                borderColor: settings.voice.wakeWordEnabled
                  ? `${theme.hex}66`
                  : "var(--app-border-main, rgba(255,255,255,0.1))",
              }}
            >
              {settings.voice.wakeWordEnabled ? "DEACTIVATE" : "ACTIVATE"}
            </button>
          </div>
        </motion.div>

        {/* Listening Model */}
        <motion.div
          variants={item}
          className={`${isMobile ? "p-4 py-8 border-x-0 border-y rounded-none" : "tech-border p-4 space-y-3 rounded-lg"} glass-blur`}
          style={{
            backgroundColor: isMobile ? "rgba(255,255,255,0.02)" : "var(--app-bg-tint, #11111a)",
            borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <Icon name="Waves" className="w-4 h-4 flex-shrink-0" style={{ color: theme.hex }} />
              <div 
                className={`${isMobile ? "text-xs" : "text-sm"} font-black uppercase tracking-widest truncate`}
                style={{ color: "var(--app-text-main)" }}
              >
                Listening Model (Ears)
              </div>
            </div>
            <div 
               className="text-[9px] font-black font-mono uppercase bg-black/20 px-2 py-0.5 rounded border border-white/5 opacity-80 flex-shrink-0"
               style={{ color: "var(--app-text-muted)" }}
            >
               STT ACTIVE
            </div>
          </div>
          <div className="space-y-1">
            <div 
              className={`${isMobile ? "text-[10px]" : "text-xs"} font-bold uppercase tracking-wider opacity-60 text-[var(--app-text-muted)]`}
            >
              Speech-to-Text
            </div>
            <select
              value={settings.voice.sttModel || "cloud-gemini"}
              onChange={(e) => {
                const val = e.target.value;
                onUpdate("voice", "sttModel", val);
                // Smart Linking: Default to Gemini Native TTS if Gemini STT is selected
                if (val.includes("gemini") || val === "cloud-gemini") {
                  onUpdate("voice", "provider", "gemini-genai");
                }
              }}
              className={`w-full rounded-lg p-2 text-sm font-mono outline-none transition-colors border tech-border`}
              style={{
                backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.4))",
                borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
                color: "var(--app-text-main)"
              }}
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
            </select>
          </div>
        </motion.div>

        {/* Vocal Synthesis Engine (Merged Card) */}
        <motion.div
          variants={item}
          className={`${isMobile ? "p-4 py-6 border-x-0 border-y rounded-none" : "tech-border p-4 space-y-4 lg:col-span-1 rounded-lg glass-blur"}`}
          style={{
            backgroundColor: isMobile ? "rgba(255,255,255,0.02)" : "var(--app-bg-tint, #11111a)",
            borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <Icon name="Volume2" className="w-4 h-4 flex-shrink-0" style={{ color: theme.hex }} />
              <div 
                className={`${isMobile ? "text-xs" : "text-sm"} font-black uppercase tracking-widest truncate`}
                style={{ color: "var(--app-text-main)" }}
              >
                Voice Provider
              </div>
            </div>
            <div 
               className="text-[9px] font-black font-mono uppercase bg-black/20 px-2 py-0.5 rounded border border-white/5 opacity-80 flex-shrink-0"
               style={{ color: "var(--app-text-muted)" }}
            >
               LOCAL-FIRST LOGIC
            </div>
          </div>

          <div className="space-y-3">
            {/* Engine Selection */}
            <div className="space-y-1">
              <select
                value={settings.voice.provider || "gemini-genai"}
                onChange={(e) => onUpdate("voice", "provider", e.target.value)}
                disabled={settings.voice.sttModel === "gemini-live-2.5-flash-preview-native-audio-09-2025"}
              className={`w-full rounded-lg p-2 text-xs outline-none transition-all font-mono border tech-border ${(settings.voice.sttModel === "gemini-live-2.5-flash-preview-native-audio-09-2025") ? "opacity-50 cursor-not-allowed" : ""}`}
              style={{
                backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.4))",
                borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
                color: "var(--app-text-main)"
              }}
              >
                <option value="gemini-genai">Gemini Native Audio</option>
                <option value="google">Google Cloud Audio</option>
                <option value="openai">OpenAI TTS</option>
                <option value="deepgram">Deepgram Aura</option>
                <option value="local-luca">Local Offline</option>
              </select>
              {(settings.voice.sttModel?.includes("gemini") || settings.voice.sttModel === "cloud-gemini") && settings.voice.provider === "gemini-genai" && (
                <p className="text-[10px] text-blue-400 font-bold uppercase mt-1 animate-pulse flex items-center gap-1">
                  <Icon name="Waves" className="w-2 h-2" />
                  {settings.voice.sttModel === "gemini-live-2.5-flash-preview-native-audio-09-2025" 
                    ? "Direct Multimodal Live Loop Active" 
                    : "Linked to Native Multimodal Persona"}
                </p>
              )}
            </div>

            {/* Google Cloud Managed Mode (Enterprise Only) */}
            {settings.voice.provider === "google" && (
              <div className="pt-2 border-t border-white/5" />
            )}

            {/* Voice / Identity Selection */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <div
                  className={`text-xs font-black uppercase tracking-widest`}
                  style={{ color: "var(--app-text-muted)" }}
                >
                  {settings.voice.provider === "local-luca"
                    ? "Offline Speaker Profile"
                    : settings.voice.provider === "google"
                      ? "Cloud Vocal Identity"
                      : "Voice Identity"}
                </div>
                {settings.voice.provider === "gemini-genai" && (
                  <span className="text-sm text-blue-400 font-bold uppercase animate-pulse">
                    Persona Synced
                  </span>
                )}
              </div>

              <select
                value={settings.voice.voiceId || "native-browser"}
                onChange={(e) => onUpdate("voice", "voiceId", e.target.value)}
                disabled={settings.voice.provider === "gemini-genai"}
                className={`w-full border rounded-lg p-2 text-xs outline-none transition-all tech-border`}
                style={{
                  backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.4))",
                  borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
                  color: "var(--app-text-main)",
                  opacity: settings.voice.provider === "gemini-genai" ? 0.5 : 1,
                  cursor: settings.voice.provider === "gemini-genai" ? "not-allowed" : "pointer"
                }}
              >
                {settings.voice.provider === "gemini-genai" ? (
                  <option>Managed by Active Persona</option>
                ) : settings.voice.provider === "google" ? (
                  <>
                    <optgroup label="Google Cloud Voices">
                      <option value="en-US-Journey-F">
                        Journey - Female (RECOMMENDED)
                      </option>
                      <option value="en-US-Journey-D">
                        Journey - Male (Premium)
                      </option>
                      <option value="en-US-Neural2-F">
                        Luca - Female (F)
                      </option>
                      <option value="en-US-Neural2-A">
                        Luca - Female (A)
                      </option>
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
                      <option value="native-browser">
                        Default Luca Voice
                      </option>
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
              </select>
            </div>
          </div>
        </motion.div>

        {/* Rhythm Calibration (Moved into grid for better balance) */}
        <motion.div
          variants={item}
          className={`${isMobile ? "p-4 py-8 border-x-0 border-y rounded-none" : "tech-border p-4 space-y-3 rounded-lg"} glass-blur`}
          style={{
            backgroundColor: isMobile ? "rgba(255,255,255,0.02)" : "var(--app-bg-tint, #11111a)",
            borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
          }}
        >
          <div 
            className={`flex justify-between items-center ${isMobile ? "text-base" : "text-lg"} font-bold uppercase tracking-wider`}
            style={{ color: "var(--app-text-muted)" }}
          >
            <div className="flex items-center gap-2">
              <Icon name="Zap" className="w-3 h-3" style={{ color: theme.hex }} />
              Rhythm & Pacing
            </div>
            <span
              style={{ color: "var(--app-text-main)" }}
              className="font-mono text-sm"
            >
              {settings.voice.pacing.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { id: "Slow", rate: 0.8 },
              { id: "Normal", rate: 1.0 },
              { id: "Fast", rate: 1.25 },
              { id: "Dramatic", rate: 0.9 },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onUpdate("voice", "pacing", p.id as any);
                  onUpdate("voice", "rate", p.rate);
                }}
                className={`py-1.5 rounded border bg-[var(--app-bg-tint)] text-sm font-mono transition-all shadow-sm tech-border hover:bg-white/5`}
                style={{
                  color:
                    settings.voice.pacing === p.id
                      ? theme.hex
                      : "var(--app-text-muted)",
                  borderColor:
                    settings.voice.pacing === p.id
                      ? `${theme.hex}66`
                      : "var(--app-border-main)",
                }}
              >
                {p.id.toUpperCase()}
              </button>
            ))}
          </div>
          <div 
            className="text-sm uppercase tracking-widest text-center mt-1"
            style={{ color: "var(--app-text-muted)" }}
          >
            Vocal tempo calibration protocol
          </div>
        </motion.div>
      </motion.div>

      {/* Voice Intelligence Telemetry (Cinematic Monitoring) */}
      <motion.div
        variants={item}
        className={`${isMobile ? "p-4 py-8 border-x-0 border-y rounded-none" : "tech-border p-4 space-y-4 rounded-lg"} glass-blur`}
        style={{
          backgroundColor: isMobile ? "rgba(255,255,255,0.02)" : "var(--app-bg-tint, #11111a)",
          borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
        }}
      >
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name="Activity" className="w-3.5 h-3.5 flex-shrink-0" style={{ color: theme.hex }} />
            <span
              className={`${isMobile ? "text-base" : "text-lg"} font-bold text-[var(--app-text-muted)] uppercase tracking-wider truncate`}
            >
              Intelligence Telemetry Dashboard
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className={`${isMobile ? "text-[9px]" : "text-sm"} font-mono text-[var(--app-text-muted)] uppercase`}>
              {isMobile ? "Hybrid Active" : "Hybrid Link: Active"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* STT Race */}
          <div
            className={`p-3 rounded-lg border bg-[var(--app-bg-tint)] border-[var(--app-border-main)] space-y-2`}
          >
            <div className={`flex justify-between items-center ${isMobile ? "text-sm" : "text-base"} font-bold text-[var(--app-text-muted)] uppercase tracking-wider`}>
              <span>Acoustic Racing (STT)</span>
              <Icon name="Mic" className="w-2.5 h-2.5" />
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-[var(--app-text-muted)] font-mono uppercase">
                  <span>Local Core</span>
                  <span style={{ color: theme.hex }}>
                    {metrics.stt.local.toFixed(0)}ms
                  </span>
                </div>
                <div className={`h-1 bg-[var(--app-bg-tint)]/40 rounded-full overflow-hidden border border-[var(--app-border-main)]`}>
                  <motion.div
                    className="h-full bg-green-500"
                    animate={{ width: `${(metrics.stt.local / 100) * 100}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-[var(--app-text-muted)] font-mono uppercase">
                  <span>Cloud Nexus</span>
                  <span>{metrics.stt.cloud.toFixed(0)}ms</span>
                </div>
                <div className={`h-1 bg-[var(--app-bg-tint)]/40 rounded-full overflow-hidden border border-[var(--app-border-main)]`}>
                  <motion.div
                    className="h-full opacity-50"
                    style={{ backgroundColor: theme.hex }}
                    animate={{ width: `${(metrics.stt.cloud / 1000) * 100}%` }}
                    transition={{ type: "spring", stiffness: 30 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Brain Latency */}
          <div
            className={`p-3 rounded-lg border bg-[var(--app-bg-tint)] border-[var(--app-border-main)] space-y-2`}
          >
            <div className={`flex justify-between items-center ${isMobile ? "text-sm" : "text-base"} font-bold text-[var(--app-text-muted)] uppercase tracking-tighter`}>
              <span>Hyper-Inference (Brain)</span>
              <Icon name="Cpu" className="w-2.5 h-2.5" />
            </div>
            <div className="flex flex-col justify-center h-[44px] space-y-1">
              <div className="text-center text-2xl font-mono leading-none tracking-tighter">
                <span style={{ color: theme.hex }}>
                  {metrics.brain.ttft.toFixed(0)}
                </span>
                <span className="text-base text-[var(--app-text-muted)] ml-0.5">ms</span>
              </div>
              <div className="text-center text-sm text-[var(--app-text-muted)] font-bold uppercase truncate">
                Via {metrics.brain.path}
              </div>
            </div>
          </div>

          {/* TTS Protocol */}
          <div
            className={`p-3 rounded-lg border bg-[var(--app-bg-tint)] border-[var(--app-border-main)] space-y-2`}
          >
            <div className={`flex justify-between items-center ${isMobile ? "text-sm" : "text-base"} font-bold text-[var(--app-text-muted)] uppercase tracking-tighter`}>
              <span>Synthesis Flow (TTS)</span>
              <Icon name="BarChart3" className="w-2.5 h-2.5" />
            </div>
            <div className="space-y-2">
              <div className={`flex justify-between items-center bg-[var(--app-bg-tint)]/30 border border-[var(--app-border-main)] rounded px-2 py-1`}>
                <span className="text-sm text-[var(--app-text-muted)] font-mono uppercase">
                  Current Source
                </span>
                <span
                  className="text-[9px] font-bold uppercase"
                  style={{ color: theme.hex }}
                >
                  {metrics.tts.source === "neural"
                    ? "Cloud Neural"
                    : "Local Bin"}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-[var(--app-text-muted)] font-mono uppercase">
                  <span>Buffer Load</span>
                  <span>{metrics.tts.buffer.toFixed(0)}%</span>
                </div>
                <div className={`h-1 bg-[var(--app-bg-tint)]/40 rounded-full overflow-hidden border border-[var(--app-border-main)]`}>
                  <motion.div
                    className="h-full"
                    style={{ backgroundColor: theme.hex }}
                    animate={{ width: `${metrics.tts.buffer}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className={`${isMobile ? "text-[9px]" : "text-sm"} text-[var(--app-text-muted)] font-mono uppercase tracking-[0.2em] pt-1`}>
          Telemetry stream synchronized via Hybrid Connectivity Bridge
        </p>
      </motion.div>

      {/* Voice Cloning Studio (Premium Card) */}
      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        className={`tech-border p-4 space-y-4 rounded-lg glass-blur`}
        style={{
          backgroundColor: "var(--app-bg-tint, #11111a)",
          borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Lock" className="w-3 h-3" style={{ color: theme.hex }} />
            <span
              className={`text-lg font-bold text-[var(--app-text-muted)] uppercase tracking-wider`}
            >
              My Voice Clones
            </span>
          </div>
          <div
            className={`text-[10px] font-mono bg-[var(--app-bg-tint, rgba(0,0,0,0.1))] px-2 py-0.5 rounded border border-[var(--app-border-main)] text-[var(--app-text-muted)]`}
          >
            {clonedVoices.length} ENCRYPTED
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleRecordVoice}
                disabled={isRecording}
                className={`flex items-center justify-center gap-2 py-2 bg-[var(--app-bg-tint)] border-[var(--app-border-main)] rounded-lg glass-blur transition-all hover:bg-white/5 active:scale-95`}
                style={{
                  color: isRecording ? "var(--app-text-muted)" : theme.hex,
                  borderColor: isRecording ? "var(--app-border-main)" : `${theme.hex}22`,
                }}
              >
                {isRecording ? (
                  <Icon name="Loader2" className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Icon name="Mic" className="w-3.5 h-3.5" />
                )}
                <span className="text-[9px] font-bold">
                  {isRecording
                    ? `CAPTURING ${recordingTime.toFixed(1)}s`
                    : "RECORD"}
                </span>
              </button>
              <label
                className={`flex items-center justify-center gap-2 py-2 bg-[var(--app-bg-tint)] border-[var(--app-border-main)] rounded-lg glass-blur cursor-pointer hover:bg-white/5 transition-all text-[var(--app-text-muted)]`}
              >
                <Icon name="Upload" className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold uppercase">UPLOAD</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            <p className="text-[8px] text-[var(--app-text-muted)] font-mono leading-relaxed">
              Record or upload clear audio. Luca will clone this voice for all
              vocal output (Requires Gemini Native Audio). 
              <span className="text-blue-500/80 ml-1">Range: 2-30s. Activating will auto-switch engine.</span>
            </p>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[80px] no-scrollbar">
            {clonedVoices.map((v) => {
              const isActive = settings.voice.activeClonedVoiceId === v.id;
              return (
                <div
                  key={v.id}
                  className={`flex items-center justify-between p-2 rounded border tech-border`}
                  style={{
                    backgroundColor: isActive ? "var(--app-bg-tint)" : "var(--app-bg-tint, rgba(0,0,0,0.1))",
                    borderColor: isActive ? `${theme.hex}66` : "var(--app-border-main)",
                  }}
                >
                   <div className="flex items-center gap-2 truncate flex-1">
                     {isActive ? (
                        <span className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-green-500/20 text-[6px] font-black text-green-400 border border-green-500/30 animate-pulse">
                          <Icon name="Activity" className="w-2 h-2" />
                          WEARING
                        </span>
                     ) : (
                       <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                     )}
                     <span
                       className={`text-[9px] font-mono ${isActive ? "text-[var(--app-text-main)]" : "text-[var(--app-text-muted)]"} truncate`}
                     >
                       {v.name}
                     </span>
                   </div>
                   <div className="flex gap-1.5 items-center">
                     {!isActive && (
                       <button
                         onClick={() => handleActivateVoice(v)}
                         className="px-2 py-0.5 hover:bg-white/5 rounded transition-all text-[7px] font-bold uppercase tracking-tighter"
                         style={{ color: theme.hex }}
                       >
                         Use
                       </button>
                     )}
                     <button
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
                           const audio = new Audio(URL.createObjectURL(voice.audioBlob));
                           audio.onended = () => {
                             setPlayingVoiceId(null);
                             setCurrentAudio(null);
                           };
                           setPlayingVoiceId(v.id);
                           setCurrentAudio(audio);
                           audio.play();
                         });
                       }}
                       className={`p-1.5 rounded-md transition-all ${playingVoiceId === v.id ? "bg-white/10 text-[var(--app-text-main)]" : "hover:text-green-500 text-[var(--app-text-muted)]"}`}
                     >
                       {playingVoiceId === v.id ? (
                         <Icon name="Pause" className="w-3 h-3" />
                       ) : (
                         <Icon name="Play" className="w-3 h-3" />
                       )}
                     </button>
                     <button
                       onClick={() =>
                         voiceCloneService
                           .deleteVoice(v.id)
                           .then(() =>
                             voiceCloneService.getVoices().then(setClonedVoices),
                           )
                       }
                       className="p-1.5 hover:text-red-500 transition-colors text-[var(--app-text-muted)]"
                     >
                        <Icon name="Trash2" className="w-3 h-3" />
                     </button>
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsVoiceTab;
