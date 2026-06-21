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

## Material settings wiring follow-up

Date: 2026-06-21

### Files changed

| File | Change |
| --- | --- |
| `src/styles/lucaMaterialSettings.ts` | New — host kind/policy types, `resolveLucaMaterialHostPolicy`, `getLucaMaterialCssVariables` |
| `src/config/lucaAppearanceTokens.ts` | Extended `buildLucaAppearanceCssVariableState` to accept `hostPolicy` and write `--luca-material-*` vars |
| `src/App.tsx` | Minimal: import `resolveLucaMaterialHostPolicy`, pass `hostPolicy` to `buildLucaAppearanceCssVariableState` |
| `src/components/settings/SettingsGeneralTab.tsx` | Extended opacity/blur slider `onChange` to immediately set `--luca-material-opacity`, `--luca-material-tint-strength`, `--luca-material-blur` |
| `docs/luca-material-system.md` | Added Settings wiring section and host policy table |

### Settings wired

- `general.backgroundOpacity` → `--luca-material-opacity` (raw value)
- `general.backgroundOpacity` → `--luca-material-tint-strength = 1` (explicit, prevents double-apply)
- `general.backgroundBlur` → `--luca-material-blur` (capped per host policy)
- `reducedTransparency` → `--luca-material-blur = 0px`
- `highContrast` → handled upstream in token; `--luca-material-border-strength = 1`

### Host policies confirmed

| Host | Liquid BG | Component glass | Blur cap |
| --- | --- | --- | --- |
| `desktop-app` | yes | yes | 120 px (full) |
| `mobile-app` | no | yes | 20 px (reduced) |
| `desktop-web` | no | yes | 20 px (reduced) |
| `mobile-web` | no | yes | 20 px (reduced) |

Liquid background remains host-dependent. Luca Material component glass (panels,
sheets, sidebars, overlays) is cross-host with safe fallbacks.

### Validation result

- `npm run build:web` passes.
- `npm run type-check` fails with the same 113 pre-existing errors in
  `src/services/` test fixtures (unrelated to this change). No new errors.
- Surfaces validated: `FloatingPanel`, `OperationsSidebar`, `OverlayManager` reboot
  overlay, `PanelResizer`, `ChatPanel` wrappers, `ChatWidgetInput`, `WebReadyState`,
  `WebPostBootTransition`, `WebPostBootLoading` — all route through
  `buildLucaAppearanceCssVariableState`, so material variables update system-wide on
  any settings change.

### Known follow-up items

- Add UI controls for `reducedTransparency` and `highContrast` in Settings Appearance.
- Add a liquid-intensity slider that writes `--luca-material-tint-strength` directly
  (currently locked to 1; a dedicated slider bypasses the double-apply issue).
- Consider a tighter blur cap for `mobile-web` (currently 20 px, may lower to 12 px
  after real-device profiling).
- Migrate remaining default/basic panels (settings, right-panel operation centers,
  dashboard cards) to Luca Material roles.

## Default/basic material primitive migration

Date: 2026-06-21

### Search patterns used

Audited remaining default/basic surfaces across `src/components/settings/`,
`src/components/layout/`, `src/components/right-panel/`, `src/components/dashboard/`,
and `src/web/` for:

- inline `background` / `backgroundColor` / `borderColor` / `boxShadow` /
  `backdropFilter` using raw `rgba(...)` or hex (`#fff`, `#000`, `#121212`, …)
- Tailwind `bg-white/`, `bg-black/`, `bg-gray-`, `bg-slate-`, `border-white/`,
  `border-gray-`, `shadow-lg`, `shadow-2xl`
- direct style-object usage of `lucaShellPanelSurfaceStyle` /
  `lucaShellRailSurfaceStyle` that maps 1:1 to a material role
- repeated background + border + shadow trios duplicating `LucaPanel`

### Files inspected

