# LucaOS Desktop Interface — Senior Design Direction

**Type:** Senior product / design direction specification (documentation-only)  
**Status:** Design direction. No runtime, source, style, or asset changes are made by this document.  
**Date:** 2026-07-01  
**Audience:** Founder / product owner, design implementers, and coding agents preparing staged UI PRs.  
**Scope:** Full desktop interface polish for LucaOS: shell layout, panels, chat/workspace, component language, skins, copy, and implementation phases.

Read together with:

- `docs/luca-skin-system.md`
- `docs/luca-skin-application-boundaries.md`
- `docs/luca-composer-affordance-inventory.md`
- `docs/luca-composer-product-decisions.md`

> Shared direction: **LucaOS should feel like a quiet operating system for intelligence, not a dashboard for controlling intelligence.**

---

## Design Intent

This document is the official desktop interface direction for LucaOS. It exists to keep the product from drifting into generic AI-dashboard patterns, coding-IDE habits, or decorative sci-fi chrome while the interface is polished in stages.

The doctrine is intentionally concrete:

- Name and remove current UI smells such as `KERNEL ACCESS`, `Operator`, `Zero-Cloud Update`, red `Initiate lockdown`, `LOCAL · OLLAMA OFFLINE`, and raw execution flags.
- Use the spatial model **Left = where, Center = what, Right = state.**
- Convert premium design goals into enforceable rules: a 4px spacing scale, one border token, one icon family, one display element per view, no resting-state red except true errors, and text contrast contracts for every skin.
- Treat LucaOS as an **operational workspace** rather than a chat product or dashboard.
- Start with a low-risk Phase 1 cleanup that can noticeably reduce the “AI slop / sci-fi cockpit” read before deeper layout work begins.

---

## 1. Product Interface Verdict

### What is wrong now

The current direction has good bones: three panels, a material/skin system, permissions, memory, model/runtime awareness, tools, and local-host concepts. The problem is that the surface can read as **capable software wearing a costume**. The interface is trying to look powerful before it has earned calm hierarchy.

The main problems:

1. **Theatrical chrome over a serious product.** Labels like `KERNEL ACCESS`, `Operator`, `Zero-Cloud Update`, `Handshake complete`, `Luca standby`, and `Awaiting mission parameters` make the product feel like a sci-fi prop. LucaOS touches real context, tools, files, devices, accounts, and actions; theatrical language reduces trust.
2. **False-alarm severity.** A resting red `Initiate lockdown` button or red `LOCAL · OLLAMA OFFLINE` chip trains users to ignore red. Red should mean something is unsafe, failed, destructive, or requires immediate attention.
3. **Raw internals leaking into UI.** Strings like `readyForExecution: false · executionEnabled: false · canExecute: false` are console state, not user-facing system state. The user needs “Actions paused” with a details disclosure, not a flag dump.
4. **No dominant center of gravity.** Left rail, center workspace, and right inspector can feel equally loud. The center should own attention; rails should behave like instruments.
5. **Density without rhythm.** A wall of tool buttons and stacked status cards makes the interface feel busy rather than capable. Premium density uses outer breathing room, tight inner groups, and clear visual rhythm.
6. **Cards are used as default wrappers.** Cards should indicate meaningful objects or grouped collections. If every row is a card, no object feels important.
7. **Glass is used as decoration instead of material hierarchy.** Blur, translucency, borders, and glow cannot compensate for weak typography, spacing, and hierarchy.
8. **Icon and control inconsistency.** Mixed icon families, repeated pill buttons, bordered boxes inside bordered panels, and unequal hover/focus behaviors are immediate “AI slop” tells.

### What LucaOS should become

LucaOS should become a **calm operations surface for an intelligent system you trust**. It should feel like a mature host-native AI operating environment: precise, premium, spatial, and useful every day.

The target product feel:

- **Serious but not cold.** It should feel professional enough for files, accounts, memory, and actions, without becoming enterprise grayware.
- **Operational, not theatrical.** The user should always know what Luca is doing, what it can access, and what needs review.
- **Workspace-first.** Chat is the command and reasoning layer, but the center is a workspace where artifacts, previews, tool results, and actions can live.
- **Materially premium.** Skins provide mood and depth; they do not replace legibility, hierarchy, or safety semantics.
- **Quietly technical.** Runtime, model routing, voice, vision, tools, memory, and permissions can be visible, but they should be calm and glanceable.
- **Distinct from competitors.** LucaOS should learn from the discipline of Linear, the calm of Things, the material restraint of macOS, and the conversational quality of leading AI products without becoming a clone of ChatGPT, Claude, Cursor, Notion, or Linear.

