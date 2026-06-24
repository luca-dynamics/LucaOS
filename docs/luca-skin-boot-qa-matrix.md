# LucaOS Skin Boot QA Matrix

**Type:** Manual/static QA matrix  
**Status:** QA checklist. No runtime, UI, root/provider, onboarding, Mode Select, dashboard, mobile, settings, Flow motion, DOM, asset, or screenshot changes are made by this document.  
**Date:** 2026-06-24  
**Target PR:** `test(ui): update LucaOS skin QA matrix for boot boundary`

Read together with:

- `docs/luca-skin-system.md`
- `docs/luca-skin-token-architecture-plan.md`
- `docs/luca-skin-application-boundaries.md`
- `docs/luca-skin-mobile-safety-audit.md`
- `docs/luca-skin-mobile-qa-matrix.md`
- `docs/luca-skin-boot-onboarding-plan.md`
- `src/config/lucaSkins.ts`
- `src/styles/lucaSkinRegistry.ts`
- `src/styles/lucaSkinMaterialBridge.ts`
- `src/styles/lucaDashboardSkinBoundary.ts`
- `src/styles/lucaMobileSkinBoundary.ts`
- `src/styles/lucaBootSkinBoundary.ts`
- `src/components/boot/LucaBootVisualShell.tsx`
- `src/web/WebBridgeShell.tsx`
- `src/services/secureVault.js`
- `src/services/secureVaultWebSafeMode.test.ts`

> Shared direction: **"LucaOS should feel like a quiet operating system for intelligence, not a dashboard for controlling intelligence."**

> Skin framing: **"LucaOS skins are not decorations; they are the visual operating environments for an AI-native OS."**

---

## 1. Executive summary

Boot Window skin application and visual polish now exist at a local Boot Window boundary. This matrix documents the QA gate for that boundary and the adjacent Web Safe Mode recovery path.

This PR is test/docs focused. It does not add new skin application, apply skins to onboarding or Mode Select, add a resolver/provider, change boot readiness/progress/error behavior, change Web Safe Mode behavior, mutate root/body/html, or introduce Flow motion.

---

## 2. Boot Window happy-path matrix

Run the Boot Window happy path for Pearl, Carbon, Flow, and Canvas.

| Skin | Background/material QA | Decorative atmosphere QA | Readability/semantics QA | Boundary QA |
| --- | --- | --- | --- | --- |
| Pearl | Boot background uses local Boot Window material variables and avoids harsh glare. | Decorative bloom uses `--luca-accent-soft`, not status/info tokens. | Boot text, readiness labels, and card/panel contrast remain readable; progress/readiness meaning is unchanged. | No root/global DOM mutation, no onboarding skin application, no provider. |
| Carbon | Boot background uses local graphite material variables without pure-black collapse. | Decorative bloom remains restrained and skin-accent based. | Diagnostics and readiness labels remain readable on dark surfaces; semantic status meaning is unchanged. | No `document.documentElement`, `document.body`, `style.setProperty`, or `LucaSkinProvider`. |
| Flow | Boot background uses local static Flow material variables. | Ambient color stays behind content and uses `--luca-accent-soft`. | Boot text remains content-first; readiness meaning is unchanged. | Flow remains static: no keyframes, animation declarations, timers, frame loops, or parallax. |
| Canvas | Boot background uses local warm matte material variables. | Decorative bloom remains soft and accent-based, not warning/info colored. | Text and readiness labels remain readable on warm surfaces; contrast stays acceptable. | Onboarding and Mode Select remain unskinned. |

Happy-path pass criteria:

- Boot background uses local `bootSkinBoundary.materialVariables`.
- Boot decorative bloom uses `--luca-accent-soft`.
- Boot decorative bloom does not use `--luca-info`, `--luca-danger`, `--luca-warning`, or `--luca-success`.
- Boot text remains readable.
- Readiness labels remain readable.
- Boot card/panel contrast remains acceptable.
- Boot progress/readiness meaning remains unchanged.
- Flow remains static.
- No root/global DOM mutation occurs.
- No onboarding skin application occurs.

