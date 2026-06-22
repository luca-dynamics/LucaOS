# LucaOS Composer Product Decisions

**Type:** Composer product / design decision memo (documentation-only)
**Status:** Decision-forcing. No runtime, source, or asset changes are made by this document.
**Date:** 2026-06-22
**Audience:** Founder / product owner and UI implementers — to be read *before* any composer change.
**Scope:** The LucaOS composer across Basic / Pro / Creator tiers, desktop and mobile, and the MiniChat overlay.

**Read together with:**

- `docs/luca-composer-affordance-inventory.md` (the factual inventory this memo decides on)
- `docs/luca-interface-founder-decisions.md`
- `docs/luca-interface-refinement-roadmap.md`
- `docs/luca-top-ai-interface-pattern-audit.md`
- `docs/luca-top-ai-interface-ux-verdict.md`

> **Shared direction:** "LucaOS should feel like a quiet operating system for
> intelligence, not a dashboard for controlling intelligence."

> This memo turns the composer affordance inventory's neutral classification
> (`primary` / `secondary` / `advanced` / `hidden-by-tier` / `do-not-touch`) into
> **product decisions**: what stays visible, what compacts, what is tier-gated,
> and what must never be hidden. It does **not** redesign or move any control.

---

## 1. Executive verdict

The composer is **the primary action object in LucaOS** — the single surface
where intent enters the system. Every decision below protects that role.

- The **Basic/default composer must be calm and immediately understandable.** A
  first-time user should see a text field, a way to attach, a way to talk, and a
  way to send — and nothing that reads as a machine console.
- LucaOS **must preserve OS-level capability**, but that power should be revealed
  **through tier, menu, or intent** — not asserted in the default toolbar. The
  capability ceiling stays high; the default density stays low.
- **Safety, privacy, and trust states must never be hidden.** Stop, active
  voice/listening, active vision/screen context, approvals, blocked actions, and
  write-enabled states are non-negotiable and always legible.
- **MiniChat should be lighter than the dashboard composer**, not a second
  operator console. It is a quick overlay, not a shrunken control center.
- The **mobile composer must be a reduction, not a squeezed desktop composer.**
  Mobile leads with text, attach, voice, send/stop; advanced controls live in
  sheets.

> **Framing line for every composer decision that follows:**
> **"The composer should feel like the doorway into an intelligence OS, not a
> control strip for a machine room."**

---

## 2. Decision principles

These principles govern every row of the decision table and every follow-up PR.

1. **Text input, send, stop, voice, and attach are primary.** They are directly
   visible in every tier and on every surface.
2. **Active safety/privacy states are do-not-touch.** They cannot be hidden,
   moved, or visually weakened by a presentation change.
3. **Model / tool / runtime details are secondary or advanced.** They are
   capability, not default chrome.
4. **Basic mode must reduce visible controls.** Calm is the default; the bar is
   "obvious to a first-time user."
5. **Pro / Creator can reveal deeper controls.** Density increases by *chosen*
   tier, never by accident.
6. **Mobile must hide advanced controls behind sheets/menus.** Mobile is its own
   shell, not desktop at a narrower width.
7. **MiniChat must stay lightweight and quick.** It optimizes for ask / capture /
   act, not configuration.
8. **Do not remove capability; change disclosure only.** Every control stays
   reachable; this memo only decides *where* and *when* it appears.

---

## 3. Control visibility decision table

Buckets are taken from `docs/luca-composer-affordance-inventory.md` §3–4. "Final
decision" is the product call; it never overrides a `do-not-touch` classification.
"Sheet/menu" means reachable on intent, not deleted.

