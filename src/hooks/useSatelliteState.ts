import { useState, useEffect } from "react";
import { PersonaType } from "../services/lucaService";
import { lucaLink, LucaLinkMessage } from "../services/lucaLinkService";
import { settingsService } from "../services/settingsService";
import { MissionScope } from "../services/toolRegistry";

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
  elevationState?: {
    lastScanTimestamp: number;
    authorizedMissionIds: Set<string>;
    activeMissionScope: MissionScope;
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
        setState(
          (prev) =>
            ({
              ...prev,
              transcript: data.transcript ?? prev.transcript,
              transcriptSource: data.transcriptSource ?? prev.transcriptSource,
              isListening:
                data.isVadActive ?? data.isListening ?? prev.isListening,
              isSpeaking: data.isSpeaking ?? prev.isSpeaking,
              amplitude: data.amplitude ?? prev.amplitude,
              persona: (data.persona as PersonaType) ?? prev.persona,
              status: data.status ?? prev.status,
              themeHex: data.themeHex ?? prev.themeHex,
              brainModel: data.activeBrainId ?? prev.brainModel,
              embeddingModel: data.embeddingModel ?? prev.embeddingModel,
              intent: data.intent ?? prev.intent,
              elevationState: data.elevationState ?? prev.elevationState,
            }) as SatelliteState,
        );
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
        const data = msg.payload as Partial<SatelliteState>;
        setState(
          (prev) =>
            ({
              ...prev,
              ...data,
              persona: (data.persona as PersonaType) ?? prev.persona,
              elevationState: data.elevationState ?? prev.elevationState,
            }) as SatelliteState,
        );
      }
    };

    const unsubscribe = lucaLink.onMessage(handleLinkMessage);
    return () => unsubscribe();
  }, []);

  return state;
};
