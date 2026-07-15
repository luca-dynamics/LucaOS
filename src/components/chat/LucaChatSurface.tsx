import React, { type FormEvent, type ReactNode, useRef } from "react";
import ChatWidgetHistory from "../ChatWidgetHistory";
import ChatWidgetInput from "../ChatWidgetInput";
import { Icon } from "../ui/Icon";
import SuggestionChips, { type Suggestion } from "../SuggestionChips";
import {
  lucaMaterialControlStyle,
  lucaMaterialFloatingPanelStyle,
} from "../../styles/lucaMaterialSystem";

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

export type LucaChatSuggestion =
  | Suggestion
  | {
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
  onResizeStart?: (
    event: React.MouseEvent,
    direction: "left" | "right",
  ) => void;
}

const defaultTheme = { hex: "#3b82f6", isLight: false, themeName: "default" };

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
  const localMessagesEndRef = useRef<HTMLDivElement>(null);
  const safeColor =
    primaryColor.startsWith("#") && primaryColor.length > 7
      ? primaryColor.slice(0, 7)
      : primaryColor;
  const isCompact = messages.length === 0;
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
      data-luca-material-role="floating-panel"
      className="flex h-full min-h-0 flex-col rounded-xl border relative"
      style={
        {
          ...lucaMaterialFloatingPanelStyle,
          borderColor: `${safeColor}26`,
          width,
          maxWidth: "100%",
          minHeight: isCompact ? "80px" : "300px",
          maxHeight: "100%",
          WebkitAppRegion: "drag",
        } as React.CSSProperties
      }
    >
      {backgroundOverlay}

      {isCompact && !showSuggestions && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none opacity-[0.08]">
          <span
            className="font-mono italic font-black tracking-tighter"
            style={{ color: safeColor, fontSize: "55px" }}
          >
            L.U.C.A OS
          </span>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div
          className="relative z-10"
          style={
            {
              WebkitAppRegion: "no-drag",
              pointerEvents: "auto",
            } as React.CSSProperties
          }
        >
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
          <div
            className="w-full h-full absolute inset-0 opacity-20 bg-[size:10px_10px] animate-pulse"
            style={{
              backgroundImage: `radial-gradient(circle, ${safeColor}66 1px, transparent 1px)`,
            }}
          />
          <div
            className="w-48 h-48 rounded-full border animate-ping opacity-40"
            style={{ borderColor: `${safeColor}4d` }}
          />
          <span
            className="absolute bottom-4 left-4 text-[8px] font-mono tracking-[0.2em] font-bold uppercase animate-pulse"
            style={{ color: safeColor }}
          >
            Luca Synchronization Active
          </span>
        </div>
      )}

      {onResizeStart && (
        <>
          <div
            onMouseDown={(e) => onResizeStart(e, "left")}
            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-rq-blue/30 transition-colors z-[100]"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          />
          <div
            onMouseDown={(e) => onResizeStart(e, "right")}
            className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-rq-blue/30 transition-colors z-[100]"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          />
        </>
      )}

      {onClose && (
        <button
          onClick={onClose}
          data-luca-material-role="control"
          className={`luca-shell-control absolute top-4 right-4 z-[200] p-1.5 rounded-full border ${showClose ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"}`}
          style={
            {
              ...lucaMaterialControlStyle,
              WebkitAppRegion: "no-drag",
            } as React.CSSProperties
          }
          title="Close Luca"
        >
          <Icon name="Close" size={14} className="text-[var(--luca-text-tertiary,rgba(255,255,255,0.4))]" />
        </button>
      )}

      <div
        ref={historyContainerRef}
        className={`flex-1 min-h-0 overflow-auto transition-all duration-300 ${isCompact ? "opacity-0 h-0 hidden" : "opacity-100"}`}
      >
        <ChatWidgetHistory
          history={messages.map((message) => ({
            id: message.id,
            sender: (message.sender ??
              (message.role === "assistant" || message.role === "luca"
                ? "luca"
                : message.role === "user"
                  ? "user"
                  : "luca")) as "user" | "luca",
            text: message.text ?? message.content ?? "",
            attachment: message.attachment,
            generatedImage: message.generatedImage,
            generatedVideo: message.generatedVideo,
            isStreaming: message.isStreaming || message.status === "streaming",
            tacticalData: message.tacticalData,
          }))}
          isProcessing={pending}
          primaryColor={safeColor}
          messagesEndRef={messagesEndRef ?? localMessagesEndRef}
          persona={persona as never}
        />
        {errorLabel && (
          <p
            role="alert"
            className="mx-4 mb-4 rounded-xl border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] p-3 text-sm text-[var(--luca-danger,#f87171)]"
          >
            {errorLabel}
          </p>
        )}
        {approvalSurface}
      </div>

      {hiddenRuntimeSurface}

      <ChatWidgetInput
        input={inputValue}
        setInput={onInputChange}
        onSubmit={(event) => submit(event)}
        isProcessing={pending}
        primaryColor={safeColor}
        attachment={attachment}
        onClearAttachment={onClearAttachment}
        isEyeActive={isEyeActive}
        onToggleEye={onToggleEye}
        onToggleVoice={onOpenVoice}
        isVoiceActive={isVoiceActive}
        onAttachClick={onAttachClick}
        onClearChat={onClearChat}
        onHeightChange={onHeightChange}
        onStop={onStop}
        isSpeaking={isSpeaking}
        amplitude={amplitude}
        themeName={themeName}
        persona={persona}
        hasApprovalRequest={hasApprovalRequest}
      />
    </div>
  );
}

export default LucaChatSurface;
