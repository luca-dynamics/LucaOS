import { useState, useEffect, useRef, useCallback } from "react";
import { setPresenceMarkChannel } from "../../presence/presenceMarkBus";
import { Message, Sender, ToolExecutionLog, TacticalLog } from "../../types";
import { PersonaType } from "../../services/lucaService";
import { lucaService } from "../../services/lucaService";
import { voiceService } from "../../services/voiceService";
import { soundService } from "../../services/soundService";
import { memoryService } from "../../services/memoryService";
import conversationService from "../../services/conversationService";
import { awarenessService } from "../../services/awarenessService";
import { lucaWorkforce } from "../../services/agent/LucaWorkforce";
import {
  conversationThreadService,
  type ConversationThread,
} from "../../services/conversation/conversationThreadService";

/**
 * Per THREAD, not per app. This used to be the ceiling on everything the user
 * had ever said: one flat array, and message 51 silently deleted message 1.
 * Threads make the window local — a long conversation still rolls, but starting
 * a new one no longer costs you the old one.
 */
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
  sendLucaLinkMessage: (type: string, payload: unknown) => boolean;
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
  sendLucaLinkMessage,
  broadcastMessageToMobile,
  chatEndRef,
  bootSequence,
  turnLogsRef,
  visualData,
}: UseChatControllerProps) {
  // --- PERSISTENT CHAT STATE, SCOPED TO A THREAD ---
  // `ensureActiveThread` is the whole reason this is not a bare localStorage
  // read any more: on a fresh install it opens one, and on an upgrade it adopts
  // the old single conversation, so there is never a "no thread yet" state to
  // handle here.
  const [activeThread, setActiveThread] = useState<ConversationThread>(() =>
    conversationThreadService.ensureActiveThread(),
  );
  const [threads, setThreads] = useState<ConversationThread[]>(() =>
    conversationThreadService.listThreads(),
  );
  const [messages, setMessages] = useState<Message[]>(
    () => activeThread.messages,
  );

  const activeThreadId = activeThread.id;
  // Read inside callbacks without making them depend on the current thread.
  const activeThreadIdRef = useRef(activeThreadId);
  activeThreadIdRef.current = activeThreadId;

  // Track messages for stable refs
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const [isProcessing, setIsProcessing] = useState(false);
  // Presence bus: the mark thinks while a response is in flight.
  useEffect(() => {
    setPresenceMarkChannel("chat", isProcessing);
    return () => setPresenceMarkChannel("chat", false);
  }, [isProcessing]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastMessageSourceRef = useRef<"desktop" | "mobile" | null>(null);

  // Refs for ingestion batching. Seeded to the end of the thread we opened with:
  // those messages were ingested into LightRAG when they were first sent, so a
  // reload — or a switch back to an older thread — must not ingest them again.
  const lastIngestedIndexRef = useRef<number>(activeThread.messages.length - 1);
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

      // Write into the ACTIVE thread. `saveMessages` re-derives the thread's
      // title from the first user message unless the user renamed it, which is
      // what makes the left rail name itself.
      const saved = conversationThreadService.saveMessages(
        activeThreadIdRef.current,
        optimizedMessages,
      );
      if (saved) setThreads(conversationThreadService.listThreads());

      // The service keeps the thread in memory and shouts on a failed write
      // rather than throwing, so quota is checked here instead of caught below.
      // Saving the last 10 is still better than saving nothing.
      if (conversationThreadService.isDegraded()) {
        conversationThreadService.saveMessages(
          activeThreadIdRef.current,
          optimizedMessages.slice(-10).map((msg) => ({
            ...msg,
            attachment: undefined,
            generatedImage: undefined,
          })),
        );
        if (!conversationThreadService.isDegraded()) {
          console.log("[STORAGE] Saved truncated history (last 10) as fallback.");
        }
      }
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
      // The thread service handles its own storage failures loudly (see the
      // degraded check above), so reaching here means the pruning or the
      // ingestion pass itself threw — a bug, not a full disk.
      console.error("[STORAGE] Failed to persist the active thread:", e);
    }
  }, [messages, activeThreadId]);

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
        if (messageSource !== "mobile") {
          sendLucaLinkMessage("response", {
            response: {
              success: true,
              result: lucaResponse.text,
              timestamp: lucaResponse.timestamp,
            },
          });
          console.log("[LUCA LINK] Broadcasted response to mobile devices");
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

            if (audioBlob) {
              const reader = new FileReader();
              reader.readAsDataURL(audioBlob);
              reader.onloadend = () => {
                const base64Audio = reader.result;
                sendLucaLinkMessage("tts_audio", {
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
      sendLucaLinkMessage,
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

  // --- THREADS ---
  // Each of these sets the thread and its messages in ONE batch, so the
  // persistence effect never runs with a new thread id and the old messages.

  /**
   * What "New chat" now means. It used to be `handleClearChat` — a confirm and
   * a purge — so the only way to start a fresh thought was to destroy the last
   * one. Starting a thread costs nothing and takes nothing away.
   */
  const newThread = useCallback(() => {
    const thread = conversationThreadService.createThread();
    lastIngestedIndexRef.current = -1;
    setActiveThread(thread);
    setMessages([]);
    setThreads(conversationThreadService.listThreads());
    soundService.play("KEYSTROKE");
  }, []);

  const switchThread = useCallback((id: string) => {
    const thread = conversationThreadService.setActiveThreadId(id);
    if (!thread) return;
    // Everything already in this thread reached LightRAG when it was sent.
    lastIngestedIndexRef.current = thread.messages.length - 1;
    setActiveThread(thread);
    setMessages(thread.messages);
  }, []);

  const renameThread = useCallback((id: string, title: string) => {
    const thread = conversationThreadService.renameThread(id, title);
    setThreads(conversationThreadService.listThreads());
    if (thread && thread.id === activeThreadIdRef.current) setActiveThread(thread);
  }, []);

  /**
   * Delete one thread. The service decides what is active afterwards — the next
   * thread, or a fresh one if that was the last — so the composer is never left
   * pointing at nothing.
   */
  const deleteThread = useCallback((id: string) => {
    const nextActiveId = conversationThreadService.deleteThread(id);
    const next = conversationThreadService.getThread(nextActiveId);
    setThreads(conversationThreadService.listThreads());
    if (!next) return;
    lastIngestedIndexRef.current = next.messages.length - 1;
    setActiveThread(next);
    setMessages(next.messages);
  }, []);

  // --- CLEAR CHAT ---
  // Still a purge, still confirmed, still separately labelled — but it is no
  // longer what "New chat" does, and it now clears the whole archive rather than
  // one key, so the wipe cannot be undone by a reload resurrecting the legacy
  // conversation.
  const handleClearChat = useCallback(() => {
    soundService.play("ALERT");
    const confirm = window.confirm(
      "WARNING: PURGE LUCA LOGS? This cannot be undone.",
    );
    if (confirm) {
      conversationThreadService.clearAllThreads();
      const fresh = conversationThreadService.ensureActiveThread();
      lastIngestedIndexRef.current = -1;
      setActiveThread(fresh);
      setMessages([]);
      setThreads(conversationThreadService.listThreads());
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
    // The archive the left rail renders.
    threads,
    activeThreadId,
    newThread,
    switchThread,
    renameThread,
    deleteThread,
  };
}
