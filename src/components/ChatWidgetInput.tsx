import React, { useRef, useEffect, useState, KeyboardEvent } from "react";
import { AnimatePresence } from "framer-motion";
import { Icon } from "./ui/Icon";
import { LucaMotionPopover } from "./ui/luca";
import ChatModelSwitcher from "./chat/ChatModelSwitcher";
import IntentRoutingModeSelector from "./runtime/IntentRoutingModeSelector";
import { CURATED_PLUGINS, MarketplacePlugin } from "../data/directoryData";
import {
  LUCA_SHELL_BORDER_SUBTLE,
  LUCA_SHELL_SHADOW_GLOW,
  LUCA_SHELL_SHADOW_SOFT,
} from "../styles/lucaShellStyles";
import {
  lucaMaterialControlStyle,
  lucaMaterialPopoverStyle,
  lucaMaterialSolidCardStyle,
} from "../styles/lucaMaterialSystem";

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
  hasApprovalRequest?: boolean;
  onScreenShare?: () => void;
  activeMcpServers?: { id: string; name: string; status?: string }[];
  onDisconnectMcp?: (id: string) => void;
  onConnectMcp?: (id: string) => void;
  onClose?: () => void;
  activePluginId?: string | null;
  onClearActivePlugin?: () => void;
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
  hasApprovalRequest,
  onScreenShare,
  activeMcpServers = [],
  onDisconnectMcp,
  onConnectMcp,
  activePluginId,
  onClearActivePlugin,
}) => {
  const [plusOpen, setPlusOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  const closePlusMenu = (restoreFocus = false) => {
    setPlusOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => plusButtonRef.current?.focus());
    }
  };

  useEffect(() => {
    if (!plusOpen) return;
    requestAnimationFrame(() => {
      plusMenuRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
        ?.focus();
    });
  }, [plusOpen]);

  const handlePlusMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      plusMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    );
    if (event.key === "Escape") {
      event.preventDefault();
      closePlusMenu(true);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) || items.length === 0) {
      return;
    }
    event.preventDefault();
    const activeIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : event.key === "ArrowDown"
            ? (activeIndex + 1) % items.length
            : (activeIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  };

  // THREE.Color/CSS doesn't always handle 8-digit hex properly when appending, sanitize to 6-digit
  const safeColor = React.useMemo(() => {
    if (primaryColor.startsWith("#") && primaryColor.length > 7) {
      return primaryColor.slice(0, 7);
    }
    return primaryColor;
  }, [primaryColor]);

  // Quiet, neutral treatment for secondary toolbar controls so they read as
  // subordinate to the text input and the send action. Active/safety states
  // keep their own accent/danger styling below and are unaffected by this.
  const quietControlStyle = {
    ...lucaMaterialControlStyle,
    borderColor: "var(--luca-border-subtle, var(--app-border-main))",
    color: "var(--luca-text-secondary, var(--app-text-muted))",
  } as const;

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

  const activePlugin = React.useMemo(
    () =>
      CURATED_PLUGINS.find((p: MarketplacePlugin) => p.id === activePluginId),
    [activePluginId],
  );

  const handleClearPlugin = () => {
    onClearActivePlugin?.();
  };

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

  const isLight =
    themeName?.toLowerCase() === "lucagent" ||
    themeName?.toLowerCase() === "agentic-slate" ||
    themeName?.toLowerCase() === "light";
  // The composer reads as one elevated surface (full border + soft shadow),
  // not just a top-border strip — it's the primary control in the view.
  const inputSurfaceStyle = {
    ...lucaMaterialSolidCardStyle,
    border: `1px solid ${LUCA_SHELL_BORDER_SUBTLE}`,
    boxShadow: LUCA_SHELL_SHADOW_SOFT,
  };

  return (
    <div
      className="relative z-20 rounded-2xl transition-colors duration-500"
      data-luca-material-role="composer"
      style={inputSurfaceStyle}
    >
      {/* Attachment Preview (Above Input) */}
      {attachment && (
        <div className="mb-3 flex">
          <div className="relative group">
            <img
              src={attachment}
              alt="Attachment"
              className="h-20 sm:h-24 w-auto rounded-xl border"
              style={{
                borderColor: LUCA_SHELL_BORDER_SUBTLE,
                boxShadow: LUCA_SHELL_SHADOW_SOFT,
              }}
            />
            <button
              type="button"
              onClick={onClearAttachment}
              className="absolute -top-2 -right-2 bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] text-[var(--luca-text-primary,var(--app-text-main))] rounded-full p-1 hover:bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] transition-all active:scale-90"
              style={{ boxShadow: LUCA_SHELL_SHADOW_SOFT }}
            >
              <Icon name="CloseCircle" size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Main Input Container (Draggable Wrapper) */}
      <div
        className="relative pt-2 bg-transparent transition-all duration-200"
        style={
          {
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
            text-[var(--luca-text-primary,var(--app-text-main))] placeholder:text-[var(--luca-text-tertiary,var(--app-text-muted))]
            px-4
            py-2
            focus:outline-none
            resize-none
            font-sans
            text-[15px]
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

        {/* MISSION PENDING INDICATOR */}
        {hasApprovalRequest && (
          <div className="absolute top-0 right-3 flex items-center gap-1.5 py-2 px-3 bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] rounded-bl-xl z-30 animate-pulse pointer-events-none">
            <Icon
              name="Shield"
              size={12}
              className="text-[var(--luca-danger,#f87171)]"
              variant="BoldDuotone"
            />
            <span className="text-[10px] font-bold text-[var(--luca-danger,#f87171)] uppercase tracking-widest font-mono">
              Mission Pending
            </span>
          </div>
        )}

        {/* Bottom Icons Row - Relative to flow below textarea */}
        <div className="relative pt-2 pb-2 flex items-center justify-between px-4 sm:px-4 pointer-events-none z-50">
          {/* Left Icons */}
          <div
            className="flex items-center gap-1.5 pointer-events-auto"
            style={{ WebkitAppRegion: "no-drag" } as any}
          >
            {/* Model Switcher */}
            <ChatModelSwitcher
              themeName={themeName}
              primaryColor={activePlugin?.color || safeColor}
            />

            {/* Plugin Badge (Mode Indicator) */}
            {activePlugin && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] sm:text-[11px] font-mono font-bold animate-in slide-in-from-left-2 duration-300"
                style={{
                  backgroundColor: `${activePlugin.color}15`,
                  borderColor: `${activePlugin.color}40`,
                  color: activePlugin.color,
                  boxShadow: `0 0 15px ${activePlugin.color}20`,
                }}
              >
                <Icon
                  name={activePlugin.icon as any}
                  size={12}
                  variant="BoldDuotone"
                />
                <span className="uppercase tracking-widest truncate max-w-[80px] sm:max-w-[120px]">
                  {activePlugin.name}
                </span>
                <button
                  onClick={handleClearPlugin}
                  className="ml-1 p-0.5 rounded transition-colors opacity-60 hover:opacity-100"
                  style={{ background: "var(--luca-surface-hover, transparent)" }}
                >
                  <Icon name="Close" size={10} />
                </button>
              </div>
            )}

            {/* Routing mode: AUTO / FAST / PLAN / AGENT (moved here from the
                composer header so there is a single mode control). */}
            <IntentRoutingModeSelector compact theme={{ hex: safeColor }} />

            {/* The + menu (composer-target): attach, screen, vision, clear
                as one honest labeled list. Four unlabeled icon buttons said
                nothing; a list can. */}
            <div className="relative">
              <button
                ref={plusButtonRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={plusOpen}
                title="Add - files, screen, vision"
                onClick={() => setPlusOpen((v) => !v)}
                className="luca-material-pressable relative rounded-md border p-1.5 transition-colors hover:bg-[var(--luca-surface-hover,var(--app-bg-tint))]"
                style={quietControlStyle}
              >
                <Icon name="AddCircle" size={15} className="sm:w-[13px] sm:h-[13px]" />
                {isEyeActive && (
                  <span
                    className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: safeColor }}
                    aria-hidden="true"
                  />
                )}
              </button>
              <AnimatePresence>
                {plusOpen && (
                  <>
                  <LucaMotionPopover
                    ref={plusMenuRef}
                    open={plusOpen}
                    triggerRef={plusButtonRef}
                    onRequestClose={() => closePlusMenu(true)}
                    role="menu"
                    aria-label="Add to conversation"
                    originX={0.08}
                    originY={1}
                    onKeyDown={handlePlusMenuKeyDown}
                    className="absolute bottom-full left-0 mb-1.5 w-[216px]"
                    style={{
                      ...lucaMaterialPopoverStyle,
                      borderRadius: 12,
                      padding: 4,
                    }}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setPlusOpen(false); onAttachClick?.(); }}
                      className="flex h-8 w-full items-center gap-2.5 rounded-lg px-3 text-[12.5px] text-[var(--app-text-main)] transition-colors hover:bg-[var(--luca-surface-hover,rgba(255,255,255,0.06))]"
                    >
                      <Icon name="Import" size={13} className="text-[var(--app-text-muted)]" />
                      Attach file
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setPlusOpen(false); onToggleEye?.(); }}
                      className="flex h-8 w-full items-center gap-2.5 rounded-lg px-3 text-[12.5px] text-[var(--app-text-main)] transition-colors hover:bg-[var(--luca-surface-hover,rgba(255,255,255,0.06))]"
                    >
                      <Icon name="Monitor" size={13} className="text-[var(--app-text-muted)]" />
                      {isEyeActive ? "Stop showing my screen" : "Show Luca my screen"}
                    </button>
                    {onScreenShare && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { setPlusOpen(false); onScreenShare(); }}
                        className="flex h-8 w-full items-center gap-2.5 rounded-lg px-3 text-[12.5px] text-[var(--app-text-main)] transition-colors hover:bg-[var(--luca-surface-hover,rgba(255,255,255,0.06))]"
                      >
                        <Icon name="Monitor" size={13} className="text-[var(--app-text-muted)]" />
                        Share screen
                      </button>
                    )}
                    {onClearChat && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { setPlusOpen(false); onClearChat(); }}
                        className="flex h-8 w-full items-center gap-2.5 rounded-lg px-3 text-[12.5px] text-[var(--app-text-main)] transition-colors hover:bg-[var(--luca-surface-hover,rgba(255,255,255,0.06))]"
                      >
                        <Icon name="Chat" size={13} className="text-[var(--app-text-muted)]" />
                        Clear conversation
                      </button>
                    )}
                    <div className="px-3 pb-1 pt-1.5 text-[10.5px] text-[var(--app-text-muted)] opacity-80">
                      Everything asks before it runs.
                    </div>
                  </LucaMotionPopover>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Status Indicators (RELOCATED LEFT) */}
            <div className="hidden sm:flex items-center gap-1 ml-1">
              {persona === "ENGINEER" && (
                <>
                  <div
                    className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-rq-green bg-rq-green-dim/10 px-1.5 rounded-md border h-[24px] sm:h-[27px] max-w-[100px] overflow-hidden"
                    style={{ borderColor: `${safeColor}40` }}
                  >
                    <Icon
                      name="Folder"
                      size={12}
                      variant="BoldDuotone"
                      className="opacity-80"
                    />
                    <span className="opacity-40 text-[9px]">CWD:</span>
                    <span className="font-bold truncate uppercase">
                      {currentCwd || "ROOT"}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-mono px-1.5 rounded-md border h-[24px] sm:h-[27px] ${
                      isKernelLocked
                        ? isLight
                          ? "text-[var(--luca-text-tertiary,var(--app-text-muted))] bg-[var(--luca-surface-solid,var(--app-bg-tint))] border-[var(--luca-border-subtle,var(--app-border-main))]"
                          : "text-[var(--luca-text-tertiary,var(--app-text-muted))] bg-[var(--luca-surface-glass,var(--app-bg-tint))] border-[var(--luca-border-subtle,var(--app-border-main))]"
                        : "text-rq-red bg-rq-red-dim/10 border-rq-red/20 animate-pulse"
                    }`}
                  >
                    <Icon
                      name="Lock"
                      size={12}
                      variant="BoldDuotone"
                      className="opacity-80"
                    />
                    <span className="font-bold uppercase whitespace-nowrap">
                      {isKernelLocked ? "LOCKED" : "WRITE: ON"}
                    </span>
                  </div>
                </>
              )}
              {persona === "HACKER" && (
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-[var(--luca-success,#4fbf7a)] bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] px-2 rounded-md border border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] h-[24px] sm:h-[27px]">
                  <Icon
                    name="Shield"
                    size={12}
                    variant="BoldDuotone"
                    className="opacity-80"
                  />
                  <span className="opacity-40 text-[9px]">OPSEC:</span>
                  <span className="font-bold uppercase">
                    {opsecStatus || "ACTIVE"}
                  </span>
                </div>
              )}
            </div>

            {/* Active MCP indicator — single smart pill */}
            {activeMcpServers.length > 0 &&
              (() => {
                const connected = activeMcpServers.filter(
                  (s) => s.status === "connected",
                );
                const isAnyConnected = connected.length > 0;

                const label = !isAnyConnected
                  ? "offline"
                  : connected.length === 1
                    ? connected[0].name
                    : `${connected.length} connected`;

                return (
                  <div className="hidden sm:flex items-center relative group/mcp ml-1">
                    <button
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent("luca:open-settings", {
                            detail: { tab: "mcp" },
                          }),
                        )
                      }
                      className="luca-material-pressable flex h-[24px] items-center gap-1.5 rounded-md border px-2 text-[11px] transition-opacity hover:opacity-80 sm:h-[27px]"
                      style={{
                        ...quietControlStyle,
                        borderColor: isAnyConnected
                          ? `${safeColor}40`
                          : "var(--luca-border-subtle, var(--app-border-main))",
                        color: isAnyConnected
                          ? safeColor
                          : isLight
                            ? "var(--luca-text-tertiary, var(--app-text-muted))"
                            : "var(--luca-text-tertiary, var(--app-text-muted))",
                        backgroundColor: isAnyConnected
                          ? `${safeColor}10`
                          : "transparent",
                      }}
                      title={`MCP: ${activeMcpServers.length} configured — ${connected.length} active`}
                    >
                      <Icon
                        name="Plug"
                        size={10}
                        variant="BoldDuotone"
                        className={`opacity-70 flex-shrink-0 ${!isAnyConnected ? "grayscale" : ""}`}
                      />
                      <span
                        className={`font-medium truncate max-w-[88px] ${!isAnyConnected ? "opacity-70" : ""}`}
                      >
                        {label}
                      </span>
                      {isAnyConnected && connected.length > 1 && (
                        <span
                          className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
                          style={{ backgroundColor: safeColor }}
                        />
                      )}
                    </button>

                    {/* Hover popover — lists all servers */}
                    <div
                      className={`
                      absolute bottom-full left-0 mb-2 z-50
                      min-w-[180px] rounded-xl border
                      py-2 px-0
                      opacity-0 group-hover/mcp:opacity-100
                      pointer-events-none group-hover/mcp:pointer-events-auto
                      translate-y-1 group-hover/mcp:translate-y-0
                      transition-all duration-200
                      text-[var(--luca-text-secondary,var(--app-text-muted))]
                    `}
                      style={lucaMaterialPopoverStyle}
                    >
                      <div className="flex items-center justify-between px-3 pb-2 border-b border-[var(--luca-border-subtle,var(--app-border-main))] mb-1">
                        <p
                          className={`text-[9px] font-black uppercase tracking-widest text-[var(--luca-text-tertiary,var(--app-text-muted))]`}
                        >
                          MCP Node Hub
                        </p>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                        {activeMcpServers.map((s) => {
                          const isConnected = s.status === "connected";
                          return (
                            <div
                              key={s.id}
                              className="flex items-center justify-between gap-3 px-3 py-1.5 transition-colors hover:bg-[var(--luca-surface-hover,var(--app-bg-tint))]"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isConnected ? "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] animate-pulse" : "bg-[var(--luca-text-tertiary,var(--app-text-muted))]"}`}
                                />
                                <span
                                  className={`text-[11px] font-mono font-bold truncate ${!isConnected ? "opacity-50" : ""}`}
                                >
                                  {s.name}
                                </span>
                              </div>

                              {/* Actions — Toggle Connect/Disconnect */}
                              <div className="flex items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
                                {isConnected ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDisconnectMcp?.(s.id);
                                    }}
                                    className="p-1 rounded-md hover:bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] text-[var(--luca-danger,#f87171)] hover:text-[var(--luca-danger,#f87171)] transition-all active:scale-90"
                                    title="Disconnect server"
                                  >
                                    <Icon
                                      name="Power"
                                      size={10}
                                      variant="BoldDuotone"
                                    />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onConnectMcp?.(s.id);
                                    }}
                                    className="p-1 rounded-md hover:bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] text-[var(--luca-success,#4fbf7a)] hover:text-[var(--luca-success,#4fbf7a)] transition-all active:scale-90"
                                    title="Connect server"
                                  >
                                    <Icon
                                      name="Play"
                                      size={10}
                                      variant="BoldDuotone"
                                    />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-1 pt-1 border-t border-[var(--luca-border-subtle,var(--app-border-main))] px-2">
                        <button
                          onClick={() =>
                            window.dispatchEvent(
                              new CustomEvent("luca:open-settings", {
                                detail: { tab: "mcp" },
                              }),
                            )
                          }
                          className={`w-full text-center py-1 text-[8px] font-bold uppercase tracking-widest hover:underline text-[var(--luca-text-tertiary,var(--app-text-muted))]`}
                        >
                          Manage All Nodes
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
          </div>

          {/* Right: Voice & Send */}
          <div
            className="flex items-center gap-1.5 pointer-events-auto"
            style={{ WebkitAppRegion: "no-drag" } as any}
          >
            {/* Voice Toggle */}
            <button
              type="button"
              onClick={onToggleVoice}
              className={`
                 p-1.5 rounded-md border transition-all
                 ${
                   isVoiceActive
                     ? isSpeaking
                       ? "bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)]"
                       : "text-[var(--luca-danger,#f87171)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]"
                     : "hover:text-[var(--luca-text-primary,var(--app-text-main))] hover:bg-[var(--luca-surface-hover,var(--app-bg-tint))]"
                 }
                 active:scale-90
                 relative
               `}
              style={{
                ...(!isVoiceActive ? quietControlStyle : {}),
                borderColor: isVoiceActive
                  ? isSpeaking
                    ? `${safeColor}b3`
                    : "color-mix(in srgb, var(--luca-danger,#f87171) 50%, transparent)"
                  : quietControlStyle.borderColor,
                color: isVoiceActive
                  ? isSpeaking
                    ? safeColor
                    : undefined
                  : quietControlStyle.color,
                boxShadow: isVoiceActive
                  ? isSpeaking
                    ? LUCA_SHELL_SHADOW_GLOW
                    : "0 0 15px color-mix(in srgb, var(--luca-danger,#f87171) 30%, transparent)"
                  : undefined,
              }}
              title={isVoiceActive ? "Stop Voice Mode" : "Start Voice Mode"}
            >
              {isVoiceActive ? (
                isSpeaking ? (
                  <Icon
                    name="Microphone"
                    size={15}
                    variant="BoldDuotone"
                    className="sm:w-[13px] sm:h-[13px] animate-pulse"
                    style={{
                      transform: `scale(${1 + (amplitude / 255) * 0.5})`,
                    }}
                  />
                ) : (
                  <Icon
                    name="Microphone"
                    size={15}
                    variant="BoldDuotone"
                    className="sm:w-[13px] sm:h-[13px] animate-pulse text-[var(--luca-danger,#f87171)]"
                  />
                )
              ) : (
                <Icon
                  name="Microphone"
                  size={15}
                  variant="BoldDuotone"
                  className="sm:w-[13px] sm:h-[13px] opacity-70"
                />
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
              p-1.5
              rounded-md border
              transition-all duration-200
              ${
                isProcessing
                  ? "bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] text-[var(--luca-danger,#f87171)] active:scale-95"
                  : input.trim() || attachment
                    ? "active:scale-90 hover:opacity-90"
                    : "cursor-not-allowed"
              }
            `}
              style={
                (isProcessing
                  ? { WebkitAppRegion: "no-drag" }
                  : input.trim() || attachment
                    ? {
                        // The composer's only accent: the send wakes with content.
                        WebkitAppRegion: "no-drag",
                        backgroundColor: safeColor,
                        borderColor: "transparent",
                        color: "var(--luca-accent-ink, #0c0e12)",
                      }
                  : {
                        WebkitAppRegion: "no-drag",
                        ...lucaMaterialControlStyle,
                        borderColor:
                          "var(--luca-border-subtle, var(--app-border-main))",
                        color:
                          "var(--luca-text-tertiary, var(--app-text-muted))",
                      }) as any
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
                <Icon
                  name="StopCircle"
                  size={15}
                  variant="BoldDuotone"
                  className="sm:w-[13px] sm:h-[13px]"
                />
              ) : (
                <Icon
                  name="Send"
                  size={15}
                  variant="BoldDuotone"
                  className="sm:w-[13px] sm:h-[13px]"
                />
              )}
            </button>

            {/* Sovereign Close Trigger (Mini-Chat Only) */}
          </div>
        </div>

        {/* Focus Glow Effect */}
        <div
          className="absolute inset-0 rounded-md opacity-0 focus-within:opacity-100 transition-opacity pointer-events-none -z-10"
          style={{
            boxShadow: `0 0 0 1px ${safeColor}26, 0 0 16px ${safeColor}14`,
          }}
        />
      </div>
    </div>
  );
};

export default ChatWidgetInput;
