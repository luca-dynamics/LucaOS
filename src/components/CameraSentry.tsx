import React, { useEffect, useRef } from "react";
import { apiUrl } from "../config/api";
import { settingsService } from "../services/settingsService";

interface CameraSentryProps {
  active: boolean;
  instruction?: string | null;
  intervalMs?: number;
}

/**
 * CameraSentry - The "Room Guard"
 * A headless component that captures webcam frames and sends them to Gemini
 * for security analysis.
 */
export const CameraSentry: React.FC<CameraSentryProps> = ({
  active,
  instruction,
  intervalMs = 10000, // Default 10s check for quota safety
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    const checkPrivacy = () => {
      const settings = settingsService.getSettings();
      if (settings.privacy && settings.privacy.cameraEnabled === false) {
        console.warn("[CAMERA_SENTRY] 🔒 CAMERA LOCKED: Blocked by Privacy");
        stopCamera();
        return false;
      }
      return true;
    };

    if (!active || !checkPrivacy()) {
      stopCamera();
      return;
    }

    startCamera();

    // Listen for privacy changes
    const handlePrivacyChange = (settings: any) => {
      if (settings.privacy && settings.privacy.cameraEnabled === false) {
        stopCamera();
      }
    };
    settingsService.on("settings-changed", handlePrivacyChange);

    return () => {
      stopCamera();
      settingsService.off("settings-changed", handlePrivacyChange);
    };
  }, [active]);

  // Capture Loop
  useEffect(() => {
    if (active && streamRef.current) {
      if (intervalRef.current) clearInterval(intervalRef.current);

      console.log(
        `[CAMERA_SENTRY] Starting Room Guard. Interval: ${intervalMs}ms. Instruction: ${instruction || "General Security"}`,
      );

      intervalRef.current = setInterval(() => {
        captureAndAnalyze();
      }, intervalMs);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, instruction, intervalMs]);

  const startCamera = async () => {
    try {
      if (streamRef.current) return; // Already running

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment", // Prefer back camera if available
        },
      });
      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Mute it locally just in case
        videoRef.current.muted = true;
      }
      console.log("[CAMERA_SENTRY] Webcam uplink established.");
    } catch (err) {
      console.error("[CAMERA_SENTRY] Failed to access webcam:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    console.log("[CAMERA_SENTRY] Webcam uplink terminated.");
  };

  const captureAndAnalyze = () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Capture
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    // Convert to Blob/Base64
    const base64 = canvasRef.current.toDataURL("image/jpeg", 0.7);

    // SEND TO BACKEND via Fetch
    // IPC is cleaner for Electron, but Fetch is universal and we just made the endpoint.
    // Also, handling "instruction" which is now passed in.

    const visionModel =
      settingsService.get("brain")?.visionModel || "gemini-3-flash-preview";

    fetch(`${apiUrl}/api/vision/sentry-analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64.split(",")[1], // Clean base64
        mode: "ROOM_GUARD",
        customInstruction: instruction,
        model: visionModel,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (
          data.status === "success" &&
          data.events &&
          data.events.length > 0
        ) {
          console.log(`[CAMERA_SENTRY] Events detected:`, data.events);
          // Trigger local alert sound if CRITICAL
          if (data.events.some((e: any) => e.priority === "CRITICAL")) {
            // Dispatch event for App.tsx to handle
            const event = new CustomEvent("sentry-alert", {
              detail: data.events,
            });
            window.dispatchEvent(event);
          }
        }
      })
      .catch((err) => {
        console.error("[CAMERA_SENTRY] Analysis fetch failed:", err);
      });
  };

  // Render hidden video element
  return (
    <div style={{ display: "none" }}>
      <video ref={videoRef} autoPlay playsInline muted />
      <canvas ref={canvasRef} />
    </div>
  );
};
