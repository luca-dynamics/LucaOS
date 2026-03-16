import React, { useEffect, useRef } from "react";
import HologramWidget from "./Hologram/HologramWidget";
import { useSatelliteState } from "../hooks/useSatelliteState";
import { PERSONA_UI_CONFIG } from "../config/themeColors";
import { awarenessService } from "../services/awarenessService";
import { settingsService } from "../services/settingsService";

/**
 * Dedicated Mode for the Holographic Overlay
 * Renders ONLY the hologram in a transparent window.
 * NOW with Awareness Engine: Awakening Pulse + Ambient Vision
 */
const HologramMode: React.FC = () => {
  const state = useSatelliteState();
  const hasTriggeredAwakening = useRef(false);

  const handleToggleVoice = () => {
    // Send Toggle Request to Main Window which holds the logic
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send("widget-toggle-voice", {
        mode: "TOGGLE",
      });
    }
  };

  // === AWAKENING PULSE — fires once when Hologram first opens ===
  useEffect(() => {
    if (hasTriggeredAwakening.current) return;
    hasTriggeredAwakening.current = true;

    const triggerAwakening = async () => {
      const profile = settingsService.get("general");
      const persona = (state.persona || "ASSISTANT") as string;
      const prompt = await awarenessService.triggerAwakeningPulse(
        {
          mode: "voice",
          operatorName: profile?.userName || "Operator",
          persona,
        },
        "hologram",
      );

      if (prompt && window.electron?.ipcRenderer) {
        console.log("[HOLOGRAM] 🌅 Voice awakening pulse fired");
        // Send to main window to speak through the active voice session
        window.electron.ipcRenderer.send("hologram-awakening-pulse", {
          prompt,
          persona,
        });
      }
    };

    // Delay slightly for window initialization
    const timer = setTimeout(triggerAwakening, 600);
    return () => clearTimeout(timer);
  }, []);

  // === AMBIENT VISION LOOP — observe screen and send to main voice session ===
  useEffect(() => {
    const privacy = settingsService.get("privacy");
    if (!privacy?.screenEnabled) {
      console.warn("[HOLOGRAM] 🔒 Screen observation blocked by privacy.");
      return;
    }

    const persona = (state.persona || "ASSISTANT") as string;

    awarenessService.startAmbientVisionLoop({
      mode: "voice",
      persona,
      onScreenCapture: (base64: string) => {
        // Forward the captured frame to the main window's voice session
        if (window.electron?.ipcRenderer) {
          window.electron.ipcRenderer.send("hologram-vision-frame", {
            frame: base64,
            persona,
          });
        }
      },
      onStatusChange: (active) => {
        console.log(`[HOLOGRAM] Vision loop status: ${active}`);
      },
    });

    return () => {
      awarenessService.stopAmbientVisionLoop();
    };
  }, [state.persona]);

  // Resolve Theme Color dynamically from Central Config
  const activeConfig =
    PERSONA_UI_CONFIG[state.persona] || PERSONA_UI_CONFIG.DEFAULT;
  const primaryColor = state.themeHex || activeConfig.hex;

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden flex items-end justify-end p-0">
      <HologramWidget
        isVoiceActive={true} // Always visible in Hologram Mode
        isMicOpen={state.isListening} // Visual Feedback for Mic Status
        transcript={state.transcript}
        transcriptSource={state.transcriptSource}
        isSpeaking={state.isSpeaking || state.amplitude > 0.05}
        audioLevel={state.amplitude}
        primaryColor={primaryColor} // Use dynamic theme color
        persona={state.persona as string}
        onClick={handleToggleVoice}
        propIntent={state.intent}
        elevationState={state.elevationState}
      />
    </div>
  );
};

export default HologramMode;
