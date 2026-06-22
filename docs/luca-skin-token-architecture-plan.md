# LucaOS Skin Token Architecture Plan

**Type:** Implementation architecture plan (documentation-only)  
**Status:** Plan. No source, runtime, theme behavior, onboarding behavior, boot behavior, or asset changes are made by this document.  
**Date:** 2026-06-22  
**Target PR:** `docs(ui): plan LucaOS skin token architecture`  
**Primary spec:** `docs/luca-skin-system.md`

Read together with:

- `docs/luca-material-system.md`
- `docs/theme-regression-audit.md`
- `docs/luca-interface-founder-decisions.md`
- `docs/luca-interface-refinement-roadmap.md`
- `docs/luca-top-ai-interface-pattern-audit.md`
- `docs/luca-top-ai-interface-ux-verdict.md`

> Shared direction: **"LucaOS should feel like a quiet operating system for intelligence, not a dashboard for controlling intelligence."**

> Skin framing: **"LucaOS skins are not decorations; they are the visual operating environments for an AI-native OS."**

---

## 1. Executive summary

LucaOS needs a skin-token layer **above** the current Luca Material system because skins describe a full operating environment: background language, material behavior, accent discipline, typography mood, boot identity, motion personality, widget/overlay treatment, and host-specific adaptation. The current Luca Material system already provides the enforcement layer for panels, cards, controls, overlays, HUDs, sheets, sidebars, web fallbacks, and mobile surfaces. That enforcement layer should remain the component-facing contract.

The safest architecture is therefore:

1. **Skin tokens define environment intent.** Pearl, Carbon, Flow, and Canvas describe the desired OS mood and raw visual profile.
2. **The material bridge translates skin intent into existing Luca appearance/material variables.** Skin variables should feed `--luca-background-*`, `--luca-surface-*`, `--luca-text-*`, `--luca-accent-*`, and `--luca-material-*` slots later.
3. **Existing material roles keep enforcing component safety.** Components should continue consuming `lucaMaterial*` roles, shell helpers, mobile shell helpers, and Luca appearance tokens instead of reaching directly into skin definitions.
4. **The first implementation must be incremental, reversible, and host-aware.** It should begin as inert type/config scaffolding, then CSS variable registration, then bridge wiring, then carefully scoped consumers.
5. **Boot and onboarding integration should be planned separately from runtime behavior.** Skinning boot visuals is an identity concern; boot readiness, watchdogs, degraded recovery, onboarding persistence, and runtime startup behavior must stay untouched until a dedicated future PR.
6. **No source implementation happens in this PR.** This document only defines the future architecture and boundaries.

---

## 2. Existing architecture review

### `src/styles/lucaMaterialSystem.ts`

- **Current role:** Centralized semantic material engine for root backgrounds, panels, floating panels, sidebars, sheets, popovers, dialogs, overlays, HUDs, resizable handles, mobile panels, mobile sheets, and browser-safe fallback surfaces.
- **Current token responsibilities:** Reads existing Luca appearance variables such as `--luca-background-base`, `--luca-background-elevated`, `--luca-surface-glass`, `--luca-surface-solid`, `--luca-border-subtle`, `--luca-text-primary`, `--luca-accent-primary`, `--luca-shadow-soft`, and `--luca-blur-level`. It also exposes `--luca-material-*` override slots for opacity, blur, tint strength, border strength, shadow strength, and saturation.
- **What should remain untouched:** Component-facing material roles, resolver names, mobile/web fallback behavior, status-token usage, and fallback chains should remain the enforcement layer. Future skin work should not make components bypass this module.
- **How skin tokens should eventually connect:** Skin CSS variables should be mapped into Luca appearance/material variables upstream or through a bridge, so `lucaMaterialSystem.ts` receives already-resolved values and continues to render the same semantic roles.

### `src/styles/lucaShellStyles.ts`

