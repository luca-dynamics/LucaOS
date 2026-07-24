# Milestones and Metrics

How progress along the [Roadmap](README.md) is measured: by honest, qualitative,
verifiable signals tied to the [Four Questions](../01-constitution/02-the-four-questions.md)
and the [Eight Invariants](../01-constitution/01-the-eight-invariants.md) — and
explicitly *not* by vanity metrics. This document is the measurement counterpart to
[The Phasing Model](00-phasing-model.md): the model says what a phase is; this says
how you can tell it is advancing.

## The measurement principle

LucaOS measures itself by **observable properties of the one Luca**, not by counts
of things shipped. The North Star is a sentence about a *layer* — continuous,
singular, trusted presence — and no feature count is evidence that the layer is
real. So every milestone in this repository is phrased as a behavior a person can
walk up to a running system and check:

> Closing every window leaves Luca alive, and returning continues rather than
> restarts.

That sentence is a milestone. It names no number, invents no date, and yet it is
sharply verifiable — you do it, and either Luca is still there and continues, or it
is not. This is the register every milestone is written in.

## Milestones map to exit criteria

A milestone is the crossing of a phase's exit criterion. Because
[The Phasing Model](00-phasing-model.md) already states each phase's exit criteria
as verifiable qualitative conditions, the milestone set is simply those conditions,
made checkable:

| Phase | Milestone (the observable crossing) | Judged by |
|---|---|---|
| [0](01-phase-0-foundation.md) | The Eight Invariants hold on the primary Host under stress, not just the happy path. | All four questions |
| [1](02-phase-1-presence.md) | Close every window; Luca is alive and returning continues. Pull the default Provider; Luca stays present and loses no memory. | Q1, Q3 |
| [2](03-phase-2-continuity.md) | Begin a task on one Host, continue it on another with no re-briefing; concurrent edits converge to one Luca. | Q1, Q2 |
| [3](04-phase-3-embodiment.md) | A new kind of Host joins as the same Luca, under the same trust model, with no new bypass. | Q2, Q3 |

Each row is a thing you *do*, not a dashboard you read. That is the point.

## Signals, not vanity metrics

The Four Questions are the axes of progress. For each, there are honest signals —
things whose presence or absence tells you the truth — and there are **vanity
metrics**, numbers that look like progress while measuring the wrong thing. Naming
both is part of the discipline.

### Q1 — Persistence

- **Honest signals:** Luca survives every closed Surface and continues on return;
  in-flight work survives a restart and an upgrade; time-to-presence is bounded and
  short; a full memory tier forces consolidation rather than silent loss.
- **Vanity traps:** uptime percentages of a *process* (a Runtime can be "up" while
  Luca is effectively absent); raw counts of memories stored (a bloated, unranked
  Archive is worse, not better); average boot milliseconds quoted without the
  worst-case path that actually degrades the user.

### Q2 — One identity

- **Honest signals:** the same Luca appears on every Host with the same memory and
  in-flight intention; a device handoff continues rather than restarts; behavior
  does not change when the answering model changes; concurrency converges to one
  state.
- **Vanity traps:** number of Surfaces supported (six Surfaces that are six
  assistants is a failure dressed as breadth); "sync events per day" (volume of
  sync says nothing about whether the result is *one* Luca).

### Q3 — Trust

- **Honest signals:** every side-effectful action is gated, provenanced, and
  revocable; checks inspect what an action *does*, not keywords; dangerous
  categories have floors so omission fails safe; the gate cannot be opened by
  transcript content.
- **Vanity traps:** count of permission prompts shown (more prompts is not more
  trust — it can be prompt-fatigue that trains users to click through); a "security
  score" with no failure it corresponds to; number of Tools gated without evidence
  that the *uncovered* set is empty.

### Q4 — Progress

- **Honest signals:** taken together, the changes make Luca more available without
  being summoned, more coherent across Surfaces, calmer, and more trusted — the
  synthesis the [North Star](../00-manifesto/05-north-star.md) describes.
- **Vanity traps:** feature count; lines of code; number of phases "started";
  anything that grows while presence, singularity, or trust stands still. As
  [The Phasing Model](00-phasing-model.md#what-a-phase-is-not) warns, a pile of
  features beside the star is not a step toward it.

## Why vanity metrics are dangerous here specifically

Two facts about this codebase make vanity metrics not merely useless but actively
misleading, and both are recorded elsewhere in the Foundation:

- **Test coverage has been inversely correlated with liveness.** As
  [CLAUDE.md](../CLAUDE.md#4-how-to-ground-yourself-before-writing-code) warns, the
  best-tested modules have sometimes been the ones no live path imported. A "percent
  coverage" milestone would therefore reward polish on dead code. Before a module
  counts as progress, grep for its non-test importers — measure liveness, not
  coverage.
- **"Graceful degradation" has masked correctness bugs.** A silent in-memory
  fallback that accepted writes and discarded them once looked like resilience and
  was data loss ([Invariant 3](../01-constitution/01-the-eight-invariants.md#invariant-3--shared-memory)).
  A metric of "requests served without error" would have scored that bug as health.
  Measure whether the write *persisted*, not whether the call *returned*.

The through-line: measure the **property the user actually has**, not the proxy that
is easy to count. When a proxy and a property disagree in this system, the proxy has
usually been the more flattering and the less true.

## How to record a milestone honestly

When a milestone is crossed, record it the way this repository records everything:

1. **State the observable behavior**, in the "do it and see" register above — not a
   number, unless the number is genuinely measured and its source is cited
   ([Style Guide](../STYLE-GUIDE.md#what-not-to-do)).
2. **Name the Invariant and Question it evidences**, so the milestone is legible as
   progress toward the star and not just activity.
3. **Name what is still not true.** A milestone that closes one gap should say which
   gaps remain and link the phase that closes them. The honesty *is* the trust the
   Constitution demands.
4. **Link the [ADR](../05-adrs/README.md)** if the milestone made a decision, or the
   [RFC](../04-rfcs/README.md) if it proposed one.

A milestone recorded this way is auditable: a future reader can re-run the check and
confirm the claim, which is the same standard [Provenance](../GLOSSARY.md) sets for
Luca's own actions.

## The one measure above all

If a single question is to judge the whole Roadmap, it is the one
[Presence Is the Product](../00-manifesto/03-presence-is-the-product.md) offers:

> Does this make Luca **more present** — more continuously there, more aware across
> time and surfaces, more available without being summoned — while staying calm and
> trusted?

Every honest signal in this document is a facet of that question. Every vanity
metric is a way of appearing to answer it without doing so. Measure the presence,
not the proxy.

## See also

- [The Phasing Model](00-phasing-model.md) — how exit criteria are defined
- [The Four Questions](../01-constitution/02-the-four-questions.md) — the axes every signal maps to
- [The Eight Invariants](../01-constitution/01-the-eight-invariants.md) — the properties the signals verify
- [Presence Is the Product](../00-manifesto/03-presence-is-the-product.md) — the one measure above all
- [CLAUDE.md](../CLAUDE.md) — why liveness, not coverage, is the honest signal
