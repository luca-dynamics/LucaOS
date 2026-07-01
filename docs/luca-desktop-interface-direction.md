# LucaOS Desktop Interface — Senior Design Direction

> Design direction spec for the full LucaOS desktop interface polish. This is
> judgment + rules, **not** implementation. Coding agents should turn this into
> small, phased PRs per §8 / §9. Do not wipe the app or restart; do not make it
> look like a coding IDE; keep it distinct from ChatGPT/Claude/Cursor/Notion/
> Linear while learning from their polish.

---

## 1. Product Interface Verdict

**What's wrong now.** The current UI reads as *capable software wearing a
costume*. The bones (three panels, skin system, permission gates) are right; the
surface fights itself in four ways:

1. **Theatrical chrome over a serious product.** "KERNEL ACCESS," "Operator,"
   "Zero-Cloud Update," resting-state red "Initiate lockdown,"
   `readyForExecution: false · executionEnabled: false · canExecute: false` —
   sci-fi LARP that undercuts trust in a tool touching email, files, and money.
2. **No hierarchy.** Left, center, and right rails carry roughly equal weight
   (same border, radius, contrast). Everything shouts, so nothing leads.
3. **Density without rhythm.** The left rail is a wall of equal-sized buttons; the
   right rail is metric-card soup + a red diagnostic blob. No spacing scale, no
   grouping logic.
4. **Decoration mistaken for premium.** Glass/blur used as *style* not *depth*.
   Borders everywhere. Ghost watermark. Premium feel comes from typography,
   spacing, restraint, and motion — not effects.

**What it should become.** A **calm operations surface for an intelligent system
you trust.** The seriousness of a pro creative tool applied to an *AI OS*, not a
chatbot. Center is a workspace. Rails are quiet instruments that surface state
and let you act, then get out of the way. The skin system provides material and
mood; the layout provides structure and legibility — never traded off.

**What it must avoid becoming:** a coding IDE; a generic AI dashboard; a sci-fi
cockpit; a ChatGPT/Claude clone. The center is a *workspace with chat in it*, not
a chat with nothing else.

---

## 2. Three-Panel Experience Model

Assign each panel **one role** and remove what doesn't serve it.

### Left — Navigation & capability (quiet index, not a feature wall)
- **Belongs:** primary navigation (a small destination set), active workspace/
  agent context, one collapsible "Tools & apps" section.
- **Remove from view:** the flat 10+ tool-button dump. Group under collapsible
  sections (Core / Intelligence / Finance / Visual) as the *primary* structure.
- **Hide until needed:** System Services, Link Bridge, IDE, Import — occasional
  actions live one layer down (a "System/Connections" destination).
- **Emphasize:** new chat/task + current context.
- **Default:** ~240px rail collapsible to ~64px icon rail. A sidebar, not a
  control room.

### Center — The workspace (center of gravity)
- **Belongs:** active conversation/task, inline tool calls + results, and any
  Luca-opened surface (doc, browser, vision) rendered in the same spatial flow.
- **Remove:** the "Evening, Operator" / "Ready when you are" / "(Zero-Cloud
  Update)" stack + ghost watermark. Empty state = one calm line + one affordance.
- **Emphasize:** composer + thread. Most space, best type, least chrome.

