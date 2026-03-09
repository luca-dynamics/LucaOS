import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
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
  ZapOff,
  Scale,
  Sparkles,
} from "lucide-react";
import { LucaSettings, settingsService } from "../../services/settingsService";
import { modelManager, LocalModel } from "../../services/ModelManagerService";
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
      const audioBlob = await voiceCloneService.recordVoice(5);
      clearInterval(timer);
      const voiceName = `Clone ${new Date().toLocaleTimeString()}`;
      const voiceId = await voiceCloneService.saveVoice(audioBlob, voiceName);
      onUpdate("voice", "activeClonedVoiceId", voiceId);
      voiceCloneService.getVoices().then(setClonedVoices);
      setIsRecording(false);
    } catch (e) {
      console.warn("[Voice] Failed to record voice:", e);
      setIsRecording(false);
    }
  };

  const applyPreset = async (type: "performance" | "balanced" | "privacy") => {
    if (type === "performance") {
      onUpdate("voice", "sttModel", "cloud-gemini");
      onUpdate("voice", "provider", "google");
      onUpdate("voice", "voiceId", "en-US-Journey-F");
    } else if (type === "balanced") {
      onUpdate("voice", "sttModel", "cloud-gemini");
      onUpdate("voice", "provider", "local-luca");

      const bestLocalTts = await modelManager.getOptimalModel(
        "tts",
        "accuracy",
      );
      if (bestLocalTts) onUpdate("voice", "voiceId", bestLocalTts.id);
    } else if (type === "privacy") {
      const bestLocalStt = await modelManager.getOptimalModel(
        "stt",
        "accuracy",
      );
      if (bestLocalStt) onUpdate("voice", "sttModel", bestLocalStt.id);

      onUpdate("voice", "provider", "local-luca");

      // Prefer Accuracy (Kokoro) over Efficiency (Piper) for Privacy Mode because Piper is flaky
      const bestLocalTts = await modelManager.getOptimalModel(
        "tts",
        "accuracy",
      );

      if (bestLocalTts) {
        // Fix: Map generic Model IDs to specific Voice IDs that Cortex accepts
        if (bestLocalTts.id === "kokoro-82m") {
          onUpdate("voice", "voiceId", "kokoro-heart");
        } else {
          onUpdate("voice", "voiceId", bestLocalTts.id);
        }
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
    <div className="space-y-6 max-h-[420px] pr-2">
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
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              id: "performance",
              label: "Ultra Performance",
              icon: Zap,
              desc: "Cloud speed, elite quality",
            },
            {
              id: "balanced",
              label: "Balanced",
              icon: Scale,
              desc: "Fast STT, high-fi local voice",
            },
            {
              id: "privacy",
              label: "Full Privacy",
              icon: Shield,
              desc: "100% Offline, ultra-fast",
            },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id as any)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/5 bg-black/5 hover:bg-black/10" : "border-white/5 bg-white/5 hover:bg-white/10"} transition-all text-center group`}
              style={{
                borderColor:
                  (preset.id === "performance" &&
                    settings.voice.provider === "google") ||
                  (preset.id === "balanced" &&
                    settings.voice.provider === "local-luca" &&
                    settings.voice.sttModel === "cloud-gemini") ||
                  (preset.id === "privacy" &&
                    settings.voice.provider === "local-luca" &&
                    settings.voice.sttModel !== "cloud-gemini")
                    ? `${theme.hex}aa`
                    : theme.themeName?.toLowerCase() === "lucagent"
                      ? "transparent"
                      : "rgba(255,255,255,0.05)",
              }}
            >
              <preset.icon
                className="w-4 h-4 mb-2 group-hover:scale-110 transition-transform"
                style={{
                  color:
                    (preset.id === "performance" &&
                      settings.voice.provider === "google") ||
                    (preset.id === "balanced" &&
                      settings.voice.provider === "local-luca" &&
                      settings.voice.sttModel === "cloud-gemini") ||
                    (preset.id === "privacy" &&
                      settings.voice.provider === "local-luca" &&
                      settings.voice.sttModel !== "cloud-gemini")
                      ? theme.hex
                      : "#6b7280",
                }}
              />
              <span
                className={`text-[9px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-900" : "text-gray-300"}`}
              >
                {preset.label}
              </span>
              <span
                className={`text-[7px] ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-600" : "text-gray-500"} uppercase mt-1`}
              >
                {preset.desc}
              </span>
            </button>
          ))}
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
                color: settings.voice.wakeWordEnabled ? theme.hex : "#4b5563",
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
              onChange={(e) => onUpdate("voice", "sttModel", e.target.value)}
              className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 border-black/10 text-gray-900" : "bg-black/40 border-white/10 text-white"} rounded-lg p-2 text-xs outline-none transition-colors`}
            >
              <optgroup label="Cloud Providers">
                <option value="cloud-gemini">
                  Gemini 3 Flash (RECOMMENDED)
                </option>
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
                value={settings.voice.provider}
                onChange={(e) => onUpdate("voice", "provider", e.target.value)}
                className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 border-black/10 text-gray-900" : "bg-black/40 border-white/10 text-white"} rounded-lg p-2 text-[10px] outline-none hover:border-black/20 transition-all font-mono`}
              >
                <option value="google">Google Cloud</option>
                <option value="gemini-genai">Gemini GenAI</option>
                <option value="local-luca">Local Offline</option>
              </select>
            </div>

            {/* Google Cloud Status Note (Optional) */}
            {settings.voice.provider === "google" && (
              <p className="text-[8px] text-gray-600 uppercase tracking-tighter ml-1">
                Managed high-fidelity neural voices provided by Google Cloud.
              </p>
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
                      <option value="en-US-Neural2-D">
                        Neural2 - Male (D)
                      </option>
                    </optgroup>
                    <optgroup label="Google Cloud Standard Voices">
                      <option value="en-US-Wavenet-F">Wavenet - Female</option>
                      <option value="en-US-Wavenet-B">Wavenet - Male</option>
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
              <Zap className="w-3 h-3 text-yellow-500" />
              Rhythm & Pacing
            </div>
            <span
              style={{
                color: theme.themeName?.toLowerCase() === "lucagent" ? "#000" : theme.hex,
              }}
              className="font-mono text-[9px]"
            >
              {settings.voice.pacing.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {["Slow", "Normal", "Fast", "Dramatic"].map((p) => (
              <button
                key={p}
                onClick={() => onUpdate("voice", "pacing", p)}
                className={`py-1.5 rounded border ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/5 bg-black/[0.03] hover:bg-black/5" : "border-white/5 bg-white/5 hover:bg-white/10"} text-[8px] font-mono transition-all`}
                style={{
                  color:
                    settings.voice.pacing === p
                      ? theme.themeName?.toLowerCase() === "lucagent"
                        ? "#000"
                        : theme.hex
                      : theme.themeName?.toLowerCase() === "lucagent"
                        ? "#64748b"
                        : "#6b7280",
                  borderColor:
                    settings.voice.pacing === p
                      ? `${theme.hex}66`
                      : "transparent",
                }}
              >
                {p.toUpperCase()}
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
              vocal output.
            </p>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[80px] no-scrollbar">
            {clonedVoices.map((v) => (
              <div
                key={v.id}
                className={`flex items-center justify-between p-2 rounded ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 border-black/10" : "bg-black/20 border-white/5"}`}
              >
                <span
                  className={`text-[9px] font-mono ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-600" : "text-gray-300"} truncate w-24`}
                >
                  {v.name}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() =>
                      voiceCloneService.getVoice(v.id).then((voice) => {
                        const audio = new Audio(
                          URL.createObjectURL(voice!.audioBlob),
                        );
                        audio.play();
                      })
                    }
                    className="p-1 hover:text-green-500 transition-colors"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() =>
                      voiceCloneService
                        .deleteVoice(v.id)
                        .then(() =>
                          voiceCloneService.getVoices().then(setClonedVoices),
                        )
                    }
                    className="p-1 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsVoiceTab;
