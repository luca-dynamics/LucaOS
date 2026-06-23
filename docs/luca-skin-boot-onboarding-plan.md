# LucaOS Skin Boot and Onboarding Plan

**Type:** Boot/onboarding application plan (documentation-only)  
**Status:** Plan. No runtime, source, visual style, provider, root, boot, onboarding, MiniChat, VoiceHUD, Flow motion, DOM, asset, or screenshot changes are made by this document.  
**Date:** 2026-06-23  
**Target PR:** `docs(ui): plan LucaOS boot and onboarding skin application`

Read together with:

- `docs/luca-skin-system.md`
- `docs/luca-skin-token-architecture-plan.md`
- `docs/luca-skin-application-boundaries.md`
- `docs/luca-skin-mobile-safety-audit.md`
- `docs/luca-skin-mobile-qa-matrix.md`
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

Dashboard and mobile skin boundaries now exist. LucaOS can persist `settings.general.selectedSkinId`, normalize invalid values back to Pearl, resolve selected skins through pure registry/bridge helpers, and apply material variables at controlled desktop dashboard and local mobile shell boundaries.

Boot and onboarding are still intentionally unskinned. They remain on the existing boot, post-boot, first-run, and setup visuals until a dedicated implementation sequence proves the boundaries.

Boot/onboarding are higher-risk than dashboard polish because they touch first-run trust, readiness indicators, loading state, degraded-state communication, model/voice setup choices, permission-sensitive setup, and completion flow. A skin can make LucaOS feel premium, but it must never make users doubt whether the OS is ready, blocked, degraded, listening, asking permission, or still preparing.

Implementation must therefore be planned before any visual changes. The next work should be pure helper architecture only, not boot or onboarding visual application.

---

## 2. Current skin application state

- **Settings preview exists.** Local preview metadata and preview cards represent Pearl, Carbon, Flow, and Canvas without applying skins globally.
- **Selected skin persistence exists.** The selected skin is persisted as `settings.general.selectedSkinId`; invalid or missing values fall back to Pearl.
- **Desktop dashboard boundary exists.** Dashboard skin variables are resolved and applied at a local dashboard shell boundary, not a root provider.
- **Mobile shell boundary exists.** Mobile skin variables are resolved for mobile host policy and applied at the local mobile shell boundary.
- **Boot/onboarding do not have skin application yet.** Boot, post-boot loading, mode select, onboarding, and first-run setup should remain unchanged until a future scoped rollout.
- **MiniChat and VoiceHUD do not have dedicated skin application yet.** They should not be pulled into boot/onboarding skin work accidentally.
- **Flow remains static.** No liquid timers, keyframes, parallax, requestAnimationFrame loops, or ambient boot/onboarding motion should be introduced.

---

## 3. Boot/onboarding surface inventory

Likely boot and onboarding surfaces currently visible in the repo include:

### Boot window and boot readiness

- `src/components/boot/LucaBootVisualShell.tsx` — main LucaOS startup shell, startup copy, progress bar, readiness items, launch identity, and browser-safe boot presentation.
- `src/components/boot/lucaBootVisualShellModel.ts` — boot progress/readiness model and boot presence metadata.
- `src/hooks/app/useAppSystem.ts` — app boot sequencing, setup-complete routing, readiness/recovery orchestration.
- `src/services/runtime/lucaBootCopyModel.ts` — boot copy model for startup labels and diagnostics.
- `src/services/runtime/lucaBootExperienceMap.ts` — audit/map of current boot and first-run flows.
- `src/services/runtime/lucaBootRuntimeGuard.ts` — boot destination and runtime guard helpers.
- `src/config/bootstrapEntrySelector.ts` and `src/config/browserSafeBootResolver.ts` — browser/desktop boot entry and safe boot resolution.

### Boot loading and post-boot transition

