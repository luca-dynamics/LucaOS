# Premium LucaOS Onboarding and Post-Boot Experience Design

**Type:** Product / design specification (documentation-only)
**Status:** Design spec. No source, runtime, UI, service, skin, asset, or behavior changes are made by this document. Implementation stays paused until staged Codex tasks begin.
**Date:** 2026-06-24
**Audience:** Founder / product owner and implementers (Codex to implement later in scoped PRs).
**Target PR:** `docs(ui): design premium LucaOS onboarding and post-boot experience`

**Read together with:**

- `docs/luca-boot-onboarding-product-experience-audit.md` (the audit this spec translates)
- `docs/luca-skin-boot-onboarding-plan.md`
- `docs/luca-skin-boot-qa-matrix.md`
- `docs/luca-skin-application-boundaries.md`

> Product direction: **"LucaOS should feel like a quiet operating system for intelligence, not a dashboard for controlling intelligence."**

> Skin framing: **"LucaOS skins are not decorations; they are the visual operating environments for an AI-native OS."**

> **Scope guard.** This document is a specification only. It does not implement UI, edit components/services, change onboarding/boot logic, apply skins to onboarding, add a resolver or boundary, touch `App.tsx`, add assets/screenshots, or change Web Safe Mode behavior. Every screen below is a *target* for later, separately-reviewed implementation.

> **Status update (2026-06-24).** The post-boot readiness bridge now has a dedicated implementation plan: `docs/luca-postboot-readiness-bridge-implementation-plan.md`. Implementation should follow that plan first, and onboarding remains paused until the bridge plan is implemented in staged follow-up PRs.

> **Implementation status (2026-06-24).** The first staged implementation slice begins with a copy/state mapping model only. Onboarding implementation remains paused while the post-boot bridge presentation is prepared in follow-up PRs.

---

## 1. Executive summary

The Boot Window is now the strongest moment of the launch sequence — premium, identity-forward, with a local skin boundary and guarded readiness. The weak moments are **immediately after boot** (a post-boot transition that reads like a debug waiting room / state resolver) and **onboarding** (a sequence still shaped around internal engineering steps: kernel awakening, directive alignment, cognitive core selection, provisioning, calibration).

**Why redesign before implementation.** Skins amplify whatever product structure exists. If onboarding is skinned or polished before the product concept is settled, LucaOS risks polishing an old setup wizard, hard-coding copy that must later be revised, and forcing skin-boundary decisions around screens that will be renamed, merged, or removed. The audit established *what is wrong*; this spec establishes *what to build*, specifically enough that Codex can implement it in safe, staged PRs.

**What the new experience should feel like.** A short, calm, premium **first-run environment ceremony for a device-level AI being** — not a setup wizard for an AI tool. A new user should understand, within a minute, that Luca lives across their device (chat, voice, widget, presence), has understandable permission and memory boundaries, can connect to tools with consent, and can route intelligence through Luca Prime, BYOK, cloud, or local models.

**How it differs from a chatbot setup wizard.** A chatbot wizard collects an API key and drops you in a thread. LucaOS onboarding instead introduces *surfaces* (Luca is more than a thread), *boundaries* (permission + memory as trust anchors), and *routes* (where intelligence comes from) — framed as "Luca becoming part of this device."

**How it stays premium, calm, device-native, non-cyberpunk.** Plain language in Basic mode; protocol/kernel/runtime/tactical language removed from the default path and reserved for Pro/Creator/Origin or `details`/debug. One clear decision per screen. Calm motion, generous spacing, strong contrast before beauty. No green-on-black terminal, no radar/scanline/Jarvis theatrics, no fake command output.

**Why implementation stays staged.** First-run touches trust, readiness, degraded-state honesty, permission-sensitive setup, and completion routing. Each is high-risk. The spec sequences implementation so behavior is proven in small reversible steps (post-boot bridge → screen map/types → copy model → onboarding skin boundary → Basic → Pro/Creator → QA → polish → regression).

---

## 2. Experience principle

> **The first run of LucaOS should feel like Luca becoming part of the device, not like configuring an app.**

What that means, dimension by dimension:

