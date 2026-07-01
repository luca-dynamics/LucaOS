import React, { useEffect, useState, useTransition } from "react";
import { Icon } from "../ui/Icon";
import ChatWidgetInput from "../ChatWidgetInput";
import ChatMessageBubble from "../ChatMessageBubble";
import { ProWorkforceCanvas } from "../chat/ProWorkforceCanvas";
import { MessageScroller } from "../chat/LucaConversationPrimitives";
import SuggestionChips from "../SuggestionChips";
import { motion, AnimatePresence } from "framer-motion";
import { Sender } from "../../types";
import { awarenessService } from "../../services/awarenessService";
import { settingsService } from "../../services/settingsService";
import { apiUrl } from "../../config/api";
import IntentRoutingModeSelector from "../runtime/IntentRoutingModeSelector";
import { chatIntentRouterBridge } from "../../services/runtime/ChatIntentRouterBridge";
import { chatIntentProvenanceService } from "../../services/runtime/ChatIntentProvenanceService";
import type { ChatRoutingResult } from "../../services/runtime/ChatIntentRouterBridge";
import { getRouteHintText, getRouteLabel, getRouteTone, shouldAppendRouteHint } from "../runtime/intentRoutingLabels";
import {
  lucaMaterialMobileContentStyle,
  lucaMaterialMobileControlStyle,
  lucaMaterialMobileSheetStyle,
  lucaMaterialPanelStyle,
  lucaMaterialWorkspaceStyle,
  resolveLucaSheetMaterial,
} from "../../styles/lucaMaterialSystem";

interface ChatPanelProps {
  messages: any[];
  isMobile: boolean;
  activeMobileTab: string;
  theme: any;
  isProcessing: boolean;
  persona: string;
  chatEndRef: React.RefObject<HTMLDivElement>;
  handleSendMessage: (text: string, attachment: any, onProgress?: any, sendHidden?: boolean, hideResponse?: boolean) => Promise<any>;
  setAmbientSuggestions: React.Dispatch<React.SetStateAction<any[]>>;
  ambientSuggestions: any[];
  showSuggestionChips: boolean;
  setShowSuggestionChips: (show: boolean) => void;
  showVoiceHud: boolean;
  bootSequence: string;
  currentCwd: string;
  isKernelLocked: boolean;
  opsecStatus: string;
  attachedImage: any;
  setAttachedImage: (image: any) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  input: string;
  setInput: (input: string) => void;
  handleSend: () => void;
  isVoiceMode: boolean;
  toggleVoiceMode: () => void;
  showCamera: boolean;
  setShowCamera: (show: boolean) => void;
  handleScreenShare: () => void;
  handleClearChat: () => void;
  handleStop: () => void;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
}

type ViewMode = "CHAT" | "CORTEX";

// --- Helpers ---
function normalizePersonaLabel(value: unknown): string {
  if (typeof value === "string") return value;

  if (value == null) return "ASSISTANT";

  // Handle boxed strings or odd IPC/settings payloads that arrive as
  // index-keyed objects instead of primitive text.
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (
      entries.length > 0 &&
      entries.every(
        ([key, item]) => /^\d+$/.test(key) && typeof item === "string",
      )
    ) {
      return entries
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([, item]) => item)
        .join("");
    }

    const candidate =
      (value as any).persona ??
      (value as any).name ??
      (value as any).id ??
      (value as any).value;

    if (typeof candidate === "string") return candidate;
  }

  const fallback = String(value).trim();
  return fallback && fallback !== "[object Object]" ? fallback : "ASSISTANT";
}

function cleanAiMessage(text: string): string {
  // 1. Remove bracketed system headers (e.g. [SYSTEM], [BYPASS], [REFLEX])
  let stripped = text.replace(/\[[^\]]*\]/g, "").trim();
  
  // 2. Remove common leading greetings ONLY if there is significant text after them
  // This prevents stripping a message that is *just* a greeting like "Good evening, macking."
  const greetingRegex = /^(Good|Hello)\s(morning|afternoon|evening|day)[^.]*[.!]\s?/gi;
  const match = stripped.match(greetingRegex);
  
  if (match && match[0].length < stripped.length - 5) {
    stripped = stripped.replace(greetingRegex, "").trim();
  }
  
  // 4. Strip common AI "lead-in" fluff to suggestions
  const fluffRegex = /(To ensure we|I have identified|Here are a few|I can assist with|Let's make the most|I'm ready to|Feel free to).*/gi;
  stripped = stripped.replace(fluffRegex, "").trim();
  
  return stripped.endsWith(":") ? stripped.slice(0, -1).trim() : stripped;
}

