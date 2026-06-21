# LucaOS Theme Regression Audit

Date: 2026-06-21

## Search patterns used

Focused `rg` audit across the requested shell, web, settings, mobile, and visual surfaces using:

- `text-white`, `text-black`, `text-gray-`, `text-slate-`
- `bg-white/`, `bg-black/`, `bg-gray-`, `bg-slate-`
- `border-white/`, `border-black/`, `border-gray-`, `border-slate-`
- `shadow-[0_0_`, `shadow-black`, `shadow-white`
- `#ffffff`, `#fff`, `#000000`, `#000`, `#121212`, `#050507`, `#00ffff`
- `rgba(255`, `rgba(0, 0, 0`, `rgba(0,0,0`, `rgba(255,255,255`

## Files inspected

Prioritized audit paths:

- `src/components/boot/`
- `src/components/layout/`
- `src/components/ChatWidgetInput.tsx`
- `src/web/`
- `src/App.tsx`
- `src/styles/`
- `src/components/settings/`
- `src/components/mobile/`
- `src/components/visual/`

Note: `src/components/overlays/` was requested, but that directory is not present in this checkout.

## Issues fixed

- Tokenized the detached floating panel surface, border, and soft shadow so the default/basic shell no longer branches to fixed white/black rgba backgrounds.
- Tokenized the detached floating panel reattach hover surface away from `hover:bg-white/10`.
- Tokenized the reboot overlay scrim and progress-track surface/border away from fixed white/black rgba and `bg-gray-900/50`.
- Tokenized the desktop operations sidebar surface away from fixed white/black rgba backgrounds.
- Tokenized the panel resizer handle border away from `border-white/10`.

## Intentional remaining hardcoded/advanced visual classes

Remaining matches were classified as intentional and left unchanged when they fell into these buckets:

- Semantic/status/accent styling that is already token-driven or tied to explicit danger/success/info/persona/plugin accents.
- Advanced, tactical, creator, TV/data-room, mobile-screen-mirror, canvas/orb, and sovereignty visuals that intentionally use black/white/slate/neon styling as part of their specialized presentation rather than default/basic shell chrome.
- Web post-boot/onboarding/capability-card visual treatment that is separate from the default/basic desktop shell and needs a broader web-theme pass before piecemeal tokenization.
- Token fallback strings inside shared style helpers, where the hardcoded value is only a fallback after Luca/app tokens.

## Known follow-up items

- `src/web/` still contains a cohesive dark glass visual language. Audit it separately when web theme tokens are finalized.
- `src/components/settings/` contains many existing app-token fallbacks with rgba values and a few mobile-only `bg-white/5` surfaces. These should be migrated in a settings-specific pass to avoid changing mobile/settings behavior opportunistically.
- `src/components/mobile/` and `src/components/visual/` contain intentional advanced/pro/tactical presentation classes. Revisit only if those views become part of the default/basic shell.

## Settings and mobile follow-up

Date: 2026-06-21

### Search patterns used

Focused `rg` audit across the settings/mobile follow-up scope using:

- `text-white`, `text-black`, `text-gray-`, `text-slate-`
- `bg-white/`, `bg-black/`, `bg-gray-`, `bg-slate-`
- `border-white/`, `border-black/`, `border-gray-`, `border-slate-`
- `shadow-[0_0_`, `shadow-black`, `shadow-white`
- `#ffffff`, `#fff`, `#000000`, `#000`, `#121212`, `#050507`, `#00ffff`
- `rgba(255`, `rgba(0, 0, 0`, `rgba(0,0,0`, `rgba(255,255,255`

### Files inspected

- `src/components/settings/`
- `src/components/mobile/`
- `src/styles/lucaMobileShellStyles.ts`
- `src/styles/lucaShellStyles.ts`

### Issues fixed

- Replaced settings-panel app-token fallbacks that resolved to fixed white/black rgba or hex values with Luca appearance-token fallbacks for primary text, secondary/tertiary text, glass/solid surfaces, and subtle/strong borders.
- Replaced mobile settings `bg-white/5`, `bg-white/10`, `border-white/*`, and `bg-black/*` panel/chip/input surfaces with Luca surface, hover, and border tokens.
- Normalized repeated settings skeleton, divider, modal, control, and card surfaces so default/basic settings views inherit the active LucaOS theme rather than fixed translucent white/black surfaces.

### Intentional remaining settings/mobile classes

