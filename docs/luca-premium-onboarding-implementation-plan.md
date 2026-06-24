# Premium LucaOS Onboarding Implementation Plan

**Type:** Implementation plan (documentation-only)  
**Status:** Planning. No source, runtime, UI, service, skin, asset, test, routing, resolver, boundary, Web Safe Mode, onboarding component, boot component, post-boot component, or provider/model behavior changes are made by this document.  
**Date:** 2026-06-24  
**Target PR:** `docs(ui): plan premium onboarding screen implementation`  
**Recommended next PR:** `feat(ui): add premium onboarding copy model`

Read together with:

- `docs/luca-premium-onboarding-postboot-design.md`
- `docs/luca-boot-onboarding-product-experience-audit.md`
- `docs/luca-skin-boot-onboarding-plan.md`
- `docs/luca-skin-application-boundaries.md`
- `docs/luca-postboot-readiness-bridge-implementation-plan.md`
- `docs/luca-postboot-readiness-bridge-qa-matrix.md`
- `src/components/Onboarding/OnboardingFlow.tsx`
- `src/components/Onboarding/*`
- `src/web/WebLifecycleShell.tsx`
- `src/web/postBoot/webPostBootState.ts`
- `src/hooks/app/useAppSystem.ts`
- `src/styles/lucaMaterialSystem.ts`
- `src/config/lucaSkins.ts`
- `src/styles/lucaSkinRegistry.ts`

> Product direction: **"LucaOS should feel like a quiet operating system for intelligence, not a dashboard for controlling intelligence."**

> Onboarding direction: **The first run should feel like Luca becoming part of the user's device, not like configuring a normal app.**

---

## Executive summary

Onboarding should be planned now because the post-boot readiness bridge has finished its staged rollout: product audit, premium onboarding/post-boot design, implementation plan, typed readiness copy, copy consumption in loading/transition, partial setup CTA correction, regression matrix, and visual polish are complete. That gives onboarding a stable handoff point instead of asking first-run screens to compensate for unresolved post-boot readiness language.

The current onboarding likely does several things well: it has an explicit step controller, supports web and desktop runtime adapters, restores recoverable local-provisioning progress, lets users choose a conversation mode, supports visual preference persistence, and completes into the existing lifecycle without requiring a new route. It also already distinguishes web and desktop capabilities through adapter behavior.

The current onboarding may not feel premium enough because its default path still exposes internal setup language and engineering metaphors: kernel awakening, directive alignment, cognitive core selection, architecture tensors, provisioning, cloud brain, sovereign compute, managed gateway, calibration, and terminal-like operational states. Those concepts can be useful for advanced users, but the default first-run experience should be calmer, more device-native, and more focused on trust choices.

This should not be implemented in one PR. First-run onboarding touches routing, setup completion, visual settings, memory expectations, permission expectations, model-route choices, local provisioning, web/desktop differences, and mobile layout. Combining copy, state, shell, runtime behavior, skin boundaries, and QA would make regressions hard to isolate.

Future work should be staged by copy model, state/screen model, screen shell, implementation slices, then visual polish because each layer answers a different risk:

1. **Copy model** proves calm Basic/Pro/Creator language without behavior changes.
2. **State/screen model** proves step order and stored intent without routing changes.
3. **Shell component** proves layout, navigation, mobile, and accessibility affordances without changing all screens at once.
4. **Screen implementation slices** replace the current flow in recoverable groups.
5. **Skin boundary and visual polish** happen last so skins enhance stable product semantics instead of defining them.

---

## Current onboarding inventory

