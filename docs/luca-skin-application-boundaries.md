# LucaOS Skin Application Boundaries

**Type:** Application boundary plan (documentation-only)  
**Status:** Plan. No runtime, UI, root/provider, settings, boot, onboarding, or asset changes are made by this document.  
**Date:** 2026-06-23  
**Target PR:** `docs(ui): plan LucaOS skin application boundaries`

Read together with:

- `docs/luca-skin-system.md`
- `docs/luca-skin-token-architecture-plan.md`
- `src/config/lucaSkins.ts`
- `src/styles/lucaSkinRegistry.ts`
- `src/styles/lucaSkinMaterialBridge.ts`
- `src/styles/lucaMaterialSystem.ts`
- `src/styles/lucaMaterialSettings.ts`
- `src/config/lucaAppearanceTokens.ts`
- `src/styles/lucaShellStyles.ts`
- `src/styles/lucaMobileShellStyles.ts`

> Shared direction: **"LucaOS should feel like a quiet operating system for intelligence, not a dashboard for controlling intelligence."**

> Skin framing: **"LucaOS skins are not decorations; they are the visual operating environments for an AI-native OS."**

---

## 1. Executive summary

LucaOS now has the first pieces of a skin stack: skin configuration, a CSS variable registry, and a material bridge. These layers describe Pearl, Carbon, Flow, and Canvas, resolve their skin-level variables, and translate those variables into the existing Luca appearance/material slots.

Those layers are intentionally **pure and inert** today. They do not write to `document.documentElement`, mount a provider, mutate the current theme, change settings persistence, alter boot/onboarding, or apply any variables to a live UI surface.

The next risk is therefore not token definition. The next risk is **application**: deciding exactly where the bridge is allowed to enter the app. A broad root rewrite would give skins too much blast radius at once, touching boot, onboarding, settings, dashboard, overlays, mobile, MiniChat, and status surfaces before the behavior is proven.

Skin application should be introduced in small, reversible stages. The safest path is to prove local previews first, then settings persistence, then a controlled dashboard-shell boundary, then mobile, boot/onboarding, and only later Flow motion.

Existing Luca Material roles must remain the component-facing contract. Components should keep consuming `lucaMaterial*` roles, shell helpers, mobile shell helpers, and Luca appearance tokens. Raw skin definitions should not become component dependencies.

Status and safety variables must remain outside skin control. Danger, warning, success, info, approval, permission, blocked-action, active voice/listening, active vision/screen-context, runtime status, and stop-generation semantics must stay protected even when a skin changes the surrounding environment.

---

## 2. Current skin stack status

### Existing

#### `src/config/lucaSkins.ts`

**What it does**

- Defines the launch skin IDs: Pearl, Carbon, Flow, and Canvas.
- Stores data-only skin definitions: names, descriptions, mode affinity, background profile, material profile, accent profile, typography mood, boot profile, motion profile, and host-policy hints.
- Provides a default skin and safe lookup behavior so unknown input can fall back to the default skin.

**What it does not do**

- It does not import React or UI components.
- It does not write CSS variables to the DOM.
- It does not update settings, persistence, root classes, or runtime state.
- It does not change boot, onboarding, dashboard, mobile, voice, browser, LucaLink, memory, governance, or model-routing behavior.

**Why it is safe so far**

- It is static configuration only.
- It has no side effects.
- It is not consumed by a live root/provider path.
- It describes skin intent without applying that intent to current UI surfaces.

#### `src/styles/lucaSkinRegistry.ts`

**What it does**

- Resolves a selected skin into `--luca-skin-*` CSS variable names and string values.
- Applies host-policy hints to reduce blur or prefer more solid fallbacks in safer contexts.
- Applies accessibility constraints such as reduced transparency and reduced motion before returning variables.
- Provides entries/maps that future local previews or providers can consume.

**What it does not do**

- It does not call `setProperty`.
- It does not mutate `:root`, an element style, a stylesheet, or a class name.
- It does not bypass existing Luca appearance tokens.
- It does not expose status/safety variables as skin-controlled outputs.

**Why it is safe so far**

- It is a pure function layer: options in, variable map out.
- Reduced transparency and reduced motion already act as hard constraints at this layer.
- Host policy can cap risky material values before any future consumer receives them.
- Nothing in the registry is applied unless a future caller explicitly scopes it.

#### `src/styles/lucaSkinMaterialBridge.ts`

