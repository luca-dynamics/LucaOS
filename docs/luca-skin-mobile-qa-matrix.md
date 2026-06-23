# LucaOS Skin Mobile QA Matrix

**Type:** Manual/static QA matrix  
**Status:** QA checklist. No runtime, UI, root/provider, boot, onboarding, MiniChat, VoiceHUD, Flow motion, DOM, or asset changes are made by this document.  
**Date:** 2026-06-23  
**Target PR:** `test(ui): add LucaOS skin mobile QA matrix`

Read together with:

- `docs/luca-skin-system.md`
- `docs/luca-skin-token-architecture-plan.md`
- `docs/luca-skin-application-boundaries.md`
- `docs/luca-skin-mobile-safety-audit.md`
- `src/config/lucaSkins.ts`
- `src/config/lucaSkinPreviewMetadata.ts`
- `src/styles/lucaSkinRegistry.ts`
- `src/styles/lucaSkinMaterialBridge.ts`
- `src/styles/lucaDashboardSkinBoundary.ts`
- `src/styles/lucaMobileSkinBoundary.ts`
- `src/styles/lucaShellStyles.ts`
- `src/styles/lucaMobileShellStyles.ts`

> Shared direction: **"LucaOS should feel like a quiet operating system for intelligence, not a dashboard for controlling intelligence."**

> Skin framing: **"LucaOS skins are not decorations; they are the visual operating environments for an AI-native OS."**

---

## 1. Executive summary

The LucaOS skin system is now live in two controlled places: the desktop dashboard shell boundary and the local mobile shell boundary. Settings also exposes local preview cards that represent Pearl, Carbon, Flow, and Canvas without global application.

This matrix is the QA gate before broader rollout. It verifies that skins remain visual operating environments, not decorative overrides; that they stay local to approved boundaries; and that safety/status semantics, accessibility preferences, and static Flow behavior remain protected across desktop, mobile, and settings preview surfaces.

This document is QA/test/docs only. It does not add new skin application, visual styling, resolver behavior, providers, boot/onboarding application, MiniChat/VoiceHUD application, Flow motion, root/global DOM mutation, image assets, or screenshots.

---

## 2. Current application map

- **Settings preview:** uses local preview metadata and local preview variables only. Preview cards are not Apply/Save controls and do not mutate the active shell.
- **Desktop dashboard:** uses the dashboard boundary resolver and applies the returned material variables at the dashboard shell boundary.
- **Mobile shell:** uses the mobile boundary resolver and applies the returned material variables at the local mobile shell boundary.
- **Boot/onboarding:** are not skinned yet and must remain outside this QA PR.
- **MiniChat and VoiceHUD:** are not dedicated skinned surfaces yet and must not receive skin application here.
- **Flow:** has no motion yet. Flow is static on desktop and forced reduced-motion on mobile.

---

## 3. Skin-by-skin QA checklist

### Pearl

- [ ] No harsh pure-white glare on desktop or mobile.
- [ ] Graphite text remains readable on base, elevated, panel, and card surfaces.
- [ ] Bottom nav icons and labels remain readable in active and inactive states.
- [ ] Cards, panels, and sheets have enough separation from the workspace.
- [ ] Selected/current state is clear in settings preview, dashboard tabs, and mobile nav.

### Carbon

- [ ] Reads as graphite/charcoal, not pure black.
- [ ] Avoids neon, cyberpunk, hacker, terminal, or game-like affordances.
- [ ] Inactive bottom-nav items remain readable.
- [ ] Panels and cards do not collapse into a flat dark sheet.
- [ ] Status/safety surfaces remain clear and are not recolored by skin variables.

### Flow

- [ ] Static only.
- [ ] No animated gradient, liquid motion, timers, keyframes, or parallax.
- [ ] Blur is capped by host policy and reduced-transparency behavior.
- [ ] Mobile text, nav, cards, and sheets remain readable.
- [ ] Content dominates the background; ambient color does not compete with operations.

### Canvas

- [ ] Warm matte feel is preserved.
- [ ] No paper texture assets are introduced.
- [ ] Strong contrast remains on cream and warm elevated surfaces.
- [ ] Low/no blur behavior remains intact.
- [ ] Metadata, labels, muted text, and secondary copy remain readable.

---

## 4. Surface matrix

