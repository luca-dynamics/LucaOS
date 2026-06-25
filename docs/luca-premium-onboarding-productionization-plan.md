# Premium LucaOS Onboarding — Productionization & Live-Mount Plan

**Type:** Implementation plan (documentation-only)
**Status:** Planning. No source, runtime, UI, routing, storage, provider, or onboarding behavior changes are made by this document. It sequences the multi-PR effort to make the frozen, dormant premium onboarding stack user-facing, and pins the product decisions that must be answered before the bridge code is written.
**Date:** 2026-06-25

> Product direction: **"LucaOS should feel like a quiet operating system for intelligence, not a dashboard for controlling intelligence."**

Read together with:

- `docs/luca-premium-onboarding-implementation-freeze.md` (the frozen stack)
- `docs/luca-premium-onboarding-postboot-design.md` (the experience spec)
- `docs/luca-premium-onboarding-implementation-plan.md`
- `src/components/Onboarding/LucaPremiumOnboardingPreview.tsx`
- `src/components/Onboarding/lucaOnboardingFlowEngine.ts`
- `src/web/WebLifecycleShell.tsx`, `src/web/webLifecycleStorage.ts`
- `src/components/Onboarding/OnboardingFlow.tsx`, `src/App.tsx`

---

## 1. Where the live flow mounts today

| Surface | Mount | Completion contract |
| --- | --- | --- |
| Web | `WebLifecycleShell.tsx` when `lifecycleState === "onboarding"` renders `<OnboardingFlow>` | `onComplete(profile, mode)` → `completeWebOnboarding(WebProfile)` then `setLifecycleState(main\|ready)` |
| Desktop | `App.tsx` when `bootSequence === "ONBOARDING"` renders `<OnboardingFlow>` | `onComplete(profile, mode)` → `settingsService.saveSettings({ general: { setupComplete, preferredMode } })`, set voice mode, `setBootSequence("READY")` |

Flag patterns already in the codebase: `VITE_LUCA_SHOW_WEB_READY_DEBUG` (env) and `?bootDebug=1` (query).

---

## 2. The two real gaps (why this is multi-PR, not a swap)

### 2a. Functional gap

The legacy `OnboardingFlow` performs work the premium visual flow does **not** yet do: name capture, face scan, model/provider selection, local provisioning / hardware scan, calibration. A naive swap would **remove** these.

### 2b. Persistence gap

The web completion shape `WebProfile` is:

```ts
{ name; interaction: "chat"|"voice"; theme: "PROFESSIONAL"|"MASTER_SYSTEM"|"FROST"|"LIGHTCREAM";
  modelRoute: "cloud"|"byok"|"desktop-later"; personality: "proactive"|"direct";
  backgroundOpacity: number; backgroundBlur: number }
```

Mapping the premium engine's `selectedOptions` onto it:

| Premium selection | Target in `WebProfile` | Mapping status |
| --- | --- | --- |
| `presence` (minichat/voice/widget/presence/dashboard) | `interaction` | Clean (voice → voice, else chat) |
| `intelligence_route` (luca_prime/cloud_provider/local_model/byok) | `modelRoute` | Partial (cloud_provider→cloud, byok→byok, local_model→desktop-later, luca_prime→cloud?) |
| `environment` (pearl/carbon/flow/canvas) | `theme` | **No clean mapping** — skin ids ≠ legacy UIThemeIds |
| `permission_style` | — | **No target field** |
| `memory_boundaries` | — | **No target field** |
| `connect_tools` | — | **No target field** |
| name | `name` | **Not captured** by the premium flow today |

So most premium choices currently have nowhere to persist. They were always "deferred-preference-only" in the screen map; productionization must decide where they go.

---

## 3. Open decisions to pin BEFORE bridge code (with recommendations)

1. **Extra preferences (permission style, memory boundaries, tool intent, environment/skin).**
   - **Recommendation:** extend persistence with a new additive `premiumPreferences` block (separate key / settings sub-object) rather than overloading `WebProfile`. Keeps legacy shape intact; nothing silently dropped. The bridge maps the clean fields into `WebProfile` and writes the rest to `premiumPreferences`.
2. **Legacy functional steps (face scan, provisioning, model setup, name).**
   - **Recommendation:** Phase the premium flow as the *front* (calm choices) and append the still-needed functional steps afterward (or relocate to Settings / advanced), rather than deleting them. Name capture is added to the premium Welcome/Finish.
3. **Rollout.**
   - **Recommendation:** flag-gated → internal A/B → default-on, never a hard cutover. Start behind `?premiumOnboarding=1` / a `VITE_*` flag so the legacy flow stays the default until proven.
4. **Skin vs theme.** Does choosing a premium environment (skin) drive the legacy `theme`/visual settings, or are skins applied only once the dedicated onboarding/app skin boundary is live?
   - **Recommendation:** persist the skin as a `premiumPreferences.environment` and do **not** force-map it onto a legacy UIThemeId yet.

---

## 4. Staged PRs

Each is a separate, reviewed, single-commit PR. Code PRs begin only after the section 3 decisions are confirmed.

- **P1 — Pure completion-bridge mapper (dormant).** `mapLucaOnboardingFlowToWebProfile(flowState)` (+ desktop equivalent): pure function mapping the engine's selections into the clean `WebProfile`/settings fields and returning the unmapped premium selections separately (never dropped). No wiring. Tests for every mapping + the deferred set. *Lowest risk; decision-neutral; foundation for everything below.*
- **P2 — Name capture** on the premium Welcome/Finish (controlled, inert), feeding the mapper.
- **P3 — Persistence extension** for the deferred premium preferences (additive `premiumPreferences`), per decision 1.
- **P4 — Flag-gated web live mount.** Behind `?premiumOnboarding=1`, render a production `LucaPremiumOnboarding` at the web onboarding mount; completion calls the mapper + `completeWebOnboarding` + existing lifecycle routing. Legacy default untouched.
- **P5 — Functional-step handoff.** Append/relocate face scan, provisioning, and model setup per decision 2 so no capability is lost.
- **P6 — Desktop live mount** behind the same flag, bridging to `saveSettings` + `setBootSequence`.
- **P7 — A/B + rollout controls**, then default-on once validated.
- **P8 — QA + final regression** across web/desktop, new-user/returning/partial/permission paths, reduced-motion/transparency, and Web Safe Mode.

---

## 5. No-touch / safety boundaries

- The legacy `OnboardingFlow` remains the default until P7 explicitly flips it; never delete it during the flagged phases.
- Do not weaken status/safety semantics, governance, Web Safe Mode, or secure storage.
- No silent preference loss — anything not mapped is persisted via the additive block or explicitly deferred in code.
- Completion side effects stay behind the real `onComplete` contracts; the engine itself remains pure and inert.
- Flow stays static; reduced motion / reduced transparency respected.

---

## 6. Recommended next PR

```text
feat(ui): add pure premium onboarding -> completion bridge mapper
```

P1 is the safest first slice: a pure, fully-tested mapper that makes the persistence gap explicit in code (clean fields vs deferred preferences) without touching any live surface or requiring the rollout decision. The product decisions in section 3 should be confirmed before P3/P4 wire anything user-facing.

---

## 7. Rules honored

Documentation-only. `git diff --check` clean. Adds one Markdown file under `docs/`. No source, runtime, UI, routing, storage, provider, skin, or onboarding behavior changes.
