import React, { useEffect, useRef, useState } from "react";
import LucaComposer, { type LucaComposerProps } from "../chat/LucaComposer";
import { useRoutedSend } from "../chat/useRoutedSend";
import { LucaPresence } from "../presence/LucaPresence";
import { WorkspaceModelPicker, WorkspaceModeSelector } from "./WorkspaceCommandControls";
import {
  WORKSPACE_DURATION_MS,
  WORKSPACE_EASE,
  workspaceColor,
  workspaceType,
} from "./workspaceShellTokens";

/**
 * ShellCommandBar — the workspace command bar.
 *
 * The composer's second home (see LucaComposer). Embedded in the chat column,
 * the input belongs to a conversation; mounted here, it belongs to LucaOS —
 * you are addressing the workspace, not a thread. Two variants:
 *
 * - "classic": wraps the full LucaComposer (every legacy control). The
 *   default, so the current desktop shell keeps camera / screen share / MCP
 *   chips exactly as they are today.
 * - "workspace": the target design's bar. Two quiet rows in one glass card —
 *   the field with the editing chip, then attach · voice · model · mode ·
 *   send — with the presence orb hugging the bar's left corner and a "Luca is
 *   thinking" line beneath.
 *
 * The model and mode controls are the SAME real components the rest of the app
 * uses — ChatModelSwitcher (the actual intelligence-model picker, cloud +
 * local + advanced, writing settings.brain.model) and IntentRoutingModeSelector
 * (the full Auto · Fast · Plan · Agent selector). The bar carries the real
 * details, not stand-ins: picking a model here picks it everywhere, and every
 * routing mode is reachable — no detour through Settings.
 */

const COMPACT_QUERY = "(max-width: 900px)";

