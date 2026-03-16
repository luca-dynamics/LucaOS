import { useState, useEffect, useRef, useCallback } from "react";
import { Message, Sender, ToolExecutionLog, TacticalLog } from "../../types";
import { PersonaType } from "../../services/lucaService";
import { lucaService } from "../../services/lucaService";
import { voiceService } from "../../services/voiceService";
import { soundService } from "../../services/soundService";
import { memoryService } from "../../services/memoryService";
import conversationService from "../../services/conversationService";
import { awarenessService } from "../../services/awarenessService";
import { lucaWorkforce } from "../../services/agent/LucaWorkforce";

const CHAT_STORAGE_KEY = "LUCA_CHAT_HISTORY_V1";
const MAX_HISTORY_LIMIT = 50;

interface UseChatControllerProps {
  // Voice integration
  persona: PersonaType;
  isVoiceMode: boolean;
  setVoiceTranscript: (t: string) => void;
  setVoiceTranscriptSource: (s: "user" | "model") => void;
  setIsSpeaking: (v: boolean) => void;

  // Tool execution
  executeTool: (name: string, args: any) => Promise<any>;
  currentCwd: string;
  toolLogs: ToolExecutionLog[];

  // Broadcasting
  lucaLinkSocketRef: React.MutableRefObject<any>;
  broadcastMessageToMobile: (text: string, sender: "user" | "luca") => void;

  // Scroll target
  chatEndRef: React.RefObject<HTMLDivElement | null>;

  // Boot state (for scroll timing)
  bootSequence: string;

  // Turn tracking for Action Blocks (Tactical Logs)
  turnLogsRef?: React.MutableRefObject<TacticalLog[]>;
  visualData?: any;
}

