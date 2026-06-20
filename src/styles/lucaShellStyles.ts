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
export const LUCA_SHELL_BLUR =
  "var(--luca-blur-level, var(--app-bg-blur, 40px))";

export const lucaShellPanelSurfaceStyle: CSSProperties = {
  background: LUCA_SHELL_SURFACE_BACKGROUND,
  borderColor: LUCA_SHELL_BORDER_SUBTLE,
  color: LUCA_SHELL_TEXT_PRIMARY,
  boxShadow: LUCA_SHELL_SHADOW_SOFT,
  backdropFilter: `blur(${LUCA_SHELL_BLUR})`,
  WebkitBackdropFilter: `blur(${LUCA_SHELL_BLUR})`,
};

export const lucaShellRailSurfaceStyle: CSSProperties = {
  ...lucaShellPanelSurfaceStyle,
  color: LUCA_SHELL_TEXT_SECONDARY,
};

export const lucaShellWorkspaceSurfaceStyle: CSSProperties = {
  background: "var(--luca-background-elevated, transparent)",
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
