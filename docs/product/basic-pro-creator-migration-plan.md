# Basic / Pro / Creator — Migration Plan

> Companion to [`lucaos-experience-modes.md`](./lucaos-experience-modes.md).
> This is the phased plan to move from today's conceptual tiers
> (Normal / Tactical / Origin) and build-layer vocabulary to the official
> **Basic / Pro / Creator** Experience Modes — without a big-bang rewrite.

## Goals

- One typed source of truth for modes (done: [`experienceMode.ts`](../../src/experience/experienceMode.ts)).
- Backwards-compatible mapping from legacy/internal labels.
- Reviewable, incremental PRs; preserve all existing functionality.
- Calm-by-default everywhere; mode controls **density/disclosure**, not loudness.
- The user always makes the final mode choice; Luca only recommends.

## Current state (as of this PR)

- **Build layer** ([`layerBoundary.ts`](../../src/config/layerBoundary.ts),
  [`buildConfig.ts`](../../src/config/buildConfig.ts)) already distinguishes
  `public_standard` / `public_tactical` / `origin` and exposes `IS_ORIGIN`,
  `LUCA_AUDIENCE_TIER`, `LUCA_SURFACE_LAYER`. This is the safe Creator signal.
- **Theme engine** ([`lucaAppearanceTokens.ts`](../../src/config/lucaAppearanceTokens.ts),
  [`lucaThemeLabels.ts`](../../src/config/lucaThemeLabels.ts)) provides
  `ProductTheme`, `AppearanceMode`, `Accent`, `MotionStyle`, and the
  Silver/Graphite/Frost/Cream labels.
- **Header** has a `tier?: "BASIC" | "PRO" | "CREATOR"` prop (PR #235),
  defaulting to `BASIC`; no real tier source feeds it yet.
- **No** persisted Experience-Mode setting, onboarding cards, or gating exist.

## Mapping reference

| Conceptual | Build-layer `LucaAudienceTier` | Experience mode |
| --- | --- | --- |
| Normal | `public_standard` | `basic` |
| Tactical | `public_tactical` | `pro` |
| Origin | `origin` | `creator` |

Use `mapLegacyTierToExperienceMode`, `experienceModeToAudienceTier`, and
`audienceTierToExperienceMode` rather than re-deriving these anywhere.

## Phases

### Phase 0 — Foundation (this PR)
- `LucaExperienceMode` type + ordered list.
- Labels/info, visual defaults, onboarding-selectable set.
- Legacy + audience-tier mappings; Header tier bridges.
- `CreatorAccessState` contract + pure evaluator + build-derived bridge.
- Unit tests for all pure helpers. **No behavior change.**

### Phase 1 — Persisted mode + Header wiring
- Add a persisted `experienceMode` to settings/state (default `basic`).
- Feed it through `toHeaderTier` into `Header tier`.
- Acceptance: switching the stored value flips the wordmark (LUCA OS ↔ L.U.C.A OS)
  with no other visual regressions; default users see `basic`.

### Phase 2 — Local capability scan service
- Local, explainable scan producing `{ recommendation: "basic" | "pro", reasons[] }`.
- Privacy-respecting; permission-gated; never auto-selects.
- Acceptance: scan returns a recommendation + human-readable reasons; unit-tested
  against representative signal fixtures.

### Phase 3 — First-run onboarding cards
- Basic/Pro cards from `getOnboardingSelectableModes()`; show recommendation;
  persist the user's choice. Creator never shown here.
- Acceptance: a fresh install reaches the dashboard in the chosen mode; choosing
  the non-recommended mode is honored.

### Phase 4 — Settings switch
- Settings → Experience → Experience Mode (Basic/Pro).
- Creator row appears only when `canShowCreatorMode` is true.
- Basic **hides** advanced surfaces (no deletion); Pro may re-scan.
- Acceptance: toggling preserves tools/memory/settings; Creator hidden for
  non-eligible contexts.

### Phase 5 — Dashboard gating
- Apply the per-mode surface tables (header/left/center/right + VoiceHUD, Memory,
  LucaLink, VisualCore) on **desktop and mobile**.
- Prefer additive disclosure (show more for Pro/Creator) over destructive hiding.
- Acceptance: each mode matches the documented surface table; no orphaned
  controls; mobile remains thumb-friendly.

### Phase 6 — Creator access wiring
- Populate `CreatorAccessState` from `deriveCreatorAccessFromBuild(...)` using
  build config; add repo-root/creator-config detection.
- Design key/profile trust **safely** (separate, reviewed PR).
- Acceptance: Creator is unreachable in public builds; reachable in source/origin
  builds; `reason` explains the decision.

### Phase 7 — Visual defaults application
- On first mode selection, apply `getDefaultThemeForExperienceMode` (theme,
  appearance, accent, density) without clobbering later user customization.
- Acceptance: Basic→Silver/System/Neutral, Pro→Graphite/Dark/Blue,
  Creator→Graphite/Dark/Violet; cyber effects stay off by default.

## Risks & guardrails

- **Don't force modes.** Recommendation ≠ selection. Always allow override.
- **Hide, never delete.** Switching to Basic must not destroy Pro-installed
  tools, memories, or settings.
- **No new tactical surfaces.** Disclosure increases detail, not noise.
- **Creator safety.** Never ship a normal toggle that grants Creator; gate on
  trusted signals only. Defer key infrastructure until reviewed.
- **Backwards compatibility.** Keep legacy mapping working; migrate stored
  values lazily via `mapLegacyTierToExperienceMode`.

## Definition of done (overall)

LucaOS selects Basic/Pro at first run (with a local recommendation), lets users
switch in Settings, gates dashboard surfaces by mode on desktop and mobile, and
unlocks Creator only in trusted source-authority contexts — all built on the
single typed model introduced in Phase 0.
