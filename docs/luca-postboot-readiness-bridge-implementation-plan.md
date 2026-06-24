# LucaOS Post-Boot Readiness Bridge Implementation Plan

**Type:** Implementation plan (documentation-only)  
**Status:** Planning. No source, runtime, UI, service, test, skin, asset, onboarding, or Web Safe Mode behavior changes are made by this document.  
**Date:** 2026-06-24  
**Target PR:** `docs(ui): plan post-boot readiness bridge implementation`  
**Recommended next PR:** `feat(web): add post-boot readiness bridge copy model`

> **Status update (2026-06-24).** The first implementation slice now adds a typed post-boot readiness bridge copy model. The UI presentation has not been rewritten; the next step is a bridge presentation component that consumes the copy model.

> **Status update (2026-06-24).** The bridge presentation now consumes the typed readiness copy model in the post-boot loading and transition surfaces. Lifecycle routing remains unchanged, onboarding remains paused, and the next implementation step is details/debug disclosure QA or constrained component polish.

Read together with:

- `docs/luca-boot-onboarding-product-experience-audit.md`
- `docs/luca-premium-onboarding-postboot-design.md`
- `docs/luca-skin-boot-onboarding-plan.md`
- `docs/luca-skin-boot-qa-matrix.md`
- `docs/luca-skin-application-boundaries.md`
- `src/web/WebLifecycleShell.tsx`
- `src/web/postBoot/WebPostBootLoading.tsx`
- `src/web/postBoot/WebPostBootTransition.tsx`
- `src/web/postBoot/webPostBootState.ts`
- `src/web/WebBridgeShell.tsx`
- `src/web/WebBridgeDiagnostics.tsx`
- `src/services/secureVault.js`
- `src/components/boot/LucaBootVisualShell.tsx`
- `src/hooks/app/useAppSystem.ts`

> Product direction: **"LucaOS should feel like a quiet operating system for intelligence, not a dashboard for controlling intelligence."**

> Scope guard: this plan is docs-only. It does not implement the readiness bridge, edit source components, edit services, edit tests, touch `App.tsx`, change Web Safe Mode behavior, change onboarding, apply skins to onboarding, add a resolver, add a boundary, add assets/screenshots, or alter runtime routing.

---

## 1. Executive summary

The post-boot bridge should be improved before onboarding implementation because it is the first product moment after the polished Boot Window. If the Boot Window feels premium but the next screen reads like a state resolver, users experience a sharp quality drop before they ever reach onboarding. Fixing this bridge first creates a calm handoff into either first-run onboarding or the returning-user shell without prematurely changing onboarding itself.

The new bridge should achieve four things:

1. Reassure the user that LucaOS is preparing the device-level environment.
2. Hide normal routing mechanics behind calm readiness copy.
3. Keep attention and failure states actionable without making them feel like boot crashes.
4. Preserve existing routing, Web Safe Mode honesty, and debug access while making the default experience premium.

This is the safest first implementation slice after the premium onboarding/post-boot design spec because the current post-boot surface is small and well-contained. The primary future targets are `WebPostBootLoading`, `WebPostBootTransition`, and possibly a small copy model near `webPostBootState`. Those can be changed without touching `App.tsx`, onboarding components, boot components, Web Safe Mode internals, model routing services, or secure storage.

The first implementation should be presentation/copy-focused, not a runtime rewrite. The current resolver already produces enough information for the real states that exist today: `new_user`, `partial_setup`, `permission_attention`, and `returning_user`. The lifecycle router already handles `post_boot`, `onboarding`, `ready`, and `main`. Rewriting those paths now would add risk before the product language and bridge behavior are proven.

---

## 2. Current post-boot flow inventory

