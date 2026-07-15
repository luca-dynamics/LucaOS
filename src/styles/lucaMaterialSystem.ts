import type { CSSProperties } from "react";

import {
  LUCA_SHELL_BORDER_STRONG,
  LUCA_SHELL_BORDER_SUBTLE,
  LUCA_SHELL_HOVER_BACKGROUND,
  LUCA_SHELL_SHADOW_GLOW,
  LUCA_SHELL_SHADOW_SOFT,
  LUCA_SHELL_SURFACE_BACKGROUND,
  LUCA_SHELL_TEXT_PRIMARY,
  LUCA_SHELL_TEXT_SECONDARY,
  LUCA_SHELL_TEXT_TERTIARY,
  lucaShellBorderSubtleStyle,
  lucaShellHoverSurfaceStyle,
  lucaShellPrimaryTextStyle,
  lucaShellSecondaryTextStyle,
  lucaShellTertiaryTextStyle,
} from "./lucaShellStyles";
import {
  lucaMobileActiveTabStyle,
  lucaMobileAppBackgroundStyle,
  lucaMobileContentSurfaceStyle,
  lucaMobileDividerStyle,
  lucaMobileGlassControlStyle,
  lucaMobileNavSurfaceStyle,
  lucaMobilePanelSurfaceStyle,
  lucaMobileSheetSurfaceStyle,
} from "./lucaMobileShellStyles";
import { lucaDesktopWebSafeRootBackgroundStyle } from "./lucaPlatformBackgroundPolicy";

/**
 * Luca Material Engine
 * --------------------
 * A centralized, semantic material layer for default/basic LucaOS surfaces
 * (panels, sheets, sidebars, overlays, floating surfaces, popovers, dialogs,
 * HUDs, resizable handles). It composes the existing LucaOS appearance tokens
 * (`--luca-*`, defined in `lucaAppearanceTokens.ts`) into reusable material
 * roles so components stop hand-composing background / blur / border / shadow /
 * hover / text styling.
 *
 * Design intent: premium host-native personal AI OS — clean, calm, glassy,
 * AppleOS-like. No cyberpunk / terminal / neon defaults; no hardcoded colors.
 *
 * Platform policy still flows through `lucaPlatformBackgroundPolicy.ts` and the
 * mobile helpers in `lucaMobileShellStyles.ts`; this module reuses them rather
 * than replacing them.
 *
 * --- User-controlled liquid material (Part 5) ---
 * Every material role reads through a `--luca-material-*` override "slot" that
 * falls back to the already-resolved Luca appearance token. When a slot is
 * unset (today's default) the resolved value is identical to the legacy shell
 * styling, so this engine is visually a no-op until a slider opts in.
 *
 * Future user sliders only need to set these slots on `:root` (no component
 * edits required):
 *   --luca-material-opacity         surface opacity (feeds tint strength)
 *   --luca-material-blur            backdrop blur radius
 *   --luca-material-tint-strength   surface tint coverage (0..1)
 *   --luca-material-border-strength border coverage (0..1)
 *   --luca-material-shadow-strength reserved: elevation strength
 *   --luca-material-saturation      backdrop saturation multiplier
 *
 * `reduce transparency` and `high contrast` already flow through
 * `lucaAppearanceTokens.ts` (which thickens the glass alpha and strengthens
 * borders), so the resolved tokens this engine consumes are already adjusted.
 */

/** Material override-slot variable names, exported for docs / future wiring. */
export const LUCA_MATERIAL_VARIABLE_SLOTS = [
  "--luca-material-opacity",
  "--luca-material-blur",
  "--luca-material-tint-strength",
  "--luca-material-border-strength",
  "--luca-material-shadow-strength",
  "--luca-material-saturation",
] as const;

const MATERIAL_TINT_STRENGTH =
  "var(--luca-material-tint-strength, var(--luca-material-opacity, 1))";
const MATERIAL_BORDER_STRENGTH = "var(--luca-material-border-strength, 1)";

/**
 * Surface tint resolves to the glass token at full strength by default.
 * `color-mix(... 100%, transparent)` is identical to the source color, so the
 * default render matches the legacy shell surface exactly; a future opacity /
 * tint slider lowers the percentage to thin the material.
 */

const MATERIAL_FLAT_CARD_TINT_STRENGTH =
  "calc(var(--luca-material-tint-strength, var(--luca-material-opacity, 1)) * 45%)";
