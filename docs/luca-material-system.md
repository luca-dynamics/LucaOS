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

## Flat card material role follow-up

Date: 2026-06-21

This follow-up adds conservative flat card roles for the right-panel and browser
capability card surfaces that were intentionally deferred from the full panel
migration. These roles are **not** panel roles: they keep cards lighter than
`lucaMaterialPanelStyle` by omitting the panel backdrop blur and default panel
shadow.

### Roles added

- `lucaMaterialCardStyle` — low-tint flat card / section surface using Luca
  material opacity / tint and border strength slots.
- `lucaMaterialMetricStyle` — lighter compact metric / chip surface, also using
  Luca material tint and border slots.
- `lucaMaterialWebCardStyle` — browser-safe flat card shell for web capability
  panels with a subtle tokenized shadow and no native/liquid assumptions.

### Design intent

The new roles approximate the previous `bg-white/[0.03]`, `bg-white/[0.045]`,
`bg-black/10`, and `border-white/10` surfaces without hardcoded white/black
chrome. They route default card backgrounds through Luca surface tokens and the
Settings Appearance material slots while keeping the hierarchy intact: full
panels remain elevated/glassy, cards remain flat, and metrics remain lighter
than cards.

### Files migrated

- `src/components/right-panel/RightPanelSection.tsx`
- `src/components/right-panel/RightPanelMetric.tsx`
- `src/components/right-panel/ActivityPanel.tsx`
- `src/components/right-panel/ControlPanel.tsx`
- `src/components/right-panel/MemoryControlPanel.tsx`
- `src/components/right-panel/TraceLogsPanel.tsx`
- `src/components/right-panel/PersonalIntelligenceReadOnlyPanel.tsx`
- `src/components/right-panel/PersonalIntelligenceReviewWorkflowPanel.tsx`
- `src/components/right-panel/OperationPermissionCenter.tsx`
- `src/web/WebCapabilityPanel.tsx`

### Why these differ from `lucaMaterialPanelStyle`

`lucaMaterialPanelStyle` intentionally represents a full panel: material surface,
border, shadow, and host-policy-aware backdrop blur. The flat card roles only
apply low-tint background, border, text color, and no/very-subtle shadow. They do
not force full panel blur, liquid background behavior, or panel elevation.

### Host-policy behavior

The card roles read the same `--luca-material-opacity`,
`--luca-material-tint-strength`, and `--luca-material-border-strength` slots as
the panel roles. Because they do not apply backdrop filters by default, they are
safe for desktop app, mobile app, desktop web, and mobile web, including hosts
with reduced blur policies.

### Intentionally deferred surfaces

Semantic status cards and chips using `color-mix(... var(--luca-success | --luca-warning | --luca-danger | --luca-info) ...)`,
modal scrims, tactical/debug visuals, `MobileScreenMirror`, `UiTreeOverlay`, and
advanced visualization surfaces remain intentionally out of scope. A narrow follow-up also tokenized neutral right-panel chips, default conditional card branches, and the Operation Permission Center neutral rows while preserving semantic status surfaces.

## Rail/control/tab material role follow-up

**Date:** 2026-06-21

### Roles added

- `lucaMaterialRailStyle` for collapsed dashboard rails and other low-weight rail chrome.
- `lucaMaterialControlStyle` and `lucaMaterialControlActiveStyle` for neutral/default control buttons.
- `lucaMaterialTabStyle` and `lucaMaterialTabActiveStyle` for default dashboard tab buttons.
- `lucaMaterialDividerStyle` for semantic neutral borders and separator lines.
- `lucaMaterialWorkspaceStyle` for the safe 1:1 default workspace helper mapping.
- `resolveLucaRailMaterial` and registry entries so the new roles are discoverable beside the existing panel/card/metric/web-card roles.

### Design intent

The new roles keep the hierarchy below full panels, cards, and metric chips. Rails use a tokenized surface and border without adding panel blur or elevation. Controls and tabs use lighter material slots so interactive chrome remains compact and state-focused. Dividers only route border color through the Luca Material border slot.

### Files migrated

- `src/components/dashboard/LucaDashboardSurface.tsx` now uses rail, control, active-control, tab, active-tab, divider, and workspace material roles for the desktop dashboard shell chrome.
- `src/components/layout/Header.tsx` now uses the control material role for neutral header controls on desktop while keeping mobile on the mobile panel helper.
- `src/components/layout/ChatPanel.tsx` now uses the workspace material role for the existing desktop workspace fallback surfaces.

### Difference from panel/card/metric roles

Panel roles remain the highest-weight default shell surfaces and continue to include blur, shadow, and primary framing. Card and metric roles remain flat content surfaces with stronger content grouping semantics than controls. The rail/control/tab roles are intentionally lighter: no new animation, no new layout behavior, no heavy shadow, and no forced panel blur. Dividers are only semantic border helpers.

### Host-policy behavior

The roles continue the same settings flow as the existing engine: appearance settings resolve Luca appearance tokens, material slots optionally override those tokens, and host policies can constrain material variables before components consume the semantic roles. The new rail/control/tab slots fall back to Luca appearance tokens, so desktop app, mobile app, desktop web, and mobile web keep safe defaults when a host policy withholds stronger liquid behavior.

