import { useState, useEffect, useRef, useCallback } from "react";
import { settingsService } from "../../services/settingsService";
import { liveService } from "../../services/liveService";
import { soundService } from "../../services/soundService";
import { useVoiceInput } from "../useVoiceInput";
import { PersonaType } from "../../services/lucaService";
import { useAppContext } from "../../context/AppContext";

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
    voiceAmplitude,
    setVoiceAmplitude,
    approvalRequest,
    setApprovalRequest,
  } = voice;

  // --- LOCAL ENGINE STATE ---

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

  // 1. Sync Persona with Settings
  useEffect(() => {
    const handleSettingsChange = (newSettings: any) => {
      const newTheme = newSettings.general?.theme;
      if (newTheme && newTheme !== persona) {
        console.log("[VOICE ENGINE] Persona changed via Settings:", newTheme);

        // Bridge: Auto-switch voice backend based on persona
        const personaBackends: Record<string, string> = {
          ASSISTANT: "GEMINI",
          RUTHLESS: "GROQ",
          ENGINEER: "OPENAI",
          HACKER: "GROQ",
        };
        const backend = (personaBackends[newTheme] || "GEMINI") as any;
        setVoiceBackend(backend);
      }
    };
    settingsService.on("settings-changed", handleSettingsChange);
    return () => {
      settingsService.off("settings-changed", handleSettingsChange);
    };
  }, [persona]);

  // 3. Connect Voice Session
  const connectVoiceSession = useCallback(
    (targetPersona: PersonaType) => {
      console.log(`[VOICE ENGINE] Connecting Session: ${targetPersona}...`);
      liveService.disconnect();

      const voiceSettings = settingsService.get("voice");
      const isHybridMode =
        (voiceSettings?.provider || "cloud") !== "gemini-genai" &&
        targetPersona !== "DICTATION";

      liveService
        .connect({
          persona: targetPersona,
          suppressOutput: isHybridMode,
          onToolCall: executeTool,
          onAudioData: (amp) => {
            setRemoteAmplitude(amp);
            // We'll sync the max amplitude in an effect
          },
          onVadChange: (active) => setIsVadActive(active),
          onTranscript: (text, source) => {
            setVoiceTranscript(text);
            setVoiceTranscriptSource(source as "user" | "model");
          },
        })
        .then(() => {
          setVoiceStatus("VOICE UPLINK ACTIVE");
          soundService.play("SUCCESS");
        })
        .catch((err) => {
          console.error("Voice Connection Failed:", err);
          setVoiceStatus("CONNECTION FAILED");
          soundService.play("ALERT");
        });
    },
    [executeTool, setIsVadActive, setVoiceTranscript, setVoiceTranscriptSource],
  );

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
      const isNative = provider === "gemini-genai";
      const mode = isNative ? "CLOUD (Native)" : "LOCAL/HYBRID";

      console.log(
        `[VOICE ENGINE] Settings Update (${mode}) - Provider: ${provider}`,
      );

      // Auto-reconnect if STT Model changes
      const prevStt = prevSttModelRef.current;
      const newStt = sttModel || "cloud-gemini";

      if (prevStt !== newStt) {
        console.log(`[VOICE ENGINE] STT Change: ${prevStt} -> ${newStt}`);
        const wasCloud = prevStt.includes("gemini");
        const isCloud = newStt.includes("gemini");

        if (wasCloud) liveService.disconnect();
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

  // 8. Sync Amplitude to Context (Max of Local & Remote)
  useEffect(() => {
    const maxAmp = Math.max(localInputAmplitude, remoteAmplitude);
    // Only update if significant change to avoid context thrashing
    if (Math.abs(maxAmp - voiceAmplitude) > 5) {
      setVoiceAmplitude(maxAmp);
    }
  }, [localInputAmplitude, remoteAmplitude, voiceAmplitude, setVoiceAmplitude]);

  // --- SAFETY VALVE VOICE INTEGRATION ---
  const lastAnnouncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (approvalRequest?.isSafetyValve) {
      const requestId = `${approvalRequest.tool}_${approvalRequest.action}`;
      if (lastAnnouncedRef.current !== requestId) {
        console.log("[VOICE-SAFETY] 🛡️ Announcing Safety Valve via TTS...");
        const announceMsg = `SYSTEM ALERT: Safety Valve triggered for action ${approvalRequest.action}. ${approvalRequest.message}. Say "ALLOW" to proceed, or "DENY" to block.`;
        liveService.sendText(announceMsg);
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
