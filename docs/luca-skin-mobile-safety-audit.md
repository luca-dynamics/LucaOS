# LucaOS Skin Mobile Safety Audit

**Type:** Mobile safety audit (documentation-only)  
**Status:** Audit. No source, runtime, style, settings, dashboard, mobile shell, boot, onboarding, MiniChat, VoiceHUD, provider, DOM, or asset changes are made by this document.  
**Date:** 2026-06-23  
**Target PR:** `docs(ui): audit mobile safety for LucaOS dashboard skin inheritance`

Read together with:

- `docs/luca-skin-system.md`
- `docs/luca-skin-token-architecture-plan.md`
- `docs/luca-skin-application-boundaries.md`
- `src/config/lucaSkins.ts`
- `src/config/lucaSkinPreviewMetadata.ts`
- `src/styles/lucaSkinRegistry.ts`
- `src/styles/lucaSkinMaterialBridge.ts`
- `src/styles/lucaDashboardSkinBoundary.ts`
- `src/styles/lucaShellStyles.ts`
- `src/styles/lucaMobileShellStyles.ts`

> Shared direction: **"LucaOS should feel like a quiet operating system for intelligence, not a dashboard for controlling intelligence."**

> Skin framing: **"LucaOS skins are not decorations; they are the visual operating environments for an AI-native OS."**

---

## 1. Executive summary

Dashboard skin application now exists for LucaOS. The selected skin is persisted as `settings.general.selectedSkinId`, normalized back to Pearl when invalid or missing, resolved through the skin registry and material bridge, and applied at a local main dashboard shell boundary.

That boundary is intentionally not a root skin provider. It does not mutate `document.documentElement`, `body`, or `html`; it does not apply skins to boot, onboarding, MiniChat, VoiceHUD, or mobile-specific hosts; and it keeps Flow static. The current application path is therefore local to the main dashboard shell boundary, with shell visual polish consuming boundary-supplied Luca material variables.

Responsive and mobile views may still inherit some shell styling naturally when they render inside, near, or through shared dashboard markup and shared Luca variables. That inheritance can be useful, but it is not the same thing as a deliberate mobile skin boundary. Mobile surfaces have different constraints: smaller viewports, bottom navigation, touch targets, sheets, safe areas, browser transparency limits, battery pressure, and stricter readability needs.

Before LucaOS creates mobile-specific skin application, this audit defines the risks and the safest next rollout. Mobile should not receive a broad desktop skin transplant. The next mobile implementation should be pure/helper first: resolve the selected skin for a mobile host, cap blur aggressively, respect reduced motion and reduced transparency, keep Flow static, and avoid any visual UI application until the resolver behavior is proven.

---

## 2. Current state

### What exists

- **Skin definitions.** Pearl, Carbon, Flow, and Canvas are defined as static data with background, material, accent, typography, boot, motion, and host-policy hints. Unknown skin IDs normalize to Pearl.
- **Skin preview metadata.** Preview metadata describes local settings-preview labels, taglines, capabilities, accessibility notes, and design guardrails for the four launch skins.
- **Registry.** The registry resolves a selected skin into `--luca-skin-*` variables, applies host-policy hints, caps blur when configured, and forces static motion when reduced motion or host policy requires it.
- **Material bridge.** The bridge maps resolved skin variables into existing Luca appearance/material variables such as background, surface, text, accent, opacity, blur, border strength, and shadows while excluding safety/status variables.
- **Selected skin persistence.** The selected skin can be persisted as `settings.general.selectedSkinId`, with invalid or missing values falling back to Pearl.
- **Dashboard shell boundary.** A pure dashboard boundary resolver returns a local material-variable map and defaults to a safer `desktop-web` host when no host is supplied.
- **Dashboard shell visual polish.** Shared shell helpers consume boundary-supplied variables for static workspace depth, panel surfaces, text, shadow, and material blur without adding motion.

### What does not exist yet

