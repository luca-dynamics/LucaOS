/**
 * Codex-clean Settings skin.
 * -------------------------
 * A scoped map of CSS-variable overrides for the Settings shell, following the
 * same convention as the skin boundaries (lucaDashboardSkinBoundary.ts et al.):
 * a pure variable map spread onto a boundary element's `style` — never a
 * document/`:root` mutation and never a `[data-luca-skin]` CSS layer.
 *
 * SettingsModal already spreads `getLucaSkinMaterialVariables(...)` into its
 * overlay root; these override slots are merged in *after* it, so they win, and
 * every Settings surface picks them up through the material roles in
 * lucaMaterialSystem.ts — no component edits required.
 *
 * The "codex-clean" delta over the default glassy material:
 *  - Matte, not glass: the sheen highlight and backdrop blur are removed so
 *    surfaces read flat. (`--luca-material-glass-highlight/-sheen` feed only the
 *    optical texture gradients, so blanking them is safe; the accent's faint
 *    ~6% refraction is left intact — the accent var is load-bearing.)
 *  - Crisp, theme-aware hairlines: borders become a low-alpha mix of the
 *    current ink. Derived from `--luca-text-primary`, they flip correctly with
 *    the app's light/dark identity (`data-luca-appearance-mode`) and each skin.
 *  - Zero elevation: no card / control / rail shadow anywhere in Settings.
 *  - Flat opaque cards on the active skin's solid surface; insets and the
 *    active tab use a faint ink wash instead of a translucent glass tint.
 *
 * Text scale and accent are inherited from the active Luca skin, so this stays
 * identity-correct in both themes. To pin the literal codex blue, override
 * `--luca-accent-primary` in the appearance-mode scope instead.
 */

/** Low-alpha mix of the current ink — a hairline/wash that follows the theme. */
const inkAlpha = (pct: number): string =>
  `color-mix(in srgb, var(--luca-text-primary, var(--app-text-main)) ${pct}%, transparent)`;

/** The active skin's solid, theme-aware surface (opaque, no glass tint). */
const SOLID_SURFACE =
  "var(--luca-surface-solid, var(--luca-background-elevated, var(--app-bg-tint)))";

export const settingsCodexSkinVariables: Record<string, string> = {
  // --- matte: strip the glass sheen highlight and backdrop blur ---
  "--luca-material-glass-highlight": "transparent",
  "--luca-material-glass-sheen": "transparent",
  "--luca-material-blur": "0px",

  // --- zero elevation on content surfaces (the modal frame itself keeps its
  //     float shadow via --luca-material-shadow, which is left untouched) ---
  "--luca-material-card-shadow": "none",
  "--luca-material-control-shadow": "none",
  "--luca-material-rail-shadow": "none",

  // --- flat, opaque surfaces (inherit the active skin's solid) ---
  "--luca-material-card-surface": SOLID_SURFACE,
  "--luca-material-surface-solid": SOLID_SURFACE,
  "--luca-material-metric-surface": inkAlpha(4),
  "--luca-material-control-surface": inkAlpha(4),
  "--luca-material-tab-active-surface": inkAlpha(6),

  // --- crisp, theme-aware hairlines ---
  "--luca-material-border": inkAlpha(11),
  "--luca-material-border-strong": inkAlpha(18),
};
