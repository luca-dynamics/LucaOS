import React, { useEffect, useState } from "react";
import { Icon } from "../ui/Icon";
import ChatWidgetInput from "../ChatWidgetInput";
import ChatApprovalStrip from "./ChatApprovalStrip";
import WhileYouWereAwayStrip from "./WhileYouWereAwayStrip";
import { apiUrl } from "../../config/api";
import { useRoutedSend } from "./useRoutedSend";
import {
  lucaMaterialMobileControlStyle,
  lucaMaterialPanelStyle,
  resolveLucaSheetMaterial,
} from "../../styles/lucaMaterialSystem";

/**
 * LucaComposer — the ONE composer for the LucaOS workspace.
 *
 * Extracted verbatim from ChatPanel so the same component can mount in two
 * homes: embedded in the chat column (mobile, widget surfaces) and floating at
 * SHELL level as the workspace command bar (desktop — the input that addresses
 * LucaOS about everything on screen, not just the thread). The target design's
 * command bar is this component plus a positioning shell; see ShellCommandBar.
 *
 * It owns everything composer-local — MCP server polling, intent-routed send
 * (provenance → router bridge → route-hint injection), the attachment preview,
 * and the glass card stacking WhileYouWereAwayStrip + ChatApprovalStrip above
 * ChatWidgetInput. Everything conversational (input value, send, attachments,
 * voice, camera, processing state) stays owned by App and arrives as props —
 * which is what makes the two-home mounting possible at all.
 */

export interface LucaComposerProps {
  input: string;
  setInput: (input: string) => void;
  /** The actual send side effect (App-owned). Routing decorates this. */
  handleSend: () => void;
  isProcessing: boolean;
  messages: any[];
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  theme: any;
  isMobile: boolean;
  attachedImage: any;
  setAttachedImage: (image: any) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isVoiceMode: boolean;
  toggleVoiceMode: () => void;
  showCamera: boolean;
  setShowCamera: (show: boolean) => void;
  handleScreenShare?: () => void;
  handleClearChat: () => void;
  handleStop: () => void;
  currentCwd: string;
  isKernelLocked: boolean;
  opsecStatus: string;
  persona: string;
  /** Centered/hero presentation (empty thread, dashboard): border + soft lift. */
  emphasized?: boolean;
}

export const LucaComposer: React.FC<LucaComposerProps> = ({
  input,
  setInput,
  handleSend,
  isProcessing,
  messages,
  setMessages,
  theme,
  isMobile,
  attachedImage,
  setAttachedImage,
  fileInputRef,
  handleFileSelect,
  isVoiceMode,
  toggleVoiceMode,
  showCamera,
  setShowCamera,
  handleScreenShare,
  handleClearChat,
  handleStop,
  currentCwd,
  isKernelLocked,
  opsecStatus,
  persona,
  emphasized = false,
}) => {
  // --- Active MCP servers (polled every 10s) ---
  const [activeMcpServers, setActiveMcpServers] = useState<
    { id: string; name: string; status?: string }[]
  >([]);
  useEffect(() => {
    const fetchMcp = async () => {
      try {
        const res = await fetch(apiUrl("/api/mcp/list"));
        const data = await res.json();
        setActiveMcpServers(data.servers || []);
      } catch {
        /* silent */
      }
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
    const server = activeMcpServers.find((s) => s.id === id);
    if (!server) return;

    try {
      await fetch(apiUrl("/api/mcp/connect"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...server,
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

  // Routed send lives in one hook shared with the workspace command bar, so
  // the two composer surfaces cannot drift into different sending behaviour.
  const handleRoutedSend = useRoutedSend({
    input,
    isProcessing,
    handleSend,
    messages,
    setMessages,
  });

  return (
    <div data-luca-composer>
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
          borderColor: emphasized
            ? "var(--luca-border-subtle, var(--app-border-main))"
            : undefined,
          boxShadow: emphasized ? "var(--luca-shadow-soft)" : undefined,
        }}
      >
        {/* The being accounts for itself, then asks. */}
        <WhileYouWereAwayStrip />
        {/* Pending approvals live where the user is already looking. */}
        <ChatApprovalStrip />
        {/* Routing-mode selector lives in the composer's bottom control row
            (inside ChatWidgetInput), so it no longer sits above the composer. */}
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
          onScreenShare={handleScreenShare}
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
};

export default LucaComposer;