### Right — Awareness & control (status you can act on)
- **Belongs:** live system state (model, runtime, what's running), Timeline,
  Memory, Permission/Action review.
- **Remove:** raw flag dumps. Replace with one human status line + expandable
  detail.
- **Hide until relevant:** Permission Center is quiet when empty, comes forward
  when there's something to review. Not a permanent red wall.
- **Emphasize:** one top-of-panel system status summary (the single most
  important glanceable fact).
- **Default:** collapsible; it's reference, not primary.

**Principle:** Left = *where*, Center = *what*, Right = *state*. If a thing
doesn't answer one of those, it doesn't belong on the rails.

---

## 3. Visual Language

**Typography** (one scale): Display 24–28/600/−0.02em (once per view); Section
title 12–13/600/uppercase/+0.08em/tertiary; Body 14–15/400–450/1.5; Meta
12–12.5/secondary–tertiary. Kill all-caps body, decorative tracking on running
text, and monospace outside code/IDs/token-counts/technical detail.

**Spacing & density:** one 4px scale (4/8/12/16/24/32). Generous outer spacing +
tight inner grouping — not uniform compression.

**Borders/dividers:** one subtle border token; prefer background-step separation
over drawn lines. Never stack bordered card-in-panel-in-rail; one boundary per
level.

**Cards:** for grouped, scannable collections of like items — not the default
wrapper. One thing → a row; many like things → a card of rows.

**Buttons:** primary solid accent (≤1 per view); secondary subtle fill + 1px
border; ghost text+icon for rails/inline; destructive **neutral at rest**, red
only at the confirmation moment.

**Status pills:** small, low-saturation, semantic, dot + label (never raw
booleans). Ready = calm/neutral; attention = amber; error = red and only for real
errors.

**Tool/action rows:** icon + label + optional right-state, equal height, hover =
surface-hover fill (no border flip, no glow). List rows, not button grids.

**Empty states:** one line + one affordance. No hero slogans or watermarks.

**Hover/focus:** hover = single surface-step. Focus = 2px accent ring (keyboard
a11y). No scale transforms or glow pulses.

**Glass/liquid:** material for depth/mood on large surfaces; never behind small
text. Modest blur over a solid-ish base so contrast holds.

**Dark/light:** Carbon (dark) is the default identity. Light skins hit the same
contrast targets via the same `--luca-text-*` contract — skins change material/
hue, not legibility.

**Icons:** one set, one weight, sized per context (16 inline / 18–20 rail / 14
meta). Consolidate the multi-provider `Icon` setup to a single LucaOS family;
alias the rest. Mixed icon families are a top "AI slop" tell.

---

## 4. Component Rules (strict)

- **Panels:** one material bg, one optional subtle border, 16–20px padding, a
  12px-uppercase section title, collapsible. No nested panels.
- **Cards:** wrap collections only. Radius 14. One border OR one shadow. No
  card-in-card.
- **Tool buttons:** list rows (40–44px), icon + label, hover surface-hover,
  grouped under collapsible headers.
- **Chat composer:** one elevated surface, generous height, clear primary send,
  model/mode as quiet inline chips. The most important control — give it
  presence and calm.
- **Messages:** role via alignment + subtle surface + spacing, not heavy bubbles/
  avatars. Luca most readable; user lighter; generous rhythm.
- **Memory/status items:** rows in a card; dot/icon + text + meta; no per-item
  borders.
- **Permission review items:** a row = one action plainly described ("Send email
  to…") + Allow/Deny; the queue is a card; quiet when empty; technical detail
  behind a disclosure.
- **Tabs:** text + 2px active underline (accent), inactive tertiary. ≤4. No boxed
  chips.
- **Headers:** product name only ("LucaOS"); quiet global affordances (credits,
  model, settings).
- **Side navigation:** grouped, collapsible, icon+label, one active indicator.
- **Model/runtime indicators:** quiet chips. "Local model offline" is neutral
  info, not red. Reserve color for states the user must act on.

---

## 5. Chat Experience

Operational, not consumer-chatbot.

- **Messages:** roomy single column, max ~720–760px, left Luca / lighter user,
  separation via space; metadata on hover.
- **Composer:** elevated, persistent, bottom-anchored; primary send; mode
  (Auto/Fast/Plan/Agent) as one segmented control; quiet model picker, attach,
  voice; offline as a quiet chip.
- **Streaming:** calm stream + subtle caret; no jitter; tool calls appear inline,
  collapsed.
- **Tool call/result:** compact collapsible inline block — icon + "Searched
  Drive" / "Drafted email" + one-line summary; expand for detail. Successful
  calls quiet; only failures draw color. *This is the biggest differentiator from
  a generic chatbot.*
- **Long-thread nav:** slim right-edge thread map (turns, tool calls, decisions).
- **Context preservation:** persistent glanceable "what Luca knows right now"
  (active memory, connected tools, current model).
- **Status visibility:** thread always reflects system truth (paused actions,
  unavailable tools) calmly.
- **Workspace blend:** Luca-opened surfaces expand within the center as spatial
  panels with a clear way back — never blocking modals.

---

## 6. Skin System Guidance

A skin = **material + mood**, applied via tokens, bounded by a legibility
contract.

- **Carbon/default:** sets `--luca-background-base` (#111417) + elevated/glass
  surface steps for panels/shell. Panels inherit material; text/controls inherit
  the fixed legibility contract so Carbon never darkens a label into mud.
- **Apply without washing out:** skins drive backgrounds, material, accent hue,
  depth — never text-contrast or semantic-status colors. Hard floor: every skin
  passes the same `--luca-text-primary/secondary/tertiary` contrast targets
  against its own surfaces. (The Pearl "washed out" issue was a skin reaching
  into text legibility; the contract forbids that.)
- **Settings presentation:** named material swatches with live preview — each a
  mini mockup of real panel/surface/accent + a one-line mood description
  ("Carbon — focused dark, restrained contrast for long sessions"); clear
  selected state. No tiny color dots.
- **Inherits material:** shell bg, panel/card surfaces, composer surface, large
  empty areas, accent on primary actions + active indicators.
- **Stays neutral:** body text, status semantics, focus rings, permission/
  destructive affordances, data numerals — follow the contract in every skin.

---

## 7. UI Copy / Voice

**Voice:** professional, direct, calm, human. Plain words; confident without
theatrics. Speaks to a competent adult about their system — not a sidekick, not
sci-fi, not a developer console. No caps-lock drama; no "mission/kernel/
operator"; no false alarms (offline ≠ error); first person only when natural and
sparing.

| Current (awkward) | Rewrite |
|---|---|
| `KERNEL ACCESS` (title bar) | `LucaOS` |
| `Evening, Operator` | `Good evening` |
| `Ready when you are` / `(Zero-Cloud Update)` | `Ask Luca anything` |
| `First Run` | `Welcome` / `Set up Luca` |
| `I'll help from inside` | `Luca runs on this device` |
| `What should Luca call you?` / `What should I call you?` | Label `Your name` (helper `Optional`) |
| `Start with me` | `Get started` |
| `Handshake complete` | `Connected` |
| `Preparing memory boundaries` | `Setting up memory` |
| `Luca standby` | `Idle` |
| `Awaiting mission parameters` | `Nothing running` |
| `Initiate lockdown` | `Pause all actions` (confirm: `Pause everything Luca can do?`) |
| `LOCAL · OLLAMA OFFLINE` (red) | `Local model offline` (neutral chip) |
| `readyForExecution: false · canExecute: false …` | `Actions paused` + "Details" disclosure |
| `LUCA is adapting to new parameters...` | `Updating settings…` |

**Rule of thumb:** if a label sounds strange said aloud to a colleague, rewrite
it until it doesn't.

---

## 8. Prioritized Redesign Phases

**Phase 1 — Visual/component cleanup (low risk, high payoff).**
- Change: §7 copy rewrites; one icon set; demote borders to one token; neutralize
  false-alarm reds (lockdown, offline); replace flag-dump with a status line;
  tighten the type scale; calm the empty state.
- Avoid: layout structure, panel logic, chat plumbing, skin engine.
- Acceptance: no all-caps sci-fi copy; one icon family; no resting-state red
  except real errors; exactly one display element per view; light + dark skins
  pass contrast.

**Phase 2 — Chat & composer redesign.**
- Change: composer as one elevated surface + segmented mode control + quiet model
  chip; message readability; inline collapsible tool-call blocks; streaming
  polish.
- Avoid: message data model, agent routing, tool execution.
- Acceptance: tool calls render inline + collapsed; composer is visually primary;
  thread readable at 720px; no bubble-heavy chrome.

**Phase 3 — Left/right panel redesign.**
- Change: left → grouped collapsible nav, occasional tools one layer down, narrow/
  collapse support; right → status summary on top, quiet permission queue,
  collapsible.
- Avoid: removing capabilities (relocate, don't delete); permission *logic*.
- Acceptance: left rail ≤6 primary items at rest; right rail calm when empty,
  forward when needed; both collapsible.

**Phase 4 — Settings / skin / onboarding polish.**
- Change: skin picker as live material swatches; onboarding copy + the connector
  grid; enforce the skin legibility contract.
- Avoid: onboarding flow/steps; skin token architecture.
- Acceptance: skins preview real material; onboarding reads in the new voice; no
  skin fails contrast.

**Phase 5 — Workspace/tool surfaces.**
- Change: Luca-opened surfaces as spatial center panels with clear return;
  long-thread navigation rail.
- Avoid: rebuilding underlying tools.
- Acceptance: opening a surface never uses a blocking modal; always a way back.

---

## 9. Implementation Handoff

- **Scope discipline:** one phase = one or more small PRs; never combine phases.
  Phase 1 is pure presentational (copy/tokens/icons) — touch no logic.
- **Token-first:** all color/space/elevation via `--luca-*` tokens + the skin
  layer. No hardcoded hex except as token fallbacks. Add tokens before use.
- **Legibility contract:** lock a contrast contract for `--luca-text-*` +
  semantic status; add a test (extend the `lucaOnboardingSkinBoundary.test.ts`
  pattern) so a skin can't regress legibility.
- **One icon set:** choose the LucaOS family in the `Icon` alias map; route all
  names through it; log on unmapped names.
- **Copy as data:** centralize UI strings (extend the onboarding-copy pattern to
  shell/status copy) so §7 is a data change, not JSX hunt-and-peck.
- **No early layout rewrites:** Phases 1–2 must not move panels; structure is
  Phase 3.
- **Per-PR acceptance:** name the phase + criteria satisfied; include before/after
  screenshots in Carbon + one light skin; assert "no behavior/logic changed" for
  presentational phases.
- **Guardrails:** relocate capabilities, don't remove; no new deps for visual
  effects; prefer spatial panels over modals; keep diffs eyeball-able.
