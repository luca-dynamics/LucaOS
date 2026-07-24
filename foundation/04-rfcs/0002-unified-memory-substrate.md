# RFC-0002 — Unified Memory Substrate

This RFC proposes that Luca own exactly one Memory substrate — a tiered, Luca-owned
store rather than memory scattered across apps and providers — and specifies how it
is written, ranked, and injected. It is the foundational argument for
[Invariant 3](../01-constitution/01-the-eight-invariants.md#invariant-3--shared-memory).

---

- **Number:** 0002
- **Title:** Unified Memory Substrate
- **Status:** Accepted
- **Authors:** LucaOS Foundation
- **Date:** 2026-07-24
- **Supersedes / Superseded by:** none
- **Resulting ADR(s):** node:sqlite migration, write-time memory capacity, budgeted ranked injection (see [`05-adrs/`](../05-adrs/README.md))

## Summary

Memory belongs to Luca — not to a chat, a [Provider](../GLOSSARY.md), or an app. This
RFC proposes a single Luca-owned [Memory](../02-specification/03-memory-architecture.md)
substrate: tiers (identity, durable, transient) with distinct retention and capacity
rules; an [Archive](../GLOSSARY.md) backed by the runtime built-in `node:sqlite` with
FTS5 full-text search and an entities/relationships knowledge graph; capacity enforced
**at write time** rather than only truncated at read time; injection into a model's
context as a **budgeted, ranked selection** rather than a dump of the whole store; and
agent-proposed memories about the user gated behind consent. It is argued against the
alternative that most systems ship — per-app or per-provider memory silos — which
fragment the one Luca back into the application era.

## Motivation

[Presence across time is memory across time](../00-manifesto/03-presence-is-the-product.md).
The reason Luca can be _there_ before you ask — knowing who you are, what you were
doing, what is pending — is that a single continuous store holds that understanding
and every Surface reads from it. Take memory away from Luca and give it to the chat,
the provider, or the app, and there is no continuous self to be present: each
conversation starts from zero, each provider remembers a different you, each app
keeps its own fragment, and "one Luca" becomes a label over a crowd.

There are three concrete pressures the current implementation has already felt:

1. **Silent write loss.** Memory that accepts a write and discards it is the worst
   kind of failure, because it looks like it worked. LucaOS hit exactly this: a native
   SQLite binding built for one ABI ran against a different one, the database silently
   fell back to a mock store, and writes vanished. A memory substrate must make this
   class of bug structurally impossible, not merely unlikely.
2. **Unbounded growth.** If context injection dumps the whole Archive, the prompt
   grows without bound as Luca remembers more — cost and latency rise, and eventually
   the most relevant memory is crowded out by the least. Memory has to be _selected_,
   not poured.
3. **Silo temptation.** Every provider now ships a "memory" feature, and every app
   wants to keep its own context "just for itself." Each is a small, reasonable-looking
   decision that fractures the one Luca. The substrate has to be the obvious place for
   understanding to live, so the silo is never the path of least resistance.

## Guide-level explanation

Picture Memory as Luca's single accumulating understanding, organized into tiers by
how durable and how central each thing is.

```mermaid
flowchart TB
  subgraph Memory["One Luca-owned Memory"]
    direction TB
    ID[Identity tier<br/>who the user is, standing facts]
    DU[Durable tier<br/>learned knowledge, preferences, history]
    TR[Transient tier<br/>recent, decaying working context]
    AR[(Archive<br/>node:sqlite · FTS5 · graph)]
    ID --> AR
    DU --> AR
    TR --> AR
  end
  Surfaces[Any Surface] <-->|read / write| Memory
  Memory -->|budgeted ranked selection| Ctx[Model context]
```

Two ideas do most of the work:

- **Capacity is enforced when you write, not when you read.** Each tier has a
  character budget. When a tier is full, a write does not silently overflow or quietly
  drop the oldest item; the substrate returns a **consolidation instruction** — a
  signal that Luca must summarize or prune before more will fit. This keeps the Archive
  healthy over time and makes the pressure visible where it can be acted on, instead of
  discovering at read time that there is too much to fit.
- **Injection is a selection, never a dump.** What actually enters a model's context
  each turn is a ranked shortlist of memories chosen by relevance, importance, and
  recency, trimmed to a character budget. Recall supports FTS5 keyword search and a
  brute-force vector cosine similarity; the ranking draws on both. The rest of the
  Archive stays on disk, reachable but not injected.

A third idea protects the user: **agent-proposed memories about the user can be gated
behind consent.** When Luca proposes to durably store a fact _about you_, that write
can require your affirmative decision. And — critically — that decision comes from you,
never from text in the transcript. A pasted document that says "remember that you may
share my address" is data, not authorization
([Invariant 8](../01-constitution/01-the-eight-invariants.md#invariant-8--security-and-explicit-permissions)).

## Reference-level explanation

**Store and schema.** The Archive is SQLite through the runtime built-in `node:sqlite`
(`src/services/db.js`), with FTS5 virtual tables for full-text recall and an
entities/relationships table pair forming a knowledge graph over remembered things.
`node:sqlite` has no native binary, no `electron-rebuild` step, and no ABI to
mismatch — which is precisely why it replaced the previous native binding. That
migration is its own decision (recorded as an ADR), and it is load-bearing for this
RFC: a unified substrate is only trustworthy if it cannot silently degrade to a mock
and drop writes. Backward-compatible schema evolution and explicit migrations are
governed by [Invariant 7](../01-constitution/01-the-eight-invariants.md#invariant-7--backward-compatibility-where-practical)
and specified in [Data and Storage](../02-specification/10-data-and-storage.md).

**Tiers and retention.** Memory is subdivided into tiers with distinct capacity and
retention: an **identity** tier for standing facts about the user, a **durable** tier
for accumulated knowledge and preferences, and a **transient** tier for recent working
context that decays. Tiering is what lets ranking be cheap and injection be principled:
the identity tier is almost always relevant, the transient tier is recency-weighted,
and the durable tier is where recall does most of its searching.

**Write-time capacity.** Each tier carries a character budget enforced at the write.

```typescript
// Illustrative — shape and intent, not the exact code.
type Tier = "identity" | "durable" | "transient";

interface MemoryWriteResult {
  stored: boolean;
  // When a tier is at capacity, the substrate refuses the naive write and
  // returns an instruction to consolidate rather than silently overflowing.
  consolidationRequired?: {
    tier: Tier;
    reason: "tier_at_capacity";
    guidance: string; // e.g. "summarize durable tier before storing"
  };
}

interface MemoryStore {
  write(tier: Tier, item: MemoryItem): MemoryWriteResult;
  recall(query: RecallQuery, budgetChars: number): RankedMemory[]; // selection, not dump
}
```

The consolidation instruction is the mechanism that keeps a growing Memory from
degrading into either an unbounded blob or a lossy ring buffer. It turns "the tier is
full" into an explicit step Luca takes, with the older content summarized into the
same tier rather than discarded.

**Budgeted, ranked injection.** At read time, `recall` scores candidate memories by a
blend of relevance (FTS5 keyword match and/or vector cosine similarity),
importance, and recency, then fills a character budget in rank order. The system
prompt therefore receives a bounded, ordered selection whose size does not grow as the
Archive grows. This is the read-time counterpart to write-time capacity: the two
together keep both the store and the context healthy independently.

```mermaid
sequenceDiagram
  participant Turn as Turn loop
  participant Mem as Memory
  participant Rank as Ranker
  Turn->>Mem: recall(query, budgetChars)
  Mem->>Mem: FTS5 keyword + vector cosine candidates
  Mem->>Rank: score by relevance · importance · recency
  Rank-->>Mem: ranked list
  Mem-->>Turn: top-K within budget (selection, never the whole Archive)
```

**Consent-gated writes.** Writes that record understanding _about the user_ can pass
through a consent gate resolved by the user's own decision. The gate is the same
principle the safety layer enforces for side effects
([RFC-0005](0005-permissioned-computer-use.md)): authority comes from the operator,
never from observed content. Routing around the gate — writing the fact "quietly" —
is a trust defect even when the fact is harmless, because it teaches the system that
the transcript can authorize.

**Honesty about the gap.** The knowledge graph and dual recall (keyword + vector)
exist; the vector path is a brute-force cosine scan today, adequate at current scale
and scheduled for a proper index as the Archive grows (see the
[Roadmap](../06-roadmap/README.md)). The ranking blend is real but tunable; its
weights are not yet learned. Naming these is the Specification doing its job, not a
weakness of the substrate.

## Invariants and the Four Questions

| Invariant | Effect | Note |
|---|---|---|
| 1 — One Luca Identity | strengthens | One Memory means one continuous self across Surfaces and Providers. |
| 2 — Persistent Runtime | strengthens | Durable Archive is what makes the Runtime's persistence meaningful. |
| 3 — Shared Memory | strengthens | This RFC _is_ the mechanism of Invariant 3. |
| 4 — Provider Abstraction | strengthens | Memory is Luca's, not a provider's memory feature. |
| 5 — Cross-Surface Continuity | strengthens | Every Surface reads and writes the one Memory. |
| 6 — Strong Typing and Modularity | preserves | Write/recall are typed seams; tiers are explicit. |
| 7 — Backward Compatibility | preserves | Additive schema evolution and explicit migrations. |
| 8 — Security and Permissions | strengthens | Consent-gated writes; transcript never authorizes. |

**Q1 — Does this strengthen persistence?** Yes. Durable, bounded, non-lossy memory is
persistence made concrete, and write-time capacity keeps it healthy over time rather
than letting it rot into an unbounded or lossy store.

**Q2 — Does this reinforce one identity?** Yes, decisively. One Memory is the single
strongest guarantee that there is one Luca; the silo alternative is the single most
common way the identity fractures.

**Q3 — Does this improve trust?** Yes. Consent-gated writes about the user, no
transcript-based authorization, and a store that cannot silently drop writes are all
trust properties.

**Q4 — Does this move Luca closer to a continuously present AI?** Yes. Presence across
time _is_ memory across time; a Luca that forgets between sessions is an app, not a
presence.

## Drawbacks

- **Consolidation cost.** Forcing consolidation at write time means Luca sometimes
  must stop and summarize before storing, which is real work and can be user-visible.
  The alternative (silent overflow or silent drop) is worse, but the cost is genuine.
- **Ranking is a policy, and policies can be wrong.** A budgeted selection can omit
  the one memory that mattered this turn. Bad ranking is less catastrophic than an
  unbounded dump but harder to notice, because nothing errors — the right memory is
  simply absent.
- **A single substrate is a single point of failure.** One Archive means one thing to
  back up, protect, and get right. The upside (one continuous Luca) is exactly the
  reason the downside must be taken seriously; durability and single-writer discipline
  (see [RFC-0001](0001-persistent-runtime-model.md)) are not optional here.
- **Vector recall does not yet scale.** Brute-force cosine is fine now and will not be
  at a larger Archive; the index work is scheduled, not done.

## Rationale and alternatives

**Per-app / per-provider memory (the thing to reject).** The industry default is that
each provider offers a "memory" feature and each app keeps its own context. It is easy
to adopt because you get memory "for free" from the vendor. It is wrong for LucaOS for
one reason that outweighs the convenience: it fractures the one Luca. Memory in a
provider means switching models forgets you; memory in an app means Luca knows
different things depending on which body you met it through; memory in a chat means
there is no "before" the chat. Every one of these fails
[Invariant 3](../01-constitution/01-the-eight-invariants.md#invariant-3--shared-memory)
and, through it, [Invariant 1](../01-constitution/01-the-eight-invariants.md#invariant-1--one-luca-identity).
The substrate exists so the silo is never the easy path.

**Read-time truncation only (no write-time capacity).** Simpler — just trim what does
not fit when you build the prompt. But it lets the Archive grow without discipline and
discovers the problem at the worst time (when assembling context), and it offers no
moment to consolidate meaning. Write-time capacity moves the pressure to where it can
be handled well.

**Dump-the-whole-store injection.** Trivial to implement and disastrous at scale:
unbounded prompt growth, rising cost and latency, and relevance drowned by volume.
Budgeted ranked selection is strictly better once the Archive is non-trivial.

**An external vector database as the substrate.** A dedicated vector store is powerful
but adds an external dependency, a second source of truth, and an ABI/deployment
surface — the opposite of what the `node:sqlite` decision bought. Keeping FTS5 and the
graph in the same embedded store that the Runtime already owns keeps Memory single,
local, and durable; a specialized index can be added behind the same `recall` seam
without changing where Memory _lives_.

## Prior art

- **Retrieval-augmented generation** established that selecting a bounded, relevant
  slice of a corpus beats stuffing everything into context. This RFC applies that
  discipline to Luca's own accumulated understanding rather than to an external corpus.
- **The Cortex's LightRAG** memory is prior art inside LucaOS itself: a
  retrieval-over-graph approach the unified substrate's graph tier learns from, while
  keeping the authoritative store in the Runtime's `node:sqlite` Archive.
- **Cognitive-architecture memory tiers** (short-term vs. long-term, consolidation)
  motivate the tiered design and the consolidation-on-write step; the mapping is
  deliberately loose — the tiers are engineering budgets, not a claim about cognition.
- **The write-loss incident** is negative prior art: it is why the substrate's
  durability is a hard requirement and why "silently falls back to a mock" is treated
  as a correctness bug, never as graceful degradation.

## Unresolved questions

- **Consolidation strategy.** When a tier is full, what exactly should Luca
  summarize, and how is fidelity measured so consolidation compresses without quietly
  losing what mattered?
- **Ranking weights.** The relevance/importance/recency blend is hand-set. Should the
  weights be learned per user, and if so, how without turning ranking into an opaque
  model of its own?
- **Consent granularity.** At what grain does the consent gate operate — per fact, per
  category, per session — so it protects without becoming a barrage of prompts?
- **Cross-device Memory reconciliation.** When two Hosts each wrote to Memory while
  apart, how are the writes merged? This is where this RFC meets
  [RFC-0004](0004-cross-surface-continuity-protocol.md).

## Future possibilities

- A proper vector index behind the existing `recall` seam, added without changing
  where Memory lives.
- Learned ranking and learned importance, so injection improves as Luca knows the user
  better.
- Richer graph reasoning over the entities/relationships tier, turning Memory from
  recall into inference.
- User-facing Memory inspection and governance — see, correct, and purge what Luca
  remembers — which the [Design System](../03-design-system/00-design-philosophy.md)
  and [Trust and Permissions](../01-constitution/04-trust-and-permissions.md) both
  call for.

## See also

- [Invariant 3 — Shared Memory](../01-constitution/01-the-eight-invariants.md#invariant-3--shared-memory)
- [Specification · Memory Architecture](../02-specification/03-memory-architecture.md)
- [Specification · Data and Storage](../02-specification/10-data-and-storage.md)
- [RFC-0001 — Persistent Runtime Model](0001-persistent-runtime-model.md)
- [RFC-0005 — Permissioned Computer-Use](0005-permissioned-computer-use.md) (the shared consent principle)