| File | Current role | Current user-facing behavior | Current state inputs/outputs | Risk if changed | What should be changed later | What must not be changed |
| --- | --- | --- | --- | --- | --- | --- |
| `src/web/WebLifecycleShell.tsx` | Owns web lifecycle state, resolves post-boot snapshot, and routes from post-boot into onboarding, debug-ready, or main shell. | Shows loading while the snapshot resolves, then transition UI, then onboarding/main/debug-ready. | Inputs: web runtime, visual settings, resolved post-boot snapshot, `VITE_LUCA_SHOW_WEB_READY_DEBUG`. Outputs: lifecycle states `post_boot`, `onboarding`, `ready`, `main`; callbacks into transition. | High. It is the routing source of truth, so accidental changes can send new users to main, skip onboarding, or expose debug-ready state. | Pass only presentation/debug metadata needed by the bridge if required. Keep routing semantics intact. | Do not rewrite lifecycle routing, do not touch onboarding completion logic, do not add a new resolver, do not duplicate state ownership. |
| `src/web/postBoot/WebPostBootLoading.tsx` | Initial loading panel while `resolveWebPostBootState()` is pending. | Centered panel with orb, “Preparing LucaOS,” and “Starting Luca's web session…”. | Inputs: none. Outputs: visual loading state only. | Low-to-medium. It is presentation-only but is visible during a sensitive launch moment. | Replace copy with the first readiness-bridge language and keep `aria-live` / `aria-busy`. | Do not add routing, storage reads, service calls, or Web Safe Mode diagnostics here. |
| `src/web/postBoot/WebPostBootTransition.tsx` | Main post-boot transition surface after snapshot resolution; auto-continues normal states and exposes actions for attention states. | New users see “Preparing LucaOS”; returning users see “Welcome back”; attention states show a grid of action cards including limited mode, voice access, model route, and restart onboarding. | Inputs: `WebPostBootStateSnapshot`; callbacks for continue, restart onboarding, review voice access, choose model route. Outputs: user action callbacks and timer-driven `onContinue`. | Medium-to-high. It owns auto-continue timing and action affordances; changing it can block onboarding or main shell entry. | Introduce state-to-copy mapping, calmer checklist copy, one primary action, low-emphasis Details disclosure, and distinct attention/failure presentation. | Do not change callback meanings, auto-continue eligibility, onboarding restart path, or routing destinations in the presentation PR. |
| `src/web/postBoot/webPostBootState.ts` | Resolves user post-boot state from web onboarding storage and microphone permission status. | Not directly visible, but determines which transition copy and actions appear. | Outputs `WebPostBootStateSnapshot` with `userState`, `displayName`, completion flag, preferred interaction, voice-permission attention, and shell eligibility. Actual `userState` values: `new_user`, `returning_user`, `partial_setup`, `permission_attention`. | High. It is the current state source for the bridge. Incorrect edits can misclassify users or stall the web shell. | Optionally add exported presentation-safe types/constants in a separate PR only if necessary, or keep copy mapping beside the UI. | Do not add model-route resolution, failure states, new storage writes, fallback keys, secure-vault checks, or onboarding mutations. |
| `src/web/WebBridgeShell.tsx` | Wraps the web lifecycle in runtime context and owns compact Web Safe Mode banner. | Shows a fixed compact Web Safe Mode banner when `window.__LUCA_WEB_SAFE_MODE__` exists, with expanded diagnostics when clicked or `?bootDebug=1`. | Inputs: global Web Safe Mode diagnostic object and URL query. Outputs: banner only; no post-boot routing. | High for Safe Mode. It is the current compact degraded-state source, and duplication/conflict would confuse users. | Prefer not to change. If absolutely necessary later, only coordinate bridge copy with existing banner behavior. | Do not duplicate banner logic in the bridge, do not change safe-mode rules, do not expose secrets, do not add fallback key behavior. |
| `src/web/WebBridgeDiagnostics.tsx` | Renders boot diagnostics only when `?bootDebug=1`. | Hidden by default; debug panel appears with selected entry, lifecycle state, capability counts, LucaLink, safe-mode status, and captured error count. | Inputs: host/lifecycle/capability/LucaLink props plus globals. Outputs: debug diagnostics. | Medium. It is useful for QA and must remain opt-in. | Future bridge Details can summarize or link to similar fields; avoid a full log wall. | Do not show diagnostics by default, do not print secrets, do not duplicate Web Safe Mode full diagnostics in normal view. |

---

## 3. Current states and routing

### Exact current lifecycle states

`WebLifecycleShell` currently uses these lifecycle states:

- `post_boot`
- `onboarding`
- `ready`
- `main`

### Exact current post-boot user states

`webPostBootState` currently resolves these user states:

- `new_user`
- `returning_user`
- `partial_setup`
- `permission_attention`

### States not currently implemented in post-boot state

