import React, { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import { motion } from "framer-motion";
const {
  Mic,
  Upload,
  Play,
  Trash2,
  Loader2,
  Volume2,
  Waves,
  Lock,
  Zap,
  Shield,
  Scale,
  Sparkles,
  Activity,
  Cpu,
  BarChart3,
  Pause,
} = LucideIcons as any;
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
}

const SettingsVoiceTab: React.FC<SettingsVoiceTabProps> = ({
  settings,
  onUpdate,
  theme,
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
    <div className="space-y-6 max-h-[520px] pr-2">
      {/* Strategic Presets Section */}
      <motion.div variants={item} className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" style={{ color: theme.hex }} />
          <h4
            className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-500" : "text-gray-400"} uppercase tracking-widest`}
          >
            Strategic Performance Presets
          </h4>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            {
              id: "performance",
              label: "Ultra Performance",
              icon: Zap,
              desc: "Cloud speed, elite quality",
            },
            {
              id: "speedster",
              label: "Hybrid Speedster",
              icon: Sparkles,
              desc: "Local Ear, Cloud Voice",
            },
            {
              id: "balanced",
              label: "Balanced",
              icon: Scale,
              desc: "Fast STT, local-fi voice",
            },
            {
              id: "privacy",
              label: "Full Privacy",
              icon: Shield,
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
                className={`flex flex-col items-center justify-center p-2 rounded-xl border ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/5 bg-black/5 hover:bg-black/10" : "border-white/5 bg-white/5 hover:bg-white/10"} transition-all text-center group`}
                style={{
                  borderColor: isActive
                    ? `${theme.hex}aa`
                    : theme.themeName?.toLowerCase() === "lucagent"
                      ? "transparent"
                      : "rgba(255,255,255,0.05)",
                  background: isActive ? `${theme.hex}11` : undefined
                }}
              >
                <preset.icon
                  className="w-3.5 h-3.5 mb-1.5 group-hover:scale-110 transition-transform"
                  style={{
                    color: isActive
                      ? theme.hex
                      : theme.themeName?.toLowerCase() === "lucagent" ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)",
                  }}
                />
                <span
                  className={`text-[9px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-900" : "text-gray-200"}`}
                >
                  {preset.label}
                </span>
                <span
                  className={`text-[7px] ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-600" : "text-gray-500"} uppercase mt-0.5`}
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
          className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light" : "glass-panel"} tech-border p-4 space-y-3`}
        >
          <div className="flex items-center justify-between">
            <Mic
              className={`w-4 h-4 ${settings.voice.wakeWordEnabled ? "animate-pulse" : ""}`}
              style={{
                color: settings.voice.wakeWordEnabled ? theme.hex : theme.themeName?.toLowerCase() === "lucagent" ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)",
              }}
            />
            <div
              className={`text-[8px] font-mono ${settings.voice.wakeWordEnabled ? "text-green-500" : theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-400" : "text-gray-500"}`}
            >
              {settings.voice.wakeWordEnabled ? "ACTIVE" : "DISABLED"}
            </div>
          </div>
          <div className="space-y-2">
            <div
              className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-500" : "text-gray-400"} uppercase tracking-tighter`}
            >
              Wake Word Detection (&quot;Hey Luca&quot;)
            </div>
            <p className="text-[9px] text-gray-500 leading-tight">
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
              className={`w-full py-1.5 rounded-lg border ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/5 bg-black/[0.03]" : "border-white/5 bg-white/5"} text-[10px] transition-all`}
              style={{
                color: settings.voice.wakeWordEnabled
                  ? theme.hex
                  : theme.themeName?.toLowerCase() === "lucagent"
                    ? "#475569"
                    : "#9ca3af",
                borderColor: settings.voice.wakeWordEnabled
                  ? `${theme.hex}66`
                  : theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(0,0,0,0.05)"
                    : "rgba(255,255,255,0.05)",
              }}
            >
              {settings.voice.wakeWordEnabled ? "DEACTIVATE" : "ACTIVATE"}
            </button>
          </div>
        </motion.div>

        {/* Listening Model */}
        <motion.div
          variants={item}
          className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light" : "glass-panel"} tech-border p-4 space-y-3`}
        >
          <div className="flex items-center justify-between">
            <Waves className="w-4 h-4" style={{ color: theme.hex }} />
            <div
              className={`text-[8px] font-mono ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-600" : "text-gray-500"} uppercase`}
            >
              Listening Model (Ears)
            </div>
          </div>
          <div className="space-y-1">
            <div
              className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-400"} uppercase tracking-tighter`}
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
              className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 border-black/10 text-gray-900" : "bg-black/40 border-white/10 text-white"} rounded-lg p-2 text-xs outline-none transition-colors`}
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
          className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light" : "glass-panel"} tech-border p-4 space-y-4 lg:col-span-1`}
        >
          <div className="flex items-center justify-between">
            <Volume2 className="w-4 h-4" style={{ color: theme.hex }} />
            <div className="text-[8px] font-mono text-gray-500 uppercase">
              Vocal TTS Providers
            </div>
          </div>

          <div className="space-y-3">
            {/* Engine Selection */}
            <div className="space-y-1">
              <div
                className={`text-[9px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-500" : "text-gray-500"} uppercase tracking-widest`}
              >
                Synthesis Engine
              </div>
              <select
                value={settings.voice.provider || "gemini-genai"}
                onChange={(e) => onUpdate("voice", "provider", e.target.value)}
                disabled={settings.voice.sttModel === "gemini-live-2.5-flash-preview-native-audio-09-2025"}
                className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 border-black/10 text-gray-900" : "bg-black/40 border-white/10 text-white"} rounded-lg p-2 text-[10px] outline-none hover:border-black/20 transition-all font-mono ${(settings.voice.sttModel === "gemini-live-2.5-flash-preview-native-audio-09-2025") ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <option value="gemini-genai">Gemini Native Audio</option>
                <option value="google">Google Cloud Neural</option>
                <option value="openai">OpenAI TTS</option>
                <option value="deepgram">Deepgram Aura</option>
                <option value="local-luca">Local Offline</option>
              </select>
              {(settings.voice.sttModel?.includes("gemini") || settings.voice.sttModel === "cloud-gemini") && settings.voice.provider === "gemini-genai" && (
                <p className="text-[7px] text-blue-400 font-bold uppercase mt-1 animate-pulse flex items-center gap-1">
                  <Waves className="w-2 h-2" />
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
                  className={`text-[9px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-500" : "text-gray-500"} uppercase tracking-widest`}
                >
                  {settings.voice.provider === "local-luca"
                    ? "Offline Speaker Profile"
                    : settings.voice.provider === "google"
                      ? "Cloud Vocal Identity"
                      : "Voice Identity"}
                </div>
                {settings.voice.provider === "gemini-genai" && (
                  <span className="text-[7px] text-blue-400 font-bold uppercase animate-pulse">
                    Persona Synced
                  </span>
                )}
              </div>

              <select
                value={settings.voice.voiceId || "native-browser"}
                onChange={(e) => onUpdate("voice", "voiceId", e.target.value)}
                disabled={settings.voice.provider === "gemini-genai"}
                className={`w-full border rounded-lg p-2 text-[10px] outline-none transition-all ${
                  settings.voice.provider === "gemini-genai"
                    ? theme.themeName?.toLowerCase() === "lucagent"
                      ? "bg-black/5 border-black/5 text-gray-400 cursor-not-allowed opacity-50"
                      : "bg-black/20 border-white/5 text-gray-600 cursor-not-allowed opacity-50"
                    : theme.themeName?.toLowerCase() === "lucagent"
                      ? "bg-black/5 border-black/10 text-gray-900 hover:border-black/20"
                      : "bg-black/40 border-white/10 hover:border-white/20"
                }`}
              >
                {settings.voice.provider === "gemini-genai" ? (
                  <option>Managed by Active Persona</option>
                ) : settings.voice.provider === "google" ? (
                  <>
                    <optgroup label="Google Cloud Neural Voices">
                      <option value="en-US-Journey-F">
                        Journey - Female (RECOMMENDED)
                      </option>
                      <option value="en-US-Journey-D">
                        Journey - Male (Premium)
                      </option>
                      <option value="en-US-Neural2-F">
                        Neural2 - Female (F)
                      </option>
                      <option value="en-US-Neural2-A">
                        Neural2 - Female (A)
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
                        Default Neural Voice
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
          className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light" : "glass-panel"} tech-border p-4 space-y-3`}
        >
          <div
            className={`flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-400"}`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3" style={{ color: theme.hex }} />
              Rhythm & Pacing
            </div>
            <span
              style={{
                color:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "#000"
                    : theme.hex,
              }}
              className="font-mono text-[9px]"
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
                className={`py-1.5 rounded border ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/5 bg-black/[0.03] hover:bg-black/5" : "border-white/5 bg-white/5 hover:bg-white/10"} text-[8px] font-mono transition-all`}
                style={{
                  color:
                    settings.voice.pacing === p.id
                      ? theme.themeName?.toLowerCase() === "lucagent"
                        ? "#000"
                        : theme.hex
                      : theme.themeName?.toLowerCase() === "lucagent"
                        ? "#64748b"
                        : "#6b7280",
                  borderColor:
                    settings.voice.pacing === p.id
                      ? `${theme.hex}66`
                      : "transparent",
                }}
              >
                {p.id.toUpperCase()}
              </button>
            ))}
          </div>
          <p
            className={`text-[7px] ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-500" : "text-gray-600"} uppercase tracking-widest text-center mt-1`}
          >
            Vocal tempo calibration protocol
          </p>
        </motion.div>
      </motion.div>

      {/* Voice Intelligence Telemetry (Cinematic Monitoring) */}
      <motion.div
        variants={item}
        className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light" : "glass-panel"} tech-border p-4 space-y-4`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" style={{ color: theme.hex }} />
            <span
              className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-400"} uppercase tracking-wider`}
            >
              Intelligence Telemetry Dashboard
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[8px] font-mono text-gray-500 uppercase">
                Hybrid Link: Active
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* STT Race */}
          <div
            className={`p-3 rounded-lg border ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.02] border-black/5" : "bg-white/[0.02] border-white/5"} space-y-2`}
          >
            <div className="flex justify-between items-center text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
              <span>Acoustic Racing (STT)</span>
              <Mic className="w-2.5 h-2.5" />
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[7px] text-gray-400 font-mono uppercase">
                  <span>Local Core</span>
                  <span style={{ color: theme.hex }}>
                    {metrics.stt.local.toFixed(0)}ms
                  </span>
                </div>
                <div className="h-1 bg-black/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-green-500"
                    animate={{ width: `${(metrics.stt.local / 100) * 100}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[7px] text-gray-400 font-mono uppercase">
                  <span>Cloud Nexus</span>
                  <span>{metrics.stt.cloud.toFixed(0)}ms</span>
                </div>
                <div className="h-1 bg-black/20 rounded-full overflow-hidden">
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
            className={`p-3 rounded-lg border ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.02] border-black/5" : "bg-white/[0.02] border-white/5"} space-y-2`}
          >
            <div className="flex justify-between items-center text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
              <span>Hyper-Inference (Brain)</span>
              <Cpu className="w-2.5 h-2.5" />
            </div>
            <div className="flex flex-col justify-center h-[44px] space-y-1">
              <div className="text-center text-[18px] font-mono leading-none tracking-tighter">
                <span style={{ color: theme.hex }}>
                  {metrics.brain.ttft.toFixed(0)}
                </span>
                <span className="text-[10px] text-gray-500 ml-0.5">ms</span>
              </div>
              <div className="text-center text-[7px] text-gray-400 font-bold uppercase truncate">
                Via {metrics.brain.path}
              </div>
            </div>
          </div>

          {/* TTS Protocol */}
          <div
            className={`p-3 rounded-lg border ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.02] border-black/5" : "bg-white/[0.02] border-white/5"} space-y-2`}
          >
            <div className="flex justify-between items-center text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
              <span>Synthesis Flow (TTS)</span>
              <BarChart3 className="w-2.5 h-2.5" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-black/20 rounded px-2 py-1">
                <span className="text-[7px] text-gray-400 font-mono uppercase">
                  Current Source
                </span>
                <span
                  className="text-[7px] font-bold uppercase"
                  style={{ color: theme.hex }}
                >
                  {metrics.tts.source === "neural"
                    ? "Cloud Neural"
                    : "Local Bin"}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[7px] text-gray-400 font-mono uppercase">
                  <span>Buffer Load</span>
                  <span>{metrics.tts.buffer.toFixed(0)}%</span>
                </div>
                <div className="h-1 bg-black/20 rounded-full overflow-hidden">
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

        <p className="text-[7px] text-center text-gray-600 font-mono uppercase tracking-[0.2em] pt-1">
          Telemetry stream synchronized via Hybrid Connectivity Bridge
        </p>
      </motion.div>

      {/* Voice Cloning Studio (Premium Card) */}
      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light" : "glass-panel"} tech-border p-4 space-y-4`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-3 h-3" style={{ color: theme.hex }} />
            <span
              className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-400"} uppercase tracking-wider`}
            >
              My Voice Clones
            </span>
          </div>
          <div
            className={`text-[8px] font-mono ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.02] border-black/5" : "bg-white/5 border-white/10"} px-2 py-0.5 rounded border text-gray-500`}
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
                className={`flex items-center justify-center gap-2 py-2 ${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light border-black/5" : "glass-panel tech-border"} transition-all hover:bg-white/5 active:scale-95`}
                style={{
                  color: isRecording ? "#9ca3af" : theme.hex,
                  borderColor: `${theme.hex}22`,
                }}
              >
                {isRecording ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mic className="w-3.5 h-3.5" />
                )}
                <span className="text-[9px] font-bold">
                  {isRecording
                    ? `CAPTURING ${recordingTime.toFixed(1)}s`
                    : "RECORD"}
                </span>
              </button>
              <label
                className={`flex items-center justify-center gap-2 py-2 ${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light border-black/5" : "glass-panel tech-border"} cursor-pointer hover:bg-white/5 transition-all text-gray-300`}
                style={{
                  borderColor:
                    theme.themeName?.toLowerCase() === "lucagent"
                      ? "rgba(0,0,0,0.05)"
                      : "rgba(255,255,255,0.05)",
                }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold uppercase">UPLOAD</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            <p className="text-[8px] text-gray-600 font-mono leading-relaxed">
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
                  className={`flex items-center justify-between p-2 rounded border ${theme.themeName?.toLowerCase() === "lucagent" ? (isActive ? "bg-black/10 border-black/20" : "bg-black/5 border-black/10") : (isActive ? "bg-white/10 border-white/20" : "bg-black/20 border-white/5")}`}
                >
                   <div className="flex items-center gap-2 truncate flex-1">
                     {isActive ? (
                       <span className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-green-500/20 text-[6px] font-black text-green-400 border border-green-500/30 animate-pulse">
                         <Activity className="w-2 h-2" />
                         WEARING
                       </span>
                     ) : (
                       <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                     )}
                     <span
                       className={`text-[9px] font-mono ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-600" : (isActive ? "text-white" : "text-gray-400")} truncate`}
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
                       className={`p-1.5 rounded-md transition-all ${playingVoiceId === v.id ? "bg-white/10 text-white" : "hover:text-green-500 text-gray-500"}`}
                     >
                       {playingVoiceId === v.id ? (
                         <Pause className="w-3 h-3" />
                       ) : (
                         <Play className="w-3 h-3" />
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
                       className="p-1.5 hover:text-red-500 transition-colors text-gray-500"
                     >
                       <Trash2 className="w-3 h-3" />
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
