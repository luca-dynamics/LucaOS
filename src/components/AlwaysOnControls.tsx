/**
 * Always-On Controls Component
 * UI buttons for controlling Always-On Vision and Audio monitoring
 */

import React, { useState, useEffect } from "react";
import { Hand, Radio } from "lucide-react";
import { apiUrl } from "../config/api";

interface Props {
  onVisionToggle: (active: boolean) => void;
  onAudioToggle: (active: boolean) => void;
  isMobile?: boolean;
  isWakeWordActive?: boolean;
  theme: { hex: string; bg: string; borderColor: string; primary: string };
}

const AlwaysOnControls: React.FC<Props> = ({
  onVisionToggle,
  onAudioToggle,
  isMobile = false,
  isWakeWordActive = false,
  theme,
}) => {
  const [visionActive, setVisionActive] = useState(false);
  const [audioActive, setAudioActive] = useState(false);
  const [loading, setLoading] = useState({ vision: false, audio: false });

  // Fetch status on mount and periodically
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      // Fetch vision status
      const visionRes = await fetch(apiUrl("/api/vision/status"));
      if (visionRes.ok) {
        const contentType = visionRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const text = await visionRes.text();
          if (text) {
            try {
              const visionData = JSON.parse(text);
              // Only update local UI state, don't trigger activation callback
              // This prevents auto-activation during polling
              setVisionActive(visionData.running || false);
              // REMOVED: onVisionToggle(visionData.running || false);
            } catch (parseError) {
              console.warn(
                "[AlwaysOnControls] Failed to parse vision status JSON:",
                parseError,
              );
            }
          }
        }
      }

      // Fetch audio status
      const audioRes = await fetch(apiUrl("/api/audio/status"));
      if (audioRes.ok) {
        const contentType = audioRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const text = await audioRes.text();
          if (text) {
            try {
              const audioData = JSON.parse(text);
              setAudioActive(audioData.isRunning || false);
              onAudioToggle(audioData.isRunning || false);
            } catch (parseError) {
              console.warn(
                "[AlwaysOnControls] Failed to parse audio status JSON:",
                parseError,
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("[AlwaysOnControls] Failed to fetch status:", error);
    }
  };

  const handleVisionToggle = async () => {
    setLoading((prev) => ({ ...prev, vision: true }));
    try {
      const action = visionActive ? "stop" : "start";
      const response = await fetch(apiUrl(`/api/vision/${action}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "start" ? JSON.stringify({}) : undefined,
      });

      if (response.ok) {
        setVisionActive(!visionActive);
        onVisionToggle(!visionActive);
      }
    } catch (error: any) {
      console.error("[AlwaysOnControls] Vision toggle error:", error);
    } finally {
      setLoading((prev) => ({ ...prev, vision: false }));
    }
  };

  return (
    <div className={`flex items-center ${isMobile ? "gap-1" : "gap-2"}`}>
      {/* GOD HAND (Gesture Control) */}
      <button
        onClick={handleVisionToggle}
        disabled={loading.vision}
        className={`
          flex items-center justify-center ${
            isMobile ? "p-1.5 w-8 h-8" : "gap-2 px-3 py-1.5"
          } rounded text-xs font-bold transition-all
          ${
            visionActive
              ? `${theme.bg.replace("/20", "/30")} ${theme.borderColor} ${
                  theme.primary
                } shadow-lg`
              : `${theme.bg} border ${theme.borderColor} ${theme.primary} opacity-80 hover:opacity-100`
          }
          ${loading.vision ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        style={
          !visionActive
            ? {
                background:
                  theme.primary === "lucagent" ||
                  (theme as any).themeName === "lucagent"
                    ? "rgba(255, 255, 255, 0.3)"
                    : "rgba(0, 0, 0, 0.25)",
              }
            : {}
        }
        title={visionActive ? "Stop God Hand" : "Start God Hand"}
      >
        <div className="relative">
          {visionActive ? (
            <Hand size={isMobile ? 16 : 14} />
          ) : (
            <Hand size={isMobile ? 16 : 14} className="opacity-50" />
          )}
          {visionActive && (
            <span className="absolute -top-1 -right-1 rounded-full animate-pulse bg-blue-500 w-2 h-2" />
          )}
        </div>
        {!isMobile && <span className="ml-2">GOD HAND</span>}
      </button>

      {/* Wake Word indicator (Sense) */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono
          ${isWakeWordActive ? "bg-green-500/10 text-green-400 border border-green-500/30" : (theme as any).themeName === "lucagent" ? "bg-white/30 text-slate-800 border border-black/5" : "bg-black/20 text-slate-500 border border-white/5"}
        `}
        title={
          isWakeWordActive ? "Wake Word Listening Active" : "Wake Word Disabled"
        }
      >
        <Radio
          size={12}
          className={isWakeWordActive ? "animate-pulse" : "opacity-30"}
        />
        {!isMobile && <span>SENSE: {isWakeWordActive ? "ON" : "OFF"}</span>}
      </div>
    </div>
  );
};

export default AlwaysOnControls;
