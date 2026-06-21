# Luca Material Engine

Date introduced: 2026-06-21

## Purpose

The Luca Material Engine is a centralized, semantic material layer for
default/basic LucaOS surfaces — panels, sheets, sidebars, overlays, floating
surfaces, popovers, dialogs, HUDs, and resizable handles.

Before this engine, components hand-composed panel styling through local inline
styles, Tailwind utility classes, and repeated shell/mobile helpers. PRs #373,
#376, #378, and #380 normalized the underlying **tokens** (backgrounds, text,
borders, hover, shadows). This engine is the next architectural step: it moves
LucaOS from *scattered token usage* to *reusable material roles*, similar in
spirit to how OS-level design systems expose named materials.

Design intent is unchanged: a premium host-native personal AI OS that feels
clean, calm, glassy, and AppleOS-like. The engine introduces **no** new colors
and **no** cyber/terminal/neon defaults — every value resolves from existing
LucaOS appearance tokens.

## Files

- `src/styles/lucaMaterialSystem.ts` — the material engine (roles, resolvers,
  override-slot variables).
- `src/components/ui/luca/` — lightweight, presentational primitive surfaces
  (`LucaPanel`, `LucaFloatingPanel`, `LucaSidebar`, `LucaSheet`, `LucaPopover`,
  `LucaDialog`, `LucaOverlaySurface`, `LucaResizableHandle`, plus the shared
  `LucaSurface` base and a `mergeClassNames` helper).

## Material roles

| Role style | Intended surface |
| --- | --- |
| `lucaMaterialRootStyle` | Application root background + primary text |
| `lucaMaterialPanelStyle` | Default glassy panel |
| `lucaMaterialFloatingPanelStyle` | Detached/floating panel (pairs with `.glass-panel` blur) |
| `lucaMaterialSidebarStyle` | Sidebar / rail |
| `lucaMaterialSheetStyle` | Bottom/side sheet (desktop) |
| `lucaMaterialPopoverStyle` | Popover (solid-leaning elevated) |
| `lucaMaterialDialogStyle` | Dialog / modal (solid, stronger framing) |
| `lucaMaterialOverlayStyle` | Full-bleed overlay chrome / scrims |
| `lucaMaterialHudStyle` | Floating HUD (glassy + soft glow) |
| `lucaMaterialResizableHandleStyle` | Resize handle accent |
| `lucaMaterialMobilePanelStyle` | Mobile stable panel |
| `lucaMaterialMobileSheetStyle` | Mobile stable sheet |
| `lucaMaterialWebFallbackStyle` | Browser-safe root fallback |

Platform-aware resolvers pick the right material for the current device:

- `resolveLucaPanelMaterial(isMobile)`
- `resolveLucaSidebarMaterial(isMobile)`
- `resolveLucaSheetMaterial(isMobile)`

A `lucaMaterialRoles` registry object and `LucaMaterialRole` type are exported
for discoverability. Semantic text/border/hover aliases
(`lucaMaterialPrimaryTextStyle`, `lucaMaterialSecondaryTextStyle`,
`lucaMaterialTertiaryTextStyle`, `lucaMaterialBorderSubtleStyle`,
`lucaMaterialHoverSurfaceStyle`) are re-exported so a component can pull all of
its material styling from a single module.

## Token mapping

Every material role resolves from the existing LucaOS appearance tokens emitted
by `src/config/lucaAppearanceTokens.ts`:

| Material concern | Token(s) consumed |
| --- | --- |
| Base background | `--luca-background-base`, `--luca-background-liquid`, `--luca-background-elevated` |
| Glass surface | `--luca-surface-glass` |
| Solid surface | `--luca-surface-solid` |
| Hover surface | `--luca-surface-hover` |
| Borders | `--luca-border-subtle`, `--luca-border-strong` |
| Text | `--luca-text-primary`, `--luca-text-secondary`, `--luca-text-tertiary` |
| Shadows | `--luca-shadow-soft`, `--luca-shadow-glow` |
| Accent | `--luca-accent-primary`, `--luca-accent-soft` |
| Status | `--luca-danger`, `--luca-warning`, `--luca-success`, `--luca-info` |
| Blur | `--luca-blur-level` (→ `--app-bg-blur`) |

