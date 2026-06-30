/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useState, useEffect, useMemo, useRef } from "react";
import LucaChatSurface from "./chat/LucaChatSurface";
import { ScreenShare, ScreenShareHandle } from "./ScreenShare";
import { Suggestion } from "./SuggestionChips";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { lucaService, PersonaType } from "../services/lucaService";
import { useLucaLinkDelegation } from "../hooks/useLucaLinkDelegation";
import { lucaLinkManager } from "../services/lucaLink/manager";
import { ToolRegistry } from "../services/toolRegistry";
import conversationService from "../services/conversationService";
import { awarenessService } from "../services/awarenessService";
import { settingsService } from "../services/settingsService";
import type { LucaSettings } from "../services/settingsService";
import { PERSONA_UI_CONFIG } from "../config/themeColors";
import { getLucaSkinMaterialVariables } from "../styles/lucaSkinMaterialBridge";
import SecurityGate from "./SecurityGate";
import {
  createMiniChatPresenceSnapshot,
  getMiniChatApprovalPrompt,
  type MiniChatLegacyPayload,
} from "../presence/bridges";
import {
  createMiniChatMessageRequest,
  toLegacyChatWidgetMessage,
} from "../presence/messages";

interface ChatWidgetState {
  history: {
    id?: string;
    sender: "user" | "luca";
    text: string;
    attachment?: string | null;
    generatedImage?: string | null;
    generatedVideo?: string | null;
    isStreaming?: boolean;
    tacticalData?: any;
  }[];
  isProcessing: boolean;
  persona?: string;
  theme?: string;
  brainModel?: string;
  embeddingModel?: string;
  approvalRequest?: any;
}

export function getMiniChatPresenceUpdate(data: MiniChatLegacyPayload) {
  const snapshot = createMiniChatPresenceSnapshot(data);
  const voice = snapshot.voice;
  const theme =
    (data.theme as string | undefined) ??
    (data.themeHex as string | undefined);

  return {
    persona: data.persona ? snapshot.persona : undefined,
    theme,
    brainModel:
      data.activeBrainId
        ? (data.activeBrainId as string)
        : data.brainModel,
    embeddingModel: data.embeddingModel as string | undefined,
    amplitude: data.amplitude !== undefined ? voice.amplitude : undefined,
    isSpeaking:
      data.isSpeaking !== undefined ? voice.isSpeaking : undefined,
    isVadActive:
      data.isVadActive !== undefined
        ? voice.isListening
        : undefined,
    approvalRequest:
      data.approvalRequest !== undefined
        ? getMiniChatApprovalPrompt(snapshot, data)
        : undefined,
  };
}