- **Language** — human, second-person, calm. "Luca lives across your device." Not "Initialize kernel," "Align directives," "Provision cognitive core." Advanced vocabulary is opt-in (Pro/Creator) or behind `details`.
- **Layout** — one decision per screen, centered, spacious, a single dominant choice. No multi-panel control-center walls during first run. Progress is quiet and legible.
- **Motion** — calm, short, premium. Presence may settle gently; nothing pulses, scans, or loops. Flow stays static. Reduced motion always wins.
- **Trust** — permission and memory are *anchors*, not footnotes. The user always understands what Luca can do, what it remembers, and how to change or undo it. Degraded/secure states are honest.
- **Memory** — framed as boundaries the user sets ("what Luca may remember / should ask about / can forget"), not as a database setup step.
- **Permissions** — framed as the user deciding *how autonomous* Luca should be, not as Luca begging for access. Sensitive/destructive actions always confirm regardless of style.
- **Model routing** — framed as "how Luca should think" (intelligence route), with provider/local technicalities gated to Pro/Creator and never blocking Basic.
- **Tool access** — framed by *benefit and consent* ("connect your browser so Luca can help with what's on screen"), with "connect later" always available.
- **Presence surfaces** — onboarding actively teaches that Luca appears as MiniChat, Voice, Widget, and Presence/Hologram — the dashboard is one surface, not the whole product.

---

## 3. New post-boot bridge concept

The screen after the Boot Window (currently `WebPostBootLoading` + `WebPostBootTransition`, routed by `WebLifecycleShell`) should become a calm **readiness bridge**, not a state resolver / debug waiting room.

> **Implementation status (2026-06-24).** The post-boot loading and transition presentation now read from the typed readiness bridge copy model. This keeps lifecycle routing, onboarding behavior, Web Safe Mode behavior, and skin boundaries unchanged while replacing the default debug-like waiting room language with calm readiness copy.

### Recommended normal-path copy

```text
Preparing your LucaOS environment
  Checking your preferences
  Restoring memory boundaries
  Preparing safe tool access
Ready to continue
```

### Screen purpose

Bridge the moment between "LucaOS booted" and "first run begins / welcome back." It reassures that Luca is settling into the device, resolves post-boot state quietly, and hands off to onboarding (new user) or the main shell (returning user) — without exposing setup mechanics.

### Layout

- Centered, single column, generous vertical breathing room — a calmer sibling of the Boot Window, sharing its identity language.
- A short title, a small set of reassuring readiness lines that resolve to done, and a single primary action when input is needed.
- Quiet progress (the lines themselves are the progress), not a technical percentage or log stream.

### Visual hierarchy

1. Title ("Preparing your LucaOS environment" / "Welcome back").
2. Readiness lines (calm, resolving).
3. Primary action (only when the user needs to act).
4. Secondary "Details" affordance (low emphasis).

### Primary action

- **New user:** "Continue" → begins onboarding ("first run begins," never "setup incomplete").
- **Returning user:** auto-continue into the main shell after readiness settles; no required click.

### Secondary / details action

A low-emphasis "Details" disclosure (and `?bootDebug=1`) reveals the technical readiness inventory, route/permission diagnostics, and Web Safe Mode specifics. Hidden by default.

### Degraded Web Safe Mode behavior

Compact, non-blocking status only (e.g., a small "Web Safe Mode" pill). It must not overlay the primary action, must not imply secure setup is complete, and must state plainly what is unavailable and that the user can continue previewing. No change to Web Safe Mode behavior itself — this spec only defines presentation expectations.

### Partial setup behavior

Maps to `partial_setup`: present as "Pick up where you left off," with a calm primary "Continue" and an optional "Review setup." Never framed as failure.

### Permission attention behavior

Maps to `permission_attention`: an actionable, calm card ("Voice needs microphone access to continue by voice") with "Review voice access" and a "Continue without it" path. Must look like a choice, not a boot error.

### Model route attention behavior

When the selected route is unavailable: "Choose how Luca should think" with "Choose a route" and "Continue with a default route." Actionable, not alarming.

### Failure / recovery behavior

Genuine failure uses semantic error styling (preserved status colors), a plain explanation, and a clear recovery action ("Try again" / "Continue in safe mode"). Distinct from attention states; never hidden, never cosmetic-only.

### Rules

- Normal path is calm and short.
- Debug diagnostics live under Details / `?bootDebug=1`.
- Web Safe Mode stays compact and non-blocking.
- Failure/recovery is semantic and clear.
- No heavy protocol language for normal users.

---

## 4. New onboarding flow

A short, premium first-run sequence. Basic mode is the spine; Pro/Creator add disclosure, not extra mandatory steps. Default path target: **≤ 8 calm screens, skippable where safe.**

