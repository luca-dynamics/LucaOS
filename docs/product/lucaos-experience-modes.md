# LucaOS Experience Modes — Basic / Pro / Creator

> Status: **Foundation / source-of-truth.** This document defines the official
> mode system and the design contracts later PRs implement. It deliberately does
> **not** implement UI gating, onboarding, the settings switch, or Creator key
> infrastructure. See "Intentionally deferred" at the end.

## Executive summary

LucaOS adopts three official, product-facing **Experience Modes**:

| Mode | For whom | One-liner |
| --- | --- | --- |
| **Basic** | Everyday users | A calm, friendly personal AI. |
| **Pro** | Builders, developers, analysts, power users | Capable and clean. |
| **Creator** | LucaOS builders/maintainers (source authority) | Full diagnostics and governance authority. |

These replace the previous conceptual language (**Normal → Basic, Tactical → Pro,
Origin → Creator**). The mode changes **density and disclosure, not loudness** —
no mode is a tactical/cyber skin. Calm by default in every mode; power is
revealed progressively.

LucaOS already ships a build-layer vocabulary in
[`src/config/layerBoundary.ts`](../../src/config/layerBoundary.ts)
(`LucaAudienceTier`: `public_standard` / `public_tactical` / `origin`) and a
premium token/theme engine ([`lucaAppearanceTokens.ts`](../../src/config/lucaAppearanceTokens.ts),
[`lucaThemeLabels.ts`](../../src/config/lucaThemeLabels.ts)). Experience Modes
sit on top of these rather than introducing a parallel system. PR #235 added a
future-ready `tier?: "BASIC" | "PRO" | "CREATOR"` prop to `Header`; this PR
provides the typed model and helpers that prop (and later surfaces) will consume.

The user is **never forced** into a mode. Luca may *recommend* Basic or Pro after
a local capability scan, but the user makes the final choice. Creator is not a
normal onboarding card.

## Final naming decision

- **Basic** (was "Normal" / `public_standard`)
- **Pro** (was "Tactical" / `public_tactical`)
- **Creator** (was "Origin" / `origin`)

Canonical string form is **lowercase**: `"basic" | "pro" | "creator"`
(`LucaExperienceMode`). The `Header` `tier` prop uses an uppercase form; the
model provides explicit `toHeaderTier` / `fromHeaderTier` bridges so the casing
mismatch never leaks across the codebase.

## Mode definitions

### Basic
- Calm default mode.
- Simple chat / voice.
- Friendly memory ("What Luca knows about you").
- Simple device linking (approve / deny).
- Minimal diagnostics.
- No cyber/hacker/tactical surfaces by default.
- Fewer left-panel tools.
- Right panel uses friendly labels and summaries.

### Pro
- Advanced user mode.
- Local / cloud / BYOK model controls.
- Developer tools.
- Browser / code / workspace modes.
- VisualCore and LucaLink advanced controls.
- Runtime health and diagnostics.
- More visible tools — still premium and clean.

### Creator
- Source-authority mode for LucaOS builders/maintainers.
- Only available in source/dev/creator-authorized contexts (see Creator access).
- Full diagnostics, runtime graph, model-router internals, memory audit.
- LucaLink mesh, VisualCore sessions, approval queues, trace/log depth.
- Self-evolution proposals **if present/planned** (not introduced here).

Creator is **not** a manual admin/override toggle. Luca remains autonomous:

> Luca proposes → Creator approves / edits / rejects → Luca executes inside
> constraints → Creator can inspect, stop, or override high-authority actions.

## Legacy mapping

Implemented in [`mapLegacyTierToExperienceMode`](../../src/experience/experienceMode.ts).
Accepts both the conceptual names and the existing `LucaAudienceTier` values;
unknown input falls back to the calm default `basic`.

| Input | Experience mode |
| --- | --- |
| `Normal`, `public_standard`, `standard`, `basic` | `basic` |
| `Tactical`, `public_tactical`, `pro` | `pro` |
| `Origin`, `creator` | `creator` |
| anything else / null / undefined | `basic` |

