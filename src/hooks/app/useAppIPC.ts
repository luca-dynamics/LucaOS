import { useEffect } from "react";
import { settingsService } from "../../services/settingsService";
import { apiUrl, WS_PORT } from "../../config/api";
import { io } from "socket.io-client";
import { eventBus } from "../../services/eventBus";
import { soundService } from "../../services/soundService";
import { DeviceType, SmartDevice } from "../../types";
import { watchGateway } from "../../services/watchGateway";
import { lucaLink as lucaLinkService } from "../../services/lucaLinkService";

interface UseAppIPCProps {
  isElectron: boolean;
  setIsVoiceMode: (val: boolean) => void;
  setAudioMonitoringActive: (updater: any) => void;
  setVisionMonitoringActive: (updater: any) => void;
  setSentryInstruction: (instr: string | null) => void;
  setIsWakeWordActive: (active: boolean) => void;
  setGhostBrowserUrl: (url: string) => void;
  setVisualData: (data: any) => void;
  setIsVisionActive: (active: boolean) => void;
  setIsScreenSharing: (active: boolean) => void;
  stopVoiceHub: () => void;
  forceKillWakeWord?: () => void;
  handlePersonaSwitchRef?: React.RefObject<(mode: string) => Promise<void>>;
  handleSendMessageRef: React.RefObject<
    (
      text: string,
      image?: string | null,
      onProgress?: (message: string, progress?: number) => void,
      sendHidden?: boolean,
    ) => Promise<string | undefined>
  >;
  setToolLogs: React.Dispatch<React.SetStateAction<any[]>>;
  setDevices: React.Dispatch<React.SetStateAction<any[]>>;
  setMessages: (updater: (prev: any[]) => any[]) => void;
  setVoiceAmplitude: (val: number) => void;
  setShowWhatsAppManager: (val: boolean) => void;
  setShowTelegramManager: (val: boolean) => void;
  setShowTwitterManager: (val: boolean) => void;
  setShowInstagramManager: (val: boolean) => void;
  setShowLinkedInManager: (val: boolean) => void;
  setShowDiscordManager: (val: boolean) => void;
  setShowYouTubeManager: (val: boolean) => void;
  setShowWeChatManager: (val: boolean) => void;
  setShowRemoteModal: (val: boolean) => void;
  setActiveMobileDevice: (val: any) => void;
  setShowMobileManager: (val: boolean) => void;
  localVadActive: boolean;
  appMode?: string;
  isCapacitor: boolean;
  devices: any[];
  Sender: any;
}