```text
1. Welcome to LucaOS
2. Choose your environment
3. Choose Luca's presence
4. Choose permission style
5. Choose memory boundaries
6. Connect tools
7. Choose intelligence route
8. Finish
```

For each screen below: purpose · headline · supporting copy · primary/secondary action · what the user chooses · optional · Basic-hidden · Pro/Creator-shown · layout · maps to.

### 1. Welcome to LucaOS

- **Purpose:** Establish in one sentence that LucaOS is a device-level AI environment, not a chat app.
- **Headline:** "Welcome to LucaOS."
- **Supporting copy:** "Luca lives across your device — chat, voice, widgets, memory, tools, and safe actions."
- **Primary:** "Get started." **Secondary:** "What is LucaOS?" (calm expandable).
- **User chooses:** nothing required (and optionally "What should Luca call you?" — see naming, can live here or step 8).
- **Optional:** the name prompt.
- **Basic-hidden:** version/runtime/build details.
- **Pro/Creator-shown:** a small "Advanced setup" entry that unlocks deeper steps.
- **Layout:** centered hero, Luca presence mark, one sentence, one primary button.
- **Maps to:** Kernel Awakening + Directive Alignment intro (renamed/merged).

### 2. Choose your environment

- **Purpose:** Pick the visual operating environment (skin).
- **Headline:** "Choose your environment."
- **Supporting copy:** "Pick the look that feels right. You can change it anytime in Settings."
- **Primary:** "Continue" (Pearl preselected). **Secondary:** "Skip for now" (keeps Pearl).
- **User chooses:** Pearl / Carbon / Flow / Canvas.
- **Optional:** the whole step (safe default = Pearl).
- **Basic-hidden:** opacity/blur/legacy-theme knobs.
- **Pro/Creator-shown:** reduced-transparency / reduced-motion confirmations, light/dark relationship notes.
- **Layout:** four calm preview cards (reuse the settings skin-preview language), Pearl marked recommended.
- **Maps to:** Theme Selection (opacity/blur tuning removed from first run).

### 3. Choose Luca's presence

- **Purpose:** Teach that Luca appears across multiple surfaces; let the user enable some now.
- **Headline:** "Choose how Luca appears."
- **Supporting copy:** "Luca can show up as a quick chat, a voice, a widget, or an on-device presence."
- **Primary:** "Continue." **Secondary:** "Set up later."
- **User chooses:** which surfaces to enable now (MiniChat, Voice, Widget, Presence/Hologram); Dashboard is always present.
- **Optional:** all of it (safe default = MiniChat + Dashboard active, others "enable later").
- **Basic-hidden:** per-surface advanced config.
- **Pro/Creator-shown:** surface behavior options, always-on/overlay options.
- **Layout:** surface tiles with one-line meaning + "Active now" / "Enable later" state.
- **Maps to:** Mode Select (text/voice) — broadened from conversation-only into device presence.

### 4. Choose permission style

- **Purpose:** Let the user set how autonomous Luca is.
- **Headline:** "Choose when Luca should ask permission."
- **Supporting copy:** "You decide how much Luca can do on its own. Sensitive actions always ask first."
- **Primary:** "Continue." **Secondary:** "Use the recommended setting."
- **User chooses:** Ask every time / Ask only when needed / Custom.
- **Optional:** Custom (Basic uses "Ask only when needed" as default).
- **Basic-hidden:** per-capability custom matrix.
- **Pro/Creator-shown:** per-domain governance (browser/files/apps/actions), custom rules.
- **Layout:** three calm options with plain examples; an always-visible reassurance line about sensitive actions.
- **Maps to:** Directive Alignment / Constitutional Alignment (reframed as user control).

### 5. Choose memory boundaries

