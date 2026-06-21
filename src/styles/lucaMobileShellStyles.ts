import type { CSSProperties } from "react";

export const LUCA_MOBILE_BACKGROUND_BASE =
  "var(--luca-background-base, var(--app-bg-main))";
export const LUCA_MOBILE_BACKGROUND_ELEVATED =
  "var(--luca-background-elevated, var(--app-bg-tint))";
export const LUCA_MOBILE_SURFACE_SOLID =
  "var(--luca-surface-solid, var(--luca-background-elevated, var(--app-bg-tint)))";
export const LUCA_MOBILE_SURFACE_GLASS =
  "var(--luca-surface-glass, var(--luca-surface-solid, var(--app-bg-tint)))";
export const LUCA_MOBILE_SURFACE_HOVER =
  "var(--luca-surface-hover, var(--luca-background-elevated, var(--app-bg-tint)))";
export const LUCA_MOBILE_BORDER_SUBTLE =
  "var(--luca-border-subtle, var(--app-border-main))";
export const LUCA_MOBILE_BORDER_STRONG =
  "var(--luca-border-strong, var(--app-border-main))";
export const LUCA_MOBILE_TEXT_PRIMARY =
  "var(--luca-text-primary, var(--app-text-main))";
export const LUCA_MOBILE_TEXT_SECONDARY =
  "var(--luca-text-secondary, var(--app-text-muted))";
export const LUCA_MOBILE_TEXT_TERTIARY =
  "var(--luca-text-tertiary, var(--app-text-muted))";
export const LUCA_MOBILE_ACCENT_PRIMARY = "var(--luca-accent-primary)";
export const LUCA_MOBILE_ACCENT_SOFT = "var(--luca-accent-soft)";
export const LUCA_MOBILE_SHADOW_SOFT = "var(--luca-shadow-soft)";

export const lucaMobileAppBackgroundStyle: CSSProperties = {
  background: LUCA_MOBILE_BACKGROUND_BASE,
  color: LUCA_MOBILE_TEXT_PRIMARY,
};

export const lucaMobileContentSurfaceStyle: CSSProperties = {
  background: LUCA_MOBILE_BACKGROUND_ELEVATED,
  color: LUCA_MOBILE_TEXT_PRIMARY,
};

export const lucaMobileElevatedSurfaceStyle: CSSProperties = {
  background: LUCA_MOBILE_BACKGROUND_ELEVATED,
  borderColor: LUCA_MOBILE_BORDER_SUBTLE,
  color: LUCA_MOBILE_TEXT_PRIMARY,
};

export const lucaMobileCardSurfaceStyle: CSSProperties = {
  background: LUCA_MOBILE_SURFACE_SOLID,
  borderColor: LUCA_MOBILE_BORDER_SUBTLE,
  color: LUCA_MOBILE_TEXT_PRIMARY,
  boxShadow: LUCA_MOBILE_SHADOW_SOFT,
};

export const lucaMobileGlassControlStyle: CSSProperties = {
  background: LUCA_MOBILE_SURFACE_GLASS,
  borderColor: LUCA_MOBILE_BORDER_SUBTLE,
  color: LUCA_MOBILE_TEXT_SECONDARY,
};

export const lucaMobileNavSurfaceStyle: CSSProperties = {
  background: LUCA_MOBILE_SURFACE_SOLID,
  borderColor: LUCA_MOBILE_BORDER_SUBTLE,
  color: LUCA_MOBILE_TEXT_SECONDARY,
  boxShadow: LUCA_MOBILE_SHADOW_SOFT,
};

export const lucaMobileNavInactiveStyle: CSSProperties = {
  color: LUCA_MOBILE_TEXT_TERTIARY,
};

export const lucaMobileNavActiveStyle: CSSProperties = {
  background: LUCA_MOBILE_SURFACE_HOVER,
  color: LUCA_MOBILE_TEXT_PRIMARY,
};

export const lucaMobilePanelSurfaceStyle: CSSProperties = {
  background: LUCA_MOBILE_SURFACE_SOLID,
  borderColor: LUCA_MOBILE_BORDER_SUBTLE,
  color: LUCA_MOBILE_TEXT_PRIMARY,
  boxShadow: LUCA_MOBILE_SHADOW_SOFT,
};

export const lucaMobileSheetSurfaceStyle: CSSProperties = {
  ...lucaMobilePanelSurfaceStyle,
};

export const lucaMobileDividerStyle: CSSProperties = {
  borderColor: LUCA_MOBILE_BORDER_SUBTLE,
};

export const lucaMobileStrongDividerStyle: CSSProperties = {
  borderColor: LUCA_MOBILE_BORDER_STRONG,
};

export const lucaMobileMutedTextStyle: CSSProperties = {
  color: LUCA_MOBILE_TEXT_SECONDARY,
};

export const lucaMobileActiveTabStyle: CSSProperties = {
  background: LUCA_MOBILE_SURFACE_HOVER,
  borderColor: LUCA_MOBILE_ACCENT_SOFT,
  color: LUCA_MOBILE_TEXT_PRIMARY,
};

export const lucaMobileInactiveTabStyle: CSSProperties = {
  borderColor: "transparent",
  color: LUCA_MOBILE_TEXT_SECONDARY,
};

export const lucaMobileActiveIndicatorStyle: CSSProperties = {
  background: LUCA_MOBILE_ACCENT_PRIMARY,
  borderColor: LUCA_MOBILE_ACCENT_SOFT,
};

export const lucaMobileClassNames = {
  app: "luca-mobile-shell-app",
  content: "luca-mobile-shell-content",
  panel: "luca-mobile-shell-panel",
  card: "luca-mobile-shell-card",
  nav: "luca-mobile-shell-nav",
  navItem: "luca-mobile-shell-nav-item",
  navItemActive: "luca-mobile-shell-nav-item luca-mobile-shell-nav-item-active",
  tab: "luca-mobile-shell-tab",
  tabActive: "luca-mobile-shell-tab luca-mobile-shell-tab-active",
  control: "luca-mobile-shell-control",
  indicator: "luca-mobile-shell-active-indicator",
} as const;