The following names are product concepts or callback affordances, but they are **not** current `WebPostBootUserState` values and must not be treated as existing resolver output in the next PR:

- `model_route_attention`
- `failure`

The existing transition includes an `onChooseModelRoute` action in attention UI, but the current resolver does not emit `model_route_attention`. Genuine failure is currently handled by falling back to a `new_user` snapshot after logging a warning.

| State | Current behavior | Future readiness bridge presentation | Primary action | Secondary/details action | Auto-continues? | Blocks onboarding? | True failure or attention-needed? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `post_boot` | Lifecycle state while the post-boot snapshot is unresolved; shows `WebPostBootLoading`. | “Preparing your LucaOS environment” with initial readiness lines. | None while resolving. | None or hidden Details unless `?bootDebug=1` is present. | Continues when snapshot resolves, not by timer. | No. It precedes routing. | Neither; pending readiness. |
| `new_user` | Transition shows new-user copy and auto-continues to onboarding after a short timer. | Calm first-run handoff: LucaOS is preparing preferences, memory boundaries, and safe tool access before first run. | “Continue” may be available if auto-continue is delayed or disabled; target is onboarding. | “Details” shows state summary. | Yes, current behavior auto-continues. | No; it enters onboarding. | Neither; normal first-run state. |
| `returning_user` | Transition welcomes the user and auto-continues to main shell, or `ready` debug if enabled. | “Welcome back” / “Ready to continue” with completed readiness lines. | Usually none; optional “Enter LucaOS” if manual CTA is introduced. | “Details” shows state summary. | Yes. | No. | Neither; normal return state. |
| `partial_setup` | Attention UI says setup needs attention and offers limited mode, voice access, model route, and restart onboarding. | “Pick up where you left off” with recoverable setup language, not failure language. | “Continue setup.” | “Details” or “Review setup.” | No. | Yes, it should route to onboarding/setup continuation. | Attention-needed, not true failure. |
| `permission_attention` | Attention UI says setup needs attention and offers voice/model/onboarding actions. It is emitted when preferred voice interaction has denied microphone permission. | “Review voice access” or “Voice needs permission to continue by voice,” with a clear continue-without-voice path. | “Review voice access.” | “Continue without voice” and “Details.” | No. | It should not block all onboarding/main access, but it can block voice-first continuation. | Attention-needed, not true failure. |
| `onboarding` | Lifecycle renders `OnboardingFlow`. | Out of bridge scope; bridge should hand off cleanly. | Owned by onboarding. | Owned by onboarding. | N/A. | N/A. | N/A. |
| `ready` | Optional debug-ready lifecycle state shown only when `VITE_LUCA_SHOW_WEB_READY_DEBUG=true`. | Keep as debug/QA surface, not default premium bridge copy. | Continue to shell. | Existing debug diagnostics. | No; user continues from ready debug. | No. | Debug/QA state, not user-facing normal route. |
| `main` | Lifecycle renders `WebLucaShell`. | Bridge has completed; not visible. | N/A. | N/A. | N/A. | No. | N/A. |
| `model_route_attention` | Not an emitted current state. The transition has a choose-model-route callback only. | Future-reserved: “Choose how Luca should think,” if a later resolver produces this state. | “Choose a route.” | “Continue with default route” and “Details.” | No. | Should not block onboarding; may block model-dependent shell readiness if later implemented. | Attention-needed, not true failure. |
| `failure` | Not an emitted current state. Resolver catch currently logs and falls back to `new_user`. | Future-reserved semantic failure presentation with recovery action. | “Try again” or “Continue in safe mode” depending on cause. | “Details.” | No. | Depends on cause. | True failure only when explicitly represented. |

---

## 4. New readiness bridge concept

### Target normal-path concept

```text
Preparing your LucaOS environment
Checking your preferences
Restoring memory boundaries
Preparing safe tool access
Ready to continue
```

### Title

Default title: **“Preparing your LucaOS environment”**. Returning users may see **“Welcome back”** once the snapshot is known. Attention states should use calm action titles such as **“Pick up where you left off”** or **“Review voice access.”**

### Readiness lines

Normal readiness lines should be short, human, and non-technical:

- Checking your preferences
- Restoring memory boundaries
- Preparing safe tool access
- Ready to continue