| File | Current role | Current user-facing experience | State/data ownership | Routing relationship | Risk if changed | What should change later | What must not change |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `src/components/Onboarding/OnboardingFlow.tsx` | Main onboarding host and step renderer. Owns most local step state, event handlers, runtime calls, visual variables, resume behavior, and completion handoff. | Starts at `KERNEL_AWAKENING`, proceeds through directive alignment, theme, identity, face scan, core choice, local/cloud setup, mode selection, conversation, calibration, and completion. Uses hologram/presence visuals, mono styling, and technical setup language. | Local React state for name, theme, opacity, blur, profile, conversation mode, BYOK provider/keys, local provisioning plan, download states, model readiness, warnings, and resume checks. Persists some data through the runtime adapter. | Rendered by `WebLifecycleShell` for web onboarding and likely by app boot routing for desktop/native onboarding. Calls `onComplete(profile, mode)` after `COMPLETE`. | High. It calls runtime methods that persist identity, visual settings, face data, model route, local plan, and completion. It also mutates root CSS variables. | Split future premium flow into typed copy, screen map, shell, and screen components; reduce default technical language; defer runtime side effects until explicit save/finish points. | Do not change it in this planning PR. Future PRs must preserve completion handoff, recoverable provisioning safeguards until intentionally replaced, and web/desktop adapter boundaries. |
| `src/services/onboarding/OnboardingController.ts` | Defines current step enum and transition helper methods. | Not directly visible, but determines screen order and back behavior from conversation/local plan. | Owns canonical current step names and transition decisions. | Used by `OnboardingFlow` to advance through onboarding. | High. Changing transitions can strand users in local provisioning, skip completion, or change route after setup. | Add a new premium screen map in a future PR before replacing this controller or adapting it. | Do not change routing/order in this docs-only PR. |
| `src/components/Onboarding/ConstitutionalAlignment.tsx` | Current directive/constitution alignment screen. | Presents governance/alignment framing before theme selection. | Local screen UI only; completion callback advances the flow. | Rendered at `DIRECTIVE_ALIGNMENT`. | Medium-high because it may shape trust/governance expectations. | Replace default path with permission-style choice and put advanced governance details behind disclosure. | Must not weaken governance or imply permissions can bypass security. |
| `src/components/Onboarding/ThemeSelectionStep.tsx` | Current theme/background setup screen. | Lets users choose existing UI themes and, on desktop, tune opacity/blur with live preview. | Owns selected theme/opacity/blur local state and writes visual settings/root CSS variables via callbacks. | Rendered at `THEME`; completion advances to identity. | High. It mutates visual settings and global CSS variables during first run. | Replace with “Choose your environment” using Luca skin/environment choices and simpler defaults. | Do not apply skin boundary or skin resolver in this PR; preserve semantic/status colors later. |
| `src/components/Onboarding/OnboardingAccessPanels.tsx` | Identity and Luca core route panels. | “Welcome to LucaOS” name prompt, “Luca Core” choice between Luca Prime/cloud, local mode, and BYOK provider/key entry. | Identity input is local until submit; core panel state is owned by `OnboardingFlow`; route changes call runtime adapter. | Rendered at `NEURAL_HANDSHAKE` and `COGNITIVE_CORE_SELECTION`. | High because route/provider actions can call cloud/local configuration. | Move intelligence route to a later calm screen with safe defaults and no immediate provider mutation until confirmed. | Do not edit provider hub, local model manager, model routing services, or secure key storage in this PR. |
| `src/components/Onboarding/FaceScan.tsx` | Face/camera enrollment surface. | Lets users complete or skip face scan, using camera/enrollment endpoint where available. | Receives endpoint and returns face data/null to runtime. | Rendered at `FACE_SCAN`. | High because camera/identity setup is permission-sensitive. | Reassess whether face setup belongs in Basic onboarding or later advanced setup. | Do not change camera behavior or identity storage in this planning PR. |
| `src/components/Onboarding/ModeSelect.tsx` | Text/voice conversation choice. | Presents “Choose how you want to talk,” text and voice cards, route warning card, and reassurance that mode can change later. | Owns no persistence; delegates selected mode to parent. | Rendered at `MODE_SELECT`; advances to `CONVERSATION`. | Medium-high because voice may trigger model/permission warnings. | Become part of broader presence setup: MiniChat, Voice, Widget, Hologram/Presence, Dashboard. | Do not disable core surfaces; choosing presence defaults should not remove functionality. |
| `src/components/Onboarding/ConversationalOnboarding.tsx` and `OnboardingConversationSurface.tsx` | Conversational setup UI. | Lets Luca ask setup questions in text/voice after mode selection. | Produces partial operator profile. | Rendered at `CONVERSATION` through runtime-provided component. | Medium-high because profile completion advances into calibration and finish. | Consider making conversation optional or compact after premium choice screens. | Do not change conversation runtime adapter in this planning PR. |
| `src/components/Onboarding/OnboardingLocalPlanReviewPanel.tsx` | Local model provisioning review. | Shows model plan, estimated download, optional vision skip, and technical details toggle. | Receives plan/download estimate and emits confirm/back/toggle. | Rendered at `LOCAL_PLAN_REVIEW`. | High because it gates local provisioning downloads. | Move technical local model setup behind the intelligence route Advanced/Details path. | Do not start downloads or change local model manager behavior in this PR. |
| `src/components/Onboarding/OnboardingProvisioningPanel.tsx` | Local provisioning progress and recovery. | Shows provisioning rows, download states, retry/continue actions. | Receives provisioning state and emits retry/continue callbacks. | Rendered at `PROVISION_LOCAL`. | High because it can retry downloads and continue without optional vision. | Keep out of default Basic onboarding unless local route requires it and user confirms. | Do not change provisioning behavior in this planning PR. |
| `src/components/Onboarding/OnboardingSystemPanels.tsx` | Hardware scan, Ollama install/wake, calibration, complete panels. | Shows “Hardware Scan,” Ollama prompts, calibration, and completion with technical/animated language. | Mostly presentational; callbacks are owned by `OnboardingFlow`. | Rendered for hardware/local setup and final steps. | High for local setup and completion timing. | Replace default finish with calm summary; move hardware/Ollama details behind route-specific advanced flow. | Do not change completion trigger or local setup behavior here. |
| `src/components/Onboarding/OnboardingRuntimeAdapter.ts` | Interface between UI and host-specific onboarding services. | Not visible, but determines what onboarding can persist or trigger. | Defines methods for visual settings, identity, face data, provisioning resume, model route, local downloads, installation, and conversation readiness. | Used by `OnboardingFlow`; implemented by web/desktop adapters. | Very high. Changing it affects both web and desktop first-run behavior. | Extend only after copy/state plan is merged and with tests for side-effect boundaries. | Do not change adapter contract in this planning PR. |
| `src/web/WebLifecycleShell.tsx` | Web lifecycle router and host. | Shows post-boot loading/transition, onboarding, optional ready debug, or main shell over the web background. | Owns `lifecycleState`, post-boot snapshot, visual settings subscription, and web onboarding completion write. | Routes `post_boot` → `onboarding` for new users, or `ready/main` for returning users; onboarding completion writes web onboarding state then routes to `ready/main`. | Very high. Changing this can break post-boot handoff, Web Safe Mode presentation, and main-shell entry. | Only update when premium onboarding is ready and backed by lifecycle tests. | Do not change lifecycle routing, Web Safe Mode, post-boot bridge, or completion route in this PR. |
| `src/web/postBoot/webPostBootState.ts` | Classifies post-boot user/readiness state. | Not directly visible, but feeds new-user/partial-setup/permission/model attention states. | Owns snapshot fields consumed by post-boot transition. | Determines `WebLifecycleShell` continue target. | High. Wrong classification can skip onboarding or block returning users. | Keep as handoff source; do not couple premium onboarding state until a dedicated state PR. | Do not edit post-boot state in this PR. |
| `src/hooks/app/useAppSystem.ts` | Native/desktop app boot sequencing hook. | Routes browser safe interface, query-param surfaces, Capacitor setup-complete users, BIOS/boot diagnostics, and degraded recovery. | Owns boot sequence transitions, diagnostics, host platform, local core readiness, and boot destination recovery. | Sets `BootSequence` to `ONBOARDING` or `READY` based on setup completion and host conditions. | Very high. Changes can alter desktop/native boot and Web Safe Mode-like guarded states. | Future onboarding must respect existing boot destination and setup-complete semantics. | Do not change native boot routing, browser safe behavior, diagnostics, or runtime guard logic in this PR. |