- `src/components/dashboard/LucaDashboardSurface.tsx`
- `src/components/layout/Header.tsx`
- `src/components/right-panel/{ActivityPanel,ControlPanel,MemoryControlPanel,TraceLogsPanel,RightPanelSection,RightPanelMetric,OperationPermissionCenter,PersonalIntelligenceReadOnlyPanel,PersonalIntelligenceReviewWorkflowPanel}.tsx`
- `src/web/WebCapabilityPanel.tsx`
- `src/components/settings/*` (SettingsLayout, SettingsMCPTab, tab wrappers)

### Default/basic surfaces migrated

Only token-backed shell-trio surfaces were migrated (background/border/shadow
byte-identical; blur now host-policy aware via `--luca-material-blur`):

- `LucaDashboardSurface.tsx` — desktop left panel + right panel → `lucaMaterialPanelStyle`
- `Header.tsx` — desktop header bar → `lucaMaterialPanelStyle`

### Intentional remaining classes/surfaces

- Right-panel cards (`ActivityPanel`, `ControlPanel`, `MemoryControlPanel`,
  `TraceLogsPanel`, `RightPanelSection`, `RightPanelMetric`,
  `OperationPermissionCenter`, the two `PersonalIntelligence*Panel`s) use
  intentional low-alpha white/black tints with no shadow/blur. They need a new
  flat `lucaMaterialCardStyle` role to migrate without changing surface weight —
  deferred (documented in `luca-material-system.md`).
- `WebCapabilityPanel.tsx` — bespoke browser-stylized panel; deferred with the card role.
- Dashboard rail / workspace / control / tab / divider styles kept on shell helpers.
- Semantic `color-mix` status surfaces, `bg-black/80` modal scrims, and
  tactical/debug visuals (`MobileScreenMirror`, `UiTreeOverlay`) left untouched per brief.
- No older helper exports were removed; `lucaShellStyles.ts` /
  `lucaMobileShellStyles.ts` / `lucaPlatformBackgroundPolicy.ts` remain in use.

### Build results

- `npm run build:web`: passes.
- `npm run type-check` / `npm run build`: pre-existing 113 errors in
  `src/services/` test fixtures (unrelated; count unchanged). No new errors from
  this change.

### Known follow-up items

- Add flat `lucaMaterialCardStyle` (background + border + text, no shadow/blur)
  and migrate right-panel operation cards + `WebCapabilityPanel`.
- Add `lucaMaterialRailStyle` / control roles for the dashboard rail, control
  buttons, and tab strip.
- Settings tab cards already use the shared `settingsLayoutStyles` token system;
  revisit only if a primitive adds clear value.

## Flat card material migration

Date: 2026-06-21

### Search patterns used

- `bg-white/[0.03]`, `bg-white/[0.04]`, `bg-white/[0.045]`, `bg-white/5`
- `bg-black/10`, `bg-black/20`
- `border-white/10`, `border-white/[0.07]`, `border-white/15`
- `shadow-[0_24px_70px_rgba(0,0,0,0.25)]`, `backdrop-blur-2xl`
- `text-white`, `text-white/45`, `text-white/55`, `text-white/70`, `text-white/90`

### Files inspected

- `src/styles/lucaMaterialSystem.ts`
- `src/components/right-panel/RightPanelSection.tsx`
- `src/components/right-panel/RightPanelMetric.tsx`
- `src/components/right-panel/ActivityPanel.tsx`
- `src/components/right-panel/ControlPanel.tsx`
- `src/components/right-panel/MemoryControlPanel.tsx`
- `src/components/right-panel/TraceLogsPanel.tsx`
- `src/components/right-panel/OperationPermissionCenter.tsx`
- `src/components/right-panel/PersonalIntelligenceReadOnlyPanel.tsx`
- `src/components/right-panel/PersonalIntelligenceReviewWorkflowPanel.tsx`
- `src/web/WebCapabilityPanel.tsx`

### Classes replaced