---

## 3. Boot failure and recovery state matrix

Web boot failures and recovery states must remain semantic first and skin second.

| State | Expected behavior | Pass criteria |
| --- | --- | --- |
| Browser boot failure | Failure/recovery states preserve semantic error/warning/status meaning. | Skin may supply neutral background/surface only; error/warning/status colors remain protected. |
| Recoverable degraded boot | Decorative boot atmosphere does not hide the failure or recovery message. | Recovery copy, status labels, and actions remain readable above the atmosphere. |
| Diagnostics visible | Diagnostics remain readable in failure/recovery UI. | Diagnostic labels and captured errors are not muted into skin background contrast. |
| Secure-runtime error | Secure-runtime errors must not be hidden by skin styling. | Secure-runtime availability and disabled-feature language remains readable and explicit. |

Failure/recovery pass criteria:

- Skin variables can provide neutral background, elevated surface, border, shadow, and text roles only.
- Danger/warning/success/info semantics remain owned by status/runtime UI, not the skin bridge.
- Decorative boot atmosphere never covers, hides, or visually competes with failure diagnostics.
- Secure-runtime errors remain readable and visible when surfaced.

---

## 4. Web Safe Mode QA matrix

| Scenario | Expected behavior | Pass criteria |
| --- | --- | --- |
| Invalid/missing browser master key | Browser React mount is allowed. | `window.__LUCA_WEB_SAFE_MODE__` is published, `canMountWebUi` is true, and `secureRuntimeAvailable` is false. |
| Compact banner | Banner is compact and non-blocking. | Banner is bottom-left, small, and does not cover primary boot/onboarding content. |
| Diagnostics hidden by default | Full diagnostics are not immediately expanded. | Details toggle exists and collapsed state is default without `?bootDebug=1`. |
| Diagnostics expanded for debug | Full diagnostics are visible with boot debug. | `?bootDebug=1` expands details by default. |
| Secret safety | No secrets are printed. | Banner and diagnostics do not print `MASTER_KEY_HEX`, `LUCA_VAULT_KEY`, or actual key values. |
| Protected runtime features | Secure runtime stays disabled. | Protected runtime features remain unavailable while preview/UI mount can continue. |

Web Safe Mode pass criteria:

- Invalid/missing master key no longer prevents browser React mount.
- Banner remains compact and non-blocking.
- Full diagnostics are hidden by default and visible when Details is expanded.
- Full diagnostics expand by default with `?bootDebug=1`.
- No secrets or fallback key material are printed.
- `secureRuntimeAvailable` is false.
- `reactMountAllowed`/`canMountWebUi` is true.
- Protected runtime features remain disabled.

---

## 5. Onboarding handoff

- Onboarding remains unskinned.
- Mode Select remains unskinned.
- Web Safe Mode banner should not cover onboarding.
- Onboarding visual issues are separate from Boot Window QA.
- The next onboarding work requires local onboarding boundary planning/application before any implementation.

Recommended next PR:

`docs(ui): plan local onboarding skin boundary application`

Alternative implementation-start PR, only after QA approval:

`feat(ui): add LucaOS onboarding skin boundary resolver`

---

## 6. Static validation checklist

Search or test for these strings in relevant boot/skin/Web Safe Mode sources:

- No root/global mutation: `document.documentElement`, `style.setProperty`, `document.body`, `body.style`, `document.querySelector("html")`.
- No provider: `LucaSkinProvider`.
- No Flow motion: `@keyframes`, `animation:`, `requestAnimationFrame`, `setInterval`, `setTimeout`, `parallax`.
- No protected decorative tokens: `--luca-info`, `--luca-danger`, `--luca-warning`, `--luca-success`.
- No secrets: `MASTER_KEY_HEX`, `LUCA_VAULT_KEY`, actual key values, or weak fallback key copy in UI/banner output.
- No onboarding/Mode Select application from Boot Window or Web Safe Mode banner behavior.