---

## Current onboarding flow map

This map reflects the current code path and controller transitions, not a guess.

### Current screens/steps

1. `KERNEL_AWAKENING` — first step in `OnboardingFlow`. If `runtime.skipKernelAwakeningVisual` is true, it immediately advances; otherwise it runs `startKernelBootSequence` and shows “Preparing LucaOS” readiness lines.
2. `DIRECTIVE_ALIGNMENT` — renders `ConstitutionalAlignment`; completion advances to theme.
3. `THEME` — renders `ThemeSelectionStep`; completion advances to identity.
4. `NEURAL_HANDSHAKE` — renders `IdentityVerificationPanel`; name submit persists operator identity and advances.
5. `FACE_SCAN` — renders `FaceScan`; completion or skip saves face data/null and advances.
6. `COGNITIVE_CORE_SELECTION` — renders `LucaCoreSelectionPanel` with Luca Prime/cloud, local mode, and BYOK path.
7. Cloud branch: `applyCloudConfiguration` then `MODE_SELECT`.
8. Local branch: `selectLocalMode` then `HARDWARE_SCAN`; scan may go to `OLLAMA_INSTALL`, `OLLAMA_WAKE`, or `LOCAL_PLAN_REVIEW`; confirm goes to `PROVISION_LOCAL`; provisioning readiness goes to `MODE_SELECT`.
9. `MODE_SELECT` — user chooses `text` or `voice`; selection calls `selectConversationMode` and advances to `CONVERSATION`.
10. `CONVERSATION` — runtime conversation component collects profile; completion advances to `CALIBRATION`; back returns to `MODE_SELECT`.
11. `CALIBRATION` — waits 1500ms, then advances to `COMPLETE`.
12. `COMPLETE` — plays success, waits 1500ms, confirms selected model route, then calls `onComplete(profile, conversationMode)`.

