import React, { useEffect, useMemo, useState } from "react";
import HologramWidget from "./Hologram/HologramWidget";
import { useSatelliteState } from "../hooks/useSatelliteState";
import { PERSONA_UI_CONFIG } from "../config/themeColors";
import { settingsService } from "../services/settingsService";
import type { LucaSettings } from "../services/settingsService";
import { getLucaSkinMaterialVariables } from "../styles/lucaSkinMaterialBridge";
import { awarenessService } from "../services/awarenessService";
import {
  createHologramPresenceSnapshot,
  getHologramVoiceDisplayState,
  type HologramLegacyPayload,
} from "../presence/bridges";

/**
 * Dedicated Mode for the Holographic Overlay
 * Renders ONLY the hologram in a transparent window.
 * NOW with Awareness Engine: Awakening Pulse + Ambient Vision
 */
const HologramMode: React.FC = () => {
  const state = useSatelliteState();
  const voiceDisplay = getHologramVoiceDisplayState(
    createHologramPresenceSnapshot(state as unknown as HologramLegacyPayload),
  );

  // The hologram window mounts standalone (no App.tsx), so the selected skin's
  // material variables must be resolved and scoped here — same pattern as
  // WidgetMode / ChatWidgetMode.
  const [selectedSkinId, setSelectedSkinId] = useState<unknown>(
    () => settingsService.getSettings().general.selectedSkinId,
  );

  useEffect(() => {
    const handleSettingsChange = (settings: LucaSettings) => {
      setSelectedSkinId(settings.general.selectedSkinId);
    };

    settingsService.on("settings-changed", handleSettingsChange);
    return () => {
      settingsService.off("settings-changed", handleSettingsChange);
    };
  }, []);

  const hologramSkinVariables = useMemo(
    () =>
      getLucaSkinMaterialVariables({
        skinId: selectedSkinId,
        hostKind: "desktop-app",
        reducedMotion: false,
        reducedTransparency: true,
      }),
    [selectedSkinId],
  );

  const handleToggleVoice = () => {
    // Send Toggle Request to Main Window which holds the logic
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send("widget-toggle-voice", {
        mode: "TOGGLE",
        context: "hologram",
      });
    }
  };


  // === AMBIENT VISION LOOP — observe screen and send to main voice session ===
  useEffect(() => {
    const privacy = settingsService.get("privacy");
    if (!privacy?.screenEnabled) {
      console.warn("[HOLOGRAM] Screen observation blocked by privacy (REDACTED).");
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
      onStatusChange: (active: boolean) => {
        console.log(`[HOLOGRAM] Vision loop status: ${active}`);
      },
    });

    return () => {
      awarenessService.stopAmbientVisionLoop();
    };
  }, [state.persona]);

  // Resolve accent from the live session first, then the selected skin, then
  // the legacy persona palette as a last-resort fallback.
  const activeConfig =
    PERSONA_UI_CONFIG[state.persona] || PERSONA_UI_CONFIG.DEFAULT;
  const primaryColor =
    state.themeHex ||
    hologramSkinVariables["--luca-accent-primary"] ||
    activeConfig.hex;

  return (
    <div
      className="w-screen h-screen bg-transparent overflow-hidden flex items-end justify-end p-0"
      style={hologramSkinVariables as React.CSSProperties}
    >
      <HologramWidget
        isVoiceActive={true} // Always visible in Hologram Mode
        isMicOpen={voiceDisplay.isListening} // Visual Feedback for Mic Status
        transcript={voiceDisplay.transcript}
        transcriptSource={voiceDisplay.transcriptSource}
        isSpeaking={voiceDisplay.isSpeaking || voiceDisplay.amplitude > 0.05}
        audioLevel={voiceDisplay.amplitude}
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