Default/basic card wrappers moved from hardcoded low-alpha white/black utility
classes to `lucaMaterialCardStyle`, `lucaMaterialMetricStyle`, or
`lucaMaterialWebCardStyle`. Web capability title, muted text, dividers, neutral
status badges, and nested cards now use Luca text, border, and flat material
roles instead of hardcoded `text-white/*`, `border-white/*`, `bg-white/*`, and
`bg-black/*` chrome.

### Default/basic card surfaces migrated

- Shared right-panel section wrapper and neutral metric wrapper.
- Top-level default/basic cards in Activity, Control, Memory, Trace Logs, and
  Personal Intelligence review/read-only panels.
- Operation Permission Center neutral/default cards and metric rows.
- Neutral right-panel chips, default conditional branches, and tokenized borders
  where the existing low-alpha visual weight was preserved.
- Browser-safe Web Capability panel shell, nested capability cards, neutral
  status badges with explicit secondary/tertiary color overrides, and text/divider chrome.

### Semantic/tactical surfaces intentionally left

Semantic success/warning/danger/info surfaces that already use Luca status tokens
were left unchanged. Tactical/debug visuals, modal scrims, and advanced visual
components remained out of scope. Numerous runtime record rows still contain
conditional semantic state branches; only obvious neutral/default wrappers were
migrated in this pass to keep the PR reviewable.

### Build results

- `npm install --ignore-scripts`: completed.
- `npm run build:web`: see PR validation notes.
- `npm run build`: see PR validation notes.
- `npm run type-check`: see PR validation notes.

### Known follow-ups

- Continue migrating remaining neutral conditional record rows to flat card
  helpers where each branch can preserve semantic state without widening scope.
- Consider a shared neutral-chip component once more right-panel chips are moved
  off hardcoded white/black utility classes.

## Rail/control/tab material migration

**Date:** 2026-06-21

### Search patterns used

- `lucaShellRailSurfaceStyle`
- `lucaShellWorkspaceSurfaceStyle`
- `lucaShellControlStyle`
- `lucaShellTabStyle`
- `lucaShellDividerStyle`
- `lucaMobileNavSurfaceStyle`
- `lucaMobileDividerStyle`
- `border-white/10`
- `border-white/[0.07]`
- `bg-white/5`
- `bg-black/10`
- `text-white/`

### Files inspected

- `src/styles/lucaMaterialSystem.ts`
- `src/components/dashboard/LucaDashboardSurface.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/ChatPanel.tsx`
- `src/components/layout/OperationsSidebar.tsx`
- existing audit references under `docs/`
- broad `src/` matches for repeated neutral Tailwind white/black border and background utilities

### Classes/helpers replaced

- Replaced desktop dashboard `lucaShellRailSurfaceStyle` with `lucaMaterialRailStyle`.
- Replaced neutral dashboard/header `lucaShellControlStyle` with `lucaMaterialControlStyle`.
- Replaced neutral dashboard active-control usage with `lucaMaterialControlActiveStyle`.
- Replaced default dashboard tab usage with `lucaMaterialTabStyle` and `lucaMaterialTabActiveStyle`.
- Replaced default dashboard divider usage with `lucaMaterialDividerStyle`.
- Replaced safe workspace helper usage with `lucaMaterialWorkspaceStyle`.

### Default/basic surfaces migrated

The migration covers collapsed desktop dashboard rails, rail toggle controls, right-panel rail controls, the right-panel tab strip, the right-panel collapse divider/control, desktop header neutral controls, and desktop chat workspace fallback surfaces.

### Semantic/tactical surfaces intentionally left

Voice UI, tactical/debug panels, skill runtime/registry surfaces, trading/debate visuals, mobile navigation behavior, mobile dividers, modal scrims, browser/runtime surfaces, semantic state colors, and broad `App.tsx` helper usage were intentionally left unchanged to avoid redesigning or touching prohibited runtime/layout areas.

### Build results

- `npm install --ignore-scripts`: completed successfully in this environment.
- `npm run build:web`: completed successfully.
- `npm run build`: failed at the repo-wide `tsc` step with existing TypeScript/test fixture errors unrelated to this UI material-role migration.
- `npm run type-check`: failed with the same existing repo-wide TypeScript/test fixture errors; no new errors referenced the changed material/dashboard/header/chat files.

