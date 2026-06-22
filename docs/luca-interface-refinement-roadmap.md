# LucaOS Interface Refinement Roadmap

**Date:** 2026-06-21 (UTC)  
**Type:** Consolidated documentation-only roadmap  
**Source PRs synthesized:** PR #401 `docs(ui): audit top AI interface patterns for LucaOS`; PR #402 `docs(ui): add independent top AI interface UX verdict`  
**Status:** Roadmap only; no runtime/source behavior changes.

## 1. Executive synthesis

The two independent interface audits converge on the same product direction: LucaOS should not be evaluated as a normal AI chat app. ChatGPT, Claude, Gemini, Codex, Claude Code, and Cursor are useful references because they demonstrate production UI discipline at scale: calm empty states, clear composer hierarchy, restrained chrome, compact menus, consistent spacing, and mobile reduction. They are not category targets.

LucaOS is an AI-native operating layer: an installable, device-level AI host with chat, runtime, memory, governed actions, voice, presence, MiniChat, Luca Widget, local/cloud model awareness, and cross-device shell ambitions. That category distinction matters. The objective is not to turn LucaOS into a centered chatbot or an IDE clone; the objective is to make its OS-level power feel quiet, trustworthy, and intentional.

The Luca Material rollout has made the foundation strong enough to support this next stage. The material engine, shared primitives, settings opacity/blur host-policy wiring, panel/header migrations, flat card/metric/web-card roles, rail/control/tab/divider/workspace roles, post-material leak audit, and mobile material chrome roles together provide a safer design-system base than the repo had before.

The main remaining risk is not missing visual polish. It is default-state restraint, density, and disclosure. LucaOS has many valid capabilities, but when too many of them are visible at once the shell can read as a dashboard for operators rather than an operating system for intelligence.

**Guiding sentence:** “LucaOS should feel like a quiet operating system for intelligence, not a dashboard for controlling intelligence.”

The target feel is calm like top AI products, but more powerful because LucaOS is OS-level. Panels, presence, runtime, memory, and advanced tooling should be available on intent, not ambiently competing with the user's primary action.

## 2. Source documents summarized

### `docs/luca-top-ai-interface-pattern-audit.md`

Decision extracted: use top AI products as a quality bar for spacing, density, menus, composer behavior, sidebars, mobile adaptation, and calm hierarchy, not as layouts to copy. The audit finds LucaOS's shell architecture directionally strong: a left capability area, center workspace, right operational truth panel, mobile bottom tabs, centered empty composer, docked active composer, and material-role hierarchy. The key decision is to preserve OS-level differentiation while reducing default density and avoiding cyberpunk/Jarvis/terminal defaults.

### `docs/luca-top-ai-interface-ux-verdict.md`

Decision extracted: the design-system foundation is not the primary gap; default-state restraint is. The verdict argues for composer-first calm, panels revealed on intent, compact menus, lower visual noise, and mobile as reduction rather than squeezed desktop. It also preserves LucaOS-specific strengths: presence, widget, MiniChat, runtime, memory, governed actions, and OS identity should remain differentiators, but each should be a door rather than a wall.

### `docs/luca-material-system.md`

Decision extracted: LucaOS now has a semantic material engine for root, panel, floating panel, sidebar, sheet, popover, dialog, overlay, HUD, resizable handle, mobile panel, mobile sheet, and web fallback roles. These roles resolve from Luca appearance tokens and host policies, including desktop app, desktop web, mobile app, and mobile web behavior. The next interface work should extend this role discipline rather than hand-compose new glass, shadows, or hardcoded colors.

### `docs/theme-regression-audit.md`

Decision extracted: default/basic shell surfaces have been audited and migrated away from fixed white/black rgba, gray/slate, and ad hoc cyber styling where appropriate. Remaining hardcoded or advanced visual language is intentionally bucketed into specialized surfaces such as tactical, creator, mobile screen mirror, visual/debug, or broader web-theme areas. The roadmap should not opportunistically redesign those advanced surfaces while refining default shell calm.

## 3. Combined findings table

