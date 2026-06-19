import React, { type FormEvent, type ReactNode, useEffect, useRef } from "react";
import { Icon } from "../ui/Icon";
import SuggestionChips, { type Suggestion } from "../SuggestionChips";

export type LucaChatMessage = {
  id?: string;
  role?: "user" | "luca" | "assistant" | "system";
  sender?: "user" | "luca" | "system";
  content?: string;
  text?: string;
  status?: "sent" | "streaming" | "error";
  timestamp?: string | number;
  attachment?: string | null;
  generatedImage?: string | null;
  generatedVideo?: string | null;
  isStreaming?: boolean;
  tacticalData?: unknown;
};

export type LucaChatSuggestion = Suggestion | {
  id: string;
  label: string;
  value: string;
  icon?: string;
};

export interface LucaChatSurfaceProps {
  messages: LucaChatMessage[];
  inputValue: string;
  primaryColor?: string;
  persona?: string;
  themeName?: string;
  brainModel?: string;
  embeddingModel?: string;
  placeholder?: string;
  pending?: boolean;
  errorLabel?: string | null;
  suggestions?: LucaChatSuggestion[];
  showSuggestions?: boolean;
  width?: number | string;
  attachment?: string | null;
  isEyeActive?: boolean;
  isVoiceActive?: boolean;
  isSpeaking?: boolean;
  amplitude?: number;
  canSend?: boolean;
  showClose?: boolean;
  isScanning?: boolean;
  hasApprovalRequest?: boolean;
  historyContainerRef?: React.RefObject<HTMLDivElement>;
  messagesEndRef?: React.RefObject<HTMLDivElement>;
  backgroundOverlay?: ReactNode;
  approvalSurface?: ReactNode;
  hiddenRuntimeSurface?: ReactNode;
  onInputChange: (value: string) => void;
  onSend: (value: string) => void;
  onStop?: () => void;
  onSelectSuggestion?: (value: string) => void;
  onDismissSuggestions?: () => void;
  onOpenVoice?: () => void;
  onOpenSettings?: () => void;
  onAttachClick?: () => void;
  onClearAttachment?: () => void;
  onToggleEye?: () => void;
  onClearChat?: () => void;
  onClose?: () => void;
  onHeightChange?: (height: number) => void;
  onResizeStart?: (event: React.MouseEvent, direction: "left" | "right") => void;
}

const defaultTheme = { hex: "#3b82f6", isLight: false, themeName: "default" };

function toPrompt(suggestion: LucaChatSuggestion) {
  return "prompt" in suggestion ? suggestion.prompt : suggestion.value;
}

function toSuggestion(suggestion: LucaChatSuggestion): Suggestion {
  if ("prompt" in suggestion) return suggestion;
  return {
    id: suggestion.id,
    label: suggestion.label,
    prompt: suggestion.value,
    icon: suggestion.icon || "sparkles",
    category: "awareness",
  };
}