### Known follow-ups

- Add dedicated mobile nav/control material roles only after a safe mobile 1:1 mapping is agreed.
- Continue removing direct neutral Tailwind `border-white/*`, `bg-white/*`, and `bg-black/*` in feature-specific passes where surfaces are clearly default chrome rather than semantic, tactical, or visualization UI.
- Keep old shell helper exports available until all call sites have safe role equivalents.

## Post-material rollout leak audit

**Date:** 2026-06-21

### Search patterns used

- `border-white/`, `bg-white/`, `bg-black/`, `text-white`, `text-white/`, `border-black/`
- `bg-gray-`, `bg-slate-`, `border-gray-`, `shadow-[`
- `rgba(`, `#000`, `#fff`, `#121212`, `#08090b`, `#111317`
- `backdrop-blur`, `blur-2xl`
- `lucaShellPanelSurfaceStyle`, `lucaShellRailSurfaceStyle`, `lucaShellWorkspaceSurfaceStyle`
- `lucaShellControlStyle`, `lucaShellTabStyle`, `lucaShellDividerStyle`
- `lucaMobileNavSurfaceStyle`, `lucaMobileDividerStyle`, `lucaMobilePanelSurfaceStyle`

### Files inspected

The audit inspected broad repo matches while classifying runtime source separately from documentation and standalone marketing/static assets. Runtime source matches were reviewed under `src/` plus the app boot shell in `index.html`. Documentation-only matches were reviewed under `docs/`. Standalone static/marketing matches under `landing/`, `relay-server/public/`, and Android launcher XML were treated as outside the Luca desktop material-role hierarchy unless they also mapped to a runtime source surface.

Meaningful runtime source match groups inspected:

- App shell and global token/style files: `index.html`, `src/App.tsx`, `src/index.css`, `src/hooks/useTheme.ts`, `src/styles/lucaMaterialSystem.ts`, `src/styles/lucaShellStyles.ts`, `src/styles/lucaMobileShellStyles.ts`, `src/styles/lucaMaterialSettings.ts`, `src/utils/glassStyles.ts`, `src/utils/uiUtils.ts`.
- Desktop shell/layout surfaces: `src/components/dashboard/LucaDashboardSurface.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/OperationsSidebar.tsx`, left-panel components, right-panel components, and shared overlay panels under `src/surfaces/`.
- Modal/overlay surfaces: `src/components/*Modal.tsx`, `src/components/SecurityGate.tsx`, `src/components/SystemErrorBoundary.tsx`, origin/shared overlay panel files, and human/admin/remote/cast/desktop/vision modal shells.
- Runtime, governance, model, memory, and service-facing UI: runtime panels under `src/components/runtime/`, model/LLM panels, memory control UI, skill authority/registry/sandbox panels, and `src/services/awarenessService.ts`.
- Browser/web surfaces: `src/components/LucaBrowser.tsx`, `src/components/browser/SandboxedBrowserShell.tsx`, `src/components/ui/WebUnavailableState.tsx`, `src/components/web/*`, and `src/web/*`.
- Mobile source surfaces: `src/components/mobile/*`, `src/components/Mobile*.tsx`, mobile shell helpers/tests, and mobile-adjacent cast/TV receiver surfaces.
- Tactical/debug/advanced visuals: tactical terminals, trading terminals, OSINT/intelligence views, `UiTreeOverlay`, `MobileScreenMirror`, hologram/presence/shader/orb/canvas visuals, and creator/pro workforce canvases.
- Semantic/status source surfaces: status chips, risk/approval/blocked/active rows, trading state cards, runtime state labels, and components using success/warning/danger/info color branches or `color-mix` status tokens.
- Documentation source-of-truth files: `docs/theme-regression-audit.md`, `docs/luca-material-system.md`, and historical audit/design docs that intentionally mention old hardcoded classes.

### Classification table