The lines can be reused across `new_user` and `returning_user`, with returning-user copy favoring “Restoring” and first-run copy favoring “Preparing.”

### Finished state

Finished state should read **“Ready to continue”**. It must not imply secure setup is complete if Web Safe Mode is active. In Web Safe Mode, finished copy should be qualified, for example: “Ready to continue in preview mode.”

### CTA behavior

- `new_user`: continue into onboarding. Current auto-continue can be preserved; a future manual CTA should say “Continue.”
- `returning_user`: auto-continue into main shell after readiness settles; if manual CTA appears, use “Enter LucaOS.”
- `partial_setup`: do not auto-continue; primary CTA is “Continue setup.”
- `permission_attention`: do not auto-continue; primary CTA is “Review voice access,” with a secondary path to continue without voice.
- Future `model_route_attention`: primary CTA is “Choose a route.”
- Future `failure`: primary CTA is recovery-specific, such as “Try again.”

### Details behavior

Normal users see calm readiness only. A low-emphasis **Details** button reveals a compact technical summary, not a full diagnostic wall. The details panel can include current state, selected route if known, permission attention, Web Safe Mode status, and captured error count.

### Debug mode behavior

When `?bootDebug=1` is present, details may be expanded by default. Debug content may include current lifecycle state, post-boot user state, selected route when available, permission attention flags, Web Safe Mode status, and captured boot error count. It must not print secrets, full logs, fallback keys, or raw sensitive values.

### Web Safe Mode interaction

The bridge should recognize Web Safe Mode only enough to avoid misleading copy. The compact banner remains controlled by `WebBridgeShell`. The bridge may show a calm note that protected local memory is unavailable and the interface preview can continue, but it should not duplicate the banner or full diagnostics.

### Failure/recovery behavior

Failure copy should be visibly distinct and semantic. Attention-needed states are not failures. Partial setup and permission attention should be recoverable, calm, and actionable. Future true failures should explain what happened in plain language and provide a clear next step.

---

## 5. State-to-copy mapping

Normal bridge copy must avoid these Basic/default-user words: `protocol`, `directive`, `kernel`, `sovereign`, `operator`, `runtime`, `provisioning`, `calibration`, `cognitive core`. Those words are allowed only in Details/debug when currently required by existing diagnostics.

| State | Screen title | Supporting copy | Readiness lines | Primary CTA | Secondary CTA | Details content | Debug content | Fallback behavior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `post_boot` | Preparing your LucaOS environment | Luca is checking what this device needs before continuing. | Checking your preferences; Restoring memory boundaries; Preparing safe tool access | None | Details only when debug is active | Snapshot pending, lifecycle state | Lifecycle state, selected entry, safe-mode status, captured error count | Stay on loading bridge until snapshot resolves. |
| `new_user` | Preparing your LucaOS environment | Luca is getting this device ready for first run. | Checking your preferences; Preparing memory boundaries; Preparing safe tool access; Ready to continue | Continue | Details | User state, onboarding incomplete, shell entry unavailable | Lifecycle state, user state, onboarding flag, selected entry, safe-mode status | Continue to onboarding using existing routing. |
| `returning_user` | Welcome back | LucaOS is restoring your workspace. | Restoring your preferences; Restoring memory boundaries; Preparing safe tool access; Ready to continue | Enter LucaOS, if a manual CTA is shown | Details | User state, display name if present, shell entry available | Lifecycle state, user state, onboarding flag, capability counts, safe-mode status | Auto-continue to main or ready-debug per existing lifecycle. |
| `partial_setup` | Pick up where you left off | A few choices still need your attention before LucaOS is fully ready. | Checking saved choices; Preparing setup continuation; Ready when you are | Continue setup | Details or Review setup | User state, onboarding completion flag, profile name presence | Lifecycle state, user state, stored profile summary, safe-mode status | Route to onboarding; do not call this a failure. |
| `permission_attention` | Review voice access | Voice is paused until microphone access is available. You can continue without it. | Checking voice preference; Reviewing browser access; Ready to continue without voice | Review voice access | Continue without voice; Details | User state, preferred interaction, voice permission attention | Lifecycle state, permission flag, browser capability counts, safe-mode status | Offer onboarding/review path and limited continuation without failure language. |
| `onboarding` | Not shown by bridge | Onboarding owns this surface. | N/A | N/A | N/A | N/A | Lifecycle state only in external diagnostics | Do not change onboarding. |
| `ready` | Web ready check | Debug-ready surface owns this state when enabled. | N/A | Continue to shell | Boot diagnostics | Existing ready/debug summary | Existing `WebBridgeDiagnostics` data | Keep gated behind `VITE_LUCA_SHOW_WEB_READY_DEBUG`. |
| `main` | Not shown by bridge | Main shell owns this surface. | N/A | N/A | N/A | N/A | Lifecycle state only in external diagnostics | Do not change main shell. |
| Future `model_route_attention` | Choose how Luca should think | The selected intelligence route needs attention before Luca uses it. | Checking route preference; Preparing available choices; Ready for your selection | Choose a route | Continue with default route; Details | Route state, availability summary, no provider secrets | Route diagnostics if already available, safe-mode status | Keep future-only until resolver support exists. |
| Future `failure` | LucaOS needs attention | Something prevented LucaOS from finishing this step. | Checking what happened; Preparing recovery options | Try again | Details; Continue in safe mode when valid | Plain error category, recovery option | Error count, safe-mode status, sanitized error code | Use semantic failure styling; never fall through silently. |