### What LucaOS must avoid

- **No coding IDE cosplay.** No file-tree-first mindset, no terminal styling as brand, no monospace everywhere, no default developer density.
- **No generic AI dashboard.** No metric-card soup, no vague assistant stats, no rainbow gradients, no equal-weight widget grid.
- **No sci-fi cockpit.** No kernel/mission/operator language, no ambient hazard red, no fake telemetry, no scanning effects, no “system online” theatrics.
- **No chatbot wrapper.** LucaOS is not a single chat page with settings hidden elsewhere. Chat must blend with memory, tools, permissions, and workspace surfaces.
- **No skin demo at the expense of usability.** Carbon, Pearl, Flow, and future skins must never wash out text, blur small controls, or recolor semantic safety states.

---

## 2. Three-Panel Experience Model

The model is sound. The redesign should not wipe the shell; it should assign each area a stricter job.

> **Spatial principle:** **Left = where. Center = what. Right = state.** If a surface does not answer one of those questions, it does not belong on the always-visible rails.

### Left panel — navigation and capability

**Role:** Quiet index of destinations and available capabilities. It answers: **Where can I go, and what can Luca do from this host?** It is not a feature wall.

**Belongs:**

- A small set of top-level destinations: Chat, Workspace, Memory, Tools, Devices, Settings.
- Current workspace or active context.
- Pinned/recent capabilities.
- A single grouped `Tools & apps` area with progressive disclosure.
- Live capture/connectivity indicators only when they matter: microphone, camera, screen, browser bridge, device, file scope.

**Remove from always-on view:**

- Flat dumps of 10+ buttons such as Skills, Apps, Screen, Import, IDE, System Services, Link Bridge, and similar occasional actions.
- Repeated explanatory cards.
- Decorative category headers that do not drive navigation.
- Developer-only entry points unless the user is in a developer/tool mode.

**Hide until needed:**

- System Services, Link Bridge, IDE, Import, advanced runtime diagnostics, full app catalogs, and setup prompts after setup is complete.
- These should live one layer down under Connections, System, Tools, or Settings.

**Emphasize:**

- New task/chat.
- Current surface.
- Current context.
- Active capture/access grants.

**Structural rule:** Default width should feel like a sidebar, not a cockpit: approximately 240px expanded, collapsible to a narrow icon rail around 64px. Collapse must preserve active state and access warnings.

### Center — workspace and chat

**Role:** Product center of gravity. It answers: **What are we doing now?** It is where conversation, artifacts, tool results, previews, and approvals converge.

**Belongs:**

- Active conversation/task.
- Composer/command dock.
- Inline tool calls and results.
- Workspace surfaces Luca opens: document, browser view, file preview, vision feed, generated artifact, or action draft.
- Blocking permission requests tied to the current action.
- A long-thread map when the session becomes complex.

**Remove:**

- Giant theatrical empty states such as “Evening, Operator,” “Ready when you are,” “Zero-Cloud Update,” and ghost watermarks.
- Repeated welcome/status copy once the user is active.
- Unrelated tool catalogs or right-panel status widgets.

**Hide until needed:**

- Raw tool logs.
- Verbose runtime detail.
- Historical memory detail.
- Secondary model routing explanations.

**Emphasize:**

- The thread.
- The composer.
- Current context scope.
- Actions waiting for approval.
- Tool work that affects files, browser, devices, accounts, memory, or permissions.

**Empty-state rule:** One calm line and one affordance. Example: `Ask Luca anything.` The composer receives focus. No slogan stack, no watermark, no lore.

### Right panel — awareness and control

**Role:** Inspector for live state, timeline, memory, permissions, and runtime. It answers: **What is Luca doing, what has changed, and what is allowed?**

**Belongs:**

- One system status summary at the top: `Ready`, `Actions paused`, `3 actions need review`, `Local model offline`, etc.
- Current model/runtime route and degraded/offline state.
- Permission/action review queue.
- Timeline of meaningful events.
- Relevant memory items.
- Active access grants and revocation controls.
- Inspector details for selected messages, artifacts, memories, permissions, or tool results.

**Remove:**

- Raw boolean dumps.
- Permanent red diagnostic blobs.
- Duplicate navigation.
- Non-actionable metrics.
- Decorative timeline events.

**Hide until relevant:**