- `src/components/mobile/MobileScreenMirror.tsx` retains slate/black/white classes and glow shadows because the screen mirror is an intentional tactical device-frame visualization.
- `src/components/mobile/UiTreeOverlay.tsx` retains black/slate/white classes because the overlay is an intentional debugging/inspection affordance.
- Mobile danger/success/info/accent controls retain semantic Luca status tokens and their existing interaction affordances.
- Existing `var(--app-*)` classes without hardcoded white/black/rgba fallbacks remain where they are already safe token fallbacks or require a larger helper migration.

### Known follow-up items

- Consider adding shared settings-specific wrapper helpers around Luca shell style constants if future settings work touches these same panels again.
- Audit advanced mobile developer utilities separately before tokenizing any tactical/debug visual language.
## Luca Material Engine follow-up

Date: 2026-06-21

This section tracks the introduction of the centralized Luca Material Engine
(`src/styles/lucaMaterialSystem.ts`) and shared panel primitives
(`src/components/ui/luca/`). See `docs/luca-material-system.md` for the full
architecture, token mapping, and slider-wiring plan.

### Files migrated

- `src/components/layout/FloatingPanel.tsx` — floating panel surface now consumes `lucaMaterialFloatingPanelStyle` (Framer Motion, resize, and detach/reattach behavior unchanged).
- `src/components/layout/OperationsSidebar.tsx` — desktop/mobile sidebar surface now uses `resolveLucaSidebarMaterial(isMobile)`; existing `lucaMobileShellStyles` divider/muted/content helpers preserved.
- `src/components/layout/OverlayManager.tsx` — reboot overlay scrim/progress-track now use `lucaMaterialOverlayStyle` + `LUCA_MATERIAL_BORDER`; approval, voice HUD, and shared-panel runtime untouched.
- `src/components/layout/PanelResizer.tsx` — handle accent now uses `lucaMaterialResizableHandleStyle`; pointer/mouse drag behavior unchanged.
- `src/components/layout/ChatPanel.tsx` — attachment/input panel and sheet wrappers now use `lucaMaterialPanelStyle` / `resolveLucaSheetMaterial` / `lucaMaterialMobileSheetStyle`; chat logic, message rendering, and model routing untouched.
- `src/components/ChatWidgetInput.tsx` — input container surface now uses `lucaMaterialPanelStyle`; input/voice/attachment/MCP/plugin behavior untouched.
- `src/web/WebReadyState.tsx` — main panel now uses the `LucaPanel` primitive + material surface/text.
- `src/web/postBoot/WebPostBootTransition.tsx` — text/border/hover styling now sourced from material roles; browser-safe auto-advance and reduced-motion handling unchanged.
- `src/web/postBoot/WebPostBootLoading.tsx` — container now uses the `LucaPanel` primitive + material text.

### Primitives added

`LucaSurface` (base), `LucaPanel`, `LucaFloatingPanel`, `LucaSidebar`,
`LucaSheet`, `LucaPopover`, `LucaDialog`, `LucaOverlaySurface`,
`LucaResizableHandle`, plus a `mergeClassNames` helper and an `index.ts` barrel
under `src/components/ui/luca/`.

### Intentional remaining non-migrated surfaces

- Non-panel surfaces inside migrated components stay on their existing helpers:
  `ChatPanel` workspace background (`lucaShellWorkspaceSurfaceStyle`), mobile
  content (`lucaMobileContentSurfaceStyle`), and mobile glass controls
  (`lucaMobileGlassControlStyle`); `OperationsSidebar` mobile divider/muted/content.
- `lucaShellStyles.ts`, `lucaMobileShellStyles.ts`, and
  `lucaPlatformBackgroundPolicy.ts` are intentionally kept and reused for
  backward compatibility — not deleted.
- Advanced/pro/creator/tactical and the broader `src/web/` dark-glass surfaces
  remain on their existing treatment, consistent with the earlier audit buckets.

### Known follow-up items

- Wire a Settings appearance pass that sets the `--luca-material-*` override
  slots from existing `backgroundOpacity` / `backgroundBlur` settings and future
  liquid-intensity / reduce-transparency / high-contrast controls.
- Migrate remaining default/basic panels (settings, right-panel operation
  centers, dashboard cards) to material roles in focused follow-up PRs.
- Pre-existing repo-wide `tsc` errors (in `src/services/computerUse`,
  `src/services/voice`, `src/services/runtime`, and related test fixtures) cause
  `npm run build` and `npm run type-check` to fail. They are unrelated to this
  change: the error count is identical (113) with and without this PR's edits,
  and none reference the material engine, primitives, or migrated files.
  `npm run build:web` (which uses `tsconfig.web.json`) passes.
