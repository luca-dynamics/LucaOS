import React, { useState, useRef, useEffect } from "react";
import { Icon } from "./ui/Icon";
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

  const initDigitalStream = async () => {
    try {
      if (window.luca?.triggerScreenPermission) {
        const sources = await window.luca.triggerScreenPermission();
        if (sources?.length > 0) {
          setAvailableSources(sources);
          setShowSourcePicker(true);
        } else {
          const newStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
          handleStreamSuccess(newStream);
        }
      } else {
        const newStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        handleStreamSuccess(newStream);
      }
    } catch (err) {
      console.error("Stream init failed:", err);
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
        const newStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true });
        handleStreamSuccess(newStream);
      } catch (err) {
        console.error("Physical stream failed:", err);
        soundService.play("ALERT");
      }
    }
  };

  const handleStreamSuccess = (newStream: MediaStream) => {
    setStream(newStream);
    if (videoRef.current) videoRef.current.srcObject = newStream;
    newStream.getVideoTracks()[0].onended = () => stopRecording();
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    setEvents([]);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => { stopStream(); setShowSaveDetails(true); };
    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    soundService.play("PROCESSING");
    setDuration(0);
    timerRef.current = setInterval(() => setDuration((prev) => prev + 1), 1000);
    if (mode === "DIGITAL") attachEventListeners();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
      soundService.play("SUCCESS");
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    detachEventListeners();
  };

  const handleFinalSave = () => {
    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    onSave(blob, mode, { name: skillName, description: skillDescription }, mode === "DIGITAL" ? events : []);
    onClose();
  };

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
    setEvents((prev) => [...prev, {
      type: "click",
      timestamp: Date.now(),
      selector: target.id ? `#${target.id}` : target.tagName.toLowerCase(),
      text: target.innerText?.substring(0, 20) || "",
      x: e.clientX,
      y: e.clientY,
    }]);
  };

  const handleGlobalKeydown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isPassword = target instanceof HTMLInputElement && target.type === "password";
    setEvents((prev) => [...prev, {
      type: "keydown",
      timestamp: Date.now(),
      key: isPassword ? "[REDACTED]" : e.key,
      isSecure: isPassword,
    }]);
  };

  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
      detachEventListeners();
    };
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      
      <div className="relative w-full h-[90vh] sm:w-[95%] max-w-6xl bg-[#080808] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="h-16 flex-shrink-0 border-b border-white/10 flex items-center justify-between px-6 bg-[#111111]/50">
          <div className="flex items-center gap-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isRecording ? "animate-pulse" : ""}`} style={{ backgroundColor: isRecording ? "#ef444415" : `${themeHex}15` }}>
              <Icon name={isRecording ? "Record" : "Eye"} size={20} style={{ color: isRecording ? "#ef4444" : themeHex }} variant="BoldDuotone" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base tracking-wide flex items-center gap-2">
                Train Luca
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-500 font-normal">Sensory Input</span>
              </h2>
              <div className="flex items-center gap-3 mt-0.5 text-[10px] font-mono">
                {isRecording ? (
                  <span className="text-red-500 font-bold flex items-center gap-1.5 animate-pulse">
                    <span className="w-1 h-1 rounded-full bg-red-500" /> RECORDING: {formatTime(duration)}
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                    <span className="w-1 h-1 rounded-full bg-slate-700" /> System Standby
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={() => { stopStream(); onClose(); }} className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors border border-transparent hover:border-white/10">
            <Icon name="X" size={18} className="text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          
          {/* Controls Sidebar */}
          <div className="w-full sm:w-72 border-b sm:border-b-0 sm:border-r border-white/10 bg-[#111111]/30 p-6 flex flex-col gap-6">
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Select Mode</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => !isRecording && setMode("DIGITAL")}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${mode === "DIGITAL" ? "bg-white/[0.08] border-white/20" : "bg-transparent border-transparent hover:bg-white/[0.03] text-slate-500"}`}
                  disabled={isRecording}
                >
                  <Icon name="Monitor" size={20} style={mode === "DIGITAL" ? { color: themeHex } : {}} variant="BoldDuotone" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Digital</span>
                </button>
                <button
                  onClick={() => !isRecording && setMode("PHYSICAL")}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${mode === "PHYSICAL" ? "bg-white/[0.08] border-white/20" : "bg-transparent border-transparent hover:bg-white/[0.03] text-slate-500"}`}
                  disabled={isRecording}
                >
                  <Icon name="Camera" size={20} style={mode === "PHYSICAL" ? { color: themeHex } : {}} variant="BoldDuotone" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Physical</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl">
              <h4 className="text-[10px] font-bold text-white mb-2 uppercase tracking-wider flex items-center gap-2">
                <Icon name="Info" size={12} style={{ color: themeHex }} /> {mode === "DIGITAL" ? "Secure Capture" : "Visual Analysis"}
              </h4>
              <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
                {mode === "DIGITAL" 
                  ? "Screen & interaction tracking enabled. Passwords automatically masked for security." 
                  : "Technique analysis mode. High resolution visual capture for physical movement imprinting."}
              </p>
            </div>

            <div className="mt-auto space-y-3">
              {!stream ? (
                <button
                  onClick={startStream}
                  className="w-full py-3.5 bg-white font-bold text-black text-xs rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95"
                >
                  <Icon name="Play" size={14} fill="black" /> INITIALIZE SENSORS
                </button>
              ) : !isRecording ? (
                <button
                  onClick={startRecording}
                  className="w-full py-3.5 font-bold text-white text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/20 active:scale-95"
                  style={{ background: "#ef4444" }}
                >
                  <Icon name="Record" size={16} variant="BoldDuotone" /> START IMPRINTING
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="w-full py-3.5 bg-white/[0.08] border border-white/10 text-white font-bold text-xs rounded-xl hover:bg-white/[0.12] transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95"
                >
                  <Icon name="Stop" size={14} fill="currentColor" variant="BoldDuotone" /> STOP CAPTURE
                </button>
              )}
            </div>
          </div>

          {/* Main Preview */}
          <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden group">
            {/* Minimal overlays */}
            <div className="absolute inset-0 pointer-events-none z-10 border border-white/5" />
            
            <video ref={videoRef} autoPlay muted playsInline className="max-w-full max-h-full object-contain relative z-20" />

            {!stream && (
              <div className="flex flex-col items-center gap-4 text-slate-800">
                <div className="w-16 h-16 rounded-2xl border border-white/5 bg-white/[0.01] flex items-center justify-center">
                  <Icon name={mode === "DIGITAL" ? "Monitor" : "Camera"} size={32} className="opacity-10" variant="BoldDuotone" />
                </div>
                <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40">Sensor Standby</span>
              </div>
            )}

            {isRecording && (
              <div className="absolute top-6 left-6 z-30 px-3 py-1.5 bg-black/60 border border-red-500/30 rounded-lg text-[9px] font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> LIVE DATA FEED
              </div>
            )}
          </div>
        </div>

        {/* OVERLAY: Source Picker */}
        {showSourcePicker && (
          <div className="absolute inset-0 z-[60] bg-[#050505] flex flex-col animate-in fade-in">
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-8">
              <h3 className="text-white font-bold text-base tracking-wide flex items-center gap-3">
                <Icon name="Monitor" size={20} style={{ color: themeHex }} variant="BoldDuotone" /> Select Capture Source
              </h3>
              <button onClick={() => setShowSourcePicker(false)} className="p-2 hover:bg-white/5 rounded-lg">
                <Icon name="X" size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 custom-scrollbar">
              {availableSources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => selectSource(source.id)}
                  className="group flex flex-col bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition-all hover:-translate-y-1 shadow-lg"
                >
                  <div className="aspect-video w-full bg-black/40 flex items-center justify-center p-4">
                    <img src={source.thumbnail} alt={source.name} className="max-h-full max-w-full object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-4 text-center border-t border-white/5 bg-white/[0.02]">
                    <span className="text-[11px] text-slate-400 font-mono group-hover:text-white transition-colors">{source.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* OVERLAY: Save Details */}
        {showSaveDetails && (
          <div className="absolute inset-0 z-[60] bg-[#050505]/95 flex flex-col items-center justify-center p-8 animate-in fade-in">
            <div className="w-full max-w-md space-y-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/10 mx-auto mb-4 flex items-center justify-center">
                  <Icon name="Record" size={32} className="text-red-500" variant="BoldDuotone" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">Capture Complete</h3>
                <p className="text-slate-500 text-xs mt-1">Define this imprint to save it to Luca skill matrix</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Skill Name</label>
                  <input
                    type="text"
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    placeholder="e.g., Data Entry Protocol"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-4 text-white text-sm outline-none transition-all focus:border-white/20 focus:bg-white/[0.06] placeholder:text-slate-700"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Description / Goal</label>
                  <textarea
                    value={skillDescription}
                    onChange={(e) => setSkillDescription(e.target.value)}
                    placeholder="Describe what occurred during the demonstration..."
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-4 text-white text-sm h-32 resize-none outline-none transition-all focus:border-white/20 focus:bg-white/[0.06] placeholder:text-slate-700"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => { setShowSaveDetails(false); onClose(); }}
                  className="flex-1 py-4 bg-white/[0.04] border border-white/10 text-slate-400 font-bold text-xs rounded-xl hover:bg-white/[0.08] hover:text-white transition-all flex items-center justify-center"
                >
                  DISCARD
                </button>
                <button
                  onClick={handleFinalSave}
                  disabled={!skillName}
                  className="flex-1 py-4 bg-white text-black font-bold text-xs rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:hover:bg-white"
                >
                  <Icon name="Upload" size={14} fill="black" /> SAVE IMPRINT
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