const useCompactViewport = (): boolean => {
  const [compact, setCompact] = useState<boolean>(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(COMPACT_QUERY).matches
      : false,
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(COMPACT_QUERY);
    const onChange = (event: MediaQueryListEvent) => setCompact(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return compact;
};

export interface ShellCommandBarProps extends LucaComposerProps {
  variant?: "classic" | "workspace";
  /** Skin/presence resolution for the docked orb (inherited from the shell). */
  skinId?: string;
  reducedMotion?: boolean;
  /** When the document canvas grants edit scope, its name appears here. */
  editingScope?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

export const ShellCommandBar: React.FC<ShellCommandBarProps> = ({
  variant = "classic",
  skinId,
  reducedMotion,
  editingScope = null,
  className,
  style,
  ...composerProps
}) => {
  const compact = useCompactViewport();

  return (
    <div
      data-luca-shell-command-bar
      data-luca-command-bar-variant={variant}
      data-luca-command-bar-layout={compact ? "docked" : "floating"}
      className={className}
      style={{
        ...(compact
          ? { position: "relative", width: "100%", padding: "0 12px 12px" }
          : {
              position: "absolute",
              left: "clamp(16px, 4%, 56px)",
              right: "clamp(16px, 4%, 56px)",
              bottom: 18,
              zIndex: 40,
            }),
        display: "flex",
        alignItems: "flex-end",
        gap: variant === "workspace" ? 0 : 12,
        pointerEvents: "none",
        ...style,
      }}
    >
      {/* The being, addressed — not decorated. Hidden when compact: at narrow
          widths the field needs every pixel more than the orb needs a seat. */}
      {!compact && (
        <div
          style={{
            flex: "none",
            pointerEvents: "auto",
            // Workspace: the orb hugs the bar's corner, overlapping it the way
            // the target design draws it — resting against the glass, not
            // floating beside it.
            ...(variant === "workspace"
              ? { marginRight: -16, marginBottom: 4, zIndex: 2 }
              : { marginBottom: 2 }),
          }}
        >
          <LucaPresence
            state="identity"
            size={variant === "workspace" ? 54 : 44}
            label="Luca"
            breathing
            skinId={skinId}
            reducedMotion={reducedMotion}
          />
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0, pointerEvents: "auto" }}>
        {variant === "workspace" ? (
          <WorkspaceBar
            {...composerProps}
            compact={compact}
            editingScope={editingScope}
          />
        ) : (
          <>
            {editingScope && (
              <div
                data-luca-command-bar-editing
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 6,
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  color: workspaceColor.accent,
                  background: workspaceColor.accentSoft,
                  border: `1px solid ${workspaceColor.accentLine}`,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ width: 6, height: 6, borderRadius: 999, background: "currentColor" }}
                />
                Editing enabled — {editingScope}
              </div>
            )}
            <LucaComposer {...composerProps} />
          </>
        )}
      </div>
    </div>
  );
};

/* ── The workspace anatomy: exactly the target design, nothing else ───────── */

const WorkspaceBar: React.FC<
  LucaComposerProps & {
    compact: boolean;
    editingScope: string | null;
  }
> = ({
  input,
  setInput,
  handleSend,
  isProcessing,
  messages,
  setMessages,
  attachedImage,
  setAttachedImage,
  fileInputRef,
  handleFileSelect,
  isVoiceMode,
  toggleVoiceMode,
  handleStop,
  showCamera,
  setShowCamera,
  handleScreenShare,
  handleClearChat,
  editingScope,
}) => {
  const routedSend = useRoutedSend({ input, isProcessing, handleSend, messages, setMessages });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow, capped — mirrors the embedded composer so the two homes feel
  // like one instrument.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, 160);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > 160 ? "auto" : "hidden";
  }, [input]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isProcessing) routedSend();
    }
  };

  return (
    <div>
      <div
        className="luca-command-glow"
        style={{
          borderRadius: 16,
          border: `1px solid ${workspaceColor.hairline}`,
          background:
            "color-mix(in srgb, var(--luca-surface-glass, var(--luca-background-elevated, #161d27)) 84%, transparent)",
          // The lift shadow + the breathing accent outline both live in the
          // luca-command-glow keyframes (an inline box-shadow would outrank the
          // animation and freeze it), so the box owns only its non-animated
          // surface here.
          backdropFilter: "blur(18px) saturate(1.2)",
          WebkitBackdropFilter: "blur(18px) saturate(1.2)",
          padding: "11px 13px 9px",
          // Room for the orb resting against the left corner.
          paddingLeft: 28,
          transition: `border-color ${WORKSPACE_DURATION_MS}ms ${WORKSPACE_EASE}`,
        }}
      >
        {/* Row 1 — the field, and what the bar is allowed to touch. */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask Luca anything…"
            aria-label="Ask Luca anything"
            style={{
              flex: 1,
              minWidth: 0,
              resize: "none",
              border: 0,
              outline: "none",
              background: "transparent",
              color: workspaceColor.ink,
              font: "inherit",
              fontSize: workspaceType.body,
              lineHeight: 1.5,
              padding: "2px 0",
            }}
          />
          {attachedImage && (
            <span
              data-luca-command-bar-attachment
              style={{
                flex: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 9px",
                borderRadius: 999,
                fontSize: workspaceType.meta,
                color: workspaceColor.ink2,
                background: workspaceColor.hover,
                border: `1px solid ${workspaceColor.hairline}`,
              }}
            >
              Image attached
              <button
                type="button"
                aria-label="Remove attachment"
                onClick={() => setAttachedImage(null)}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "inherit",
                  cursor: "pointer",
                  padding: 0,
                  font: "inherit",
                }}
              >
                ×
              </button>
            </span>
          )}
          {editingScope && (
            <span
              data-luca-command-bar-editing
              style={{
                flex: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 9px",
                borderRadius: 999,
                fontSize: workspaceType.meta,
                fontWeight: 600,
                color: workspaceColor.accent,
                background: workspaceColor.accentSoft,
                border: `1px solid ${workspaceColor.accentLine}`,
              }}
            >
              <CheckGlyph /> Editing enabled
            </span>
          )}
        </div>

        {/* Row 2 — attach · voice · screen · share · clear · model · mode · send. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleFileSelect}
          />
          <BarIconButton
            label="Attach a file"
            onClick={() => fileInputRef.current?.click()}
          >
            <path d="M20.5 11.5l-8 8a5 5 0 01-7-7l8-8a3.5 3.5 0 015 5l-8 8a2 2 0 01-3-3l7.5-7.5" />
          </BarIconButton>
          <BarIconButton
            label={isVoiceMode ? "Stop voice" : "Talk to Luca"}
            active={isVoiceMode}
            onClick={toggleVoiceMode}
          >
            <path d="M12 3a3 3 0 00-3 3v5a3 3 0 006 0V6a3 3 0 00-3-3z" />
            <path d="M18.5 11a6.5 6.5 0 01-13 0" />
            <path d="M12 17.5V21" />
          </BarIconButton>
          {/* Show Luca my screen (vision) — toggles the camera/eye. */}
          <BarIconButton
            label={showCamera ? "Stop showing screen" : "Show Luca my screen"}
            active={showCamera}
            onClick={() => setShowCamera(!showCamera)}
          >
            <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </BarIconButton>
          {/* Share screen. */}
          {handleScreenShare && (
            <BarIconButton label="Share screen" onClick={handleScreenShare}>
              <rect x="3" y="4" width="18" height="13" rx="2" />
              <path d="M8 21h8M12 17.5V21" />
            </BarIconButton>
          )}
          {/* Clear the conversation. */}
          {handleClearChat && (
            <BarIconButton label="Clear conversation" onClick={handleClearChat}>
              <path d="M4 7h16M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7M6.5 7l.9 12a1.5 1.5 0 001.5 1.4h6.2a1.5 1.5 0 001.5-1.4l.9-12" />
            </BarIconButton>
          )}

          {/* The real intelligence-model picker — cloud, local, and advanced
              models, writing settings.brain.model. Picking here picks
              everywhere; no detour through Settings. Workspace-native styling. */}
          <WorkspaceModelPicker />

          {/* The full Auto · Fast · Plan · Agent selector, workspace-native, on
              the same service the rest of the app writes — every mode reachable,
              never in disagreement. */}
          <span style={{ marginLeft: "auto", display: "inline-flex" }}>
            <WorkspaceModeSelector />
          </span>

          <button
            type="button"
            aria-label={isProcessing ? "Stop responding" : "Send"}
            onClick={isProcessing ? handleStop : routedSend}
            className="luca-workspace-toggle"
            style={{
              width: 31,
              height: 31,
              flex: "none",
              display: "grid",
              placeItems: "center",
              border: 0,
              borderRadius: 999,
              background: workspaceColor.accent,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {isProcessing ? (
                <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
              ) : (
                <path
                  d="M4.5 12h14M12.5 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {isProcessing && (
        <div
          data-luca-command-bar-thinking
          style={{
            marginTop: 7,
            paddingLeft: 18,
            fontSize: workspaceType.meta,
            color: workspaceColor.ink3,
          }}
        >
          Luca is thinking
        </div>
      )}
    </div>
  );
};

const BarIconButton: React.FC<{
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ label, active = false, onClick, children }) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={active || undefined}
    title={label}
    onClick={onClick}
    className="luca-workspace-toggle"
    style={{
      width: 30,
      height: 30,
      flex: "none",
      display: "grid",
      placeItems: "center",
      border: 0,
      borderRadius: 8,
      background: active ? workspaceColor.accentSoft : "transparent",
      color: active ? workspaceColor.accent : workspaceColor.ink3,
      cursor: "pointer",
    }}
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  </button>
);

const CheckGlyph: React.FC = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12.5l4.3 4.3L19 7.4" />
  </svg>
);

export default ShellCommandBar;
