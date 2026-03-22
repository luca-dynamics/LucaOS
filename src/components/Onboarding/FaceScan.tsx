import React, { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
const {
  Camera,
  CheckCircle,
  SkipForward,
  Scan,
  Check,
} = LucideIcons as any;
import VisionCameraModal from "../VisionCameraModal";
import { soundService } from "../../services/soundService";
import { useMobile } from "../../hooks/useMobile";
import { apiUrl } from "../../config/api";
import { setHexAlpha } from "../../config/themeColors";

interface FaceScanProps {
  userName: string;
  onComplete: (faceData: string | null) => void;
  onSkip: () => void;
  title?: string;
  description?: string;
  enrollmentEndpoint?: string;
  confirmMessage?: string;
  hideHeader?: boolean;
  compact?: boolean;
  isLightTheme?: boolean;
  theme?: {
    primary: string;
    hex: string;
  };
}

/**
 * Face scan component for operator recognition
 * Captures operator's face for security verification
 */
const FaceScan: React.FC<FaceScanProps> = ({
  userName,
  onComplete,
  onSkip,
  title = "Facial Recognition Setup",
  description,
  enrollmentEndpoint,
  confirmMessage,
  hideHeader = false,
  compact = false,
  isLightTheme = false,
  theme,
}) => {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useMobile();

  // Theme-aware colors
  const textMuted = isLightTheme ? "text-slate-700" : "text-white/60";
  const textBody = isLightTheme ? "text-slate-800" : "text-white/80";
  const textHeading = isLightTheme ? "text-slate-900" : "text-white";
  const bgCard = isLightTheme ? "bg-slate-200/60" : "bg-white/5";
  const bgIcon = isLightTheme ? "bg-slate-200" : "bg-white/10";

  const defaultDescription =
    description ||
    `Hey ${userName}! I'd like to remember your face so I can recognize you in the future. This helps me verify it's really you when you use advanced features.`;

  // Check if camera is available
  useEffect(() => {
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some((d) => d.kind === "videoinput");
        setCameraAvailable(hasCamera);

        // Auto-skip if no camera
        if (!hasCamera) {
          setTimeout(() => onSkip(), 2000);
        }
      } catch {
        setCameraAvailable(false);
        setTimeout(() => onSkip(), 2000);
      }
    };

    checkCamera();
  }, [onSkip]);

  const handleCapture = async (base64Image: string, providedVector?: number[]) => {
    setCapturedImage(base64Image);
    setShowCamera(false);
    setScanning(true);
    soundService.play("PROCESSING");

    // Perform Enrollment if endpoint provided
    let enrollmentSuccessful = true;
    if (enrollmentEndpoint) {
      try {
        console.log("[FACESCAN] Initializing Zero-Image enrollment...");
        
        let vector = providedVector;

        if (!vector) {
          console.log("[FACESCAN] No vector provided, performing on-device extraction...");
          // 1. Create an image element to process
          const img = new Image();
          img.src = `data:image/jpeg;base64,${base64Image}`;
          await new Promise((resolve) => (img.onload = resolve));

          // 2. Extract Biometric Vector (On-Device)
          const { biometricService } = await import("../../services/biometricService");
          vector = (await biometricService.extractFaceEmbedding(img)) || undefined;
        }

        if (!vector) {
          throw new Error("Failed to generate biometric descriptor");
        }

        // 3. Send Vector to Backend (Zero-Image Protocol)
        const res = await fetch(apiUrl(enrollmentEndpoint), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: userName,
            vector: vector,
          }),
        });
        if (!res.ok) enrollmentSuccessful = false;
      } catch (err) {
        console.error("[FaceScan] Biometric extraction/enrollment failed:", err);
        enrollmentSuccessful = false;
      }
    }

    setScanning(false);

    if (enrollmentSuccessful) {
      setConfirmed(true);
      soundService.play("SUCCESS");
      speakConfirmation();

      // Complete after showing confirmation
      setTimeout(() => {
        onComplete(base64Image);
      }, 2000);
    } else {
      setError("Enrollment failed. Please try again.");
      soundService.play("ALERT");
      setTimeout(() => {
        setCapturedImage(null);
        setError(null);
      }, 3000);
    }
  };

  const speakConfirmation = () => {
    const messages = [
      confirmMessage || `Perfect! I've got your face saved, ${userName}.`,
      `Face recognized and stored securely, ${userName}.`,
    ];

    const message =
      messages[
        Math.floor(Math.random() * (confirmMessage ? 1 : messages.length))
      ];

    // Try to use speech synthesis
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!cameraAvailable) {
    return (
      <div className="animate-fade-in-up w-full text-center flex flex-col items-center" style={{ gap: "4vmin" }}>
        <div
          className={`${bgIcon} border rounded-full flex items-center justify-center backdrop-blur-xl`}
          style={{
            width: "clamp(4rem, 15vmin, 6rem)",
            height: "clamp(4rem, 15vmin, 6rem)",
            borderColor: theme ? setHexAlpha(theme.hex, 0.5) : undefined,
          }}
        >
          <Camera className={textMuted} style={{ width: "8vmin", height: "8vmin" }} />
        </div>
        <p 
          className={textMuted}
          style={{ fontSize: "clamp(0.6rem, 2vmin, 0.9rem)" }}
        >
          No camera detected. Skipping facial recognition setup...
        </p>
      </div>
    );
  }

  // Scanning animation overlay
  if (scanning && capturedImage) {
    return (
      <div className="animate-fade-in-up w-full flex flex-col items-center" style={{ gap: "4vmin" }}>
        <div className="relative w-full flex justify-center">
          {/* Captured image */}
          <img
            src={`data:image/jpeg;base64,${capturedImage}`}
            alt="Captured face"
            className="rounded-lg border-2 shadow-2xl"
            style={{
              width: "clamp(12rem, 50vmin, 20rem)",
              height: "clamp(12rem, 50vmin, 20rem)",
              objectFit: "cover",
              borderColor: theme ? setHexAlpha(theme.hex, 0.5) : undefined,
            }}
          />

          {/* Scanning overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="absolute inset-0 animate-scan-line"
              style={{
                background: theme
                  ? `linear-gradient(to bottom, transparent, ${setHexAlpha(theme.hex, 0.2)}, transparent)`
                  : undefined,
              }}
            />

            {/* Scan grid effect */}
            <div
              className="absolute inset-0 bg-[size:20px_20px]"
              style={{
                backgroundImage: theme
                  ? `linear-gradient(${setHexAlpha(theme.hex, 0.1)} 1px, transparent 1px), linear-gradient(90deg, ${setHexAlpha(theme.hex, 0.1)} 1px, transparent 1px)`
                  : undefined,
              }}
            />

            {/* Corner brackets */}
            <div
              className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 animate-pulse"
              style={{ borderColor: theme?.hex }}
            />
            <div
              className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 animate-pulse"
              style={{ borderColor: theme?.hex }}
            />
            <div
              className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 animate-pulse"
              style={{ borderColor: theme?.hex }}
            />
            <div
              className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 animate-pulse"
              style={{ borderColor: theme?.hex }}
            />

            {/* Center scanning icon */}
            <div
              className={`${isLightTheme ? "bg-white/80" : "bg-black/60"} backdrop-blur-sm rounded-[1.5vmin] border`}
              style={{
                borderColor: theme ? setHexAlpha(theme.hex, 0.5) : undefined,
                padding: "1.5vmin 3vmin",
              }}
            >
              <div className="flex items-center" style={{ gap: "1.5vmin" }}>
                <Scan
                  className="animate-pulse"
                  style={{ color: theme?.hex, width: "3vmin", height: "3vmin" }}
                />
                <span
                  className="font-mono"
                  style={{ color: theme?.hex, fontSize: "clamp(0.5rem, 1.8vmin, 0.8rem)" }}
                >
                  {enrollmentEndpoint
                    ? "ENROLLING BIOMETRIC DATA..."
                    : "SCANNING BIOMETRIC DATA..."}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className={`text-center ${textMuted} text-sm animate-pulse`}>
          {enrollmentEndpoint
            ? "Registering identity with local core..."
            : "Processing facial recognition data..."}
        </p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="space-y-6 animate-fade-in-up w-full max-w-xl text-center">
        <div className="w-24 h-24 mx-auto bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center backdrop-blur-xl">
          <CheckCircle className="w-12 h-12 text-red-500 rotate-45" />
        </div>
        <h3 className={`text-xl font-bold ${textHeading}`}>
          Enrollment Failed
        </h3>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  // Confirmation state
  if (confirmed && capturedImage) {
    return (
      <div className="space-y-6 animate-fade-in-up w-full max-w-xl text-center">
        <div className="w-24 h-24 mx-auto bg-green-500/20 border-2 border-green-500 rounded-full flex items-center justify-center backdrop-blur-xl animate-scale-in">
          <Check className="w-12 h-12 text-green-500" />
        </div>

        <div className="space-y-2">
          <h3 className={`text-xl font-bold ${textHeading}`}>
            Face Recognized!
          </h3>
          <p className="text-green-500 text-sm">
            {confirmMessage ||
              `Perfect! I've got your face saved, ${userName}.`}
          </p>
        </div>

        <img
          src={`data:image/jpeg;base64,${capturedImage}`}
          alt="Your face"
          className="w-32 h-32 mx-auto rounded-lg border-2 border-green-500/50 object-cover"
        />

        <p className={`${textMuted} text-xs`}>Proceeding to next step...</p>
      </div>
    );
  }

  return (
    <div
      className={`${
        compact
          ? isMobile
            ? "space-y-1"
            : "space-y-3"
          : isMobile
            ? "space-y-4"
            : "space-y-6"
      } animate-fade-in-up w-full max-w-xl mx-auto transition-all`}
    >
      {/* Luca's Introduction */}
      {!hideHeader && (
        <div className={`text-center ${compact ? "space-y-0.5" : "space-y-4"}`}>
          <div
            className={`${bgIcon} border rounded-full flex items-center justify-center backdrop-blur-xl transition-all mx-auto`}
            style={{
              width: "clamp(3rem, 12vmin, 5rem)",
              height: "clamp(3rem, 12vmin, 5rem)",
              borderColor: theme
                ? setHexAlpha(theme.hex, 0.3)
                : isLightTheme
                  ? "rgba(0,0,0,0.2)"
                  : "rgba(255,255,255,0.2)",
              boxShadow: theme
                ? `0 0 20px ${setHexAlpha(theme.hex, 0.2)}`
                : "none",
            }}
          >
            <Camera
              style={{
                width: "6vmin",
                height: "6vmin",
                color: theme
                  ? theme.hex
                  : isLightTheme
                    ? "rgba(0,0,0,0.6)"
                    : "rgba(255,255,255,0.8)",
              }}
            />
          </div>

          <h2
            className={`font-bold uppercase tracking-widest ${textHeading} transition-all`}
            style={{ fontSize: "clamp(1rem, 4vmin, 1.75rem)" }}
          >
            {title}
          </h2>

          <p
            className={`${textMuted} max-w-md mx-auto transition-all pt-0.5 leading-tight`}
            style={{ fontSize: "clamp(0.55rem, 1.8vmin, 0.85rem)" }}
          >
            {defaultDescription}
          </p>
        </div>
      )}

      <div
        className={`${bgCard} border rounded-xl ${
          compact
            ? isMobile
              ? "p-1.5 space-y-0.5"
              : "p-3 space-y-1.5"
            : "p-5 space-y-3"
        } backdrop-blur-xl ${textBody} shadow-inner transition-all`}
        style={{ borderColor: theme ? setHexAlpha(theme.hex, 0.15) : undefined }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: theme ? `${theme.hex}1a` : "rgba(34, 197, 94, 0.1)" }}
          >
            <CheckCircle
              size={compact ? 9 : 14}
              style={{ color: theme ? theme.hex : "rgba(34, 197, 94, 0.8)" }}
            />
          </div>
          <span
            className={`${compact ? "text-[9px]" : "text-xs"} leading-tight`}
          >
            Photo is processed locally and stays on your device (never uploaded)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div 
            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: theme ? `${theme.hex}1a` : "rgba(34, 197, 94, 0.1)" }}
          >
            <CheckCircle
              size={compact ? 9 : 14}
              style={{ color: theme ? theme.hex : "rgba(34, 197, 94, 0.8)" }}
            />
          </div>
          <span
            className={`${compact ? "text-[9px]" : "text-xs"} leading-tight`}
          >
            Used exclusively for high-security verification protocols
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div 
            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: theme ? `${theme.hex}1a` : "rgba(34, 197, 94, 0.1)" }}
          >
            <CheckCircle
              size={compact ? 9 : 14}
              style={{ color: theme ? theme.hex : "rgba(34, 197, 94, 0.8)" }}
            />
          </div>
          <span
            className={`${compact ? "text-[9px]" : "text-xs"} leading-tight`}
          >
            Revocable at any time through System Settings
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col w-full" style={{ gap: "2vmin" }}>
        <button
          onClick={() => setShowCamera(true)}
          className={`
            w-full max-w-sm mx-auto
            ${isLightTheme ? "bg-slate-200/80 hover:bg-slate-300/80" : "bg-white/10 hover:bg-white/20"} 
            border 
            ${textHeading} 
            rounded-[1.5vmin] 
            uppercase 
            tracking-[0.2em] 
            font-bold
            transition-all 
            flex 
            items-center 
            justify-center 
            backdrop-blur-xl
            active:scale-[0.98]
            shadow-lg
            group
          `}
          style={{
            padding: "2.5vmin 0",
            gap: "2vmin",
            fontSize: "clamp(0.6rem, 1.8vmin, 0.85rem)",
            borderColor: theme
              ? setHexAlpha(theme.hex, 0.3)
              : isLightTheme
                ? "rgba(0,0,0,0.2)"
                : "rgba(255,255,255,0.3)",
            boxShadow: theme
              ? `0 0 30px ${setHexAlpha(theme.hex, 0.2)}`
              : "0 0 20px -10px rgba(255,255,255,0.3)",
          }}
        >
          <Camera
            style={{ color: theme?.hex, width: "3vmin", height: "3vmin" }}
            className="group-hover:scale-110 transition-transform"
          />
          Capture My Face
        </button>

        <button
          onClick={onSkip}
          className={`
            w-full max-w-xs mx-auto
            bg-transparent 
            border ${isLightTheme ? "border-slate-300" : "border-white/5"} 
            ${isLightTheme ? "hover:bg-slate-100 hover:border-slate-400" : "hover:bg-white/5 hover:border-white/20"} 
            ${isLightTheme ? "text-slate-700 hover:text-slate-900 border-slate-400" : "text-white/50 hover:text-white/80"}
            rounded-[1.2vmin] 
            font-medium
            transition-all 
            flex 
            items-center 
            justify-center 
          `}
          style={{
            padding: "1.5vmin 0",
            gap: "1.5vmin",
            fontSize: "clamp(0.5rem, 1.5vmin, 0.75rem)"
          }}
        >
          <SkipForward style={{ width: "2vmin", height: "2vmin" }} />
          Skip for Now
        </button>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <VisionCameraModal
          onClose={() => setShowCamera(false)}
          onCapture={handleCapture}
          theme={theme}
        />
      )}
    </div>
  );
};

export default FaceScan;
