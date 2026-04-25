/**
 * Always-On Controls Component
 * UI buttons for controlling Always-On Vision and Audio monitoring
 */

import React, { useState, useEffect } from "react";
import { Icon } from "./ui/Icon";
import { apiUrl } from "../config/api";
import { settingsService } from "../services/settingsService";

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
}) => {
  const [visionActive, setVisionActive] = useState(false);
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
    // Proactive Efficiency Check: Suggest local model if using cloud for ambient
    if (!visionActive) {
      const { brain } = settingsService.getSettings();
      const currentModel = brain.visionModel || brain.model || "gemini-3-flash-preview";
      const isLocal = settingsService.isModelLocal(currentModel);
      
      if (!isLocal) {
        const wantsLocal = window.confirm(
          "LUCA EFFICIENCY RECOMMENDATION:\n\nAmbient 'God Hand' vision consumes significant fuel on cloud models. Use local vision (UI-TARS) to conserve your Sovereign Wallet?"
        );
        
        if (wantsLocal) {
          settingsService.saveSettings({ brain: { ...brain, visionModel: "ui-tars-2b" } });
          console.log("[AlwaysOnControls] User accepted local vision pivot");
        }
      }
    }

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
          } rounded-sm text-[10px] font-black transition-all glass-blur
          ${
            visionActive
              ? "bg-amber-500/20 border-amber-500/50 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
              : "bg-[var(--app-bg-tint)] border border-[var(--app-border-main)] text-[var(--app-text-muted)] opacity-70 hover:opacity-100"
          }
          ${loading.vision ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        title={visionActive ? "Stop God Hand" : "Start God Hand"}
      >
        <div className="relative">
          <Icon 
            name="Hand" 
            variant="Linear" 
            size={isMobile ? 14 : 12} 
            className={visionActive ? "" : "opacity-40"}
          />
          {visionActive && (
            <span className="absolute -top-1 -right-1 rounded-full animate-pulse bg-amber-500 w-1.5 h-1.5" />
          )}
        </div>
        {!isMobile && <span className="tracking-[0.2em] font-mono">GOD HAND</span>}
      </button>

      {/* Wake Word indicator (Sense) */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono glass-blur border
          ${isWakeWordActive ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-[var(--app-bg-tint)] text-[var(--app-text-muted)] border-[var(--app-border-main)]"}
        `}
        title={
          isWakeWordActive ? "Wake Word Listening Active" : "Wake Word Disabled"
        }
      >
        <Icon
          name="Radio"
          variant="Linear"
          size={12}
          className={isWakeWordActive ? "animate-pulse" : "opacity-30"}
        />
        {!isMobile && <span>SENSE: {isWakeWordActive ? "ON" : "OFF"}</span>}
      </div>
    </div>
  );
};

export default AlwaysOnControls;