| Affordance | Inventory bucket | Basic | Pro | Creator | Desktop | Mobile | MiniChat | Final decision | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Text input | `primary` | Visible, dominant | Visible | Visible | Visible, dominant | Visible, dominant | Visible, dominant | **Always primary, all surfaces** | The action object; never compacted. |
| Send | `primary` | Visible | Visible | Visible | Visible | Visible | Visible | **Always primary** | Disabled when empty is fine; never hidden. |
| Stop | `do-not-touch` | Prominent while generating | Prominent | Prominent | Prominent | Thumb-reachable | Prominent | **Always visible while generating** | Safety-critical; overrides send. |
| Voice / mic | `primary` | Visible | Visible | Visible | Visible | Visible | Visible | **Primary; active state do-not-touch** | Inactive control primary; listening state never hidden. |
| Active voice / listening state | `do-not-touch` | Always visible | Always visible | Always visible | Always visible | Unmistakable | Always visible | **Never hidden** | Privacy/trust signal. |
| Attach / add | `primary` | Visible | Visible | Visible | Visible | One compact icon | Visible | **Primary where attachments supported** | Multimodal entry stays discoverable. |
| Attachment preview | `secondary` | Visible when attached | Visible when attached | Visible when attached | Visible | Compact, sheet-friendly | Visible when attached | **Visible whenever context attached** | Prevents sending wrong context. |
| Attachment clear | `primary` (within preview) | Visible with preview | Visible | Visible | Visible | Visible | Visible | **Primary within the preview** | Attach must be reversible. |
| Model selector | `secondary` | Subtle label or menu | Visible / compact | Visible, deeper controls | Visible or compact by mode | Sheet / menu | Subtle / brain label only | **Tier-based; subtle in Basic** | Capability constant; visibility scales. |
| Mode / extended thinking toggle | `advanced` | Hidden or in mode menu | Visible or menu | Visible / direct | Pro/Creator or menu | Sheet | Not default | **Advanced disclosure; not Basic chrome** | Behavior semantics need explanation if surfaced. |
| Clear chat | `secondary` | Menu / subtle | Visible secondary | Visible secondary | Secondary | Menu / sheet | Avoid in default | **Secondary; confirm before destructive** | Destructive; review before moving. |
| Vision / Luca Eye inactive toggle | `advanced` | Tools menu | Visible or tools | Visible / direct | Tools or Pro/Creator | Sheet | Not default | **Advanced; inactive control menu-based** | Inactive only; active state separate. |
| Active vision indicator | `do-not-touch` | Always visible | Always visible | Always visible | Always visible | Always visible | Always visible | **Never hidden** | Screen/camera context must stay legible. |
| Screen share | `advanced` | Hidden until requested | Tools / direct | Direct or panel | Tools menu / Pro | Hidden/deferred | Not default | **Advanced; deferred on mobile** | Permission-sensitive; not passed on mobile today. |
| MCP indicator | `advanced` | Critical active state only | Compact status + menu | Detailed status | Subtle status; detail in menu | Hidden detail; critical state only | Not default | **Advanced; active state may show, detail in menu** | Hidden below `sm` today — directionally right. |
| MCP hover popover | `advanced` | Not in Basic | Menu / tools | Tools / node mgmt | Tools menu | Sheet | Not default | **Move to tools menu (later, reviewed)** | Inspect-only surface; relocation is design-review. |
| MCP connect/disconnect | `do-not-touch` | Not surfaced ambiently | Reviewed placement | Reviewed placement | Reviewed | Reviewed | Not default | **Runtime action; do-not-touch** | Connection semantics = runtime; defer. |
| Plugin badge / active plugin | `advanced` | Subtle when active | Visible / compact | Visible / detailed | Subtle status | Critical state only | Subtle when active | **Active state stays legible; detail tiered** | Hidden active mode causes confusion. |
| Clear active plugin | `secondary` | With badge | With badge | With badge | With badge | With badge | With badge | **Keep next to plugin badge** | Users need a way out of plugin mode. |
| Route hint / intent routing selector | `secondary` | Subtle status / default routing | More explicit selector | Full routing visibility | Subtle; fuller in Pro/Creator | Subtle status / sheet | Not a selector | **Subtle in Basic; explicit by tier** | Avoid console-like routing noise. |
| Route hint message | `secondary` | Subtle, occasional | More explicit | Explicit | Subtle | Subtle | Minimal | **Keep subtle; preserve explainability** | Don't bury entirely; don't make it noise. |
| Persona badge | `secondary` | Subtle identity | Visible identity | Expanded context | Subtle near composer | Minimal chip | Lightweight | **Subtle identity; expands by tier** | Prevents identity mismatch. |
| Engineer CWD indicator | `hidden-by-tier` | Hidden | Visible (persona) | Visible / detailed | Pro/Creator or details menu | Sheet | Not default | **Pro/Creator only** | Console-like in Basic. |
| Engineer kernel lock/write indicator | `do-not-touch` (write-on) | Write-on always visible | Always visible | Always visible | Always visible | Always visible | Always visible | **Write-enabled state never hidden** | Locked/off may be secondary; write-on is safety. |
| Hacker OPSEC indicator | `hidden-by-tier` | Hidden | Visible (persona) | Visible / detailed | Pro/Creator | Sheet | Not default | **Pro/Creator; security review before hiding** | Active security state matters. |
| Mission pending / approval indicator | `do-not-touch` | Prominent | Prominent | Prominent | Prominent | Prominent | Prominent | **Never hidden** | Core trust/safety surface. |
| Suggestion chips | `secondary` | Calm, limited, dismissible | More contextual | Workflow/canvas-aware | Low-weight | Limited, dismissible | Limited | **Secondary; dismissible; capped** | Must not compete with input. |
| Workforce / Cortex toggle | `hidden-by-tier` | Hidden / navigation-level | Available, not composer-primary | Direct and prominent | Tier-gated | Behind nav/sheet | Not in MiniChat | **Creator-prominent; out of Basic composer** | OS orchestration, not default chrome. |
| MiniChat close | `primary` | — | — | — | — | — | Visible | **Primary in overlay** | Overlay needs an escape hatch. |
| MiniChat header brand | `secondary` | — | — | — | — | — | Lightweight | **Keep light** | Orientation only. |
| Brain model indicator | `secondary` | Subtle / header-only | Visible compact | Visible detailed | Subtle | Header label only | Subtle | **Subtle in Basic; explicit by tier** | Avoid diagnostic overload. |
| Memory / embedding indicator | `secondary` | Subtle / header-only | Visible compact | Visible detailed | Subtle | Header label only | Subtle | **Subtle; never diagnostic dump** | Memory trust matters; keep calm. |
| MiniChat bridge behavior | `do-not-touch` | n/a (runtime) | n/a | n/a | n/a | n/a | n/a | **Do not alter** | Payload/focus/IPC; defer entirely. |
| Mobile sheet / material state | `secondary` | n/a | n/a | n/a | n/a | Mobile sheet, not desktop glass | n/a | **Mobile-specific; needs its own plan** | Don't inherit desktop density. |

