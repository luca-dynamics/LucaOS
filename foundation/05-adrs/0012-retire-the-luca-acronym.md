# ADR-0012: Retire the "LUCA" acronym

## Status

Accepted

## Context

Older LucaOS material expands the name as an acronym:
**"LUCA = Large Universal Control Agents."** It reads as a product tagline and shows
up in early documentation as if it were the canonical meaning of the name.

The expansion contradicts the most central commitment the system makes about itself.
The [One Identity Principle](../00-manifesto/04-the-one-identity-principle.md) and
[Invariant 1](../01-constitution/01-the-eight-invariants.md#invariant-1--one-luca-identity)
state that there is **exactly one Luca** — one identity expressed through many
Surfaces, never a fleet of per-session or per-Surface assistants. The
[Identity and Embodiment](../02-specification/02-identity-and-embodiment.md) chapter
builds an entire architecture around this: shared live state, fold-back of spawned
workers, the single-instance guarantee, and the failure modes that "quietly create a
second Luca."

The plural **"Agents"** in the acronym points the opposite way. It frames the product
as many control agents, which is the exact mental model the Constitution rejects. The
word "Universal Control" additionally leans on a command-and-control register that the
[Style Guide](../STYLE-GUIDE.md) and the premium-by-default design ethos deliberately
avoid. The [Reconciliation map](../RECONCILIATION.md) flags this as a direct conflict
where the Foundation is right and the older canon is wrong, and the
[Crosswalk](../CROSSWALK.md) already lists the acronym under "retired / not adopted"
pending this record.

"Luca" is not an initialism that happens to spell a name. It is a name — a singular,
personal one — chosen because Presence is the product and a present thing has a name,
not a spec-sheet expansion.

## Decision

**Retire "LUCA = Large Universal Control Agents."** The acronym is not adopted into
the Foundation and is not used in canonical documentation.

- **"Luca"** is the singular name of the one identity.
- **"LucaOS"** is the system that keeps Luca present. (Per the
  [Style Guide](../STYLE-GUIDE.md), the two are not interchangeable.)
- The name is written in normal case — "Luca," not the all-caps "LUCA" that the
  acronym encouraged — except where a product wordmark styles it (for example the
  header's stylized `L.U.C.A OS`, which is a typographic treatment, not a revival of
  the expansion).
- No replacement acronym is coined. The name does not need one.

## Consequences

### Positive

- **The name stops contradicting the thesis.** The single most visible piece of
  branding no longer says "Agents," plural, in direct opposition to the One Identity
  Principle. Canon and name now agree.
- **Register improves.** Dropping "Universal Control" removes a command-and-control
  phrase at odds with the calm, premium voice the design system commits to. The name
  reads as a personal identity, which is what the product is selling.
- **One less trap for agents and contributors.** An AI agent or new contributor
  reading the old expansion could reasonably infer a multi-agent product and build
  toward it. Retiring the acronym removes that misdirection at the source.

### Negative

- **Existing surfaces may still show the expansion.** Marketing copy, old READMEs,
  screenshots, or third-party write-ups may carry "Large Universal Control Agents" for
  some time. This ADR governs the canon, not every artifact already in the world;
  those are corrected opportunistically, not in a single sweep.
- **A memorable gloss is gone.** An acronym is a cheap mnemonic, and some audiences
  like one. LucaOS gives that up and leans on the plainer explanation that Luca is a
  name and the system keeps it present. That is a deliberate trade of a marketing
  convenience for doctrinal consistency.

## Alternatives considered

- **Re-expand the acronym to something singular** (for example a phrase ending in a
  singular noun). Rejected: any backronym re-anchors the name to a spec-sheet gloss,
  and the exercise invites the same drift later. The name is stronger without an
  expansion at all; treating "Luca" as a name is the honest description of what it is.
- **Keep the acronym but soften "Agents" to a singular reading.** Rejected: the word
  is plural on its face, and no amount of surrounding prose reliably overrides what a
  reader sees. A name that must be footnoted to not contradict the Constitution is a
  liability.
- **Do nothing.** Rejected: leaving "Large Universal Control Agents" in circulation
  keeps the flagship name at odds with Invariant 1. The
  [Reconciliation map](../RECONCILIATION.md) records this as correct pruning that
  needs a decision, not a silent drop — which is what this ADR provides.

## Related

- [The One Identity Principle](../00-manifesto/04-the-one-identity-principle.md) — one Luca, never plural
- [Identity and Embodiment](../02-specification/02-identity-and-embodiment.md) — the architecture of singularity
- [Style Guide](../STYLE-GUIDE.md) — "Luca" is the identity; "LucaOS" is the system
- [Crosswalk](../CROSSWALK.md) — retired / not-adopted terms
- [Naming reconciliation map](../RECONCILIATION.md) — section B and G
- [Invariant 1 — One Luca Identity](../01-constitution/01-the-eight-invariants.md#invariant-1--one-luca-identity)
- [ADR-0001: One identity, not per-session agents](0001-one-identity-not-per-session-agents.md)