**What it does**

- Maps resolved skin variables into existing Luca appearance/material targets such as `--luca-background-base`, `--luca-surface-glass`, `--luca-text-primary`, `--luca-accent-primary`, `--luca-material-blur`, and `--luca-shadow-soft`.
- Keeps the Luca Material system as the intended enforcement layer for component-facing roles.
- Documents that safety/status variables are intentionally excluded from bridge control.

**What it does not do**

- It does not apply variables globally or locally.
- It does not create a provider, hook, settings UI, or dashboard wrapper.
- It does not replace `lucaAppearanceTokens.ts`.
- It does not add danger, warning, success, info, approval, permission, voice-live, or stop-generation variables to skin control.

**Why it is safe so far**

- It is pure/inert plumbing.
- It returns bridge output but does not decide where the output is applied.
- It keeps the bridge focused on appearance/material slots instead of runtime or semantic safety state.
- It preserves the current architecture direction: skins feed Luca Material roles rather than components importing raw skin definitions.

---

## 3. Application risk assessment

Before applying skins, LucaOS should treat application as the risky step. The main risks are:

- **Root CSS variable overrides can affect all UI.** Writing bridged values to `:root` can immediately affect dashboard, settings, overlays, onboarding, MiniChat, mobile views, and any legacy fallback path that reads `--luca-*` or `--app-*` variables.
- **The bridge could conflict with existing appearance tokens.** `lucaAppearanceTokens.ts` currently owns theme/persona compatibility, opacity, blur, reduced transparency, high contrast, status colors, and material settings output. A skin provider must not accidentally create a second, incompatible source of truth.
- **Settings persistence could create incompatible states.** Persisting selected skin too early can create saved combinations of legacy theme, product theme, accent, opacity, blur, accessibility flags, and skin ID that later providers must support forever.
- **Mobile can inherit too much blur/motion.** Desktop-grade Flow blur or ambient motion can degrade performance, contrast, battery, touch clarity, and bottom navigation readability on mobile.
- **Flow can become noisy if applied too early.** Flow should first prove a static fallback. Liquid/morph motion should not compete with the composer, content, voice controls, or operational truth panels.
- **Boot/onboarding visual changes can accidentally touch runtime readiness.** Boot visuals must remain separate from service startup, watchdogs, degraded recovery, IPC readiness, voice readiness, permissions, and onboarding progression.
- **Safety/status colors must not be overridden.** Danger, warning, success, info, approval, permission, active voice/listening, active vision/screen-context, blocked-action, and stop-generation indicators must remain legible and semantically stable.
- **Existing Basic/Pro/Creator visual density must not be disrupted.** Skin rollout must not change mode/tier density, composer priority, advanced/tactical surfaces, or debug affordance hierarchy.

---

## 4. Safe application principles

- Apply skin output at **one controlled boundary first**.
- Prefer a dedicated provider/helper over scattered `setProperty` calls.
- Do not let components import raw skin definitions.
- Components should continue using existing Luca Material roles, shell helpers, mobile shell helpers, and appearance tokens.
- No broad dashboard consumption until provider behavior is proven in a smaller surface.
- No boot/onboarding application until dashboard/static skins are stable.
- No Flow animation until static skin application is stable.
- Mobile must default to safer blur and motion values.
- Reduced transparency and reduced motion must override skin preference.
- Safety/status tokens must remain outside skin bridge output and outside future provider writes.
- Unknown skin IDs must fall back to Pearl/default behavior without throwing or producing partial variables.
- Every application PR should be reversible without migrating unrelated appearance settings.

---

## 5. Recommended first application boundary

The repo already has a layered material system: `lucaAppearanceTokens.ts` resolves current app tokens, `lucaMaterialSettings.ts` applies host blur/opacity policy, `lucaMaterialSystem.ts` exposes component-facing roles, and shell/mobile helpers consume Luca variables. Because many surfaces read the same `--luca-*` variables, the safest first boundary is not root application.

### Option A — root CSS variable provider

A focused provider/hook applies variables at the app root.

**Pros**

- Simple global application.
- Material roles inherit skin values everywhere.
- Proves the whole bridge path quickly.

**Cons**

- High blast radius.
- Can affect all surfaces at once.
- Can collide with current appearance-token ownership.
- Can accidentally alter settings, onboarding, overlays, MiniChat, mobile surfaces, and status-adjacent UI before they are audited.
- Usually requires a root/App boundary decision, increasing the risk of a broad `App.tsx` rewrite.

