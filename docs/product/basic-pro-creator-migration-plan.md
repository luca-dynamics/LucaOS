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

## Current state (after Phase 1 implementation)

- **Build layer** ([`layerBoundary.ts`](../../src/config/layerBoundary.ts),
  [`buildConfig.ts`](../../src/config/buildConfig.ts)) already distinguishes
  `public_standard` / `public_tactical` / `origin` and exposes `IS_ORIGIN`,
  `LUCA_AUDIENCE_TIER`, `LUCA_SURFACE_LAYER`. This is the safe Creator signal.
- **Theme engine** ([`lucaAppearanceTokens.ts`](../../src/config/lucaAppearanceTokens.ts),
  [`lucaThemeLabels.ts`](../../src/config/lucaThemeLabels.ts)) provides
  `ProductTheme`, `AppearanceMode`, `Accent`, `MotionStyle`, and the
  Silver/Graphite/Frost/Cream labels.
- **Settings persistence** stores canonical `general.experienceMode` in the existing
  `LUCA_SETTINGS_V1` record. It defaults to `basic`, migrates recognized legacy
  mode/tier labels through `mapLegacyTierToExperienceMode`, and rejects stored
  Creator mode when the current build is not eligible.
- **Header** receives `tier={toHeaderTier(experienceMode)}` from the dashboard, so
  Basic uses the calm `LUCA OS` wordmark while Pro/Creator use `L.U.C.A OS`.
- **Settings → General** includes a compact, card-based Experience Mode selector
  with descriptions, a current-mode label, and an accessible selected state.
  Basic and Pro are always listed; Creator is listed only when build-derived
  Creator access is eligible. The selection follows the existing Settings
  **Save Changes** flow.
- An intentional mode change also maps the mode's Silver/Graphite default to the
  existing `general.theme` field. It does not run during startup or migration and
  does not touch background opacity/blur, tools, memories, model configuration,
  installed capabilities, or other settings.
- **No** onboarding cards, capability scan, full dashboard gating, or Creator
  key/profile infrastructure exist yet.

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

### Phase 1 — Persisted mode + Header wiring — Implemented
- `general.experienceMode` is persisted in `LUCA_SETTINGS_V1` (default `basic`).
- Recognized legacy values are canonicalized during settings load.
- Dashboard state follows settings changes and feeds `toHeaderTier(experienceMode)`
  into `Header tier`.
- Switching Basic/Pro through Settings and saving flips the wordmark
  (`LUCA OS` ↔ `L.U.C.A OS`) without applying broader dashboard gating.

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

### Phase 4 — Settings switch — Partially implemented
- Settings → General exposes a polished, compact Experience Mode selector with
  Basic/Pro descriptions, an explicit current selection, and keyboard-safe native
  buttons.
- Creator appears only when build-derived access makes
  `canShowCreatorMode(...)` true.
- The existing Settings save flow persists the selection without deleting or
  mutating tools, memory, capabilities, model configuration, or user data.
- The selector notes that appearance remains customizable after switching.
- Deferred: Basic dashboard hiding, Pro re-scan behavior, and the final dedicated
  Experience settings information architecture.

### Phase 5 — Dashboard gating
- Apply the per-mode surface tables (header/left/center/right + VoiceHUD, Memory,
  LucaLink, VisualCore) on **desktop and mobile**.
- Prefer additive disclosure (show more for Pro/Creator) over destructive hiding.
- Acceptance: each mode matches the documented surface table; no orphaned
  controls; mobile remains thumb-friendly.

### Phase 6 — Creator access wiring — Build signal partially implemented
- `CreatorAccessState` is derived from `LUCA_AUDIENCE_TIER` and
  `LUCA_SURFACE_LAYER`; public builds keep Creator hidden and origin builds may
  expose it.
- Deferred: repo-root/creator-config detection and trusted creator key/profile
  infrastructure, which require separate security review.
- Acceptance: Creator is unreachable in public builds; reachable in source/origin
  builds; `reason` explains the decision.

### Phase 7 — Visual defaults application — Partially implemented
- Only an intentional change to a different mode in Settings applies visual
  defaults. Startup, settings load, and legacy migration never reset appearance.
- The current settings schema safely supports the canonical product-theme mapping:
  Basic applies Luca Silver (`PROFESSIONAL`), while Pro and Creator apply Luca
  Graphite (`MASTER_SYSTEM`). The update uses the existing Settings save flow.
- Existing background opacity/blur and all unrelated settings remain untouched.
  Because there is no dedicated appearance-customization tracking flag, the
  canonical theme changes only on the explicit mode click; selecting the already
  active mode is a no-op. Richer per-field customization preservation is deferred.
- Deferred until those preferences have schema-owned fields: explicit persisted
  appearance mode (System/Dark), accent (Neutral/Blue/Violet), motion style,
  density, and cyber-effect availability/default state. The typed defaults remain
  available through `getDefaultThemeForExperienceMode`; cyber effects remain off.
- Final acceptance remains Basic→Silver/System/Neutral, Pro→Graphite/Dark/Blue,
  Creator→Graphite/Dark/Violet, without clobbering later customization.

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