| Surface | Pearl | Carbon | Flow | Canvas | Expected result | Pass criteria |
| --- | --- | --- | --- | --- | --- | --- |
| Settings preview cards | Soft pearl preview, Current state clear | Charcoal preview, no neon | Static ambient preview | Warm matte preview | Local preview only | All four skins render, selected card says Current, no Apply/Save controls |
| Desktop dashboard shell | Off-white depth without glare | Graphite depth without pure black | Static gradient depth | Cream matte depth | Dashboard boundary material variables scope shell visuals | Shell remains readable and no root/global application is introduced |
| Mobile shell wrapper | Gentle base/elevated contrast | Charcoal readable contrast | Static, capped material output | Matte cream contrast | Mobile boundary material variables scope local shell visuals | Wrapper uses mobile resolver output and does not mutate body/html/root |
| Mobile bottom nav | Labels readable | Inactive labels readable | Content-first, no glow overload | Labels readable on warm surface | Nav remains stable wayfinding | Active/inactive states are distinguishable in every skin |
| Mobile panels/sheets | Soft separation | Not flat | Blur capped/static | Low/no blur matte | Panels/sheets remain operational surfaces | Text, borders, shadows, and selected states remain legible |
| Mobile cards | Off-white separation | Graphite separation | Ambient background stays behind content | Warm card contrast | Cards remain above shell background | Metadata and body text pass visual review |
| Dashboard panels/cards | Graphite text readable | Panels retain depth | Content dominates background | Cream surfaces retain contrast | Existing shell helpers consume material roles | No status/safety token override and no visual behavior expansion |
| Status/safety surfaces | Protected colors remain clear | Protected colors remain clear | Protected colors remain clear | Protected colors remain clear | Skin bridge excludes semantic safety/status roles | No danger/warning/success/info/approval/permission/blocked/voice/listening/vision/screen/stop material keys |
| Reduced motion mode | No motion added | No motion added | Forced static on mobile | No motion added | Static behavior wins over skin personality | No Flow motion strings or timers in relevant skin/style/resolver sources |
| Reduced transparency mode | Solid fallback where supported | Solid fallback where supported | Zero blur where bridge supports it | Matte/zero blur retained | Accessibility preference overrides skin material | `--luca-material-blur` resolves to `0px` for reduced-transparency Flow mobile check |

---

## 5. Static validation matrix

| Static check | Scope | Expected result | Pass criteria |
| --- | --- | --- | --- |
| No `document.documentElement` skin mutation | App, skin resolvers, registry, bridge, shell style helpers | No root skin writes | No `document.documentElement.style.setProperty` skin path |
| No `style.setProperty` skin application | Same | No imperative variable application | Skin variables are returned as maps for local boundaries only |
| No `body` / `html` mutation | Same | No global DOM mutation | No `document.body`, `body.style`, or `document.querySelector("html")` skin application |
| No `LucaSkinProvider` | Source tree | No provider is introduced | Boundary helpers remain pure; no provider component exists |
| No Flow `@keyframes` | Relevant style/resolver sources | Flow remains static | No keyframes are used for skin motion |
| No Flow `animation:` | Relevant style/resolver sources | Flow remains static | No CSS animation declaration is added for skin motion |
| No Flow `requestAnimationFrame` | Relevant style/resolver sources | Flow remains static | No frame loop is added |
| No Flow `setInterval` | Relevant style/resolver sources | Flow remains static | No timer loop is added |
| No Flow `setTimeout` | Relevant style/resolver sources | Flow remains static | No delayed motion is added |
| No Flow `parallax` | Relevant style/resolver sources | Flow remains static | No parallax behavior or copy is added to implementation sources |
| No boot/onboarding skin application | Boot/onboarding source surfaces | Out of scope | No dedicated boot/onboarding skin application is added |
| No MiniChat/VoiceHUD skin application | MiniChat/VoiceHUD source surfaces | Out of scope | No dedicated MiniChat or VoiceHUD skin application is added |
| No status/safety token override | Bridge and boundary maps | Safety semantics stay protected | Material maps exclude danger/warning/success/info/approval/permission/blocked/voice/listening/vision/screen/stop names |

---

## 6. Resolver matrix

| Resolver behavior | Expected result | Pass criteria |
| --- | --- | --- |
| Invalid selected skin falls back to Pearl | Unknown input normalizes safely | Dashboard and mobile boundary states return `skinId: "pearl"` |
| Dashboard resolver returns material variables | Dashboard boundary stays on Luca Material contract | Returned map contains every bridge variable name |
| Mobile resolver defaults to mobile-web | Mobile web is safest default host | Missing/unsupported host resolves to `mobile-web` |
| Mobile resolver preserves mobile-app when requested | Native app host policy can be intentionally selected | Requested `mobile-app` remains `mobile-app` |
| Flow forces reducedMotion true on mobile | Flow is static on mobile | Mobile Flow boundary returns `reducedMotion: true` even when false is requested |
| Reduced transparency gives zero blur / solid opacity where bridge supports it | Accessibility preference overrides material identity | Flow mobile with reduced transparency returns `--luca-material-blur: 0px` |
| Material maps match bridge variable contract | Boundaries return expected Luca Material keys | Dashboard/mobile material maps contain the bridge variable names |
| Status/safety variable names are excluded | Skins cannot recolor semantic safety state | Material keys do not contain danger, warning, success, info, approval, permission, blocked, voice, listening, vision, screen, or stop |

---

## Boot/onboarding planning note

Boot/onboarding planning is the next stage after dashboard/mobile QA. Implementation should wait until this QA checklist is green, and boot/onboarding skin work must preserve readiness/status semantics.

## 7. Recommended next stage

After this QA matrix exists and the checklist is green, the recommended next planning PR is:

`feat(ui): add LucaOS boot and onboarding skin planning`

Boot/onboarding implementation should **not** start until this QA checklist is green. Planning should remain separate from implementation, preserve runtime readiness boundaries, and keep Flow static until static desktop/mobile/settings behavior is proven safe.