---

## 4. Recommended Basic / default composer

The Basic composer is the product's first impression. It should read as a calm
doorway.

**Includes (default-visible):**

- Text input (dominant).
- Attach / add.
- Voice / mic.
- Send / stop.
- A **subtle** model label or small menu, only if a model choice is meaningful.
- **Subtle active safety/privacy indicators, shown only when active** (listening,
  vision/screen context, approval pending, write-enabled).
- Minimal, dismissible suggestion chips.

**Does *not* directly expose by default** (remains reachable via tools menu, mode,
or tier):

- MCP node list and connect/disconnect.
- Screen share.
- Detailed route controls.
- Advanced mode / extended-thinking toggles.
- Engineer / Hacker diagnostics (CWD, OPSEC).
- Workforce / Cortex toggle.
- Plugin internals.
- Heavy runtime status.

**These are not removed.** Every item above stays in the product and stays
reachable — through a tools menu, a mode switch, or a higher tier. Basic mode
changes *ambient visibility only*, never capability. Active safety/privacy states
are the one exception that always surfaces regardless of tier.

---

## 5. Recommended Pro composer

Pro is for users who have opted into more operational visibility. It can show
more, but it is still not a technical strip by default.

- **Can expose the model selector** directly in the toolbar.
- **Can expose the mode / extended-thinking toggle.**
- **Can show routing / tool status more directly** (fuller intent-routing
  selector, visible route hints).
- **Can show plugin / MCP summaries** (compact status plus a menu for detail).
- **Can keep screen share closer to the toolbar** (still permission-gated).
- **Should still avoid becoming a technical strip** unless the user is
  specifically in a tactical / developer (Engineer/Hacker persona) context. Pro
  adds visibility; it does not mandate density.

---

## 6. Recommended Creator / Origin composer

Creator/Origin is the fullest expression of LucaOS as an orchestration
environment. It can surface depth — but the input remains the center of gravity.

- **Can expose Workforce / Cortex / canvas controls** near the composer surface.
- **Can show orchestration state** (multi-agent / workforce status).
- **Can expose advanced tool / plugin affordances** directly.
- **Can show model / memory / brain state more explicitly.**
- **Still must preserve a dominant input area** — orchestration surfaces frame the
  composer, they don't crowd it out.
- **Still no cyberpunk / operator-console default styling.** Depth is expressed
  through structure and disclosure, not neon, glow, or terminal aesthetics.

---

## 7. Mobile composer decision

Firm direction: mobile is a reduction, not a squeeze.

- The mobile composer should show **only text, attach, voice, send/stop by
  default.**
- **Model and tools belong behind a sheet or menu**, not the default toolbar row.
- **Route / tool / MCP / plugin details belong behind sheets.**
- **Active voice / vision / approval states must remain visible** — safety and
  privacy are never tier- or surface-hidden.
- **Screen share should stay hidden / deferred** unless a mobile-specific design
  exists (it is not passed on mobile today, which is correct).
- **Suggestion chips should be limited and dismissible.**
- **Mobile must never inherit full desktop composer density.** No desktop status
  pills, MCP detail, or persona diagnostics crammed into a phone toolbar.

---

## 8. MiniChat decision

MiniChat is a quick overlay — the OS-feel "ask Luca from anywhere" surface. It
must stay lighter than the dashboard composer.

- **MiniChat is a quick overlay, not a full dashboard.**
- It should prioritize **text, attach, voice, send/stop, and close.**
- **Brain / memory indicators should be subtle** (small header labels, not
  diagnostic readouts).
