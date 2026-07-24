# ADR-0013: Experience modes are Creator / Pro / Basic

## Status

Accepted

## Context

LucaOS has an operating-mode concept — a way to change how much of the system's
density and diagnostic depth a given user sees — and it has been named three
different ways in three different places.

- Early conceptual docs used **Origin / Tactical / Core**.
- The build layer uses a `LucaAudienceTier` enum with the values
  **`origin` / `public_tactical` / `public_standard`**
  (`src/config/layerBoundary.ts`).
- The code-backed source-of-truth document,
  [`docs/product/lucaos-experience-modes.md`](../../docs/product/lucaos-experience-modes.md),
  renames the product-facing modes to **Creator / Pro / Basic** and provides the typed
  model and legacy-mapping helpers (`src/experience/experienceMode.ts`) that bridge the
  older names to the new ones.

Three names for one concept is a silent second source of truth. Worse, the earlier
"Tactical" naming implies a cyber/tactical skin, which the design ethos explicitly
rejects: the modes change **density and disclosure, not loudness**, and cyber effects
are off by default in every mode. A name that promises a tactical aesthetic
mis-describes what the mode actually does.

There is a second, easily-missed point the older Foundation safety and trust chapters
get wrong by omission: they speak of a single, undifferentiated "operator." But the
top mode is not merely a denser dashboard. **Creator** (formerly Origin) is a
**source-authority tier**: it is the mode that gates self-evolution proposals and
LucaLink mesh ownership, and it unlocks only when trusted dev/source-authority signals
are present (`CreatorAccessState`, `evaluateCreatorAccess`). A normal Basic or Pro user
has none of those markers and cannot reach it by a settings toggle. Collapsing Creator
into a generic "operator" loses the authority distinction that governs the system's
most dangerous capabilities.

## Decision

**The canonical operating-mode names are Creator / Pro / Basic**, as defined in
[`docs/product/lucaos-experience-modes.md`](../../docs/product/lucaos-experience-modes.md).

- **Basic** — everyday users. A calm, friendly personal AI; minimal diagnostics; no
  tactical surfaces.
- **Pro** — builders, developers, analysts, power users. Local/cloud/BYOK model
  controls, developer tools, runtime health — still premium and clean.
- **Creator** — LucaOS builders/maintainers. Full diagnostics and governance authority.

These names **supersede** the older conceptual names (Origin → Creator, Tactical →
Pro, Core/Normal → Basic). The build-layer values
`origin` / `public_tactical` / `public_standard` are **not** renamed in code; they
remain the audience-tier enum and are bridged to the product-facing modes by the
documented mapping helpers. The canonical string form of the mode is lowercase:
`"basic" | "pro" | "creator"`.

The decision also **records the source-authority tier**: Creator (the Origin build
layer) is the authority that gates **guarded self-evolution** and **mesh ownership**.
It is not a manual admin override — Luca stays autonomous; Creator proposes-approves-
inspects rather than driving directly — and it is gated on trusted signals, never
selectable by an ordinary user. Foundation safety and trust chapters that today say
"operator" should distinguish this tier where authority actually differs.

## Consequences

### Positive

- **One name per mode.** Contributors, docs, and UI converge on Creator/Pro/Basic;
  the older names become historical, mapped explicitly rather than floating.
- **The name stops promising a skin.** "Pro" does not imply a tactical aesthetic the
  way "Tactical" did. The mode's real axis — density and disclosure, calm by default —
  is what the name now suggests.
- **The authority tier is on the record.** Self-evolution and mesh ownership have a
  named gate (Creator/Origin) rather than hiding inside a generic "operator." Safety
  reasoning can reference the tier that actually holds the authority.
- **Code and product vocabulary are bridged, not fought.** The build layer keeps its
  enum; the mapping helpers absorb the mismatch so the casing/name difference never
  leaks across the codebase.

### Negative

- **A translation layer must be maintained.** Three vocabularies now coexist
  (product-facing Creator/Pro/Basic, conceptual Origin/Tactical/Core, build-layer
  `origin`/`public_tactical`/`public_standard`). The mapping helpers
  (`mapLegacyTierToExperienceMode`, `experienceModeToAudienceTier`) are the bridge and
  are a permanent maintenance surface; if they drift, the ambiguity returns.
- **Legacy references persist.** Existing docs, issues, and screenshots that say
  "Origin" or "Tactical" are not auto-corrected; readers must know the mapping.
- **"Creator" is a broad word.** It could be misread as a content-creation mode rather
  than a source-authority tier. The gating model (`CreatorAccessState`) and this ADR
  are what pin the intended meaning.

## Alternatives considered

- **Keep Origin / Tactical / Core.** Rejected: "Tactical" mis-signals a cyber skin the
  design system rejects, and the source-of-truth product doc has already moved to
  Creator/Pro/Basic with typed, tested helpers. Canon should follow the code-backed
  decision, not predate it.
- **Rename the build-layer enum to match** (`creator`/`pro`/`basic`). Rejected as
  out of scope and needlessly churny: `LucaAudienceTier` is imported widely, the
  mapping helpers already absorb the difference, and renaming shipped enums for
  cosmetic alignment risks regressions for no functional gain. This mirrors the
  [generic-names-with-crosswalk](0014-generic-names-with-crosswalk.md) preference for
  bridging over renaming.
- **Treat all users as one "operator" and drop the tiering.** Rejected: it erases the
  Creator source-authority distinction that gates self-evolution and mesh ownership —
  exactly the authority that must be explicit for
  [Invariant 8](../01-constitution/01-the-eight-invariants.md#invariant-8--security-and-explicit-permissions)
  to hold.
- **Do nothing.** Rejected: three live names for one concept is a standing source of
  confusion the reconciliation exists to remove.

## Related

- [LucaOS Experience Modes — Basic / Pro / Creator](../../docs/product/lucaos-experience-modes.md) — the source-of-truth definition
- [Safety and Permissions](../02-specification/07-safety-and-permissions.md) — where the authority tier belongs
- [Crosswalk](../CROSSWALK.md) — operating-modes row
- [Naming reconciliation map](../RECONCILIATION.md) — section C, operating modes and the source-authority tier
- [Invariant 8 — Security and Explicit Permissions](../01-constitution/01-the-eight-invariants.md#invariant-8--security-and-explicit-permissions)
- [ADR-0014: Generic names bridged by a crosswalk](0014-generic-names-with-crosswalk.md)