- **No mobile-specific skin boundary.** There is no dedicated mobile resolver or local mobile shell boundary application yet.
- **No mobile-specific host policy application.** Mobile host behavior exists as skin host-policy hints, but no mobile shell application path intentionally applies those hints to a mobile boundary.
- **No boot/onboarding skin application.** Boot and onboarding remain outside skin application.
- **No MiniChat-specific skin application.** MiniChat has no dedicated skin host or surface treatment yet.
- **No VoiceHUD-specific skin application.** VoiceHUD has no dedicated skin host or surface treatment yet.
- **No Flow motion.** Flow remains static; there are no liquid timers, keyframes, parallax, or ambient animation wiring.

---

## 3. Mobile risk assessment

### Desktop blur values on mobile

Desktop blur can become expensive and visually muddy on phones. Flow's default material blur is especially risky if treated as a direct mobile value. Mobile must cap blur aggressively, and mobile-web should prefer solid or near-solid fallbacks because browser compositing, scroll containers, and low-end devices are less predictable.

### Flow glass and gradient density on mobile

Flow is the highest-risk launch skin on mobile because it combines liquid-glass material, gradient identity, glow, and future motion intent. On a phone, that density can compete with content, bottom navigation, sheets, and the composer. Flow mobile must be static only, use capped blur, and prefer solid fallback on mobile-web.

### Canvas contrast on cream surfaces

Canvas uses warm cream and editorial matte surfaces. The warmth is part of the identity, but cream surfaces can reduce perceived contrast for small text, muted labels, metadata, disabled controls, and dense panels. Mobile Canvas must keep foreground contrast strong and avoid texture or warmth that makes panels feel muddy.

### Carbon dark surface contrast

Carbon must stay charcoal and graphite, not pure black. On mobile, dark surfaces need readable separation among nav, cards, sheets, dividers, selected states, and inactive states. Too little contrast makes the shell feel flat; too much glow or neon breaks the professional Luca-native identity.

### Pearl over-brightness

Pearl is the safest default, but phone displays can make near-white surfaces feel harsh, especially in dark environments. Mobile Pearl should avoid hard pure white, preserve graphite text contrast, and use soft off-white depth rather than bright blank panels.

### Bottom nav readability

Mobile navigation is always-on wayfinding. Skin variables must not make inactive items disappear, active items over-glow, badges lose meaning, or the nav surface blend into content. Bottom navigation needs clear text/icon contrast, active-state separation, and stable borders on every skin.

### Touch target clarity

Mobile skin application must preserve finger-scale affordances. Glassy or gradient-heavy surfaces can blur button boundaries, chips, tabs, and sheet handles. Active, pressed, disabled, and focus states must stay visually distinct without relying on subtle color differences alone.

### Panels and sheets readability

Mobile panels and sheets carry dense content in constrained space. Skin output must preserve solid-enough surfaces, readable body text, strong enough dividers, and predictable elevation. Sheets should not become transparent overlays that expose noisy dashboard backgrounds beneath content.

### Performance and battery

Blur, translucency, large gradients, shadows, and future motion can increase GPU work and battery drain. Mobile rollout should treat static, solid, matte, and capped values as defaults. Motion must be opt-in later, and reduced motion must always win.

### Small-screen visual noise

The same amount of ambient depth that feels premium on desktop can feel noisy on a phone. Mobile should reduce background drama, glow, layered glass, and decorative gradients. Content, controls, and navigation must remain the dominant visual hierarchy.

### Overlay layering

Mobile overlays, sheets, popovers, permission surfaces, and status indicators can stack tightly. Skin application must not create ambiguous translucent layers or hide critical overlays behind glass/gradient treatments. Overlay priority and semantic state colors must remain independent from skin color.

### Safe area, notch, and viewport constraints

Mobile skin surfaces must respect notches, rounded corners, home indicators, dynamic viewport changes, keyboard resize, and browser chrome. Backgrounds can extend safely, but controls, nav, sheets, and panels need readable safe-area-aware placement and cannot depend on desktop viewport assumptions.

---

## 4. Skin-by-skin mobile notes

### Pearl

- Pearl is the safest default and should remain the fallback for invalid or missing selected skin IDs.
- Avoid harsh white on mobile; prefer soft pearl, off-white, and gentle elevated surfaces.
- Preserve graphite text contrast for body text, muted labels, nav items, controls, and sheet content.
- Keep blur restrained and never let bright glass wash out borders or controls.

### Carbon

