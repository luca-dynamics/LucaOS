import React, { useEffect, useRef } from "react";
import { presenceService, UserPresence } from "../../services/presenceService";
import { settingsService } from "../../services/settingsService";

interface PresenceMonitorProps {
  onPresenceChange?: (presence: UserPresence, mood?: string) => void;
  dutyCycleMs?: number;
  active: boolean;
}

/**
 * PresenceMonitor - The "Autonomous Eye"
 * Headless component that manages webcam access and performs local
 * face detection to track user presence and mood.
 */
export const PresenceMonitor: React.FC<PresenceMonitorProps> = ({
  onPresenceChange,
  dutyCycleMs = 1000, // Default 1 FPS for watching
  active,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<any>(null);
  const lastPresence = useRef<UserPresence>("ABSENT");

  useEffect(() => {
    if (active) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => stopMonitoring();
  }, [active]);

  // Handle duty cycle changes
  useEffect(() => {
    if (active && streamRef.current) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(performCheck, dutyCycleMs);
    }
  }, [dutyCycleMs, active]);

  const startMonitoring = async () => {
    const privacy = settingsService.get("privacy");
    if (!privacy?.cameraEnabled) {
      console.warn("[PRESENCE] 🔒 Monitoring blocked by privacy settings.");
      return;
    }

    try {
      await presenceService.initialize();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: 5 }, // Low res is enough for detection
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Start polling
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(performCheck, dutyCycleMs);
      console.log(
        `[PRESENCE] Monitoring started (Duty Cycle: ${dutyCycleMs}ms)`,
      );
    } catch (err) {
      console.error("[PRESENCE] Initialization/Stream failed:", err);
    }
  };

  const stopMonitoring = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    console.log("[PRESENCE] Monitoring stopped.");
  };

  const performCheck = () => {
    if (!videoRef.current || !streamRef.current) return;

    const result = presenceService.detectPresence(videoRef.current);

    if (result.presence !== lastPresence.current) {
      console.log(
        `[PRESENCE] State Change: ${lastPresence.current} -> ${result.presence} (Mood: ${result.mood})`,
      );
      lastPresence.current = result.presence;
      onPresenceChange?.(result.presence, result.mood);
    }
  };

  return (
    <div style={{ display: "none" }}>
      <video ref={videoRef} autoPlay playsInline muted />
    </div>
  );
};