const ChatWidgetMode: React.FC = () => {
  const [input, setInput] = useState("");
  const [state, setState] = useState<ChatWidgetState>(() => {
    const settings = settingsService.getSettings();
    const savedPersona = settings.general.persona || "ASSISTANT";
    const savedTheme = settings.general.theme || "ASSISTANT";
    const activeBrainId = settings.general.activeBrainId || "gemma-2b";
    const embeddingModel = settings.brain.embeddingModel || "gemini-2.1-flash";

    return {
      history: [],
      isProcessing: false,
      persona: savedPersona as PersonaType,
      theme: savedTheme as any,
      brainModel: activeBrainId,
      embeddingModel: embeddingModel,
    };
  });
  const [inputHeight, setInputHeight] = useState(44); // Base input height
  const [isEyeActive, setIsEyeActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem("LUCA_CHAT_WIDTH");
    return saved ? parseInt(saved, 10) : 800;
  }); // Widget width
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const historyContainerRef = useRef<HTMLDivElement>(null); // NEW: To measure content height
  const screenShareRef = useRef<ScreenShareHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDictationMode, setIsDictationMode] = useState(false);
  const [remoteAmplitude, setRemoteAmplitude] = useState(0);
  const [isRemoteSpeaking, setIsRemoteSpeaking] = useState(false);
  const [isRemoteVadActive, setIsRemoteVadActive] = useState(false);
  const [selectedSkinId, setSelectedSkinId] = useState<unknown>(
    () => settingsService.getSettings().general.selectedSkinId,
  );

  // === AWARENESS ENGINE STATE ===
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showChips, setShowChips] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const hasTriggeredAwakening = useRef(false);

  const {
    isListening,
    transcript,
    status: voiceStatus,
    volume,
    startListening,
    stopListening,
  } = useVoiceInput();

  // Track transcript to inject on stop (since hook clears it on stop)
  const transcriptRef = useRef("");
  useEffect(() => {
    transcriptRef.current = transcript;

    // DIRECT VOICE-TO-TEXT: Update input with transcript while listening
    if (isListening && transcript && transcript.trim()) {
      // For simplicity in this direct mode: just show the live transcript.
      // User can edit before sending.
      setInput(transcript);
    }
  }, [transcript, isListening]);

  useEffect(() => {
    const handleSettingsChange = (settings: LucaSettings) => {
      setSelectedSkinId(settings.general.selectedSkinId);
    };

    settingsService.on("settings-changed", handleSettingsChange);
    return () => {
      settingsService.off("settings-changed", handleSettingsChange);
    };
  }, []);

  // Handle explicit start to ensure connection
  const handleToggleVoice = async () => {
    if (isListening) {
      stopListening();
    } else {
      // Ensure we have a fresh start in ACTIVE mode (immediate listening, no wake word)
      try {
        await startListening("ACTIVE", { suppressAudio: true }); // SILENT DICTATION
      } catch (e) {
        console.error("Failed to start listening:", e);
      }
    }
  };

  // --- ONE OS: LUCA LINK DELEGATION ---
  // This enables this widget (mobile or desktop) to receive commands from other devices
  useLucaLinkDelegation(
    (lucaLinkManager as any).myDeviceId,
    undefined, // Use default ToolRegistry.execute
    {
      currentDeviceId: (lucaLinkManager as any).myDeviceId,
      currentDeviceType: "android", // We assume widget mode on mobile is Android for now, or use a hook to detect
      lucaLinkManager: lucaLinkManager,
      lucaService: lucaService,
      sessionId: conversationService.getSessionId(),
    },
    {
      onCommandReceived: (command: string) => {
        // Trigger Luca Pulse for vision/automation commands
        if (
          command.includes("android_") ||
          command === "readScreen" ||
          command === "proofreadText"
        ) {
          setIsScanning(true);
        }
      },
      onCommandComplete: () => {
        // Delay clearing pulses for a "fade out" effect
        setTimeout(() => setIsScanning(false), 1500);
      },
    },
  );

  // IPC Listener for Dictation Toggle (Alt+Space / Tray)
  useEffect(() => {
    if ((window as any).electron && (window as any).electron.ipcRenderer) {
      // @ts-ignore
      const remove = window.electron.ipcRenderer.on(
        "trigger-voice-toggle",
        () => {
          console.log("[ChatWidget] Toggling Dictation Mode");
          setIsDictationMode((prev) => {
            const nextMode = !prev;
            if (nextMode) {
              console.log(
                "[ChatWidget] Starting Dictation... Calling startListening()",
              );
              // START LISTENING (SILENT)
              startListening("ACTIVE", { suppressAudio: true });
            } else {
              console.log(
                "[ChatWidget] Stopping Dictation... Calling stopListening()",
              );
              // STOP LISTENING & INJECT
              const textToType = transcriptRef.current;
              stopListening();

              if (textToType && textToType.trim()) {
                console.log("[ChatWidget] Injecting text:", textToType);
                // @ts-ignore
                window.electron.ipcRenderer.send("type-text", {
                  text: textToType,
                });
              }
            }
            return nextMode;
          });
        },
      );
      // @ts-ignore
      return () => {
        remove();
      };
    }
  }, [startListening, stopListening]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setAttachment(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Focus input on mount
  useEffect(() => {
    const inputEl = document.getElementById("chat-input");
    if (inputEl) inputEl.focus();
  }, []);

  // === AWAKENING PULSE — fires once when Mini Chat first opens ===
  useEffect(() => {
    if (hasTriggeredAwakening.current) return;
    hasTriggeredAwakening.current = true;

    const triggerAwakening = async () => {
      const profile = settingsService.get("general");
      const persona = (state.persona || "ASSISTANT") as string;
      const prompt = await awarenessService.triggerAwakeningPulse(
        {
          mode: "text",
          operatorName: profile?.userName || "Operator",
          persona,
        },
        "mini-chat",
      );

      if (prompt && window.electron?.ipcRenderer) {
        console.log("[MINI-CHAT] 🌅 Awakening pulse fired");
        const request = createMiniChatMessageRequest({
          text: prompt,
          source: "miniChat",
          isAwakeningPulse: true,
        });
        // @ts-ignore
        window.electron.ipcRenderer.send(
          "chat-widget-message",
          toLegacyChatWidgetMessage(request),
        );
      }
    };

    // Delay slightly to ensure window is fully ready
    const timer = setTimeout(triggerAwakening, 800);
    return () => clearTimeout(timer);
  }, []);

  // === SUGGESTION CHIPS — generated on mount and when persona changes ===
  useEffect(() => {
    const persona = (state.persona || "ASSISTANT") as string;
    const chips = awarenessService.generateSuggestions(persona);
    setSuggestions(chips);
    // Show chips after a brief delay for a nice entrance
    const timer = setTimeout(() => setShowChips(true), 1200);
    return () => clearTimeout(timer);
  }, [state.persona]);

  // Hide chips when user starts chatting, show again when history is cleared
  useEffect(() => {
    if (state.history.length > 0) {
      setShowChips(false);
    } else {
      // Re-generate fresh suggestions when chat is cleared
      const persona = (state.persona || "ASSISTANT") as string;
      const chips = awarenessService.generateSuggestions(persona);
      setSuggestions(chips);
      const timer = setTimeout(() => setShowChips(true), 500);
      return () => clearTimeout(timer);
    }
  }, [state.history.length === 0]);

  // === AMBIENT VISION LOOP — starts when eye is toggled on ===
  useEffect(() => {
    if (isEyeActive) {
      const privacy = settingsService.get("privacy");
      if (!privacy?.screenEnabled) {
        console.warn("[MINI-CHAT] 🔒 Screen observation blocked by privacy.");
        return;
      }
      awarenessService.startAmbientVisionLoop({
        mode: "text",
        persona: (state.persona || "ASSISTANT") as string,
        onSuggestionsUpdate: (newSuggestions) => {
          setSuggestions(newSuggestions);
          setShowChips(true);
        },
        onStatusChange: (active) => {
          console.log(`[MINI-CHAT] Vision loop status: ${active}`);
        },
      });
    } else {
      awarenessService.stopAmbientVisionLoop();
    }

    return () => {
      awarenessService.stopAmbientVisionLoop();
    };
  }, [isEyeActive, state.persona]);

  // Scroll to bottom
  useEffect(() => {
    const isStreaming = state.history.some((m) => m.isStreaming);
    messagesEndRef.current?.scrollIntoView({
      behavior: isStreaming ? "auto" : "smooth",
      block: "end",
    });
  }, [state.history]);

  // IPC Listeners
  useEffect(() => {
    // @ts-ignore
    if (window.electron && window.electron.ipcRenderer) {
      // @ts-ignore
      const remove = window.electron.ipcRenderer.on(
        "chat-widget-reply",
        (reply: any) => {
          // ... (keep existing logic for non-streaming fallback if needed, or minimal update) ...
          // For now, we assume App.tsx sends chunks, so this might not be hit for streaming messages
          // OR it might be hit at the end as a duplicate.
          // Let's modify App.tsx to ONLY send stream chunks if streaming, or handle both.
          // BUT: App.tsx sends 'broadcast-stream-chunk'.
          // So we should just ADD the new listener.
          let fullText = "";
          let generatedImage: string | null = null;
          if (typeof reply === "object" && reply !== null) {
            fullText = reply.text || "";
            generatedImage = reply.generatedImage || null;
          } else {
            fullText = String(reply);
          }
          // Fallback legacy handler (if needed)
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            history: [
              ...prev.history,
              {
                sender: "luca",
                text: fullText,
                generatedImage,
                isStreaming: false,
              },
            ],
          }));
        },
      );

      // NEW: Streaming Listener
      // @ts-ignore
      const removeStream = window.electron.ipcRenderer.on(
        "chat-widget-stream-chunk",
        (data: {
          id: string;
          text?: string;
          isComplete?: boolean;
          generatedImage?: string;
          generatedVideo?: string;
          tacticalData?: any;
        }) => {
          setState((prev) => {
            const history = [...prev.history];
            const existingIdx = history.findIndex((m) => m.id === data.id);

            // If message doesn't exist yet, create it (streaming start)
            if (existingIdx === -1) {
              return {
                ...prev,
                isProcessing: true,
                history: [
                  ...history,
                  {
                    id: data.id,
                    sender: "luca",
                    text: data.text || "",
                    isStreaming: !data.isComplete,
                    generatedImage: data.generatedImage,
                    generatedVideo: data.generatedVideo,
                    tacticalData: data.tacticalData,
                  },
                ],
              };
            }

            // Update existing message
            const currentMsg = history[existingIdx];
            history[existingIdx] = {
              ...currentMsg,
              text: data.isComplete
                ? data.text || currentMsg.text
                : currentMsg.text + (data.text || ""),
              isStreaming: !data.isComplete,
              generatedImage: data.generatedImage || currentMsg.generatedImage,
              generatedVideo: data.generatedVideo || currentMsg.generatedVideo,
              tacticalData: data.tacticalData || currentMsg.tacticalData,
            };

            return {
              ...prev,
              isProcessing: !data.isComplete,
              history,
            };
          });
        },
      );

      // @ts-ignore
      return () => {
        if (remove) remove();
        if (removeStream) removeStream();
      };
    }
  }, []);

  // Update State from Main (Persona Sync)
  useEffect(() => {
    // @ts-ignore
    if (window.electron && window.electron.ipcRenderer) {
      // 1. Listen for widget-update (from App.tsx sync-widget-state)
      // @ts-ignore
      const removeWidgetUpdate = window.electron.ipcRenderer.on(
        "widget-update",
        (data: any) => {
          const update = getMiniChatPresenceUpdate(data);
          if (update.persona) {
            setState((prev) => ({ ...prev, persona: update.persona }));
          }
          if (update.theme) {
            setState((prev) => ({ ...prev, theme: update.theme }));
          }
          if (update.brainModel) {
            setState((prev) => ({ ...prev, brainModel: update.brainModel }));
          }
          if (update.embeddingModel) {
            setState((prev) => ({ ...prev, embeddingModel: update.embeddingModel }));
          }
          if (update.amplitude !== undefined) {
            setRemoteAmplitude(update.amplitude);
          }
          if (update.isSpeaking !== undefined) {
            setIsRemoteSpeaking(update.isSpeaking);
          }
          if (update.isVadActive !== undefined) {
            setIsRemoteVadActive(update.isVadActive);
          }
          if (update.approvalRequest !== undefined) {
            setState((prev) => ({
              ...prev,
              approvalRequest: update.approvalRequest,
            }));
          }
        },
      );

      // 2. Listen for switch-persona (from Tray Menu)
      // @ts-ignore
      const removeSwitchPersona = window.electron.ipcRenderer.on(
        "switch-persona",
        (newPersona: string) => {
          setState((prev) => ({ ...prev, persona: newPersona as PersonaType }));
        },
      );

      // 3. Listen for clear signal (fresh start on each toggle)
      // @ts-ignore
      const removeClear = window.electron.ipcRenderer.on(
        "chat-widget-clear",
        () => {
          setState((prev) => ({ ...prev, history: [], isProcessing: false }));
          setInput("");
          setAttachment(null);
        },
      );

      // 4. Listen for vision-status update
      // @ts-ignore
      const removeVisionStatus = window.electron.ipcRenderer.on(
        "vision-status",
        (data: { active: boolean; performanceMode?: string }) => {
          setIsEyeActive(data.active);
          setIsScanning(data.active);
        },
      );

      // @ts-ignore
      return () => {
        if (removeWidgetUpdate) removeWidgetUpdate();
        if (removeSwitchPersona) removeSwitchPersona();
        if (removeClear) removeClear();
        if (removeVisionStatus) removeVisionStatus();
      };
    }
  }, []);

  // Dynamic Resizing Logic
  // Dynamic Resizing Logic: Compact Mode (Mini Chat)
  useEffect(() => {
    // @ts-ignore
    if (window.electron && window.electron.ipcRenderer) {
      if (isDictationMode) {
        // DICTATION MODE: Fixed larger size for Visualizer
        // @ts-ignore
        window.electron.ipcRenderer.send("chat-widget-resize", {
          height: 200,
          resizable: false,
        });
        return;
      }

      const isCompact = state.history.length === 0;

      // Only handle Compact Mode resizing here (reactive to inputHeight)
      if (isCompact) {
        // Chips suppressed in compact mode
        const height = 16 + inputHeight;
        // @ts-ignore
        window.electron.ipcRenderer.send("chat-widget-resize", {
          height,
          resizable: false, // Compact mode is fixed
        });
      }
    }
  }, [
    state.history.length === 0,
    inputHeight,
    isDictationMode,
    showChips,
    suggestions.length,
  ]); // React to input changes in compact mode

  // Dynamic Resizing Logic: Expanded Mode (Auto-Grow)
  useEffect(() => {
    // @ts-ignore
    if (window.electron && window.electron.ipcRenderer) {
      if (state.history.length > 0 && !isDictationMode) {
        // Measure Content Height
        const historyHeight = historyContainerRef.current?.scrollHeight || 0;
        const headerHeight = 40; // Approx header height
        const buffer = 30; // Extra padding

        // Calculate Total Desired Height
        // historyHeight + inputHeight (includes its own padding) + header + buffer
        const totalDesiredHeight =
          historyHeight + inputHeight + headerHeight + buffer;

        // Clamp: Min 200 (sanity), Max 800 (screen safety)
        // Note: Using 800 as a reasonable max before scrolling takes over completely inside the fixed window.
        // The user wants it to "expand", so we let it grow quite a bit before stopping.
        const finalHeight = Math.min(800, Math.max(200, totalDesiredHeight));

        // @ts-ignore
        window.electron.ipcRenderer.send("chat-widget-resize", {
          height: finalHeight,
          resizable: true,
        });
      }
    }
  }, [state.history, inputHeight, isDictationMode]); // Run on history update OR input growth

  // Theme Helpers
  // @ts-ignore
  const themeKey = state.theme || "ASSISTANT";
  const currentTheme =
    PERSONA_UI_CONFIG[themeKey as any] || PERSONA_UI_CONFIG.RUTHLESS;
  const chatSkinVariables = useMemo(
    () =>
      getLucaSkinMaterialVariables({
        skinId: selectedSkinId,
        hostKind: "desktop-app",
        reducedMotion: false,
        reducedTransparency: false,
      }),
    [selectedSkinId],
  );
  const primaryColor =
    (state.theme && state.theme.startsWith("#")
      ? state.theme
      : undefined) ||
    chatSkinVariables["--luca-accent-primary"] ||
    currentTheme.hex;

  // Attachment Logic
  const [attachment, setAttachment] = useState<string | null>(null);

  const handleApprove = () => {
    if (state.approvalRequest && (window as any).electron) {
      (window as any).electron.ipcRenderer.send("resolve-permission", {
        id: state.approvalRequest.id,
        action: "approve",
      });
      // State will be cleared via IPC sync-widget-state from App.tsx
    }
  };

  const handleDeny = () => {
    if (state.approvalRequest && (window as any).electron) {
      (window as any).electron.ipcRenderer.send("resolve-permission", {
        id: state.approvalRequest.id,
        action: "deny",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || state.isProcessing) return;

    const handleSend = async () => {
      const cmd = input.trim();
      const lowerCmd = cmd.toLowerCase();

      // Signal user activity to awareness service (resets idle timer)
      awarenessService.signalActivity();

      // COMMAND: Clear Chat (Client-Side)
      if (
        lowerCmd === "clear chat" ||
        lowerCmd === "clear history" ||
        lowerCmd === "/clear"
      ) {
        setState((prev) => ({ ...prev, history: [] }));
        setInput("");
        setAttachment(null);
        return; // Stop here, don't send to backend
      }

      if (!cmd || state.isProcessing) return;

      let finalAttachment = attachment;

      // EYE LOGIC: If Eye is active, capture screen context immediately
      if (isEyeActive && screenShareRef.current) {
        const capturedFrame = screenShareRef.current.captureFrame();
        if (capturedFrame) {
          finalAttachment = capturedFrame;
        }
      }

      setInput("");
      setAttachment(null); // Clear manual attachment

      // Optimistic update
      setState((prev) => ({
        ...prev,
        history: [
          ...prev.history,
          { sender: "user", text: cmd, attachment: finalAttachment },
        ],
        isProcessing: true,
      }));

      // Send to Main -> App
      // @ts-ignore
      if (window.electron) {
        // @ts-ignore
        const displayId = await window.electron.ipcRenderer.invoke(
          "get-current-display-id",
        );
        const request = createMiniChatMessageRequest({
          text: cmd,
          source: "miniChat",
          image: finalAttachment, // Send the image (from Eye or Upload)
          displayId,
        });
        // @ts-ignore
        window.electron.ipcRenderer.send(
          "chat-widget-message",
          toLegacyChatWidgetMessage(request),
        );
      }
    };
    handleSend();
  };

  const handleClose = () => {
    // @ts-ignore
    if (window.electron) window.electron.ipcRenderer.send("chat-widget-close");
  };

  const handleCapture = async () => {
    // @ts-ignore
    if (window.electron) {
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const screenshotDataUrl =
          await window.electron.ipcRenderer.invoke("capture-screen");
        if (screenshotDataUrl) {
          setAttachment(screenshotDataUrl);
        }
      } catch (e) {
        console.error("Capture failed:", e);
      }
    }
  };

  const clearAttachment = () => setAttachment(null);

  // --- WIDTH RESIZE HANDLERS ---
  const handleResizeStart = (
    e: React.MouseEvent,
    direction: "left" | "right",
  ) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = width;
    let finalWidth = startWidth;

    const handleMouseMove = (moveE: MouseEvent) => {
      const delta =
        direction === "left" ? startX - moveE.clientX : moveE.clientX - startX;
      finalWidth = Math.max(200, Math.min(1200, startWidth + delta));
      setWidth(finalWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // PERSISTENCE: Save new width
      localStorage.setItem("LUCA_CHAT_WIDTH", finalWidth.toString());

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleSuggestionSelect = (prompt: string) => {
    setInput(prompt);
    if (window.electron?.ipcRenderer) {
      setState((prev) => ({
        ...prev,
        history: [...prev.history, { sender: "user", text: prompt }],
        isProcessing: true,
      }));
      const request = createMiniChatMessageRequest({
        text: prompt,
        source: "miniChat",
      });
      // @ts-ignore
      window.electron.ipcRenderer.send(
        "chat-widget-message",
        toLegacyChatWidgetMessage(request),
      );
      setInput("");
      setShowChips(false);
    }
  };

  const approvalSurface = state.approvalRequest ? (
    <div className="p-4 border-t border-white/10 bg-black/40 glass-blur">
      <SecurityGate
        toolName={state.approvalRequest.toolName || "SYSTEM_OVERRIDE"}
        args={state.approvalRequest.args || {}}
        userName={state.approvalRequest.userName || "OPERATOR"}
        persona={(state.persona as any) || "ASSISTANT"}
        onApprove={handleApprove}
        onDeny={handleDeny}
        theme={{
          hex: primaryColor,
          bg: "rgba(0,0,0,0.8)",
          border: primaryColor,
          primary: primaryColor,
          glow: `${primaryColor}40`,
          coreColor: primaryColor,
        }}
      />
    </div>
  ) : null;

  const hiddenRuntimeSurface = (
    <div className="absolute bottom-0 right-0 z-0 pointer-events-none opacity-0">
      <ScreenShare
        ref={screenShareRef}
        isActive={isEyeActive}
        onToggle={setIsEyeActive}
        onFrameCapture={(base64) => {}}
        theme={{
          hex: primaryColor,
          bg: "transparent",
          border: primaryColor,
          primary: primaryColor,
        }}
        showUI={false}
      />
    </div>
  );

  return (
    <div
      onMouseEnter={() => setShowClose(true)}
      onMouseLeave={() => setShowClose(false)}
      style={chatSkinVariables as React.CSSProperties}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileSelect}
      />
      <LucaChatSurface
        messages={state.history as any}
        inputValue={input}
        onInputChange={setInput}
        onSend={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
        primaryColor={primaryColor}
        persona={state.persona}
        themeName={state.theme}
        brainModel={state.brainModel}
        embeddingModel={state.embeddingModel}
        pending={state.isProcessing}
        suggestions={suggestions}
        showSuggestions={state.history.length > 0 && showChips}
        width={`${width}px`}
        attachment={attachment}
        isEyeActive={isEyeActive}
        isScanning={isScanning}
        isVoiceActive={isListening || isRemoteVadActive}
        isSpeaking={isListening}
        amplitude={volume * 500}
        showClose={showClose}
        hasApprovalRequest={!!state.approvalRequest}
        historyContainerRef={historyContainerRef}
        messagesEndRef={messagesEndRef}
        approvalSurface={approvalSurface}
        hiddenRuntimeSurface={hiddenRuntimeSurface}
        onSelectSuggestion={handleSuggestionSelect}
        onDismissSuggestions={() => {
          setSuggestions([]);
          setShowChips(false);
        }}
        onAttachClick={() => fileInputRef.current?.click()}
        onClearAttachment={clearAttachment}
        onToggleEye={() => setIsEyeActive(!isEyeActive)}
        onOpenVoice={handleToggleVoice}
        onHeightChange={setInputHeight}
        onClearChat={() => setState((prev) => ({ ...prev, history: [] }))}
        onResizeStart={handleResizeStart}
        onClose={handleClose}
      />
    </div>
  );
};

export default ChatWidgetMode;
