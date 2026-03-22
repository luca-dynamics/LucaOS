import React, { useEffect, useState, useTransition } from "react";
import * as LucideIcons from "lucide-react";
const {
  ArrowLeft,
  ImageIcon,
  X,
  Zap,
} = LucideIcons as any;
import ChatWidgetInput from "../ChatWidgetInput";
import ChatMessageBubble from "../ChatMessageBubble";
import { ProWorkforceCanvas } from "../chat/ProWorkforceCanvas";
import SuggestionChips from "../SuggestionChips";
import { motion, AnimatePresence } from "framer-motion";
import { Sender } from "../../types";
import { awarenessService } from "../../services/awarenessService";
import { settingsService } from "../../services/settingsService";

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
}

type ViewMode = "CHAT" | "CORTEX";

// --- Helpers ---
function cleanAiMessage(text: string): string {
  // 1. Remove bracketed system headers
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
  const display = name || "Operator";
  if (hour < 5) return { prefix: "Evening,", suffix: display };
  if (hour < 12) return { prefix: "Good morning,", suffix: display };
  if (hour < 17) return { prefix: "Afternoon,", suffix: display };
  return { prefix: "Evening,", suffix: display };
}




// --- Persona Badge (e.g. RUTHLESS, ENGINEER etc) ---
const PersonaBadge = ({
  persona,
  themeHex,
  isLight,
}: {
  persona: string;
  themeHex: string;
  isLight: boolean;
}) => (
  <div
    className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono font-bold tracking-widest uppercase"
    style={{ 
      borderColor: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.15)",
      color: themeHex,
    }}
  >
    <Zap size={10} className="animate-pulse" />
    {persona}
  </div>
);

