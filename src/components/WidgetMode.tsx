import React, { useEffect, useState } from "react";
import { useDictation } from "../hooks/useDictation";
import { useSatelliteState } from "../hooks/useSatelliteState";
import WidgetVisualizer from "./WidgetVisualizer";
import { THEME_PALETTE } from "../config/themeColors";
import WidgetControls from "./WidgetControls";

const WidgetMode: React.FC = () => {
  const { isDictating, toggleDictation, setDictationState } = useDictation();
  const state = useSatelliteState();
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // IPCS Listeners for COMMANDS (Voice Toggles)
    if (window.electron?.ipcRenderer) {
      // Dictation Trigger Listener (Ctrl+D)
      const removeDictationListener = window.electron.ipcRenderer.on(
        "trigger-voice-toggle",
        (payload: any) => {
          console.log("[Widget] Received trigger-voice-toggle", payload);
          if (payload?.mode === "DICTATION") {
            setDictationState(true);
          } else if (payload?.mode === "OFF") {
            setDictationState(false);
          } else {
            setDictationState(!isDictating);
          }
        },
      );

      return () => {
        if (removeDictationListener) removeDictationListener();
      };
    }
  }, [isDictating, setDictationState]);

  // --- GOD MODE LOGIC ---
  /* Removed Unused God Mode Logic */

  useEffect(() => {
    // checkGodMode();
    // const interval = setInterval(checkGodMode, 2000);
    // return () => clearInterval(interval);
  }, []);

  const handleExpand = () => {
    if (window.electron)
      window.electron.ipcRenderer.send("restore-main-window");
  };

  // --- ANIMATION LOGIC ---
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Listen for Exit Signal
    const removeExitListener = window.electron?.ipcRenderer?.on(
      "widget-animate-exit",
      () => {
        console.log("[Widget] Animating Exit...");
        setIsExiting(true);
        // Reset state after a delay (failsafe to ensure next open is clean)
        setTimeout(() => setIsExiting(false), 1000);
      },
    );
    return () => {
      if (removeExitListener) removeExitListener();
    };
  }, []);

  const currentTheme =
    THEME_PALETTE[state.persona as keyof typeof THEME_PALETTE] ||
    THEME_PALETTE.RUTHLESS;

  // Use synced themeHex if available, else fall back to persona theme
  const primaryColor = state.themeHex || currentTheme.primary;

  return (
    <div
      className={`h-screen w-screen flex flex-col items-center justify-center overflow-hidden bg-transparent transition-all duration-300 ease-in-out
        ${isExiting ? "scale-0 opacity-0 blur-md translate-y-10" : "scale-100 opacity-100 translate-y-0"}`}
      style={
        { WebkitAppRegion: "drag", transformOrigin: "center center" } as any
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* CANVAS ORB VISUALIZER */}
      <WidgetVisualizer
        amplitude={state.amplitude}
        isVadActive={isDictating ? true : state.isListening}
        isSpeaking={false}
        persona={state.persona} // Keep original persona (Blue)
        themeHex={primaryColor} // Pass dynamic color
        onClick={toggleDictation}
      />

      {/* Transcript / Status Text */}
      <div
        className={`mt-4 px-6 py-2 bg-black/80 backdrop-blur-xl rounded-full border border-white/10 text-center transition-all duration-300 shadow-2xl
        ${state.transcript ? "min-w-[300px] w-auto animate-pulse-once" : "w-[180px]"}`}
      >
        <span
          className="text-xs font-mono whitespace-nowrap overflow-hidden text-ellipsis block tracking-wider font-bold transition-colors duration-500"
          style={{ color: primaryColor }}
        >
          {state.transcript ||
            (isDictating ? "LISTENING..." : "START DICTATION")}
        </span>
      </div>

      {/* CONTROLS (EXPAND, ETC) */}
      <WidgetControls isHovered={isHovered} onExpand={handleExpand} />
    </div>
  );
};

export default WidgetMode;