### Current copy style

- Mixes calm Luca language with technical/cybernetic language.
- Default user-facing labels include “Preparing LucaOS,” “Directive Alignment,” “Luca Core,” “Go Local,” “ACTIVATE CLOUD,” “Hardware Scan,” “Analyzing architecture tensors,” “Ollama Detected,” provisioning, calibration, and route warnings.
- Some copy is already calmer, such as “What should Luca call you?” and “You can switch between text and voice later.”

### Current choices

- Theme/visual style and, on desktop, opacity/blur.
- User name.
- Face scan complete or skip.
- Luca Prime/cloud, local mode, or BYOK provider/key.
- Local provisioning plan options, including optional vision skip and technical details.
- Text or voice conversation.
- Conversation answers that produce partial operator profile.

### Current stored data

- Visual settings: theme, background opacity, background blur through runtime visual settings.
- Operator identity name through `persistOperatorIdentity`.
- Face scan data/null through `saveFaceScanData`.
- Local provisioning resume and draft state for recoverable local setup steps.
- Local/cloud model route intent and readiness through runtime adapter methods.
- Web completion data in `WebLifecycleShell` through `completeWebOnboarding`, including name, interaction, theme, model route, personality, opacity, and blur.

### Current completion trigger

- `COMPLETE` schedules a delayed `confirmSelectedModelRoute({ voiceSelected, memoryEnabled: true })` call, then calls `onComplete(profile, conversationMode)`.
- If route confirmation throws, completion still calls `onComplete` after logging a warning.

### Current route after completion

- In web, `WebLifecycleShell` writes completion state with `completeWebOnboarding(...)` and routes to `ready` only when `VITE_LUCA_SHOW_WEB_READY_DEBUG === "true"`; otherwise it routes to `main`.
- In desktop/native app flow, `useAppSystem` routes Capacitor users to `ONBOARDING` when `settingsService.get("general").setupComplete` is false and to `READY` when setup is complete. The exact `onComplete` wiring lives outside this plan's no-touch scope.

### Current mobile behavior if visible

- `OnboardingFlow` uses `useMobile()` to adjust widths, safe-area bottom padding, conversation sizing, theme screen height, and whether the footer appears.
- `ModeSelect` hides its icon on mobile, uses smaller text, two compact mode cards, and bottom safe-area padding.
- `ThemeSelectionStep` and core selection panels use compact widths/heights and smaller controls, but some screens still risk dense grids, technical labels, long text, and small uppercase controls on small screens.

---

## Target premium onboarding flow

The target flow is the eight-screen first-run sequence from the premium design spec. Each screen should present one clear decision, plain Basic-mode copy, an optional Details/Advanced disclosure, and safe defaults.

### 1. Welcome to LucaOS

- **Purpose:** Establish LucaOS as a quiet intelligence environment joining the device.
- **User-facing copy direction:** “Welcome to LucaOS.” “Luca can live across your device — chat, voice, widgets, memory, tools, and safe actions.” Avoid setup jargon.
- **Primary decision:** Start first run; optionally confirm display name if the name prompt remains here.
- **Secondary controls:** “What is LucaOS?” disclosure; “Skip advanced setup” only if it preserves safe defaults.
- **What data is saved:** Ideally none until user continues; optional display name only if submitted.
- **What runtime behavior must not be triggered yet:** No provider selection, memory writes, governance changes, camera enrollment, local downloads, or tool permission requests.
- **Mobile behavior:** Single hero, one sentence, full-width CTA above bottom safe area.
- **Accessibility notes:** Autofocus only if name field is present; heading must be the page-level label; CTA must be keyboard reachable.
- **Safe fallback:** If copy model fails, show static Basic welcome copy and continue to environment.

### 2. Choose your environment

