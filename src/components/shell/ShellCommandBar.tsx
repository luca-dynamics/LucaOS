import React, { useEffect, useState } from "react";
import LucaComposer, { type LucaComposerProps } from "../chat/LucaComposer";
import { LucaPresence } from "../presence/LucaPresence";

/**
 * ShellCommandBar — the workspace command bar.
 *
 * The composer's second home (see LucaComposer). Embedded in the chat column,
 * the input belongs to a conversation; mounted here, it belongs to LucaOS.
 * That distinction is the point: this bar floats at SHELL level over the panel
 * grid, deliberately ignoring the column boundary beneath it, with the
 * presence orb docked at its left edge — the entity you're addressing,
 * anchored to the workspace rather than drawn inside a message bubble.
 *
 * Two consequences of that placement, encoded here:
 * - Scope: the bar spans what you're WORKING ON (chat + any future canvas)
 *   and stops before the observational panels. The host container defines
 *   that span; this component fills it.
 * - Responsiveness: a floating element that straddles columns has nowhere to
 *   go when the window narrows — the same failure class as the boot
 *   checklist's collision bug. Below the compact breakpoint the bar renders
 *   as a normal in-flow block and the orb steps aside.
 *
 * Presentational and controlled throughout: all conversational state arrives
 * via LucaComposerProps from the shell, exactly as it does for the embedded
 * home. `editingScope` is the future document-canvas voice ("Editing
 * enabled") — a statement about the input's reach, which is why it belongs to
 * this bar and not to the model-status line.
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
  /** Skin/presence resolution for the docked orb (inherited from the shell). */
  skinId?: string;
  reducedMotion?: boolean;
  /** When the document canvas grants edit scope, its name appears here. */
  editingScope?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

export const ShellCommandBar: React.FC<ShellCommandBarProps> = ({
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
      data-luca-command-bar-layout={compact ? "docked" : "floating"}
      className={className}
      style={{
        // Floating: absolutely positioned by the shell's center region;
        // compact: an ordinary block at the bottom of the chat column.
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
        gap: 12,
        pointerEvents: "none",
        ...style,
      }}
    >
      {/* The being, addressed — not decorated. Hidden when compact: at narrow
          widths the field needs every pixel more than the orb needs a seat. */}
      {!compact && (
        <div style={{ flex: "none", pointerEvents: "auto", marginBottom: 2 }}>
          <LucaPresence
            state="identity"
            size={44}
            label="Luca"
            breathing
            skinId={skinId}
            reducedMotion={reducedMotion}
          />
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0, pointerEvents: "auto" }}>
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
              color: "var(--luca-accent-primary, var(--app-accent, #3d8fa6))",
              background: "var(--luca-surface-hover, rgba(61, 143, 166, 0.1))",
              border: "1px solid var(--luca-border-subtle, rgba(61, 143, 166, 0.25))",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: "currentColor",
              }}
            />
            Editing enabled — {editingScope}
          </div>
        )}
        <LucaComposer {...composerProps} />
      </div>
    </div>
  );
};

export default ShellCommandBar;
