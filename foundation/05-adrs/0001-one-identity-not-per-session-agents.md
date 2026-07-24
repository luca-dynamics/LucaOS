# ADR-0001: One identity, not per-session agents

## Status

Accepted

## Context

LucaOS exists to make computers continuously host **one persistent AI**. The
foundational choice — the one every later decision inherits — is what that AI
_is_: a single continuous identity, or a population of assistants.

The pressure to fracture is constant and it is not malicious. It arrives as
convenience. Conversational-AI systems are usually built session-first: a request
opens a context, that context accumulates state, and the state dies with the
session. Multi-agent frameworks encourage spawning a fresh agent per task, each
with its own memory of what it did. Application platforms give every app its own
assistant, scoped to that app. Each of these is a reasonable local decision. Taken
together they reconstruct exactly the fragmentation LucaOS was built to end: the
user once again manages several assistants and carries context between them by
hand.

The failure is subtle because the fractured system still _works_ turn to turn. A
per-session assistant answers your question. A per-app helper completes its task.
What is lost is the continuous subject: there is no single "Luca" that remembers
across the sessions, that can be reasoned about as a single holder of knowledge
and permission, that is present before and after any one interaction. Once
identity is sharded, [Memory](../GLOSSARY.md) fragments into per-session views,
trust loses its subject ("what does Luca know?" has no answer if there are many
Lucas), and [Presence](../GLOSSARY.md) — which depends on a "before" and an
"after" — collapses back into the application era.

This is the decision the [Manifesto](../00-manifesto/04-the-one-identity-principle.md)
argues and the [Constitution](../01-constitution/01-the-eight-invariants.md#invariant-1--one-luca-identity)
ratifies. This ADR records it as the load-bearing architectural commitment it is,
so that no future contributor treats it as a mere philosophy.

## Decision

**There is exactly one Luca.** All Surfaces, sessions, devices, and models are
embodiments of a single continuous identity. LucaOS does not build a fleet of
agents or per-application assistants.

Concretely, this commits the architecture to the following:

- Identity, [Memory](../02-specification/03-memory-architecture.md), understanding,
  and in-flight intention belong to the one Luca and are shared across every
  embodiment. They do not live in a session, a [Surface](../GLOSSARY.md), or a
  [Provider](../GLOSSARY.md).
- A [Surface](../02-specification/06-surface-layer.md) is a body the one identity
  is present through, not a separate application with its own self. It may hold
  local, ephemeral view state; it may not hold identity or memory.
- Luca may spawn transient **agents** to do work in parallel, but they are workers.
  Their results fold back into the one Luca; they never accrue independent durable
  identity or memory.
- A single logical [Runtime](../02-specification/01-persistent-runtime.md) is the
  authority for live state. Two processes both acting as Luca over the same state
  is a defect, not a scaling strategy (see
  [ADR-0005](0005-ephemeral-ports-and-single-instance.md)).

The test a contributor applies before writing anything: _does this preserve the
single, continuous Luca, or does it create a second one?_

## Consequences

### Positive

- **Coherence.** Memory, trust, and presence have one subject to attach to. "What
  Luca knows" and "what Luca may do" are well-formed questions with single
  answers.
- **The thesis holds.** Cross-surface [Continuity](../GLOSSARY.md) becomes
  possible at all: you can move from phone to desktop mid-task because there is one
  identity to continue, not two to reconcile.
- **A sharp review test.** "Does this reinforce one identity?" is one of the
  [Four Questions](../01-constitution/02-the-four-questions.md) and catches a whole
  class of regressions early.

### Negative

- **It fights the grain of common tooling.** Session-first frameworks and
  multi-agent libraries assume per-worker state. Using them requires deliberately
  folding their outputs back into the one identity, which is extra work every time.
- **Concurrency is harder.** One logical identity over shared state means
  single-writer discipline, single-instance locks, and careful merge of parallel
  agent work — rather than the simpler "spin up another isolated agent" pattern.
- **A permanent reviewer burden.** Singularity is broken by small, reasonable-
  looking changes (a per-conversation cache, a Surface-local store). Preserving it
  is a discipline practiced in every PR, not a feature shipped once.
- **Some parallelism is deferred.** Where a fleet-of-agents design would trivially
  scale out, LucaOS must instead spawn transient workers and reconcile them, a
  more constrained model. The [Roadmap](../06-roadmap/README.md) tracks how
  parallel agent work matures within this constraint.

## Alternatives considered

- **A fleet of coordinating agents.** A population of specialist agents, each with
  its own memory, coordinated by a supervisor. Rejected: it is the fragmentation
  the thesis exists to end. There is no single subject of memory or permission, so
  Presence and trust have nothing to attach to. LucaOS keeps the useful part —
  spawning transient workers — while denying them durable independent identity.
- **Per-application assistants.** An assistant scoped to each app or surface, the
  prevailing industry pattern. Rejected: it rebuilds the application era with AI
  wrappers. The user again juggles assistants and moves context by hand; LucaOS's
  entire premise is that applications are tools, not destinations, and there is one
  AI above them.
- **Per-session identity with a shared store.** One assistant per session, sharing
  a database. Rejected as insufficient: a shared store is necessary but not
  sufficient. If each session forms its own beliefs, permissions, and "current
  context" that never fully merge back, there are still many Lucas that happen to
  read the same rows. Identity must be single at the logical level, not merely
  backed by one database.
- **Do nothing / leave it implicit.** Rejected: an unstated principle is one an
  agent optimizes away for convenience. Making it Invariant 1 and recording it here
  gives every contributor an explicit, non-negotiable constraint.

## Related

- [Invariant 1 — One Luca Identity](../01-constitution/01-the-eight-invariants.md#invariant-1--one-luca-identity)
- [The One Identity Principle](../00-manifesto/04-the-one-identity-principle.md)
- [Identity and Embodiment](../02-specification/02-identity-and-embodiment.md)
- [ADR-0002: Memory belongs to Luca](0002-memory-belongs-to-luca.md)
- [ADR-0005: Ephemeral ports and a single-instance lock](0005-ephemeral-ports-and-single-instance.md)
