import React, { useEffect } from "react";
import { ImageIcon, X } from "lucide-react";
import ChatWidgetInput from "../ChatWidgetInput";
import ChatMessageBubble from "../ChatMessageBubble";
import { Sender } from "../../types";
import { awarenessService } from "../../services/awarenessService";

interface ChatPanelProps {
  messages: any[];
  isMobile: boolean;
  activeMobileTab: string;
  theme: any;
  isProcessing: boolean;
  persona: string;
  chatEndRef: React.RefObject<HTMLDivElement>;
  handleSendMessage: (text: string, attachment: any) => Promise<any>;
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

const SuggestionChips = React.lazy(() => import("../SuggestionChips"));

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
  // === SUGGESTION CHIPS — generated on mount and when persona changes ===
  useEffect(() => {
    // Only auto-generate if we aren't already running the camera loop (which sets them itself)
    // and we have a valid persona and the system is ready
    if (bootSequence === "READY") {
      const chips = awarenessService.generateSuggestions(
        persona || "ASSISTANT",
      );
      setAmbientSuggestions(chips);
      // Brief delay for enter animation
      const timer = setTimeout(() => setShowSuggestionChips(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [persona, bootSequence, setAmbientSuggestions, setShowSuggestionChips]);

  // Hide chips when user starts chatting, show again when history is cleared
  useEffect(() => {
    if (messages.length > 0) {
      setShowSuggestionChips(false);
    } else if (bootSequence === "READY") {
      // Re-generate fresh suggestions when chat is cleared
      const chips = awarenessService.generateSuggestions(
        persona || "ASSISTANT",
      );
      setAmbientSuggestions(chips);
      setShowSuggestionChips(true);
    }
  }, [
    messages.length,
    persona,
    bootSequence,
    setAmbientSuggestions,
    setShowSuggestionChips,
  ]);

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
        theme.themeName === "lucagent"
          ? "glass-panel-light tech-border-light"
          : "glass-panel tech-border"
      } ${theme.primary} ${isMobile ? "" : ""}`}
      style={{
        borderTop: !isMobile ? `1px solid ${theme.hex}33` : "none",
        borderBottom: !isMobile ? `1px solid ${theme.hex}33` : "none",
        background:
          theme.themeName === "lucagent"
            ? "rgba(255, 255, 255, 0.5)"
            : "rgba(0, 0, 0, var(--app-bg-opacity, 0.5))",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none z-30"
        style={{
          background:
            theme.themeName === "lucagent"
              ? `linear-gradient(rgba(255,255,255,0)_2px, rgba(255,255,255,0.05)_2px)`
              : `linear-gradient(rgba(0,0,0,0)_2px, rgba(0,0,0,0.1)_2px)`,
          backgroundSize: "100% 4px",
        }}
      ></div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <h1
          className={`text-[9rem] lg:text-[11rem] font-black italic opacity-[0.04] select-none tracking-tighter ${theme.primary} transition-colors duration-500`}
        >
          L.U.C.A
        </h1>
      </div>

      <div
        className={`flex-1 ${
          isMobile ? "overflow-y-auto min-h-0" : "overflow-y-auto"
        } ${isMobile ? "p-2" : "p-3"} ${
          isMobile ? "space-y-4" : "space-y-1"
        } scroll-smooth z-10`}
      >
        {messages.map((msg, index) => (
          <ChatMessageBubble
            key={msg.id || index}
            text={msg.text}
            sender={msg.sender === Sender.USER ? "user" : "luca"}
            timestamp={msg.timestamp}
            persona={persona as any}
            primaryColor={
              theme.primary.includes("cyan")
                ? "#06b6d4"
                : theme.primary.includes("blue")
                  ? "#3b82f6"
                  : theme.primary.includes("green")
                    ? "#10b981"
                    : theme.primary.includes("orange")
                      ? "#f97316"
                      : "#E0E0E0"
            }
            isProcessing={index === messages.length - 1 && isProcessing}
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
            isStreaming={(msg as any).isStreaming}
            tacticalData={(msg as any).tacticalData}
          />
        ))}
        <div ref={chatEndRef} />
      </div>

      <React.Suspense fallback={null}>
        <SuggestionChips
          suggestions={ambientSuggestions}
          onChipClick={(prompt: string) => {
            handleSendMessage(prompt, null);
            setAmbientSuggestions((prev) =>
              prev.filter((s) => s.prompt !== prompt),
            );
          }}
          onDismiss={(id: string) => {
            setAmbientSuggestions((prev) => prev.filter((s) => s.id !== id));
          }}
          onDismissAll={() => {
            setAmbientSuggestions([]);
            setShowSuggestionChips(false);
          }}
          theme={theme}
          visible={
            showSuggestionChips && !showVoiceHud && bootSequence === "READY"
          }
        />
      </React.Suspense>

      <div
        className={`${isMobile ? (theme.themeName === "lucagent" ? "bg-white/85" : "bg-black/95") : "bg-transparent"} z-40 px-1.5 pb-2 pt-0`}
      >
        {attachedImage && (
          <div
            className={`flex items-center gap-2 mb-2 border ${theme.border} p-2 w-fit bg-white/5`}
          >
            <ImageIcon size={14} className={theme.primary} />
            <span className="text-xs text-slate-300">
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
        <div className={`flex ${isMobile ? "gap-2" : "gap-3"} items-center`}>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
          />

          <div className="flex-1">
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
      </div>
    </section>
  );
};

export default ChatPanel;
