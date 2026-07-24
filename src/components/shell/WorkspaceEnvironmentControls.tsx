import React, { useEffect, useRef, useState } from "react";
import { useCredits } from "../../hooks/useCredits";
import { awarenessService } from "../../services/awarenessService";
import AlwaysOnControls from "../AlwaysOnControls";
import RuntimeContinuityBootstrap from "../runtime/RuntimeContinuityBootstrap";
import { workspaceColor, workspaceRadius, workspaceType } from "./workspaceShellTokens";

/**
 * WorkspaceEnvironmentControls — the environment cluster, rebuilt in the shell's
 * own language.
 *
 * Same job as the legacy Header cluster (working state, credits, and the
 * voice/vision/monitoring quick-controls), but wearing workspace tokens instead
 * of the material pills — the new command bar dropped those, and the top bar
 * follows suit. The visible row stays calm and native: a working tick, the
 * credit balance, and one quick-controls button; the heavier functional
 * controls (which own real API/service logic) live behind the popover, exactly
 * as the old header kept them, so nothing loses behaviour in the restyle.
 *
 * RuntimeContinuityBootstrap rode inside the old Header; it moves here so the
 * runtime keeps bootstrapping when the workspace shell owns the top bar.
 */

export interface WorkspaceEnvironmentControlsProps {
  theme: any;
  persona: string;
  isProcessing: boolean;
  isAdminMode: boolean;
  showVoiceHud: boolean;
  setShowVoiceHud?: (show: boolean) => void;
  ambientVisionActive: boolean;
  setAmbientVisionActive: (active: boolean) => void;
  setAmbientSuggestions: (suggestions: any[]) => void;
  setShowSuggestionChips: (show: boolean) => void;
  setAudioMonitoringActive: (active: boolean) => void;
  setVisionMonitoringActive: (active: boolean) => void;
  isWakeWordActive: boolean;
}

const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "4px 10px",
  borderRadius: 999,
  border: `1px solid ${workspaceColor.hairline}`,
  background: "transparent",
  font: "inherit",
  fontSize: workspaceType.meta,
  color: workspaceColor.ink2,
};

export const WorkspaceEnvironmentControls: React.FC<
  WorkspaceEnvironmentControlsProps