| file/path | match type | bucket | action | reason |
| --- | --- | --- | --- | --- |
| `src/components/dashboard/LucaDashboardSurface.tsx`, `src/components/layout/Header.tsx`, layout/right-panel materialized call sites | shell helper names, neutral white/black utility remnants | `safe-to-migrate-now` | Documented only | The obvious desktop rail/control/tab/workspace cases were already migrated by the #393 role pass; remaining matches are either active state, helper compatibility, or broader shell context that should not be changed in an audit PR. |
| `src/index.css`, `src/hooks/useTheme.ts`, `src/styles/lucaMaterialSystem.ts`, `src/styles/lucaMaterialSettings.ts` | `rgba(`, `#fff`, `#000`, `#121212`, material variable fallbacks | `legacy-helper-still-used-but-safe` | Keep | These files define app/theme/material tokens and compatibility fallbacks. Raw color syntax is intentional token plumbing, not component-level default chrome leakage. |
| `src/styles/lucaShellStyles.ts`, `src/styles/lucaMobileShellStyles.ts`, shell style tests | old shell/mobile helper names | `legacy-helper-still-used-but-safe` | Keep | Helper exports remain needed for backward compatibility, mobile-specific surfaces, and deferred tactical/mobile boundaries until exact new roles exist. |
| `src/App.tsx` | broad shell/helper/default surface matches | `legacy-helper-still-used-but-safe` | Keep | `App.tsx` is explicitly prohibited for this PR and contains broad runtime layout wiring where a surgical audit should not alter behavior. |
| `src/components/*Modal.tsx`, `src/surfaces/origin/*OverlayPanels.tsx`, `src/surfaces/shared/*OverlayPanels.tsx` | `bg-black/`, `backdrop-blur`, `rgba(` scrims and panel overlays | `overlay/scrim-keep` | Keep | Modal dimmers and backdrop layers are intentional overlay/scrim semantics; changing them risks focus, contrast, and layering behavior. |
| `src/components/AdminEnrollmentModal.tsx`, `src/components/AdminGrantModal.tsx`, `src/components/SecurityGate.tsx`, skill permission/runtime panels | status and authority colors, white/black overlays | `semantic-state-keep` | Keep | Approval, blocked, risk, danger, and authority surfaces are semantic state UI, not neutral material chrome. |
| `src/components/runtime/*`, `src/components/ModelManager.tsx`, `src/components/llm/OfflineModelManager.tsx`, memory/governance-adjacent panels | status chips, `rgba(` token/status fallbacks | `semantic-state-keep` | Keep | Runtime/model/memory state colors communicate health, routing, availability, or risk and are also prohibited areas for opportunistic changes. |
| `src/components/mobile/*`, `src/components/Mobile*.tsx`, `src/styles/lucaMobileShellStyles.ts` | mobile helper names, `bg-white/`, `border-white/`, `backdrop-blur` | `mobile-role-needed` | Defer | Mobile navigation/control chrome needs dedicated mobile material roles before migration; desktop rail/control/tab roles should not be forced into mobile behavior. |
| `src/components/MobileScreenMirror.tsx`, `src/components/mobile/UiTreeOverlay.tsx` | `rgba(`, white/black utility classes, debug overlays | `tactical-debug-keep` | Keep | These are inspection/mirroring/debug surfaces explicitly named as tactical/debug boundaries. |
| `src/components/LucaBrowser.tsx`, `src/components/browser/SandboxedBrowserShell.tsx`, `src/components/web/*`, `src/components/ui/WebUnavailableState.tsx`, `src/web/*` | web card/chrome classes, `rgba(`, backdrop/overlay matches | `web-specific-review` | Defer | Browser/web runtime surfaces require separate desktop-web/mobile-web safety review; browser runtime is prohibited for this PR. |
| Trading/terminal/tactical files such as `src/components/CryptoTerminal.tsx`, `ForexTerminal.tsx`, `StockTerminal.tsx`, `HackingTerminal.tsx`, `GeoTacticalView.tsx`, `DarkWebScanner.tsx`, `VisionHUD.tsx`, and trading dashboard/debate/strategy files | `bg-black/`, `text-white`, `shadow-[`, `rgba(`, status colors | `tactical-debug-keep` | Keep | Terminal/tactical/pro/trading visuals use intentional domain styling and visual language rather than default app chrome. |
| Hologram/presence/visual files under `src/components/Hologram/`, `src/components/visual/`, `src/components/HolographicCore.tsx`, `src/components/VisualCore.tsx`, `src/components/WidgetVisualizer.tsx` | `rgba(`, `#fff/#000`, blur/shadow effects | `tactical-debug-keep` | Keep | Hologram, presence, shader, canvas, and generative visual effects are explicitly outside the material-role migration boundary. |
| Onboarding files under `src/components/Onboarding/` | white/black utility classes, blur, rgba | `legacy-helper-still-used-but-safe` | Keep | Onboarding is prohibited for this PR, and its surfaces need a dedicated onboarding review rather than opportunistic material migration. |
| LucaLink files under `src/components/lucaLink/` and LucaLink modal | status colors and overlay/helper matches | `semantic-state-keep` | Keep | Connection/error surfaces communicate device state; LucaLink is prohibited for this PR. |
| Chat/widget/content components such as `ChatMessageBubble`, `ChatWidget*`, `SuggestionChips`, `LiveContentDisplay`, chart/rendering components | message/status/visual white-black utility matches | `semantic-state-keep` | Keep | These matches are content, message, chart, or state-specific surfaces rather than default shell material chrome. |
| `src/config/themeColors.ts`, `src/config/lucaThemeSystemAuditMap.ts`, theme/token tests | raw hex, rgba, Tailwind class strings | `legacy-helper-still-used-but-safe` | Keep | Theme catalogs and audit maps intentionally enumerate color classes/tokens for theme behavior and regression coverage. |
| `src/services/awarenessService.ts` | canvas `#000`/`#fff` drawing | `tactical-debug-keep` | Keep | Canvas drawing colors are service/visual implementation details and not material surfaces. |
| `index.html` | boot CSS `rgba(`, text/surface colors | `legacy-helper-still-used-but-safe` | Keep | Boot-shell styling is pre-app visual scaffolding; no material role is available before React/material variables initialize. |
| `docs/**` | old class/helper mentions | `docs-only` | Keep/update | Documentation intentionally records historical classes, search patterns, and migration boundaries. |
| `landing/**`, `relay-server/public/**`, Android launcher XML | static marketing/server/launcher colors | `docs-only` | No action in this audit | These are outside runtime Luca app material roles and should be handled by separate static/marketing/platform passes if needed. |

