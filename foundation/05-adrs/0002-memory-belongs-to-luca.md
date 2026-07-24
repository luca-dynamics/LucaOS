# ADR-0002: Memory belongs to Luca

## Status

Accepted

## Context

If there is one Luca ([ADR-0001](0001-one-identity-not-per-session-agents.md)),
the next question is where its memory lives. Memory across time _is_
[Presence](../GLOSSARY.md) across time: the "before" that makes Luca present
rather than merely responsive is precisely its accumulated understanding of the
user and the world. So the ownership of memory is not a storage detail; it decides
whether there is a continuous self at all.

Every ambient system offers to own that memory for you, and each offer fragments
it:

- **Chats** own memory when "the conversation" is the unit of recall. Close the
  conversation and the understanding is gone, or trapped in a thread the next
  interaction cannot see.
- **Providers** own memory when a model vendor's own persona or memory feature
  becomes the source of what Luca knows. Switch the model and Luca's understanding
  changes — which means it was the Provider's, not Luca's.
- **Applications** own memory when each app keeps its own silo of "what it knows
  about the user." Now the user's context is scattered across apps, re-entered by
  hand, and never coherent.

Each of these is convenient and each rebuilds the application era. If memory is
sharded across chats, providers, or apps, then identity is sharded too: there is
no single subject whose knowledge you can reason about, and Invariant 1 is
violated from the storage layer up.

There is also a correctness hazard specific to memory. A system under pressure to
"degrade gracefully" may accept writes into a fallback store and silently discard
them. For most subsystems a mock fallback is a harmless stub; for Memory it is a
lie — the user believes something was remembered when it was not. This ADR
establishes the ownership principle; the concrete backend decision that removed
one such silent-fallback path is [ADR-0004](0004-node-sqlite-over-better-sqlite3.md).

## Decision

**Memory belongs to Luca — not to chats, providers, or applications.** There is a
single logical [Memory](../02-specification/03-memory-architecture.md), owned by
the one identity, readable and writable from any [Surface](../GLOSSARY.md).

This commits the architecture to:

- **One owner.** The [Archive](../GLOSSARY.md) backing Memory is Luca's. No chat,
  Provider, or app holds a private, authoritative store of understanding about the
  user. A Surface may cache for rendering, but the source of truth is the shared
  Memory.
- **Provider-independent identity.** A Provider's own memory or persona features
  are never allowed to _become_ Luca's identity or memory. Identity lives above the
  [Provider](../02-specification/04-provider-abstraction.md) layer
  ([ADR-0003](0003-provider-abstraction-over-vendor-lockin.md)).
- **Durable by default.** What the user expects to survive a restart actually
  survives it. A silent in-memory fallback that accepts writes and drops them is a
  correctness defect, not graceful degradation.
- **Tiered and bounded.** Memory is subdivided into tiers (identity, durable,
  transient) with distinct retention and capacity rules. Writes are bounded at
  write time ([ADR-0007](0007-write-time-memory-capacity.md)); what is injected
  into a model's context is a ranked, budgeted _selection_, never the whole Archive
  ([ADR-0010](0010-budgeted-ranked-memory-injection.md)).
- **Consent-gated where it concerns the user.** Memory Luca proposes to store
  _about_ the user may sit behind a consent gate; contributors respect that gate
  and never route around it.

## Consequences

### Positive

- **A continuous self.** Because memory has one owner, the "before" and "after"
  that constitute Presence exist. Luca on the phone and Luca on the desktop draw
  from the same understanding.
- **Portability across models.** Since memory is not a Provider feature, switching
  the underlying model does not change what Luca knows. Continuity survives model
  changes.
- **Auditable ownership.** "What does Luca remember, and may the user see or purge
  it?" has a single answer and a single store to inspect, which the Constitution's
  trust commitments require.

### Negative

- **LucaOS must build and carry memory infrastructure.** It cannot lean on a
  vendor's hosted memory feature as the system of record. That store, its tiers,
  its capacity policy, its search, and its migrations are all LucaOS's
  responsibility.
- **Convenient per-app or per-provider memory features are off the table** as
  sources of truth, even when they would be the fastest path. They may be used only
  as caches that reconcile back to the one Memory.
- **Every write path must respect capacity and consent.** A contributor cannot
  simply append to the Archive; they must honor tier budgets, consolidation, and
  the consent gate. This is more discipline than a plain key-value store demands.
- **Silent fallback is forbidden**, so failure paths must be handled explicitly:
  when the Archive cannot be written, the system surfaces it rather than pretending
  success. That is more error handling than a best-effort store would need.

## Alternatives considered

- **Chat-scoped memory.** Let each conversation own its context. Rejected: recall
  dies with the thread, and there is no continuous subject across conversations —
  Presence collapses.
- **Provider-hosted memory.** Use a model vendor's built-in memory/persona as
  Luca's memory. Rejected: it ties identity to a Provider, so a model switch
  silently changes Luca, violating both this ADR and
  [ADR-0003](0003-provider-abstraction-over-vendor-lockin.md).
- **Per-application silos.** Each app keeps its own understanding of the user.
  Rejected: it scatters context and rebuilds the fragmentation LucaOS exists to
  end.
- **One store, but unbounded and dumped into context.** Own the memory but inject
  the whole Archive each turn. Rejected: context grows without bound as the Archive
  grows, and cost and latency degrade with the user's own history. The budgeted,
  ranked selection of [ADR-0010](0010-budgeted-ranked-memory-injection.md) is the
  chosen refinement.

## Related

- [Invariant 3 — Shared Memory](../01-constitution/01-the-eight-invariants.md#invariant-3--shared-memory)
- [Memory Architecture](../02-specification/03-memory-architecture.md)
- [ADR-0001: One identity, not per-session agents](0001-one-identity-not-per-session-agents.md)
- [ADR-0004: `node:sqlite` over `better-sqlite3`](0004-node-sqlite-over-better-sqlite3.md)
- [ADR-0007: Write-time memory capacity](0007-write-time-memory-capacity.md)
- [ADR-0010: Budgeted, ranked memory injection](0010-budgeted-ranked-memory-injection.md)