---

## 6. Web Safe Mode rules

- The compact Web Safe Mode banner remains controlled by `src/web/WebBridgeShell.tsx`.
- The readiness bridge must not duplicate full Web Safe Mode diagnostics.
- The bridge may show a calm note when protected local memory is unavailable.
- Full diagnostics remain under Details and/or `?bootDebug=1`.
- The bridge must not imply secure setup is complete while Web Safe Mode is active.
- No secrets are printed.
- No fallback key is introduced or referenced as a user-facing recovery.
- Protected secure features remain disabled while Web Safe Mode is active.
- Safe Mode copy should be honest but non-blocking: the interface can be previewed, but protected local memory is unavailable.
- The bridge must not mutate `window.__LUCA_WEB_SAFE_MODE__` or secure-vault behavior.

---

## 7. Details/debug behavior

- Normal users see only calm readiness copy, one primary action when needed, and a low-emphasis Details action.
- Details reveals a compact technical summary, not a full log wall.
- `?bootDebug=1` can expand bridge details by default.
- Debug details can include current lifecycle state, current post-boot user state, selected route if currently available, permission attention, Web Safe Mode status, and captured errors count.
- Details/debug content must not include secrets, keys, credentials, raw local storage dumps, or full captured logs by default.
- Existing `WebBridgeDiagnostics` should remain the full opt-in diagnostic source for boot debugging.
- Details should not create a second source of truth for safe-mode diagnostics; it should summarize existing status only.

---

## 8. Visual direction

This is planning-level only; do not implement visual changes in this PR.

- Use a centered compact card or bridge layout.
- Keep a calm title and short supporting copy.
- Use readiness checklist/steps as the progress indicator.
- Show one primary action when user input is required.
- Show a low-emphasis Details action.
- Avoid aggressive diagnostic panels in the normal path.
- Avoid cyberpunk terminal, radar, scanline, command-output, or threat-monitoring style.
- No animation requirement; current motion should not be expanded.
- Flow remains static; no Flow-specific motion requirement.
- Respect reduced motion.
- Status and failure colors remain semantic.
- Safe Mode note, if present, should be compact and subordinate to the main action.

---

## 9. Implementation phases

### Phase 1: copy/state mapping only

- Add a presentation copy model or constants if needed.
- Include mappings for exact current states first: `new_user`, `returning_user`, `partial_setup`, `permission_attention`.
- Include lifecycle-aware pending copy for `post_boot` only if it helps the loading panel.
- Keep future `model_route_attention` and `failure` as documented future concepts unless resolver support is added in a later scoped PR.
- No visual rewrite.
- No runtime routing changes.

### Phase 2: bridge presentation component

- Update `WebPostBootLoading` and `WebPostBootTransition` presentation to use premium readiness copy.
- Preserve current auto-continue behavior and callback semantics.
- Preserve `aria-live` and loading semantics.
- Keep routing in `WebLifecycleShell` unchanged unless a tiny prop pass-through is strictly necessary.

### Phase 3: details/debug disclosure