- **Current role:** Legacy/shared shell helper layer that exports common constants and `CSSProperties` for shell surfaces, hover states, borders, text, accent indicators, shadows, blur, tabs, controls, dividers, and workspace backgrounds.
- **Current token responsibilities:** Wraps `--luca-*` variables with `--app-*` fallbacks, for example `--luca-surface-glass`, `--luca-surface-hover`, `--luca-border-subtle`, `--luca-text-primary`, `--luca-accent-primary`, and `--luca-blur-level`.
- **What should remain untouched:** Existing fallbacks and helper names should remain stable because many shell/layout components depend on them. This layer should not become a skin registry.
- **How skin tokens should eventually connect:** Skin values should flow into the Luca variables already consumed here. The shell helpers then inherit the active skin without being rewritten.

### `src/styles/lucaMobileShellStyles.ts`

- **Current role:** Mobile-specific shell styling layer for app backgrounds, content surfaces, cards, glass controls, navigation, panels, sheets, dividers, muted text, tabs, active indicators, and mobile class names.
- **Current token responsibilities:** Reads the same Luca appearance variables with mobile-safe priorities: stable background/elevated/solid/glass surfaces, subtle/strong borders, primary/secondary/tertiary text, accent, and soft shadow.
- **What should remain untouched:** Mobile-specific safe defaults, touch clarity, stable solid surfaces, and reduced visual complexity should remain. Mobile should not inherit desktop Flow-style blur/motion directly.
- **How skin tokens should eventually connect:** Host/platform policy should reduce blur, simplify motion, and prefer solid fallbacks before skin values reach the mobile shell variables.

### `src/styles/lucaMaterialSettings.ts`

- **Current role:** Host policy and settings-to-material resolver for component-level material behavior across `desktop-app`, `desktop-web`, `mobile-app`, and `mobile-web`.
- **Current token responsibilities:** Resolves host policy, caps material blur, handles reduced transparency by disabling material blur, preserves high-contrast/border upstream behavior, and writes material CSS variable slots from appearance settings.
- **What should remain untouched:** The four-host vocabulary and conservative blur policy should remain the model for skin host behavior. The double-apply guard for opacity/tint should not be broken.
- **How skin tokens should eventually connect:** A future skin host policy can either reuse this module directly or sit beside it and feed its resolved values into `getLucaMaterialCssVariables`, avoiding a second independent host-policy stack.

### `src/config/lucaAppearanceTokens.ts`

- **Current role:** Main resolver for Luca appearance tokens and CSS variable state. It translates legacy themes/personas, product themes, accents, appearance mode, platform appearance, opacity/blur, reduced motion, reduced transparency, and high contrast into `--luca-*`, `--app-*`, and material variables.
- **Current token responsibilities:** Owns base/elevated/liquid backgrounds, glass/solid/hover surfaces, borders, text, accent, status colors, shadows, blur, motion style, and accessibility flags.
- **What should remain untouched:** Existing legacy theme compatibility, dynamic contrast behavior, reduced transparency/high contrast handling, status colors, and `--app-*` compatibility fallbacks should remain until a dedicated migration proves parity.
- **How skin tokens should eventually connect:** A skin bridge should feed this resolver or a sibling bridge with skin-selected values. Safety/status tokens should remain outside skin override control.

### Settings UI related to theme/appearance

Discoverable appearance settings include `src/components/settings/SettingsGeneralTab.tsx` and related settings panel modules, plus onboarding visual controls described below.

- **Current role:** Exposes theme/persona, appearance, opacity, blur, and accessibility-oriented settings to users. The existing sliders provide immediate feedback by writing root CSS variables while the persisted path updates settings and emitted CSS variable state.
- **Current token responsibilities:** User-facing controls currently target legacy theme IDs, background opacity, background blur, reduced transparency, reduced motion, and high contrast settings.
- **What should remain untouched:** Existing settings behavior, persistence keys, slider semantics, and immediate-preview behavior should not change in this PR. Future skin settings should not opportunistically rewrite unrelated settings panels.
- **How skin tokens should eventually connect:** Add a skin picker and preview as a new focused settings surface after config/registry/bridge scaffolding exists. Settings should write a selected skin ID, not raw component styles.

### Boot and onboarding files