Each token keeps its existing `--app-*` fallback chain (e.g.
`var(--luca-surface-glass, var(--app-bg-tint))`), so the engine is safe even
before all `--luca-*` variables are present.

## Platform behavior

The engine reuses, rather than replaces, the existing platform helpers:

- **Desktop native** — transparent/glass root via
  `lucaPlatformBackgroundPolicy.ts` (`native-window-material`). Panels use the
  glassy material roles; the host window may map opacity/blur to a transparent
  OS window where configured.
- **Desktop web** — browser-safe fallback. `lucaMaterialWebFallbackStyle`
  re-exports the policy's `lucaDesktopWebSafeRootBackgroundStyle`, and panel
  materials render internal webpage glass over solid Luca fallback tokens.
- **Mobile (web + native)** — stable system surfaces. `resolve*Material(true)`
  returns the mobile materials, which reuse `lucaMobileShellStyles.ts`
  (`lucaMobilePanelSurfaceStyle` / `lucaMobileSheetSurfaceStyle`). No liquid
  glass is forced on mobile.
- **Reduced motion / reduced transparency / high contrast** — already handled
  upstream in `lucaAppearanceTokens.ts`, which thickens glass alpha and
  strengthens borders for `reducedTransparency`/`highContrast`. Because the
  material roles consume the *resolved* tokens, those signals flow through
  automatically.

## How opacity / blur / liquid-intensity sliders feed the engine

The engine exposes internal **override-slot** CSS variables. Each slot falls
back to the already-resolved Luca token, so when a slot is unset the rendered
material is identical to the legacy shell styling — a visual no-op.

Slots (see `LUCA_MATERIAL_VARIABLE_SLOTS`):

| Variable | Effect | Default |
| --- | --- | --- |
| `--luca-material-opacity` | Raw user opacity value (0..1); written by settings resolver for future tint sliders | from settings |
| `--luca-material-blur` | Backdrop blur radius; capped by host policy | from settings, capped |
| `--luca-material-tint-strength` | Surface tint coverage (0..1); locked to `1` by settings resolver | `1` |
| `--luca-material-border-strength` | Border coverage (0..1) | `1` |
| `--luca-material-shadow-strength` | Reserved: elevation strength | n/a |
| `--luca-material-saturation` | Backdrop saturation multiplier | `1` |

Wiring detail: surface tint and border use
`color-mix(in srgb, <token> calc(<strength> * 100%), transparent)`. At strength
1 this is byte-equivalent to the source token; lowering the strength thins the
material. Blur and saturation feed `backdrop-filter` (`saturate(1)` is identity).

## Settings Appearance wiring (added in follow-up)

`src/styles/lucaMaterialSettings.ts` — `getLucaMaterialCssVariables` — translates
the existing `general.backgroundOpacity` / `general.backgroundBlur` settings into
`--luca-material-*` CSS variables, which are written to `:root` by
`buildLucaAppearanceCssVariableState` in `lucaAppearanceTokens.ts`.

### How each setting maps

| Setting | Variable written | Notes |
| --- | --- | --- |
| `backgroundOpacity` | `--luca-material-opacity` | Raw value (0..1); for future dedicated tint slider |
| *(opacity already baked into glass token)* | `--luca-material-tint-strength = 1` | Explicit lock prevents double-application |
| `backgroundBlur` | `--luca-material-blur` | Capped by host policy (see table below) |
| `reducedTransparency` | `--luca-material-blur = 0px` | Disables backdrop blur for accessibility |
| `highContrast` | upstream in token | Thickens `--luca-border-subtle`; `--luca-material-border-strength` stays `1` |

**Double-apply guard:** `backgroundOpacity` is baked into `--luca-surface-glass`
alpha by `lucaAppearanceTokens.ts`. Setting `--luca-material-tint-strength`
below 1 would apply the opacity a second time. The resolver therefore locks
tint-strength to `"1"` and stores the raw opacity in `--luca-material-opacity`
for future dedicated sliders.

### Immediate slider feedback

The Settings Appearance sliders in `SettingsGeneralTab.tsx` update two paths:

1. **Persisted path**: `onUpdate("general", "backgroundOpacity", val)` → fires
   `settings-changed` → `buildLucaAppearanceCssVariableState` with host policy →
   `applyLucaAppearanceCssVariables` sets all `--luca-*` and `--luca-material-*`
   variables.
2. **Immediate path**: direct `document.documentElement.style.setProperty` for
   `--app-bg-opacity` / `--luca-material-opacity` / `--luca-material-tint-strength`
   (opacity) and `--app-bg-blur` / `--luca-material-blur` (blur). This keeps panel
   surfaces visually responsive while the persisted path completes.

## Host material policy

`src/styles/lucaMaterialSettings.ts` defines a material host policy alongside but
separate from the root background policy in `lucaPlatformBackgroundPolicy.ts`:

- **Root/liquid background** is host-dependent. Only `desktop-app` can expose the
  user's native desktop; `desktop-web` simulates glass internally; mobile hosts use
  a stable system surface.
- **Luca Material component glass** (panels, sheets, sidebars, overlays) is
  cross-host with safe fallbacks. All four hosts allow component-level glass/tint;
  blur budget and solid-fallback preference differ by context.

### Policy table

| Host | Liquid BG | Component glass | Blur mode | Max blur | Solid fallback |
| --- | --- | --- | --- | --- | --- |
| `desktop-app` | yes | yes | full | 120 px | no |
| `mobile-app` | no | yes | reduced | 20 px | yes |
| `desktop-web` | no | yes | reduced | 20 px | yes |
| `mobile-web` | no | yes | reduced | 20 px | yes |

The policy is derived from `LucaPlatformBackgroundSignals` (the same
`isMobileViewport` / `isNativeMobile` / `isDesktopNative` flags used by
`resolveLucaPlatformBackgroundPolicy`) via `resolveLucaMaterialHostPolicy`.

`App.tsx` passes the resolved host policy into `buildLucaAppearanceCssVariableState`
so the material blur cap is applied automatically on every settings change.

## Components migrated in this PR

| Component | Material consumed |
| --- | --- |
| `src/components/layout/FloatingPanel.tsx` | `lucaMaterialFloatingPanelStyle` (motion/resize/detach preserved) |
| `src/components/layout/OperationsSidebar.tsx` | `resolveLucaSidebarMaterial(isMobile)` (mobile shell helpers preserved) |
| `src/components/layout/OverlayManager.tsx` | `lucaMaterialOverlayStyle` + `LUCA_MATERIAL_BORDER` (reboot overlay) |
| `src/components/layout/PanelResizer.tsx` | `lucaMaterialResizableHandleStyle` (drag/resize unchanged) |
| `src/components/layout/ChatPanel.tsx` | `lucaMaterialPanelStyle` / `resolveLucaSheetMaterial` / `lucaMaterialMobileSheetStyle` (panel & sheet wrappers only) |
| `src/components/ChatWidgetInput.tsx` | `lucaMaterialPanelStyle` (input wrapper only) |
| `src/web/WebReadyState.tsx` | `LucaPanel` primitive + material surface/text |
| `src/web/postBoot/WebPostBootTransition.tsx` | material text/border/hover roles |
| `src/web/postBoot/WebPostBootLoading.tsx` | `LucaPanel` primitive + material text |

All migrations are visually identical by construction: the material roles
compose the exact same resolved tokens the components used before, plus the
no-op override slots.

## Components intentionally left on older helpers

- `lucaShellStyles.ts`, `lucaMobileShellStyles.ts`, and
  `lucaPlatformBackgroundPolicy.ts` remain in place and exported. They are
  reused by the engine and still consumed directly by components that were not
  in this PR's scope.
- Inside the migrated components, non-panel surfaces were left on their existing
  helpers to avoid behavior changes:
  - `ChatPanel` workspace backgrounds (`lucaShellWorkspaceSurfaceStyle`),
    mobile content (`lucaMobileContentSurfaceStyle`), and mobile glass controls
    (`lucaMobileGlassControlStyle`).
  - `OperationsSidebar` mobile divider / muted-text / content helpers.
- `ChatPanel` chat logic, message rendering, model routing, and `OverlayManager`
  approval/voice-HUD/shared-panel runtime were not touched.

## Follow-up migration plan