function getGreeting(
  hour: number,
  name: string,
): { prefix: string; suffix: string } {
  // No invented identity when no name is set — the greeting simply omits the
  // name slot rather than addressing the user as "Operator".
  const display = name || "";
  if (hour < 5) return { prefix: "Good evening", suffix: display };
  if (hour < 12) return { prefix: "Good morning", suffix: display };
  if (hour < 17) return { prefix: "Good afternoon", suffix: display };
  return { prefix: "Good evening", suffix: display };
}




// --- Persona Badge (e.g. RUTHLESS, ENGINEER etc) ---
const PersonaBadge = ({
  persona,
  themeHex,
}: {
  persona: unknown;
  themeHex: string;
}) => {
  const label = normalizePersonaLabel(persona);

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-medium glass-blur"
      style={{
        borderColor: "var(--luca-border-subtle, var(--app-border-main))",
        color: themeHex,
      }}
    >
      <Icon
        name="Zap"
        size={10}
        className="animate-pulse"
        variant="BoldDuotone"
      />
      {label}
    </div>
  );
};

// --- Rolling Stream (Transient Log) ---
const RollingStream = ({ 
  text, 
  isStreaming
}: { 
  text: string; 
  isStreaming: boolean;
}) => {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [fullLines, setFullLines] = useState<string[]>([]);
  
  useEffect(() => {
    // Split by sentences or punctuation for shorter segments
    const parts = text.split(/[.!?]\s+/).map(p => p.trim()).filter(p => p.length > 3);
    setFullLines(parts);
  }, [text]);

  useEffect(() => {
    if (isStreaming) {
      // While streaming, handle the window
      const windowSize = 4;
      const start = Math.max(0, fullLines.length - windowSize);
      setVisibleLines(fullLines.slice(start));
    } else {
        // Once done, let's roll them manually one-by-one to ensure readability
        // if there are many lines
        if (fullLines.length > 4) {
            const timer = setInterval(() => {
                setVisibleLines(prev => {
                    const lastLine = prev[prev.length - 1];
                    const lastIdx = fullLines.indexOf(lastLine);
                    if (lastIdx >= fullLines.length - 1) {
                        clearInterval(timer);
                        return prev;
                    }
                    const next = fullLines.slice(lastIdx - 1, lastIdx + 3); // Keep sliding window
                    return next;
                });
            }, 3000);
            return () => clearInterval(timer);
        } else {
            setVisibleLines(fullLines);
        }
    }
  }, [fullLines, isStreaming]);

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 min-h-[100px] overflow-hidden py-4">
      <AnimatePresence mode="popLayout">
        {visibleLines.map((line, idx) => (
          <motion.div
            key={line + idx}
            layout
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ 
                opacity: idx === visibleLines.length - 1 ? 1 : 0.4, // Highlight latest
                y: 0,
                filter: "blur(0px)",
                scale: idx === visibleLines.length - 1 ? 1 : 0.95
            }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-sm md:text-base font-mono tracking-wide text-center max-w-2xl px-6"
            style={{ color: idx === visibleLines.length - 1 ? "var(--app-text-main)" : "var(--app-text-muted)" }}
          >
            {line}{idx === visibleLines.length - 1 && line.length > 0 ? (line.endsWith('.') ? '' : '.') : ''}
            {isStreaming && idx === visibleLines.length -1 && (
                <span className="inline-block w-1 h-3 ml-1 bg-current animate-pulse align-middle" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isMobile,
  activeMobileTab,
  theme,
  isProcessing,
  persona,
  chatEndRef,
  handleSendMessage,
  setAmbientSuggestions,
  ambientSuggestions,
  showSuggestionChips,
  setShowSuggestionChips,
  showVoiceHud,
  bootSequence,
  currentCwd,
  isKernelLocked,
  opsecStatus,
  attachedImage,
  setAttachedImage,
  fileInputRef,
  handleFileSelect,
  input,
  setInput,
  handleSend,
  isVoiceMode,
  toggleVoiceMode,
  showCamera,
  setShowCamera,
  handleScreenShare,
  handleClearChat,
  handleStop,
  setMessages,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("CHAT");
  const [, startTransition] = useTransition();
  const personaLabel = normalizePersonaLabel(persona);
  const chatAnchorKey = `${messages.length}:${messages[messages.length - 1]?.text ?? ""}:${isProcessing}`;
  const visibleMessages = messages.filter((m) => !m.isHidden);
  const lastUserMessage = [...visibleMessages]
    .reverse()
    .find((message) => message.sender === Sender.USER && message.id);
  const lastUserMessageId = lastUserMessage?.id
    ? `message-${lastUserMessage.id}`
    : undefined;
  const isLight = 
    theme.themeName?.toLowerCase() === "lucagent" || 
    theme.themeName?.toLowerCase() === "agentic-slate" ||
    theme.themeName?.toLowerCase() === "light";

  // --- Active MCP servers (polled every 10s) ---
  const [activeMcpServers, setActiveMcpServers] = useState<{ id: string; name: string; status?: string }[]>([]);
  useEffect(() => {
    const fetchMcp = async () => {
      try {
        const res = await fetch(apiUrl("/api/mcp/list"));
        const data = await res.json();
        setActiveMcpServers(data.servers || []);
      } catch { /* silent */ }
    };
    fetchMcp();
    const interval = setInterval(fetchMcp, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDisconnectMcp = async (id: string) => {
    try {
      await fetch(apiUrl("/api/mcp/disconnect"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      // Refresh list immediately
      const res = await fetch(apiUrl("/api/mcp/list"));
      const data = await res.json();
      setActiveMcpServers(data.servers || []);
    } catch (e) {
      console.error("[MCP] Disconnect failed:", e);
    }
  };

  const handleConnectMcp = async (id: string) => {
    // Find the server config so we can send it to /connect
    const server = activeMcpServers.find(s => s.id === id);
    if (!server) return;

    try {
      await fetch(apiUrl("/api/mcp/connect"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...server
        }),
      });
      // Refresh list immediately
      const res = await fetch(apiUrl("/api/mcp/list"));
      const data = await res.json();
      setActiveMcpServers(data.servers || []);
    } catch (e) {
      console.error("[MCP] Connect failed:", e);
    }
  };




  // Show centered layout until the user has sent at least one message.
  // LUCA's own startup/greeting messages don't count — only user-initiated
  // messages should trigger the transition to the docked chat layout.
  const showCentered = !messages.some((m) => m.sender === Sender.USER);

  // User name from settings for the greeting
  const [userName, setUserName] = useState<string>("");
  // Dynamic initialization steps for the welcome screen
  const [initStep, setInitStep] = useState(0);
  useEffect(() => {
    if (showCentered && messages.length === 0) {
      const timer = setInterval(() => {
        setInitStep(prev => (prev + 1) % 4);
      }, 2500);
      return () => clearInterval(timer);
    }
  }, [showCentered, messages.length]);

  const initSteps = [
    "Preparing your workspace",
    "Restoring recent context",
    "Syncing memory",
    "Ready when you are"
  ];

  useEffect(() => {
    try {
      const general = settingsService.get("general") as any;
      setUserName(general?.userName || general?.name || "");
    } catch {
      // settings not available yet
    }
  }, []);

  const profile = settingsService.get("general") as any;
  const hour = new Date().getHours();
  const greeting = getGreeting(hour, profile?.userName);

  // === SUGGESTION CHIPS & AI AWAKENING ===
  const hasTriggeredAwakening = React.useRef(false);

  // Reset awakening flag if history is cleared
  useEffect(() => {
    if (messages.length === 0) {
      hasTriggeredAwakening.current = false;
    }
  }, [messages.length]);

  useEffect(() => {
    if (bootSequence === "READY") {
      // 1. Generate Suggestion Chips
      const chips = awarenessService.generateSuggestions(
        persona || "ASSISTANT",
      );
      startTransition(() => {
        setAmbientSuggestions(chips);
      });
      
      // Delay showing chips for smooth entrance
      const timer = setTimeout(() => {
        startTransition(() => {
          setShowSuggestionChips(true);
        });
      }, 1200);

      // 2. Trigger AI Awakening Greeting (if no history)
      if (messages.length === 0 && !hasTriggeredAwakening.current) {
        hasTriggeredAwakening.current = true;
        
        const triggerAwakening = async () => {
          try {
            const profile = settingsService.get("general") as any;
            const prompt = await awarenessService.triggerAwakeningPulse(
              {
                mode: "text",
                operatorName: profile?.userName || userName || "Operator",
                persona: persona || "ASSISTANT",
              },
              "dashboard",
            );

            if (prompt) {
              // 4th arg: sendHidden=true, 5th arg: hideResponse=false
              const response = await handleSendMessage(prompt, null, undefined, true, false);
              
              // If no response (undefined), treat as failure and trigger local fallback
              if (!response) {
                throw new Error("No AI response for awakening pulse");
              }
            }
          } catch (err) {
            console.warn("[AWARENESS] AI Awakening failed, triggering local fallback:", err);
            startTransition(() => {
              const fallbackText = awarenessService.getLocalFallbackGreeting(persona || "ASSISTANT", userName || "Operator");
              setMessages(prev => {
                  // Only add if no LUCA messages exist yet (Double check protection)
                  if (prev.some(m => m.sender === Sender.LUCA && !m.isHidden)) return prev;
                  return [...prev, {
                      id: "welcome-fallback-" + Date.now(),
                      text: fallbackText,
                      sender: Sender.LUCA,
                      timestamp: Date.now(),
                      isStreaming: false
                  }];
              });
            });
          }
        };

        // Subtle delay for dramatic effect
        setTimeout(triggerAwakening, 1500);
      }

      return () => clearTimeout(timer);
    }
  }, [persona, bootSequence, messages.length, setAmbientSuggestions, setShowSuggestionChips, userName, handleSendMessage]);

  // --- Intent Routing Integration (PR #124 + PR #125 polish) ---
  const handleRoutedSend = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      handleSend();
      return;
    }
    if (isProcessing) {
      handleSend();
      return;
    }
    if (
      !chatIntentProvenanceService.shouldRouteMessage({
        message: trimmed,
        senderType: "user",
        isHidden: false,
        isAwakening: false,
      })
    ) {
      handleSend();
      return;
    }

    let routeResult: ChatRoutingResult | undefined;
    try {
      const { provenanceIds } = chatIntentProvenanceService.createChatProvenance({
        message: trimmed,
      });
      routeResult = chatIntentRouterBridge.maybeRouteMessageBeforeResponse({
        message: trimmed,
        source: "chat",
        provenanceIds,
      });
    } catch (err) {
      console.warn("[ChatPanel] Intent routing failed, sending normally:", err);
    }

    handleSend();

    if (routeResult && routeResult.routed && routeResult.routeType !== "fast_response") {
      const hintText = getRouteHintText(routeResult.routeType);
      if (hintText && shouldAppendRouteHint(messages, hintText)) {
        const tone = getRouteTone(routeResult.routeType);
        const label = getRouteLabel(routeResult.routeType);
        startTransition(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `route-hint-${Date.now()}`,
              text: hintText,
              sender: Sender.SYSTEM,
              timestamp: Date.now(),
              isStreaming: false,
              isRouteHint: true,
              routeLabel: label,
              routeTone: tone,
            },
          ]);
        });
      }
    }
  };

  const sharedInputArea = (
    <div>
      {/* Attachment preview */}
      {attachedImage && (
        <div
          className="flex items-center gap-2 mb-2 border p-2 w-fit"
          style={isMobile ? lucaMaterialMobileControlStyle : lucaMaterialPanelStyle}
        >
          <Icon name="Gallery" size={14} className={theme.primary} variant="BoldDuotone" />
          <span className={`text-xs "text-[var(--app-text-muted)]"`}>
            Visual_Input_Buffer_01.jpg
          </span>
          <button
            onClick={() => setAttachedImage(null)}
            className="hover:text-[var(--luca-danger,#f87171)]"
          >
            <Icon name="Close" size={14} variant="BoldDuotone" />
          </button>
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileSelect}
      />
      {/* Input box — wider in centered mode */}
      <div
        className="rounded-2xl transition-all duration-500 glass-blur border"
        style={{
          ...resolveLucaSheetMaterial(isMobile),
          borderColor: showCentered ? "var(--luca-border-subtle, var(--app-border-main))" : undefined,
          boxShadow: showCentered
            ? "var(--luca-shadow-soft)"
            : undefined,
        }}
      >
        <div className="mb-1 flex justify-end px-1">
          <IntentRoutingModeSelector theme={theme} compact />
        </div>
        <ChatWidgetInput
          input={input}
          setInput={setInput}
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            handleRoutedSend();
          }}
          isProcessing={isProcessing}
          primaryColor={theme.hex}
          themeName={theme.themeName}
          attachment={attachedImage}
          onClearAttachment={() => setAttachedImage(null)}
          onAttachClick={() => fileInputRef.current?.click()}
          isVoiceActive={isVoiceMode}
          onToggleVoice={toggleVoiceMode}
          isEyeActive={showCamera}
          onToggleEye={() => setShowCamera(!showCamera)}
          onScreenShare={!isMobile ? handleScreenShare : undefined}
          onClearChat={handleClearChat}
          onStop={handleStop}
          isCompact={false}
          currentCwd={currentCwd}
          isKernelLocked={isKernelLocked}
          opsecStatus={opsecStatus}
          persona={persona}
          activeMcpServers={activeMcpServers}
          onDisconnectMcp={handleDisconnectMcp}
          onConnectMcp={handleConnectMcp}
        />


      </div>
    </div>
  );

  // Shared SuggestionChips renderer

  const suggestionChips = (
    <SuggestionChips
      suggestions={ambientSuggestions}
      onChipClick={(prompt: string) => {
        handleSendMessage(prompt, null, undefined, false, false);
        startTransition(() => {
          setAmbientSuggestions((prev: any[]) =>
            prev.filter((s) => s.prompt !== prompt),
          );
        });
      }}
      onDismissAll={() => {
        startTransition(() => {
          setAmbientSuggestions([]);
          setShowSuggestionChips(false);
        });
      }}
      theme={theme}
      visible={
        showSuggestionChips && !showVoiceHud && bootSequence === "READY"
      }
      isDocked={!showCentered}
    />
  );

  // ─── CENTERED (WELCOME) STATE ───────────────────────────────────────────────
  if (showCentered) {
    return (
      <section
        className={`${
          isMobile
            ? activeMobileTab === "TERMINAL"
              ? "flex w-full overflow-hidden"
              : "hidden"
            : "flex-1 overflow-hidden"
        } flex flex-col h-full relative ${isMobile ? "z-10" : "z-20"} transition-all duration-500 ${isMobile ? "" : "glass-blur"}`}
        style={
          isMobile
            ? lucaMaterialMobileContentStyle
            : {
                ...lucaMaterialWorkspaceStyle,
                borderTop: "1px solid var(--luca-border-subtle, var(--app-border-main))",
                borderBottom: "1px solid var(--luca-border-subtle, var(--app-border-main))",
              }
        }
      >
        {/* Header Toggle */}
        <div className="absolute top-4 left-6 z-50 flex items-center gap-2">
          <button
            onClick={() => {
              setViewMode(viewMode === "CHAT" ? "CORTEX" : "CHAT");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 text-[11px] font-medium ${isMobile ? "" : "glass-blur"}`}
            style={
              isMobile
                ? {
                    ...lucaMaterialMobileControlStyle,
                    borderColor:
                      viewMode === "CORTEX"
                        ? "var(--luca-accent-soft)"
                        : lucaMaterialMobileControlStyle.borderColor,
                    color:
                      viewMode === "CORTEX"
                        ? "var(--luca-accent-primary)"
                        : lucaMaterialMobileControlStyle.color,
                  }
                : {
                    borderColor: viewMode === "CORTEX" ? "var(--luca-accent-primary)" : "var(--luca-border-subtle, var(--app-border-main))",
                    backgroundColor: "var(--luca-surface-glass, var(--app-bg-tint))",
                    color: viewMode === "CORTEX" ? theme.hex : "var(--luca-text-primary, var(--app-text-main))"
                  }
            }
          >
            {viewMode === "CORTEX" ? (
              <Icon name="ArrowLeft" size={10} variant="BoldDuotone" />
            ) : (
              <Icon name="Zap" size={10} variant="BoldDuotone" />
            )}
            {viewMode === "CORTEX" ? "Back to chat" : "Workforce"}
          </button>
        </div>

        {/* Background handled by global container style to ensure consistency */}

        <AnimatePresence mode="wait">
          {viewMode === "CHAT" ? (
            <motion.div 
              key="chat-welcome"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 gap-3"
            >
              {/* Greeting */}
            <h1
              className="text-4xl lg:text-5xl font-semibold tracking-tight leading-tight mb-1 text-center"
              style={{ color: "var(--luca-text-primary, var(--app-text-main))" }}
            >
              <span
                className={greeting.suffix ? "opacity-40 font-light mr-3" : "font-semibold"}
                style={
                  greeting.suffix
                    ? undefined
                    : { color: theme.hex || "var(--luca-accent-primary)" }
                }
              >
                {greeting.prefix}
              </span>
              {greeting.suffix && (
                <span
                  className="font-semibold"
                  style={{
                    color: theme.hex || "var(--luca-accent-primary)",
                  }}
                >
                  {greeting.suffix}
                </span>
              )}
            </h1>
            <p
              className="text-sm opacity-50 text-center"
              style={{ color: "var(--luca-text-secondary, var(--app-text-muted))" }}
            >
              Ask Luca anything
            </p>

            {/* AI Generated Welcome Message (Rolling Stream) */}
            <div className="mt-2 w-full max-w-2xl mx-auto">
              {(() => {
                const lucaMessages = messages.filter((m) => m.sender === Sender.LUCA && !m.isHidden);
                if (lucaMessages.length === 0) {
                  return (
                    <div className="flex flex-col items-center gap-1.5 opacity-50 italic py-8">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={initStep}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.5 }}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          {initSteps[initStep]}
                          <span className="flex gap-0.5">
                            <span className="animate-pulse">.</span>
                            <span className="animate-pulse [animation-delay:200ms]">.</span>
                            <span className="animate-pulse [animation-delay:400ms]">.</span>
                          </span>
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  );
                }
                const latestMsg = lucaMessages[lucaMessages.length - 1];
                const latestText = latestMsg.text;
                const cleaned = cleanAiMessage(latestText);
                
                return (
                  <RollingStream 
                    text={cleaned} 
                    isStreaming={latestMsg.isStreaming} 
                  />
                );
              })()}
            </div>

            {/* Persona badge */}
            <PersonaBadge persona={personaLabel} themeHex={theme.hex} />

            {/* Central Input + chips below it, centered */}
            <div
              className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-700"
              style={{ animationDelay: "150ms" }}
            >
              {sharedInputArea}
              <div className="flex justify-center mt-4 z-20 opacity-90">
                {ambientSuggestions.length > 0 && showSuggestionChips && suggestionChips}
              </div>
            </div>
          </motion.div>
          ) : (
            <motion.div 
              key="cortex-canvas"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 w-full h-full p-6 relative z-10"
            >
              <ProWorkforceCanvas 
                theme={theme} 
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Faint watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
          <h1
            className={`text-[4rem] lg:text-[5rem] font-black italic opacity-[0.025] select-none tracking-tighter transition-colors duration-500 ${isMobile ? "" : theme.primary}`}
            style={isMobile ? { color: "var(--luca-text-tertiary)" } : undefined}
          >
            LUCA
          </h1>
        </div>
      </section>
    );
  }

  // ─── DOCKED (ACTIVE CHAT) STATE ─────────────────────────────────────────────
  return (
    <section
      className={`${
        isMobile
          ? activeMobileTab === "TERMINAL"
            ? "flex w-full overflow-hidden"
            : "hidden"
          : "flex-1 overflow-hidden"
      } flex flex-col ${isMobile ? "h-full" : "h-full"} relative ${
        isMobile ? "z-10" : "z-20"
      } transition-all duration-500 ${isMobile ? "" : "glass-blur"}`}
      style={
        isMobile
          ? lucaMaterialMobileContentStyle
          : {
              ...lucaMaterialWorkspaceStyle,
              borderTop: "1px solid var(--luca-border-subtle, var(--app-border-main))",
              borderBottom: "1px solid var(--luca-border-subtle, var(--app-border-main))",
            }
      }
    >
      {/* Header Toggle */}
      <div className="absolute top-3 left-6 z-50 flex items-center gap-2">
        <button
          onClick={() => {
            setViewMode(viewMode === "CHAT" ? "CORTEX" : "CHAT");
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 text-[11px] font-medium ${isMobile ? "" : "glass-blur"}`}
          style={
            isMobile
              ? {
                  ...lucaMaterialMobileControlStyle,
                  borderColor:
                    viewMode === "CORTEX"
                      ? "var(--luca-accent-soft)"
                      : lucaMaterialMobileControlStyle.borderColor,
                  color:
                    viewMode === "CORTEX"
                      ? "var(--luca-accent-primary)"
                      : lucaMaterialMobileControlStyle.color,
                }
              : {
                  borderColor: viewMode === "CORTEX" ? "var(--luca-accent-primary)" : "var(--luca-border-subtle, var(--app-border-main))",
                  backgroundColor: "var(--luca-surface-glass, var(--app-bg-tint))",
                  color: viewMode === "CORTEX" ? theme.hex : "var(--luca-text-primary, var(--app-text-main))"
                }
          }
        >
          {viewMode === "CORTEX" ? (
            <Icon name="ArrowLeft" size={10} variant="BoldDuotone" />
          ) : (
            <Icon name="Zap" size={10} variant="BoldDuotone" />
          )}
          {viewMode === "CORTEX" ? "Back to chat" : "Workforce"}
        </button>
      </div>

      {/* Background/Scanlines removed for consistency */}

      {/* Faint watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <h1
          className={`text-[9rem] lg:text-[8rem] font-black italic opacity-[0.025] select-none tracking-tighter transition-colors duration-500 ${isMobile ? "" : theme.primary}`}
          style={isMobile ? { color: "var(--luca-text-tertiary)" } : undefined}
        >
          LUCA
        </h1>
      </div>

      {/* Messages list */}
      <AnimatePresence mode="wait">
        {viewMode === "CHAT" ? (
          <motion.div
            key="chat-messages"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 min-h-0 z-10 flex flex-col"
          >
            <MessageScroller
              anchorRef={chatEndRef}
              anchorKey={chatAnchorKey}
              restoreKey="main-chat"
              restoreAnchorId={lastUserMessageId}
              turnAnchorId={lastUserMessageId}
              className={`${isMobile ? "p-2 space-y-4" : "px-0 py-2 space-y-1"} flex flex-col`}
            >
              {visibleMessages
                .map((msg, index, arr) => (
                  <ChatMessageBubble
                    messageId={msg.id ? `message-${msg.id}` : undefined}
                    key={msg.id || index}
                    text={msg.text}
                    sender={msg.sender === Sender.USER ? "user" : msg.sender === Sender.SYSTEM ? "system" : "luca"}
                    isRouteHint={msg.isRouteHint}
                    routeLabel={msg.routeLabel}
                    routeTone={msg.routeTone}
                    timestamp={msg.timestamp}
                    persona={persona as any}
                    primaryColor={
                      theme.hex || "var(--luca-accent-primary)"
                    }
                    isProcessing={index === arr.length - 1 && isProcessing}
                    attachment={msg.attachment}
                    generatedImage={msg.generatedImage}
                    groundingMetadata={msg.groundingMetadata}
                    wasPruned={(msg as any)._wasPruned}
                    onEdit={(text) => {
                      setInput(text);
                      setTimeout(() => {
                        const textarea = document.querySelector("textarea");
                        if (textarea) textarea.focus();
                      }, 100);
                    }}
                    actions={msg.actions}
                    onActionClick={async (action) => {
                      if (action.action === "CONFIRM_TRADE") {
                        // Execute the trade via handleSendMessage to keep it in the chat flow
                        await handleSendMessage(
                          `Confirming ${action.payload.action} on ${action.payload.symbol} based on high-confidence research hits.`,
                          null,
                          undefined,
                          false, // sendHidden=false so it shows as user intent
                          false
                        );
                      }
                    }}
                    isStreaming={(msg as any).isStreaming}
                    tacticalData={(msg as any).tacticalData}
                  />
                ))}
              <div ref={chatEndRef} />
            </MessageScroller>
          </motion.div>
        ) : (
          <motion.div
            key="cortex-canvas-docked"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="flex-1 w-full h-full p-4 relative z-10"
          >
            <ProWorkforceCanvas 
              theme={theme} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom-docked input */}
      <div
        className={`${isMobile ? "border-t" : "bg-transparent"} z-40 px-3 sm:px-6 pb-3 sm:pb-4 pt-0`}
        style={isMobile ? lucaMaterialMobileSheetStyle : undefined}
      >
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-2 px-1">
            {suggestionChips}
          </div>
          {sharedInputArea}
        </div>
      </div>
    </section>
  );
};

export default ChatPanel;
