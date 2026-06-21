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

## How future opacity / blur / liquid-intensity sliders feed the engine

The engine exposes internal **override-slot** CSS variables. Each slot falls
back to the already-resolved Luca token, so when a slot is unset (today's
default) the rendered material is identical to the legacy shell styling — the
engine is visually a no-op until a slider opts in.

Slots (see `LUCA_MATERIAL_VARIABLE_SLOTS`):

| Variable | Effect | Default |
| --- | --- | --- |
| `--luca-material-opacity` | Surface opacity (feeds tint strength) | `1` |
| `--luca-material-blur` | Backdrop blur radius | `--luca-blur-level` → `--app-bg-blur` → `40px` |
| `--luca-material-tint-strength` | Surface tint coverage (0..1) | `--luca-material-opacity` → `1` |
| `--luca-material-border-strength` | Border coverage (0..1) | `1` |
| `--luca-material-shadow-strength` | Reserved: elevation strength | n/a (shadow currently via `--luca-material-shadow` slot) |
| `--luca-material-saturation` | Backdrop saturation multiplier | `1` |

Wiring detail: surface tint and border use
`color-mix(in srgb, <token> calc(<strength> * 100%), transparent)`. At full
strength this is byte-equivalent to the source token; lowering the strength
thins the material. Blur and saturation feed the `backdrop-filter`
(`saturate(1)` is an identity transform, so the default render is unchanged).

A future Settings slider therefore needs only to **set these variables on
`:root`** (e.g. from `general.backgroundOpacity` / `general.backgroundBlur`,
which already exist and already shape the resolved tokens in
`lucaAppearanceTokens.ts`). No component edits are required. Building that
Settings UI is intentionally **out of scope** for this PR — see follow-ups.

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
3. Add a Settings appearance pass that writes the `--luca-material-*` slots from
   the existing `backgroundOpacity` / `backgroundBlur` settings (and future
   liquid-intensity / reduce-transparency / high-contrast controls).
4. Consider extracting `FloatingPanel`'s motion/resize shell into a primitive
   that composes `LucaFloatingPanel` once more floating surfaces exist.
5. Revisit advanced/pro/creator/tactical surfaces only if they leak into
   default/basic shell chrome (they are intentionally excluded today).