### Option B — dashboard shell-only boundary

Apply bridge variables only around the main dashboard shell wrapper.

**Pros**

- Controlled visual surface.
- Avoids boot, onboarding, and settings at first.
- Lets the primary OS shell prove static skin behavior before broader rollout.
- Keeps runtime services and onboarding readiness out of scope.

**Cons**

- May not cover global overlays, portals, MiniChat, or floating surfaces mounted outside the wrapper.
- Needs careful wrapper selection to avoid missing shell children or accidentally wrapping too much.
- Still affects the live dashboard, so regressions are user-visible.

### Option C — settings preview-only boundary

Apply skin variables only inside preview cards.

**Pros**

- Safest first visual proof.
- No global UI impact.
- No current active theme change.
- Can demonstrate skin identity and bridge output locally.
- Can test reduced-motion and reduced-transparency indicators without changing runtime behavior.

**Cons**

- Does not prove whole-shell skin behavior yet.
- Requires a later dashboard-shell application PR.
- Preview cards can overpromise if they are not grounded in real bridge variables.

### Recommendation

Start with **settings preview-only boundary** before full root/dashboard application.

This lets LucaOS show skin identity safely without changing the live shell. The next implementation should add preview metadata and/or preview card design that consumes bridge values locally only, with no root provider, no `document.documentElement` mutation, no selected-skin persistence unless separately scoped, and no dashboard consumption.

---

## 6. Proposed rollout sequence

### PR 4A — settings preview metadata and preview cards

- Add UI metadata for Pearl, Carbon, Flow, and Canvas.
- Add static preview cards.
- Preview uses bridge values locally.
- No global app/root application.
- No selected skin persistence yet unless already safe.
- No dashboard consumption.

### PR 4B — selected skin setting persistence

- Add selected skin ID to appearance settings.
- Still no global visual application.
- Include reset-to-default.
- Validate unknown skin fallback.

### PR 5 — local preview variable application

- Preview cards use local inline CSS variable map.
- No root provider.
- No dashboard consumption.

### PR 6 — dashboard shell controlled application

- Apply bridge variables to one dashboard shell boundary.
- Static skins only first: Pearl, Carbon, Canvas.
- Flow static fallback only.
- No motion.

### PR 7 — mobile-safe application

- Mobile shell uses capped blur/motion.
- Verify touch clarity and contrast.

### PR 8 — boot/onboarding visual application

- Boot background/orb visuals only.
- No runtime readiness behavior changes.

### PR 9 — Flow motion pass

- Liquid/morph motion only after static application is stable.
- Reduced-motion fallback required.

---

## 7. Settings preview boundary design notes

The next settings preview PR should work as a local, non-persistent, non-global proof of skin identity.

- Preview cards should render skin name, description, mood, and a sample mini surface.
- Preview cards can use local CSS variables generated by the bridge.
- Preview cards must not apply global CSS variables.
- Preview cards must not mutate `document.documentElement`.
- Preview cards must not change the current active theme.
- Preview cards must not persist selected skin unless persistence is separately scoped.
- Preview cards must not use competitor naming, copy, assets, layout clones, or brand references.
- Accessibility preview should include reduced-motion and reduced-transparency indicators.
- Flow preview should be static by default in the first visual pass.
- Preview metadata should remain Luca-native: Pearl, Carbon, Flow, and Canvas.

---

## 8. App/root provider boundary notes

A future root/provider PR should follow strict isolation rules:

- Avoid editing `App.tsx` unless absolutely necessary.
- If App/root must be touched, isolate the change to a tiny provider wrapper.
- The provider should consume selected skin ID and accessibility flags.
- The provider should use bridge output rather than raw skin definitions.
- The provider must not override safety/status variables.
- The provider must support rollback to current theme behavior.
- The provider must not bypass `lucaAppearanceTokens.ts` without a deliberate migration.
- The provider should include tests or static search checks proving no status override was added.
- The provider should avoid scattered `document.documentElement.style.setProperty` calls.
- The provider should define clear cleanup/restoration behavior when skin application is disabled.

---

## 9. Dashboard shell boundary notes

When dashboard application begins, it should be shell-first and material-role-first.