### Intentionally deferred surfaces

Semantic success/warning/danger/info states, tactical/debug visual components, advanced/pro/creator visualizations, hologram/presence/shader surfaces, modal scrims, mobile frame/device-preview visuals, runtime/service UI, and broad `App.tsx` chrome remain deferred unless a future role maps exactly to those surfaces.

## Remaining material-role boundaries

The current Luca Material hierarchy covers default desktop shell and content chrome:

- Panels use `lucaMaterialPanelStyle` for elevated shell surfaces.
- Cards use `lucaMaterialCardStyle` for flat content grouping.
- Metrics and chips use `lucaMaterialMetricStyle`.
- Browser-safe web cards use `lucaMaterialWebCardStyle`.
- Rails use `lucaMaterialRailStyle`.
- Controls use `lucaMaterialControlStyle` and active controls use `lucaMaterialControlActiveStyle`.
- Tabs use `lucaMaterialTabStyle` and active tabs use `lucaMaterialTabActiveStyle`.
- Dividers use `lucaMaterialDividerStyle`.
- Workspace surfaces use `lucaMaterialWorkspaceStyle`.

The hierarchy intentionally does not cover every white/black/blur/shadow match in the repository. Several boundaries remain explicit until dedicated roles or design decisions exist:

- **Mobile role boundary:** mobile navigation, mobile controls, mobile dividers, and mobile panel chrome should remain on mobile-specific helpers until dedicated mobile material roles exist. Desktop rail/control/tab roles should not be applied to mobile navigation behavior by default.
- **Overlay/scrim boundary:** modal dimmers, black overlay layers, backdrop scrims, and intentional focus/frosting layers are overlay semantics rather than default material panels.
- **Tactical/debug boundary:** tactical terminals, debug overlays, inspection surfaces, `UiTreeOverlay`, `MobileScreenMirror`, pro/creator visuals, hologram/presence/shader/canvas effects, and generative visuals may keep bespoke styling because their visual language is not neutral shell chrome.
- **Semantic status boundary:** success, warning, danger, info, approval, blocked, risk, active, connection, routing, and runtime-health surfaces should keep semantic/status tokens or state-specific colors instead of being flattened into neutral material roles.
- **Web-specific boundary:** browser and web runtime surfaces need a separate desktop-web/mobile-web review before any additional material migration, even where a web-card role already exists for safe flat browser-adjacent cards.

## Mobile material chrome role follow-up

**Date:** 2026-06-21

### Roles added

- `lucaMaterialMobileNavStyle` for mobile bottom navigation shell chrome.
- `lucaMaterialMobileControlStyle` and `lucaMaterialMobileControlActiveStyle` for mobile-safe neutral/active control chrome.
- `lucaMaterialMobileTabStyle` and `lucaMaterialMobileTabActiveStyle` for mobile tab-strip chrome.
- `lucaMaterialMobileDividerStyle` for mobile dividers and tab-strip separators.
- `lucaMaterialMobileContentStyle` for mobile default content backgrounds.
- `lucaMaterialMobilePanelChromeStyle` for mobile panel/sheet chrome wrappers.
- `resolveLucaMobileChromeMaterial` and material-role registry entries for discoverability.

### Design intent

The mobile roles are conservative 1:1 aliases over the existing mobile shell helpers. They create a material import surface without changing mobile layout, navigation behavior, gestures, state, blur, elevation, or visual density. The roles preserve the current mobile helper feel for navigation, controls, active tabs, dividers, content surfaces, and panel chrome.

### Files migrated

- `src/components/dashboard/LucaDashboardSurface.tsx` now uses mobile material roles for the mobile content wrappers, DATA panel chrome, DATA tab divider, DATA active tab, and bottom nav wrapper.
- `src/components/layout/Header.tsx` now uses mobile material panel/control roles for mobile header chrome and neutral header controls.
- `src/components/layout/ChatPanel.tsx` now uses mobile material content/control roles for mobile chat workspace and neutral mobile chat controls.

### Why mobile roles differ from desktop rail/control/tab roles

Desktop `lucaMaterialRailStyle`, `lucaMaterialControlStyle`, and `lucaMaterialTabStyle` encode desktop shell hierarchy and desktop interaction density. Mobile navigation and mobile controls have different touch targets, weight, and host-policy assumptions, so these roles intentionally compose `lucaMobileShellStyles` helpers instead of inheriting desktop rail/control/tab styling. This avoids making mobile controls look like desktop panels or desktop rails.

### Host-policy behavior

The roles inherit the mobile host-policy and reduced-blur behavior already centralized in `src/styles/lucaMobileShellStyles.ts`. They consume Luca appearance/material tokens through those helpers and do not add new heavy blur, liquid background behavior, or shadow beyond the existing mobile helper mappings.

### Intentionally deferred mobile surfaces

`MobileScreenMirror`, `UiTreeOverlay`, tactical/debug/pro/creator mobile visuals, modal scrims, semantic status states, browser/runtime/LucaLink/memory/governance/model-routing surfaces, onboarding, voice runtime, and mobile-adjacent cast/TV/receiver visuals remain deferred. Old mobile helper exports remain available for compatibility and for deferred surfaces that do not map safely to neutral mobile chrome roles.