Round-trip helpers `experienceModeToAudienceTier` /
`audienceTierToExperienceMode` keep the model and the build layer in sync.

## First-run mode choice

Desired onboarding flow after install / first boot:

1. Luca performs a **privacy-respecting local capability scan** where permitted.
2. Luca shows **two** main cards: **Basic** and **Pro**
   (`getOnboardingSelectableModes()` returns exactly these).
3. Luca **recommends one** mode based on local capability signals.
4. The user can still choose **either** mode.
5. **Creator is not shown** as a normal onboarding card.

### Local scan principles

The scan must be **local, explainable, and not overreaching**. Safe signals:

- RAM / CPU / GPU / storage
- OS / device class
- developer tools: Node / Git / Python / Docker
- local model runtimes: Ollama / LM Studio / llama.cpp
- microphone / camera availability
- browser automation support
- MCP / tool capability
- multi-device / LucaLink readiness

Recommendation copy should explain *why*, e.g.:

- "Recommended: **Pro** — Luca detected developer tools, local model
  compatibility, and sufficient memory."
- "Recommended: **Basic** — Luca detected a standard user setup; cloud mode will
  provide the smoothest experience."

> Luca suggests. The user decides. The scan never auto-selects a mode.

## Settings switch behavior

Location: **Settings → General (or Experience) → Experience Mode**.

Options shown: **Basic**, **Pro**. **Creator appears only when creator access is
available** (`canShowCreatorMode` / `getAvailableExperienceModes`).

- Basic users can switch to **Pro** anytime.
- Pro users can switch back to **Basic** anytime.
- Switching to Basic **hides** advanced tools — it does **not** delete installed
  tools, settings, memories, or capabilities.
- Switching to Pro **may prompt** another local capability scan.
- Creator mode is **not** enabled by a normal settings toggle.

## Creator access model

Creator only unlocks when LucaOS detects trusted dev/source-authority signals.
The design contract is the `CreatorAccessState` interface in
[`experienceMode.ts`](../../src/experience/experienceMode.ts):

```ts
interface CreatorAccessState {
  eligible: boolean;            // the single field UI gates on
  sourceBuild: boolean;         // running from a source/dev (ORIGIN) build
  repoRootDetected: boolean;    // dev checkout
  creatorConfigPresent: boolean;
  trustedCreatorKey: boolean;
  internalBuild: boolean;
  reason: string;               // human-readable explanation
}
```

- `evaluateCreatorAccess(signals)` — pure: `eligible` is true when **any**
  trusted marker is present; a normal Basic/Pro user has none.
- `canShowCreatorMode(state)` — UI predicate (returns `state.eligible`).
  Creator is hidden when not eligible.
- `deriveCreatorAccessFromBuild({ audienceTier, surfaceLayer })` — documented
  bridge to the existing build layer. A later PR can call this with
  `LUCA_AUDIENCE_TIER` / `LUCA_SURFACE_LAYER` from
  [`buildConfig.ts`](../../src/config/buildConfig.ts) (`origin` surface ⇒
  eligible). Kept pure by taking inputs rather than reading build config.

> Security-sensitive key/profile infrastructure (`trustedCreatorKey`,
> signed creator profiles) is **not** implemented here. The fields exist as a
> contract; populating them safely is deferred.

## Dashboard behavior by mode

Tier changes density and disclosure, not loudness. Nothing below is gated yet.

