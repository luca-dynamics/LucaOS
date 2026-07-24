# Architecture Decision Records

This directory records decisions LucaOS has already made, and why. An
[ADR](../GLOSSARY.md) is a short, immutable document that captures one
architectural decision, the context that forced it, and the consequences the
project accepted by making it. You read an ADR to answer a single question:
_why is it built this way?_

---

## What an ADR is (and is not)

An ADR is a record, not a proposal. It is written **after** a decision is made,
to preserve the reasoning so that a future contributor — human or agent — does
not "fix" something that is load-bearing, or relitigate a settled trade-off
without knowing what it cost.

An ADR is:

- **Narrow.** One decision per record. If a change makes three separable
  decisions, it is three ADRs.
- **Honest about cost.** Every real decision has negative consequences. An ADR
  that lists only benefits is marketing, not a record. State what you gave up.
- **Immutable once accepted.** The reasoning at the moment of decision is the
  historical fact worth preserving. You do not edit an accepted ADR to reflect a
  later change of mind; you write a new ADR that supersedes it.

An ADR is not a design doc, a tutorial, or a status report. It does not track
implementation progress; the [Roadmap](../06-roadmap/README.md) does that.

## How an ADR differs from an RFC

The two are complementary halves of the same discipline, separated by _time_
relative to the decision.

| | [RFC](../04-rfcs/README.md) | ADR (this directory) |
|---|---|---|
| **When** | Before the decision | After the decision |
| **Purpose** | Propose and debate a substantial change | Record a decision and its rationale |
| **Mutability** | Evolves during review | Immutable once Accepted |
| **Answers** | "Should we do this?" | "Why did we do this?" |
| **Outcome** | Acceptance, rejection, or revision | A durable explanation future contributors can trust |

A large change often flows RFC → decision → ADR: the RFC argues the case, the
decision is made, and an ADR memorializes it. A small but consequential decision
(most of the records here) may be captured directly as an ADR without a
preceding RFC. When an ADR results from an RFC, each links the other.

## The format

Every ADR follows [`0000-template.md`](0000-template.md):

- **Title** — `ADR-XXXX: <decision, stated as a decision>`.
- **Status** — `Proposed`, `Accepted`, or `Superseded by ADR-XXXX`.
- **Context** — the forces, constraints, and problem that made a decision
  necessary. Written so a reader with no prior knowledge understands the
  pressure.
- **Decision** — what was decided, in the active voice ("We allocate ephemeral
  ports…").
- **Consequences** — what becomes true as a result, both **positive** and
  **negative**. The negatives are not optional.
- **Alternatives considered** — the other options and why each was not chosen.
- **Related** — links to the [Invariants](../01-constitution/01-the-eight-invariants.md),
  [Specification](../02-specification/README.md) chapters, and any
  [RFCs](../04-rfcs/README.md) the decision touches.

## Immutability and superseding

An accepted ADR is a historical record. To change a decision:

1. Write a **new** ADR with the next number that states the new decision and its
   context. In its Context, reference the ADR it replaces.
2. Edit the old ADR's **Status** line — and only that line — to
   `Superseded by ADR-XXXX`. Leave the rest of the old ADR intact; its reasoning
   remains true for the era in which it held.

This way the history reads as a chain: each decision, why it was made, and what
later replaced it. A reader can always reconstruct not just what LucaOS believes
today but the path it took to believe it.

The one exception to immutability is the Status line, which may be updated to
`Superseded by …` when a later ADR replaces the decision. Nothing else in an
accepted ADR is edited in place.

## Numbering

ADRs are numbered sequentially, zero-padded to four digits, in filename order:
`NNNN-short-kebab-title.md`. `0000` is the template. Numbers are never reused,
even when an ADR is superseded — the superseded record keeps its number so links
to it stay valid. Take the next free number when you add one, and add a row to
the index below in the same change.

## Index

| ADR | Title | Status | Primary Invariant |
|---|---|---|---|
| [0001](0001-one-identity-not-per-session-agents.md) | One identity, not per-session agents | Accepted | [1 — One Luca Identity](../01-constitution/01-the-eight-invariants.md#invariant-1--one-luca-identity) |
| [0002](0002-memory-belongs-to-luca.md) | Memory belongs to Luca | Accepted | [3 — Shared Memory](../01-constitution/01-the-eight-invariants.md#invariant-3--shared-memory) |
| [0003](0003-provider-abstraction-over-vendor-lockin.md) | Provider abstraction over vendor lock-in | Accepted | [4 — Provider Abstraction](../01-constitution/01-the-eight-invariants.md#invariant-4--provider-abstraction) |
| [0004](0004-node-sqlite-over-better-sqlite3.md) | `node:sqlite` over `better-sqlite3` | Accepted | [3 — Shared Memory](../01-constitution/01-the-eight-invariants.md#invariant-3--shared-memory) |
| [0005](0005-ephemeral-ports-and-single-instance.md) | Ephemeral ports and a single-instance lock | Accepted | [1 — One Luca Identity](../01-constitution/01-the-eight-invariants.md#invariant-1--one-luca-identity) |
| [0006](0006-fast-listen-boot.md) | Fast-listen boot | Accepted | [2 — Persistent Runtime](../01-constitution/01-the-eight-invariants.md#invariant-2--persistent-runtime) |
| [0007](0007-write-time-memory-capacity.md) | Write-time memory capacity | Accepted | [3 — Shared Memory](../01-constitution/01-the-eight-invariants.md#invariant-3--shared-memory) |
| [0008](0008-category-security-floor.md) | Category security floor | Accepted | [8 — Security and Explicit Permissions](../01-constitution/01-the-eight-invariants.md#invariant-8--security-and-explicit-permissions) |
| [0009](0009-unconditional-permission-gate.md) | Unconditional permission gate | Accepted | [8 — Security and Explicit Permissions](../01-constitution/01-the-eight-invariants.md#invariant-8--security-and-explicit-permissions) |
| [0010](0010-budgeted-ranked-memory-injection.md) | Budgeted, ranked memory injection | Accepted | [3 — Shared Memory](../01-constitution/01-the-eight-invariants.md#invariant-3--shared-memory) |

## See also

- [The Eight Invariants](../01-constitution/01-the-eight-invariants.md) — the
  properties ADRs must never weaken.
- [RFCs](../04-rfcs/README.md) — proposals debated before a decision.
- [Roadmap](../06-roadmap/README.md) — where the implementation stands against
  the target.
- [Style Guide](../STYLE-GUIDE.md) — how these documents are written.