export function LucaChatSurface({
  messages,
  inputValue,
  primaryColor = "#3b82f6",
  persona = "ASSISTANT",
  themeName = "default",
  brainModel,
  embeddingModel,
  placeholder,
  pending = false,
  errorLabel,
  suggestions = [],
  showSuggestions = suggestions.length > 0,
  width = "100%",
  attachment,
  isEyeActive,
  isVoiceActive,
  isSpeaking,
  amplitude = 0,
  canSend,
  showClose = false,
  isScanning = false,
  hasApprovalRequest = false,
  historyContainerRef,
  messagesEndRef,
  backgroundOverlay,
  approvalSurface,
  hiddenRuntimeSurface,
  onInputChange,
  onSend,
  onStop,
  onSelectSuggestion,
  onDismissSuggestions,
  onOpenVoice,
  onAttachClick,
  onClearAttachment,
  onToggleEye,
  onClearChat,
  onHeightChange,
  onResizeStart,
  onClose,
}: LucaChatSurfaceProps) {
  const localTextareaRef = useRef<HTMLTextAreaElement>(null);
  const safeColor = primaryColor.startsWith("#") && primaryColor.length > 7 ? primaryColor.slice(0, 7) : primaryColor;
  const isCompact = messages.length === 0;
  const sendEnabled = canSend ?? (!!inputValue.trim() || !!attachment || pending);

  useEffect(() => {
    const textarea = localTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const newHeight = Math.max(48, Math.min(textarea.scrollHeight, 200));
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 200 ? "auto" : "hidden";
    onHeightChange?.(newHeight + 44);
  }, [inputValue, onHeightChange]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (pending) {
      onStop?.();
      return;
    }
    const value = inputValue.trim();
    if (!value && !attachment) return;
    onSend(value);
  };

  return (
    <div
      data-luca-chat-surface="original-mini-chat-extraction"
      className="flex h-full min-h-0 flex-col bg-transparent rounded-xl border shadow-2xl relative transition-all duration-300"
      style={{ borderColor: `${safeColor}40`, width, maxWidth: "100%", minHeight: isCompact ? "80px" : "300px", maxHeight: "100%", WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="absolute inset-0 bg-[#0a0a0a]/95 glass-blur -z-10" />
      {backgroundOverlay}

      {isCompact && !showSuggestions && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none opacity-[0.08]">
          <span className="font-mono italic font-black tracking-tighter" style={{ color: safeColor, fontSize: "55px" }}>L.U.C.A OS</span>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="relative z-10" style={{ WebkitAppRegion: "no-drag", pointerEvents: "auto" } as React.CSSProperties}>
          <SuggestionChips
            suggestions={suggestions.map(toSuggestion)}
            onChipClick={(prompt) => onSelectSuggestion?.(prompt)}
            onDismissAll={() => onDismissSuggestions?.()}
            theme={{ ...defaultTheme, hex: safeColor, themeName }}
            visible={showSuggestions}
            isDocked
          />
        </div>
      )}

      {isScanning && (
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center overflow-hidden">
          <div className="w-full h-full absolute inset-0 opacity-20 bg-[size:10px_10px] animate-pulse" style={{ backgroundImage: `radial-gradient(circle, ${safeColor}66 1px, transparent 1px)` }} />
          <div className="w-48 h-48 rounded-full border animate-ping opacity-40" style={{ borderColor: `${safeColor}4d` }} />
          <span className="absolute bottom-4 left-4 text-[8px] font-mono tracking-[0.2em] font-bold uppercase animate-pulse" style={{ color: safeColor }}>Luca Synchronization Active</span>
        </div>
      )}

      {onResizeStart && <><div onMouseDown={(e) => onResizeStart(e, "left")} className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-rq-blue/30 transition-colors z-[100]" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties} /><div onMouseDown={(e) => onResizeStart(e, "right")} className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-rq-blue/30 transition-colors z-[100]" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties} /></>}

      {onClose && <button onClick={onClose} className={`absolute top-4 right-4 z-[200] p-1.5 rounded-full bg-black/40 border border-white/10 transition-all duration-300 hover:bg-red-500/20 hover:border-red-500/40 ${showClose ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"}`} style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties} title="Close Luca"><Icon name="Close" size={14} className="text-white/40" /></button>}

      <div ref={historyContainerRef} className={`flex-1 min-h-0 overflow-auto transition-all duration-300 ${isCompact ? "opacity-0 h-0 hidden" : "opacity-100"}`}>
        <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
          {messages.map((message, index) => {
            const sender = message.sender ?? (message.role === "assistant" ? "luca" : message.role) ?? "luca";
            const isUser = sender === "user";
            const text = message.text ?? message.content ?? "";
            return (
              <div key={message.id || index} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-6 font-mono ${isUser ? "bg-white/10 text-white" : "bg-slate-800/50 text-slate-100"}`} style={{ borderColor: isUser ? `${safeColor}80` : "rgba(255,255,255,0.1)" }}>
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] opacity-50">{isUser ? "You" : "Luca"}</p>
                  {message.attachment && <img src={message.attachment} alt="Attachment" className="mb-3 max-h-48 rounded-xl border border-white/10" />}
                  <p className="whitespace-pre-wrap">{text}</p>
                  {(message.isStreaming || message.status === "streaming") && <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: safeColor }} />}
                </div>
              </div>
            );
          })}
          {pending && messages.length === 0 && <div className="flex justify-start"><div className="flex gap-1 items-center bg-slate-800/50 rounded-lg px-3 py-2 border border-white/10 relative z-10"><span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: safeColor }} /><span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: safeColor, animationDelay: "75ms" }} /><span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: safeColor, animationDelay: "150ms" }} /></div></div>}
          {errorLabel && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{errorLabel}</p>}
          <div ref={messagesEndRef} />
        </div>
        {approvalSurface}
      </div>

      {hiddenRuntimeSurface}

      <form onSubmit={submit} className="relative z-20 transition-colors duration-500 rounded-2xl bg-black/40 glass-blur">
        {attachment && <div className="mb-3 flex px-4 pt-3"><div className="relative group"><img src={attachment} alt="Attachment" className="h-20 sm:h-24 w-auto rounded-xl border border-white/20 shadow-lg" /><button type="button" onClick={onClearAttachment} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"><Icon name="CloseCircle" size={12} /></button></div></div>}
        <div className="relative pt-2 bg-transparent" style={{ WebkitAppRegion: "drag" } as React.CSSProperties} onClick={() => localTextareaRef.current?.focus()}>
          <textarea ref={localTextareaRef} id="chat-input" value={inputValue} onChange={(e) => onInputChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e as unknown as FormEvent); } }} placeholder={placeholder || (attachment ? "Discuss this image..." : "Message Luca...")} rows={1} enterKeyHint="enter" className="w-full bg-transparent text-white placeholder-slate-500 px-4 py-2 focus:outline-none resize-none font-mono leading-relaxed block" style={{ caretColor: safeColor, WebkitAppRegion: "no-drag" } as React.CSSProperties} />
          {hasApprovalRequest && <div className="absolute top-0 right-3 flex items-center gap-1.5 py-2 px-3 bg-red-500/10 border border-red-500/20 rounded-bl-xl z-30 animate-pulse pointer-events-none"><Icon name="Shield" size={12} className="text-red-500" variant="BoldDuotone" /><span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">Mission Pending</span></div>}
          <div className="relative pt-2 pb-2 flex items-center justify-between px-4 pointer-events-none z-50">
            <div className="flex items-center gap-1 pointer-events-auto" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/5 opacity-60"><Icon name="Brain" size={8} color={safeColor} /><span className="text-[8px] tracking-tight truncate max-w-[60px]">{brainModel?.toUpperCase() || persona}</span></div>
              {onClearChat && <button type="button" onClick={onClearChat} className="p-1 sm:p-1.5 hover:text-red-400 transition-all rounded-md border hover:bg-white/5 active:scale-90" style={{ borderColor: `${safeColor}60`, color: `${safeColor}cc` }} title="Clear Chat"><Icon name="Chat" size={15} variant="BoldDuotone" /></button>}
              {onAttachClick && <button type="button" className="p-1 sm:p-1.5 transition-all rounded-md border hover:bg-white/5 active:scale-90" style={{ borderColor: `${safeColor}60`, color: `${safeColor}cc` }} title="Attach file" onClick={onAttachClick}><Icon name="Import" size={15} variant="BoldDuotone" /></button>}
              {onToggleEye && <button type="button" onClick={onToggleEye} className="p-1 sm:p-1.5 rounded-md border transition-all hover:bg-white/5 active:scale-90 relative" style={{ color: isEyeActive ? safeColor : `${safeColor}cc`, borderColor: isEyeActive ? `${safeColor}b3` : `${safeColor}60` }} title={isEyeActive ? "Disable Vision" : "Enable Vision"}><Icon name="Monitor" size={15} variant="BoldDuotone" className={isEyeActive ? "animate-pulse" : ""} /></button>}
            </div>
            <div className="flex items-center gap-1 pointer-events-auto" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
              {onOpenVoice && <button type="button" onClick={onOpenVoice} className={`p-1 sm:p-1.5 rounded-md border transition-all ${isVoiceActive ? "text-white bg-red-500/20" : "hover:text-white hover:bg-white/5"} active:scale-90 relative`} style={{ borderColor: isVoiceActive ? "rgba(239, 68, 68, 0.5)" : `${safeColor}60`, color: isVoiceActive ? undefined : `${safeColor}cc` }} title={isVoiceActive ? "Stop Voice Mode" : "Start Voice Mode"}><Icon name="Microphone" size={15} variant="BoldDuotone" className={isVoiceActive ? "animate-pulse" : "opacity-50"} style={{ transform: `scale(${1 + (amplitude / 255) * 0.5})` }} />{isSpeaking && <span className="absolute inset-0 rounded-md animate-ping opacity-20" style={{ backgroundColor: safeColor }} />}</button>}
              <button type="submit" disabled={!sendEnabled} className={`pointer-events-auto p-1 sm:p-1.5 rounded-md border transition-all duration-200 ${pending ? "bg-red-500 border-red-500 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse" : sendEnabled ? "text-white hover:bg-white/5 active:scale-90" : "text-slate-600 cursor-not-allowed"}`} style={!pending ? { borderColor: `${safeColor}${sendEnabled ? "b3" : "60"}`, color: sendEnabled ? safeColor : `${safeColor}cc` } : undefined} title={pending ? "Stop generation" : sendEnabled ? "Send message (Enter)" : "Type a message"}><Icon name={pending ? "StopCircle" : "Send"} size={15} variant="BoldDuotone" /></button>
            </div>
          </div>
          {embeddingModel && <span className="sr-only">{embeddingModel}</span>}
        </div>
      </form>
    </div>
  );
}

export default LucaChatSurface;
