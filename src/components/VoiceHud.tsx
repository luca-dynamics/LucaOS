import React, { useEffect, useState } from "react";
import { getAllTools, PersonaType } from "../services/lucaService";

import VoiceHudSurface from "./voice/VoiceHudSurface";
import { SettingsModal } from "./SettingsModal";
import { eventBus } from "../services/eventBus";
import { MissionScope } from "../services/toolRegistry";
import {
  getFriendlyVoiceTelemetrySummary,
  getFriendlyLocalCoreLabel,
} from "../utils/voiceDisplay";
import { voiceSessionOrchestrator } from "../services/voiceSessionOrchestrator";

// Removed local CANVAS_THEME_COLORS map to use central THEME_PALETTE from themeColors.ts

interface VoiceHudProps {
  isActive: boolean;
  isVisible?: boolean; // New prop for conditional visibility (Dictation mode)
  onClose: () => void;
  transcript: string;
  transcriptSource: "user" | "model";
  isVadActive: boolean;
  paused?: boolean;
  searchResults?: any;
  visualData?: any;
  onClearVisualData?: () => void;
  onTranscriptChange?: (text: string) => void;
  onTranscriptComplete?: (text: string) => void;
  isSpeaking: boolean;
  persona: PersonaType;
  modelName?: string; // Active Voice Model Name
  technicalModelName?: string; // Detailed model/runtime label for tactical mode
  theme: {
    primary: string;
    border: string;
    bg: string;
    glow: string;
    coreColor: string;
    hex: string;
    themeName: string;
  };
  elevationState?: {
    lastScanTimestamp: number;
    authorizedMissionIds: Set<string>;
    activeMissionScope: MissionScope;
  };
  statusMessage?: string | null;
  isVisionActive?: boolean; // New prop for dual-mode optimization
  hideDebugPanels?: boolean; // Hide ACTIVE PROTOCOLS and TELEMETRY panels
  hideControls?: boolean; // Hide settings and camera buttons (for onboarding)
  transparentBackground?: boolean; // Allow underlying backgrounds to show through
  amplitude?: number; // Real-time audio amplitude
  isLocalCoreConnected?: boolean;
  localCoreReadinessLevel?: "ready" | "limited" | "offline";
  localCoreReadinessReason?: string;
  realtimeStatus?: string;
  realtimeSessionId?: string | null;
  realtimeCanInterrupt?: boolean;
  realtimeLastError?: string | null;
  runtimeRouteHealth?: string | null;
  runtimeLatency?: number | null;
  runtimeFallbackActive?: boolean;
}