- Permission Center when nothing needs review.
- Full memory history.
- Verbose runtime logs.
- Advanced model routing details.

**Emphasize:**

- Pending decisions.
- Active access grants.
- Meaningful state changes.
- Selected-object inspection.

**Structural rule:** The right panel is reference, not primary. It should be collapsible, calm when empty, and assertive only when a user decision is required.

---

## 3. Visual Language

### Typography hierarchy

Use one type scale and use it consistently.

- **Display / empty-state:** 24–28px, weight 600, tracking around `-0.02em`. Used once per view.
- **Panel title:** 14–16px, weight 600, sentence case.
- **Section label:** 12–13px, weight 600, optional uppercase with `+0.08em` tracking, tertiary color.
- **Body / message:** 14–15px, weight 400–450, line-height around 1.5.
- **Meta / status:** 12–12.5px, secondary/tertiary color.
- **Technical detail:** monospace only for code, IDs, model names, flags, token counts, and diagnostic detail blocks.

**Kill:** all-caps body copy, decorative letter spacing on running text, monospace as brand styling, and multiple hero/display elements in one view.

### Spacing and density

Use a 4px-based scale: `4 / 8 / 12 / 16 / 24 / 32`.

- Shell gutters: 16–24px.
- Panel padding: 16–20px.
- Row vertical padding: 10–14px.
- Group gaps: 12–16px.
- Major section gaps: 24–32px.

Premium density is **generous outer spacing + tight inner grouping**. Avoid uniform compression and avoid oversized empty luxury.

### Borders and dividers

- Use one subtle border token, approximately 8% white on Carbon-equivalent dark surfaces.
- Prefer background-step separation over drawn boxes.
- Never stack a bordered card inside a bordered panel inside a bordered rail.
- Use one boundary per level: panel edge, card edge, or row divider, not all three.

### Cards

Cards are for meaningful objects or collections.

Use cards for:

- Permission queues.
- Memory collections.
- Workspace artifacts.
- Rich tool results.
- Settings/skin previews.

Do not use cards for:

- Single status lines.
- Every nav item.
- Every tool row.
- Every timeline event.
- Decorative empty states.

Rule: **one thing = row; many like things = card containing rows.**

### Buttons

- **Primary:** solid accent, at most one dominant primary action per view.
- **Secondary:** subtle surface fill and subtle border.
- **Tertiary / ghost:** text/icon only, no fill, for rail and inline actions.
- **Destructive:** neutral at rest, red only at confirmation, hover, or actual danger state.
- **Icon-only:** allowed only with accessible labels and visible focus.

A resting red `Initiate lockdown` is a constant false alarm. Prefer `Pause all actions` as a neutral control with a red confirmation state only after intent is clear.

### Status pills

- Small, low saturation, semantic.
- Dot + label, never raw booleans.
- Ready/idle = neutral calm, not neon green.
- Attention/paused = amber.
- Error/blocked/danger = red, only for real errors or unsafe/destructive states.
- Offline-by-design is informational, not automatically red.

### Tool/action rows

- Icon + label + optional right-side state/action.
- Consistent icon size and alignment.
- 40–44px target height.
- Hover uses a single surface-hover background step.
- No border flips, glow pulses, scale transforms, or card-per-row treatment.

### Empty states

- One calm line.
- One next action.
- No hero slogan stack.
- No watermark.
- No mascot voice.

Examples:

- `Ask Luca anything.`
- `Nothing needs review.`
- `No connected devices yet.`
- `Drop files here or choose a source.`

### Hover and focus

- Hover reveals affordance; it does not decorate.
- Focus uses a 2px accent ring or equivalent accessible focus style.
- Active is more distinct than hover.
- Motion should be short, quiet, and never layout-shifting.

### Glass/liquid material

- Material is for depth and mood on large surfaces: shell, panels, overlays, composer dock.
- Do not put blur behind small dense text rows where it harms reading.
- Blur must be backed by enough opacity to preserve contrast.
- Glow is reserved for active focus, voice/live capture, or limited skin mood, not ambient decoration.

### Dark/light behavior

- Carbon/dark should be graphite and professional, not pure black or hacker neon.
- Pearl/light should be calm and bright, not washed out.
- Every skin must satisfy the same text contrast and semantic-status contract.
- Skins change material, hue, accent, and depth; they do not rewrite safety semantics.

### Icons

- Pick one icon family as the LucaOS system set.
- Use one weight and one optical size per context: 16 inline, 18–20 rail, 14 meta.
- Route aliases through one `Icon` layer if multiple source packs remain in code.
- Mixed icon families are a top “AI slop” tell.