- Dashboard/root background may consume bridged background variables first.
- Panels, cards, controls, sidebars, sheets, popovers, overlays, HUDs, and dialogs should continue through Luca Material roles.
- Composer priority must not be weakened.
- MiniChat and overlays should not be globally affected until tested.
- Right-panel safety/approval surfaces must remain legible.
- Basic default calm must remain intact.
- Pro/Creator density must not be altered by skin rollout.
- Advanced/tactical/debug visuals should not be normalized into skin output during early rollout.
- Dashboard application should start with static Pearl, Carbon, and Canvas before Flow motion.

---

## 10. Mobile boundary notes

Mobile should receive skin application only after desktop/static behavior is proven.

- Cap blur aggressively.
- Prefer solid fallback for mobile-web.
- Flow should be static on mobile first.
- No liquid animation on mobile until later.
- Preserve touch target clarity.
- Preserve bottom nav readability.
- Preserve sheet, panel, and card contrast.
- Do not squeeze desktop skin behavior into mobile.
- Treat mobile as a host-specific skin adaptation, not a smaller desktop viewport.

---

## 11. Boot/onboarding boundary notes

Boot and onboarding skinning must remain visual-only and separate from readiness or permission behavior.

- Boot visuals must be separate from boot readiness.
- Do not touch watchdogs, recovery, service startup, IPC, runtime status, voice, or permissions.
- Onboarding preview should not alter consent or permission steps.
- A skin picker should be a visual choice only.
- No fake terminal boot.
- No cyberpunk boot.
- No competitor-style clone.
- Boot background/orb visuals should consume boot-specific skin variables only after the dashboard/static path is stable.
- Onboarding should not persist incompatible skin/theme states without fallback validation.

---

## 12. Hard no-touch list for first application PRs

Early application PRs must not touch:

- Runtime services.
- Voice runtime.
- Browser runtime.
- LucaLink.
- Memory/governance/model routing.
- Boot readiness logic.
- Onboarding permission flow.
- Approval/permission surfaces semantics.
- Status token definitions.
- Danger/warning/success/info tokens.
- MCP/tool/plugin behavior.
- MiniChat bridge behavior.
- Mode/tier gating.
- Tactical/debug/advanced visuals.

---

## 13. Validation checklist for future application PRs

Future application PRs should validate the boundary with this checklist:

- Run `git diff --check`.
- Run `npm run build:web` if practical.
- Static search for `document.documentElement.style.setProperty`.
- Static search for status/safety token overrides.
- Verify no runtime files changed.
- Verify no boot readiness files changed unless explicitly scoped.
- Verify no onboarding flow logic changed unless explicitly scoped.
- Verify no `App.tsx` broad rewrite.
- Verify mobile blur/motion caps.
- Verify reduced motion/transparency behavior.
- Verify unknown skin fallback to Pearl.
- Verify current theme behavior can be restored.
- Verify no danger/warning/success/info variables are introduced into the skin bridge.
- Verify no MiniChat, tool, plugin, MCP, browser, voice, or LucaLink behavior changed unless the PR explicitly scopes that work.

---

## 14. Recommendation

The next implementation PR should be:

`feat(ui): add LucaOS skin settings preview metadata`

It should be done by **Claude Opus 4.8 if the task is visual preview card design**, or **Codex GPT-5.5 if the task is metadata-only scaffolding**.

Recommended split:

- Codex first: preview metadata/types only.
- Claude after: visual preview card UI.

The safest next step is metadata-first, then preview UI, then local preview variable application. Root or dashboard application should wait until those smaller boundaries prove the bridge output, accessibility fallbacks, and unknown-skin fallback behavior.

---

## 15. Strict boundaries for this PR

This PR must be documentation-only.

Do not:

- Change source/runtime behavior.
- Edit `App.tsx`.
- Edit README.
- Touch settings implementation.
- Touch dashboard implementation.
- Touch boot implementation.
- Touch onboarding implementation.
- Touch voice runtime.
- Touch browser runtime.
- Touch LucaLink behavior.
- Touch memory/governance/model routing/services.
- Touch tactical/debug/advanced visuals.
- Apply variables to DOM/root.
- Add root provider wiring.
- Add skin selection UI.
- Add assets.
- Add screenshots.
- Add animation code.
- Copy Apple, Claude, ChatGPT, Gemini, Cursor, or competitor UI.
- Use competitor names in skin names.

Validation for this documentation-only PR:

- Run `git diff --check`.
- Build is not required because this is docs-only.