1. Migrate remaining default/basic panel surfaces (settings panels, right-panel
   operation centers, dashboard cards) to material roles.
2. Promote `ChatPanel` workspace and mobile-control surfaces to dedicated
   material roles once a `lucaMaterialWorkspaceStyle` / control role is defined.
3. ✅ Settings appearance wiring completed (follow-up PR): `backgroundOpacity` /
   `backgroundBlur` now write `--luca-material-*` slots via `lucaMaterialSettings.ts`.
   Follow-ups: expose `reducedTransparency` / `highContrast` toggle controls;
   add liquid-intensity slider using `--luca-material-tint-strength`.
4. Consider extracting `FloatingPanel`'s motion/resize shell into a primitive
   that composes `LucaFloatingPanel` once more floating surfaces exist.
5. Revisit advanced/pro/creator/tactical surfaces only if they leak into
   default/basic shell chrome (they are intentionally excluded today).

## Default/basic surface migration follow-up

Date: 2026-06-21

This pass continues the gradual migration of core shell surfaces onto the Luca
Material Engine. It deliberately targets surfaces already backed by the
**shell panel trio token style** (`lucaShellPanelSurfaceStyle`), where swapping
to `lucaMaterialPanelStyle` keeps background / border / shadow byte-identical and
only routes backdrop blur through the `--luca-material-blur` slot (so the surface
now respects the #387 host-policy blur cap — full on desktop app, reduced on
web/mobile).

### Files migrated

| Component | Surface | Material role used |
| --- | --- | --- |
| `src/components/dashboard/LucaDashboardSurface.tsx` | Desktop left panel + right panel wrappers | `lucaMaterialPanelStyle` |
| `src/components/layout/Header.tsx` | Desktop header bar surface | `lucaMaterialPanelStyle` |

### Why material roles (style objects) and not primitive components here

Part 2 of the migration brief prefers primitive components (`LucaPanel`, etc.)
but allows material style objects "when component structure makes wrapper
replacement risky." Both migrated wrappers are large multi-child containers whose
opening/closing tags span many lines and merge per-instance inline layout
(`width`). Retagging them to `<LucaPanel>` would be the exact risky wrapper
replacement Part 2 cautions against, so the material **role** is spread into the
existing element instead. Output is identical.

### Intentionally deferred surfaces

These were inspected and **left unchanged** on purpose:

- **Raw low-alpha right-panel cards** — `ActivityPanel`, `ControlPanel`,
  `MemoryControlPanel`, `TraceLogsPanel`, `RightPanelSection`, `RightPanelMetric`
  (neutral tone), and `OperationPermissionCenter` use intentionally light tints
  (`bg-white/[0.03]`–`bg-white/[0.05]`, `bg-black/10`) with no shadow/blur. There
  is **no flat low-tint material role** today; forcing them into `LucaPanel`
  (heavier `--luca-surface-glass` + shadow + blur) would change their surface
  weight and elevation — a redesign, not a normalization. These need a new
  `lucaMaterialCardStyle` (flat: background + border + text, no shadow/blur)
  before they can migrate identically. **Next candidate.**
- **`src/web/WebCapabilityPanel.tsx`** — browser-stylized default panel with a
  bespoke radius/shadow; same flat-tint concern. Deferred with the card role.
- **Dashboard rail / workspace / control / tab styles**
  (`lucaShellRailSurfaceStyle`, `lucaShellWorkspaceSurfaceStyle`,
  `lucaShellControlStyle`, `lucaShellTabStyle`, dividers) — left on shell helpers;
  rail/control variants carry secondary-text and active states with no 1:1
  material role yet.
- **Semantic status surfaces** (`color-mix(... var(--luca-danger/success/warning/info) ...)`),
  **modal scrims** (`bg-black/80`), and **tactical/debug visuals**
  (`MobileScreenMirror`, `UiTreeOverlay`) — out of scope by the brief.

### Next migration candidates

1. Add a flat `lucaMaterialCardStyle` role (background + border + text, no
   shadow/blur) and migrate the right-panel operation cards to it.
2. Add `lucaMaterialRailStyle` / control roles, then migrate the dashboard rail,
   control buttons, and tab strip.
3. Migrate `WebCapabilityPanel` once the flat card role exists.
