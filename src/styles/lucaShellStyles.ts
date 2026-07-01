import type { CSSProperties } from "react";

export const LUCA_SHELL_SURFACE_BACKGROUND =
  "var(--luca-surface-glass, var(--app-bg-tint))";
export const LUCA_SHELL_HOVER_BACKGROUND =
  "var(--luca-surface-hover, var(--app-bg-tint))";
export const LUCA_SHELL_BORDER_SUBTLE =
  "var(--luca-border-subtle, var(--app-border-main))";
export const LUCA_SHELL_BORDER_STRONG =
  "var(--luca-border-strong, var(--app-border-main))";
export const LUCA_SHELL_TEXT_PRIMARY =
  "var(--luca-text-primary, var(--app-text-main))";
export const LUCA_SHELL_TEXT_SECONDARY =
  "var(--luca-text-secondary, var(--app-text-muted))";
export const LUCA_SHELL_TEXT_TERTIARY =
  "var(--luca-text-tertiary, var(--app-text-muted))";
export const LUCA_SHELL_ACCENT_PRIMARY = "var(--luca-accent-primary)";
export const LUCA_SHELL_ACCENT_SOFT = "var(--luca-accent-soft)";
export const LUCA_SHELL_SHADOW_SOFT = "var(--luca-shadow-soft)";
export const LUCA_SHELL_SHADOW_GLOW = "var(--luca-shadow-glow)";
// Prefer the skin-supplied material blur (set by the dashboard skin boundary and
// the appearance blur control) so skins like Canvas can read matte and Flow can
// stay capped. Legacy fallbacks are preserved for non-skin themes.
export const LUCA_SHELL_BLUR =
  "var(--luca-material-blur, var(--luca-blur-level, var(--app-bg-blur, 40px)))";

export const lucaShellBorderSubtleStyle: CSSProperties = {
  borderColor: LUCA_SHELL_BORDER_SUBTLE,
};

export const lucaShellBorderStrongStyle: CSSProperties = {
  borderColor: LUCA_SHELL_BORDER_STRONG,
};

export const lucaShellHoverSurfaceStyle: CSSProperties = {
  background: LUCA_SHELL_HOVER_BACKGROUND,
};

export const lucaShellSoftShadowStyle: CSSProperties = {
  boxShadow: LUCA_SHELL_SHADOW_SOFT,
};

export const lucaShellGlowShadowStyle: CSSProperties = {
  boxShadow: LUCA_SHELL_SHADOW_GLOW,
};

// Side panels are flush columns divided by crisp 1px hairlines (the border-r /
// border-l applied at the layout level), not floating cards — so no drop shadow
// here. Shadows on adjacent flush columns muddy the seam and read "generic".
// A restrained material blur is kept so glass skins still read as frosted.
export const lucaShellPanelSurfaceStyle: CSSProperties = {
  background: LUCA_SHELL_SURFACE_BACKGROUND,
  borderColor: LUCA_SHELL_BORDER_SUBTLE,
  color: LUCA_SHELL_TEXT_PRIMARY,
  backdropFilter: `blur(${LUCA_SHELL_BLUR})`,
  WebkitBackdropFilter: `blur(${LUCA_SHELL_BLUR})`,
};

export const lucaShellRailSurfaceStyle: CSSProperties = {
  ...lucaShellPanelSurfaceStyle,
  color: LUCA_SHELL_TEXT_SECONDARY,
};

// Dashboard workspace canvas. Composes the skin's elevated and base background
// into a gentle, static vertical depth so each skin reads intentionally (Flow's
// soft gradient depth behind the work, Carbon's graphite depth, Pearl's soft
// pearl, Canvas's warm matte) using only boundary-supplied variables. No motion.
export const lucaShellWorkspaceSurfaceStyle: CSSProperties = {
  background:
    "linear-gradient(180deg, var(--luca-background-elevated, transparent) 0%, var(--luca-background-base, var(--luca-background-elevated, transparent)) 100%)",
  color: LUCA_SHELL_TEXT_PRIMARY,
};

export const lucaShellDividerStyle: CSSProperties = {
  borderColor: LUCA_SHELL_BORDER_SUBTLE,
};

export const lucaShellStrongDividerStyle: CSSProperties = {
  borderColor: LUCA_SHELL_BORDER_STRONG,
};

export const lucaShellMutedTextStyle: CSSProperties = {
  color: LUCA_SHELL_TEXT_SECONDARY,
};

export const lucaShellPrimaryTextStyle: CSSProperties = {
  color: LUCA_SHELL_TEXT_PRIMARY,
};

export const lucaShellSecondaryTextStyle: CSSProperties = {
  color: LUCA_SHELL_TEXT_SECONDARY,
};

export const lucaShellTertiaryTextStyle: CSSProperties = {
  color: LUCA_SHELL_TEXT_TERTIARY,
};

export const lucaShellAccentTextStyle: CSSProperties = {
  color: LUCA_SHELL_ACCENT_PRIMARY,
};

export const lucaShellTabStyle: CSSProperties = {
  color: LUCA_SHELL_TEXT_SECONDARY,
  borderColor: "transparent",
};

export const lucaShellActiveTabStyle: CSSProperties = {
  background: LUCA_SHELL_HOVER_BACKGROUND,
  borderColor: LUCA_SHELL_BORDER_STRONG,
  color: LUCA_SHELL_TEXT_PRIMARY,
};

export const lucaShellActiveIndicatorStyle: CSSProperties = {
  background: LUCA_SHELL_ACCENT_PRIMARY,
  borderColor: LUCA_SHELL_ACCENT_SOFT,
  boxShadow: "var(--luca-shadow-glow)",
};

export const lucaShellActiveLabelStyle: CSSProperties = {
  color: LUCA_SHELL_ACCENT_PRIMARY,
};

export const lucaShellControlStyle: CSSProperties = {
  background: LUCA_SHELL_SURFACE_BACKGROUND,
  borderColor: LUCA_SHELL_BORDER_SUBTLE,
  color: LUCA_SHELL_TEXT_SECONDARY,
};

export const lucaShellActiveControlStyle: CSSProperties = {
  background: LUCA_SHELL_HOVER_BACKGROUND,
  borderColor: LUCA_SHELL_BORDER_STRONG,
  color: LUCA_SHELL_TEXT_PRIMARY,
};

export const lucaShellClassNames = {
  panel: "luca-shell-panel",
  rail: "luca-shell-rail",
  workspace: "luca-shell-workspace",
  control: "luca-shell-control",
  tab: "luca-shell-tab",
  activeTab: "luca-shell-tab luca-shell-tab-active",
  activeIndicator: "luca-shell-active-indicator",
  activeLabel: "luca-shell-active-label",
} as const;
