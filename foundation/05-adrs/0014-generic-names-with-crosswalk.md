# ADR-0014: The Foundation keeps generic names and bridges to native names with a crosswalk

## Status

Accepted

## Context

The `foundation/` canon was written as a clean-room re-derivation of the LucaOS
thesis. It uses **generic, code-portable vocabulary** as its primary terms —
Runtime, Router, Memory, the permission gate, Surface, Provider — chosen so that the
architecture reads as a general design and not as a tour of one product's proper
nouns.

LucaOS's product, UI, and source code use **native names** for the same subsystems:
Luca Guard (the permission gate), Mission Engine and Mission Tape (mission
orchestration and its audit record), Memory Vault (Memory's human-readable face),
LucaLink (continuity and sync), Skills Runtime (the capability/tool layer), Model
Router, the Embodiment Layer (actuation), Evolution Core. These are not dead docs —
they correspond to live code (`src/services/lucaGuard/`, `missionEngine/`,
`missionTape/`, `memory/MemoryVaultService.ts`, and so on).

The [Reconciliation map](../RECONCILIATION.md) found that the Foundation, written
without reconciling against the established docs and code, had **dropped the native
vocabulary** — and identified that as the core error of the first pass. Two ways to
fix it were on the table. One: rename every Foundation chapter to the native names,
making the docs mirror the code's proper nouns. Two: keep the generic terms as the
Foundation's primary vocabulary and build a single bridge document mapping each
generic term to its native name and code path.

The forces at play: the generic terms make the doctrine portable and keep it from
reading as vendor-specific, which has real pedagogical value; but the code uses the
native names, contributors touching code must use them, and a reader moving between
the Foundation, the older `docs/`, and the source needs to translate reliably. A
mapping that lives only in people's heads is exactly the kind of silent second source
of truth this reconciliation exists to remove.

## Decision

**The Foundation keeps its generic, code-portable terms as the primary vocabulary and
bridges to the native subsystem names through a single [Crosswalk](../CROSSWALK.md),
rather than renaming chapters.**

The naming policy is:

- Foundation prose uses the **generic term** as primary.
- On first substantive use of a subsystem in a chapter, it links to the
  [Crosswalk](../CROSSWALK.md) so the native/code name is one hop away.
- When you touch a subsystem **in code**, you use the **native name the code already
  uses**. You do not rename code to match the generic docs.
- A new load-bearing term is added to the [Glossary](../GLOSSARY.md) and, if it maps
  to a native name, to the [Crosswalk](../CROSSWALK.md) **in the same change**. This
  obligation is the price of the policy: the crosswalk is only safe if it is kept
  current, so keeping it current is mandatory, not optional.

## Consequences

### Positive

- **Portability.** The doctrine reads as a general architecture, not a product
  glossary, so the reasoning survives renames of individual subsystems and is legible
  to readers who do not know the native names yet.
- **Lower churn.** No mass rename of chapters, headings, cross-links, and anchors —
  which would be a large, error-prone diff that breaks inbound links for cosmetic
  gain. The existing Foundation stands; only the bridge is added.
- **Code is left alone.** The policy explicitly forbids renaming code to match the
  docs. The native names in the source — which are load-bearing and widely imported —
  do not move, so no functional risk is taken on for a documentation concern.
- **One place to translate.** A contributor reading any of the three corpora
  (Foundation, older `docs/`, source) has a single table to move between them, rather
  than reconstructing the mapping each time.

### Negative

- **A second thing to keep in sync.** The crosswalk is now a maintenance obligation.
  Every new subsystem term must be added in the same change that introduces it; if
  that discipline lapses, the crosswalk goes stale and becomes a _wrong_ map, which is
  worse than none. This ADR makes the obligation explicit precisely because it is the
  policy's main risk.
- **A layer of indirection for readers.** Someone who knows only the native name
  (because they came from the code) must consult the crosswalk to find the generic
  chapter, and vice versa. The bridge is one hop, but it is a hop.
- **Two vocabularies coexist indefinitely.** The system does not converge on a single
  set of names; it commits to maintaining a translation between two. That is a
  deliberate, permanent cost accepted in exchange for portability and low churn.

## Alternatives considered

- **Rename every Foundation chapter to the native names.** Rejected: it is a large,
  churny diff that breaks inbound links and anchors, it couples the doctrine tightly
  to one product's proper nouns (losing portability), and it still would not remove
  the need to reconcile with the older `docs/` — it would just move the seam. The
  churn is real and the benefit is mostly cosmetic.
- **Rename the code to the generic terms.** Rejected outright: the native names are
  live in code and UI and widely imported; renaming shipped subsystems to match docs
  inverts the correct dependency (docs track code) and takes on functional risk for a
  documentation goal.
- **Keep the terms diverged with no bridge.** Rejected: that is the state the
  reconciliation found and named as the core error — a reader could not move between
  the three corpora reliably. A bridge is the minimum needed to make divergence safe.
- **Do nothing / leave it implicit.** Rejected: an unwritten mapping is a silent
  second source of truth. Writing it down and mandating its upkeep is the whole point.

## Related

- [Crosswalk](../CROSSWALK.md) — the bridge this ADR institutionalizes
- [Glossary](../GLOSSARY.md) — where new load-bearing terms are defined
- [Style Guide](../STYLE-GUIDE.md) — terminology and cross-reference rules
- [Naming reconciliation map](../RECONCILIATION.md) — the chosen approach and its rationale
- [ADR-0011: Cortex is the local-intelligence sidecar](0011-cortex-is-the-local-intelligence-sidecar.md)
- [ADR-0013: Experience modes are Creator / Pro / Basic](0013-experience-modes-creator-pro-basic.md)
