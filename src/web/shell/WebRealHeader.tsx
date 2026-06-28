import React, { useEffect, useState } from "react";
import Header from "../../components/layout/Header";

/**
 * WebRealHeader — mounts the REAL desktop Header in the browser-safe web shell.
 *
 * The desktop Header expects App.tsx-managed status/monitoring props. The web
 * shell owns those as local React state until the matching browser-safe runtime
 * hooks are promoted. Native-only affordances (ambient vision/audio monitoring)
 * are inert state toggles here; guarded services inside Header degrade in the
 * browser and the web build import gates catch any server-only leaks.
 */

const WEB_HEADER_SETTINGS_OPEN_KEY = "luca.web.header.settingsOpen";

const webHeaderTheme = {
  primary: "var(--luca-accent-primary)",
  border: "var(--luca-border-subtle, var(--app-border-main))",
  bg: "var(--luca-surface, var(--app-bg-main))",
  glow: "var(--luca-accent-soft)",
  coreColor: "var(--luca-accent-primary)",
  hex: "var(--luca-accent-primary)",
  themeName: "luca",
};

export function readInitialWebSettingsOpen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(WEB_HEADER_SETTINGS_OPEN_KEY) === "true";
  } catch {
    return false;
  }
}

interface WebRealHeaderProps {
  isSettingsOpen?: boolean;
  onOpenSettings?: () => void;
}

export function WebRealHeader({
  isSettingsOpen: controlledSettingsOpen,
  onOpenSettings,
}: WebRealHeaderProps = {}) {
  const [isSettingsOpen, setIsSettingsOpenState] = useState(
    readInitialWebSettingsOpen,
  );
  const [ambientVisionActive, setAmbientVisionActive] = useState(false);
  const [audioMonitoringActive, setAudioMonitoringActive] = useState(false);
  const [_ambientSuggestions, setAmbientSuggestions] = useState<unknown[]>([]);
  const [_showSuggestionChips, setShowSuggestionChips] = useState(false);
  const settingsOpen = controlledSettingsOpen ?? isSettingsOpen;

  useEffect(() => {
    try {
      window.localStorage.setItem(
        WEB_HEADER_SETTINGS_OPEN_KEY,
        settingsOpen ? "true" : "false",
      );
    } catch {
      // Storage can be unavailable in hardened browser contexts; the Header
      // still renders and the local state remains authoritative for the tab.
    }
  }, [settingsOpen]);

  const setSettingsOpen = (open: boolean) => {
    if (controlledSettingsOpen === undefined) {
      setIsSettingsOpenState(open);
    }
    if (open) {
      onOpenSettings?.();
    }
  };

  return (
    <div data-luca-web-real-header data-luca-web-settings-open={settingsOpen}>
      <Header
        theme={webHeaderTheme}
        persona="assistant"
        isMobile={false}
        handleCyclePersona={() => undefined}
        isRebooting={false}
        handleKeyDown={() => undefined}
        setIsSettingsOpen={setSettingsOpen}
        isAdminMode={false}
        ambientVisionActive={ambientVisionActive}
        setAmbientVisionActive={setAmbientVisionActive}
        showVoiceHud={false}
        setAmbientSuggestions={setAmbientSuggestions}
        setShowSuggestionChips={setShowSuggestionChips}
        hostPlatform="Web"
        isListeningAmbient={false}
        isProcessing={false}
        audioMonitoringActive={audioMonitoringActive}
        setAudioMonitoringActive={setAudioMonitoringActive}
        setVisionMonitoringActive={setAmbientVisionActive}
        isWakeWordActive={false}
        isLockdown={false}
        connectionTier="CLOUD"
        tier="BASIC"
      />
    </div>
  );
}

export default WebRealHeader;
