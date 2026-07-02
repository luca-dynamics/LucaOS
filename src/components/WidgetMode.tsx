import React, { useEffect, useMemo, useState } from "react";
import { useDictation } from "../hooks/useDictation";
import { useSatelliteState } from "../hooks/useSatelliteState";
import { THEME_PALETTE } from "../config/themeColors";
import WidgetControls from "./WidgetControls";
import LiquidPresenceMark from "./presence/LiquidPresenceMark";
import { settingsService } from "../services/settingsService";
import type { LucaSettings } from "../services/settingsService";
import { getLucaSkinMaterialVariables } from "../styles/lucaSkinMaterialBridge";
import { LUCA_MOTION_CSS_VARIABLES } from "../styles/lucaPresenceMotion";
import {
  derivePresenceMarkState,
  getPresenceMarkCaption,
} from "../presence/presenceMark";
import {
  createWidgetPresenceSnapshot,
  getWidgetDictationState,
  type WidgetLegacyPayload,
} from "../presence/bridges";

const WidgetMode: React.FC = () => {
  const { isDictating, toggleDictation, setDictationState } = useDictation();
  const state = useSatelliteState();
  const snapshot = useMemo(() => {
    const base = createWidgetPresenceSnapshot(
      state as unknown as WidgetLegacyPayload,
    );
    if (!state.approvalPending) return base;
    return {
      ...base,
      approval: {
        status: "pending" as const,
        prompt: base.approval.prompt ?? {},
      },
    };
  }, [state]);
  const dictationState = getWidgetDictationState(snapshot);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisualCoreActive, setIsVisualCoreActive] = useState(false);
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

  useEffect(() => {
    // IPC listeners for commands (voice toggles, visual core status)
    if (window.electron?.ipcRenderer) {
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

      const removeVisualStatusListener = window.electron.ipcRenderer.on(
        "hologram-visual-status",
        (payload: { isVisible: boolean }) => {
          console.log("[Widget] Visual Core Status:", payload);
          setIsVisualCoreActive(payload.isVisible);
        },
      );

      return () => {
        if (removeDictationListener) removeDictationListener();
        if (removeVisualStatusListener) removeVisualStatusListener();
      };
    }
  }, [isDictating, setDictationState]);

  const toggleVisualCore = () => {
    if (window.electron) {
      if (isVisualCoreActive) {
        window.electron.ipcRenderer.send("close-visual-core");
      } else {
        window.electron.ipcRenderer.send("open-visual-core");
      }
    }
  };

  const handleExpand = () => {
    if (window.electron)
      window.electron.ipcRenderer.send("restore-main-window");
  };

  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const removeExitListener = window.electron?.ipcRenderer?.on(
      "widget-animate-exit",
      () => {
        setIsExiting(true);
        // Reset after a delay so the next open starts clean
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
  const widgetSkinVariables = useMemo(
    () =>
      getLucaSkinMaterialVariables({
        skinId: selectedSkinId,
        hostKind: "desktop-app",
        reducedMotion: false,
        reducedTransparency: true,
      }),
    [selectedSkinId],
  );

  const identityColor =
    state.themeHex ||
    widgetSkinVariables["--luca-accent-primary"] ||
    currentTheme.primary;

  const markState = derivePresenceMarkState(
    isDictating && dictationState.status === "idle"
      ? { ...snapshot, voice: { ...snapshot.voice, status: "listening" } }
      : snapshot,
    { acting: isVisualCoreActive },
  );
  const caption = getPresenceMarkCaption(markState, snapshot);
  const hintVisible = !caption && isHovered && markState === "idle";
  const captionText = caption || (hintVisible ? "Talk to Luca" : "");

  return (
    <div
      className={`h-screen w-screen flex flex-col items-center justify-center overflow-hidden bg-transparent
        ${isExiting ? "scale-90 opacity-0" : "scale-100 opacity-100"}`}
      style={
        {
          ...widgetSkinVariables,
          ...LUCA_MOTION_CSS_VARIABLES,
          WebkitAppRegion: "drag",
          transformOrigin: "center center",
          transitionProperty: "transform, opacity",
          transitionDuration: "var(--luca-duration-exit)",
          transitionTimingFunction: "var(--luca-ease)",
        } as any
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <LiquidPresenceMark
        state={markState}
        amplitude={dictationState.amplitude}
        identityColor={identityColor}
        onClick={toggleDictation}
        title="Talk to Luca"
      />

      {/* Ephemeral caption — silent at rest, words only when light can't say it */}
      <div
        className="mt-2 px-4 py-1.5 rounded-full bg-black/60 border border-white/10 max-w-[180px]"
        style={{
          opacity: captionText ? 1 : 0,
          transform: captionText ? "translateY(0)" : "translateY(4px)",
          transitionProperty: "opacity, transform",
          transitionDuration: "var(--luca-duration-fast)",
          transitionTimingFunction: "var(--luca-ease)",
          pointerEvents: "none",
        }}
      >
        <span className="block text-xs text-white/75 whitespace-nowrap overflow-hidden text-ellipsis text-center">
          {captionText || " "}
        </span>
      </div>

      <WidgetControls
        isHovered={isHovered}
        onExpand={handleExpand}
        onToggleHUD={toggleVisualCore}
        isHUDActive={isVisualCoreActive}
      />
    </div>
  );
};

export default WidgetMode;
