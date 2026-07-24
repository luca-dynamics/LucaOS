import type { CSSProperties } from "react";
import {
  LUCA_MATERIAL_BORDER,
  LUCA_MATERIAL_SURFACE_HOVER,
  LUCA_MATERIAL_TEXT_PRIMARY,
  LUCA_MATERIAL_TEXT_SECONDARY,
  LUCA_MATERIAL_TEXT_TERTIARY,
} from "../../styles/lucaMaterialSystem";

/**
 * workspaceShellTokens — the calm rules, as values.
 *
 * Every colour here resolves through the skin's own material variables, so the
 * shell wears Luca Light and Luca Dark without a second definition; nothing
 * below hard-codes a hex.
 *
 * The type scale is deliberately SHORT. The boot checklist taught this the hard
 * way: it carried four sizes inside a 2px band (12.5 / 11 / 10.5 / 10.5), which
 * is too close to read as hierarchy and too varied to read as one voice, so it
 * registered as noise. Four steps, wide enough apart to be intentional, and
 * hierarchy carried by colour and weight instead of by another size.
 */

export const workspaceType = {
  /** Uppercase section markers: SPACES, TIMELINE, MEMORY. */
  label: "10.5px",
  /** Timestamps, captions, values, secondary rows. */
  meta: "11.5px",
  /** Nav rows, message text, card bodies — the default voice. */
  body: "13px",
  /** Panel headers. Same size as body; separated by weight, not scale. */
  head: "13.5px",
} as const;

export const workspaceRadius = {
  panel: 12,
  card: 9,
  row: 7,
  pill: 999,
} as const;

/** One motion curve for the whole shell, so panels and chrome move alike. */
export const WORKSPACE_EASE = "cubic-bezier(0.22, 0.88, 0.24, 1)";
export const WORKSPACE_DURATION_MS = 260;

export const workspaceColor = {
  ink: LUCA_MATERIAL_TEXT_PRIMARY,
  ink2: LUCA_MATERIAL_TEXT_SECONDARY,
  ink3: LUCA_MATERIAL_TEXT_TERTIARY,
  hairline: LUCA_MATERIAL_BORDER,
  hover: LUCA_MATERIAL_SURFACE_HOVER,
  accent: "var(--luca-accent-primary, #4a9eff)",
  accentSoft:
    "color-mix(in srgb, var(--luca-accent-primary, #4a9eff) 13%, transparent)",
  accentLine:
    "color-mix(in srgb, var(--luca-accent-primary, #4a9eff) 34%, transparent)",
  /** Semantic, and deliberately separate from the accent. */
  good: "var(--luca-success, #4bb07a)",
  warn: "var(--luca-warning, #d9a441)",
} as const;

/** A panel column: its own header, hairline seam, independent scroll. */
export const workspacePanelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  overflow: "hidden",
  background: "var(--luca-surface-panel, var(--luca-background-elevated, transparent))",
};

export const workspacePanelHeaderStyle: CSSProperties = {
  flex: "none",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "13px 15px",
  borderBottom: `1px solid ${workspaceColor.hairline}`,
  fontSize: workspaceType.head,
  fontWeight: 600,
  color: workspaceColor.ink,
};

export const workspaceSectionLabelStyle: CSSProperties = {
  padding: "15px 15px 6px",
  fontSize: workspaceType.label,
  fontWeight: 600,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  color: workspaceColor.ink3,
};

export const workspaceCardStyle: CSSProperties = {
  margin: "11px 12px",
  padding: 12,
  borderRadius: workspaceRadius.card,
  border: `1px solid ${workspaceColor.hairline}`,
  background: workspaceColor.hover,
};
