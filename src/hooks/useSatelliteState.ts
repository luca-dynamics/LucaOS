import { useState, useEffect } from "react";
import { PersonaType } from "../services/lucaService";
import {
  lucaLinkManager,
  type LucaLinkMessage,
} from "../services/lucaLink/manager";
import { settingsService } from "../services/settingsService";
import { MissionScope } from "../services/toolRegistry";
import {
  createWidgetPresenceSnapshot,
  getWidgetDictationState,
  type WidgetLegacyPayload,
} from "../presence/bridges";

export interface SatelliteState {
  transcript: string;
  transcriptSource: "user" | "model";
  isListening: boolean;
  isSpeaking: boolean;
  amplitude: number;
  persona: PersonaType;
  status?: string;
  themeHex?: string;
  brainModel?: string;
  embeddingModel?: string;
  intent?: string | null;
  approvalPending?: boolean;
  elevationState?: {
    lastScanTimestamp: number;
    authorizedMissionIds: Set<string>;
    activeMissionScope: MissionScope;
  };
}

export function applySatellitePresenceUpdate(
  prev: SatelliteState,
  data: WidgetLegacyPayload,
): SatelliteState {
  const snapshot = createWidgetPresenceSnapshot(data);
  const voice = getWidgetDictationState(snapshot);

  return {
    ...prev,
    transcript: data.transcript != null ? voice.transcript : prev.transcript,
    transcriptSource:
      data.transcriptSource != null
        ? voice.transcriptSource
        : prev.transcriptSource,
    isListening:
      data.isVadActive != null || data.isListening != null
        ? voice.isListening
        : prev.isListening,
    isSpeaking:
      data.isSpeaking != null ? voice.isSpeaking : prev.isSpeaking,
    amplitude: data.amplitude != null ? voice.amplitude : prev.amplitude,
    persona:
      data.persona != null
        ? (snapshot.persona as PersonaType)
        : prev.persona,
    status: data.status != null ? voice.status : prev.status,
    themeHex:
      data.themeHex != null ? snapshot.themeHex : prev.themeHex,
    brainModel:
      data.activeBrainId != null
        ? (data.activeBrainId as string)
        : prev.brainModel,
    embeddingModel:
      data.embeddingModel != null
        ? (data.embeddingModel as string)
        : prev.embeddingModel,
    intent: data.intent != null ? snapshot.intent : prev.intent,
    approvalPending:
      data.approvalRequest !== undefined
        ? snapshot.approval.status === "pending"
        : prev.approvalPending,
    elevationState:
      data.elevationState != null
        ? (data.elevationState as SatelliteState["elevationState"])
        : prev.elevationState,
  };
}

/**
 * useSatelliteState
 *
 * A platform-agnostic hook that provides real-time state for L.U.C.A. widgets.
 * - On Desktop: Listens for Electron IPC events.
 * - On Mobile/AR: Listens for LucaLink sync messages from a connected Core Node (Desktop).
 */
export const useSatelliteState = (
  initialPersona: PersonaType = "ASSISTANT",
) => {
  const [state, setState] = useState<SatelliteState>(() => {
    let persona = initialPersona;
    try {
      // Use settingService as the single source of truth
      const theme = settingsService.get("general")?.theme;
      const brain = settingsService.get("general")?.activeBrainId || undefined;
      const embedding = settingsService.get("brain")?.embeddingModel || undefined;
      if (theme) {
        persona = theme as PersonaType;
      }
      return {
        transcript: "",
        transcriptSource: "user",
        isListening: false,
        isSpeaking: false,
        amplitude: 0,
        persona,
        brainModel: brain,
        embeddingModel: embedding,
      };
    } catch (e) {
      console.warn("[SatelliteState] Initialization failed:", e);
      return {
        transcript: "",
        transcriptSource: "user",
        isListening: false,
        isSpeaking: false,
        amplitude: 0,
        persona: initialPersona,
      };
    }
  });

  // Sync with global settings changes
  useEffect(() => {
    const handleSettingsChange = (newSettings: any) => {
      if (newSettings.general?.theme) {
        setState((prev) => ({
          ...prev,
          persona: (newSettings.general.persona as PersonaType) || prev.persona,
          brainModel: newSettings.general.activeBrainId || prev.brainModel,
          embeddingModel: newSettings.brain?.embeddingModel || prev.embeddingModel,
        }));
      }
    };
    settingsService.on("settings-changed", handleSettingsChange);
    return () => {
      settingsService.off("settings-changed", handleSettingsChange);
    };
  }, []);

  useEffect(() => {
    // 1. DESKTOP (ELECTRON) IPC MODE
    if (window.electron?.ipcRenderer) {
      const handleUpdate = (data: any) => {
        setState((prev) => applySatellitePresenceUpdate(prev, data));
      };

      const removeUpdate = window.electron.ipcRenderer.on(
        "widget-update",
        handleUpdate,
      );
      const removeHologram = window.electron.ipcRenderer.on(
        "hologram-update",
        handleUpdate,
      );
      const removeTheme = window.electron.ipcRenderer.on(
        "switch-persona",
        (persona: string) => {
          setState((prev) => ({ ...prev, persona: persona as PersonaType }));
        },
      );

      return () => {
        removeUpdate();
        removeHologram();
        removeTheme();
      };
    }

    // 2. SATELLITE (LINK) MODE
    // Listen for UI_STATE_SYNC messages from a peer
    const handleLinkMessage = (msg: LucaLinkMessage) => {
      if (msg.type === "UI_STATE_SYNC" && msg.payload) {
        setState((prev) =>
          applySatellitePresenceUpdate(
            prev,
            msg.payload as WidgetLegacyPayload,
          ),
        );
      }
    };

    const unsubscribe = lucaLinkManager.relay.onMessage(handleLinkMessage);
    return () => unsubscribe();
  }, []);

  return state;
};