const MATERIAL_METRIC_TINT_STRENGTH =
  "calc(var(--luca-material-tint-strength, var(--luca-material-opacity, 1)) * 34%)";
const MATERIAL_WEB_CARD_TINT_STRENGTH =
  "calc(var(--luca-material-tint-strength, var(--luca-material-opacity, 1)) * 52%)";
const MATERIAL_RAIL_TINT_STRENGTH =
  "calc(var(--luca-material-tint-strength, var(--luca-material-opacity, 1)) * 72%)";
const MATERIAL_CONTROL_TINT_STRENGTH =
  "calc(var(--luca-material-tint-strength, var(--luca-material-opacity, 1)) * 30%)";
const MATERIAL_TAB_ACTIVE_TINT_STRENGTH =
  "calc(var(--luca-material-tint-strength, var(--luca-material-opacity, 1)) * 38%)";

export const LUCA_MATERIAL_FLAT_CARD_SURFACE = `var(--luca-material-card-surface, color-mix(in srgb, var(--luca-surface-glass, ${LUCA_SHELL_SURFACE_BACKGROUND}) ${MATERIAL_FLAT_CARD_TINT_STRENGTH}, transparent))`;
export const LUCA_MATERIAL_METRIC_SURFACE = `var(--luca-material-metric-surface, color-mix(in srgb, var(--luca-surface-glass, ${LUCA_SHELL_SURFACE_BACKGROUND}) ${MATERIAL_METRIC_TINT_STRENGTH}, transparent))`;
export const LUCA_MATERIAL_WEB_CARD_SURFACE = `var(--luca-material-web-card-surface, color-mix(in srgb, var(--luca-surface-glass, ${LUCA_SHELL_SURFACE_BACKGROUND}) ${MATERIAL_WEB_CARD_TINT_STRENGTH}, var(--luca-surface-solid, transparent)))`;
export const LUCA_MATERIAL_RAIL_SURFACE = `var(--luca-material-rail-surface, color-mix(in srgb, var(--luca-surface-glass, ${LUCA_SHELL_SURFACE_BACKGROUND}) ${MATERIAL_RAIL_TINT_STRENGTH}, transparent))`;
export const LUCA_MATERIAL_CONTROL_SURFACE = `var(--luca-material-control-surface, color-mix(in srgb, var(--luca-surface-glass, ${LUCA_SHELL_SURFACE_BACKGROUND}) ${MATERIAL_CONTROL_TINT_STRENGTH}, transparent))`;
export const LUCA_MATERIAL_TAB_ACTIVE_SURFACE = `var(--luca-material-tab-active-surface, color-mix(in srgb, ${LUCA_SHELL_HOVER_BACKGROUND} ${MATERIAL_TAB_ACTIVE_TINT_STRENGTH}, transparent))`;

export const LUCA_MATERIAL_SURFACE = `var(--luca-material-surface, color-mix(in srgb, ${LUCA_SHELL_SURFACE_BACKGROUND} calc(${MATERIAL_TINT_STRENGTH} * 100%), transparent))`;
export const LUCA_MATERIAL_SURFACE_SOLID = `var(--luca-material-surface-solid, var(--luca-surface-solid, ${LUCA_SHELL_SURFACE_BACKGROUND}))`;
export const LUCA_MATERIAL_SURFACE_HOVER = `var(--luca-material-surface-hover, ${LUCA_SHELL_HOVER_BACKGROUND})`;
export const LUCA_MATERIAL_BORDER = `var(--luca-material-border, color-mix(in srgb, ${LUCA_SHELL_BORDER_SUBTLE} calc(${MATERIAL_BORDER_STRENGTH} * 100%), transparent))`;
export const LUCA_MATERIAL_BORDER_STRONG = `var(--luca-material-border-strong, ${LUCA_SHELL_BORDER_STRONG})`;
export const LUCA_MATERIAL_SHADOW = `var(--luca-material-shadow, ${LUCA_SHELL_SHADOW_SOFT})`;
export const LUCA_MATERIAL_SHADOW_GLOW = `var(--luca-material-shadow-glow, ${LUCA_SHELL_SHADOW_GLOW})`;
export const LUCA_MATERIAL_TEXT_PRIMARY = LUCA_SHELL_TEXT_PRIMARY;
export const LUCA_MATERIAL_TEXT_SECONDARY = LUCA_SHELL_TEXT_SECONDARY;
export const LUCA_MATERIAL_TEXT_TERTIARY = LUCA_SHELL_TEXT_TERTIARY;
export const LUCA_MATERIAL_BLUR =
  "var(--luca-material-blur, var(--luca-blur-level, var(--app-bg-blur, 40px)))";
