# LucaOS Post-Boot Readiness Bridge QA Matrix

**Type:** Regression QA matrix  
**Status:** Active test companion for post-boot readiness bridge work  
**Date:** 2026-06-24

## Purpose

This matrix protects the post-boot readiness bridge from regressions while keeping the product direction intact: LucaOS should feel like a quiet operating system for intelligence, not a dashboard for controlling intelligence.

The bridge may be visually polished later, but this coverage should continue to prevent debug-heavy copy, broken CTA mappings, Web Safe Mode duplication, onboarding changes, lifecycle routing changes, or secure-storage behavior changes.

## Covered states

The regression matrix covers the current bridge states:

- `pending`
- `new_user`
- `returning_user`
- `partial_setup`
- `permission_attention`

For each state, tests should verify the title, supporting copy, readiness lines, expected CTA presence or absence, and calm non-technical user-facing language.

## CTA behavior expectations

- `new_user`
  - Auto-continue remains present.
  - Copy model keeps `Continue` available for future/manual CTA use.
- `returning_user`
  - Auto-continue remains present.
  - `Welcome back` appears.
  - Copy model keeps `Enter LucaOS` available for future/manual CTA use.
- `partial_setup`
  - `Pick up where you left off` appears.
  - `Continue setup` appears.
  - Clicking `Continue setup` calls `onContinue`.
  - Clicking `Continue setup` does not call `onRestartOnboarding`.
- `permission_attention`
  - `Review voice access` appears.
  - Clicking the primary CTA calls `onReviewVoiceAccess`.
  - `Continue without voice` appears.
  - Clicking the secondary CTA calls `onContinue`.

## Details/debug expectations

- Details is available as a low-emphasis disclosure.
- Details is collapsed by default.
- Opening Details reveals only a sanitized summary:
  - state
  - display name
  - onboarding complete
  - preferred interaction
  - voice permission attention
  - can enter shell
- Details must not expose raw logs, storage dumps, keys, tokens, or secrets.
- Full diagnostics remain opt-in outside the normal bridge surface.

## Web Safe Mode expectations

- `WebBridgeShell` remains the compact Web Safe Mode banner owner.
- The readiness bridge does not duplicate the full Web Safe Mode banner or diagnostics copy.
- The bridge does not read or mutate secure-vault behavior.
- The bridge does not imply secure setup is complete while Web Safe Mode is active.
- If a safe-mode copy variant is rendered or unit-tested, it uses preview-mode language.

## Copy safety expectations

Normal rendered bridge copy must stay calm and non-technical. It must not include:

- protocol
- directive
- kernel
- sovereign
- operator
- runtime
- provisioning
- calibration
- cognitive core
- webbridge
- browser-safe
- system ready

Rendered bridge copy and Details must also avoid secret-bearing language such as master keys, fallback keys, private keys, API keys, tokens, or secrets.

## No-touch boundaries

Regression work must not change:

- `App.tsx`
- `src/components/Onboarding/`
- `src/components/boot/`
- `src/styles/lucaSkin*`
- `src/styles/lucaBootSkinBoundary.ts`
- `src/styles/lucaDashboardSkinBoundary.ts`
- `src/styles/lucaMobileSkinBoundary.ts`
- `src/services/secureVault.js`
- `src/web/WebBridgeShell.tsx`
- model routing services
- browser automation
- voice
- LucaLink
- governance
- assets
- `README`

The bridge tests also guard against root/global mutations and Flow-style motion additions in the bridge files. The existing `window.setTimeout(onContinue` auto-continue behavior is the explicit timeout exception.

## Future polish checklist

Before visual polish ships, keep the polish PR constrained to presentation only:

- Keep lifecycle routing unchanged.
- Keep post-boot resolver behavior unchanged.
- Keep onboarding paused.
- Keep Web Safe Mode behavior unchanged.
- Do not add a skin resolver or skin boundary.
- Do not add animations or assets.
- Re-run the readiness bridge regression matrix in CI.

Recommended next PR after this matrix passes: `style(web): polish post-boot readiness bridge visuals`.