export const useAppIPC = ({
  isElectron,
  setIsVoiceMode,
  setAudioMonitoringActive,
  setVisionMonitoringActive,
  setSentryInstruction,
  setIsWakeWordActive,
  setGhostBrowserUrl,
  setVisualData,
  setIsVisionActive,
  setIsScreenSharing,
  stopVoiceHub,
  forceKillWakeWord,
  handleSendMessageRef,
  handlePersonaSwitchRef,
  setToolLogs,
  setDevices,
  setMessages,
  setVoiceAmplitude,
  setShowWhatsAppManager,
  setShowTelegramManager,
  setShowTwitterManager,
  setShowInstagramManager,
  setShowLinkedInManager,
  setShowDiscordManager,
  setShowYouTubeManager,
  setShowWeChatManager,
  setShowRemoteModal,
  setActiveMobileDevice,
  setShowMobileManager,
  localVadActive,
  appMode,
  isCapacitor,
  devices,
  Sender,
}: UseAppIPCProps) => {
  const handleRemoteSuccess = () => {
    setShowRemoteModal(false);
    soundService.play("SUCCESS");

    const existingMobile = devices.find(
      (d: any) => d.type === DeviceType.MOBILE,
    );

    const newDevice: SmartDevice = existingMobile || {
      id: `mobile_${Date.now()}`,
      name: "Samsung S24 Ultra",
      type: DeviceType.MOBILE,
      isOn: true,
      status: "online",
      location: "Near-Field",
    };

    if (!existingMobile) {
      setDevices((prev) => [newDevice, ...prev]);
    }

    setActiveMobileDevice(newDevice);
    setShowMobileManager(true);

    const effectiveSender = Sender || { SYSTEM: "SYSTEM" };
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: "Remote Uplink Successful. Mobile Control Interface Active.",
        sender: effectiveSender.SYSTEM,
        timestamp: Date.now(),
      },
    ]);
  };

  useEffect(() => {
    if (!isElectron) return;

    // 1. WAKE WORD (Tray Control)
    const wakeWordHandler = (enabled: boolean) => {
      console.log("[useAppIPC] Tray requested Wake Word:", enabled);
      const current = settingsService.getSettings();
      settingsService.saveSettings({
        ...current,
        voice: { ...current.voice, wakeWordEnabled: enabled },
      });
    };
    const removeWakeWord = (window as any).electron.ipcRenderer.on(
      "toggle-wake-word",
      wakeWordHandler,
    );

    // 2. VOICE HUD TRIGGER (HEY LUCA)
    const hudHandler = () => {
      console.log("[useAppIPC] Triggering VoiceHud from Wake Word");
      setIsVoiceMode(true);
    };
    const removeHud = (window as any).electron.ipcRenderer.on(
      "trigger-voice-hud",
      hudHandler,
    );

    // 3. SENTRY AUDIO (Tray Control)
    const sentryAudioHandler = (enabled: boolean) => {
      setAudioMonitoringActive((current: boolean) => {
        const targetState = typeof enabled === "boolean" ? enabled : !current;
        console.log(`[useAppIPC] Audio Sentry Toggle: ${targetState}`);

        fetch(apiUrl(`/api/audio/${targetState ? "start" : "stop"}`), {
          method: "POST",
        }).catch(console.error);

        (window as any).electron.ipcRenderer.send("sync-sentry-state", {
          audio: targetState,
        });
        return targetState;
      });
    };
    const removeSentryAudio = (window as any).electron.ipcRenderer.on(
      "toggle-sentry-audio",
      sentryAudioHandler,
    );

    // 4. SENTRY VISION (Tray Control)
    const sentryVisionHandler = (enabled: boolean) => {
      setVisionMonitoringActive((current: boolean) => {
        const targetState = typeof enabled === "boolean" ? enabled : !current;
        console.log(`[useAppIPC] Vision Sentry Toggle: ${targetState}`);

        fetch(apiUrl(`/api/vision/${targetState ? "start" : "stop"}`), {
          method: "POST",
        }).catch(console.error);

        (window as any).electron.ipcRenderer.send("sync-sentry-state", {
          visual: targetState,
        });
        return targetState;
      });
    };
    const removeSentryVisual = (window as any).electron.ipcRenderer.on(
      "toggle-sentry-visual",
      sentryVisionHandler,
    );

    // 5. PRIVACY TOGGLE FROM TRAY
    const privacyToggleHandler = ({ sensor, enabled }: any) => {
      const current = settingsService.getSettings();
      const privacy = { ...current.privacy };
      if (sensor === "mic") privacy.micEnabled = enabled;
      if (sensor === "camera") privacy.cameraEnabled = enabled;
      if (sensor === "screen") privacy.screenEnabled = enabled;
      settingsService.saveSettings({ privacy });
    };
    const removePrivacy = (window as any).electron.ipcRenderer.on(
      "toggle-sensor-privacy",
      privacyToggleHandler,
    );

    // 6. SENTRY INSTRUCTION
    const sentryInstrHandler = (instr: string) => {
      setSentryInstruction(instr);
    };
    const removeSentryInstr = (window as any).electron.ipcRenderer.on(
      "set-sentry-instruction",
      sentryInstrHandler,
    );

    // 7. KILL SENSORS (Emergency)
    const killHandler = () => {
      console.warn("[useAppIPC] 🚨 KILL SWITCH ACTIVATED via IPC");
      stopVoiceHub();
      if (forceKillWakeWord) forceKillWakeWord();
      setAudioMonitoringActive(false);
      setVisionMonitoringActive(false);
      setIsVisionActive(false);
      setIsScreenSharing(false);

      const current = settingsService.getSettings();
      settingsService.saveSettings({
        ...current,
        voice: { ...current.voice, wakeWordEnabled: false },
        privacy: {
          micEnabled: false,
          cameraEnabled: false,
          screenEnabled: false,
          telemetryEnabled: false,
        },
      });

      (window as any).electron.ipcRenderer.send("sync-sentry-state", {
        audio: false,
        visual: false,
      });
      (window as any).electron.ipcRenderer.send("sync-wake-word-tray", {
        enabled: false,
      });
    };
    const removeKill = (window as any).electron.ipcRenderer.on(
      "force-kill-sensors",
      killHandler,
    );

    // 8. PERSONA SWITCH FROM TRAY
    const personaHandler = (mode: string) => {
      console.log("[useAppIPC] Tray requested persona switch:", mode);
      if (handlePersonaSwitchRef?.current) {
        handlePersonaSwitchRef.current(mode);
      }
    };
    const removePersona = (window as any).electron.ipcRenderer.on(
      "switch-persona",
      personaHandler,
    );
    
    // 9. THEME SWITCH FROM TRAY
    const themeHandler = (themeId: string) => {
      console.log("[useAppIPC] Tray requested theme switch:", themeId);
      const current = settingsService.getSettings();
      settingsService.saveSettings({
        general: { 
          ...current.general, 
          theme: themeId as any, 
          syncThemeWithPersona: false // Manual user choice overrides auto-sync
        }
      });
    };
    const removeTheme = (window as any).electron.ipcRenderer.on(
      "switch-theme",
      themeHandler,
    );

    const chatWidgetHandler = async (data: {
      text: string;
      image?: string;
      displayId?: number;
      isAwakeningPulse?: boolean;
    }) => {
      console.log("[useAppIPC] Received chat-widget-message:", data.text);
      try {
        if (handleSendMessageRef.current) {
          const response = await handleSendMessageRef.current(
            data.text,
            data.image,
            undefined,
            data.isAwakeningPulse, // Use sendHidden flag to keep system prompts out of the UI
          );
          if (response) {
            (window as any).electron?.ipcRenderer?.send(
              "reply-chat-widget",
              response,
            );
          }
        }
      } catch (error) {
        console.error(
          "[useAppIPC] Error processing chat widget message:",
          error,
        );
        (window as any).electron?.ipcRenderer?.send(
          "reply-chat-widget",
          "Sorry, I encountered an error processing your message.",
        );
      }
    };
    const removeChatWidget = (window as any).electron.ipcRenderer.on(
      "chat-widget-message",
      chatWidgetHandler,
    );

    const removeRemote = (window as any).electron.ipcRenderer.on(
      "remote-uplink-success",
      handleRemoteSuccess,
    );

    return () => {
      if (removeWakeWord) removeWakeWord();
      if (removeHud) removeHud();
      if (removeSentryAudio) removeSentryAudio();
      if (removeSentryVisual) removeSentryVisual();
      if (removePrivacy) removePrivacy();
      if (removeSentryInstr) removeSentryInstr();
      if (removeKill) removeKill();
      if (removePersona) removePersona();
      if (removeTheme) removeTheme();
      if (removeChatWidget) removeChatWidget();
      if (removeRemote) removeRemote();
    };
  }, [
    isElectron,
    setIsVoiceMode,
    setAudioMonitoringActive,
    setVisionMonitoringActive,
    setSentryInstruction,
    setIsVisionActive,
    setIsScreenSharing,
    stopVoiceHub,
    forceKillWakeWord,
    handlePersonaSwitchRef,
    devices,
  ]);

  // Visual Core Update Listener (Separate effect due to appMode dependency)
  useEffect(() => {
    if (!isElectron) return;

    const handleUpdate = (data: any) => {
      if (data.type === "BROWSER") {
        setGhostBrowserUrl(data.url);
      } else {
        setVisualData(data);
      }
    };

    const unsubscribe = (window as any).electron.ipcRenderer.on(
      "visual-core-update",
      handleUpdate,
    );
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [isElectron, appMode, setGhostBrowserUrl, setVisualData]);

  // SMARTSCREEN IPC HANDSHAKE
  useEffect(() => {
    if (
      appMode === "visual_core" &&
      window.electron &&
      window.electron.ipcRenderer
    ) {
      console.log("[SMART SCREEN] Handshaking visual-core-ready");
      window.electron.ipcRenderer.send("visual-core-ready");
    }
  }, [appMode]);

  // SOCKET AWARENESS (Luca Link)
  useEffect(() => {
    let socket: any = null;
    let checkInterval: any = null;

    const connectSocket = () => {
      if (socket) return;
      socket = io(`http://127.0.0.1:${WS_PORT}`, {
        path: "/mobile/socket.io",
        query: { clientType: "desktop" },
        reconnection: false,
      });

      socket.on("connect", () => {
        console.log("[AWARENESS] Connected to Luca Link socket");
      });

      socket.on("client:message", (data: any) => {
        if (data.type === "query" && data.text) {
          handleSendMessageRef.current?.(data.text);
        }
      });

      socket.on("system_file_change", (data: any) => {
        setToolLogs((prev) => [
          ...prev,
          {
            toolName: "SYSTEM_AWARENESS",
            args: { file: data.filename, path: data.path },
            result: `Detected code modification in ${data.filename}. Reloading reflexes...`,
            timestamp: Date.now(),
          },
        ]);
      });

      socket.on("agent_visual_command", (data: any) => {
        setVisualData(data);
        soundService.play("SUCCESS");
      });

      socket.on("vision-event", (event: any) => {
        setToolLogs((prev) => [
          ...prev,
          {
            toolName: "VISION_CORE",
            args: { type: event.type, priority: event.priority },
            result: event.message,
            timestamp: Date.now(),
          },
        ]);
        if (event.priority === "CRITICAL" || event.priority === "HIGH") {
          soundService.play("ALERT");
          setVisualData({
            topic: `${event.type.toUpperCase()} DETECTED`,
            type: "GENERAL",
            layout: "GRID",
            items: [
              {
                title: event.message,
                imageUrl: `data:image/png;base64,${event.context?.screenshot || ""}`,
                details: {
                  Priority: event.priority,
                  Application: event.context?.application || "System",
                  Timestamp: new Date().toLocaleTimeString(),
                  ...event.metadata,
                },
              },
            ],
          });
        }
      });
    };

    const checkAndConnect = async () => {
      try {
        const { waitForAuth } = await import("../../config/api");
        await waitForAuth();
        const res = await fetch(apiUrl("/api/luca-link/status"));
        // Silently ignore 404s or network errors to prevent console flooding
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "running" && !socket) connectSocket();
      } catch {
        // Silent catch for periodic status checks: ignore failure if server unreachable
      }
    };

    checkAndConnect();
    checkInterval = setInterval(checkAndConnect, 5000);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      socket?.disconnect();
    };
  }, []);

  // AMPLITUDE BROADCAST
  useEffect(() => {
    const handleAmplitude = (data: { amplitude: number }) => {
      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send("widget-voice-data", {
          amplitude: data.amplitude,
        });
        if (lucaLinkService.getState().connected) {
          lucaLinkService.send("all", "UI_STATE_SYNC", {
            amplitude: data.amplitude,
          });
        }
        setVoiceAmplitude(data.amplitude);
        if (isCapacitor) {
          watchGateway.updateWatchState({
            amplitude: data.amplitude,
            isVadActive: localVadActive,
          });
        }
      }
    };
    eventBus.on("audio-amplitude", handleAmplitude);
    return () => {
      eventBus.off("audio-amplitude", handleAmplitude);
    };
  }, [localVadActive, isCapacitor]);

  // SOCIAL LINK LISTENERS
  useEffect(() => {
    const triggers: Array<[string, (v: boolean) => void]> = [
      ["WHATSAPP_LUCA_LINK", setShowWhatsAppManager],
      ["TELEGRAM_LUCA_LINK", setShowTelegramManager],
      ["TWITTER_LUCA_LINK", setShowTwitterManager],
      ["INSTAGRAM_LUCA_LINK", setShowInstagramManager],
      ["LINKEDIN_LUCA_LINK", setShowLinkedInManager],
      ["DISCORD_LUCA_LINK", setShowDiscordManager],
      ["YOUTUBE_LUCA_LINK", setShowYouTubeManager],
      ["WECHAT_LUCA_LINK", setShowWeChatManager],
    ];
    const handlers = triggers.map(([evt, setter]) => {
      const h = () => setter(true);
      window.addEventListener(evt, h);
      return { evt, h };
    });
    return () =>
      handlers.forEach(({ evt, h }) => window.removeEventListener(evt, h));
  }, []);

  // Hologram Listeners
  useEffect(() => {
    if (!isElectron) return;

    const removeAwakening = (window as any).electron.ipcRenderer.on(
      "hologram-awakening-pulse",
      async (data: { prompt: string; persona: string }) => {
        if (handleSendMessageRef.current) {
          await handleSendMessageRef.current(
            data.prompt,
            null,
            undefined,
            true,
          );
        }
      },
    );

    const removeVision = (window as any).electron.ipcRenderer.on(
      "hologram-vision-frame",
      async (data: { frame: string; persona: string }) => {
        const visionPrompt = `[AMBIENT VISION — SCREEN OBSERVATION]
You just observed the user's screen through the holographic overlay. Analyze what you see.
Mention it briefly (1-2 sentences). Do NOT describe literals — be helpful.`;
        if (handleSendMessageRef.current) {
          await handleSendMessageRef.current(
            visionPrompt,
            data.frame,
            undefined,
            true,
          );
        }
      },
    );

    return () => {
      if (removeAwakening) removeAwakening();
      if (removeVision) removeVision();
    };
  }, [isElectron, handleSendMessageRef]);

  // Settings Watcher for Tray Sync
  useEffect(() => {
    const handleSettingsUpdate = (newSettings: any) => {
      const enabled = newSettings.voice?.wakeWordEnabled;
      if (typeof enabled === "boolean") {
        setIsWakeWordActive(enabled);
      }
      if (isElectron) {
        (window as any).electron.ipcRenderer.send("sync-wake-word-tray", {
          enabled,
        });
        if (newSettings.privacy) {
          (window as any).electron.ipcRenderer.send("sync-privacy-state", {
            micEnabled: newSettings.privacy.micEnabled,
            cameraEnabled: newSettings.privacy.cameraEnabled,
            screenEnabled: newSettings.privacy.screenEnabled,
          });
        }
        if (newSettings.general?.theme) {
          // Sync Visual Theme with Tray
          (window as any).electron.ipcRenderer.send("sync-persona-tray", {
            mode: newSettings.general.theme,
          });
        }
      }
    };

    settingsService.on("settings-changed", handleSettingsUpdate);
    return () => {
      settingsService.off("settings-changed", handleSettingsUpdate);
    };
  }, [isElectron, setIsWakeWordActive]);
};