### Tiny fixes made

No source fixes were made. This PR is documentation-only by design so the audit can classify the remaining surface boundaries before any additional migrations.

### Intentionally deferred surfaces

- Mobile navigation/control chrome until dedicated mobile material roles exist.
- Browser/web runtime chrome until a web-specific desktop/mobile safety pass reviews it.
- Modal scrims and dimming layers because they are overlay semantics, not material panel chrome.
- Semantic success/warning/danger/info, risk, approval, blocked, active, connection, and runtime status surfaces.
- Tactical/debug/advanced visuals, including `UiTreeOverlay`, `MobileScreenMirror`, terminals, trading/pro/creator surfaces, hologram/presence/shader/canvas visuals, and generative visual effects.
- Prohibited runtime areas: onboarding, voice runtime, browser runtime, LucaLink, memory/governance/model routing/services, and broad `App.tsx` shell wiring.

### Next recommended migration PRs

1. Add dedicated mobile material roles for mobile nav/control/divider/panel chrome, then migrate only 1:1 mobile helper call sites.
2. Run a web-specific material audit for browser/web surfaces, separating desktop web, mobile web, and native desktop app safety.
3. Replace remaining desktop neutral default chrome only where a component has no semantic state branch and maps exactly to an existing material role.
4. Keep semantic status tokens and overlay scrims out of material-role migrations unless a future design explicitly defines those boundaries.

