# LucaOS Interface Founder Decisions

**Type:** Founder / product decision memo (documentation-only)
**Status:** Decision-forcing. No runtime, source, or asset changes are made by this document.
**Date:** 2026-06-21
**Audience:** Founder / product owner — to be read and decided *before* any interface implementation begins.
**Scope:** Default-state interface direction for LucaOS across desktop, web, and mobile.

**Inputs:**

- Codex audit — `docs/luca-top-ai-interface-pattern-audit.md`
- Claude UX verdict — `docs/luca-top-ai-interface-ux-verdict.md`

**Shared conclusion both audits reached:**
LucaOS has a strong design-system foundation after the Luca Material rollout. The
next product risk is *not* capability — it is **default-state restraint**:
density, disclosure, and category clarity. The system can read as a three-panel
control center at rest when it should read as a calm room.

> This memo does not redesign anything. It exists to extract the **decisions only
> the founder can make** so that downstream UI work has a settled direction.

---

## 1. Executive product verdict

LucaOS should **borrow production UI discipline** from ChatGPT, Claude, Gemini,
Codex, Cursor, and Claude Code — their spacing, density restraint, composer
focus, compact menus, calm dark mode, and adaptive mobile shells. These apps
prove that billion-user AI products stay quiet, spacious, and premium at scale.

LucaOS should **not copy their category.** It is not a chat thread, not an IDE
sidebar, not a search assistant. It is an AI-native operating layer: a
device-level AI host, an installable/upgradeable AI-OS-like environment, a
cross-platform personal intelligence system, and a host for local/cloud models,
memory, tools, browser actions, files, apps, voice, overlays, and continuity.

The default surface should feel **calm, spacious, and premium** — the first
screen mostly empty, the composer the obvious center of gravity.

LucaOS's power should be revealed through **presence, overlays, memory, tools,
and device continuity** — surfaced on intent, not asserted on load. LucaOS
should **not** try to prove its power by showing every panel by default. Showing
everything reads as a hobby dashboard; revealing depth on demand reads as an
operating system.

> **Framing for every interface decision that follows:**
> **"LucaOS should feel like a quiet operating system for intelligence, not a
> dashboard for controlling intelligence."**

---

## 2. The core product tension

There is one real tension, and the audits converge on it: how visible should
LucaOS's OS-level power be at rest?

### Option A — Composer-first calm shell

The default view leads with the composer/workspace; side panels and operational
surfaces are collapsed and opened on intent.

**Benefits**

- Feels premium and intentional.
- Normal users understand it immediately (start typing).
- Hits the same trust/clarity bar as top AI apps.
- Less visual noise; the interface disappears.
- Better mobile compatibility — a calm shell reduces cleanly.

**Risks**

- Can hide LucaOS's OS-level power if nothing signals depth.
- May look too similar to a normal AI assistant **if presence is weak** — the
  differentiator has to carry the identity.

### Option B — Visible OS dashboard

The default view shows the multi-zone OS — left capability access, center
workspace, right operational truth — so the product's scope is obvious at rest.

**Benefits**

- Immediately communicates power and scope.
- Shows operational truth — what Luca is doing, remembering, executing.
- Makes LucaOS feel like a genuine OS layer, not an app.

**Risks**

- Can feel like a command center / mission control.
- Can overwhelm normal users with choice and density.
- Can drift into cyber/Jarvis aesthetics if not deliberately restrained.
- Can demote the composer — the product's core verb — below chrome.

### Recommendation — Hybrid, gated by mode

Neither option wins outright; the answer is **tiered disclosure**. The power is
real and should stay reachable; the *default* should be calm.

- **Basic / default mode = composer-first calm shell.** Option A is the landing
  experience for normal users.
- **Pro mode = richer side panels and operational visibility.** Option B's
  truth, opened deliberately by users who want it.
- **Creator / Origin mode = deeper workspace/canvas/automation visibility.** The
  fullest expression of the OS — orchestration, multi-agent, automation
  surfaces — for power users who have chosen it.