| Surface | Basic | Pro | Creator |
| --- | --- | --- | --- |
| **Header** | LUCA OS, calm status, minimal chips | More status; model/device readiness visible | Full operational indicators allowed |
| **Left panel** | Apps, Devices, simple Skills | + Tools, IDE, Screen/VisualCore, Link Bridge | Full system/runtime/network/memory/devices/diagnostics/evolve |
| **Center** | Chat / Voice | + Browser / Code / VisualCore | Full workspace modes, mission control, traces, model router, agent graph |
| **Right panel** | Overview / Timeline / Memory | Overview·Control / Timeline / Memory / Trace | Control / Activity / Memory / Trace + diagnostics depth |
| **VoiceHUD** | Calm orb + transcript | + model/telemetry | Tactical stream / advanced diagnostics (optional) |
| **Memory** | "What Luca knows" cards | Categories + approval trail | Raw graph, persistence policies, audit logs |
| **LucaLink** | Connected devices + approve/deny | Sync + permission detail | Full mesh, trust matrix, sync lanes |
| **VisualCore** | Simple Share Screen / Cast | Session controls | Governed sessions, overlay policies, remote command traces |
| **Mobile** | Simplified, mobile-first | Advanced but not dense | Limited companion; full Creator dashboard is desktop-first |

The wordmark already reflects this: Basic shows calm `LUCA OS`; Pro/Creator show
the stylized `L.U.C.A OS` (PR #235 `Header` `tier`).

## Visual defaults by mode

From `getDefaultThemeForExperienceMode` (aligned to the PR #233 design system and
the real `ProductTheme` / `AppearanceMode` / `Accent` / `MotionStyle` types):

| | Theme | Appearance | Accent | Cyber effects | Motion | Density |
| --- | --- | --- | --- | --- | --- | --- |
| **Basic** | Luca Silver (`PROFESSIONAL`) | System | Neutral | off | calm | comfortable |
| **Pro** | Luca Graphite (`MASTER_SYSTEM`) | Dark | Blue | off | calm | standard |
| **Creator** | Luca Graphite (`MASTER_SYSTEM`) | Dark | Violet | available, **off by default** | calm (unless user enables expressive) | dense (controlled) |

`cyberEffectsDefaultOn` is `false` in **every** mode. Only Creator sets
`cyberEffectsAvailable: true`, and even then it stays off until the user opts in.

## Implementation roadmap

1. **Foundation (this PR):** typed model + pure helpers + tests + docs.
2. **Capability scan service:** local, explainable signal collection returning a
   recommendation (`basic` | `pro`) with reasons. No auto-select.
3. **First-run onboarding cards:** Basic/Pro cards consuming
   `getOnboardingSelectableModes()` + recommendation; persist the chosen mode.
4. **Settings switch:** Basic↔Pro toggle; Creator entry gated by
   `canShowCreatorMode`; Basic hides (never deletes) advanced surfaces.
5. **Header wiring:** feed the persisted mode through `toHeaderTier` into the
   `Header` `tier` prop (deferred today — see below).
6. **Dashboard gating:** apply the per-mode tables above to left/center/right and
   secondary surfaces (VoiceHUD, Memory, LucaLink, VisualCore), desktop + mobile.
7. **Creator access wiring:** call `deriveCreatorAccessFromBuild` with build
   config; add repo-root/config detection; design key/profile trust safely.
8. **Visual defaults application:** apply `getDefaultThemeForExperienceMode` when
   a mode is first selected (without overriding later user customization).

See [`basic-pro-creator-migration-plan.md`](./basic-pro-creator-migration-plan.md)
for the phased plan.

## Intentionally deferred

- **Header `tier` wiring.** No persisted Experience-Mode source exists in `App`
  yet, so the `Header` `tier` prop still defaults to `BASIC`. The bridge
  (`toHeaderTier`) exists; wiring lands once mode selection is persisted.
- Full UI gating across surfaces.
- Onboarding flow + capability scan service implementation.
- Settings mode-switch implementation.
- Runtime authority changes; model-router / LucaLink / VisualCore runtime work.
- Security-sensitive Creator key/profile infrastructure.
- `App.tsx` structural changes.

## What this PR is **not** claiming

This is an architecture/foundation pass. The helpers are pure and tested, but
**no end-user behavior changes**. Do not read this as "modes are implemented."
The value is a single, typed, tested source of truth so later PRs (and Codex)
implement selection, gating, the settings switch, and Creator access
consistently.