- `src/web/postBoot/WebPostBootLoading.tsx` — web post-boot loading panel shown while post-boot state resolves.
- `src/web/postBoot/WebPostBootTransition.tsx` — web post-boot transition, continue/review actions, partial setup, permission attention, and model-route attention copy.
- `src/web/postBoot/webPostBootState.ts` — post-boot state classification including new-user and partial-setup paths.
- `src/web/WebLifecycleShell.tsx` — web lifecycle host that routes post-boot, onboarding, ready debug, and main shell states.

### Mode select and onboarding setup

- `src/components/Onboarding/OnboardingFlow.tsx` — first-run flow host, kernel-awakening, directive alignment, theme selection, identity, face scan, cognitive core selection, local/cloud provisioning, mode select, conversation, calibration, and completion.
- `src/components/Onboarding/ModeSelect.tsx` — text/voice conversation choice and model-route readiness warnings.
- `src/components/Onboarding/ThemeSelectionStep.tsx` — first-run theme, opacity, and blur controls with live preview behavior.
- `src/components/Onboarding/ConversationalOnboarding.tsx` and `src/components/Onboarding/OnboardingConversationSurface.tsx` — conversational setup surfaces.
- `src/components/Onboarding/MessageBubble.tsx` and `src/components/Onboarding/MessageInput.tsx` — setup conversation message surfaces and input.
- `src/components/Onboarding/FaceScan.tsx` — face/camera setup surface.
- `src/components/Onboarding/OnboardingAccessPanels.tsx` — identity verification and core selection panels.
- `src/components/Onboarding/OnboardingProvisioningPanel.tsx` and `src/components/Onboarding/OnboardingSystemPanels.tsx` — local/cloud provisioning, hardware scan, calibration, and completion panels.
- `src/components/Onboarding/OnboardingRuntimeAdapter.ts` plus `src/desktop/adapters/desktopOnboardingRuntime.ts` and `src/web/adapters/webOnboardingRuntime.tsx` — onboarding runtime abstraction and host adapters.
- `src/services/onboarding/OnboardingController.ts`, `OnboardingLifecycleService.ts`, `OnboardingModelModeCoordinator.ts`, and `OnboardingSetupService.ts` — setup sequencing, delays, mode/model readiness, and setup operations.

Do not change these files as part of this planning PR.

---

## 4. Risk assessment

- Boot readiness indicators must remain readable in every skin and host policy.
- Error, degraded, blocked, partial setup, and loading states must remain semantically stable.
- Status/safety colors cannot be controlled by skins: danger, warning, success, info, approval, permission, voice-live, listening, vision, screen-context, blocked, and stop states remain protected.
- Onboarding must not become visually noisy; first-run choices need calm hierarchy and low cognitive load.
- Flow must not animate during boot or onboarding.
- Reduced motion must be respected before any boot/onboarding variables reach a host boundary.
- Reduced transparency must force matte/solid, zero-blur-safe fallbacks.
- Boot performance must remain lightweight; no large assets, image textures, timers, loops, or expensive animated backgrounds.
- First-run trust must feel calm and premium, not theatrical, terminal-like, or game-like.
- Skin output must not obscure permission, model setup, voice setup, provider route, or local provisioning choices.
- Mobile and desktop boot/onboarding may need different host policies because small screens, browser chrome, safe areas, and app/native hosts carry different readability and performance risks.

---

## 5. Skin-by-skin boot/onboarding notes

### Pearl

- Safest default and fallback for invalid selected skin IDs.
- Best first-run experience: calm, bright, and premium without harsh white.
- Use a soft pearl background and gentle elevated panels.
- Preserve strong graphite readability for readiness, setup choices, and muted explanatory copy.

### Carbon

- Professional dark first-run mode for focused users.
- Must not become terminal, hacker, cyberpunk, neon, scanline, or game-like.
- Needs strong separation for progress/loading panels, route warnings, permissions, and setup cards.
- Use restrained graphite depth and quiet accents rather than glow-heavy effects.