- Add a Details toggle to the bridge if it is not part of Phase 2.
- Expand details by default when `?bootDebug=1` is present.
- Summarize state, permission attention, Safe Mode status, and captured error count.
- Keep full diagnostics in `WebBridgeDiagnostics`.

### Phase 4: QA/tests

- Add source-level and component tests for copy mapping, visibility, debug disclosure, and Safe Mode non-duplication.
- Verify no root/global mutation.
- Verify no onboarding changes.
- Verify no Web Safe Mode behavior changes.
- Verify no Flow motion requirement.

---

## 10. Target files for future implementation

Change first:

1. `src/web/postBoot/WebPostBootLoading.tsx` — safest visual/copy surface for pending readiness.
2. `src/web/postBoot/WebPostBootTransition.tsx` — main presentation target for readiness copy, CTA hierarchy, and details disclosure.
3. A small mapping file near `src/web/postBoot/webPostBootState.ts` if needed — safer as a separate copy model than mixing copy into resolver logic.

Change only if necessary:

- `src/web/WebLifecycleShell.tsx` — only for passing existing state/debug metadata to the bridge; do not change routing semantics.
- `src/web/WebBridgeDiagnostics.tsx` — only if details/debug coordination needs a shared sanitized field; keep hidden unless `?bootDebug=1`.

Prefer to leave untouched:

- `src/web/WebBridgeShell.tsx` — owns the compact Web Safe Mode banner and should remain the single banner source unless absolutely necessary.
- `src/web/postBoot/webPostBootState.ts` — avoid resolver changes in the presentation PR unless adding exported types/constants is unavoidable.

---

## 11. No-touch boundaries

Future implementation must not touch:

```text
App.tsx
src/components/Onboarding/*
src/components/boot/*
src/styles/lucaSkin*
src/styles/lucaBootSkinBoundary.ts
src/styles/lucaDashboardSkinBoundary.ts
src/styles/lucaMobileSkinBoundary.ts
src/services/secureVault.js
src/web/WebBridgeShell.tsx unless absolutely necessary
model routing services
browser automation
voice
LucaLink
governance
assets
README
```

Additional boundaries:

- Do not edit tests until the QA/test phase.
- Do not add screenshots or generated assets.
- Do not apply skins to onboarding.
- Do not add a resolver.
- Do not add a boundary.
- Do not change Web Safe Mode behavior.
- Do not change onboarding routing or completion behavior.

---

## 12. Tests expected in future implementation

Expected tests/checks for the implementation PRs:

- State-to-copy mapping returns safe copy for all current states.
- Normal state hides debug details.
- `?bootDebug=1` expands or reveals debug details.
- Web Safe Mode is not duplicated in the bridge.
- No secret strings are shown.
- No banned Basic copy words appear in normal bridge copy: `protocol`, `directive`, `kernel`, `sovereign`, `operator`, `runtime`, `provisioning`, `calibration`, `cognitive core`.
- Failure/recovery uses semantic failure copy when future failure state exists.
- `partial_setup` uses “continue setup” language, not failure language.
- `permission_attention` uses actionable permission copy.
- Future `model_route_attention` uses actionable route copy only after that state exists.
- No onboarding files are edited.
- No root/global mutation occurs.
- No Flow motion is introduced.
- Existing lifecycle routing remains unchanged.
- Reduced-motion users do not receive expanded motion.

---

## 13. Acceptance criteria

The future implemented readiness bridge is successful when:

- Users no longer see a debug-like waiting room after the Boot Window.
- New users clearly move into onboarding.
- Returning users calmly enter the main shell.
- Partial setup is recoverable and not framed as a failure.
- Permission and future model-route attention states are actionable.
- Web Safe Mode remains compact, honest, and non-blocking.
- Failure states are visibly distinct when they are explicitly implemented.
- Runtime routing does not regress.
- Onboarding logic does not change.
- No source of truth is duplicated.
- Normal copy remains premium, calm, and non-technical.

---

## 14. Recommended next PR

Recommended next PR:

```text
feat(web): add post-boot readiness bridge copy model
```

This is safer than starting with the full presentation component because the current repo already separates state resolution from rendering. A copy model PR can lock the exact state-to-copy mapping, banned-word constraints, and future-reserved state handling before any visual rewrite. The follow-up presentation PR can then update `WebPostBootLoading` and `WebPostBootTransition` while preserving routing behavior.
