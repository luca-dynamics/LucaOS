# Independent Top AI Interface UX Verdict for LucaOS

**Type**: Independent UX / product / design-system critique (documentation-only)
**Status**: Advisory. No runtime, source, or asset changes are made by this document.
**Date**: 2026-06-21
**Scope**: Desktop, web, and mobile interface patterns for LucaOS.
**Reference set (studied for UI discipline only)**: ChatGPT, Codex, Claude, Claude Code, Gemini, Cursor.

> **Method note.** This audit is grounded in LucaOS's own source and design docs
> (paths cited throughout) plus *publicly visible* UI behavior of leading AI
> products. It makes **no claim** to know any competitor's internal code,
> architecture, or roadmap. References to those apps are observations of surface
> patterns — spacing, density, composer design, menus, navigation, cards — not
> their product internals. No competitor screenshots, assets, logos, or copy are
> included in this repo.

---

## 0. Executive verdict

LucaOS already has the right *foundations*: a centralized material engine
(`src/styles/lucaMaterialSystem.ts`), an explicit principles doctrine
(`docs/design/lucaos-interface-principles.md`), and a three-zone shell
(`src/components/dashboard/LucaDashboardSurface.tsx`). The recent Luca Material
rollout (panel / flat-card / metric-chip / web-card / rail-control-tab-divider-workspace
/ mobile-chrome roles, plus the post-material leak audit) is exactly the kind of
discipline that production AI apps rely on.

The gap is **not** the design system. The gap is **default-state restraint**.
The strongest AI interfaces in the reference set converge on one move: *the
first screen is almost empty, and the composer is the only thing that matters.*
LucaOS's default screen, by contrast, leans toward a **three-panel control
center** — left capability sidebar + center workspace + right operational panel
with CONTROL / ACTIVITY / MEMORY tabs, all visible at once on desktop
(`LucaDashboardSurface.tsx:78-83`, `:158-321`).

**Verdict in one line:** LucaOS should *keep its OS-level ambition and embodied
presence*, but adopt the **calm-default discipline** of top AI apps — collapse
to the composer first, reveal panels on intent — so the system feels advanced
because it is *quiet until summoned*, not because it shows everything at once.