### Flow

- Static only.
- No animated boot liquid motion yet.
- Can express a soft ambient identity behind setup only when content remains dominant.
- Reduced motion is always respected, and boot/onboarding Flow should remain static even when reduced motion is not enabled.

### Canvas

- Warm matte onboarding identity with an editorial setup feel.
- Strong contrast is required on cream and warm elevated surfaces.
- Prefer low/no blur and stable matte panels.
- No paper texture assets; warmth should come from variables, not images.

---

## 6. Proposed architecture

Future work should introduce a pure boot/onboarding boundary resolver, for example:

`src/styles/lucaBootSkinBoundary.ts`

The resolver should return local material variables for boot and onboarding boundaries. It should be data/policy plumbing only, similar in spirit to the dashboard and mobile boundary helpers.

Likely future exports:

```ts
LucaBootSkinBoundaryOptions
LucaBootSkinBoundaryState
resolveLucaBootSkinBoundary
```

The future helper should:

- Normalize invalid selected skin values to Pearl.
- Accept host kind, reduced motion, reduced transparency, and surface intent.
- Return a local CSS variable/material map for a specific boundary.
- Keep Flow static.
- Exclude safety/status tokens.
- Prefer desktop-web/desktop policy for desktop boot and mobile-web/mobile-app policy for mobile onboarding.

It should not:

- Mutate the DOM.
- Create a root provider.
- Affect runtime boot logic.
- Affect onboarding flow logic.
- Affect status/safety tokens.
- Add animation.
- Import runtime services.
- Change readiness, model routing, voice, browser, LucaLink, governance, or permissions.

---

## 7. Boundary rules

### Boot Window boundary

**Can receive:** background, elevated surface, text, restrained accent, matte/glass opacity, blur cap, border strength, and shadow variables scoped to the boot shell container.

**Must stay semantic/status-controlled:** readiness labels, warning/error/degraded colors, browser-safe status, and progress meaning.

**Must stay runtime-controlled:** boot sequence, BIOS/kernel/ready/onboarding routing, watchdogs, recovery, setupComplete routing, and browser-safe guards.

**Should not be skinned yet:** launch identity assets, boot animation behavior, readiness item logic, and global root variables.

### Boot Loading boundary

**Can receive:** panel surface, text, border, shadow, and calm background variables scoped to loading panels.

**Must stay semantic/status-controlled:** `aria-live`, `aria-busy`, loading/error semantics, partial setup attention, and permission/model-route attention states.

**Must stay runtime-controlled:** post-boot state resolution and continue/review routing.

**Should not be skinned yet:** loading motion, timers, progress semantics, transition timing, or any post-boot state machine behavior.

### Mode Select boundary

**Can receive:** local setup-panel surfaces, card materials, text hierarchy, and non-semantic accent treatment.

**Must stay semantic/status-controlled:** model-route warnings, voice readiness warnings, disabled/unsupported states, and permission attention.

**Must stay runtime-controlled:** text/voice choice handling, model readiness checks, STT/TTS/embedding readiness, realtime voice bridge updates, and route selection.

**Should not be skinned yet:** copy, mode options, voice/model routing behavior, or warning colors.

### Onboarding boundary

**Can receive:** local onboarding shell variables, setup card surfaces, warm/bright/dark/static ambient backgrounds, text hierarchy, border strength, and matte/solid fallbacks.

**Must stay semantic/status-controlled:** camera/face scan status, provisioning warnings, install errors, permission choices, route warnings, completion state, and safety copy.

**Must stay runtime-controlled:** onboarding step progression, visual setting persistence, local/cloud provisioning, identity/profile writes, setupComplete, voice state, and completion callbacks.

**Should not be skinned yet:** existing theme/opacity/blur live-preview behavior, setup sequence delays, onboarding motion, assets, or provider/model setup logic.

---

## 8. Host/accessibility policy

