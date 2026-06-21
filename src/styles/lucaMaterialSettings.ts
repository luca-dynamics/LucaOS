import type { LucaPlatformBackgroundSignals } from "./lucaPlatformBackgroundPolicy";

/**
 * Luca Material Host Policy
 * -------------------------
 * Governs component-level material surface behaviour across the four host
 * contexts LucaOS runs in. This is intentionally separate from the root
 * background policy in `lucaPlatformBackgroundPolicy.ts`:
 *
 * - **Root/liquid background** is host-dependent. Only `desktop-app` can expose
 *   the user's native desktop behind the window (native-window-material).
 *   `desktop-web` simulates glass internally. Mobile hosts keep a stable system
 *   surface. These rules live in `lucaPlatformBackgroundPolicy.ts`.
 *
 * - **Luca Material component glass** (panels, sheets, sidebars, overlays,
 *   dialogs, popovers) is cross-host with safe fallbacks. All four hosts
 *   allow component-level glass/tint/blur; blur budget and solid-fallback
 *   preference differ by context. Those rules live here.
 *
 * Settings ↔ Material wiring
 * --------------------------
 * `getLucaMaterialCssVariables` translates `LucaAppearanceTokens` values into
 * `--luca-material-*` CSS variables, which are written to `:root` alongside the
 * existing `--luca-*` / `--app-*` tokens. Material roles in
 * `lucaMaterialSystem.ts` read through these slots so panel surfaces respond
 * automatically to Settings Appearance changes.
 *
 * Double-apply guard: `backgroundOpacity` is already baked into the alpha of
 * the resolved `--luca-surface-glass` token by `lucaAppearanceTokens.ts`.
 * Therefore `--luca-material-tint-strength` is explicitly set to `"1"` (an
 * identity color-mix) to prevent double-application. `--luca-material-opacity`
 * carries the raw user value for future dedicated tint sliders.
 *
 * Blur capping: `--luca-material-blur` is capped per host policy so mobile /
 * web contexts avoid heavy GPU cost. The root blur (e.g. liquid background) is
 * not affected — only component surface backdrop-filter is capped.
 */

/** The four host deployment contexts LucaOS runs in. */
export type LucaMaterialHostKind =
  | "desktop-app"
  | "mobile-app"
  | "desktop-web"
  | "mobile-web";

/**
 * Component-level material policy for the current host.
 *
 * `allowLiquidBackground` is listed for documentation symmetry with the root
 * background policy. Component surfaces never render their own liquid
 * background — that distinction belongs to the root layer.
 */
export interface LucaMaterialHostPolicy {
  hostKind: LucaMaterialHostKind;
  /** Liquid background is a root-layer concern; component surfaces do not render it. */
  allowLiquidBackground: boolean;
  /** Whether component surfaces (panels, sheets, etc.) may use glass/tint/blur. */
  allowComponentGlass: boolean;
  /** Blur budget applied to material backdrop-filter: full, reduced, or disabled. */
  materialBlurMode: "full" | "reduced" | "disabled";
  /** Whether to prefer opaque/solid tinted surfaces over translucent glass. */
  preferSolidFallback: boolean;
}

/**
 * Static policy table.
 *
 * | Host        | Liquid BG | Component glass | Blur mode | Solid fallback |
 * | ----------- | --------- | --------------- | --------- | -------------- |
 * | desktop-app | yes       | yes             | full      | no             |
 * | mobile-app  | no        | yes             | reduced   | yes            |
 * | desktop-web | no        | yes             | reduced   | yes            |
 * | mobile-web  | no        | yes             | reduced   | yes            |
 *
 * desktop-app: native window may expose OS glass; rich blur is fine.
 * mobile-app: stable system surface for root; material panels still use glass,
 *   but blur is capped to avoid GPU pressure on mobile hardware.
 * desktop-web: browser cannot show the user's desktop; glass is internal page
 *   material over solid Luca tokens; blur is capped for browser safety.
 * mobile-web: most conservative; no liquid bg, reduced blur, solid fallback.
 */