| Area | Codex audit finding | Claude UX verdict | Combined decision | Implementation risk | Suggested follow-up PR |
| --- | --- | --- | --- | --- | --- |
| default desktop shell | Three-zone shell is sound, but both side panels open can compress the calm center. | Default currently reads too much like a three-panel control center. | Keep OS shell architecture; make default state calmer and more intent-revealed. | High if behavior changes happen without product approval. | Right-panel default disclosure policy; Phase 3 default model decision. |
| composer/input | Centered empty composer and docked active composer are strong; controls are dense. | Composer should be the first-screen center of gravity. | Composer is the primary action object; inventory before visual simplification. | Medium because controls may map to runtime, tier, voice, MCP, and attachment behavior. | Composer affordance inventory; composer visual simplification. |
| left sidebar | Capability organization is useful but can feel dense or alarming near default tools. | Sidebar should be simple, text-forward, and collapsible. | Keep capability access; refine density and grouping after inventory. | Medium because tool discoverability and tier access may be affected. | Left sidebar density refinement. |
| right panel | Operational truth is a LucaOS advantage but should not become a mission-control wall. | Reveal panels on intent; avoid all operational tabs visible by default. | Define Basic/Pro/Creator default visibility policy before changing behavior. | High because defaults change perceived product category. | Right-panel disclosure policy; default collapsed state by mode. |
| header/status cluster | OS-like status belongs in header, but low-frequency controls should move out of primary chrome. | Top bars in mature AI products stay sparse. | Audit status cluster and classify always-visible versus popover/settings/mode-specific. | Medium because credits, runtime, connection, admin, and lockdown are trust signals. | Header status cluster audit; compact status presentation. |
| mobile shell | Bottom tabs and mobile material roles are a strong foundation. | Mobile must be a reduction, not squeezed desktop. | Preserve mobile-specific shell; reduce default chrome and panel density. | Medium-high because mobile IA decisions affect primary navigation. | Mobile default-state reduction; Phase 3 mobile IA model. |
| material hierarchy | Panel/card/control/tab/mobile roles are directionally strong. | Foundation is strong; do not redesign system randomly. | Preserve role hierarchy: panel > card > metric/chip > control/tab > divider. | Low if docs-only; medium if future PRs bypass material roles. | Spacing/density doctrine; material role guardrails. |
| spacing/density | Spacing is still applied ad hoc in components. | Establish 4/8/12/16/24/32 scale and density tiers. | Document spacing scale and Basic/Pro/Creator density levels before migration. | Low for documentation; high for broad source migration. | Spacing/density doctrine. |
| menus/popovers | Popover role exists, but some bespoke menu surfaces remain. | Menus should be compact and on-demand. | Audit menu/popover compactness and migrate only focused default/basic surfaces later. | Medium because hidden controls may reduce discoverability. | Menu/popover compactness audit. |
| presence layer | Presence/Hologram is a differentiator but should not dominate default shell. | Presence should be summonable, not noisy. | Keep presence as OS identity; decide default visibility separately. | High because presence expresses brand/product thesis. | Presence hierarchy pass; Phase 3 default visibility decision. |
| Luca Widget/MiniChat | MiniChat can be a system overlay, not a smaller dashboard. | Widget/MiniChat is a differentiator and entry door. | Make lightweight overlay behavior feel calmer than dashboard; do not prioritize before entry model decision. | Medium-high because entry priority shapes user habit. | Composer affordance inventory; Luca Widget vs dashboard entry priority. |
| VoiceHUD | Voice is a LucaOS differentiator; current HUD should not be changed casually. | Voice should be available on intent, not ambiently noisy. | Do not change runtime behavior; only classify visibility and chrome later. | High because runtime behavior and trust feedback are coupled. | Defer voice runtime behavior changes; possible visual-only audit later. |
| advanced/pro/creator surfaces | Tactical/creator/debug visual language is intentionally out of default/basic scope. | Basic should be quiet; Pro/Creator may reveal density. | Do not redesign advanced surfaces in this roadmap; define density model first. | High because advanced users may depend on current information density. | Phase 3 Basic/Pro/Creator density model; Phase 4 visual redesign. |

## 4. Implementation sequence

### Phase 1 — safe-small, no behavior change

1. Composer affordance inventory.
2. Header status cluster audit.
3. Right-panel default disclosure policy.
4. Spacing/density doctrine.
5. Menu/popover compactness audit.
6. Empty-state preservation guardrail.

### Phase 2 — design-reviewed visual changes

1. Composer visual simplification.
2. Header compact status presentation.
3. Right-panel default collapsed state by mode.
4. Left sidebar density refinement.
5. Mobile default-state reduction.
6. Presence hierarchy pass.

### Phase 3 — founder-approved product decisions

1. Composer-first vs visible OS dashboard default.
2. Basic/Pro/Creator density model.
3. Mobile IA model.
4. Hologram/Presence default visibility.
5. Luca Widget vs dashboard entry priority.

### Phase 4 — defer

1. Tactical/pro/creator visual redesign.
2. Browser runtime UX redesign.
3. Voice runtime behavior changes.
4. LucaLink behavior changes.
5. Memory/governance workflow redesign.
6. Onboarding redesign.
7. `App.tsx` restructuring.

## 5. Safe-small PR definitions

### A. Composer affordance inventory

- **Objective:** classify every visible and conditional composer control before any UI simplification.
- **Files to inspect:**
  - `src/components/layout/ChatPanel.tsx`
  - `src/components/ChatWidgetInput.tsx`
  - `src/components/ChatWidgetHeader.tsx`
  - MiniChat-related files if needed.
- **Files likely to edit:**
  - A new or existing documentation file under `docs/`.
- **Files not allowed:**
  - Runtime/service files.
  - Model routing files.
  - Voice runtime files.
  - MCP/runtime behavior files.
  - `src/App.tsx`.
- **Validation:** documentation diff only; optional `git diff --check`.
- **Success criteria:** controls are classified as `primary`, `secondary`, `advanced`, `hidden-by-tier`, or `do-not-touch`; no UI changes are made.
- **Risk notes:** attach, voice, send/stop, model, MCP, screen share, plugin, and clear-chat affordances may carry behavior or trust implications; do not hide or move them yet.