// --- Rolling Stream (Transient Log) ---
const RollingStream = ({ 
  text, 
  isLight,
  isStreaming
}: { 
  text: string; 
  isLight: boolean;
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
            className={`text-sm md:text-base font-mono tracking-wide text-center max-w-2xl px-6 ${
              isLight ? "text-gray-700" : "text-gray-300"
            }`}
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
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("CHAT");
  const [, startTransition] = useTransition();
  const isLight = 
    theme.themeName?.toLowerCase() === "lucagent" || 
    theme.themeName?.toLowerCase() === "agentic-slate" ||
    theme.themeName?.toLowerCase() === "light";

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
    "Initializing AI Workforce Context",
    "Synchronizing Neural Pathways",
    "Calibrating Tactical Protocols",
    "Operator Authentication Active"
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
              startTransition(() => {
                handleSendMessage(prompt, null, undefined, true, false);
              });
            }
          } catch {
            startTransition(() => {
              hasTriggeredAwakening.current = false; // Allow retry
            });
          }
        };

        // Subtle delay for dramatic effect
        setTimeout(triggerAwakening, 1500);
      }

      return () => clearTimeout(timer);
    }
  }, [persona, bootSequence, messages.length, setAmbientSuggestions, setShowSuggestionChips, userName, handleSendMessage]);

  const sharedInputArea = (
    <div>
      {/* Attachment preview */}
      {attachedImage && (
        <div
          className={`flex items-center gap-2 mb-2 border ${theme.border} p-2 w-fit ${isLight ? "bg-gray-100/80" : "bg-white/5"}`}
        >
          <ImageIcon size={14} className={theme.primary} />
          <span className={`text-xs ${isLight ? "text-gray-600" : "text-slate-300"}`}>
            Visual_Input_Buffer_01.jpg
          </span>
          <button
            onClick={() => setAttachedImage(null)}
            className="hover:text-red-400"
          >
            <X size={14} />
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
        className={`rounded-2xl overflow-hidden transition-all duration-500 ${
          isLight
            ? "bg-white/60 border border-gray-200 shadow-md"
            : "bg-white/5 border border-white/10 shadow-lg backdrop-blur-xl"
        } ${showCentered ? "shadow-[0_0_40px_rgba(0,0,0,0.3)]" : ""}`}
        style={{
          borderColor: showCentered ? `${theme.hex}33` : undefined,
          boxShadow: showCentered
            ? `0 0 50px ${theme.hex}18, 0 0 0 1px ${theme.hex}22`
            : undefined,
        }}
      >
        <ChatWidgetInput
          input={input}
          setInput={setInput}
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            handleSend();
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
        } flex flex-col h-full relative ${isMobile ? "z-10" : "z-20"} transition-all duration-500 ${
          isLight
            ? "glass-panel-light tech-border-light"
            : "glass-panel tech-border"
        } ${theme.primary}`}
        style={{
          borderTop: !isMobile ? `1px solid ${theme.hex}33` : "none",
          borderBottom: !isMobile ? `1px solid ${theme.hex}33` : "none",
          background: isLight
            ? "rgba(255, 255, 255, 0.5)"
            : "rgba(0, 0, 0, var(--app-bg-opacity, 0.5))",
        }}
      >
        {/* Header Toggle */}
        <div className="absolute top-4 left-6 z-50 flex items-center gap-2">
          <button
            onClick={() => {
              setViewMode(viewMode === "CHAT" ? "CORTEX" : "CHAT");
            }}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 font-mono text-[10px] uppercase tracking-widest
              ${viewMode === "CORTEX" 
                ? `bg-zinc-800 ${theme.primary} border-white/20 shadow-[0_0_15px_rgba(0,0,0,0.3)]` 
                : isLight 
                  ? "bg-white border-gray-300 shadow-sm"
                  : "bg-zinc-800 border-white/10 hover:border-white/20"}
            `}
            style={viewMode === "CORTEX" ? { borderColor: theme.hex, color: theme.hex } : { color: isLight ? "#4B5563" : "#F8FAFC" }}
          >
            {viewMode === "CORTEX" ? (
              <ArrowLeft size={10} />
            ) : (
              <Zap size={10} className="" />
            )}
            {viewMode === "CORTEX" ? "RETURN TO CHAT" : "LUCA WORKFORCE"}
          </button>
        </div>

        {/* Subtle scanline layer */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: isLight
              ? `linear-gradient(rgba(255,255,255,0) 2px, rgba(255,255,255,0.04) 2px)`
              : `linear-gradient(rgba(0,0,0,0) 2px, rgba(0,0,0,0.08) 2px)`,
            backgroundSize: "100% 4px",
          }}
        />

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
              className={`text-4xl lg:text-5xl font-black tracking-tight ${
                isLight ? "text-gray-900" : "text-white"
              } leading-tight mb-1 text-center`}
            >
              <span className="opacity-40 font-light mr-3">
                {greeting.prefix}
              </span>
              <span 
                className="font-black"
                style={{ 
                  color: theme.hex || "#3b82f6",
                  textShadow: isLight ? "none" : `0 0 20px ${theme.hex || "#3b82f6"}40`
                }}
              >
                {greeting.suffix || "Operator"}
              </span>
            </h1>
            <p
              className={`text-sm font-mono tracking-[0.2em] uppercase opacity-30 ${
                isLight ? "text-gray-600" : "text-slate-400"
              }`}
            >
              SYSTEM READY · {persona}
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
                          className="flex items-center gap-1.5 font-mono text-xs tracking-widest uppercase"
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
                    isLight={isLight} 
                    isStreaming={latestMsg.isStreaming} 
                  />
                );
              })()}
            </div>

            {/* Persona badge */}
            <PersonaBadge persona={persona} themeHex={theme.hex} isLight={isLight} />

            {/* Central Input + chips below it, centered */}
            <div
              className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-700"
              style={{ animationDelay: "150ms" }}
            >
              {sharedInputArea}
              <div className="flex justify-center mt-3 z-20">
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
            className={`text-[4rem] lg:text-[5rem] font-black italic opacity-[0.025] select-none tracking-tighter ${theme.primary} transition-colors duration-500`}
          >
            L.U.C.A
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
      } transition-all duration-500 ${
        isLight
          ? "glass-panel-light tech-border-light"
          : "glass-panel tech-border"
      } ${theme.primary}`}
      style={{
        borderTop: !isMobile ? `1px solid ${theme.hex}33` : "none",
        borderBottom: !isMobile ? `1px solid ${theme.hex}33` : "none",
        background: isLight
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0, 0, 0, var(--app-bg-opacity, 0.5))",
      }}
    >
      {/* Header Toggle */}
      <div className="absolute top-3 left-6 z-50 flex items-center gap-2">
        <button
          onClick={() => {
            setViewMode(viewMode === "CHAT" ? "CORTEX" : "CHAT");
          }}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 font-mono text-[10px] uppercase tracking-widest
            ${viewMode === "CORTEX" 
              ? `bg-zinc-800 ${theme.primary} border-white/20 shadow-[0_0_15px_rgba(0,0,0,0.3)]` 
              : isLight
                ? "bg-white border-gray-300 shadow-sm"
                : "bg-zinc-800 border-white/10 hover:border-white/20"}
          `}
          style={viewMode === "CORTEX" ? { borderColor: theme.hex, color: theme.hex } : { color: isLight ? "#4B5563" : "#F8FAFC" }}
        >
          {viewMode === "CORTEX" ? (
            <ArrowLeft size={10} />
          ) : (
            <Zap size={10} className="" />
          )}
          {viewMode === "CORTEX" ? "RETURN TO CHAT" : "LUCA WORKFORCE"}
        </button>
      </div>

      {/* Scanline */}
      <div
        className="absolute inset-0 pointer-events-none z-30"
        style={{
          background: isLight
            ? `linear-gradient(rgba(255,255,255,0) 2px, rgba(255,255,255,0.05) 2px)`
            : `linear-gradient(rgba(0,0,0,0) 2px, rgba(0,0,0,0.1) 2px)`,
          backgroundSize: "100% 4px",
        }}
      />

      {/* Faint watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <h1
          className={`text-[9rem] lg:text-[8rem] font-black italic opacity-[0.04] select-none tracking-tighter ${theme.primary} transition-colors duration-500`}
        >
          L.U.C.A
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
            className={`flex-1 ${
              isMobile ? "overflow-y-auto min-h-0" : "overflow-y-auto"
            } ${isMobile ? "p-2" : "p-3"} ${
              isMobile ? "space-y-4" : "space-y-1"
            } scroll-smooth z-10 flex flex-col`}
          >
            {messages
              .filter((m) => !m.isHidden)
              .map((msg, index, arr) => (
                <ChatMessageBubble
                  key={msg.id || index}
                  text={msg.text}
                  sender={msg.sender === Sender.USER ? "user" : "luca"}
                  timestamp={msg.timestamp}
                  persona={persona as any}
                  primaryColor={
                    theme.hex || "#3b82f6"
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
                  isLight={isLight}
                />
              ))}
            <div ref={chatEndRef} />
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
        className={`${
          isMobile
            ? isLight
              ? "bg-white/90 backdrop-blur-md"
              : "bg-black/95"
            : "bg-transparent"
        } z-40 px-3 pb-3 pt-0`}
      >
        <div className="mb-2 px-1">
          {suggestionChips}
        </div>
        {sharedInputArea}
      </div>
    </section>
  );
};

export default ChatPanel;