---

## 4. Component Rules

- **Panels:** one material background, one optional subtle border, 16–20px padding, clear title, collapsible where appropriate, no nested panels.
- **Cards:** wrap collections or meaningful objects only. Radius around 14px. One border or one shadow, never both at full strength. No card-in-card.
- **Tool buttons:** list rows, not a grid of boxes. Icon + label, 40–44px tall, grouped under collapsible section headers.
- **Chat composer:** one elevated command surface. Text input dominant. Send/stop clear. Model/mode/context controls quiet and grouped.
- **Messages:** role differentiated by spacing, alignment, and subtle surface treatment, not heavy bubbles or avatars everywhere.
- **Memory items:** row in a card: dot/icon, primary text, source/recency/confidence metadata, inspect/forget actions.
- **Status items:** row-level status with dot + label + optional detail. No raw flag display at rest.
- **Permission review items:** one requested action per row. Plain text description, reason, scope, risk, and balanced Allow/Deny controls. Queue is a card; empty state is quiet.
- **Tabs:** text tabs with 2px active underline. No boxed chip tabs. Keep peer tabs to four or fewer.
- **Headers:** orient, do not market. Product title should be `LucaOS`, not `KERNEL ACCESS`.
- **Side navigation:** grouped, collapsible, icon+label, one active indicator. Do not use side nav as a dumping ground for every tool.
- **Model/runtime indicators:** quiet chips. `Local model offline` is neutral unless it blocks the user’s current action. Details are disclosed on demand.

---

## 5. Chat Experience

LucaOS chat should feel **operational**: the user is directing a capable local/cloud AI host, not chatting with a generic bot.

### Message layout

- Roomy single-column thread.
- Max readable width around 720–760px for prose.
- Luca messages left-aligned and highly readable.
- User turns can be lighter and more compact.
- Turn separation via space, not heavy dividers.
- Timestamps and metadata appear on hover or inspection, not always on.
- System notices and permission prompts are visually distinct from assistant prose.

### Composer

- Persistent bottom command dock.
- Text input dominant.
- Primary send button; stop replaces send while running.
- Mode choices such as Auto/Fast/Plan/Agent should be one segmented control, not loose equal-weight buttons.
- Attach, voice, context, and model controls should be quiet inline chips/actions.
- Current context scope should be glanceable: memory, files, screen, browser, voice, model, route.

### Streaming

- Calm token stream with subtle caret/typing behavior.
- No flashing, jitter, fake telemetry, or excessive status spam.
- High-level states only: thinking, using tool, waiting for approval, writing result.
- Repeated tool updates collapse into one evolving operation row.

### Tool calls and results

- Tool call = compact collapsible inline block.
- Show icon, plain action label, one-line result summary, and status.
- Examples: `Searched Drive`, `Read 3 files`, `Drafted email`, `Opened browser`, `Updated memory`.
- Success is quiet.
- Failure uses semantic attention/error and tells the user what to do next.
- Host-affecting actions must show scope and reversibility.

### Long-thread navigation

- Add a slim thread map for long sessions: milestones, tool calls, decisions, artifacts, and permission events.
- This can live in the right inspector or as a center-edge rail.
- Do not turn the product into an IDE outline unless the active surface is explicitly a document/artifact mode.

### Context preservation

- The user should know what Luca knows before sending.
- Context changes must be visible and reversible.
- Memory use should be disclosed when it materially affects an answer.
- Active capture/access should remain visible near composer or inspector without flooding every message.

### Blending chat with workspace

- Chat is the conversational layer of the workspace.
- When Luca opens a doc, browser, vision feed, file preview, or result artifact, it should expand within the center, not as a blocking modal.
- The user should always have a clear way back to the thread.

---

## 6. Skin System Guidance

Skins replace old theme thinking. A skin is **material + mood through tokens, bounded by a legibility and safety contract.**

### Carbon/default

Carbon should be the professional baseline: graphite, restrained, focused, and comfortable for long sessions.

Carbon influences:

- Shell background.
- Panel material.
- Composer dock material.
- Overlay/command palette surfaces.
- Subtle active/focus accent.

Carbon does not control:

- Semantic safety colors.
- Permission severity.
- Destructive action semantics.
- Text contrast floor.
- Focus accessibility.

### Legibility contract

Every skin must preserve:

- `--luca-text-primary`, `--luca-text-secondary`, and `--luca-text-tertiary` contrast targets against its own surfaces.
- Semantic red/amber/success/info meanings.
- Focus ring visibility.
- Permission and destructive-action clarity.
- Readability of long messages, dense rows, and settings text.

Skins may drive backgrounds, material, accent hue, depth, and motion profile. They may not make text muddy or recolor danger into brand accent.

### Settings presentation

Present skins as operating environments, not theme dots.

Each skin choice should show:

- Name.
- One-line mood description.
- Mini live preview with shell, panel, composer, accent, and status sample.
- Light/dark affinity.
- Motion/transparency notes.
- Accessibility fallback behavior.

Avoid gamer-style labels, rarity language, huge decorative art, and tiny color swatches that do not preview real material.

### Inherit skin material

- Shell background.
- Panel surfaces.
- Composer surface.
- Command palette and overlays.
- Non-critical cards and workspace containers.
- Active navigation backgrounds and primary accent.

### Stay neutral for usability

- Long-form message text.
- Permission decisions.
- Destructive controls.
- Warnings/errors/blocked states.
- Data/metric numerals.
- Code/preformatted output.
- Dense diagnostic logs.
- Focus rings.

---

## 7. UI Copy / Voice

### Voice

Professional, direct, calm, and human. LucaOS should speak to a competent adult about their system. It should not sound like a sidekick, a sci-fi AI, a military cockpit, a developer console, or a mascot.

Principles:

- Say the plain thing.
- Prefer nouns users understand: Workspace, Memory, Device, Tool, Permission, Model.
- Prefer verbs users can act on: Open, Review, Connect, Allow, Deny, Pause, Resume, Forget, Continue.
- Avoid `kernel`, `mission`, `operator`, `handshake`, `standby`, `neural`, `core`, `engage`, and `lockdown` unless truly technical or legally precise.
- Avoid caps-lock drama.
- Avoid false alarms: offline is not always an error.

### Replacement examples

| Current / awkward | Replace with |
| --- | --- |
| `KERNEL ACCESS` | `LucaOS` |
| `Evening, Operator` | `Good evening` |
| `Ready when you are` | `Ask Luca anything` |
| `(Zero-Cloud Update)` | Remove, or use a normal release/status note elsewhere |
| `First Run` | `Welcome` or `Set up LucaOS` |
| `I'll help from inside` | `Luca runs on this device` |
| `What should Luca call you?` | `Your name` with helper `Optional` |
| `Start with me` | `Get started` |
| `Handshake complete` | `Connected` |
| `Preparing memory boundaries` | `Setting up memory` |
| `Luca standby` | `Idle` or `Ready` |
| `Awaiting mission parameters` | `Nothing running` or `What would you like to work on?` |
| `Initiate lockdown` | `Pause all actions` |
| `LOCAL · OLLAMA OFFLINE` in red | `Local model offline` as neutral chip unless blocking |
| `readyForExecution: false · executionEnabled: false · canExecute: false` | `Actions paused` + `Details` disclosure |
| `LUCA is adapting to new parameters...` | `Updating settings…` |
| `Activate vision` | `Allow camera context` |
| `Engage runtime` | `Start local runtime` |
| `Memory core` | `Memory` |

Rule of thumb: if a label would sound strange said aloud to a colleague, rewrite it.

---

## 8. Prioritized Redesign Phases

### Phase 1 — visual/component cleanup

**Change:**

- Apply copy rewrites in the shell, onboarding, status, and permission surfaces.
- Collapse to one icon family through the icon layer.
- Demote borders to one subtle token.
- Neutralize false-alarm red states such as lockdown/offline at rest.
- Replace raw execution flag dumps with human status + details disclosure.
- Normalize type scale and spacing.
- Calm empty states.
- Standardize hover/focus and status pills.

**Avoid touching:**

- Layout structure.
- Panel routing.
- Chat/message data model.
- Tool execution logic.
- Permission enforcement.
- Skin provider architecture.

**Acceptance criteria:**

- No all-caps sci-fi copy remains in primary shell surfaces.
- One icon family is visibly dominant.
- No resting-state red appears except real errors, blocked states, or destructive confirmation.
- Every working view has at most one display-size element.
- Raw boolean/flag dumps are behind disclosures, not default UI.
- Carbon and one light skin remain readable.

### Phase 2 — chat and composer redesign

**Change:**