- Keep Carbon charcoal and graphite, not pure black.
- Avoid neon, cyberpunk, hacker, terminal, scanline, or high-glow styling.
- Preserve readable dark UI through clear surface separation, restrained borders, and comfortable text contrast.
- Bottom nav, sheets, and inactive controls need enough contrast without becoming loud.

### Flow

- Flow must be static only on mobile for now.
- No liquid motion, parallax, timers, keyframes, or ambient animation should be introduced in the mobile rollout.
- Blur must be capped aggressively, lower than desktop, and especially conservative on mobile-web.
- Prefer solid fallback on mobile-web so glass depth does not harm readability, performance, or battery.
- Keep gradients behind the work, never competing with the composer, nav, panels, or status surfaces.

### Canvas

- Canvas should read as warm matte, not translucent glass.
- Use low blur or no blur on mobile.
- Contrast must remain strong on cream surfaces, especially for small text, metadata, nav labels, and panels.
- Do not add paper texture assets; warmth should come from tokens and matte surfaces only.

---

## 5. Host policy requirements

Mobile skin work should use host policy rather than shrinking desktop behavior.

- Use `hostKind: "mobile-app"` / `hostKind: "mobile-web"`, or the repo-equivalent mobile host vocabulary if a future resolver abstracts those names.
- Mobile-web should prefer safer blur and solid fallback because browser compositing and viewport behavior are less predictable.
- Reduced motion must win over skin motion. If a skin wants motion, host/accessibility policy must be able to force static values.
- Reduced transparency must force solid or matte fallback, zero blur, and fully readable surfaces.
- Flow must remain static on mobile even when reduced motion is not enabled.
- Host policy should resolve before variables reach mobile shell helpers, so mobile surfaces receive already-safe Luca material values.
- Status, safety, approval, voice-live, stop-generation, permission, danger, warning, success, and info variables must remain outside skin host policy and bridge output.

---

## 6. Recommended mobile rollout sequence

1. **Documentation audit.** Record mobile risks, hard boundaries, host-policy requirements, and rollout order before implementation.
2. **Pure helper for mobile skin boundary resolution.** Add a pure resolver that accepts selected skin, mobile host kind, reduced motion, and reduced transparency; returns local material variables; falls back to Pearl; and performs no DOM or UI application.
3. **Mobile shell local boundary application.** Apply the resolved variables only to a clearly scoped mobile shell container after the helper is reviewed.
4. **Mobile visual QA/polish.** Tune readability, bottom nav clarity, panels, sheets, touch targets, safe areas, and per-skin mobile feel without broadening the boundary.
5. **Boot/onboarding later.** Keep boot and onboarding out of mobile shell rollout until dashboard and mobile static behavior are proven.
6. **Flow motion last.** Add any liquid/morph motion only after static skins pass mobile QA, and only with reduced-motion and reduced-transparency fallbacks.

---

## 7. Recommended next PR

Recommended implementation PR:

`feat(ui): add LucaOS mobile skin boundary resolver`

This PR should be Codex and should be pure/helper first:

- No visual UI application yet.
- No mobile shell style changes yet.
- No App/root provider.
- No DOM mutation.
- No boot/onboarding, MiniChat, or VoiceHUD changes.
- No Flow motion.
- Include resolver tests for Pearl fallback, mobile host policy, blur caps, reduced motion, reduced transparency, and no status/safety variables.

---

## 8. Hard no-touch list

Future mobile skin PRs must not touch the following unless a dedicated PR explicitly scopes that work:

- No App root provider.
- No `document.documentElement` mutation.
- No `body` / `html` mutation.
- No boot/onboarding.
- No MiniChat-specific skinning.
- No VoiceHUD-specific skinning.
- No Flow motion.
- No runtime services.
- No model routing.
- No browser, voice, or LucaLink behavior.
- No safety/status token override.

---

## 9. Validation checklist for future mobile PR

Future mobile implementation PRs should validate:

- Selected skin fallback to Pearl.
- `hostKind` mobile applied.
- Blur capped.
- Reduced motion respected.
- Reduced transparency respected.
- No Flow animation.
- No global DOM mutation.
- No status/safety variables.
- Bottom nav readable.
- Touch targets readable.
- Dashboard panels readable.
- Mobile shell does not inherit desktop-only assumptions.
