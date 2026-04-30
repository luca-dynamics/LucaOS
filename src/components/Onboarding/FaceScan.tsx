import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { useMobile } from "../../hooks/useMobile";
import { soundService } from "../../services/soundService";
import { apiUrl } from "../../config/api";
import VisionCameraModal from "../VisionCameraModal";
import { setHexAlpha } from "../../config/themeColors";

interface FaceScanProps {
  userName: string;
  onComplete: (faceData: string | null) => void;
  onSkip: () => void;
  isLightTheme: boolean;
  theme: any;
  title?: string;
  description?: string;
  enrollmentEndpoint?: string;
  confirmMessage?: string;
  hideHeader?: boolean;
  compact?: boolean;
}

/**
 * Face scan component for operator recognition
 * Captures operator's face for security verification
 */
const FaceScan: React.FC<FaceScanProps> = ({
  userName,
  onComplete,
  onSkip,
  isLightTheme,
  theme,
  title = "Facial Recognition Setup",
  description,
  enrollmentEndpoint,
  confirmMessage,
  hideHeader = false,
  compact = false,
}) => {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useMobile();

  // Theme-aware colors removed in favor of Dynamic Contrast Variables (CSS)
  const bgCard = "bg-transparent";
  const bgIcon = "bg-transparent";

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
      <div className="space-y-6 animate-fade-in-up w-full max-w-2xl text-center">
        <div
          className="w-20 h-20 mx-auto border rounded-full flex items-center justify-center glass-blur"
          style={{
            borderColor: theme ? setHexAlpha(theme.hex, 0.3) : "var(--app-border-main)",
            backgroundColor: "var(--app-bg-tint)",
            boxShadow: theme ? `0 0 20px ${setHexAlpha(theme.hex, 0.2)}` : "none",
          }}
        >
          <Icon
            name="Camera"
            variant="Linear"
            className="w-10 h-10"
            style={{ color: theme ? theme.hex : "var(--app-text-muted)" }}
          />
        </div>
        <p className="text-sm" style={{ color: "var(--app-text-muted)" }}>
          No camera detected. Skipping facial recognition setup...
        </p>
      </div>
    );
  }

  // Scanning animation overlay
  if (scanning && capturedImage) {
    return (
      <div className="space-y-6 animate-fade-in-up w-full max-w-2xl">
        <div className="relative">
          {/* Captured image */}
          <img
            src={`data:image/jpeg;base64,${capturedImage}`}
            alt="Captured face"
            className="w-full max-w-md mx-auto rounded-lg border-2 shadow-2xl"
            style={{
              borderColor: theme ? setHexAlpha(theme.hex, 0.5) : "var(--app-primary)",
            }}
          />

          {/* Scanning overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="absolute inset-0 animate-scan-line"
              style={{
                background: theme
                  ? `linear-gradient(to bottom, transparent, ${setHexAlpha(theme.hex, 0.2)}, transparent)`
                  : `linear-gradient(to bottom, transparent, var(--app-primary), transparent)`,
                opacity: 0.3,
              }}
            />

            {/* Scan grid effect */}
            <div
              className="absolute inset-0 bg-[size:20px_20px]"
              style={{
                backgroundImage: theme
                  ? `linear-gradient(${setHexAlpha(theme.hex, 0.1)} 1px, transparent 1px), linear-gradient(90deg, ${setHexAlpha(theme.hex, 0.1)} 1px, transparent 1px)`
                  : `linear-gradient(var(--app-primary) 1px, transparent 1px), linear-gradient(90deg, var(--app-primary) 1px, transparent 1px)`,
                opacity: 0.15,
              }}
            />

            {/* Corner brackets */}
            <div
              className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 animate-pulse"
              style={{ borderColor: theme?.hex || "var(--app-primary)" }}
            />
            <div
              className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 animate-pulse"
              style={{ borderColor: theme?.hex || "var(--app-primary)" }}
            />
            <div
              className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 animate-pulse"
              style={{ borderColor: theme?.hex || "var(--app-primary)" }}
            />
            <div
              className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 animate-pulse"
              style={{ borderColor: theme?.hex || "var(--app-primary)" }}
            />

            {/* Center scanning icon */}
            <div
              className="glass-blur rounded-lg border px-6 py-3"
              style={{
                borderColor: theme ? setHexAlpha(theme.hex, 0.5) : "var(--app-border-main)",
                backgroundColor: isLightTheme ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.6)",
              }}
            >
              <div className="flex items-center gap-3">
                <Icon
                  name="MinimalisticMagnifer"
                  variant="Linear"
                  className="animate-pulse"
                  style={{ color: theme?.hex || "var(--app-primary)", width: "1.25rem", height: "1.25rem" }}
                />
                <span
                  className="font-mono"
                  style={{ color: theme?.hex || "var(--app-primary)", fontSize: "0.875rem" }}
                >
                  {enrollmentEndpoint
                    ? "ENROLLING BIOMETRIC DATA..."
                    : "SCANNING BIOMETRIC DATA..."}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-sm animate-pulse" style={{ color: "var(--app-text-muted)" }}>
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
      <div className="space-y-6 animate-fade-in-up w-full max-w-2xl text-center">
        <div className="w-24 h-24 mx-auto bg-red-500/10 border-2 border-red-500 rounded-full flex items-center justify-center glass-blur">
          <Icon name="CheckCircle" variant="Linear" className="w-12 h-12 text-red-500 rotate-45" />
        </div>
        <h3 
          className="text-xl font-bold"
          style={{ color: "var(--app-text-main)" }}
        >
          Enrollment Failed
        </h3>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  // Confirmation state
  if (confirmed && capturedImage) {
    return (
      <div className="space-y-6 animate-fade-in-up w-full max-w-2xl text-center">
        <div className="w-24 h-24 mx-auto bg-green-500/10 border-2 border-green-500 rounded-full flex items-center justify-center glass-blur animate-scale-in">
          <Icon name="CheckCircle" variant="Linear" className="w-12 h-12 text-green-500" />
        </div>

        <div className="space-y-2">
          <h3 
            className="text-xl font-bold"
            style={{ color: "var(--app-text-main)" }}
          >
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

        <p 
          className="text-xs"
          style={{ color: "var(--app-text-muted)" }}
        >
          Proceeding to next step...
        </p>
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
      } animate-fade-in-up w-full max-w-2xl mx-auto transition-all`}
    >
      {/* Luca's Introduction */}
      {!hideHeader && (
        <div className={`text-center ${compact ? "space-y-0.5" : "space-y-4"}`}>
          <div
            className={`${compact ? (isMobile ? "w-8 h-8" : "w-12 h-12") : "w-20 h-20"} ${bgIcon} border rounded-full flex items-center justify-center glass-blur transition-all mx-auto`}
            style={{
              backgroundColor: "var(--app-bg-tint)",
              borderColor: theme ? setHexAlpha(theme.hex, 0.3) : "var(--app-border-main)",
              boxShadow: theme
                ? `0 0 20px ${setHexAlpha(theme.hex, 0.2)}`
                : "0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 0 0 1px var(--app-border-main)",
            }}
          >
            <Icon
              name="Camera"
              variant="Linear"
              style={{
                width: compact ? (isMobile ? "1rem" : "1.5rem") : "2.5rem",
                height: compact ? (isMobile ? "1rem" : "1.5rem") : "2.5rem",
                color: theme ? theme.hex : "var(--app-text-main)",
              }}
            />
          </div>

          <h2
            className="font-bold uppercase tracking-widest transition-all"
            style={{ 
              fontSize: "clamp(1rem, 4vmin, 1.75rem)",
              color: "var(--app-text-main)"
            }}
          >
            {title}
          </h2>

          <p
            className="max-w-md mx-auto transition-all pt-0.5 leading-tight opacity-80"
            style={{ 
              fontSize: compact
                ? isMobile
                  ? "8.5px"
                  : "11px"
                : "0.875rem",
              color: "var(--app-text-muted)"
            }}
          >
            {defaultDescription}
          </p>
        </div>
      )}

      <div
        className={`${bgCard} border rounded-xl glass-blur shadow-inner transition-all ${
          compact
            ? isMobile
              ? "p-1.5 space-y-0.5"
              : "p-3 space-y-1.5"
            : "p-5 space-y-3"
        }`}
        style={{ 
          borderColor: "var(--app-border-main)",
          color: "var(--app-text-main)",
          backgroundColor: "var(--app-bg-tint)"
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-green-500/10"
          >
            <Icon
              name="CheckCircle"
              size={compact ? 9 : 14}
              variant="Linear"
              className="text-green-500/80"
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
            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-green-500/10"
          >
            <Icon
              name="CheckCircle"
              size={compact ? 9 : 14}
              variant="Linear"
              className="text-green-500/80"
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
            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-green-500/10"
          >
            <Icon
              name="CheckCircle"
              size={compact ? 9 : 14}
              variant="Linear"
              className="text-green-500/80"
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
      <div className={`flex flex-col ${compact ? (isMobile ? "gap-1" : "gap-2") : "gap-3"}`}>
        <button
          onClick={() => setShowCamera(true)}
          className={`
            w-full
            max-w-sm mx-auto
            border
            rounded-xl
            uppercase
            tracking-[0.2em]
            font-bold
            transition-all
            flex
            items-center
            justify-center
            ${compact ? (isMobile ? "gap-1.5" : "gap-3") : "gap-3"}
            glass-blur
            active:scale-[0.98]
            shadow-lg
            group
            bg-[var(--app-primary)]/10 hover:bg-[var(--app-primary)]/20
          `}
          style={{
            padding: compact
              ? isMobile
                ? "0.5rem 0"
                : "0.75rem 0"
              : "1rem 0",
            fontSize: compact
              ? isMobile
                ? "9px"
                : "10px"
              : "0.75rem",
            color: "var(--app-primary)",
            borderColor: theme ? setHexAlpha(theme.hex, 0.3) : "var(--app-primary)",
            boxShadow: theme
              ? `0 0 30px ${setHexAlpha(theme.hex, 0.2)}`
              : "0 0 20px -10px rgba(255,255,255,0.3)",
          }}
        >
          <Icon
            name="Camera"
            variant="Linear"
            size={compact ? (isMobile ? 12 : 14) : 18}
            className="group-hover:scale-110 transition-transform text-[var(--app-primary)]"
            style={{ color: theme?.hex || "var(--app-primary)" }}
          />
          Capture My Face
        </button>

        <button
          onClick={onSkip}
          className={`
            w-full
            max-w-xs mx-auto
            bg-transparent
            border
            rounded-lg
            font-medium
            transition-all
            flex
            items-center
            justify-center
            gap-1.5
            opacity-60 hover:opacity-100
          `}
          style={{
            padding: compact
              ? isMobile
                ? "0.25rem 0"
                : "0.5rem 0"
              : "0.75rem 0",
            fontSize: compact
              ? isMobile
                ? "9px"
                : "10px"
              : "0.75rem",
            color: "var(--app-text-muted)",
            borderColor: "var(--app-border-main)"
          }}
        >
          <Icon name="AltArrowRight" variant="BoldDuotone" style={{ width: "2vmin", height: "2vmin" }} />
          Skip for Now
        </button>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <VisionCameraModal
          onClose={() => setShowCamera(false)}
          onCapture={handleCapture}
        />
      )}
    </div>
  );
};

export default FaceScan;