- **Approval / safety prompts must remain visible** — the MiniChat approval
  surface is `do-not-touch`.
- **MCP / plugin / tool details should not crowd MiniChat by default.**
- MiniChat should **feel lighter than the main dashboard composer**, never
  heavier. If MiniChat ever looks more technical than the main composer, the
  direction has been violated.

---

## 9. Do-not-touch safety / privacy list

These are enforced from the inventory's `do-not-touch` bucket. None may be
hidden, moved, merged, restyled-weaker, or removed by a presentation-only PR.
Each requires separate design **and** runtime review because it is either
safety-critical, privacy-critical, or runtime-coupled.

- **Stop generation** — the user's ability to interrupt the system; a core safety
  and trust control.
- **Active voice / listening state** — the user must always know when the mic is
  live; hiding it is a privacy breach.
- **Active vision / screen context** — the user must always know when the screen
  or camera is being read; hiding it is a privacy breach.
- **Approval / permission states** — governed actions depend on the user seeing
  and answering them; hiding breaks the trust model.
- **Blocked-action states** — the user must understand when Luca declined or was
  prevented from acting; hiding misleads.
- **Mission pending** — a pending mission/tool approval is an active commitment of
  the system; it must be visible until resolved.
- **Kernel write-enabled state** — a write-on indicator is a danger signal;
  hiding it risks unintended destructive operations.
- **MCP connect/disconnect actions** — these change runtime connection state;
  moving them without runtime review can leave status misleading or sever tools.
- **Hidden native file input wiring** — the DOM file input backing attach is
  runtime-coupled; touching it can break uploads.
- **MiniChat bridge behavior** — the message/image/display payload, focus policy,
  and Electron IPC path; a visual change must not alter these fields.

> Confirmation that these states are preserved is a required gate before any
> composer implementation PR (see §11 checklist).

---

## 10. Proposed follow-up implementation PRs

Classification mirrors the inventory's risk tiers. This memo authorizes none of
them; it scopes them for separate review.

### `safe-small`

1. Composer visual hierarchy cleanup plan (documentation).
2. Compact tools menu specification (which advanced controls it would hold).
3. Mobile composer simplification plan.
4. MiniChat lightweight composer plan.

### `needs-design-review`

1. Moving the model selector into a menu.
2. Moving the mode / extended-thinking toggle into a menu.
3. Moving MCP / tool / plugin details into a tools menu.
4. Tier-based composer controls (Basic / Pro / Creator gating).
5. VoiceHUD / composer relationship.
6. Permission / approval placement.

### `defer`

1. Runtime behavior changes.
2. Model routing changes.
3. Voice runtime changes.
4. Browser runtime changes.
5. LucaLink behavior changes.
6. Memory / governance workflow changes.
7. MCP connection semantics.
8. MiniChat message bridge / Electron IPC behavior changes.

---

## 11. Decision outcome checklist

Founder / lead fills this in before any composer implementation PR proceeds.

- **Basic composer controls:** ______ *(recommended: text, attach, voice, send/stop, subtle model label, active-only safety indicators, minimal chips)*
- **Pro composer controls:** ______ *(recommended: Basic + model selector, mode toggle, fuller routing, plugin/MCP summaries, screen share near toolbar)*
- **Creator composer controls:** ______ *(recommended: Pro + Workforce/Cortex/canvas, orchestration state, explicit model/memory/brain)*
- **Mobile default composer:** ______ *(recommended: text, attach, voice, send/stop only; rest in sheets; active safety states visible)*
- **MiniChat default composer:** ______ *(recommended: text, attach, voice, send/stop, close; subtle brain/memory; approvals visible)*
- **Tools menu contents:** ______ *(recommended: screen share, vision toggle, MCP detail, route controls, mode toggle, plugin internals)*
- **Do-not-touch safety states confirmed:** yes / no *(all §9 items preserved)*
- **Ready for implementation PR:** yes / no

---

## 12. Strict rules

This is a **documentation-only** memo.

This PR does **not**:

- edit source / runtime behavior;
- edit `App.tsx`;
- edit `README`;
- touch onboarding;
- touch voice runtime;
- touch browser runtime;
- touch LucaLink behavior;
- touch memory / governance / model routing / services;
- touch tactical / debug / advanced visuals;
- move, hide, or remove any composer controls;
- add screenshots, assets, or logos;
- copy competitor UI directly.

### Validation

- **Build:** Not required for a documentation-only change; no build was run.
- **Source/runtime impact:** None. This PR adds a single Markdown file under
  `docs/` and changes no `.ts` / `.tsx`, `App.tsx`, `README`, onboarding,
  runtime, or asset files.
- **Assets:** No screenshots, logos, or competitor assets added.
- **Checks run:** None required; none run. If CI runs on the PR, results will be
  recorded there.
</content>
