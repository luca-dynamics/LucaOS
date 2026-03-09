import React, { useRef, useEffect, KeyboardEvent } from "react";
import {
  Send,
  Paperclip,
  Camera,
  X,
  Mic,
  MicOff,
  Monitor,
  MessageSquareX,
  Square,
  FolderOpen,
  Lock,
  Shield,
} from "lucide-react";

interface ChatWidgetInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isProcessing: boolean;
  primaryColor: string;
  onCapture?: () => void;
  attachment?: string | null;
  onClearAttachment?: () => void;
  isEyeActive?: boolean;
  onToggleEye?: () => void;
  isCompact?: boolean;
  onToggleVoice?: () => void;
  isVoiceActive?: boolean;
  onAttachClick?: () => void;
  onScreenShare?: () => void;
  onClearChat?: () => void;
  onHeightChange?: (height: number) => void;
  onStop?: () => void;
  isSpeaking?: boolean;
  amplitude?: number;
  themeName?: string;
  currentCwd?: string;
  isKernelLocked?: boolean;
  opsecStatus?: string;
  persona?: string;
}

const ChatWidgetInput: React.FC<ChatWidgetInputProps> = ({
  input,
  setInput,
  onSubmit,
  isProcessing,
  primaryColor,

  attachment,
  onClearAttachment,
  isEyeActive,
  onToggleEye,

  onToggleVoice,
  isVoiceActive,
  onAttachClick,
  onScreenShare,
  onClearChat,
  onHeightChange,
  onStop,
  isSpeaking,
  amplitude = 0,
  themeName = "default",
  currentCwd,
  isKernelLocked,
  opsecStatus,
  persona,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // THREE.Color/CSS doesn't always handle 8-digit hex properly when appending, sanitize to 6-digit
  const safeColor = React.useMemo(() => {
    if (primaryColor.startsWith("#") && primaryColor.length > 7) {
      return primaryColor.slice(0, 7);
    }
    return primaryColor;
  }, [primaryColor]);

  // Auto-resize textarea
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to get accurate scrollHeight
    textarea.style.height = "auto";

    // Calculate new height (min 48px for text only, max 200px)
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.max(48, Math.min(scrollHeight, 200));

    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = scrollHeight > 200 ? "auto" : "hidden";

    // Report total height including toolbar buffer (approx 44px)
    if (onHeightChange) {
      onHeightChange(newHeight + 44);
    }
  };

  // Adjust height when input changes
  useEffect(() => {
    adjustHeight();
  }, [input]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without Shift = Send
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() || attachment) {
        onSubmit(e as any);
      }
    }
    // Shift + Enter = New line (default behavior, do nothing)
  };

  const isLight = themeName?.toLowerCase() === "lucagent";

  return (
    <div
      className={`relative z-20 transition-colors duration-500 ${isLight ? "bg-white/10 backdrop-blur-md rounded-b-2xl" : "bg-[#0a0a0a]"}`}
    >
      {/* Attachment Preview (Above Input) */}
      {attachment && (
        <div className="mb-3 flex">
          <div className="relative group">
            <img
              src={attachment}
              alt="Attachment"
              className="h-20 sm:h-24 w-auto rounded-xl border border-white/20 shadow-lg"
            />
            <button
              type="button"
              onClick={onClearAttachment}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-all active:scale-90"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Main Input Container (Draggable Wrapper) */}
      <div
        className="relative pt-2 border-t bg-transparent transition-all duration-200"
        style={
          {
            borderColor: `${safeColor}40`,
            WebkitAppRegion: "drag", // DRAGGABLE AREA
          } as any
        }
        onClick={() => textareaRef.current?.focus()} // Click padding -> Focus input
      >
        {/* Textarea (No Drag, minimal padding) */}
        <textarea
          ref={textareaRef}
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={attachment ? "Discuss this image..." : "Message Luca..."}
          rows={1}
          enterKeyHint="enter"
          className={`
            w-full
            bg-transparent
            ${isLight ? "text-gray-900 placeholder-gray-500" : "text-white placeholder-slate-500"}
            text-[13px]
            px-2 sm:px-2.5
            py-2
            focus:outline-none
            resize-none
            font-mono
            leading-relaxed
            block
          `}
          style={
            {
              caretColor: safeColor,
              WebkitAppRegion: "no-drag", // TEXT INPUT IS NOT DRAGGABLE
            } as any
          }
          autoFocus
        />

        {/* Bottom Icons Row - Relative to flow below textarea */}
        <div className="relative pt-2 pb-2 flex items-center justify-between px-2 sm:px-2 pointer-events-none z-50">
          {/* Left Icons */}
          <div
            className="flex items-center gap-1 sm:gap-1 pointer-events-auto"
            style={{ WebkitAppRegion: "no-drag" } as any}
          >
            {/* Clear Chat Button */}
            {onClearChat && (
              <button
                type="button"
                onClick={onClearChat}
                className="p-1 sm:p-1.5 hover:text-red-400 transition-all rounded-md border hover:bg-white/5 active:scale-90"
                style={{
                  borderColor: `${safeColor}60`,
                  color: `${safeColor}cc`,
                }}
                title="Clear Chat"
              >
                <MessageSquareX size={15} className="sm:w-[13px] sm:h-[13px]" />
              </button>
            )}

            {/* Attachment Button */}
            <button
              type="button"
              className="p-1 sm:p-1.5 hover:text-slate-300 transition-all rounded-md border hover:bg-white/5 active:scale-90"
              style={{
                borderColor: `${safeColor}60`,
                color: `${safeColor}cc`,
              }}
              title="Attach file"
              onClick={onAttachClick}
            >
              <Paperclip size={15} className="sm:w-[13px] sm:h-[13px]" />
            </button>

            {/* Camera/Vision Toggle */}
            <button
              type="button"
              onClick={onToggleEye}
              className={`
                p-1 sm:p-1.5 rounded-md border transition-all
                ${
                  isEyeActive
                    ? "text-white bg-white/10 shadow-lg"
                    : "hover:text-white hover:bg-white/5"
                }
                active:scale-90
                relative
              `}
              style={{
                color: isEyeActive ? safeColor : `${safeColor}cc`,
                borderColor: isEyeActive ? `${safeColor}b3` : `${safeColor}60`,
              }}
              title={
                isEyeActive ? "Disable Vision" : "Enable Vision (Luca Eye)"
              }
            >
              <Camera
                size={15}
                className={`sm:w-[13px] sm:h-[13px] ${
                  isEyeActive ? "animate-pulse" : ""
                }`}
              />
              {/* Active indicator */}
              {isEyeActive && (
                <span
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-ping"
                  style={{ backgroundColor: safeColor }}
                />
              )}
            </button>

            {/* Screen Share (Monitor) */}
            {onScreenShare && (
              <button
                type="button"
                onClick={onScreenShare}
                className="p-1 sm:p-1.5 hover:text-slate-300 transition-all rounded-md border hover:bg-white/5 active:scale-90"
                style={{
                  borderColor: `${safeColor}60`,
                  color: `${safeColor}cc`,
                }}
                title="Share Screen"
              >
                <Monitor size={15} className="sm:w-[13px] sm:h-[13px]" />
              </button>
            )}

            {/* Status Indicators (RELOCATED LEFT) */}
            <div className="hidden sm:flex items-center gap-1 ml-1">
              {persona === "ENGINEER" && (
                <>
                  <div
                    className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-rq-green bg-rq-green-dim/10 px-1.5 rounded-md border h-[24px] sm:h-[27px] max-w-[100px] overflow-hidden"
                    style={{ borderColor: `${safeColor}40` }}
                  >
                    <FolderOpen size={12} className="opacity-80" />
                    <span className="opacity-40 text-[9px]">CWD:</span>
                    <span className="font-bold truncate uppercase">
                      {currentCwd || "ROOT"}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-mono px-1.5 rounded-md border h-[24px] sm:h-[27px] ${
                      isKernelLocked
                        ? "text-slate-500 bg-slate-900/40 border-slate-800"
                        : "text-rq-red bg-rq-red-dim/10 border-rq-red/20 animate-pulse"
                    }`}
                  >
                    <Lock size={12} className="opacity-80" />
                    <span className="font-bold uppercase whitespace-nowrap">
                      {isKernelLocked ? "LOCKED" : "WRITE: ON"}
                    </span>
                  </div>
                </>
              )}
              {persona === "HACKER" && (
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-green-500 bg-green-950/10 px-2 rounded-md border border-green-500/20 h-[24px] sm:h-[27px]">
                  <Shield size={12} className="opacity-80" />
                  <span className="opacity-40 text-[9px]">OPSEC:</span>
                  <span className="font-bold uppercase">
                    {opsecStatus || "ACTIVE"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Voice & Send */}
          <div
            className="flex items-center gap-1 sm:gap-1 pointer-events-auto"
            style={{ WebkitAppRegion: "no-drag" } as any}
          >
            {/* Voice Toggle */}
            <button
              type="button"
              onClick={onToggleVoice}
              className={`
                 p-1 sm:p-1.5 rounded-md border transition-all
                 ${
                   isVoiceActive
                     ? isSpeaking
                       ? "bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                       : "text-white bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                     : "hover:text-white hover:bg-white/5"
                 }
                 active:scale-90
                 relative
               `}
              style={{
                borderColor: isVoiceActive
                  ? isSpeaking
                    ? `${safeColor}b3`
                    : "rgba(239, 68, 68, 0.5)"
                  : `${safeColor}60`,
                color: isVoiceActive
                  ? isSpeaking
                    ? safeColor
                    : undefined
                  : `${safeColor}cc`,
              }}
              title={isVoiceActive ? "Stop Voice Mode" : "Start Voice Mode"}
            >
              {isVoiceActive ? (
                isSpeaking ? (
                  <Mic
                    size={15}
                    className="sm:w-[13px] sm:h-[13px] animate-pulse"
                    style={{
                      transform: `scale(${1 + (amplitude / 255) * 0.5})`,
                    }}
                  />
                ) : (
                  <Mic
                    size={15}
                    className="sm:w-[13px] sm:h-[13px] animate-pulse text-red-400"
                  />
                )
              ) : (
                <MicOff size={15} className="sm:w-[13px] sm:h-[13px]" />
              )}
              {isSpeaking && (
                <span
                  className="absolute inset-0 rounded-md animate-ping opacity-20"
                  style={{ backgroundColor: safeColor }}
                />
              )}
            </button>

            {/* Send / Stop Button */}
            <button
              type="button"
              onClick={(e) => {
                if (isProcessing) {
                  onStop?.();
                  return;
                }
                if (input.trim() || attachment) {
                  onSubmit(e as any);
                }
              }}
              disabled={!input.trim() && !attachment && !isProcessing}
              className={`
              pointer-events-auto
              p-1 sm:p-1.5
              rounded-md border
              transition-all duration-200
              ${
                isProcessing
                  ? "bg-red-500 border-red-500 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse hover:bg-red-600 active:scale-95"
                  : input.trim() || attachment
                    ? "text-white hover:text-white/80 hover:bg-white/5 active:scale-90"
                    : "text-slate-600 cursor-not-allowed"
              }
            `}
              style={
                (!isProcessing
                  ? {
                      WebkitAppRegion: "no-drag",
                      borderColor: `${safeColor}${
                        input.trim() || attachment ? "b3" : "60"
                      }`,
                      color:
                        input.trim() || attachment
                          ? safeColor
                          : `${safeColor}cc`,
                    }
                  : { WebkitAppRegion: "no-drag" }) as any
              }
              title={
                isProcessing
                  ? "Stop generation"
                  : input.trim() || attachment
                    ? "Send message (Enter)"
                    : "Type a message"
              }
            >
              {isProcessing ? (
                <Square
                  size={15}
                  className="sm:w-[13px] sm:h-[13px] fill-current"
                />
              ) : (
                <Send size={15} className="sm:w-[13px] sm:h-[13px]" />
              )}
            </button>
          </div>
        </div>

        {/* Focus Glow Effect */}
        <div
          className="absolute inset-0 rounded-md opacity-0 focus-within:opacity-100 transition-opacity pointer-events-none -z-10"
          style={{
            boxShadow: `0 0 0 1px ${safeColor}33, 0 0 20px ${safeColor}22`,
          }}
        />
      </div>
    </div>
  );
};

export default ChatWidgetInput;