- **Purpose:** Let the user choose the visual operating environment without applying global skin behavior yet.
- **User-facing copy direction:** “Choose your environment.” “Pick the look that feels right. You can change it anytime.”
- **Primary decision:** Pearl, Carbon, Flow, or Canvas, with Pearl preselected.
- **Secondary controls:** Skip for now; Details explaining reduced transparency/motion.
- **What data is saved:** Future selected skin/environment preference metadata; existing mapping likely relates to `settings.general.selectedSkinId` when implementation is scoped.
- **What runtime behavior must not be triggered yet:** No skin boundary application, no global root skin mutation, no semantic/status color changes.
- **Mobile behavior:** One-column selectable cards, no dense preview grid.
- **Accessibility notes:** Cards need radio semantics or equivalent selected state; visible focus ring; selected state not color-only.
- **Safe fallback:** Pearl.

### 3. Choose Luca's presence

- **Purpose:** Teach the user that Luca appears through multiple surfaces, not just a dashboard.
- **User-facing copy direction:** “Choose how Luca appears.” “You can start with quick chat and turn on more surfaces later.”
- **Primary decision:** Default presence set: MiniChat, Voice, Widget, Hologram/Presence, with Dashboard always available.
- **Secondary controls:** Set up later; Details explaining each surface.
- **What data is saved:** Future presence preference metadata.
- **What runtime behavior must not be triggered yet:** Do not open microphone, start voice listeners, create overlays, launch widgets, or disable dashboard/core functionality.
- **Mobile behavior:** Stacked surface list with large toggles and concise descriptions.
- **Accessibility notes:** Each surface toggle/card needs label, description, and state.
- **Safe fallback:** MiniChat + Dashboard active; Voice/Widget/Hologram available later.

### 4. Choose permission style

- **Purpose:** Establish user control over how Luca asks before acting.
- **User-facing copy direction:** “Choose when Luca should ask permission.” “Sensitive actions always ask first.”
- **Primary decision:** Ask every time, Ask only when needed, or Custom.
- **Secondary controls:** Use recommended; Details for examples.
- **What data is saved:** Future governance/permission UX preference metadata.
- **What runtime behavior must not be triggered yet:** No governance runtime changes, no enforcement changes, no security bypass, no automatic tool grants.
- **Mobile behavior:** Three stacked options with examples; Custom opens compact disclosure rather than dense matrix.
- **Accessibility notes:** Radio-group semantics; confirmation reassurance text must be screen-reader visible.
- **Safe fallback:** Ask only when needed for low-risk UX prompts, while destructive/sensitive actions still confirm.

### 5. Choose memory boundaries

- **Purpose:** Create trust around what Luca may remember.
- **User-facing copy direction:** “Choose what Luca can remember.” “You can change this later and ask Luca to forget.”
- **Primary decision:** Remember useful preferences, Ask before saving personal details, or Do not remember without asking.
- **Secondary controls:** Use safe defaults; Details explaining examples.
- **What data is saved:** Future memory-boundary preference metadata only unless existing memory system explicitly supports deeper settings.
- **What runtime behavior must not be triggered yet:** No memory engine mutation, no embedding setup, no personal-detail capture, no retroactive memory deletion.
- **Mobile behavior:** Three large stacked options with one-line examples.
- **Accessibility notes:** Avoid color-only trust cues; provide readable explanatory text.
- **Safe fallback:** Ask before saving personal details.

### 6. Connect tools

- **Purpose:** Introduce tool access as optional consent-based capability.
- **User-facing copy direction:** “Connect tools when you're ready.” “Luca can help with browser, files, apps, and actions after you approve access.”
- **Primary decision:** Connect now or set up later.
- **Secondary controls:** Details by tool category; “Not now.”
- **What data is saved:** Future connected-tools intent, not credentials or grants in the Basic flow.
- **What runtime behavior must not be triggered yet:** No browser automation start, no file/app grants, no voice activation, no LucaLink pairing, no secure vault writes.
- **Mobile behavior:** Simple list of available tool categories; no dense integration marketplace.
- **Accessibility notes:** Tool availability should use text labels, not only status color.
- **Safe fallback:** Set up later.

### 7. Choose intelligence route