export const LUCA_MATERIAL_SATURATION = "var(--luca-material-saturation, 1)";

/**
 * Thin optical texture layers. These are deliberately gradients rather than
 * blur: the substrate remains owned by each material role and the texture adds
 * only a restrained highlight, accent refraction, and edge depth.
 */
export const LUCA_MATERIAL_TEXTURE_QUIET = [
  "radial-gradient(90% 58% at 20% -8%, color-mix(in srgb, var(--luca-material-glass-highlight, rgb(255 255 255 / 0.09)) 64%, transparent), transparent 62%)",
  "linear-gradient(132deg, color-mix(in srgb, var(--luca-accent-primary, #8a8f98) 5%, transparent), transparent 46% 72%, var(--luca-material-glass-sheen, rgb(255 255 255 / 0.035)))",
].join(", ");

export const LUCA_MATERIAL_TEXTURE_STANDARD = [
  "radial-gradient(82% 54% at 18% -6%, color-mix(in srgb, var(--luca-material-glass-highlight, rgb(255 255 255 / 0.14)) 86%, transparent), transparent 60%)",
  "linear-gradient(132deg, color-mix(in srgb, var(--luca-accent-primary, #8a8f98) 8%, transparent), transparent 44% 70%, var(--luca-material-glass-sheen, rgb(255 255 255 / 0.055)))",
].join(", ");

function withMaterialTexture(texture: string, substrate: string): string {
  return `${texture}, ${substrate}`;
}

/** Self-contained glass backdrop (blur + identity-safe saturation). */
const MATERIAL_GLASS_BACKDROP = `blur(${LUCA_MATERIAL_BLUR}) saturate(${LUCA_MATERIAL_SATURATION})`;

const glassBackdrop: CSSProperties = {
  backdropFilter: MATERIAL_GLASS_BACKDROP,
  WebkitBackdropFilter: MATERIAL_GLASS_BACKDROP,
};

/** Root application material — base background + primary text. */
export const lucaMaterialRootStyle: CSSProperties = {
  background:
    "var(--luca-material-root, var(--luca-background-base, var(--app-bg-main)))",
  color: LUCA_MATERIAL_TEXT_PRIMARY,
};

/** Default glassy panel surface (calm, AppleOS-like). */
export const lucaMaterialPanelStyle: CSSProperties = {
  background: withMaterialTexture(LUCA_MATERIAL_TEXTURE_QUIET, LUCA_MATERIAL_SURFACE),
  borderColor: LUCA_MATERIAL_BORDER,
  color: LUCA_MATERIAL_TEXT_PRIMARY,
  boxShadow: LUCA_MATERIAL_SHADOW,
  ...glassBackdrop,
};

/** Detached panel material. It owns its backdrop capture; nested cards do not. */
export const lucaMaterialFloatingPanelStyle: CSSProperties = {
  background: withMaterialTexture(LUCA_MATERIAL_TEXTURE_STANDARD, LUCA_MATERIAL_SURFACE),
  borderColor: LUCA_MATERIAL_BORDER,
  color: LUCA_MATERIAL_TEXT_PRIMARY,
  boxShadow: LUCA_MATERIAL_SHADOW,
  ...glassBackdrop,
};

/** Flat card / section surface — low-alpha, no elevation, no forced panel blur. */
export const lucaMaterialCardStyle: CSSProperties = {
  background: withMaterialTexture(
    LUCA_MATERIAL_TEXTURE_QUIET,
    LUCA_MATERIAL_FLAT_CARD_SURFACE,
  ),
  borderColor: LUCA_MATERIAL_BORDER,
  color: LUCA_MATERIAL_TEXT_PRIMARY,
  boxShadow: "var(--luca-material-card-shadow, none)",
};

/** Solid nested card — texture without adding another blur/elevation layer. */
export const lucaMaterialSolidCardStyle: CSSProperties = {
  background: withMaterialTexture(
    LUCA_MATERIAL_TEXTURE_QUIET,
    LUCA_MATERIAL_SURFACE_SOLID,
  ),
  borderColor: LUCA_MATERIAL_BORDER,
  color: LUCA_MATERIAL_TEXT_PRIMARY,
  boxShadow: "var(--luca-material-card-shadow, none)",
};