const HOST_POLICIES: Record<LucaMaterialHostKind, LucaMaterialHostPolicy> = {
  "desktop-app": {
    hostKind: "desktop-app",
    allowLiquidBackground: true,
    allowComponentGlass: true,
    materialBlurMode: "full",
    preferSolidFallback: false,
  },
  "mobile-app": {
    hostKind: "mobile-app",
    allowLiquidBackground: false,
    allowComponentGlass: true,
    materialBlurMode: "reduced",
    preferSolidFallback: true,
  },
  "desktop-web": {
    hostKind: "desktop-web",
    allowLiquidBackground: false,
    allowComponentGlass: true,
    materialBlurMode: "reduced",
    preferSolidFallback: true,
  },
  "mobile-web": {
    hostKind: "mobile-web",
    allowLiquidBackground: false,
    allowComponentGlass: true,
    materialBlurMode: "reduced",
    preferSolidFallback: true,
  },
};

/** Max backdrop-blur (px) permitted per blur mode. */
const BLUR_CAPS: Record<LucaMaterialHostPolicy["materialBlurMode"], number> = {
  full: 120,
  reduced: 20,
  disabled: 0,
};

/** Derives the material host kind from the same signals used by `resolveLucaPlatformBackgroundPolicy`. */
export function resolveLucaMaterialHostKind(
  signals: LucaPlatformBackgroundSignals,
): LucaMaterialHostKind {
  if (signals.isDesktopNative) return "desktop-app";
  if (signals.isNativeMobile) return "mobile-app";
  if (signals.isMobileViewport) return "mobile-web";
  return "desktop-web";
}

/** Returns the full material host policy for the current runtime. */
export function resolveLucaMaterialHostPolicy(
  signals: LucaPlatformBackgroundSignals,
): LucaMaterialHostPolicy {
  return HOST_POLICIES[resolveLucaMaterialHostKind(signals)];
}

/**
 * Narrow input interface for the material settings resolver.
 * Defined here (not imported from `lucaAppearanceTokens.ts`) to avoid a
 * circular module dependency.
 */
export interface LucaMaterialSettingsInput {
  backgroundOpacity: number;
  backgroundBlur: number;
  reducedTransparency: boolean;
  highContrast: boolean;
}

/**
 * Translates appearance settings into `--luca-material-*` CSS variables.
 *
 * When `hostPolicy` is omitted (e.g. in server-side or test contexts) the
 * full blur value is used — the most permissive safe default.
 *
 * Variables returned:
 *   `--luca-material-opacity`         raw user opacity (0..1); for future tint sliders
 *   `--luca-material-tint-strength`   always "1" — opacity is already in the glass token
 *   `--luca-material-blur`            blur in px, capped by host policy
 *   `--luca-material-border-strength` always "1" — high contrast is handled upstream
 *   `--luca-material-saturation`      always "1" (identity)
 */
export function getLucaMaterialCssVariables(
  input: LucaMaterialSettingsInput,
  hostPolicy?: LucaMaterialHostPolicy,
): Record<string, string> {
  const { backgroundOpacity, backgroundBlur, reducedTransparency } = input;

  const blurMode = hostPolicy?.materialBlurMode ?? "full";
  const blurCap = BLUR_CAPS[blurMode];
  // reducedTransparency disables blur entirely for accessibility.
  const blurPx = reducedTransparency ? 0 : Math.min(backgroundBlur, blurCap);

  return {
    "--luca-material-opacity": String(backgroundOpacity),
    // Locked to "1": opacity is baked into --luca-surface-glass by lucaAppearanceTokens.ts;
    // setting this lower would double-apply the user's opacity choice.
    "--luca-material-tint-strength": "1",
    "--luca-material-blur": `${blurPx}px`,
    // highContrast already strengthens the --luca-border-subtle token upstream.
    "--luca-material-border-strength": "1",
    // Identity — dedicated saturation control is a future follow-up.
    "--luca-material-saturation": "1",
  };
}
