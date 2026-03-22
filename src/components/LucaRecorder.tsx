import React, { useState, useRef, useEffect } from "react";
import * as LucideIcons from "lucide-react";
const {
  Camera,
  Monitor,
  Disc,
  Square,
  Lock,
  Eye,
  X,
  Upload,
} = LucideIcons as any;
import { soundService } from "../services/soundService";

interface Props {
  onClose: () => void;
  onSave: (
    blob: Blob,
    type: "DIGITAL" | "PHYSICAL",
    metadata: { name: string; description: string },
    events: any[]
  ) => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export const LucaRecorder: React.FC<Props> = ({ onClose, onSave, theme }) => {
  const themePrimary = theme?.primary || "text-cyan-400";
  const themeHex = theme?.hex || "#06b6d4";
  const [mode, setMode] = useState<"DIGITAL" | "PHYSICAL">("DIGITAL");
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [duration, setDuration] = useState(0);
  const [events, setEvents] = useState<any[]>([]);

  // --- SOURCE SELECTION STATE ---
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [availableSources, setAvailableSources] = useState<any[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- SAVE DETAILS STATE ---
  const [showSaveDetails, setShowSaveDetails] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [skillDescription, setSkillDescription] = useState("");

  // --- STREAM HANDLING ---
  const initDigitalStream = async () => {
    try {
      if (window.luca && window.luca.triggerScreenPermission) {
        const sources = await window.luca.triggerScreenPermission();
        if (sources && sources.length > 0) {
          setAvailableSources(sources);
          setShowSourcePicker(true);
        } else {
          // Fallback to standard API if no sources returned (or not in Electron)
          const newStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false,
            // @ts-expect-error: Non-standard constraint
            cursor: "always",
          });
          handleStreamSuccess(newStream);
        }
      } else {
        // Not in Electron or missing bridge
        const newStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
          // @ts-expect-error: Non-standard constraint
          cursor: "always",
        });
        handleStreamSuccess(newStream);
      }
    } catch (err) {
      console.error("Digital stream init failed:", err);
      soundService.play("ALERT");
    }
  };

  const selectSource = async (sourceId: string) => {
    try {
      setShowSourcePicker(false);
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-expect-error: Non-standard constraint
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: sourceId,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080,
          },
        },
      });
      handleStreamSuccess(newStream);
    } catch (err) {
      console.error("Source selection failed:", err);
      soundService.play("ALERT");
    }
  };

  const startStream = async () => {
    if (mode === "DIGITAL") {
      await initDigitalStream();
    } else {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });
        handleStreamSuccess(newStream);
      } catch (err) {
        console.error("Physical stream init failed:", err);
        soundService.play("ALERT");
      }
    }
  };

  const handleStreamSuccess = (newStream: MediaStream) => {
    setStream(newStream);
    if (videoRef.current) {
      videoRef.current.srcObject = newStream;
    }
    // Handle stream stop
    newStream.getVideoTracks()[0].onended = () => {
      stopRecording();
    };
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // --- RECORDING ---
  const startRecording = () => {
    if (!stream) return;

    chunksRef.current = [];
    setEvents([]);

    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      // Instead of saving immediately, show details modal
      stopStream();
      setShowSaveDetails(true);
    };

    recorder.start(1000); // 1s chunks
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    soundService.play("PROCESSING");

    // Start Timer
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    // Start Event Listeners for Digital Mode
    if (mode === "DIGITAL") {
      attachEventListeners();
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      soundService.play("SUCCESS");
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    detachEventListeners();
  };

  const handleFinalSave = () => {
    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    const finalEvents = mode === "DIGITAL" ? events : [];

    onSave(
      blob,
      mode,
      { name: skillName, description: skillDescription },
      finalEvents
    );
    onClose();
  };

  // --- EVENT LOGGING (DIGITAL MODE) ---
  const attachEventListeners = () => {
    window.addEventListener("click", handleGlobalClick, true);
    window.addEventListener("keydown", handleGlobalKeydown, true);
  };

  const detachEventListeners = () => {
    window.removeEventListener("click", handleGlobalClick, true);
    window.removeEventListener("keydown", handleGlobalKeydown, true);
  };

  const handleGlobalClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // Basic selector generation
    const selector = target.id ? `#${target.id}` : target.tagName.toLowerCase();

    setEvents((prev) => [
      ...prev,
      {
        type: "click",
        timestamp: Date.now(),
        selector: selector,
        text: target.innerText?.substring(0, 20) || "",
        x: e.clientX,
        y: e.clientY,
      },
    ]);
  };

  const handleGlobalKeydown = (e: KeyboardEvent) => {
    // SECURE INPUT MASKING
    const target = e.target as HTMLElement;
    const isPassword =
      target instanceof HTMLInputElement && target.type === "password";

    setEvents((prev) => [
      ...prev,
      {
        type: "keydown",
        timestamp: Date.now(),
        key: isPassword ? "[REDACTED]" : e.key,
        isSecure: isPassword,
      },
    ]);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
      detachEventListeners();
    };
  }, []);

  // Format duration
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-0 sm:p-4 font-mono">
      {/* Liquid background effect 1 (Center) */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none transition-all duration-700 -z-10"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${themeHex}25, transparent 60%)`,
          filter: "blur(40px)",
        }}
      />
      {/* Liquid background effect 2 (Top Right Offset) */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none transition-all duration-700 -z-10"
        style={{
          background: `radial-gradient(circle at 80% 20%, ${themeHex}15, transparent 50%)`,
          filter: "blur(40px)",
        }}
      />

      <div
        className={`relative w-full h-[90vh] sm:w-[95%] max-w-6xl bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl transition-all`}
        style={{
          boxShadow: `0 0 100px -20px ${themeHex}40`,
          borderColor: `${themeHex}30`,
        }}
      >
        {" "}
        {/* SAVE DETAILS OVERLAY */}
        {showSaveDetails && (
          <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in overflow-y-auto">
            {/* Liquid background for overlay */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none transition-all duration-700"
              style={{
                background: `radial-gradient(circle at center, ${themeHex}1a, transparent 70%)`,
              }}
            />

            <div className="w-full max-w-md space-y-4 sm:space-y-6 my-auto py-8 relative z-10">
              <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3 tracking-wider">
                <Disc
                  className="text-red-500 animate-pulse size-6 sm:size-7"
                  style={{
                    filter: "drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))",
                  }}
                />
                RECORDING COMPLETE
              </h3>

              <div className="space-y-2">
                <label className="text-[10px] sm:text-xs font-bold text-slate-400 tracking-widest uppercase flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-cyan-400" /> SKILL
                  NAME
                </label>
                <input
                  type="text"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder="e.g., Crypto Trading Routine"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 sm:p-4 text-white text-sm outline-none transition-all focus:border-cyan-500/50 focus:bg-white/5 focus:shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)] placeholder:text-slate-600"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] sm:text-xs font-bold text-slate-400 tracking-widest uppercase flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-cyan-400" />{" "}
                  DESCRIPTION / GOAL
                </label>
                <textarea
                  value={skillDescription}
                  onChange={(e) => setSkillDescription(e.target.value)}
                  placeholder="Describe what you demonstrated so LUCA understands..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 sm:p-4 text-white text-sm h-32 sm:h-40 resize-none outline-none transition-all focus:border-cyan-500/50 focus:bg-white/5 focus:shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)] placeholder:text-slate-600"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 font-mono">
                <button
                  onClick={handleFinalSave}
                  disabled={!skillName}
                  className={`order-1 sm:order-2 flex-1 py-3 sm:py-4 font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                    skillName
                      ? "text-white shadow-lg active:scale-95 hover:scale-[1.02]"
                      : "bg-slate-800/50 text-slate-500 cursor-not-allowed border border-white/5"
                  }`}
                  style={
                    skillName
                      ? {
                          background: `linear-gradient(135deg, ${themeHex}, ${themeHex}cc)`,
                          boxShadow: `0 0 30px ${themeHex}4d`,
                          border: `1px solid ${themeHex}88`,
                        }
                      : {}
                  }
                >
                  <Upload size={16} /> SAVE IMPRINT
                </button>
                <button
                  onClick={() => {
                    setShowSaveDetails(false);
                    onClose();
                  }}
                  className="order-2 sm:order-1 flex-1 py-3 sm:py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold rounded-xl border border-white/10 transition-colors"
                >
                  DISCARD
                </button>
              </div>
            </div>
          </div>
        )}
        {/* SOURCE PICKER OVERLAY */}
        {showSourcePicker && (
          <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in rounded-2xl overflow-hidden">
            <div
              className="absolute inset-0 opacity-20 pointer-events-none transition-all duration-700"
              style={{
                background: `radial-gradient(circle at center, ${themeHex}1a, transparent 70%)`,
              }}
            />
            <div className="p-4 sm:p-8 flex-1 flex flex-col min-h-0 relative z-10">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center gap-3 tracking-wider flex-shrink-0">
                <Monitor className={themePrimary} size={24} /> SELECT SOURCE
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 overflow-y-auto pb-8 p-2 min-h-0">
                {availableSources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => selectSource(source.id)}
                    className="group relative h-40 sm:h-auto sm:aspect-video bg-black/60 rounded-xl border border-white/10 transition-all overflow-hidden flex flex-col hover:shadow-2xl hover:-translate-y-1 hover:border-cyan-500/50 hover:z-10 flex-shrink-0"
                  >
                    <div className="flex-1 w-full relative overflow-hidden p-4 flex items-center justify-center bg-white/[0.02]">
                      <img
                        src={source.thumbnail}
                        alt={source.name}
                        className="max-w-full max-h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity drop-shadow-2xl"
                      />
                    </div>
                    <div className="h-10 bg-white/5 border-t border-white/5 flex items-center justify-center px-3 w-full backdrop-blur-sm group-hover:bg-cyan-500/10 transition-colors flex-shrink-0">
                      <span className="text-[10px] text-slate-300 truncate font-mono w-full text-center group-hover:text-cyan-400 block min-w-0">
                        {source.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 sm:p-6 border-t border-white/5 bg-black/40 backdrop-blur-md flex justify-end relative z-10 flex-shrink-0">
              <button
                onClick={() => setShowSourcePicker(false)}
                className="w-full sm:w-auto px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-colors"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
        {/* Header */}
        <div
          className="h-16 sm:h-20 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 backdrop-blur-xl relative"
          style={{ backgroundColor: `${themeHex}1F` }}
        >
          <div className="flex items-center gap-4 overflow-hidden">
            <div
              className={`p-2 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-inner flex-shrink-0 ${
                isRecording
                  ? "animate-pulse border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  : ""
              }`}
            >
              {isRecording ? (
                <Disc size={20} className="text-red-500" />
              ) : (
                <Eye
                  size={20}
                  className={themePrimary.replace("text-", "text-")}
                  style={{ color: themeHex }}
                />
              )}
            </div>

            <div className="overflow-hidden">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-widest truncate flex items-center gap-2">
                TRAIN LUCA
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-normal tracking-normal uppercase hidden xs:inline-block">
                  Sensory Input
                </span>
              </h2>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-mono">
                {isRecording ? (
                  <span className="text-red-400 font-bold flex items-center gap-2 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    RECORDING: {formatTime(duration)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    STATUS: STANDBY
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="relative z-50 p-2.5 hover:bg-white/10 rounded-full transition-all flex-shrink-0 cursor-pointer active:scale-95 border border-transparent hover:border-white/10 group"
          >
            <X
              size={20}
              className="sm:size-6 text-slate-400 group-hover:text-white transition-colors"
            />
          </button>
        </div>
        {/* Main Content */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col-reverse sm:flex-row gap-4 sm:gap-6 overflow-y-auto sm:overflow-hidden lg:items-stretch font-mono relative z-10">
          {/* Left: Controls */}
          <div className="w-full sm:w-72 space-y-4 sm:space-y-6 flex-shrink-0">
            {/* Mode Selector */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase flex items-center gap-2 pl-1">
                <span className="w-1 h-1 rounded-full bg-white/20" /> TRAINING
                MODE
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => !isRecording && setMode("DIGITAL")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all group ${
                    mode === "DIGITAL"
                      ? `bg-white/10 text-white`
                      : "bg-white/[0.02] border-white/5 text-slate-500 hover:bg-white/5 hover:border-white/10 disabled:opacity-50"
                  }`}
                  style={
                    mode === "DIGITAL"
                      ? {
                          borderColor: themeHex,
                          boxShadow: `0 0 20px -5px ${themeHex}40`,
                        }
                      : {}
                  }
                  disabled={isRecording}
                >
                  <Monitor
                    size={20}
                    className={`group-hover:scale-110 transition-transform ${
                      mode === "DIGITAL" ? "text-cyan-400" : ""
                    }`}
                  />
                  <span className="text-[9px] font-bold tracking-wider">
                    DIGITAL
                  </span>
                </button>
                <button
                  onClick={() => !isRecording && setMode("PHYSICAL")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all group ${
                    mode === "PHYSICAL"
                      ? `bg-white/10 text-white`
                      : "bg-white/[0.02] border-white/5 text-slate-500 hover:bg-white/5 hover:border-white/10 disabled:opacity-50"
                  }`}
                  style={
                    mode === "PHYSICAL"
                      ? {
                          borderColor: themeHex,
                          boxShadow: `0 0 20px -5px ${themeHex}40`,
                        }
                      : {}
                  }
                  disabled={isRecording}
                >
                  <Camera
                    size={20}
                    className={`group-hover:scale-110 transition-transform ${
                      mode === "PHYSICAL" ? "text-cyan-400" : ""
                    }`}
                  />
                  <span className="text-[9px] font-bold tracking-wider">
                    PHYSICAL
                  </span>
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-3xl -mr-4 -mt-4 transition-transform group-hover:scale-150 duration-700" />
              <h3 className="text-[10px] font-bold text-white mb-2 flex items-center gap-2 uppercase tracking-wider relative z-10">
                {mode === "DIGITAL" ? (
                  <Lock
                    size={12}
                    className={themePrimary.replace("text-", "text-")}
                    style={{ color: themeHex }}
                  />
                ) : (
                  <Eye
                    size={12}
                    className={themePrimary.replace("text-", "text-")}
                    style={{ color: themeHex }}
                  />
                )}
                {mode === "DIGITAL" ? "SECURE CAPTURE" : "VISUAL ANALYSIS"}
              </h3>
              <p className="text-[10px] text-slate-400 leading-relaxed font-mono relative z-10">
                {mode === "DIGITAL"
                  ? "Screen & click tracking active. Passwords masked. Perform the task for automation."
                  : "Technique analysis active. Ensure good lighting and clear action visibility."}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 mt-auto">
              {!stream ? (
                <button
                  onClick={startStream}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/10 hover:border-white/20 shadow-lg hover:shadow-xl group"
                >
                  <Eye
                    size={16}
                    className="group-hover:text-cyan-400 transition-colors"
                  />{" "}
                  INITIALIZE SENSORS
                </button>
              ) : !isRecording ? (
                <button
                  onClick={startRecording}
                  className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_-5px_rgba(239,68,68,0.6)] active:scale-95 animate-pulse"
                >
                  <Disc size={18} /> START IMPRINTING
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-white/10 transition-all active:scale-95 hover:border-white/30 shadow-[0_0_20px_-5px_rgba(255,255,255,0.1)]"
                >
                  <Square size={14} fill="currentColor" /> STOP REPLAY
                </button>
              )}
            </div>
          </div>

          {/* Right: Preview */}
          <div className="flex-1 min-h-[220px] sm:min-h-0 bg-black/40 rounded-xl border border-white/10 overflow-hidden relative group aspect-video sm:aspect-auto flex items-center justify-center shadow-inner">
            {/* Scanline effect */}
            <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(0,0,0,0.3)_50%,transparent_100%)] bg-[length:100%_4px] pointer-events-none opacity-20" />

            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="max-w-full max-h-full object-contain relative z-10"
            />

            {!stream && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-700 flex-col gap-4">
                <div className="w-16 h-16 rounded-full border border-white/5 flex items-center justify-center bg-white/[0.02] shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)]">
                  {mode === "DIGITAL" ? (
                    <Monitor size={32} className="opacity-20 text-white" />
                  ) : (
                    <Camera size={32} className="opacity-20 text-white" />
                  )}
                </div>
                <span className="font-mono text-[9px] tracking-widest uppercase opacity-40 text-slate-500">
                  SIGNAL OFFLINE
                </span>
              </div>
            )}

            {/* Overlay Info */}
            {isRecording && (
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-[9px] font-bold text-white flex items-center gap-2 border border-red-500/30 shadow-lg z-20">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                LIVE DATA FEED
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