- **Purpose:** Trust anchor — what Luca remembers.
- **Headline:** "Choose what Luca can remember."
- **Supporting copy:** "Luca can remember useful things to help you. You decide what it keeps and can forget anything later."
- **Primary:** "Continue." **Secondary:** "Use safe defaults."
- **User chooses:** a memory boundary level (e.g., Remember helpful context / Ask before saving / Don't remember).
- **Optional:** advanced controls (Basic uses a safe default).
- **Basic-hidden:** local/cloud memory location internals, retention specifics.
- **Pro/Creator-shown:** memory governance depth, local vs cloud implications, per-category controls.
- **Layout:** boundary options + a one-line "how to forget" reassurance + where memory lives (plain).
- **Maps to:** (new screen — currently implicit in model/memory setup).

### 6. Connect tools

- **Purpose:** Show what Luca can connect to, by benefit and consent.
- **Headline:** "Connect tools when you're ready."
- **Supporting copy:** "Give Luca access to the things you want help with. Connect now or later — your choice."
- **Primary:** "Continue." **Secondary:** "Connect later" (default for Basic).
- **User chooses:** which connectors to enable (Browser, Files, Calendar, Mail, Apps, Local device capabilities).
- **Optional:** all (Basic defaults to connect-later).
- **Basic-hidden:** scopes/governance detail.
- **Pro/Creator-shown:** per-connector permission model, governance, scope review.
- **Layout:** connector rows with a clear benefit line + "Connect" / "Later" + permission note.
- **Maps to:** scattered runtime/provider/governance surfaces (consolidated into one calm screen).

### 7. Choose intelligence route

- **Purpose:** Choose how Luca thinks, without forcing technical setup.
- **Headline:** "Choose how Luca should think."
- **Supporting copy:** "Luca can use its built-in intelligence, your own keys, cloud models, or private local models."
- **Primary:** "Continue" (Luca Prime preselected). **Secondary:** "Advanced routes."
- **User chooses:** Luca Prime / BYOK / Cloud models / Local models.
- **Optional:** everything beyond Luca Prime; local provisioning is optional and never blocks Basic.
- **Basic-hidden:** provider keys, local provisioning/hardware scan, model downloads.
- **Pro/Creator-shown:** provider/key entry, local model stack, route status/warnings, Web-Safe-Mode "secure local runtime unavailable" marker.
- **Layout:** route options, Luca Prime recommended; advanced expands to provider/local detail.
- **Maps to:** Cognitive Core Selection + Provisioning (kept as capability, reframed + mode-gated).

### 8. Finish

- **Purpose:** Confirm the environment and enter LucaOS with context.
- **Headline:** "Luca is ready to live on this device."
- **Supporting copy:** a calm summary of choices.
- **Primary:** "Enter LucaOS." **Secondary:** "Review choices."
- **User chooses:** confirm / go back.
- **Optional:** review.
- **Basic-hidden:** technical confirmation logs.
- **Pro/Creator-shown:** full configuration summary, links to deeper settings.
- **Layout:** confirmation summary card (environment, presence, permission style, memory boundary, tools/connect-later, route) + one primary CTA into the dashboard.
- **Maps to:** Calibration / Completion (renamed).

---

## 5. Screen-by-screen copy draft (Basic / default)

Plain, human, device-level. **Avoid in default copy:** `protocol`, `directive`, `kernel`, `sovereign`, `operator`, `runtime`, `provisioning`, `calibration`, `cognitive core`. (Allowed only in Pro/Creator/Origin or `details`.)

| Screen | Headline | Supporting copy | Primary | Secondary |
|---|---|---|---|---|
| Welcome | "Welcome to LucaOS." | "Luca lives across your device." | Get started | What is LucaOS? |
| Environment | "Choose your environment." | "Pick the look that feels right. Change it anytime." | Continue | Skip for now |
| Presence | "Choose how Luca appears." | "Luca can be a quick chat, a voice, a widget, or a presence on your device." | Continue | Set up later |
| Permission | "Choose when Luca should ask permission." | "You decide how much Luca does on its own. Sensitive actions always ask first." | Continue | Use recommended |
| Memory | "Choose what Luca can remember." | "Luca keeps only what you allow, and you can forget anything later." | Continue | Use safe defaults |
| Tools | "Connect tools when you're ready." | "Give Luca access to what you want help with. Connect now or later." | Continue | Connect later |
| Intelligence | "Choose how Luca should think." | "Use Luca's built-in intelligence, your own keys, cloud, or private local models." | Continue | Advanced routes |
| Finish | "Luca is ready to live on this device." | "Here's how Luca is set up. You can change anything in Settings." | Enter LucaOS | Review choices |

Microcopy guardrails: prefer "Luca," "you," "your device," "ask first," "remember," "connect," "private/local," "under your control." Replace "system access" with specific, benefit-led phrasing ("connect your browser," "allow files").

---

## 6. Mode-aware onboarding design

Same spine; disclosure scales with mode. Mode never adds mandatory Basic steps.

### Basic

- Simple, few decisions, plain language, safe defaults.
- "Connect later" allowed everywhere; local provisioning hidden unless explicitly chosen.
- Defaults: Pearl, MiniChat+Dashboard presence, "Ask only when needed," safe memory boundary, connect-later tools, Luca Prime route.

### Pro

- Browser/tool governance visible; model routing visible; BYOK/local/cloud choices visible.
- More detailed permission control (per-domain). Warnings clear but not noisy.
- Route status and provider warnings are first-class.

### Creator / Origin

- Agent workforce concepts visible; LucaLink visible; deeper memory governance.
- Deeper local/cloud stack; workflow creation entry points.
- Advanced terminology permitted, but still calm and structured (no wall-of-controls).

Implementation note: a single screen map with `mode` + `disclosure` flags should drive which sections render, so Basic and Pro/Creator share one source of truth rather than divergent flows.

---

## 7. Presence setup design

LucaOS should not feel like "just chat." This screen (flow step 3) introduces Luca's surfaces:

| Surface | What it means | Default state |
|---|---|---|
| **MiniChat** | A quick, lightweight way to ask Luca anything from anywhere. | Active now |
| **Voice** | Talk to Luca and hear responses. | Enable later (needs mic) |
| **Widget** | A small always-reachable Luca entry point on the device. | Enable later |
| **Hologram / Presence** | Luca's ambient on-device presence/identity. | Enable later |
| **Dashboard** | The full LucaOS workspace. | Always present |

- **Which are active now:** MiniChat + Dashboard (safe, no permissions).
- **Which can be enabled later:** Voice, Widget, Presence — each with a one-tap "Enable later."
- **Avoiding overwhelm:** show meaning in one line each; don't configure behavior here; "later" is a first-class, guilt-free choice.
- **Reinforcing device-level AI:** the framing line — "Luca can appear in more than one place" — is the moment a user understands LucaOS is an environment, not a thread. The dashboard is explicitly "one surface among several."

---

## 8. Permission / autonomy design

Permission style screen (flow step 4):

```text
Ask every time
Ask only when needed   (recommended)
Custom
```

- This is **user control over how autonomous Luca is**, not Luca nagging for every micro-action.
- The user decides Luca's default initiative level; "Ask only when needed" is the recommended balance.
- **Sensitive/destructive actions always confirm**, regardless of style — stated plainly and always visible on this screen.
- Connects later to browser/tools/files/app actions: the chosen style seeds those governance defaults (Pro/Creator can refine per-domain).
- Status/safety semantics (danger/warning/approval/blocked) are never restyled away by skins on this screen.

---

## 9. Memory boundaries design

Trust-first memory screen (flow step 5). It should explain, in plain language:

- **What Luca can remember:** helpful context to assist you (preferences, ongoing work).
- **What Luca should ask before saving:** sensitive or ambiguous items, depending on the chosen boundary.
- **How to forget:** "You can review and forget anything later" — make undo obvious, not buried.
- **Private/local/cloud implications:** a calm one-liner on where memory lives; deeper detail for Pro/Creator.
- **Safe defaults for Basic:** a balanced "remember helpful context, ask before sensitive saves" default.
- **Deeper controls for Pro/Creator:** per-category memory, local vs cloud governance, retention.

Framing: memory is a boundary the user sets and can change — a trust anchor, never a silent database step.

---

## 10. Tools / connectors design

Tool connection screen (flow step 6):

```text
Browser
Files
Calendar
Mail
Apps
Local device capabilities
```

Rules:

- **No scary "system access" language.** Use specific, benefit-led phrasing per connector.
- **Show clear benefits:** e.g., "Browser — let Luca help with what's on your screen."
- **Show "connect later":** always available; Basic defaults to it.
- **Show the permission model:** a one-line note that each connector is permissioned and revocable.
- **Avoid implying broad access without consent:** nothing connects silently; each is an explicit opt-in with scope shown (detail for Pro/Creator).

---

## 11. Intelligence route design

Model/provider setup (flow step 7):

```text
Luca Prime   (recommended)
BYOK
Cloud models
Local models
```

Rules:

- **Basic mode is not forced into technical provider setup** — Luca Prime is preselected and sufficient.
- **Pro/Creator can see** provider/key entry and local model details.
- **Web Safe Mode** clearly marks "secure local runtime unavailable" and routes the user to a supported option without blocking.
- **Local provisioning is optional and mode-gated** — it must never block Basic onboarding unless the user explicitly chose a local route that requires it.

---

## 12. Finish screen design

Final screen (flow step 8): **"Luca is ready to live on this device."**

Confirms, in a calm summary:

- Selected environment (skin).
- Active presence surfaces.
- Permission style.
- Memory boundary.
- Connected tools or connect-later state.
- Intelligence route.
- Next action: a single primary CTA into the main dashboard, framed so the dashboard reads as one surface of Luca (not "the app").

---

## 13. Skin-aware visual direction

Do **not** implement skinning in this work. Describe the intended feel only; application waits for the redesigned structure and a dedicated onboarding skin boundary.

- **Pearl:** calm bright default; premium, readable, soft. No harsh pure white, no washed-out controls.
- **Carbon:** professional dark; not cyberpunk, not terminal, not neon. Clear surface separation.
- **Flow:** static magical glass; content-first; **no motion yet** (no keyframes/timers/parallax).
- **Canvas:** warm editorial; matte and readable; no muddy cream contrast.

Rules:

- Skins do not override semantic warning/error/status colors.
- Flow remains static.
- Reduced motion / reduced transparency respected.
- Contrast and readability before beauty.

---

## 14. Mobile onboarding direction

The same flow adapts to mobile as a reduction, not a compression:

- Fewer simultaneous panels — **one decision per screen**.
- Bottom-safe primary actions (thumb-reachable, above the safe area).
- Compact progress indicator.
- Avoid desktop multi-card compression (don't shrink four cards onto a phone; stack or paginate).
- Web Safe Mode pill stays compact and must **not** block the CTA.
- Presence/tools/route screens present options vertically with clear tap targets.

---

## 15. What to remove, rename, merge, or keep

| Current | Future concept | Action |
|---|---|---|
| Kernel Awakening | Welcome to LucaOS | **Rename + merge** into Welcome. |
| Directive Alignment / Constitutional Alignment | Permission style / "Luca rules" | **Rename + merge** into Permission style; simplify for Basic, depth in Pro/Creator. |
| Theme Selection (opacity/blur knobs) | Choose your environment | **Rename;** remove opacity/blur from first run (move to Settings/details). |
| Cognitive Core Selection | Choose intelligence route | **Rename;** keep capability, gate technicals to Pro/Creator. |
| Mode Select (text/voice) | Choose Luca's presence | **Merge + broaden** into presence surfaces. |
| Calibration / Completion | Finish setup | **Rename.** |
| Provisioning / hardware scan / model download | Prepare local models / advanced details | **Move to Pro/Creator/details;** optional, mode-gated. |
| Identity Verification | "What should Luca call you?" | **Rename;** drop verification framing; explicit storage language. |
| Face Scan | Optional presence (camera) | **Keep as optional;** clarify what's saved and where; not security-grade. |
| Conversation setup | Targeted preference moments | **Shorten + reposition;** use only where conversation adds value. |
| Post-Boot Loading | Readiness bridge (merged) | **Merge** into the readiness bridge. |
| Post-Boot Transition | Readiness bridge | **Redesign** into calm bridge with attention/failure states. |
| `ready` debug lifecycle state | Internal debug | **Keep internal;** visible only via `?bootDebug=1`. |

---

## 16. Implementation plan for Codex (staged)

Each phase is a separate, reviewed PR. Implementation begins only after this spec is approved.

### Phase 1 — Post-boot readiness bridge
- **Target:** `src/web/postBoot/WebPostBootLoading.tsx`, `WebPostBootTransition.tsx`, `webPostBootState.ts`, `WebLifecycleShell.tsx` (presentation + copy only).
- **No-touch:** `App.tsx`, boot logic (`useAppSystem.ts`), Web Safe Mode/secureVault code, services, skin resolvers.
- **Risk:** Medium-high (first post-boot impression, degraded-state honesty).
- **Tests:** state classification unchanged; new-user/partial/permission/route/failure presentations render; Web Safe Mode stays compact; debug gated.

### Phase 2 — Onboarding screen map & types
- **Target:** new `src/services/onboarding/` screen-map/types module (data only) + tests.
- **No-touch:** existing onboarding components/flow logic, services behavior.
- **Risk:** Low (additive data/types).
- **Tests:** screen order, mode flags, mapping to existing stages.

### Phase 3 — Copy model cleanup by mode
- **Target:** a copy model module for onboarding/post-boot copy keyed by Basic/Pro/Creator/debug.
- **No-touch:** component rendering logic (Phase 4+ consumes it), services.
- **Risk:** Low-medium.
- **Tests:** Basic copy excludes banned terms (protocol/kernel/directive/etc.); advanced terms only in Pro/Creator/debug.

### Phase 4 — Local onboarding skin boundary resolver
- **Target:** new pure `src/styles/lucaOnboardingSkinBoundary.ts` resolver (pure/inert, mirrors boot/mobile resolvers) + tests.
- **No-touch:** components, App.tsx, other resolvers.
- **Risk:** Low (pure helper).
- **Tests:** Pearl fallback, status/safety exclusion, reduced motion/transparency, Flow static.

### Phase 5 — Local onboarding boundary application
- **Target:** apply the resolver at one local onboarding shell wrapper (single application), mirroring the boot boundary.
- **No-touch:** App.tsx root, global DOM, other boundaries.
- **Risk:** Medium.
- **Tests:** single application; no `document.documentElement`/`body`/`html` mutation; no Flow motion.

### Phase 6 — Basic mode onboarding implementation
- **Target:** the 8-screen Basic flow consuming the screen map + copy model + boundary.
- **No-touch:** services behavior, model routing, governance, Web Safe Mode behavior.
- **Risk:** High (first-run flow).
- **Tests:** flow completes with safe defaults; connect-later works; setup persists via existing services.

### Phase 7 — Pro/Creator progressive disclosure
- **Target:** mode-gated sections (governance, routing, provisioning, LucaLink, workforce entry).
- **No-touch:** Basic defaults, runtime behavior.
- **Risk:** Medium.
- **Tests:** disclosure by mode; Basic unaffected.

### Phase 8 — Web/mobile onboarding QA
- **Target:** QA matrix doc + responsive presentation fixes only.
- **No-touch:** logic.
- **Risk:** Low-medium.
- **Tests:** mobile layout, safe-area CTA, Web Safe Mode pill non-blocking.

### Phase 9 — Visual polish
- **Target:** spacing/contrast/hierarchy refinements within boundaries.
- **No-touch:** logic, status/safety semantics.
- **Risk:** Low.
- **Tests:** contrast/readability; no motion added to Flow.

### Phase 10 — Final regression pass
- **Target:** full onboarding/post-boot regression + docs status updates.
- **No-touch:** new feature work.
- **Risk:** Low-medium.
- **Tests:** end-to-end first-run + returning-user + degraded paths.

---

## 17. Acceptance criteria

"Top-tier LucaOS onboarding" means:

- A new user understands LucaOS in **under 60 seconds**.
- The user knows Luca is **device-level, not just chat**.
- The user understands **permission / autonomy**.
- The user understands **memory boundaries**.
- The user can **continue without connecting everything**.
- **Secure / degraded states are honest** (Web Safe Mode, route/permission attention, failure).
- Visual language is **calm and premium**.
- **Basic mode is not technical**.
- **Pro/Creator modes are powerful but not overwhelming**.
- **No cyberpunk / Jarvis aesthetic**.
- **No debug-heavy normal flow** (diagnostics behind details / `?bootDebug=1`).

---

## 18. Recommended next PR

```text
docs(ui): plan post-boot readiness bridge implementation
```

The post-boot bridge is the safest, highest-leverage first step: it is presentation-and-copy oriented, has clear state mappings (`new_user` / `returning_user` / `partial_setup` / `permission_attention` / failure), and improves the weakest premium moment without entering onboarding logic. A planning PR (rather than jumping straight to `feat(ui): add post-boot readiness bridge copy model`) is preferred because it lets Codex pin down exact state-to-copy mapping, debug gating, and Web-Safe-Mode presentation before touching the post-boot components.

Codex should implement the next step only **after this design spec is approved.**

---

## 19. Strict rules

This is a **documentation-only** specification.

This PR does **not**: edit source implementation, components, services, or tests; edit `App.tsx`, boot UI, post-boot UI, onboarding UI, or settings UI; touch the skin registry, skin boundary helpers, or secureVault / Web Safe Mode code; change runtime logic, model routing, or browser/voice/LucaLink/governance; apply skins to onboarding; add a resolver or boundary; add assets or screenshots; or edit the README.

### Validation

- **`git diff --check`:** run; result recorded in the PR.
- **Build:** not required (documentation-only).
- **Source/runtime impact:** none — adds one Markdown file under `docs/` and appends short status notes to two existing docs.
</content>