### B. Header status cluster audit

- **Objective:** classify header controls and status signals into visibility tiers.
- **Files to inspect:**
  - `src/components/layout/Header.tsx`
  - status, connection, credits, runtime, admin, lockdown, ambient vision, always-on, and settings display paths.
- **Files likely to edit:**
  - A new or existing documentation file under `docs/`.
- **Files not allowed:**
  - Connection services.
  - Credits/billing services.
  - Runtime/model services.
  - Lockdown/admin behavior.
  - `src/App.tsx`.
- **Validation:** documentation diff only; optional `git diff --check`.
- **Success criteria:** header items are classified as `always-visible`, `popover`, `settings`, or `mode-specific`; no service/runtime changes are made.
- **Risk notes:** some status signals are user trust and safety indicators, so compacting them requires design review after the audit.

### C. Right-panel disclosure policy

- **Objective:** propose a default visibility policy for right-panel operational truth by user mode.
- **Files to inspect:**
  - `src/components/dashboard/LucaDashboardSurface.tsx`
  - `src/components/right-panel/*`
- **Files likely to edit:**
  - A new or existing documentation file under `docs/`.
- **Files not allowed:**
  - Right-panel behavior/state code.
  - Memory/governance services.
  - Runtime trace services.
  - `src/App.tsx`.
- **Validation:** documentation diff only; optional `git diff --check`.
- **Success criteria:** Basic, Pro, and Creator default visibility policies are proposed; no behavior change is made.
- **Risk notes:** the right panel communicates transparency and operational trust; collapsing it by default should be a later, reviewed product decision.

### D. Spacing/density doctrine

- **Objective:** document a small shared spacing and density doctrine before broad component migrations.
- **Files to inspect:**
  - Material docs.
  - Theme docs.
  - Dashboard, layout, chat, right-panel, and left-panel components.
- **Files likely to edit:**
  - A new or existing documentation file under `docs/`.
- **Files not allowed:**
  - Broad source migration files.
  - Advanced/tactical/creator visual surfaces.
  - `src/App.tsx`.
- **Validation:** documentation diff only; optional `git diff --check`.
- **Success criteria:** a 4/8/12/16/24/32 spacing scale is defined; Basic/Pro/Creator density levels are defined; no broad source migration is attempted.
- **Risk notes:** density is product semantics, not just padding. Basic mode should preserve calm; Pro/Creator can expose more detail by intent.

### E. Menu/popover compactness audit

- **Objective:** identify default/basic menus and popovers that should use compact, role-based, text-forward disclosure.
- **Files to inspect:**
  - `src/styles/lucaMaterialSystem.ts`
  - `src/components/ChatWidgetInput.tsx`
  - Header menu/popover paths.
  - Dashboard, left-panel, and right-panel menu paths.
- **Files likely to edit:**
  - A new or existing documentation file under `docs/`.
- **Files not allowed:**
  - Runtime/service files.
  - Settings persistence logic.
  - `src/App.tsx`.
- **Validation:** documentation diff only; optional `git diff --check`.
- **Success criteria:** menu/popover surfaces are classified as already-role-based, bespoke-but-safe, needs-compactness, or defer.
- **Risk notes:** compacting menus can hide capability; follow-up visual changes need interaction review.

### F. Empty-state preservation guardrail

- **Objective:** protect the calm centered empty state from dashboard widget creep.
- **Files to inspect:**
  - `src/components/layout/ChatPanel.tsx`
  - Dashboard shell docs and design principles.
  - Suggestion chip and welcome/startup message paths.
- **Files likely to edit:**
  - A new or existing documentation file under `docs/`.
- **Files not allowed:**
  - Chat message behavior.
  - Onboarding.
  - Model routing.
  - `src/App.tsx`.
- **Validation:** documentation diff only; optional `git diff --check`.
- **Success criteria:** empty-state rules define what may appear before the first user action and what must remain intent-revealed.
- **Risk notes:** empty state is one of LucaOS's strongest alignments with top AI UI discipline; protect it from metrics, status walls, and advanced controls.

## 6. Non-negotiable LucaOS interface rules

1. Composer is the primary action object.
2. Default shell must be calm.
3. Panels reveal on intent.
4. Presence is summonable, not noisy.
5. Mobile is a reduction, not a squeezed desktop.
6. Basic mode is quiet; Pro/Creator can reveal more density.
7. Material hierarchy must remain: panel > card > metric/chip > control/tab > divider.
8. No cyberpunk/Jarvis/terminal default styling.
9. No copying competitor UI or assets.
10. LucaOS must preserve OS-level identity.

## 7. Strict rules

Do not:

- change runtime/source behavior;
- edit `App.tsx`;
- edit `README`;
- touch onboarding;
- touch voice runtime;
- touch browser runtime;
- touch LucaLink behavior;
- touch memory/governance/model routing/services;
- touch tactical/debug/advanced visuals;
- add competitor screenshots/assets/logos;
- copy competitor UI directly.

This roadmap is documentation-only. Build is not required. If checks are run and fail from known repo-wide TypeScript or test-fixture errors, document those failures as unrelated to this roadmap.