- **Purpose:** Explain where Luca's intelligence comes from without exposing provider complexity by default.
- **User-facing copy direction:** “Choose how Luca should think.” Present routes plainly: Luca Prime, Cloud provider, Local model, Bring your own key.
- **Primary decision:** Route preference, with a safe recommended default.
- **Secondary controls:** Details/Advanced for providers, local requirements, and key setup.
- **What data is saved:** Future intelligence route preference/intent; provider-specific credentials only in a separately scoped secure flow.
- **What runtime behavior must not be triggered yet:** Do not edit provider hub, start local model manager, download models, validate keys, or change active model routing in this planning PR or copy-only PR.
- **Mobile behavior:** One-column route list; advanced provider details collapsed.
- **Accessibility notes:** Clearly label unavailable routes and alternatives; avoid disabled-only explanations.
- **Safe fallback:** Luca Prime or existing default cloud-safe route, depending on current product policy.

### 8. Finish

- **Purpose:** Summarize choices and hand off to LucaOS calmly.
- **User-facing copy direction:** “LucaOS is ready.” “You can change any of this in Settings.”
- **Primary decision:** Enter LucaOS.
- **Secondary controls:** Review choices; go back.
- **What data is saved:** Completion state plus staged preferences that were explicitly confirmed.
- **What runtime behavior must not be triggered yet:** No hidden provider activation, no memory ingestion, no tool automation, no governance bypass.
- **Mobile behavior:** Compact summary and sticky bottom CTA.
- **Accessibility notes:** Summary list should be semantic and screen-reader readable; focus should move to the finish heading.
- **Safe fallback:** If optional preferences are missing, finish with safe defaults and complete onboarding route.

---

## Copy model plan

A future PR should add a typed copy model before UI implementation. Suggested location: `src/components/Onboarding/onboardingPremiumCopy.ts`, unless the implementation finds a stronger existing convention near onboarding copy/state models.

The model should define:

- `OnboardingAudienceMode = "basic" | "pro" | "creator"`.
- Stable screen IDs for the eight target screens.
- Typed fields for eyebrow, title, summary, options, primary CTA, secondary CTA, reassurance text, details/advanced copy, mobile-short copy, and accessibility labels.
- Coverage for **Basic mode**, **Pro mode**, and **Creator mode**.
- A safe fallback export for Basic mode.

Basic-mode copy must avoid these heavy terms in default onboarding strings:

- protocol
- directive
- kernel
- sovereign
- operator
- runtime
- provisioning
- calibration
- cognitive core
- tactical
- command center

Those terms may appear only in Pro/Creator advanced descriptions if they are still aligned with current product language and are not visible in the default Basic path. The first implementation PR should include a banned-word check for Basic default copy so regressions are automatic instead of subjective.

---

## Onboarding state/data plan

This plan does not implement storage. It documents likely future data and how it should map to existing settings/services if visible.

| Future data | Suggested owner | Existing mapping if visible | Save timing | Notes |
| --- | --- | --- | --- | --- |
| Selected skin/environment | Future onboarding preference draft, then settings | Likely `settings.general.selectedSkinId`; current onboarding uses visual theme/background fields through runtime visual settings | Save draft on selection; commit on finish or explicit continue | Do not apply skin boundary in the first state PR. Pearl fallback. |
| Presence preference | Future onboarding preference draft | Current `ModeSelect` stores conversation mode only; surfaces are not currently modeled as one onboarding preference | Save as intent metadata | Choosing defaults must not disable Dashboard or core system functionality. |
| Permission style | Future governance preference metadata | No direct onboarding mapping visible in inspected files | Save as preference metadata only | UX policy preference, not security enforcement. Sensitive actions always confirm. |
| Memory boundaries | Future memory preference metadata | `confirmSelectedModelRoute` currently passes `memoryEnabled: true`; memory engine details are outside this PR | Save as preference metadata only | Do not mutate memory engine unless supported by a later scoped memory PR. |
| Connected tools intent | Future tool-access onboarding metadata | Web/native capabilities and LucaLink are surfaced outside onboarding; current onboarding does not own tool grants | Save intent only | Do not start browser automation, voice, LucaLink, or secure vault writes. |
| Intelligence route preference | Future route preference draft | Current runtime adapter has cloud/local/BYOK/select/confirm methods | Save draft; commit only when route implementation PR scopes it | Do not edit provider hub/local model manager/model routing services in planning/copy PRs. |
| Completion state | Existing web lifecycle completion and desktop/native setup-complete setting | `WebLifecycleShell` calls `completeWebOnboarding(...)`; native routing checks `settingsService.get("general").setupComplete` | Finish screen only | Preserve current completion route semantics. |

---

## Permission style plan

Onboarding must let users choose how Luca asks for permission:

1. **Ask every time** — Luca asks before most actions.
2. **Ask only when needed** — recommended default; Luca asks for sensitive, destructive, costly, or unusual actions.
3. **Custom** — advanced controls for users who want finer rules.

Rules:

- Destructive or sensitive actions always require confirmation.
- Permission style affects UX policy and prompt frequency; it is not a security bypass.
- This must not weaken existing governance, secure vault, browser automation safeguards, file/app access safeguards, voice safeguards, or LucaLink safeguards.
- In this planning PR, the permission style is only a plan. Future implementation should map it to governance preferences after the preference model exists, not to runtime enforcement first.

---

## Memory boundaries plan

Onboarding should frame memory as user trust setup, not database setup.

Recommended options:

1. **Remember useful preferences** — remembers low-risk preferences that make Luca feel personal.
2. **Ask before saving personal details** — recommended safe default.
3. **Do not remember without asking** — Luca asks before saving anything meaningful.

Rules:

- Do not change the actual memory engine in this PR.
- Future implementation should store preference metadata only unless the existing memory system supports more granular settings.
- Do not imply old memories were deleted unless a later memory-specific PR actually performs deletion.
- Do not collect personal details on this screen; it sets boundaries only.

---

## Presence setup plan

Onboarding should explain Luca's presence surfaces:

- **MiniChat** — quick conversation surface.
- **Voice** — speak with Luca when enabled and permitted.
- **Widget** — lightweight ambient access.
- **Hologram/Presence** — visual presence surface where supported.
- **Dashboard** — full LucaOS workspace and settings surface.

Users are choosing how Luca appears by default. They are not disabling LucaOS core functionality, permanently hiding features, revoking settings access, or bypassing permissions. Voice must still require microphone permission when used; widget/presence surfaces must still respect host capability and safety constraints.

---

## Intelligence route plan

Present the route options simply and safely:

- **Luca Prime** — recommended managed route for most users.
- **Cloud provider** — connect a supported provider later or in advanced setup.
- **Local model** — run locally when the device and host support it.
- **Bring your own key** — advanced key-based route, handled through secure setup later.

Rules:

- Do not implement model routing in this planning PR.
- Do not edit provider hub.
- Do not change local model manager.
- Do not validate keys or store credentials in the default Basic route screen.
- Route availability should be honest but not alarming; unavailable options should say why and offer a later path.

---

## Visual shell plan

A future premium onboarding shell should provide:

- AppleOS-like glass material with calm depth and readable contrast.
- One decision per screen.
- Calm central composition with generous spacing.
- Bottom or right-side progress, depending on viewport.
- Clear primary CTA.
- Low-emphasis Back and Skip/Set up later controls.
- Mobile one-column flow.
- Safe-area support for bottom CTAs and notches/browser chrome.
- No cyberpunk/terminal UI.
- No heavy debug language.
- No aggressive dashboards, dense control centers, scanlines, fake terminals, or command output.

The shell should be added before replacing every screen so navigation, progress, focus management, reduced motion, reduced transparency, and mobile layout can be validated in isolation.

---

## Skin boundary plan

Onboarding should eventually inherit the selected skin environment, but not yet. The sequence should be:

1. Onboarding copy model.
2. Onboarding state map.
3. Onboarding shell component.
4. Onboarding screen implementation.
5. Onboarding local skin boundary resolver.
6. Onboarding visual polish.
7. QA matrix.

Rules:

- Skin remains decorative/material only.
- Semantic colors stay protected.
- Status/safety colors are not skin-controlled.
- Flow remains static unless future QA explicitly approves motion.
- Reduced transparency must force safe matte/solid fallbacks.
- Invalid/missing skin IDs must fall back to Pearl.
- The boundary should be local to onboarding and must not become a root/global provider.

---

## Mobile onboarding plan

Mobile first-run must be treated as a first-class flow:

- One decision per screen.
- Large tap targets.
- Bottom-safe CTA above `env(safe-area-inset-bottom)`.
- No dense grids.
- No wide desktop-only cards.
- Safe-area-aware layout.
- Readable on small screens without tiny uppercase-only controls.
- Compact Details/Advanced disclosure.
- No hover-dependent controls.
- Summary and error/reassurance text visible without horizontal scrolling.

---

## Accessibility plan

Future implementation must include:

- Keyboard navigation for cards, CTAs, back/skip, details, and finish review.
- Visible focus states independent of skin color.
- Readable contrast before material effects.
- Screen-reader labels for options, selected states, progress, route availability, and reassurance text.
- Reduced-motion-safe transitions.
- Reduced-transparency fallback.
- No motion dependency for understanding progress or completion.
- No information hidden only by color.
- Focus management when moving between screens and when opening Details/Advanced disclosures.

