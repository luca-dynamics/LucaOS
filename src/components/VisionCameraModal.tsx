import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Icon } from "./ui/Icon";
import { useMobile } from "../hooks/useMobile";
import { soundService } from "../services/soundService";
import { biometricService } from "../services/biometricService";

interface Props {
  onClose: () => void;
  onCapture: (base64Image: string, vector?: number[]) => void;
  onLiveAnalyze?: (base64Image: string) => Promise<string>;
}

const VisionCameraModal: React.FC<Props> = ({
  onClose,
  onCapture,
  onLiveAnalyze,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, setStream] = useState<MediaStream | null>(null);
  const [analyzing] = useState(false);
  const isMobile = useMobile();

  const [cameraReady, setCameraReady] = useState(false);
  const [, setCameraError] = useState<string | null>(null);
  const [neuralLock, setNeuralLock] = useState({ x: 50, y: 50, scale: 1 });
  const [hudGlow, setHudGlow] = useState(false);

  // Apple-style Scan State
  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState<"scanning" | "success" | "fail">("scanning");
  const [detectionFailureCount, setDetectionFailureCount] = useState(0);
  const lastVectorRef = useRef<number[] | null>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const startCamera = async () => {
      setCameraReady(false);
      setCameraError(null);

      const isFaceCapture = !onLiveAnalyze;
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      const isMobileDevice = isIOS || isAndroid || isMobile;

      const preferredFacingMode = isFaceCapture ? "user" : isMobileDevice ? "environment" : "user";

      const constraints = [
        { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: preferredFacingMode } },
        { video: { facingMode: preferredFacingMode } },
        { video: true },
      ];

      for (const constraint of constraints) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia(constraint);
          activeStream = mediaStream;
          setStream(mediaStream);

          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().then(() => setCameraReady(true)).catch(console.error);
            };
          }
          return;
        } catch (err) {
          console.warn("[CAMERA] Failed constraint:", constraint, err);
        }
      }
      setCameraError("Camera access failed.");
    };

    startCamera();
    soundService.play("HOVER");

    const lockTimer = setTimeout(() => {
      setNeuralLock({ x: 50, y: 42, scale: 1.25 });
      setHudGlow(true);
    }, 1200);

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      clearTimeout(lockTimer);
    };
  }, [isMobile, onLiveAnalyze]);

  // --- Real-time Biometric Tracking Loop ---
  useEffect(() => {
    let frameId: number;
    let isMounted = true;

    const trackFace = async () => {
      if (!isFaceScanning || !isMounted) return;

      if (videoRef.current && cameraReady && videoRef.current.readyState >= 2) {
        try {
          // Offload detection to the specialized service
          const vector = await biometricService.extractFaceEmbedding(videoRef.current);
          
          if (vector && isMounted) {
            // Success: Increment progress
            setScanProgress((prev: number) => Math.min(prev + 1.8, 100)); // ~2% per successful frame
            setDetectionFailureCount(0);
            lastVectorRef.current = vector;
            
            // Jitter the neural lock for visual tracking effect
            setNeuralLock((prev: any) => ({
              ...prev,
              x: 50 + (Math.random() * 0.8 - 0.4),
              y: 42 + (Math.random() * 0.8 - 0.4)
            }));
          } else if (isMounted) {
            setDetectionFailureCount((prev: number) => prev + 1);
          }
        } catch (e) {
          console.warn("[BIO] Tracking glitch:", e);
        }
      }

      // Schedule next frame ONLY after previous one finishes (important for heavy ML)
      if (isFaceScanning && isMounted) {
        frameId = requestAnimationFrame(trackFace);
      }
    };

    if (isFaceScanning) {
      console.log("[BIO] Starting biometric tracking sequence...");
      trackFace();
    }

    return () => {
      isMounted = false;
      cancelAnimationFrame(frameId);
    };
  }, [isFaceScanning, cameraReady]);

  // Handle Scan Completion
  useEffect(() => {
    if (scanProgress >= 100 && isFaceScanning && scanStatus !== "success") {
      setScanStatus("success");
      soundService.play("SUCCESS");
      
      // Auto-capture after brief delay to show success state
      const timer = setTimeout(() => {
        finalizeCapture();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [scanProgress, isFaceScanning, scanStatus]);

  const finalizeCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext("2d");
    if (context) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const base64 = canvasRef.current.toDataURL("image/jpeg", 0.9).split(",")[1];
      onCapture(base64, lastVectorRef.current || undefined);
      onClose();
    }
  };

  const startScan = () => {
    if (!cameraReady) return;
    setIsFaceScanning(true);
    setScanProgress(0);
    setScanStatus("scanning");
    soundService.play("PROCESSING");
  };

  const handleCaptureClick = () => {
    if (onLiveAnalyze) {
      // Direct capture for Astra mode
      finalizeCapture();
    } else {
      // Face Scan mode for Uplink
      if (isFaceScanning) {
        // Force capture if scan hangs
        finalizeCapture();
      } else {
        startScan();
      }
    }
  };

  const content = (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center overflow-hidden font-mono select-none">
      {/* Camera Feed Layer */}
      <div className="absolute inset-0 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-all duration-[2000ms] ease-out ${isFaceScanning ? "brightness-125 saturate-150" : "opacity-90"}`}
          style={{
            objectPosition: `${neuralLock.x}% ${neuralLock.y}%`,
            transform: `scaleX(-1) scale(${neuralLock.scale})`,
          }}
        />
      </div>

      {/* HUD Overlay Layer */}
      <div className="absolute inset-0 pointer-events-none p-6 md:p-12 flex flex-col justify-between z-30">
        {/* Top HUD */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1 drop-shadow-lg">
            <div
              className={`flex items-center gap-2 transition-all duration-500`}
              style={{
                color: "#ffffff",
                textShadow: isFaceScanning ? "0 0 20px #ffffff" : "0 0 10px rgba(255,255,255,0.8)"
              }}
            >
              <Icon name="Target" size={isMobile ? 18 : 24} />
              <span className="text-[11px] md:text-sm tracking-[0.4em] font-black uppercase">
                {isFaceScanning ? "SCANNING_IDENTITY_MATRIX" : "VISION UPLINK ACTIVE"}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="pointer-events-auto p-3 rounded-full border text-white/60 hover:text-white hover:bg-white/10 glass-blur transition-all border-white/10"
          >
            <Icon name="CloseCircle" size={isMobile ? 20 : 28} />
          </button>
        </div>

        {/* Apple-Style Scan Ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {isFaceScanning ? (
             <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
                {/* Outer Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="50%" cy="50%" r="48%"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="4"
                  />
                  <motion.circle
                    cx="50%" cy="50%" r="48%"
                    fill="none"
                    stroke={scanStatus === "success" ? "var(--app-primary)" : "#ffffff"}
                    strokeWidth="6"
                    pathLength={100}
                    strokeDasharray="100 100"
                    initial={{ strokeDashoffset: 100 }}
                    animate={{ strokeDashoffset: 100 - scanProgress }}
                    transition={{ type: "spring", damping: 25, stiffness: 60 }}
                  />
                </svg>

                {/* Scan HUD Elements */}
                <div className="absolute inset-0 flex items-center justify-center">
                   {scanStatus === "success" ? (
                      <div className="flex flex-col items-center gap-2 text-[var(--app-primary)]">
                        <Icon name="CheckCircle" size={48} className="animate-bounce" />
                        <span className="text-[10px] font-bold tracking-widest">VERIFIED</span>
                      </div>
                   ) : (
                      <div 
                        className="relative w-full h-full border rounded-full flex items-center justify-center border-white/10"
                      >
                         <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 bg-black px-2 text-[8px] text-white/40">BIO_LOCK</div>
                         {detectionFailureCount > 40 ? ( <div className="flex flex-col items-center gap-1 text-yellow-500 animate-pulse"> <Icon name="Danger" size={32} /> <span className="text-[8px] font-bold">LOW VISIBILITY</span> </div> ) : ( <Icon name="Activity" className="text-white/20 animate-pulse" size={40} /> )}
                      </div>
                   )}
                </div>
             </div>
          ) : (
            /* Traditional Crosshair Reticle (Idle) */
            <div 
              className={`w-48 h-48 md:w-80 md:h-80 border-2 rounded-2xl flex items-center justify-center transition-all duration-1000 ${hudGlow ? 'scale-110 opacity-100' : 'scale-90 opacity-0'}`}
              style={{ borderColor: "rgba(255,255,255,0.3)" }}
            >
               <Icon 
                 name="Target"
                 className="animate-spin-slow" 
                 size={48} 
                 style={{ color: "rgba(255,255,255,0.3)" }} 
               />
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="flex items-center justify-center relative gap-12 md:gap-20 pointer-events-auto pb-8">
          <button
            onClick={handleCaptureClick}
            disabled={analyzing || !cameraReady}
            className={`group relative flex items-center justify-center transition-all active:scale-90 ${!cameraReady ? "opacity-50" : ""}`}
          >
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 group-hover:scale-105 transition-all duration-300" style={{ borderColor: "#ffffff" }}></div>
            <div className={`absolute w-16 h-16 md:w-20 md:h-20 rounded-full transition-all shadow-inner shadow-black/20 ${isFaceScanning ? 'animate-ping' : ''}`} style={{ backgroundColor: "#ffffff" }}></div>
            <Icon name="Aperture" size={32} className="absolute text-black/40 group-hover:rotate-180 transition-all duration-700" />
          </button>
        </div>
      </div>

      {/* Post-Processing Effects */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[size:100%_3px,3px_100%] z-40 opacity-50"></div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  return createPortal(content, document.body);
};

export default VisionCameraModal;
