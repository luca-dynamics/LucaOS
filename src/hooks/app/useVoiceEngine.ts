import { useState, useEffect, useRef, useCallback } from "react";
import { settingsService } from "../../services/settingsService";
import { soundService } from "../../services/soundService";
import { awarenessService } from "../../services/awarenessService";
import { useVoiceInput } from "../useVoiceInput";
import { PersonaType } from "../../services/lucaService";
import { MissionScope } from "../../services/toolRegistry";
import { useAppContext } from "../../context/AppContext";
import { voiceSessionOrchestrator } from "../../services/voiceSessionOrchestrator";
import {
  getFriendlyAdaptiveVoiceNotice,
  getFriendlyVoiceStatus,
} from "../../utils/voiceDisplay";
import { eventBus } from "../../services/eventBus";

interface UseVoiceEngineProps {
  executeTool: (toolName: string, args: any) => Promise<any>;
  handleSendMessage: (
    text: string,
    image?: string | null,
  ) => Promise<string | undefined>;
  persona: PersonaType; // Driven by App.tsx
}

export function useVoiceEngine({
  executeTool,
  handleSendMessage,
  persona,
}: UseVoiceEngineProps) {
  // --- CONTEXT STATE (Single Source of Truth) ---
  const { voice } = useAppContext();
  const {
    isVoiceMode,
    setIsVoiceMode,
    voiceTranscript,
    setVoiceTranscript,
    voiceTranscriptSource,
    setVoiceTranscriptSource,
    isVadActive,
    setIsVadActive,
    isSpeaking,
    setIsSpeaking,
    approvalRequest,
    setApprovalRequest,
  } = voice;

  // --- LOCAL ENGINE STATE ---
  useEffect(() => {
    voiceSessionOrchestrator.setPersona(persona);
  }, [persona]);

  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [voiceBackend, setVoiceBackend] = useState<
    "cloud" | "local" | "GEMINI" | "OPENAI" | "GROQ"
  >("cloud");
  const [dictationActive, setDictationActive] = useState(false);
  const [remoteAmplitude, setRemoteAmplitude] = useState(0);
  // --- REFS ---
  const prevSttModelRef = useRef<string>(
    settingsService.get("voice")?.sttModel || "cloud-gemini",
  );
  const prevDictationActive = useRef(false);
  const adaptiveNoticeTimeoutRef = useRef<number | null>(null);

  // --- VOICE HUB INTEGRATION (Local VAD) ---
  const {
    transcript: voiceHubTranscript,
    isListening: isVoiceHubListening,
    status: voiceHubStatus,
    volume: localInputAmplitude,
    error: voiceHubError,
    startListening: startVoiceHub,
    stopListening: stopVoiceHub,
    forceKillWakeWord,
  } = useVoiceInput();

  // --- EFFECTS ---

  const syncVoiceRuntimeState = useCallback(() => {
    const routeKind = voiceSessionOrchestrator.routeKind;
    setVoiceBackend(routeKind === "CLOUD_BIDI" ? "cloud" : "local");
    setVoiceStatus(
      getFriendlyVoiceStatus(voiceSessionOrchestrator.displayStatus, routeKind),
    );
  }, []);

  useEffect(() => {
    return () => {
      if (adaptiveNoticeTimeoutRef.current) {
        window.clearTimeout(adaptiveNoticeTimeoutRef.current);
      }
    };
  }, []);


  // 3. Connect Voice Session
  const connectVoiceSession = useCallback(
    async (targetPersona: PersonaType, context: string = "voice-dashboard") => {
      console.log(`[VOICE ENGINE] Connecting Session: ${targetPersona} (Context: ${context})...`);
      const voiceSettings = settingsService.get("voice");
      const baseRoute = voiceSessionOrchestrator.resolveRoute();
      const route = voiceSessionOrchestrator.resolveAdaptiveRoute();
      console.log(
        `[VOICE ENGINE] Voice route resolved: ${route.kind} (${route.provisioning})`,
        route,
      );
      setVoiceBackend(route.kind === "CLOUD_BIDI" ? "cloud" : "local");

      setVoiceStatus(
        route.kind === "CLOUD_BIDI"
          ? "Connecting Cloud Voice..."
          : route.kind === "LOCAL_PIPELINE"
            ? "Starting Local Voice..."
            : "Starting Hybrid Voice...",
      );

      try {
        const activeRoute = await voiceSessionOrchestrator.connect({
          liveConfig: {
            persona: targetPersona,
            suppressOutput: false,
            onToolCall: executeTool,
            onStatusUpdate: (status) => {
              const normalized = status.toLowerCase();
              if (
                normalized.includes("error") ||
                normalized.includes("failed")
              ) {
                setVoiceStatus(status);
                return;
              }
              syncVoiceRuntimeState();
            },
            onConnectionChange: (connected) => {
              soundService.play(connected ? "SUCCESS" : "ALERT");
              syncVoiceRuntimeState();
            },
            onAudioData: (amp) => {
              setRemoteAmplitude(amp);
            },
            onVadChange: (active) => setIsVadActive(active),
            onTranscript: (text, source) => {
              setVoiceTranscript(text);
              setVoiceTranscriptSource(source as "user" | "model");
            },
          },
          hybridConfig: {
            sttModel: voiceSettings?.sttModel || "whisper-tiny",
            onTranscript: (text, source) => {
              setVoiceTranscript(text);
              setVoiceTranscriptSource(source as "user" | "model");

              if (source === "user" && !dictationActive) {
                handleSendMessage(text, undefined).catch(console.error);
              }
            },
            onAudioData: (amp) => {
              setRemoteAmplitude(amp);
            },
            onVadChange: (active) => setIsVadActive(active),
            onStatusUpdate: (status) => {
              const normalized = status.toLowerCase();
              if (
                normalized.includes("listening") ||
                normalized.includes("thinking")
              ) {
                setVoiceStatus(status);
                return;
              }
              if (normalized.includes("error") || normalized.includes("failed")) {
                setVoiceStatus(status);
                return;
              }
              syncVoiceRuntimeState();
            },
            onConnectionChange: (connected) => {
              soundService.play(connected ? "SUCCESS" : "ALERT");
              syncVoiceRuntimeState();
            },
          },
        });

        const adaptiveNotice = getFriendlyAdaptiveVoiceNotice(
          baseRoute.kind,
          activeRoute.kind,
        );
        if (adaptiveNotice) {
          setVoiceStatus(adaptiveNotice);
          if (adaptiveNoticeTimeoutRef.current) {
            window.clearTimeout(adaptiveNoticeTimeoutRef.current);
          }
          adaptiveNoticeTimeoutRef.current = window.setTimeout(() => {
            syncVoiceRuntimeState();
            adaptiveNoticeTimeoutRef.current = null;
          }, 1800);
        } else {
          syncVoiceRuntimeState();
        }

        await triggerGreeting(
          voiceSessionOrchestrator,
          activeRoute.kind === "CLOUD_BIDI" ? "native" : activeRoute.kind === "LOCAL_PIPELINE" ? "local" : "hybrid",
          targetPersona,
          context,
        );
      } catch (err) {
        console.error("Voice Connection Failed:", err);
        setVoiceStatus("CONNECTION FAILED");
        soundService.play("ALERT");
      }
    },
    [
      executeTool,
      setIsVadActive,
      setVoiceTranscript,
      setVoiceTranscriptSource,
      dictationActive,
      handleSendMessage,
      syncVoiceRuntimeState,
    ],
  );

  // --- EVENT LISTENERS (VOICE SESSION & ADAPTIVE ROUTING) ---
  useEffect(() => {
    const handleVoiceSessionStateChanged = () => {
      syncVoiceRuntimeState();
    };

    const handleAdaptiveReconnectRequired = (event: {
      recommendedRouteKind: string;
      reason: string;
    }) => {
      console.log(
        `[VOICE ENGINE] ⚡ Hot-Swap Signal Received: Switching to ${event.recommendedRouteKind} (${event.reason})`,
      );
      // Re-trigger connection with current persona - connectVoiceSession handles resolveAdaptiveRoute() internally
      connectVoiceSession(persona, "adaptive-hot-swap");
    };

    eventBus.on("voice-session-state-changed", handleVoiceSessionStateChanged);
    eventBus.on(
      "voice-session-adaptive-reconnect-required",
      handleAdaptiveReconnectRequired,
    );

    return () => {
      eventBus.off(
        "voice-session-state-changed",
        handleVoiceSessionStateChanged,
      );
      eventBus.off(
        "voice-session-adaptive-reconnect-required",
        handleAdaptiveReconnectRequired,
      );
    };
  }, [syncVoiceRuntimeState, connectVoiceSession, persona]);

  // Helper to trigger the proactively generated greeting
  const triggerGreeting = async (service: any, type: string, persona: string, context: string) => {
    try {
      const general = settingsService.get("general") as any;
      const prompt = await awarenessService.triggerAwakeningPulse(
        {
          mode: "voice",
          operatorName: general?.userName || "Operator",
          persona: persona,
        },
        context
      );

      if (prompt) {
        console.log(`[VOICE ENGINE] 🌅 Sending Awakening Pulse via ${type}...`);
        await service.sendText(prompt);
      }
    } catch (e) {
      console.warn("[VOICE ENGINE] Awakening pulse failed:", e);
    }
  };

  // 4. Watch for Watch/Wearable Events
  useEffect(() => {
    const handleWatchVoice = (e: any) => {
      console.log("[VOICE ENGINE] Watch requested voice:", e.detail);
      window.dispatchEvent(new CustomEvent("luca:engine-trigger-voice"));
    };

    const handleWatchPersona = (e: any) => {
      console.log("[VOICE ENGINE] Watch switch persona:", e.detail.persona);
      if (e.detail.persona) {
        // Save to settings to trigger the global app re-render
        const currentGen = settingsService.get("general");
        settingsService.saveSettings({
          general: { ...currentGen, theme: e.detail.persona as any },
        });
      }
    };

    window.addEventListener("luca:trigger-voice", handleWatchVoice as any);
    window.addEventListener("luca:switch-persona", handleWatchPersona as any);
    return () => {
      window.removeEventListener("luca:trigger-voice", handleWatchVoice as any);
      window.removeEventListener(
        "luca:switch-persona",
        handleWatchPersona as any,
      );
    };
  }, []);

  // 5. Handle Live Settings Changes (Hot-Swap)
  useEffect(() => {
    const handleVoiceSettingsChange = (newSettings: any) => {
      if (!newSettings.voice) return;

      const { provider, sttModel } = newSettings.voice;
      const route = voiceSessionOrchestrator.resolveRoute();
      const mode =
        route.kind === "CLOUD_BIDI"
          ? "CLOUD (Bidi)"
          : route.kind === "LOCAL_PIPELINE"
            ? "LOCAL"
            : "HYBRID";

      console.log(
        `[VOICE ENGINE] Settings Update (${mode}) - Provider: ${provider}`,
      );

      // Auto-reconnect if STT Model changes
      const prevStt = prevSttModelRef.current;
      const newStt = sttModel || "cloud-gemini";

      if (prevStt !== newStt) {
        console.log(`[VOICE ENGINE] STT Change: ${prevStt} -> ${newStt}`);
        const wasCloud = prevStt.includes("gemini");
        const isCloud = route.kind === "CLOUD_BIDI";

        if (wasCloud) voiceSessionOrchestrator.disconnect();
        else stopVoiceHub();

        setVoiceBackend(isCloud ? "cloud" : "local");

        setTimeout(() => {
          if (!isCloud) {
            startVoiceHub("ACTIVE");
          }
        }, 300);
      }
      prevSttModelRef.current = newStt;
    };

    settingsService.on("settings-changed", handleVoiceSettingsChange);
    return () => {
      settingsService.off("settings-changed", handleVoiceSettingsChange);
    };
  }, [stopVoiceHub, startVoiceHub]);

  // 6. Voice Hub Listener (Local VAD Bridge)
  useEffect(() => {
    if (voiceHubTranscript && voiceHubTranscript.trim().length > 0) {
      console.log("[VOICE ENGINE] Local VAD Transcript:", voiceHubTranscript);
      setVoiceTranscript(voiceHubTranscript);

      if (!dictationActive) {
        handleSendMessage(voiceHubTranscript, undefined).catch(console.error);
      }
    }
  }, [voiceHubTranscript, dictationActive, handleSendMessage]);

  // 7. Dictation Logic (Latch & Flush) — Inject accumulated text on stop
  useEffect(() => {
    if (prevDictationActive.current && !dictationActive) {
      console.log(
        "[VOICE ENGINE] Dictation stopped. Checking for pending text to inject...",
      );

      const textToInject = voiceTranscript;

      if (textToInject && textToInject.trim().length > 0) {
        console.log(`[VOICE ENGINE] Injecting Final Text: "${textToInject}"`);

        if ((window as any).electron?.ipcRenderer) {
          // 1. Trigger exit animation
          (window as any).electron.ipcRenderer.send("widget-animate-exit");

          // 2. Wait for animation (300ms) then type into active field
          setTimeout(() => {
            (window as any).electron.ipcRenderer.send("type-text", {
              text: textToInject,
            });
            // Clear transcript after injection
            setVoiceTranscript("");
          }, 300);
        }
      } else {
        console.log("[VOICE ENGINE] No text to inject.");
      }
    }
    prevDictationActive.current = dictationActive;
  }, [dictationActive, voiceTranscript]);

  // 8. Sync Amplitude to Context (Removed to prevent re-render loop)
  // Logic moved to eventBus in useVoiceInput and hybridVoiceService

  // --- SAFETY VALVE VOICE INTEGRATION ---
  const lastAnnouncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (approvalRequest?.isSafetyValve) {
      const requestId = `${approvalRequest.tool}_${approvalRequest.action}`;
      if (lastAnnouncedRef.current !== requestId) {
        console.log("[VOICE-SAFETY] 🛡️ Announcing Mission Authorization via TTS...");
        const scope = approvalRequest.missionScope || MissionScope.NONE;
        const scopeLabel = scope === MissionScope.NONE ? "this action" : scope;
        
        const announceMsg = `SECURITY PROTOCOL: I need to enter ${scopeLabel} Mode to proceed with ${approvalRequest.tool}. Shall I authorize this mission?`;
        
        voiceSessionOrchestrator.sendText(announceMsg);
        lastAnnouncedRef.current = requestId;
      }
    } else {
      lastAnnouncedRef.current = null;
    }
  }, [approvalRequest]);

  // Monitor transcript for approval/denial
  useEffect(() => {
    if (!approvalRequest?.isSafetyValve || !voiceTranscript) return;

    const lowerTranscript = voiceTranscript.toLowerCase();
    const isApprove = ["allow", "approve", "proceed", "yes", "confirm"].some(
      (k) => lowerTranscript.includes(k),
    );
    const isDeny = ["deny", "block", "refuse", "reject", "no", "stop"].some(
      (k) => lowerTranscript.includes(k),
    );

    if (isApprove) {
      console.log("[VOICE-SAFETY] ✅ User APPROVED via voice");
      soundService.play("SUCCESS");
      approvalRequest.resolve(true);
      setApprovalRequest(null);
    } else if (isDeny) {
      console.log("[VOICE-SAFETY] ❌ User DENIED via voice");
      soundService.play("ALERT");
      approvalRequest.resolve(false);
      setApprovalRequest(null);
    }
  }, [voiceTranscript, approvalRequest, setApprovalRequest]);

  // --- ACTIONS ---
  const handleCyclePersona = async () => {
    soundService.play("KEYSTROKE");
    const personas: PersonaType[] = [
      "RUTHLESS",
      "ASSISTANT",
      "ENGINEER",
      "HACKER",
    ];
    const currentIndex = personas.indexOf(persona);
    const nextIndex = (currentIndex + 1) % personas.length;
    const nextPersona = personas[nextIndex];

    await executeTool("switchPersona", { mode: nextPersona });
  };

  return {
    persona,
    voiceStatus,
    setVoiceStatus,
    isSpeaking,
    setIsSpeaking,
    voiceBackend,
    setVoiceBackend,
    dictationActive,
    setDictationActive,
    isVoiceMode,
    setIsVoiceMode,
    remoteAmplitude,
    connectVoiceSession,
    handleCyclePersona,
    // Internal state exposed
    voiceTranscript,
    setVoiceTranscript,
    voiceTranscriptSource,
    setVoiceTranscriptSource,
    isVadActive,
    setIsVadActive,
    // Pass-throughs from useVoiceInput
    voiceHubTranscript,
    isVoiceHubListening,
    voiceHubStatus,
    voiceAmplitude: localInputAmplitude, // Return local for legacy props if needed, or use context?
    // Actually, generally useVoiceEngine consumers might expect the *merged* amplitude or the *local* one.
    // Let's return the local one as 'voiceAmplitude' to match previous signature if it was local.
    // Wait, previous signature was: `voiceAmplitude: voiceAmplitude` (which was localInputAmplitude aliased).
    // So we keep returning localInputAmplitude as voiceAmplitude for compatibility, BUT we synced the Context.
    voiceHubError,
    startVoiceHub,
    stopVoiceHub,
    forceKillWakeWord,
  };
}