Crucially, LucaOS should **borrow the UI discipline of these apps without
inheriting their product category.** See [§7 LucaOS category distinction](#7-lucaos-category-distinction).

---

## 1. What top AI interfaces have in common

Observing the production surfaces of ChatGPT, Claude, Gemini, Codex, Claude
Code, and Cursor, the same disciplines recur. None of these are unique
inventions; they are the *current consensus* for calm, high-trust AI UI.

| Pattern | What the reference apps do | Why it works |
|---|---|---|
| **Calm empty states** | First screen is mostly whitespace: a greeting, the composer, maybe 3–4 suggestion chips. | Removes choice paralysis; makes "start typing" the obvious action. |
| **Strong central composer** | The input is the visual center of gravity — wide, slightly elevated, persistent. | The product's core verb (ask / do) is always one glance away. |
| **Simple sidebars** | Sidebar = session history + a few entry points. Mostly text rows, one accent, collapsible, often hidden by default on narrow widths. | Navigation is recall, not configuration. Low density keeps it scannable. |
| **Compact menus** | Settings and overflow live in small popovers/menus, grouped, text-forward, few icons. | Configuration is on-demand, never ambient. |
| **Flat cards / lists** | Content uses hairline dividers and flat rows, not nested elevated cards. | Lowers visual weight; lets typography carry hierarchy. |
| **Restrained dark mode** | Dark themes are near-neutral grays, low saturation, one accent. No neon, no glow-by-default. | Reduces eye strain and "gamer/cyber" connotations; reads as professional. |
| **Low visual noise** | Few borders, soft or no shadows, minimal status chrome. | The content (the conversation) is the interface. |
| **Clear task/session hierarchy** | One clear "current session," history below, obvious "new" affordance. | Users always know where they are and how to start over. |
| **Minimal borders/shadows** | Separation via spacing and subtle tint, not boxes. | Modern, airy, OS-native feel. |
| **Adaptive desktop/mobile shells** | Mobile is a *reduction*, not a squeeze: composer + thread + a single nav, panels become sheets. | Mobile feels native, not like a shrunk desktop. |

**The single common thread:** these apps spend their *complexity budget* on the
conversation and the model, and almost nothing on chrome. The interface
disappears.

---

## 2. What LucaOS should adopt

These are direction-setting recommendations, not implementation instructions.
File references indicate *where* the principle would land.

### 2.1 Spacing rules
- Establish a documented spacing scale (4 / 8 / 12 / 16 / 24 / 32) and treat
  generous whitespace as a feature, not wasted space. The material engine
  already centralizes surfaces; pair it with a spacing token doctrine so PRs
  stop hand-tuning padding (`ChatPanel.tsx` mixes `p-2`, `px-3 pb-3 pt-0`,
  `px-6`, `gap-3` ad hoc).
- Default screens should feel *under-filled*. Borrow the reference apps' habit
  of letting the composer breathe with large vertical margins.

### 2.2 Composer priority
- The composer is LucaOS's most important surface and should be the **single
  dominant element** of the default view. The centered welcome state in
  `ChatPanel.tsx:619-789` is close — keep and strengthen it.
- In the docked state (`ChatPanel.tsx:792-947`) the composer competes with a
  large "LUCA" watermark (`:853-860`), a Workforce toggle (`:815-848`), and
  suggestion chips. Reduce competing elements so the input stays the focal
  point.
- Treat the composer's elevation/border emphasis (`ChatPanel.tsx:543-551`) as
  the *one* place a soft glow is justified — it earns the attention.

### 2.3 Sidebar density
- The left sidebar (`OperationsSidebar.tsx`, ~397 lines) should bias toward
  **session/recall + a short capability list**, with advanced groups collapsed
  by default — exactly as Principle 4 already states
  (`lucaos-interface-principles.md:58-69`). Verify the implementation matches
  the doctrine; collapse anything beyond "Core" by default.
- Default sidebar width is 320px (`LucaDashboardSurface.tsx:83`). That is fine,
  but the *content* should read as quiet text rows, not a dense tool grid.

### 2.4 Panel / card hierarchy
- The material engine already encodes a correct weight ladder:
  panel > web-card > flat-card > metric/chip > control
  (`lucaMaterialSystem.ts:102-107`, tint strengths 72% → 52% → 45% → 34% → 30%).
  **Use it as the law.** Cards must not gain shadows; metrics must not gain
  borders-on-borders. The default flat-card shadow is correctly `none`
  (`lucaMaterialSystem.ts:165`) — keep it that way.
- Avoid stacking elevated panels inside elevated panels. Prefer hairline
  dividers (`lucaMaterialDividerStyle`) for in-panel separation.

### 2.5 Button / chip / menu behavior
- Standardize three interaction weights only: **control** (neutral),
  **control-active**, and **primary/accent**. The engine already provides
  `lucaMaterialControlStyle` / `lucaMaterialControlActiveStyle`
  (`lucaMaterialSystem.ts:194-205`). Resist inventing per-component button
  styling.
- Menus (settings, overflow, MCP, persona) should be compact popovers using
  `lucaMaterialPopoverStyle`, grouped and text-forward — matching the reference
  apps' compact-menu discipline.

### 2.6 Dark / light mode contrast
- Both modes are first-class per Principle 11 (`lucaos-interface-principles.md:160-171`).
  Hold the line: dark mode should be **near-neutral and low-saturation by
  default**, with the accent used sparingly. The "no cyberpunk / neon defaults"
  intent is already written into the material engine header
  (`lucaMaterialSystem.ts:41-46`) — enforce it in review.
- Guarantee WCAG AA before glass/blur; glass is polish, not structure
  (`lucaos-interface-principles.md:165-167`).

### 2.7 Mobile simplification
- Mobile should be a *reduction*. Today the mobile shell maps
  SYSTEM / TERMINAL / DATA tabs to left / center / right panels
  (`LucaDashboardSurface.tsx:362-393`, `:187-360`) — effectively exposing the
  full desktop three-zone model on a phone. Reference apps instead lead with
  **thread + composer**, and demote secondary panels to sheets reached
  intentionally.
- Keep the bottom nav thumb-reachable (already a 3-col grid, `:362-393`) but
  consider whether "SYSTEM" and "DATA" should be the *first* things a mobile
  user sees, or be tucked behind a single overflow.

### 2.8 Settings / menu compactness
- The header carries a lot of ambient chrome — credits pill, runtime chip,
  ambient-vision toggle, always-on controls, connection status, settings
  (`Header.tsx:172-317`). Reference apps keep the top bar nearly empty. Consider
  consolidating status indicators into a single compact "system" popover, with
  only the most important state shown inline.

### 2.9 Empty-state structure
- Adopt a consistent empty-state template everywhere (chat, right-panel tabs,
  memory, activity): **one line of what this is + one primary action + optional
  honest "not yet connected" note** (Principle 12, `lucaos-interface-principles.md:174-185`).
- The welcome state's rolling init steps and AI awakening
  (`ChatPanel.tsx:344-358`, `:677-748`) are a nice identity moment — keep them
  *calm*; avoid layering more motion on top.

---

## 3. What LucaOS should NOT copy

- **Generic chatbot layout.** LucaOS is not "thread + sidebar of threads." It is
  a device-level AI layer. Do not flatten the workspace
  (`lucaos-interface-principles.md:30-40`, Principle 2) into a plain message
  list. The center is a *workspace* (chat / voice / browser / canvas / code),
  not just chat.
- **Competitor branding.** No competitor wordmarks, colorways, icon styles, or
  copy. LucaOS's wordmark and tier treatment (`Header.tsx:43-54`) are its own.
- **Hiding Luca's embodied presence.** The Hologram / Presence Face, VoiceHUD,
  and presence orb (`src/components/Hologram/*`, `src/components/visual/Luca*Presence*`,
  `src/components/voice/VoiceHudSurface.tsx`) are core identity. Calm ≠ absent.
  Presence should be *quiet by default and summonable*, never deleted to imitate
  a text-only assistant.
- **Over-simplifying into a normal chat app.** Restraint is about *default
  density*, not *removed capability*. The OS concept must survive the cleanup.
- **Removing Luca's device-level concept.** LucaLink, host-aware surfaces, and
  cross-device continuity (`docs/embodiment/LUCALINK_PROTOCOL.md`,
  `connectionTier` in `Header.tsx:56-69`) are differentiators. Keep them — just
  make them *opt-in surfaces*, not ambient noise.
- **Forcing web/mobile to look like desktop.** The platform-aware material
  resolvers already exist (`lucaMaterialSystem.ts:362-408`,
  `resolveLucaMobileChromeMaterial`). Use them. Mobile and web should be
  genuinely *different shells*, not the desktop shell at a different width.

---

## 4. LucaOS unique advantage

Top AI apps are calm because they are *minimal*. LucaOS can be calm **and feel
more advanced**, because it has presence and device-level surfaces those apps
don't expose. The trick is to keep all of it **latent** — invisible until
summoned — so the default shell stays as quiet as ChatGPT while the *capability
ceiling* is far higher.

| LucaOS surface | Where it lives | How it creates advantage while staying calm |
|---|---|---|
| **Luca Widget** | `src/components/WidgetMode.tsx`, `ChatWidgetMode.tsx` | A persistent, tiny, host-level entry point. Advanced because Luca is *always reachable*; calm because it's a single small affordance, not a window. |
| **MiniChat overlay** | `src/presence/messages/miniChatMessageRoute.ts`, `miniChatPresenceBridge.ts` | Lightweight overlay conversation without opening the full shell. Feels like an OS, not an app — yet adds zero chrome to the main surface. |
| **Hologram / Presence Face** | `src/components/Hologram/*`, `src/components/visual/Luca*Presence*` | Embodiment that signals "this is an entity, not a textbox." Keep it *ambient and optional* — a presence you can glance at, not a mascot that demands attention. |
| **VoiceHUD** | `src/components/voice/VoiceHudSurface.tsx`, `VoiceHud.tsx` | Full-screen immersive voice that *replaces* the shell (the dashboard fades — `LucaDashboardSurface.tsx:121`). This is the right model: voice is a system layer (Principle 5), not a panel. |
| **LucaLink** | `docs/embodiment/LUCALINK_PROTOCOL.md`, device center docs | Cross-device control with visible trust/approval (Principle 7). The advantage: Luca acts *across* devices; calm because approvals are explicit, not background. |
| **Local/cloud model runtime** | `connectionTier`/credits in `Header.tsx:56-112` | "On device / Linked / Cloud / Offline" continuity is a real OS-level signal competitors don't surface. Show it as *one quiet status*, not a dashboard. |
| **Persistent memory** | `src/components/right-panel/MemoryControlPanel.tsx` | "What Luca knows about you," controllable and deletable (Principle 6). Trust through transparency — but kept in a panel you open, not pushed at you. |
| **Cross-device continuity** | runtime-continuity docs, `RuntimeContinuityBootstrap` (`Header.tsx:125`) | Sessions follow the user across hosts. Advanced; should be *felt*, not displayed as telemetry. |
| **Governed browser/app/file actions** | `ControlPanel.tsx:16-31` (browser/overlay/screen services), `OperationPermissionCenter.tsx` | Luca *does things* with approval gates. The differentiator vs. chat apps. Keep the *approvals* visible and the *machinery* hidden. |
| **Host-aware desktop/mobile/web surfaces** | `lucaMaterialSystem.ts:362-408`, mobile chrome roles | One cognition, three native-feeling shells. This is the OS thesis made visible. |

**The principle:** every one of these is a reason LucaOS is *more* than a
chatbot — but each should be **a door, not a wall**. Default shell stays calm;
the user *opens* presence, voice, device control, memory when they want them.
That combination — calm surface, deep capability one tap away — is the thing no
chatbot wrapper can copy.

---

## 5. Current LucaOS risk areas

These are *likely* risks inferred from the current shell and panels. They are
hypotheses for review, not defect claims.

1. **Too many panels visible by default.** Desktop shows left + center + right
   simultaneously (`LucaDashboardSurface.tsx:158-321`). The reference consensus
   is *one* dominant surface at rest. **Risk: the default reads as a console.**
2. **Dashboard complexity.** `ControlPanel.tsx` imports ~30 runtime services
   (`ControlPanel.tsx:4-47`) and is ~598 lines; `ActivityPanel.tsx` is ~1552
   lines. Even well-organized, this is a lot of operational surface to render at
   rest. **Risk: operational truth bleeds into the calm default.**
3. **Right-panel density.** Three tabs (CONTROL / ACTIVITY / MEMORY) each dense
   with metrics/sections (`LucaDashboardSurface.tsx:78-82`, `:266-321`).
   Appropriate for Tactical/Origin; possibly too much for Basic default.
4. **Default screen feeling like a control center.** Header status cluster
   (`Header.tsx:172-317`) + right panel + capability sidebar together can read
   as "mission control" rather than "calm room" — contradicting Principle 1
   (`lucaos-interface-principles.md:15-27`).
5. **Composer not visually dominant enough (docked state).** In the docked view
   the composer shares the frame with a large "LUCA" watermark
   (`ChatPanel.tsx:853-860`), a mode toggle, and chips. **Risk: the most
   important element isn't clearly the most important.**
6. **Mobile inheriting desktop complexity.** Mobile tabs map 1:1 to the three
   desktop zones (`LucaDashboardSurface.tsx:187-393`). **Risk: mobile is
   "desktop-minus," which Principle 14 explicitly warns against
   (`lucaos-interface-principles.md:201-212`).**
7. **Advanced/Pro visuals bleeding into default.** Tier wordmark stylization
   exists (`Header.tsx:43-54`) and is gated — good. The risk is *other* Pro/
   Creator density (dense panels, diagnostics) appearing in Basic. Audit that
   Basic truly hides Tactical surfaces.
8. **Overuse of glass / blur / borders.** `glass-blur` is applied broadly across
   header, chat, and panels (`Header.tsx:122`, `ChatPanel.tsx:544`, `:628`,
   `:803`), and nearly every material role carries a border. The engine *can*
   thin these via material slots (`lucaMaterialSystem.ts:68-130`), but the
   defaults should trend toward **fewer borders and lighter blur**, matching the
   reference apps' near-borderless look.

---

## 6. Recommended LucaOS interface principles (ruleset for future UI PRs)

A numbered ruleset to cite in UI PR descriptions and review. These *extend*, and
do not replace, `docs/design/lucaos-interface-principles.md`.

1. **One dominant surface at rest.** The default view has a single focal element
   (the composer/workspace). Side panels are *available*, not *asserted*.
2. **The composer is sacred.** Nothing may out-weigh the composer visually in the
   default and docked chat states. Watermarks, toggles, and chips yield to it.
3. **Reveal on intent, not on load.** Operational panels, memory, activity, and
   device control open when the user asks — they are not the landing state.
4. **Respect the material weight ladder.** panel > web-card > flat-card >
   metric > control. No new elevated styles; no shadows on flat cards; no
   double borders (`lucaMaterialSystem.ts:102-107`).
5. **Three interaction weights only.** control / control-active / primary-accent.
   No bespoke buttons.
6. **Borders and blur are a budget, not a default.** Prefer spacing and subtle
   tint over boxes. Justify every new border or `glass-blur`.
7. **Dark mode is neutral first.** Low saturation, one accent, no glow-by-default.
   Cyber/Jarvis aesthetics are never the default surface.
8. **Calm by tier.** Basic = quiet room. Tactical adds density. Origin adds depth
   (`lucaos-interface-principles.md:116-157`). Advanced visuals never leak down a
   tier.
9. **Mobile is a reduction, not a squeeze.** Lead with thread + composer; demote
   panels to sheets. Never ship the desktop three-zone model on a phone.
10. **Web ≠ desktop ≠ mobile.** Use the platform material resolvers
    (`lucaMaterialSystem.ts:362-408`). Each shell is native to its host.
11. **Empty states are honest and structured.** One line of context + one primary
    action + an honest "not yet connected" when applicable (Principle 12).
12. **Presence is summonable, never noisy.** Hologram/VoiceHUD/Widget/MiniChat
    are calm by default and immersive on demand. Never delete them; never let
    them shout.
13. **Status is consolidated.** System/connection/credits/runtime collapse into
    one quiet indicator inline; details live in a popover.
14. **Readability before style.** WCAG AA guaranteed before glass; grayscale test
    must pass (`lucaos-interface-principles.md:160-171`).

---

## 7. LucaOS category distinction

> LucaOS must not be evaluated as a normal AI chat app. The reference apps are
> studied **only** for production UI discipline — spacing, density, menus,
> composer design, sidebar structure, mobile adaptation, cards, buttons, tabs,
> and calm visual hierarchy. LucaOS is a different, higher-level product
> category, and should borrow their *discipline* without inheriting their
> *category limitations*.

1. **ChatGPT / Claude / Gemini are primarily AI assistant / chat surfaces.**
   Their UI is optimized for one loop: prompt → response. Their calm comes from
   doing one thing.
2. **Codex / Cursor / Claude Code are primarily developer / task / coding
   surfaces.** Their UI is optimized for code context, diffs, and task
   execution. Their density is justified by a developer audience.
3. **LucaOS is intended to become a device-level AI operating layer** — an
   installable, upgradeable AI-OS-like environment with host-aware behavior
   across desktop, mobile, web, and future surfaces. It manages local/cloud
   models, memory, tools, browser actions, files, apps, voice, overlays, and
   device continuity. This is the *stated direction and quality bar*, not a claim
   that every part is fully complete today.
4. **Therefore LucaOS must borrow their UI discipline, not their category.**
   Take the calm shell, the strong composer, the compact menus, the restrained
   dark mode — and reject the assumption that the product *is* a chat thread.
5. **Keep the shell calm like top AI apps, express uniqueness through capability,
   not chrome.** LucaOS's distinctiveness lives in: Luca Widget, MiniChat
   overlay, Hologram/Presence Face, VoiceHUD, LucaLink, local/cloud model
   runtime, persistent memory, cross-device continuity, governed
   browser/app/file actions, and host-aware desktop/mobile/web surfaces. These
   stay *latent and summonable* so the surface reads as calm as a chatbot while
   the system underneath is an OS.

**Position statement:** Think of LucaOS as closer in ambition to a new OS-level
AI platform than to another chatbot wrapper. The reference apps prove that
billion-user AI products stay calm, spacious, and production-ready. LucaOS should
match that bar of *restraint* — and then exceed it in *capability* without ever
re-cluttering the surface.

---

## 8. Billion-scale product quality bar

LucaOS should be judged against the product-quality bar of companies like
Anthropic, OpenAI, and Google — **not** against hobby AI dashboards or
"Jarvis-style" demos. This is the standard the interface should be held to in
review:

- **Calm default UI** — the first screen is quiet and obvious.
- **Low visual noise** — minimal borders, soft/no shadows, restrained color.
- **Strong typography and spacing** — hierarchy carried by type and whitespace,
  not boxes.
- **Reliable interaction patterns** — consistent buttons, menus, tabs across
  surfaces (the material engine is the enforcement point).
- **Clear onboarding** — first run feels like meeting someone (Principle 13),
  not configuring software. *(Onboarding itself is out of scope for changes
  here.)*
- **Predictable settings** — compact, grouped, discoverable.
- **Safe permissions** — governed actions with visible approval (LucaLink,
  OperationPermissionCenter).
- **Graceful fallbacks** — honest "not yet connected" states; local fallback
  greeting already models this (`ChatPanel.tsx:425-441`).
- **Fast task start** — composer-first; minimal friction to first message.
- **Strong mobile/desktop adaptation** — genuinely native shells per platform.
- **No cyberpunk / Jarvis gimmick as the default interface** — presence and
  embodiment are *premium, optional, summonable*, never the ambient default.

> **Honesty clause.** This section describes the *intended* product direction and
> quality bar. It must not be read as a claim that the current implementation
> already meets every bar. Several §5 risks indicate gaps between the doctrine
> and today's default shell; closing them is the point of the roadmap below.

---

## 9. Implementation roadmap

Follow-up work classified by risk/effort. **This document changes nothing in
runtime or source**; the items below are *proposed* future PRs for separate
review. Anything touching App.tsx, README, onboarding, voice runtime, browser
runtime, LucaLink, memory, governance, services, model routing, or
tactical/debug/advanced visuals is explicitly **out of scope** for the
`safe-small` and `medium-design-pass` buckets and is flagged accordingly.

### `safe-small` — low risk, mostly token/spacing/visual restraint
- Document and apply a spacing scale doctrine (additive doc + lint guidance);
  no behavior change.
- Trim redundant borders / lighten default `glass-blur` where the material slots
  already allow it (`lucaMaterialSystem.ts:68-130`) — visual-only.
- Reduce competing elements around the docked composer: soften/shrink the "LUCA"
  watermark (`ChatPanel.tsx:853-860`).
- Standardize empty-state copy/structure across right-panel tabs (presentation
  only).
- Consolidate header status chips into a quieter inline cluster (presentation
  only; no service changes) — *header chrome, not the services behind it*.

### `medium-design-pass` — coordinated visual changes, one shell at a time
- Default-state restraint: make the right panel **collapsed by default** for the
  Basic tier, opened on intent (the collapse rail already exists,
  `LucaDashboardSurface.tsx:217-257`).
- Mobile reduction pass: lead mobile with thread + composer; move SYSTEM/DATA
  behind a single overflow rather than co-equal tabs
  (`LucaDashboardSurface.tsx:362-393`).
- Establish the documented material weight ladder as a review checklist and
  reconcile any panels that violate it.
- Web shell differentiation pass using the existing web-card/web-fallback roles.

### `needs-founder-review` — identity / category decisions
- How much operational truth (CONTROL/ACTIVITY/MEMORY) should be visible in the
  Basic default vs. revealed on intent. This trades calm against the "operational
  truth never hidden" principle (`lucaos-interface-principles.md:42-55`) and is a
  product-philosophy call.
- Default visibility and prominence of embodied presence (Hologram/Presence Face)
  — calm-default vs. signature-identity balance.
- The degree to which the default shell should resemble a single-surface chat app
  vs. a visible multi-zone OS. This is the core category tension and should be a
  founder decision, not a design default.

### `defer` — explicitly not now
- Anything touching voice runtime, browser runtime, LucaLink, memory, governance,
  services, or model-routing *behavior* (out of scope by mandate).
- Tactical/debug/advanced visual surfaces.
- Onboarding flow and App.tsx structure.
- User-facing material sliders (the slots exist in
  `lucaMaterialSystem.ts:68-76` but wiring them is a separate, larger effort).

---

## 10. Validation

- **Build**: Not required for a documentation-only change; no build was run.
- **Source/runtime impact**: None. This PR adds a single Markdown file under
  `docs/` and changes no `.ts`/`.tsx`, `App.tsx`, README, onboarding, runtime,
  or asset files.
- **Assets**: No screenshots, logos, or competitor assets added.
- **Claims discipline**: All competitor references describe visible UI patterns
  only; no claims about competitor internals are made.

---

## Appendix: primary surfaces inspected

- `src/components/dashboard/LucaDashboardSurface.tsx` — three-zone shell, rails,
  mobile tab mapping.
- `src/components/layout/ChatPanel.tsx` — centered welcome + docked composer,
  watermark, Workforce toggle.
- `src/components/layout/Header.tsx` — brand, status cluster, settings.
- `src/components/layout/OperationsSidebar.tsx` — left capability sidebar.
- `src/components/right-panel/ControlPanel.tsx`, `ActivityPanel.tsx`,
  `MemoryControlPanel.tsx`, `OperationPermissionCenter.tsx` — operational truth
  panels.
- `src/components/mobile/*`, `src/components/MobileManager.tsx` — mobile surfaces.
- `src/styles/lucaMaterialSystem.ts` — material role engine and platform
  resolvers.
- `docs/design/lucaos-interface-principles.md`, `docs/interface/UI_UX_DOCTRINE.md`,
  `docs/luca-material-system.md` — existing doctrine.