/** Compact metric/chip surface — lighter than cards and never elevated. */
export const lucaMaterialMetricStyle: CSSProperties = {
  background: LUCA_MATERIAL_METRIC_SURFACE,
  borderColor: LUCA_MATERIAL_BORDER,
  color: LUCA_MATERIAL_TEXT_PRIMARY,
  boxShadow: "none",
};

/** Browser-safe card surface — flat tint with no native/liquid assumptions. */
export const lucaMaterialWebCardStyle: CSSProperties = {
  background: withMaterialTexture(
    LUCA_MATERIAL_TEXTURE_QUIET,
    LUCA_MATERIAL_WEB_CARD_SURFACE,
  ),
  borderColor: LUCA_MATERIAL_BORDER,
  color: LUCA_MATERIAL_TEXT_PRIMARY,
  boxShadow:
    "var(--luca-material-web-card-shadow, 0 18px 50px color-mix(in srgb, black 14%, transparent))",
};

/** Dashboard rail surface — below panel weight, tokenized border, no extra blur. */
export const lucaMaterialRailStyle: CSSProperties = {
  background: withMaterialTexture(LUCA_MATERIAL_TEXTURE_QUIET, LUCA_MATERIAL_RAIL_SURFACE),
  borderColor: LUCA_MATERIAL_BORDER,
  color: LUCA_MATERIAL_TEXT_SECONDARY,
  boxShadow: "var(--luca-material-rail-shadow, none)",
};

/** Neutral control button / small interaction surface — lighter than cards. */
export const lucaMaterialControlStyle: CSSProperties = {
  background: withMaterialTexture(
    LUCA_MATERIAL_TEXTURE_STANDARD,
    LUCA_MATERIAL_CONTROL_SURFACE,
  ),
  borderColor: LUCA_MATERIAL_BORDER,
  color: LUCA_MATERIAL_TEXT_SECONDARY,
};

/** Active neutral control state — keeps interaction hierarchy below cards. */
export const lucaMaterialControlActiveStyle: CSSProperties = {
  background: withMaterialTexture(
    LUCA_MATERIAL_TEXTURE_STANDARD,
    LUCA_MATERIAL_SURFACE_HOVER,
  ),
  borderColor: LUCA_MATERIAL_BORDER_STRONG,
  color: LUCA_MATERIAL_TEXT_PRIMARY,
};

/** Inactive/default tab state for basic dashboard tab strips. */
export const lucaMaterialTabStyle: CSSProperties = {
  color: LUCA_MATERIAL_TEXT_SECONDARY,
  borderColor: "transparent",
};

/** Active default tab state with a tokenized light fill and strong divider. */
export const lucaMaterialTabActiveStyle: CSSProperties = {
  background: LUCA_MATERIAL_TAB_ACTIVE_SURFACE,
  borderColor: LUCA_MATERIAL_BORDER_STRONG,
  color: LUCA_MATERIAL_TEXT_PRIMARY,
};

/** Semantic neutral divider helper for borders and separator lines. */
export const lucaMaterialDividerStyle: CSSProperties = {
  borderColor: LUCA_MATERIAL_BORDER,
};

/** Default workspace surface — exact shell workspace mapping. */
export const lucaMaterialWorkspaceStyle: CSSProperties = {
  background: "var(--luca-background-elevated, transparent)",
  color: LUCA_MATERIAL_TEXT_PRIMARY,
};

/** Sidebar / rail surface (matches the default desktop panel material). */
export const lucaMaterialSidebarStyle: CSSProperties = {
  ...lucaMaterialPanelStyle,
};

/** Bottom/side sheet surface (desktop). */
export const lucaMaterialSheetStyle: CSSProperties = {
  ...lucaMaterialPanelStyle,
};

/** Popover surface — solid-leaning elevated material. */
export const lucaMaterialPopoverStyle: CSSProperties = {
  background: withMaterialTexture(
    LUCA_MATERIAL_TEXTURE_STANDARD,
    LUCA_MATERIAL_SURFACE_SOLID,
  ),
  borderColor: LUCA_MATERIAL_BORDER,
  color: LUCA_MATERIAL_TEXT_PRIMARY,
  boxShadow: LUCA_MATERIAL_SHADOW,
  ...glassBackdrop,
};