- Desktop boot can use desktop-web/desktop host policy. It should stay conservative until native desktop host behavior is explicitly audited.
- Mobile onboarding can use mobile-web/mobile-app host policy. Mobile-web should prefer solid fallbacks and stricter blur caps.
- Reduced motion must force static behavior.
- Reduced transparency must force matte/solid fallback and zero-blur-safe values.
- Flow remains static during boot/onboarding.
- No boot-time motion should be introduced until QA-approved.

---

## Boot resolver status

The pure boot/onboarding skin boundary resolver now exists at `src/styles/lucaBootSkinBoundary.ts`. It prepares local material variables only and does not apply skins to boot or onboarding UI yet. It supports `boot-window`, `boot-loading`, `mode-select`, and `onboarding` surface intents, with invalid skin values falling back to Pearl. Flow remains static with reduced motion forced for now, and reduced transparency is respected through the existing material bridge behavior. The next PR should apply the resolver to one local boot boundary only.

## 9. Implementation sequence

1. Documentation plan.
2. Pure boot/onboarding skin resolver.
3. Local boot boundary application.
4. Local onboarding boundary application.
5. Visual polish for boot/onboarding.
6. QA matrix update.
7. Flow motion research last, still optional.

---

## 10. Future tests

Expected tests for later implementation PRs:

- Invalid selected skin falls back to Pearl.
- Flow remains static.
- Reduced transparency sets safe matte/solid values.
- No root/global DOM mutation.
- No status/safety tokens in boot/onboarding material maps.
- Boot readiness/error states remain semantic.
- Onboarding controls remain readable.
- No boot/onboarding animation strings.
- No provider added.

---

## 11. Hard no-touch list

- No runtime boot logic changes.
- No onboarding flow logic changes.
- No root provider.
- No DOM/root mutation.
- No `document.documentElement`, `body`, or `html` mutation.
- No boot readiness mutation.
- No model routing changes.
- No voice/browser/LucaLink/governance changes.
- No MiniChat/VoiceHUD changes.
- No Flow motion.
- No status/safety token override.
- No assets/screenshots.
- No competitor UI copy.

---

## 12. Future boot/onboarding previews

Future previews should come after the pure resolver and before live application. They should be local-only previews of Boot Window, Boot Loading, Mode Select, and Onboarding materials. They must not apply variables to root, update persisted settings, add assets, or imply Flow motion.

---

## 13. Recommended next PR

Recommended next PR:

`feat(ui): add LucaOS boot skin boundary resolver`

That PR should still be pure/helper only. It should add no visual application, no provider, no DOM/root mutation, no boot/onboarding behavior changes, no Flow motion, and no status/safety token overrides.

## Local boot boundary application status

- The boot skin resolver is now applied to one local Boot Window shell boundary.
- No onboarding skin application exists yet.
- No mode-select skin application exists yet; mode select remains outside this local Boot Window application.
- No root/global DOM mutation is used for boot skin application.
- No runtime boot logic changes are part of the local boundary application.
- Readiness and status semantics remain protected from skin control.
- The next PR should be boot visual polish or local onboarding boundary planning/application, depending on QA results.

## Boot visual polish status

- Boot Window visual polish now exists inside the local Boot Window boundary: the decorative hologram bloom uses the skin accent (`--luca-accent-soft`) instead of a fixed status color, so Pearl, Carbon, Flow, and Canvas feel skin-native, and the readiness status labels use the secondary text role for stronger readability.
- No onboarding skin application exists yet.
- No mode-select skin application exists yet.
- No root/global DOM mutation occurs.
- No runtime boot logic changed (readiness, progress, error/recovery, and copy/model logic are untouched).
- No Flow motion was added; boot visuals remain static.
- Readiness/status semantics remain protected; no status/safety color is routed through skin decoration.
- The next PR should be a boot QA matrix update or local onboarding boundary planning, depending on QA.