### Build results

- `npm install --ignore-scripts`: completed successfully; npm emitted deprecation warnings only.
- `npm run build:web`: completed successfully; Vite emitted existing chunking and report-mode web-import-boundary warnings.
- `npm run build`: failed during the repo-wide `tsc` step with existing TypeScript/test fixture errors in onboarding, runtime diagnostics, browser-runtime-router, governed runtime, and voice test files; no failures reference the docs changed in this audit.
- `npm run type-check`: failed with the same repo-wide TypeScript/test fixture errors as `npm run build`; this docs-only PR did not change source files.

## Mobile material chrome migration

**Date:** 2026-06-21

### Search patterns used

- `lucaMobileNavSurfaceStyle`
- `lucaMobileDividerStyle`
- `lucaMobilePanelSurfaceStyle`
- `lucaMobileGlassControlStyle`
- `lucaMobileActiveTabStyle`
- `lucaMobileContentSurfaceStyle`
- `bg-white/`, `border-white/`, `bg-black/`, `text-white/`
- `backdrop-blur`, `shadow-[`, `rgba(`

### Files inspected

- `src/components/mobile/`
- `src/components/Mobile*.tsx`
- `src/styles/lucaMobileShellStyles.ts`
- `src/components/dashboard/LucaDashboardSurface.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/ChatPanel.tsx`
- Mobile-adjacent cast/TV/receiver surfaces were reviewed for classification only.

### Helpers/classes replaced

- Replaced safe mobile uses of `lucaMobileContentSurfaceStyle` with `lucaMaterialMobileContentStyle`.
- Replaced safe mobile uses of `lucaMobilePanelSurfaceStyle` with `lucaMaterialMobilePanelChromeStyle`.
- Replaced safe mobile uses of `lucaMobileNavSurfaceStyle` with `lucaMaterialMobileNavStyle`.
- Replaced safe mobile uses of `lucaMobileDividerStyle` with `lucaMaterialMobileDividerStyle`.
- Replaced safe mobile uses of `lucaMobileGlassControlStyle` with `lucaMaterialMobileControlStyle`.
- Replaced safe mobile uses of `lucaMobileActiveTabStyle` with `lucaMaterialMobileTabActiveStyle`.

### Mobile default/basic surfaces migrated

- Mobile dashboard content wrappers for SYSTEM and TERMINAL views.
- Mobile DATA panel chrome and tab-strip divider.
- Mobile DATA active tab style.
- Mobile bottom navigation wrapper surface.
- Mobile header panel/control chrome.
- Mobile chat workspace content surface and neutral mobile chat controls.

### Mobile surfaces intentionally deferred

Mobile navigation behavior, gesture/routing/tab-state logic, modal scrims, semantic status states, tactical/debug/pro/creator mobile visuals, `MobileScreenMirror`, `UiTreeOverlay`, `MobileManager`, `MobileFileBrowser`, mobile cast/receiver controls, browser/runtime/LucaLink/memory/governance/model-routing surfaces, onboarding, voice runtime, and services were intentionally left unchanged.

### Build results

- `npm install --ignore-scripts`: completed successfully; npm emitted deprecation and vulnerability audit warnings only.
- `npm run build:web`: completed successfully; Vite emitted existing chunking and report-mode web-import-boundary warnings.
- `npm run build`: failed during the repo-wide `tsc` step with existing TypeScript/test-fixture errors outside the changed mobile material-role files.
- `npm run type-check`: failed with the same repo-wide TypeScript/test-fixture errors as `npm run build`; no failures referenced the changed material/dashboard/header/chat files.

### Known follow-ups

- Keep old mobile helper exports until all deferred mobile surfaces have explicit role mappings or are intentionally left bespoke.
- Review mobile cast/receiver and advanced mobile visuals in a dedicated pass if they ever need material roles.
- Continue treating modal scrims, semantic state surfaces, browser/runtime surfaces, and tactical/debug visuals as outside neutral mobile chrome.