---

## Implementation phases

### Phase 1: onboarding copy model

PR: `feat(ui): add premium onboarding copy model`

- Add typed copy for Basic, Pro, Creator.
- Include Basic banned-word tests/checks.
- No UI replacement, routing change, skin boundary, storage implementation, or runtime side effects.

### Phase 2: onboarding state/screen map

PR: `feat(ui): add premium onboarding screen map`

- Add typed screen IDs, order, option IDs, safe defaults, and draft preference shape.
- Test screen order and default coverage.
- No runtime persistence yet unless explicitly scoped as draft-only and test-backed.

### Phase 3: premium onboarding shell

PR: `feat(ui): add premium onboarding shell component`

- Add shell layout, progress, navigation controls, focus behavior, reduced-motion/reduced-transparency handling.
- Story/test in isolation if repo conventions support it.
- Do not route users into the new shell yet unless behind a safe local fixture.

### Phase 4: implement first two screens

PR: `feat(ui): implement premium onboarding welcome and environment screens`

- Replace/refine welcome and environment only.
- Do not apply onboarding skin boundary yet.
- Preserve completion and route semantics.

### Phase 5: implement presence/permission/memory screens

PR: `feat(ui): implement premium onboarding presence permission memory screens`

- Add presence defaults, permission style preference metadata, and memory-boundary metadata.
- Ensure no governance or memory engine enforcement changes are introduced accidentally.

### Phase 6: implement tools/intelligence/finish screens

PR: `feat(ui): implement premium onboarding tools intelligence finish screens`

- Add optional tool intent, route intent, and calm finish summary.
- Keep provider hub, local model manager, browser automation, voice, LucaLink, and secure vault untouched unless explicitly scoped.

### Phase 7: onboarding skin boundary

PR: `feat(ui): add onboarding skin boundary resolver`

- Add local onboarding skin material resolver only after screen semantics are stable.
- Keep semantic/status colors protected.
- Test fallback and reduced-transparency behavior.

### Phase 8: onboarding QA matrix

PR: `test(ui): add premium onboarding QA matrix`

- Document and/or automate regression coverage for copy, screen order, routing, storage side effects, governance safety, memory safety, provider-routing safety, mobile, accessibility, and no unexpected root/global mutations.

---

## No-touch boundaries

Future implementation must not touch these unless a PR is specifically scoped to do so:

- `App.tsx`
- `src/components/boot/*`
- `src/web/postBoot/*`
- `src/web/WebBridgeShell.tsx`
- `src/services/secureVault.js`
- model routing services
- browser automation
- voice
- LucaLink
- governance runtime
- assets
- README

This planning PR must touch docs only. It must not edit source code, tests, components, services, runtime logic, Web Safe Mode behavior, post-boot bridge behavior, boot UI, onboarding UI, settings UI, skin registry, skin boundary helpers, model routing, browser/voice/LucaLink/governance, assets/screenshots, or README.

---

## Test strategy

Future PRs should add tests/checks for:

- Copy model banned-word checks for Basic default copy.
- Basic/Pro/Creator copy coverage.
- Screen map order.
- CTA behavior.
- Back/skip behavior.
- Completion trigger.
- No governance bypass.
- No memory engine side effects.
- No provider-routing side effects.
- Mobile rendering safety.
- Accessibility labels/focus.
- No root/global mutation.
- No Flow motion unless approved.
- Reduced-motion and reduced-transparency fallbacks.
- Web lifecycle completion route preservation.
- Desktop/native setup-complete route preservation.

---

## Acceptance criteria

Future premium onboarding is successful when:

- It feels like LucaOS joining the device.
- Default copy is calm and premium.
- Every screen has one clear decision.
- Users understand presence, memory, permission, tools, and intelligence choices.
- Security/governance is not weakened.
- Memory/model/provider systems are not accidentally mutated.
- Mobile is usable.
- Onboarding completion still routes correctly.
- Skin is decorative/material only.
- QA matrix protects the flow.

---

## Recommended next PR

Recommended first implementation PR after this plan:

```text
feat(ui): add premium onboarding copy model
```

That PR should add only typed copy and copy tests/checks. It should not replace onboarding screens, alter route completion, apply skins, add a skin boundary, edit Web Safe Mode behavior, trigger provider/model setup, or mutate memory/governance runtime behavior.