const VoiceHud: React.FC<VoiceHudProps> = ({
  transcript,
  isActive,
  isVisible = true,
  onClose,
  transcriptSource,
  isVadActive,
  isSpeaking,
  persona,
  modelName = "GEMINI 2.0 FLASH",
  technicalModelName,
  theme,
  statusMessage,
  isVisionActive = false,
  hideDebugPanels = false,
  hideControls = false,
  transparentBackground = false,
  visualData,
  elevationState,
  amplitude = 0,
  isLocalCoreConnected,
  localCoreReadinessLevel,
  localCoreReadinessReason,
  realtimeStatus,
  realtimeCanInterrupt,
  realtimeLastError,
  runtimeRouteHealth,
  runtimeLatency,
  runtimeFallbackActive,
}) => {
  const [localAmplitude, setLocalAmplitude] = useState(amplitude);
  const [dynamicProtocols, setDynamicProtocols] = useState<string[]>([]);
  const [, setVoiceSessionTick] = useState(0);

  // --- REAL AUDIO TELEMETRY STATE ---
  const [realDB, setRealDB] = useState(-60);
  const [dominantFrequency, setDominantFrequency] = useState(0);

  // Audio Analysis removed - we now use the amplitude prop from liveService
  // This eliminates a redundant mic stream acquisition

  // Initialize dynamic tool list
  useEffect(() => {
    if (isActive && isVisible) {
      const tools = getAllTools().map((t) =>
        (t.name || "UNKNOWN").replace(/([A-Z])/g, "_$1").toUpperCase(),
      );
      setDynamicProtocols(tools.sort(() => 0.5 - Math.random()).slice(0, 6));
    }
  }, [isActive, isVisible]);

  // --- SUBSCRIBE TO REAL AUDIO TELEMETRY ---
  useEffect(() => {
    const handleAudioData = (data: {
      amplitude: number;
      source: string;
      dB?: number;
      dominantFrequency?: number;
    }) => {
      if (data.amplitude !== undefined) setLocalAmplitude(data.amplitude);
      if (data.dB !== undefined) setRealDB(data.dB);
      if (data.dominantFrequency !== undefined)
        setDominantFrequency(data.dominantFrequency);
    };
    eventBus.on("audio-amplitude", handleAudioData);
    return () => {
      eventBus.off("audio-amplitude", handleAudioData);
    };
  }, []);

  useEffect(() => {
    const handleVoiceSessionStateChanged = () => {
      setVoiceSessionTick((prev) => prev + 1);
    };

    eventBus.on("voice-session-state-changed", handleVoiceSessionStateChanged);
    return () => {
      eventBus.off(
        "voice-session-state-changed",
        handleVoiceSessionStateChanged,
      );
    };
  }, []);

  const responseLatency = voiceSessionOrchestrator.responseLatencyMs;
  const telemetrySummary = getFriendlyVoiceTelemetrySummary({
    latencyMs: responseLatency,
    isLocalCoreConnected,
    localCoreReadinessLevel,
  });
  const speedLabel = voiceSessionOrchestrator.responseSpeedLabel;
  const localCoreLabel = getFriendlyLocalCoreLabel(
    isLocalCoreConnected,
    localCoreReadinessLevel,
  );
  const routingHealth = voiceSessionOrchestrator.routingHealth;
  const routeRecommendation = voiceSessionOrchestrator.routeRecommendation;
  const adaptiveRouteApplied = voiceSessionOrchestrator.adaptiveRouteApplied;

  if (!isActive || !isVisible) return null;

  return (
    <VoiceHudSurface
      isActive={isActive}
      isVisible={isVisible}
      onClose={onClose}
      transcript={transcript}
      transcriptSource={transcriptSource}
      isVadActive={isVadActive}
      isSpeaking={isSpeaking}
      persona={persona}
      modelName={modelName}
      technicalModelName={technicalModelName}
      theme={theme}
      statusMessage={statusMessage}
      isVisionActive={isVisionActive}
      hideDebugPanels={hideDebugPanels}
      hideControls={hideControls}
      transparentBackground={transparentBackground}
      visualData={visualData}
      elevationState={{ activeMissionScope: elevationState?.activeMissionScope }}
      amplitude={localAmplitude}
      telemetrySummary={telemetrySummary}
      speedLabel={speedLabel}
      localCoreLabel={localCoreLabel}
      localCoreReadinessReason={localCoreReadinessReason}
      routingHealth={routingHealth}
      routeRecommendation={routeRecommendation}
      adaptiveRouteApplied={adaptiveRouteApplied}
      realDB={realDB}
      dominantFrequency={dominantFrequency}
      realtimeStatus={realtimeStatus}
      realtimeCanInterrupt={realtimeCanInterrupt}
      realtimeLastError={realtimeLastError}
      runtimeRouteHealth={runtimeRouteHealth}
      runtimeLatency={runtimeLatency ?? responseLatency}
      runtimeFallbackActive={runtimeFallbackActive}
      dynamicProtocols={dynamicProtocols}
      totalToolCount={getAllTools().length}
      renderSettingsModal={(onSettingsClose) => (
        <SettingsModal onClose={onSettingsClose} initialTab="voice" theme={theme} />
      )}
    />
  );
};

export default VoiceHud;