This preserves the OS thesis (the capability ceiling is far higher than a
chatbot's) while keeping the surface as quiet as the best consumer AI apps. Calm
is the default; power is a door, not a wall.

---

## 3. Founder decisions required

Each row is a decision only the founder should settle, with a recommendation and
why it matters. "Implementation dependency" notes what downstream work the
decision unblocks — it does **not** authorize that work here.

| # | Decision | Options | Recommendation | Why it matters | Implementation dependency |
|---|---|---|---|---|---|
| 1 | Should Basic mode open with the right panel collapsed? | Collapsed / Visible / Adaptive | **Collapsed** (open on intent) | The right panel (CONTROL/ACTIVITY/MEMORY) is the single biggest source of "console at rest." Collapsing it is the highest-leverage calm move. | Right-panel default state in the shell; collapse rail already exists. |
| 2 | Should the left sidebar be visible, collapsed, or minimal by default? | Visible / Collapsed / Minimal | **Minimal** (quiet text rows, Core only; advanced groups collapsed) | A dense capability grid with tactical labels near core tools makes LucaOS read as a cyber dashboard. Minimal keeps navigation as recall, not configuration. | Left-panel default groups/density; IA grouping. |
| 3 | Should mobile open on Luca/thread/composer first? | Luca/composer / Tabs / Dashboard | **Luca/composer first** | Mobile must be a reduction, not a squeeze. Leading with thread + composer is the production consensus and fits thumb ergonomics. | Mobile default screen / tab landing. |
| 4 | Should Apps/System/Data be tabs, sheets, or overflow on mobile? | Tabs / Sheets / Overflow | **Sheets** (reachable, not dominant) | 1:1 mapping of desktop zones to phone tabs ships "desktop-minus." Sheets keep secondary surfaces reachable without making them co-equal with the composer. | Mobile nav model; sheet presentation. |
| 5 | How visible should the Hologram/Presence Face be by default? | Always visible / Ambient / Summonable | **Ambient** (quiet, glanceable; immersive on demand) | Presence is the differentiator, so it must not be deleted — but a default sci-fi centerpiece becomes Jarvis. Ambient keeps identity without noise. | Presence default visibility/placement. |
| 6 | Should MiniChat / Luca Widget become the primary system-level entry point? | Yes, primary / Co-equal / Secondary | **Yes — primary host-level entry point** | A persistent, tiny, always-reachable Luca is the OS feel that no chatbot can copy, while adding zero chrome to the main surface. | Widget/MiniChat role as system entry; overlay behavior. |
| 7 | Should the dashboard be secondary to overlay interaction? | Dashboard primary / Overlay primary / Mode-based | **Mode-based** (overlay-led in Basic; dashboard richer in Pro/Creator) | Overlay-first interaction is what makes Luca feel like a layer over the device, not an app you visit. Mode-based preserves the full dashboard for those who want it. | Relationship between overlay surfaces and dashboard; mode gating. |
| 8 | How much operational truth should be visible in Basic vs Pro/Creator? | Full everywhere / Tiered / Hidden in Basic | **Tiered** (honest but minimal in Basic; full in Pro/Creator) | "Operational truth never hidden" and "calm by default" both matter; tiering honors both instead of sacrificing one. Basic shows a quiet status, not telemetry. | Per-tier visibility of CONTROL/ACTIVITY/MEMORY. |
| 9 | Which controls belong in the composer by default? | Full set / Compact / Tier-based | **Tier-based** (attach/voice/send primary; model/tools compact or menu; advanced tier-disclosed) | The composer is sacred. Today it can read as an operator console; keeping primary actions primary protects fast task start. | Composer affordance inventory and disclosure. |
| 10 | Which header statuses stay visible vs move into a compact system menu? | Full inline / Compact inline + popover / Popover only | **Compact inline + popover** (one quiet system indicator; details on tap) | Top AI apps keep the top bar nearly empty. Consolidating credits/runtime/connection/ambient into one indicator removes ambient mission-control feel. | Header status consolidation (chrome only, not services). |

---

## 4. Recommended mode philosophy

Interface *behavior* by mode. Capability is identical across modes; only
**default density and disclosure** change. Advanced visuals never leak down a
tier.

### Basic / Normal

- Calm, composer-first landing.
- Minimal panels — right panel collapsed, left sidebar minimal.
- Simple, human wording. No tactical terminology in user-facing copy.
- Low-density right panel when opened.
- Advanced tools hidden or menu-based.

### Pro / Tactical

- More visible controls.
- Operational state allowed at rest.
- Right panel can be visible by default.
- Logs / activity / memory more accessible.
- Advanced actions still governed (approval gates intact).

### Creator / Origin

- Workspace / canvas visibility.
- Automation surfaces.
- Multi-agent / workforce surfaces.
- Deeper orchestration.
- Still **no cyberpunk default** — depth, not neon.

---

## 5. Presence hierarchy

LucaOS's embodied, device-level identity is the differentiator. **Do not remove
presence.** The decision is *relationship and prominence*, not existence. Each
surface plays one role; they must not compete.

| Surface | Role | Behavior |
|---|---|---|
| **Luca Widget** | **Primary entry** | Persistent, tiny, host-level affordance — Luca is always reachable. The everyday way in. |
| **MiniChat overlay** | **Summonable** (primary interaction overlay) | Lightweight overlay conversation/capture/action without opening the full shell. The OS-feel interaction layer. |
| **Hologram / Presence Face** | **Ambient** | Quiet, glanceable embodiment that signals "entity, not textbox." Immersive only on demand; never the default centerpiece. |
| **VoiceHUD** | **Fullscreen / immersive** | A system voice layer that *replaces* the shell when active. Voice is a layer, not a panel. |
| **Main dashboard** | **Secondary until needed** | The workspace you open for depth/operations — richer by tier. Not the thing the user lands in for a quick ask. |
| **LucaLink / device center** | **Secondary until needed** | Cross-device trust, continuity, approvals — opened deliberately. Felt as continuity, not displayed as telemetry. |

**Direct answers:**

- **Primary entry:** Luca Widget.
- **Ambient:** Hologram / Presence Face.
- **Summonable:** MiniChat overlay.
- **Fullscreen / immersive:** VoiceHUD.
- **Secondary until needed:** Main dashboard and LucaLink / device center.

---

## 6. Mobile product direction

- Mobile is **not** a squeezed desktop. It is its own shell with its own
  landing.
- Mobile should **open with Luca / thread / composer** — the fastest path to a
  first message or capture.
- **Apps / Activity / System should be reachable but not dominant** — present,
  but never co-equal with the composer.
- Advanced panels should become **sheets or contextual views**, summoned
  intentionally, not co-equal tabs that mirror desktop zones.
- Mobile should prioritize **voice, quick capture, notifications, device
  continuity, and MiniChat-like behavior** — the things a phone-shaped Luca is
  uniquely good at.

The product test for mobile: it should feel like Luca lives *on the device*, not
like the desktop app shrank.

---

## 7. What must not happen

Hard warnings. Treat these as guardrails on any downstream proposal.

- **Do not turn LucaOS into a ChatGPT clone.** Restraint is about default
  density, not removed capability. The OS concept must survive the cleanup.
- **Do not make the default experience a cyber/Jarvis dashboard.** No
  neon/glow/radar/scanline "mission control" as the landing surface.
- **Do not hide LucaOS's OS-level capabilities permanently.** Calm default,
  reachable depth — a door, not a wall. Latent ≠ deleted.
- **Do not expose advanced panels to normal users by default.** Operational
  truth is tiered; Basic shows a quiet status, not telemetry.
- **Do not make mobile behave like desktop.** No three-zone model on a phone.
- **Do not remove Luca Widget / Presence / VoiceHUD identity.** Embodiment is
  the category advantage; it stays summonable, never absent.
- **Do not redesign before these decisions are made.** This memo precedes
  implementation; building ahead of the founder's call defeats its purpose.

---

## 8. Decision outcome template

Founder fills this in. These settings then govern downstream UI PRs.

- **Basic default right panel:** collapsed / visible / adaptive → ______
- **Basic default left sidebar:** collapsed / visible / minimal → ______
- **Mobile default screen:** Luca/composer / tabs / dashboard → ______
- **Composer controls:** full / compact / tier-based → ______
- **Presence default:** visible / ambient / summonable → ______
- **Dashboard role:** primary app / secondary control center / mode-based → ______
- **Mobile Apps/Data:** tabs / sheets / overflow → ______
- **Header status:** full / compact / popover → ______

*(Memo recommendations, for reference: collapsed · minimal · Luca/composer ·
tier-based · ambient · mode-based · sheets · compact.)*

---

## 9. Strict rules

This is a **documentation-only** memo.

This PR does **not**:

- change source or runtime behavior;
- edit `App.tsx`;
- edit `README`;
- touch onboarding, voice runtime, browser runtime, LucaLink behavior, memory,
  governance, services, or model routing;
- touch tactical / debug / advanced visuals;
- add screenshots, assets, or logos;
- copy competitor UI directly (references describe visible patterns only).

### Validation

- **Build:** Not required for a documentation-only change; no build was run.
- **Source/runtime impact:** None. This PR adds a single Markdown file under
  `docs/` and changes no `.ts` / `.tsx`, `App.tsx`, `README`, onboarding,
  runtime, or asset files.
- **Assets:** No screenshots, logos, or competitor assets added.
- **Checks run:** None required; none run. If CI runs on the PR, results will be
  recorded there.
</content>
</invoke>
