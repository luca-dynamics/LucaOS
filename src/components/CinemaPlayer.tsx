import React, { useState, useEffect, useRef } from "react";
import { Icon } from "./ui/Icon";
import { SubsystemPulse } from "./visual/SubsystemPulse";

// Electron webview type declaration is now in src/types/jsx.d.ts

interface CinemaPlayerProps {
  videoUrl?: string;
  videoStream?: MediaStream | null;
  title?: string;
  onClose?: () => void;
  sourceType?: "youtube" | "local" | "stream" | "file" | "mirror" | "webview"; // Added 'webview' for DRM
  themeColor?: string;
}

const CinemaPlayer: React.FC<CinemaPlayerProps> = ({
  videoUrl = "",
  videoStream = null,
  title = "Cinema Ready",
  onClose,
  sourceType = "stream",
  themeColor = "#ffffff",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const webviewRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(100);
  const [activeColor, setActiveColor] = useState("rgba(6, 182, 212, 0.4)");
  const [showControls, setShowControls] = useState(true);

  // Update active color based on prop
  useEffect(() => {
    // Simple hex to rgba conversion for glow effects
    const hex = themeColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    setActiveColor(`rgba(${r}, ${g}, ${b}, 0.4)`);
  }, [themeColor]);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // --- REAL AUDIO VISUALIZER (Web Audio API) ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize Audio Context (Lazy load on user interaction/play effectively)
    if (!audioContextRef.current) {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }

    const audioCtx = audioContextRef.current;

    // Connect to Video Element (Once Only)
    if (videoRef.current && !sourceRef.current && isPlaying) {
      try {
        // Check for CORS on the video element if it's a URL
        if (
          videoUrl &&
          !videoUrl.startsWith("blob:") &&
          !videoUrl.startsWith("file:")
        ) {
          videoRef.current.crossOrigin = "anonymous";
        }

        sourceRef.current = audioCtx.createMediaElementSource(videoRef.current);
        analyserRef.current = audioCtx.createAnalyser();

        // Configuration
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;

        // Connect Graph: Source -> Analyser -> Destination (Speakers)
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioCtx.destination);

        // Resume context if suspended (browser policy)
        if (audioCtx.state === "suspended") {
          audioCtx.resume();
        }
      } catch (e) {
        console.warn(
          "[VisualCore] AudioContext connection failed (likely CORS or Source already connected):",
          e
        );
      }
    }

    // Animation Loop
    let animationId: number;
    const bufferLength = analyserRef.current
      ? analyserRef.current.frequencyBinCount
      : 64;
    const dataArray = new Uint8Array(bufferLength);
    const bars = 64; // Rendered bars

    const draw = () => {
      if (!isPlaying || !analyserRef.current) {
        // Fallback/Simulated view if AudioAPI failed (e.g. CORS) or execution paused
        // But here we just stop rendering or render flat line
        if (!isPlaying) {
          animationId = requestAnimationFrame(draw);
          return;
        }
      }

      // Get Data
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width / bars;

      for (let i = 0; i < bars; i++) {
        // Map frequency data to bars. We use lower frequencies (bass) mostly as they look better.
        // We step through the dataArray which has 128 bins (fft 256 / 2).
        // We want to map roughly the first ~64 bins to the 64 bars.

        let value = 0;
        if (analyserRef.current) {
          value = dataArray[i]; // Direct mapping for simplicity
          // Optional: Scale/Boost
          value = value * 1.2;
        } else {
          // Fallback Simulation if analyser failed (maintain aesthetics)
          const time = Date.now() / 300;
          value = Math.abs(Math.sin(time + i * 0.2)) * 100 * Math.random();
        }

        const percent = value / 255;
        const height = canvas.height * 0.9 * percent;

        const gradient = ctx.createLinearGradient(
          0,
          canvas.height,
          0,
          canvas.height - height
        );
        // Use theme color for base
        gradient.addColorStop(0, activeColor.replace("0.4", "0.9")); // Strong base
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.4)"); // White top tip

        ctx.fillStyle = gradient;
        // Draw rounded top bar
        if (height > 2) {
          ctx.fillRect(i * width, canvas.height - height, width - 4, height);
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, activeColor, videoUrl]);

  // --- MEDIASTREAM ATTACHMENT (for Ghost Mirror mode) ---
  useEffect(() => {
    if (videoStream && videoRef.current) {
      videoRef.current.srcObject = videoStream;
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(console.error);
    } else if (videoRef.current && !videoStream) {
      videoRef.current.srcObject = null;
    }
  }, [videoStream]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black font-sans"
      onMouseMove={handleMouseMove}
      onClick={handleMouseMove}
    >
      <div className="relative w-full h-full">
        {/* Main Video Layer - Priority: videoStream > videoUrl > idle */}
        {videoStream ? (
          // Mirror Mode - MediaStream from Ghost Browser
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            onTimeUpdate={() =>
              videoRef.current && setCurrentTime(videoRef.current.currentTime)
            }
            onLoadedMetadata={() =>
              videoRef.current && setDuration(videoRef.current.duration)
            }
            onEnded={() => setIsPlaying(false)}
            autoPlay
            playsInline
          />
        ) : !videoUrl ? (
          // Waiting for content - Ethereal State
          <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
            <SubsystemPulse color={themeColor} amplitude={0.2} opacity={0.4} blur={120} />
            
            <div className="relative z-10 flex flex-col items-center">
              <div
                className="text-7xl font-medium tracking-tight mb-4 animate-in fade-in slide-in-from-bottom-8 duration-1000"
                style={{ color: "white", textShadow: `0 0 40px ${themeColor}40` }}
              >
                Cinema
              </div>
              <div className="text-white/30 font-bold text-[10px] tracking-[0.4em] uppercase">
                Awaiting Content Stream
              </div>
              
              <div className="mt-12 flex gap-4">
                <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl text-[10px] font-bold text-white/50 tracking-widest uppercase">
                  4K HDR // READY
                </div>
                <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl text-[10px] font-bold text-white/50 tracking-widest uppercase">
                  SPATIAL AUDIO // ENABLED
                </div>
              </div>
            </div>
          </div>
        ) : sourceType === "webview" ? (
          // DRM content - Electron webview with Widevine support (Netflix, Disney+, etc.)
          <webview
            ref={webviewRef}
            src={videoUrl}
            style={{ width: "100%", height: "100%" }}
            {...({
              allowpopups: "true",
              plugins: "true",
              webpreferences: "nodeIntegration=no,contextIsolation=yes",
            } as any)}
          />
        ) : sourceType === "local" ||
          sourceType === "file" ||
          sourceType === "stream" ? (
          // Direct video URL playback
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            onTimeUpdate={() =>
              videoRef.current && setCurrentTime(videoRef.current.currentTime)
            }
            onLoadedMetadata={() =>
              videoRef.current && setDuration(videoRef.current.duration)
            }
            onEnded={() => setIsPlaying(false)}
            loop
          />
        ) : sourceType === "youtube" ? (
          // YouTube embed
          <iframe
            ref={iframeRef}
            src={videoUrl}
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media"
          />
        ) : (
          // Default iframe for other embeds
          <iframe
            ref={iframeRef}
            src={videoUrl}
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media"
          />
        )}

        {/* Audio Visualizer Overlay */}
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="absolute bottom-0 left-0 w-full h-64 opacity-50 pointer-events-none mix-blend-screen"
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-50 p-3 rounded-full bg-black/50 text-white hover:bg-white hover:text-black transition-all glass-blur"
        >
          <Icon name="Maximize" className="rotate-45" size={24} />
        </button>

        {/* PREMIUM CONTROLS OVERLAY */}
        <div
          className={`absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-4xl z-40 transition-all duration-700 ease-out ${
            showControls
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <div 
            className="rounded-[32px] p-8 border border-white/10 backdrop-blur-[40px] shadow-2xl flex flex-col gap-6"
            style={{ 
              background: "rgba(0, 0, 0, 0.4)",
              boxShadow: `0 30px 60px -12px rgba(0,0,0,0.5), inset 0 0 0 1px ${themeColor}15`
            }}
          >
            {/* Progress Bar */}
            <div className="w-full h-1 bg-white/10 rounded-full cursor-pointer hover:h-2 transition-all group/progress relative">
              <div
                className="h-full rounded-full relative"
                style={{
                  width: `${(currentTime / duration) * 100}%`,
                  background: `linear-gradient(to right, ${themeColor}, white)`,
                  boxShadow: `0 0 20px ${themeColor}40`,
                }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-2xl opacity-0 group-hover/progress:opacity-100 transition-opacity" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-white font-medium text-2xl tracking-tight leading-none mb-2">
                  {title}
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-white/30 tracking-widest uppercase">
                    {sourceType?.toUpperCase()} {/* 4K_MASTERY */}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-[10px] font-mono text-white/50">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
              </div>

              {/* Center Controls */}
              <div className="flex items-center gap-8">
                <button
                  className="text-white/40 hover:text-white transition-all hover:scale-110 active:scale-95"
                  onClick={() => videoRef.current && (videoRef.current.currentTime -= 10)}
                >
                  <Icon name="SkipBack" size={28} />
                </button>

                <button
                  onClick={togglePlay}
                  className="w-16 h-16 flex items-center justify-center rounded-full bg-white text-black hover:scale-[1.05] active:scale-95 transition-all shadow-2xl"
                  style={{ boxShadow: `0 0 30px ${themeColor}40` }}
                >
                  {isPlaying ? (
                    <Icon name="Pause" size={32} fill="currentColor" />
                  ) : (
                    <Icon name="Play" size={32} fill="currentColor" className="ml-1" />
                  )}
                </button>

                <button
                  className="text-white/40 hover:text-white transition-all hover:scale-110 active:scale-95"
                  onClick={() => videoRef.current && (videoRef.current.currentTime += 10)}
                >
                  <Icon name="SkipForward" size={28} />
                </button>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-6 text-white/40">
                <Icon
                  name="Volume2"
                  size={24}
                  className="hover:text-white cursor-pointer transition-colors"
                  onClick={() => {
                    if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
                  }}
                />
                <Icon
                  name="Maximize"
                  size={24}
                  className="hover:text-white cursor-pointer transition-colors"
                  onClick={() => document.documentElement.requestFullscreen()}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CinemaPlayer;