Discoverable boot/onboarding touchpoints include `src/hooks/app/useAppSystem.ts`, `src/components/Onboarding/OnboardingFlow.tsx`, `src/components/Onboarding/ThemeSelectionStep.tsx`, and onboarding visual subcomponents such as `MessageBubble`, `MessageInput`, `FaceScan`, and related permission/voice steps.

- **Current role:** `useAppSystem` governs actual boot sequencing, watchdogs, degraded recovery, and runtime readiness. Onboarding components manage first-run user flow, visual theme selection, local preview state, voice/face permission steps, and persisted visual settings.
- **Current token responsibilities:** Onboarding currently manipulates legacy visual variables such as `--app-primary`, `--app-text-main`, `--app-text-muted`, `--app-border-main`, `--app-bg-tint`, `--app-bg-opacity`, and `--app-bg-blur` for live preview.
- **What should remain untouched:** Boot readiness, recovery behavior, watchdogs, permission behavior, voice runtime, face scan runtime, and onboarding progression should not be touched by skin work until a dedicated boot/onboarding PR.
- **How skin tokens should eventually connect:** Boot/onboarding should eventually consume only boot-specific skin variables and preview metadata. Runtime readiness must remain independent of skin visual selection.

### Dashboard/layout files

Relevant dashboard/layout touchpoints include `src/components/dashboard/LucaDashboardSurface.tsx`, `src/components/layout/ChatPanel.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/OperationsSidebar.tsx`, `src/components/layout/OverlayManager.tsx`, `src/components/layout/FloatingPanel.tsx`, `src/components/layout/PanelResizer.tsx`, `src/components/ChatWidgetInput.tsx`, and mobile shell components under `src/components/mobile/`.

- **Current role:** These files compose the OS-like shell: left capability access, center workspace/composer, right operational truth, overlays, floating panels, input surfaces, and mobile reductions.
- **Current token responsibilities:** Recent material work moved many default/basic shell surfaces toward Luca Material roles and shell/mobile helpers, while advanced/tactical surfaces remain intentionally specialized.
- **What should remain untouched:** Runtime behavior, composer affordances, voice/stop controls, model routing, right-panel truth, advanced/debug visuals, and mobile navigation behavior should remain unchanged in a skin architecture PR.
- **How skin tokens should eventually connect:** Dashboard/root background may consume skin background variables first. Component panels should continue consuming Luca Material roles rather than direct skin variables.

---

## 3. Proposed architecture layers

### Layer 1 — Skin definition

Static config objects define official launch skins:

- **Pearl** — recommended calm light identity.
- **Carbon** — neutral professional dark identity.
- **Flow** — signature liquid/morph identity with strict fallbacks.
- **Canvas** — warm editorial paper identity.

Definitions should remain data-only: no DOM writes, no asset imports, no motion runtime, and no component coupling.

### Layer 2 — Skin token registry

The registry resolves a selected skin definition into conceptual CSS variables such as `--luca-skin-bg-base`, `--luca-skin-accent-primary`, and `--luca-skin-motion-speed`. It should be pure and testable: selected skin + host policy + accessibility flags in, CSS variable map out.

### Layer 3 — Material bridge

The bridge maps skin variables into existing Luca Material/appearance variables for:

- background
- surface
- text
- accent
- glass opacity
- blur
- border strength
- shadow strength

This bridge is where skin intent becomes usable by existing `lucaMaterialSystem.ts`, `lucaShellStyles.ts`, and `lucaMobileShellStyles.ts`. It should not replace material roles.

### Layer 4 — Host/platform policy

Host policy applies per-context constraints:

- `desktop-app`
- `desktop-web`
- `mobile-app`
- `mobile-web`

The existing `lucaMaterialSettings.ts` host-policy vocabulary should be reused where possible, rather than inventing an incompatible skin-specific host model.

### Layer 5 — Accessibility overrides

Accessibility rules resolve after base skin and host policy:

- reduced transparency
- reduced motion
- contrast safety
- safety-state protection
- mobile touch clarity

Overrides should be hard constraints, not skin preferences.

### Layer 6 — Surface consumers

Consumers should adopt skins gradually and only at the right abstraction level:

- Boot
- Onboarding
- Dashboard/root shell
- Composer area
- MiniChat
- Luca Widget
- VoiceHUD
- Mobile shell

Surface consumers should generally consume Luca Material roles or bridged Luca variables, not raw skin definitions.

---

## 4. Proposed config shape

This is a conceptual TypeScript-like shape only. Do not implement it in this PR.

```ts
type LucaSkinId = "pearl" | "carbon" | "flow" | "canvas";

type LucaSkinModeAffinity = "light" | "dark" | "adaptive" | "warm";
type LucaSkinHostKind = "desktop-app" | "desktop-web" | "mobile-app" | "mobile-web";

type LucaSkinDefinition = {
  id: LucaSkinId;
  name: string;
  recommendedDefault?: boolean;
  modeAffinity: LucaSkinModeAffinity;
  backgroundProfile: {
    base: string;
    elevated: string;
    ambient: string;
    hero: string;
    pattern: "solid" | "gradient" | "ambient" | "liquid" | "wallpaper";
  };
  materialProfile: {
    glassOpacity: number;
    glassBlurPx: number;
    borderStrength: number;
    shadowSoft: string;
    shadowFloat: string;
    profile: "solid" | "glass" | "liquid-glass" | "paper" | "graphite";
  };
  accentProfile: {
    primary: string;
    secondary: string;
    glow: string;
  };
  typographyProfile: {
    primary: string;
    secondary: string;
    tertiary: string;
    mood: "system-clean" | "editorial" | "developer" | "futuristic-calm";
  };
  bootProfile: {
    background: string;
    orb: string;
    highlight: string;
    motion: "calm" | "minimal" | "fluid";
  };
  motionProfile: {
    speed: string;
    softness: string;
    glow: string;
    reducedMotionFallback: boolean;
  };
  hostPolicyHints?: Partial<Record<LucaSkinHostKind, {
    maxBlurPx?: number;
    preferSolidFallback?: boolean;
    allowAmbientMotion?: boolean;
  }>>;
};
```

Repo-grounded adjustments from the initial spec:

- Add `recommendedDefault` so Pearl can be recommended without hardcoding that choice in UI copy.
- Add `hostPolicyHints` as optional metadata only; the actual enforcement should still happen in the existing host-policy resolver/bridge.
- Keep status/safety colors out of the skin definition so danger/warning/error/approval semantics remain unambiguous.

---

## 5. CSS variable contract

These variables are conceptual first-implementation contracts. They should be registered before broad visual migration and bridged into existing Luca variables later.

### Skin background variables

- `--luca-skin-bg-base`
- `--luca-skin-bg-elevated`
- `--luca-skin-bg-ambient`
- `--luca-skin-bg-hero`

### Skin material variables

- `--luca-skin-glass-opacity`
- `--luca-skin-glass-blur`
- `--luca-skin-border-strength`
- `--luca-skin-shadow-soft`
- `--luca-skin-shadow-float`

### Skin accent variables

- `--luca-skin-accent-primary`
- `--luca-skin-accent-secondary`
- `--luca-skin-accent-glow`

### Skin text variables

- `--luca-skin-text-primary`
- `--luca-skin-text-secondary`
- `--luca-skin-text-tertiary`

### Skin boot variables

- `--luca-skin-boot-bg`
- `--luca-skin-boot-orb`
- `--luca-skin-boot-highlight`

### Skin motion variables

- `--luca-skin-motion-speed`
- `--luca-skin-motion-softness`
- `--luca-skin-motion-glow`

### Later bridge targets

Do not implement these mappings yet. The planned bridge is:

| Skin variable | Later Luca variable target | Notes |
| --- | --- | --- |
| `--luca-skin-bg-base` | `--luca-background-base` | Root/app base after host policy. |
| `--luca-skin-bg-elevated` | `--luca-background-elevated` | Workspace/elevated background. |
| `--luca-skin-bg-ambient` | `--luca-background-liquid` | Only where host policy allows ambient/liquid identity. |
| `--luca-skin-glass-opacity` | `--luca-material-opacity` | Preserve existing double-apply guard. |
| `--luca-skin-glass-blur` | `--luca-material-blur` / `--luca-blur-level` | Must be capped per host and disabled for reduced transparency. |
| `--luca-skin-border-strength` | `--luca-material-border-strength` | High contrast may override upward. |
| `--luca-skin-shadow-soft` | `--luca-shadow-soft` | Keep shadows restrained in default/basic surfaces. |
| `--luca-skin-shadow-float` | `--luca-material-shadow` / future float slot | Use only for semantic floating surfaces. |
| `--luca-skin-accent-primary` | `--luca-accent-primary` | Do not override semantic status colors. |
| `--luca-skin-accent-secondary` | `--luca-accent-soft` | Secondary/soft active treatment. |
| `--luca-skin-accent-glow` | `--luca-shadow-glow` | Must stay minimal except active/presence surfaces. |
| `--luca-skin-text-primary` | `--luca-text-primary` | Must pass contrast rules. |
| `--luca-skin-text-secondary` | `--luca-text-secondary` | Must pass readability rules. |
| `--luca-skin-text-tertiary` | `--luca-text-tertiary` | Never too faint on mobile. |
| `--luca-skin-boot-*` | future boot-only variables | Dedicated boot/onboarding PR only. |
| `--luca-skin-motion-*` | future motion variables | Reduced-motion fallback required. |

---

## 6. Official skin architecture notes

### Pearl

- Light default and recommended default.
- Soft white/pearl base, never harsh pure-white walls.
- Low blur and restrained translucency.
- High readability and generous spacing.
- Minimal glow; accent appears mainly for active/primary states.
- Should bridge cleanly to existing light Luca Material roles.

### Carbon

- Charcoal/dark graphite identity.
- Professional developer dark, not cyberpunk and not neon.
- Neutral dark surfaces with restrained translucency.
- Strong readability for long focused sessions.
- Glow appears only for focus/active states and must remain controlled.
- Should bridge to dark Luca Material roles without reviving terminal/hacker defaults.

### Flow

- Liquid/morph gradient identity.
- Ambient animation only when motion is allowed.
- Reduced-motion fallback is required and should resolve to a static ambient gradient.
- Reduced-transparency fallback is required and should resolve to stable solid/elevated surfaces.
- Motion must never compete with the composer, VoiceHUD state, approval/safety states, or content.
- Should be implemented after static skin plumbing is stable.

### Canvas

- Warm cream/editorial identity.
- Matte or paper-like material, with low/no blur.
- Warmth cannot reduce text/control contrast.
- Glow should be nearly absent.
- Should support reading/writing comfort with text-forward hierarchy.
- Should bridge to solid/elevated Luca Material roles more than glass roles.

---

## 7. Host/platform behavior

### `desktop-app`

- Can support the richest material, glass, and motion profile.
- May allow stronger ambient backgrounds where native-window/root policy supports it.
- Still respects reduced motion and reduced transparency.
- Should remain composer-first and quiet, not visually theatrical by default.

### `desktop-web`

- Should use less aggressive blur and motion than desktop-app.
- Must provide browser-performance-safe fallbacks.
- Glass should be internal page material over Luca backgrounds, not an assumption that the browser can expose a desktop window material.
- Flow animation should be conservative and optional.

### `mobile-app`

- Should use less blur, simpler motion, strong touch clarity, and reduced visual density.
- Mobile shell should prefer stable surfaces and component clarity over desktop-style depth.
- Ambient identity can be present, but panels/controls must stay readable and thumb-friendly.

### `mobile-web`

- Safest fallback.
- Minimal motion.
- Limited blur.
- Strong contrast.
- Solid/elevated surfaces should be preferred when performance or accessibility is uncertain.

Use the current material host-policy approach wherever possible. Skin policy should be an extension of the existing `desktop-app` / `desktop-web` / `mobile-app` / `mobile-web` model, not a competing policy system.

---

## 8. Accessibility and safety constraints

Hard requirements:

- Safety, approval, error, warning, and danger states must not be skin-overridden into ambiguity.
- Active voice/listening state must remain visible.
- Active vision/screen-context state must remain visible.
- Stop generation must remain clear and immediately recognizable.
- Reduced transparency disables heavy blur and liquid glass dependence.
- Reduced motion disables morph/liquid animation and parallax-like ambient movement.
- High contrast mode must preserve text, controls, borders, and focus visibility.
- Mobile touch clarity cannot be reduced by translucency, low contrast, tiny targets, or noisy backgrounds.
- Skins cannot change runtime behavior, capability access, routing, permissions, safety flow, boot readiness, or governance.

These constraints should be enforced after skin selection and before variables reach consumers.

---

## 9. Boot and onboarding integration plan

Plan only. Do not implement in this PR.

Future integration points:

- Boot background via `--luca-skin-boot-bg`.
- Boot orb/symbol via `--luca-skin-boot-orb` and `--luca-skin-boot-highlight`.
- Splash/loading skin profile derived from `bootProfile`.
- Onboarding skin picker.
- Live preview cards for Pearl, Carbon, Flow, and Canvas.
- Opacity/blur preview that uses the same capped material policy as runtime.
- Reduced motion/transparency preview so users understand Flow and glass fallbacks.
- Default skin recommendation, with Pearl marked as recommended.

Boot/onboarding source implementation must be its own future PR. It must not touch runtime boot readiness behavior, watchdogs, degraded recovery, service initialization, permission flow, voice runtime, or face/vision runtime. Boot skinning is visual identity only.

---

## 10. Settings integration plan

Plan only. Do not change settings source yet.

Future settings could expose:

- Selected skin.
- Skin preview cards.
- Relationship to light/dark/adaptive modes.
- Opacity controls, using existing material opacity safeguards.
- Blur controls, using existing host caps and reduced-transparency behavior.
- Reduced transparency/reduced motion compatibility indicators.
- Reset to default, likely Pearl + existing safe appearance defaults.

Settings should persist a skin ID and let the registry/bridge resolve variables. Settings should not write raw component styles and should not bypass `lucaAppearanceTokens.ts` or the material host policy.

---

## 11. Migration sequence

### PR 1 — skin type/config scaffolding

- Add skin type definitions.
- Add static skin definitions for Pearl, Carbon, Flow, and Canvas.
- Add metadata only; no UI consumption yet.
- No DOM writes and no CSS variable application.

#### Scaffolding status

- `src/config/lucaSkins.ts` now contains inert official skin definitions.
- No skin variables are applied yet.
- No UI consumes skins yet.
- Next PR should be the skin CSS variable registry.

### PR 2 — skin CSS variable registry

- Resolve selected skin into `--luca-skin-*` variables.
- Keep registry inert or behind a controlled application point.
- No broad visual migration yet.

#### Registry status

- `src/styles/lucaSkinRegistry.ts` now resolves selected skins into `--luca-skin-*` variables.
- The registry is pure/inert.
- It does not apply variables to the DOM.
- It does not bridge into Luca Material variables yet.
- No UI consumes the registry yet.
- Next PR should be the material bridge.

### PR 3 — material bridge

- Map skin variables into Luca Material/appearance variables.
- Verify existing material roles still work.
- Preserve status tokens, accessibility overrides, and host caps.

### PR 4 — settings preview only

- Add skin metadata and preview UI.
- Preview should show material profiles without changing dashboard/boot consumption.
- No boot/dashboard consumption yet.

### PR 5 — dashboard shell consumption

- Root/dashboard background consumes bridged skin background.
- Component material still flows through Luca Material roles.
- Composer remains visually dominant and protected.

### PR 6 — boot/onboarding integration

- Boot background/orb/onboarding preview.
- No runtime readiness behavior changes.
- No watchdog, service, voice, permission, or recovery behavior changes.

### PR 7 — mobile shell consumption

- Mobile-safe skin application.
- Reduced blur/motion by default.
- Strong touch clarity and contrast verified.

### PR 8 — Flow motion pass

- Add liquid/morph motion with reduced-motion fallback.
- Only after static skins are stable.
- Motion remains background-level and never competes with composer/content.

---

## 12. Files likely to be added later