> = ({
  theme,
  persona,
  isProcessing,
  isAdminMode,
  showVoiceHud,
  setShowVoiceHud,
  ambientVisionActive,
  setAmbientVisionActive,
  setAmbientSuggestions,
  setShowSuggestionChips,
  setAudioMonitoringActive,
  setVisionMonitoringActive,
  isWakeWordActive,
}) => {
  const credits = useCredits();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const creditColor =
    credits.status === "CRITICAL"
      ? "var(--luca-danger, #d5504a)"
      : credits.status === "LOW"
        ? workspaceColor.warn
        : workspaceColor.good;

  const planLabel = credits.isLocal ? "Local" : credits.isBYOK ? "BYOK" : "Prime";

  // The ambient-vision loop, lifted verbatim from the legacy Header so the
  // toggle keeps its exact behaviour (scan → describe → suggest), just driven
  // from a native row instead of a glass pill.
  const toggleAmbientVision = () => {
    if (ambientVisionActive) {
      awarenessService.stopAmbientVisionLoop();
      setAmbientVisionActive(false);
      return;
    }
    awarenessService.startAmbientVisionLoop({
      mode: showVoiceHud ? "voice" : "text",
      persona,
      onScreenCapture: async (base64: string) => {
        const { liveService } = await import("../../services/liveService");
        liveService.sendVideoFrame(base64);
        liveService.sendText(
          "[AMBIENT VISION] I just scanned the screen. Describe what you see briefly and suggest if there is anything you can help with. Keep it to 1-2 sentences.",
        );
      },
      onSuggestionsUpdate: (suggestions: any[]) => {
        setAmbientSuggestions(suggestions);
        setShowSuggestionChips(true);
      },
      onStatusChange: (active: boolean) => setAmbientVisionActive(active),
    });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <RuntimeContinuityBootstrap />

      {isProcessing && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: workspaceType.meta,
            color: workspaceColor.ink3,
          }}
          title="Luca is working"
        >
          <span
            aria-hidden="true"
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: workspaceColor.accent,
            }}
          />
          Working
        </span>
      )}

      {isAdminMode && (
        <span
          style={{
            ...pillStyle,
            color: "var(--luca-danger, #d5504a)",
            borderColor: "color-mix(in srgb, var(--luca-danger, #d5504a) 32%, transparent)",
          }}
          title="Admin mode active"
        >
          Admin
        </span>
      )}

      <span style={pillStyle} title="Credits">
        <WalletGlyph color={creditColor} />
        <span
          style={{
            color: workspaceColor.ink,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {!isFinite(credits.balance)
            ? "∞"
            : Math.floor(credits.balance).toLocaleString()}
        </span>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            padding: "1px 6px",
            borderRadius: 6,
            color: creditColor,
            background: `color-mix(in srgb, ${creditColor} 14%, transparent)`,
          }}
        >
          {planLabel}
        </span>
      </span>

      <div ref={rootRef} style={{ position: "relative", display: "inline-flex" }}>
        <button
          type="button"
          aria-label="Quick controls"
          aria-haspopup="menu"
          aria-expanded={open}
          title="Quick controls"
          onClick={() => setOpen((v) => !v)}
          className="luca-workspace-toggle"
          style={{
            width: 28,
            height: 28,
            display: "grid",
            placeItems: "center",
            border: 0,
            borderRadius: 999,
            background: "transparent",
            color: open ? workspaceColor.accent : workspaceColor.ink3,
            cursor: "pointer",
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="19" cy="12" r="1.6" />
          </svg>
        </button>

        {open && (
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              width: 246,
              padding: 6,
              borderRadius: 12,
              border: `1px solid ${workspaceColor.hairline}`,
              background:
                "color-mix(in srgb, var(--luca-surface-glass, var(--luca-background-elevated, #161d27)) 92%, transparent)",
              backdropFilter: "blur(18px) saturate(1.2)",
              WebkitBackdropFilter: "blur(18px) saturate(1.2)",
              boxShadow: "0 18px 48px rgba(0, 0, 0, 0.4)",
              zIndex: 60,
            }}
          >
            <MenuLabel>Quick controls</MenuLabel>

            {setShowVoiceHud && (
              <ToggleRow
                label="Voice"
                on={showVoiceHud}
                onClick={() => {
                  setShowVoiceHud(!showVoiceHud);
                  setOpen(false);
                }}
              />
            )}

            <ToggleRow
              label="Ambient vision"
              on={ambientVisionActive}
              onClick={() => {
                toggleAmbientVision();
                setOpen(false);
              }}
            />

            <MenuLabel>Monitoring</MenuLabel>
            <div style={{ padding: "2px 6px 4px" }}>
              <AlwaysOnControls
                onVisionToggle={(active) => setVisionMonitoringActive(active)}
                onAudioToggle={(active) => setAudioMonitoringActive(active)}
                isMobile={false}
                isWakeWordActive={isWakeWordActive}
                theme={theme}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MenuLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      padding: "8px 8px 4px",
      fontSize: "9.5px",
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: workspaceColor.ink3,
    }}
  >
    {children}
  </div>
);

const ToggleRow: React.FC<{ label: string; on: boolean; onClick: () => void }> = ({
  label,
  on,
  onClick,
}) => (
  <button
    type="button"
    role="menuitemcheckbox"
    aria-checked={on}
    onClick={onClick}
    className="luca-workspace-toggle"
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      width: "100%",
      padding: "7px 8px",
      border: 0,
      borderRadius: workspaceRadius.row,
      background: "transparent",
      font: "inherit",
      fontSize: workspaceType.meta,
      color: on ? workspaceColor.ink : workspaceColor.ink2,
      textAlign: "left",
      cursor: "pointer",
    }}
  >
    <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
    <span
      aria-hidden="true"
      style={{
        fontSize: "10.5px",
        fontWeight: 600,
        color: on ? workspaceColor.accent : workspaceColor.ink3,
      }}
    >
      {on ? "On" : "Off"}
    </span>
  </button>
);

const WalletGlyph: React.FC<{ color: string }> = ({ color }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 7.5A2.5 2.5 0 015.5 5H18a2 2 0 012 2v1H5.5A2.5 2.5 0 013 5.5" />
    <path d="M3 6v11a2 2 0 002 2h14a1 1 0 001-1v-9a1 1 0 00-1-1" />
    <circle cx="17" cy="13" r="1.2" fill={color} stroke="none" />
  </svg>
);

export default WorkspaceEnvironmentControls;