/** Dialog / modal surface — solid material with stronger framing. */
export const lucaMaterialDialogStyle: CSSProperties = {
  background: withMaterialTexture(LUCA_MATERIAL_TEXTURE_QUIET, LUCA_MATERIAL_SURFACE_SOLID),
  borderColor: LUCA_MATERIAL_BORDER_STRONG,
  color: LUCA_MATERIAL_TEXT_PRIMARY,
  boxShadow: LUCA_MATERIAL_SHADOW,
  ...glassBackdrop,
};

/**
 * Full-bleed overlay chrome (e.g. reboot / transition scrims). Background +
 * primary text only, matching the existing default overlay surface.
 */
export const lucaMaterialOverlayStyle: CSSProperties = {
  background: LUCA_MATERIAL_SURFACE,
  color: LUCA_MATERIAL_TEXT_PRIMARY,
};

/** Floating HUD surface — glassy with a soft accent glow. */
export const lucaMaterialHudStyle: CSSProperties = {
  background: withMaterialTexture(LUCA_MATERIAL_TEXTURE_STANDARD, LUCA_MATERIAL_SURFACE),
  borderColor: LUCA_MATERIAL_BORDER,
  color: LUCA_MATERIAL_TEXT_PRIMARY,
  boxShadow: LUCA_MATERIAL_SHADOW_GLOW,
  ...glassBackdrop,
};

/** Resizable handle accent — subtle material border. */
export const lucaMaterialResizableHandleStyle: CSSProperties = {
  borderColor: LUCA_MATERIAL_BORDER,
};

/** Mobile stable panel material (reuses the mobile shell helper). */
export const lucaMaterialMobilePanelStyle: CSSProperties = {
  ...lucaMobilePanelSurfaceStyle,
};

/** Mobile stable sheet material (reuses the mobile shell helper). */
export const lucaMaterialMobileSheetStyle: CSSProperties = {
  ...lucaMobileSheetSurfaceStyle,
};

/** Mobile app base background material (reuses the mobile shell helper). */
export const lucaMaterialMobileRootStyle: CSSProperties = {
  ...lucaMobileAppBackgroundStyle,
};

/**
 * Mobile chrome roles intentionally compose mobile shell helpers instead of
 * desktop rail/control/tab roles. They keep the lighter mobile visual weight and
 * inherit the mobile host-policy/reduced-blur assumptions already encoded in
 * lucaMobileShellStyles.
 */
export const lucaMaterialMobileNavStyle: CSSProperties = {
  ...lucaMobileNavSurfaceStyle,
};

/** Mobile neutral control chrome — a 1:1 material alias for glass controls. */
export const lucaMaterialMobileControlStyle: CSSProperties = {
  ...lucaMobileGlassControlStyle,
};

/** Mobile active control chrome — preserves the active-tab helper weight. */
export const lucaMaterialMobileControlActiveStyle: CSSProperties = {
  ...lucaMobileActiveTabStyle,
};

/** Mobile inactive/default tab chrome. */
export const lucaMaterialMobileTabStyle: CSSProperties = {
  borderColor: "transparent",
  color: LUCA_MATERIAL_TEXT_SECONDARY,
};

/** Mobile active tab chrome — direct mobile helper mapping. */
export const lucaMaterialMobileTabActiveStyle: CSSProperties = {
  ...lucaMobileActiveTabStyle,
};

/** Mobile divider chrome — direct mobile helper mapping. */
export const lucaMaterialMobileDividerStyle: CSSProperties = {
  ...lucaMobileDividerStyle,
};

/** Mobile content chrome — direct mobile content helper mapping. */
export const lucaMaterialMobileContentStyle: CSSProperties = {
  ...lucaMobileContentSurfaceStyle,
};

/** Mobile panel/sheet chrome — direct mobile panel helper mapping. */
export const lucaMaterialMobilePanelChromeStyle: CSSProperties = {
  ...lucaMobilePanelSurfaceStyle,
};

/** Browser-safe root fallback (reuses the platform background policy helper). */
export const lucaMaterialWebFallbackStyle: CSSProperties = {
  ...lucaDesktopWebSafeRootBackgroundStyle,
};

/* --- Semantic text / inset helpers (single material import surface) --- */
export const lucaMaterialPrimaryTextStyle: CSSProperties =
  lucaShellPrimaryTextStyle;