Likely future files, adjusted to current repo structure:

- `src/config/lucaSkins.ts` — static official skin definitions and metadata.
- `src/styles/lucaSkinSystem.ts` — conceptual skin type helpers and bridge-level constants.
- `src/styles/lucaSkinRegistry.ts` — selected-skin-to-CSS-variable resolver.
- `src/components/settings/SkinPicker.tsx` — settings UI for selected skin.
- `src/components/settings/SkinPreviewCard.tsx` — reusable preview card for official skins.

Optional if the implementation becomes large:

- `src/styles/lucaSkinBridge.ts` — explicit mapping from `--luca-skin-*` variables to Luca appearance/material variables.
- `src/config/lucaSkinLabels.ts` — labels/descriptions if settings/onboarding need localized copy-like metadata.

---

## 13. Files likely to be touched later

| Future touchpoint | Likely files | Classification | Notes |
| --- | --- | --- | --- |
| Appearance settings | `src/components/settings/SettingsGeneralTab.tsx`, settings panel helpers | Safe after registry/bridge | Add selected skin and preview without changing existing controls first. |
| Theme settings / legacy theme bridge | `src/config/lucaAppearanceTokens.ts`, theme label/config files | Design-reviewed | Must preserve legacy theme compatibility and dynamic contrast. |
| Luca Material setting resolver | `src/styles/lucaMaterialSettings.ts` | Safe but careful | Reuse host policy and blur caps; avoid double opacity application. |
| App root token provider | Current root CSS-variable application path, possibly `src/App.tsx` in a future PR | Design-reviewed | This PR must not edit `App.tsx`; future edits should be tiny and isolated. |
| Dashboard shell | `src/components/dashboard/LucaDashboardSurface.tsx`, layout wrappers | Design-reviewed | Background/root only first; panels still via material roles. |
| Composer / chat shell | `src/components/layout/ChatPanel.tsx`, `src/components/ChatWidgetInput.tsx` | Design-reviewed | Composer must not lose priority or stop/voice clarity. |
| Boot components/system | boot visual components, `src/hooks/app/useAppSystem.ts` only if absolutely necessary | Deferred | Boot visuals only; boot readiness behavior must not change. |
| Onboarding components | `src/components/Onboarding/*` | Deferred/design-reviewed | Add picker/preview separately from runtime onboarding behavior. |
| MiniChat / widget visual containers | MiniChat/widget components | Design-reviewed | Overlay should feel lighter than dashboard and preserve entry behavior. |
| VoiceHUD | Voice HUD visual container only | Deferred | Voice runtime and listening state clarity are high-risk. |
| Mobile shell | `src/components/mobile/*`, `src/styles/lucaMobileShellStyles.ts` | Design-reviewed | Prefer reduced blur/motion and strong touch clarity. |
| Advanced/tactical/debug visuals | visual/debug/tactical areas | Deferred | Do not use skins to redesign specialized surfaces. |

---

## 14. Strict boundaries

Do not:

- Change source/runtime behavior in this PR.
- Implement skin config in this PR.
- Edit `App.tsx`.
- Edit `README`.
- Touch onboarding implementation.
- Touch boot implementation.
- Touch voice runtime.
- Touch browser runtime.
- Touch LucaLink behavior.
- Touch memory, governance, model routing, or services.
- Touch tactical/debug/advanced visuals.
- Add screenshots, assets, or logos.
- Copy Apple, Claude, ChatGPT, Gemini, Cursor, or other competitor UI directly.
- Use competitor names in skin names.
- Add actual image assets.

This document intentionally proposes future files and PRs only. It does not authorize implementation in this PR.

---

## 15. Validation

Required validation for this documentation-only PR:

- Run `git diff --check`.
- Build is not required because this is docs-only.
- If a build or type-check is run and fails from known repo-wide issues, document it as unrelated.

Success criteria:

- Only `docs/luca-skin-token-architecture-plan.md` is added.
- No source/runtime files change.
- No assets are added.
- No existing theme, boot, onboarding, voice, browser, service, routing, memory, governance, LucaLink, or tactical/debug behavior changes.
