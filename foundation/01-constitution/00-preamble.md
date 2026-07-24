# Preamble

This document is the Constitution of LucaOS. It exists to keep a system built by
many hands — human and AI, across time — coherent with the single vision set out
in the [Manifesto](../00-manifesto/README.md).

## Why a constitution

Most software does not need a constitution. LucaOS does, for two reasons.

First, **the thesis is fragile under ordinary engineering pressure.** As
[The One Identity Principle](../00-manifesto/04-the-one-identity-principle.md)
explains, nearly every convenient shortcut — per-session caches, surface-local
state, provider-tied identity — quietly fractures the one thing LucaOS must
protect. Without an explicit, cited set of invariants, the system drifts back
toward the application-era fragmentation it was built to end. Not through any
single bad decision, but through a thousand reasonable ones.

Second, **much of LucaOS is written by AI agents.** That is deliberate and
productive, but it raises the stakes on shared understanding. An agent does not
absorb a team's culture by osmosis over months; it reads what is written and acts.
The Constitution is the written culture — the thing an agent can load and be bound
by. [CLAUDE.md](../CLAUDE.md) points every agent here.

## What the Constitution governs

The Constitution binds all LucaOS work: code, design, and documentation, in every
repository, by every contributor. It has authority over default engineering
practice and over any individual PR. It does **not** govern:

- **Implementation detail** that is free to change without touching an invariant.
  How the [Router](../02-specification/04-provider-abstraction.md) scores
  candidates is implementation; that model choice must be invisible above the
  provider layer is constitutional.
- **The Manifesto**, which sits above it. If the Constitution and the Manifesto
  ever conflict, the Manifesto wins and the Constitution is amended to agree.

## The status of an Invariant

An [Invariant](01-the-eight-invariants.md) is a property that must _always_ hold.
This has a precise consequence for how you work:

> You may not trade away an Invariant in a pull request, no matter how good the
> local reason. If your change requires breaking one, you do not have a hard
> decision to make — you have an [RFC](../04-rfcs/README.md) to write and an
> [amendment](03-governance-and-amendments.md) to propose.

This is stricter than ordinary "best practice," and intentionally so. Best
practices bend under deadlines. Invariants are the small set of things that must
not bend, because bending them dissolves the product.

## The relationship to reality

The Constitution describes what must always be true of the **canonical LucaOS**.
The current implementation may not yet satisfy every invariant everywhere; the
[README's honesty clause](../README.md#status-and-versioning) commits us to naming
those gaps rather than hiding them. A known, documented gap between the
implementation and an invariant is not a violation of the Constitution — it is the
Constitution doing its job, marking where work remains. A _silent_ gap, or a
change that widens a gap without saying so, is the violation.

## Interpretation

When applying the Constitution to a concrete decision:

1. Start with the [Invariants](01-the-eight-invariants.md). If the change would
   break one, stop.
2. Apply the [Four Questions](02-the-four-questions.md). They are the practical
   compass.
3. When still unclear, navigate by the
   [North Star](../00-manifesto/05-north-star.md).
4. When a genuine gap in the Constitution is found, that itself is worth an
   [RFC](../04-rfcs/README.md) — the Constitution is meant to grow more precise
   over time, through governance, not through unrecorded reinterpretation.

## See also

- [The Eight Invariants](01-the-eight-invariants.md)
- [Governance and Amendments](03-governance-and-amendments.md)
- [The Manifesto](../00-manifesto/README.md)