export const lucaMaterialSecondaryTextStyle: CSSProperties =
  lucaShellSecondaryTextStyle;
export const lucaMaterialTertiaryTextStyle: CSSProperties =
  lucaShellTertiaryTextStyle;
export const lucaMaterialBorderSubtleStyle: CSSProperties =
  lucaShellBorderSubtleStyle;
export const lucaMaterialHoverSurfaceStyle: CSSProperties =
  lucaShellHoverSurfaceStyle;

/* --- Platform-aware resolvers --- */

/** Picks the panel material for the current platform. */
export const resolveLucaPanelMaterial = (isMobile: boolean): CSSProperties =>
  isMobile ? lucaMaterialMobilePanelStyle : lucaMaterialPanelStyle;

/** Picks the sidebar material for the current platform. */
export const resolveLucaSidebarMaterial = (isMobile: boolean): CSSProperties =>
  isMobile ? lucaMaterialMobilePanelStyle : lucaMaterialSidebarStyle;

/** Picks the sheet material for the current platform. */
export const resolveLucaSheetMaterial = (isMobile: boolean): CSSProperties =>
  isMobile ? lucaMaterialMobileSheetStyle : lucaMaterialSheetStyle;

/** Picks the rail material for the current platform. */
export const resolveLucaRailMaterial = (isMobile: boolean): CSSProperties =>
  isMobile ? lucaMaterialMobilePanelStyle : lucaMaterialRailStyle;

/** Picks safe mobile chrome roles without falling through to desktop chrome. */
export const resolveLucaMobileChromeMaterial = (
  role:
    | "nav"
    | "control"
    | "controlActive"
    | "tab"
    | "tabActive"
    | "divider"
    | "content"
    | "panelChrome",
): CSSProperties => {
  switch (role) {
    case "nav":
      return lucaMaterialMobileNavStyle;
    case "control":
      return lucaMaterialMobileControlStyle;
    case "controlActive":
      return lucaMaterialMobileControlActiveStyle;
    case "tab":
      return lucaMaterialMobileTabStyle;
    case "tabActive":
      return lucaMaterialMobileTabActiveStyle;
    case "divider":
      return lucaMaterialMobileDividerStyle;
    case "content":
      return lucaMaterialMobileContentStyle;
    case "panelChrome":
      return lucaMaterialMobilePanelChromeStyle;
  }
};

/** Material role registry — useful for discoverability and documentation. */
export const lucaMaterialRoles = {
  root: lucaMaterialRootStyle,
  panel: lucaMaterialPanelStyle,
  floatingPanel: lucaMaterialFloatingPanelStyle,
  card: lucaMaterialCardStyle,
  metric: lucaMaterialMetricStyle,
  webCard: lucaMaterialWebCardStyle,
  rail: lucaMaterialRailStyle,
  control: lucaMaterialControlStyle,
  controlActive: lucaMaterialControlActiveStyle,
  tab: lucaMaterialTabStyle,
  tabActive: lucaMaterialTabActiveStyle,
  divider: lucaMaterialDividerStyle,
  workspace: lucaMaterialWorkspaceStyle,
  sidebar: lucaMaterialSidebarStyle,
  sheet: lucaMaterialSheetStyle,
  popover: lucaMaterialPopoverStyle,
  dialog: lucaMaterialDialogStyle,
  overlay: lucaMaterialOverlayStyle,
  hud: lucaMaterialHudStyle,
  resizableHandle: lucaMaterialResizableHandleStyle,
  mobilePanel: lucaMaterialMobilePanelStyle,
  mobileSheet: lucaMaterialMobileSheetStyle,
  mobileNav: lucaMaterialMobileNavStyle,
  mobileControl: lucaMaterialMobileControlStyle,
  mobileControlActive: lucaMaterialMobileControlActiveStyle,
  mobileTab: lucaMaterialMobileTabStyle,
  mobileTabActive: lucaMaterialMobileTabActiveStyle,
  mobileDivider: lucaMaterialMobileDividerStyle,
  mobileContent: lucaMaterialMobileContentStyle,
  mobilePanelChrome: lucaMaterialMobilePanelChromeStyle,
  webFallback: lucaMaterialWebFallbackStyle,
} as const;

export type LucaMaterialRole = keyof typeof lucaMaterialRoles;