- Composer becomes one elevated command dock.
- Mode controls become one segmented control.
- Context scope becomes glanceable near composer.
- Message layout moves to readable 720–760px measure.
- Tool calls/results render as compact inline collapsible blocks.
- Streaming states become calm and consolidated.

**Avoid touching:**

- Backend chat protocol unless display mapping requires a small adapter.
- Agent routing.
- Tool execution.
- Memory writes.
- Permission logic.

**Acceptance criteria:**

- Composer is visually the primary control.
- Tool calls render inline and collapsed by default.
- Stop/approve/deny remain obvious while running.
- Thread reads as an operational workspace, not bubble chat.

### Phase 3 — left/right panel redesign

**Change:**

- Left rail becomes grouped collapsible navigation + capability rail.
- Occasional actions move one layer down without being deleted.
- Right panel becomes system summary + quiet permission queue + timeline/memory inspector.
- Both side panels gain clear collapse behavior.

**Avoid touching:**

- Removing capabilities.
- Device connection internals.
- Memory schema.
- Permission enforcement.
- Tool behavior.

**Acceptance criteria:**

- Left rail shows six or fewer primary items at rest.
- Right rail is calm when nothing needs review and assertive when a user decision is pending.
- Left answers “where/capability”; right answers “state/control.”
- Panels collapse without hiding critical access/safety state.

### Phase 4 — settings, skin, and onboarding polish

**Change:**

- Skin picker becomes live material swatches with shell/panel/composer/status previews.
- Onboarding copy adopts the professional voice.
- Connector/setup surfaces use calm cards/rows rather than decorative tiles.
- Skin legibility contract is documented and tested where practical.

**Avoid touching:**

- Onboarding flow logic unless separately planned.
- Skin token architecture beyond approved boundaries.
- Semantic safety token ownership.
- Account/device permission behavior.

**Acceptance criteria:**

- Skins preview actual material, not dots.
- Onboarding reads as professional software.
- No skin fails text/status contrast targets.
- Settings communicate control, not decoration.

### Phase 5 — deeper workspace/tool surfaces

**Change:**

- Luca-opened surfaces render as spatial center panels: docs, browser, vision, files, artifacts.
- Add selected-object inspector states for messages, artifacts, permissions, memories, and tool results.
- Add long-thread navigation markers.
- Build durable patterns for tool results outside the message stream.

**Avoid touching:**

- Rebuilding the shell.
- Making code/file views the default metaphor.
- Adding decorative telemetry.
- Turning workspace panels into blocking modals.

**Acceptance criteria:**

- Opening a surface does not interrupt with a blocking modal unless safety requires it.
- There is always a clear route back to the thread.
- Tool results can live as workspace objects.
- The interface feels spatial without becoming an IDE.

---

## 9. Implementation Handoff

Use this as the coding-agent handoff.

### Scope discipline

- One phase becomes one or more small PRs.
- Do not combine phases.
- Phase 1 should be pure presentational cleanup: copy, tokens, icons, status treatment, spacing, and empty states.
- State “no behavior/logic changed” in presentational PRs and keep that true.

### Token-first

- Route color, spacing, elevation, surface, border, and focus changes through existing `--luca-*` tokens or a documented token addition.
- Do not hardcode colors in components except as token fallbacks.
- Add tokens before using them broadly.

### Legibility and safety

- Lock a contrast contract for text tokens and semantic status colors.
- Add or extend tests where the existing skin-boundary test pattern allows it.
- Status and safety semantics must remain outside arbitrary skin control.

### Icon system

- Pick the LucaOS icon family in the central icon layer.
- Route aliases through that layer.
- Log or fail visibly on unmapped names during development.
- Do not import random icon families directly into components.

### Copy system

- Centralize shell/status/onboarding strings where practical.
- Treat copy rewrites as data changes, not scattered JSX edits.
- Keep labels short and operational.

### PR acceptance format

Each PR should state:

- Phase number.
- Specific acceptance criteria satisfied.
- Files/surfaces touched.
- Screenshots for perceptible UI changes in Carbon and one light skin.
- Confirmation that behavior, permissions, runtime, memory, and tool execution were not changed when the PR is presentational.

### Guardrails

- Do not wipe or rebuild the app shell.
- Do not make LucaOS look like a coding IDE.
- Do not introduce sci-fi ornament, fake telemetry, or mission/operator/kernel language.
- Do not remove capabilities; relocate or progressively disclose them.
- Do not add new visual-effect dependencies unless there is a separate technical justification.
- Prefer spatial panels over modals where safe.
- Keep diffs small enough to review visually.