export function useChatController({
  persona,
  isVoiceMode,
  setVoiceTranscript,
  setVoiceTranscriptSource,
  setIsSpeaking,
  executeTool,
  currentCwd,
  toolLogs,
  lucaLinkSocketRef,
  broadcastMessageToMobile,
  chatEndRef,
  bootSequence,
  turnLogsRef,
  visualData,
}: UseChatControllerProps) {
  // --- PERSISTENT CHAT STATE ---
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(
            `[STORAGE] Loaded ${parsed.length} messages from history.`,
          );
          return parsed;
        }
      }
    } catch (e: any) {
      console.warn("[STORAGE] Failed to load chat history:", e);
    }
    return [];
  });

  // Track messages for stable refs
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastMessageSourceRef = useRef<"desktop" | "mobile" | null>(null);

  // Refs for ingestion batching
  const lastIngestedIndexRef = useRef<number>(-1);
  const ingestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- ROBUST PERSISTENCE EFFECT WITH PRUNING ---
  useEffect(() => {
    try {
      // PRUNE LARGE IMAGES to prevent QuotaExceededError
      let optimizedMessages = messages.map((msg) => ({
        ...msg,
        attachment:
          msg.attachment && msg.attachment.length > 1000
            ? undefined
            : msg.attachment,
        generatedImage:
          msg.generatedImage && msg.generatedImage.length > 1000
            ? undefined
            : msg.generatedImage,
        _wasPruned: !!(
          (msg.attachment && msg.attachment.length > 1000) ||
          (msg.generatedImage && msg.generatedImage.length > 1000)
        ),
      }));

      // --- PRUNE HISTORY LENGTH (Rolling Window) ---
      if (optimizedMessages.length > MAX_HISTORY_LIMIT) {
        optimizedMessages = optimizedMessages.slice(-MAX_HISTORY_LIMIT);
      }

      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(optimizedMessages));

      // --- AUTOMATIC CONVERSATION INGESTION INTO LIGHTRAG (Batched) ---
      const newMessages = optimizedMessages.slice(
        lastIngestedIndexRef.current + 1,
      );
      if (newMessages.length > 0) {
        const BATCH_SIZE = 5;
        const BATCH_COOLDOWN = 30000; // 30 seconds

        const triggerIngestion = () => {
          const toIngest = optimizedMessages
            .slice(lastIngestedIndexRef.current + 1)
            .filter((msg) => {
              // 1. Skip hidden system pulses
              if (msg.isHidden) return false;

              // 2. Content-based emergency filter (Failsafe)
              const lowerText = (msg.text || "").toLowerCase();
              if (
                lowerText.includes("[system awakening pulse]") ||
                lowerText.includes("[ambient vision]") ||
                lowerText.includes("[system instruction]")
              ) {
                return false;
              }

              return true;
            });

          if (toIngest.length === 0) {
            lastIngestedIndexRef.current = optimizedMessages.length - 1;
            return;
          }

          console.log(
            `[CORTEX] Ingesting batch of ${toIngest.length} messages...`,
          );
          lastIngestedIndexRef.current = optimizedMessages.length - 1;

          memoryService
            .ingestConversation(
              toIngest.map((msg) => ({
                sender: msg.sender === Sender.USER ? "user" : "assistant",
                text: msg.text || "",
                timestamp: msg.timestamp,
              })),
            )
            .catch((err: any) => {
              console.warn("[CORTEX] Batch ingestion failed:", err);
            });
        };

        // Clear existing timer
        if (ingestionTimerRef.current) clearTimeout(ingestionTimerRef.current);

        if (newMessages.length >= BATCH_SIZE) {
          triggerIngestion();
        } else {
          ingestionTimerRef.current = setTimeout(
            triggerIngestion,
            BATCH_COOLDOWN,
          );
        }
      }
    } catch (e: any) {
      console.warn(
        "[STORAGE] Failed to save chat history (likely quota exceeded):",
        e,
      );
      // Emergency fallback
      try {
        const shortHistory = messages.slice(-10).map((msg) => ({
          ...msg,
          attachment: undefined,
          generatedImage: undefined,
        }));
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(shortHistory));
        console.log("[STORAGE] Saved truncated history (last 10) as fallback.");
      } catch (e2) {
        console.error("[STORAGE] Critical storage failure.", e2);
      }
    }
  }, [messages]);

  // --- SCROLL HANDLING ---
  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatEndRef]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "auto" });
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, []); // Run on mount

  // Scroll when boot sequence completes
  useEffect(() => {
    if (bootSequence === "READY" && messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [bootSequence, chatEndRef]);

  // Synchronize visualData / turnLogs with the currently processing message
  useEffect(() => {
    if (isProcessing && turnLogsRef?.current) {
      setMessages((prev) =>
        prev.map((m) =>
          m.isStreaming
            ? {
                ...m,
                tacticalData:
                  turnLogsRef.current && turnLogsRef.current.length > 0
                    ? {
                        type: visualData?.type || "TACTICAL",
                        status: "PROCESSING",
                        logs: [...turnLogsRef.current],
                        title: visualData?.title,
                      }
                    : m.tacticalData,
              }
            : m,
        ),
      );
    }
  }, [visualData, isProcessing, turnLogsRef]);

  // --- CORE SEND MESSAGE ---
  const handleSendMessage = useCallback(
    async (
      text: string,
      image?: string | null,
      onProgress?: (message: string, progress?: number) => void,
      sendHidden: boolean = false,
      hideResponse: boolean = false,
    ): Promise<string | undefined> => {
      if (!text.trim() || isProcessing) return;

      // Track message source
      const messageSource = lastMessageSourceRef.current || "desktop";
      lastMessageSourceRef.current = null;

      const userMsg: Message = {
        id: Date.now().toString(),
        text: text,
        sender: Sender.USER,
        timestamp: Date.now(),
        attachment: image || undefined,
      };

      // Update UI immediately (unless hidden system pulse)
      if (!sendHidden) {
        setMessages((prev) => [...prev, userMsg]);
      }

      // Store conversation in Chroma DB
      conversationService
        .storeMessage(userMsg, {
          persona: persona,
          deviceType: messageSource,
          sessionId: conversationService.getSessionId(),
        })
        .catch((err: any) =>
          console.warn("[CONVERSATION] Failed to store user message:", err),
        );

      setIsProcessing(true);

      // Sync user message to mobile if from desktop
      if (messageSource === "desktop") {
        broadcastMessageToMobile(userMsg.text, "user");
      }

      // Reset Turn Logs for new execution cycle
      if (turnLogsRef) turnLogsRef.current = [];

      try {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        // Immediate acknowledgment for voice
        if (isVoiceMode) {
          setVoiceTranscript("Processing your request...");
          setVoiceTranscriptSource("model");
        }

        setMessages((prev) => [
          ...prev,
          {
            id: "typing",
            text: "...",
            sender: Sender.LUCA,
            timestamp: Date.now(),
            isTyping: true,
          },
        ]);

        // Create streaming response placeholder
        const responseId = (Date.now() + 1).toString();
        const initialResponse: Message = {
          id: responseId,
          text: "",
          sender: Sender.LUCA,
          timestamp: Date.now(),
          isStreaming: true,
          isHidden: hideResponse,
        };

        setMessages((prev) =>
          prev.filter((m) => !m.isTyping).concat(initialResponse),
        );

        let streamedText = "";

        const agentResponse = await lucaService.sendMessageStream(
          text,
          image || null,
          (chunk) => {
            if (controller.signal.aborted) return;
            streamedText += chunk;

            // Update UI
            setMessages((prev) =>
              prev.map((m) =>
                m.id === responseId
                  ? {
                      ...m,
                      text: streamedText,
                      tacticalData:
                        turnLogsRef?.current && turnLogsRef.current.length > 0
                          ? {
                              type: visualData?.type || "TACTICAL",
                              status: "PROCESSING",
                              logs: [...turnLogsRef.current],
                              title: visualData?.title,
                            }
                          : m.tacticalData,
                    }
                  : m,
              ),
            );

            // Update voice/progress
            if (onProgress) onProgress(streamedText);
            if (isVoiceMode) setVoiceTranscript(streamedText);

            // BROADCAST CHUNK TO CHAT WIDGET
            if (
              (window as any).electron &&
              (window as any).electron.ipcRenderer
            ) {
              window.electron.ipcRenderer.send("chat-widget-stream-chunk", {
                id: responseId,
                text: chunk,
                isComplete: false,
              });
            }
          },
          executeTool,
          currentCwd,
        );

        const lucaResponse: Message = {
          ...initialResponse,
          text: agentResponse.text || streamedText,
          isStreaming: false,
          isHidden: hideResponse,
          groundingMetadata: agentResponse.groundingMetadata,
          generatedImage: agentResponse.generatedImage,
          tacticalData:
            turnLogsRef?.current && turnLogsRef.current.length > 0
              ? {
                  type: visualData?.type || "TACTICAL",
                  status: visualData?.status || "COMPLETE",
                  logs: [...turnLogsRef.current],
                  title: visualData?.title,
                }
              : undefined,
        };

        setMessages((prev) =>
          prev.map((m) => (m.id === responseId ? lucaResponse : m)),
        );

        // Tell Chat Widget we are done
        if ((window as any).electron && (window as any).electron.ipcRenderer) {
          window.electron.ipcRenderer.send("chat-widget-stream-chunk", {
            id: responseId,
            text: agentResponse.text || streamedText,
            isComplete: true,
            generatedImage: agentResponse.generatedImage,
            generatedVideo: agentResponse.generatedVideo,
          });
        }

        // Store LUCA response in Chroma DB
        conversationService
          .storeMessage(lucaResponse, {
            persona: persona,
            deviceType: messageSource,
            sessionId: conversationService.getSessionId(),
            toolsUsed: toolLogs.slice(-5).map((log) => log.toolName),
          })
          .catch((err: any) =>
            console.warn("[CONVERSATION] Failed to store LUCA response:", err),
          );

        // Broadcast LUCA response to mobile
        if (lucaResponse.text) {
          broadcastMessageToMobile(lucaResponse.text, "luca");
        }

        // BROADCAST TO LUCA LINK DEVICES
        if (lucaLinkSocketRef.current && lucaLinkSocketRef.current.connected) {
          if (messageSource !== "mobile") {
            lucaLinkSocketRef.current.emit("client:message", {
              id: crypto.randomUUID(),
              type: "response",
              source: "desktop",
              target: "all",
              response: {
                success: true,
                result: lucaResponse.text,
                timestamp: lucaResponse.timestamp,
              },
              timestamp: Date.now(),
            });
            console.log("[LUCA LINK] Broadcasted response to mobile devices");
          }
        }

        // TTS - Speak response naturally
        if (lucaResponse.text && isVoiceMode) {
          const apiKey = localStorage.getItem("google_tts_api_key");
          const voiceConfig = {
            languageCode:
              localStorage.getItem("google_tts_language") || "en-NG",
            name: localStorage.getItem("google_tts_voice") || "",
          };

          setIsSpeaking(true);
          try {
            const audioBlob = await voiceService.speak(
              lucaResponse.text,
              apiKey || undefined,
              voiceConfig.name ? voiceConfig : undefined,
            );

            if (audioBlob && lucaLinkSocketRef.current?.connected) {
              const reader = new FileReader();
              reader.readAsDataURL(audioBlob);
              reader.onloadend = () => {
                const base64Audio = reader.result;
                lucaLinkSocketRef.current?.emit("client:stream", {
                  type: "tts_audio",
                  data: base64Audio,
                  timestamp: Date.now(),
                });
              };
            }
          } finally {
            setIsSpeaking(false);
          }
        }

        soundService.play("SUCCESS");
        return lucaResponse.text;
      } catch (error) {
        console.error("Message Processing Failed:", error);
        soundService.play("ALERT");
      } finally {
        setIsProcessing(false);
      }
    },
    [
      isProcessing,
      persona,
      isVoiceMode,
      setVoiceTranscript,
      setVoiceTranscriptSource,
      setIsSpeaking,
      executeTool,
      currentCwd,
      toolLogs,
      lucaLinkSocketRef,
      broadcastMessageToMobile,
      turnLogsRef,
      visualData,
    ],
  );

  // --- STOP / ABORT ---
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setMessages((prev) => prev.filter((m) => m.id !== "typing"));
    soundService.play("KEYSTROKE");
  }, []);

  // --- CLEAR CHAT ---
  const handleClearChat = useCallback(() => {
    soundService.play("ALERT");
    const confirm = window.confirm(
      "WARNING: PURGE LUCA LOGS? This cannot be undone.",
    );
    if (confirm) {
      setMessages([]);
      localStorage.removeItem(CHAT_STORAGE_KEY);
      lucaWorkforce.clearAllWorkflows();
      awarenessService.reset("dashboard");
    }
  }, []);

  // --- INITIAL STARTUP SOUND (visual greeting now handled by ChatPanel Omni-Center) ---
  useEffect(() => {
    if (messages.length === 0) {
      const timer = setTimeout(() => {
        soundService.play("SUCCESS");
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  return {
    messages,
    setMessages,
    messagesRef,
    isProcessing,
    setIsProcessing,
    handleSendMessage,
    handleStop,
    handleClearChat,
    lastMessageSourceRef,
  };
}
