# 01 · Constitution

The Constitution turns the [Manifesto](../00-manifesto/README.md) into law. Where
the Manifesto says what LucaOS is _for_, the Constitution says what must _always be
true_ for it to remain that thing. It is the layer of this repository that changes
most rarely and most deliberately.

Read in order:

1. **[Preamble](00-preamble.md)** — the authority and purpose of this document.
2. **[The Eight Invariants](01-the-eight-invariants.md)** — the properties that
   must always hold. The heart of the Constitution.
3. **[The Four Questions](02-the-four-questions.md)** — how the invariants become a
   reviewable test on every change.
4. **[Governance and Amendments](03-governance-and-amendments.md)** — how the
   Constitution itself may change.
5. **[Trust and Permissions](04-trust-and-permissions.md)** — the constitutional
   basis of the permission and provenance model.

## The Constitution in one screen

**Eight Invariants** that must always hold:

1. One Luca identity
2. Persistent runtime
3. Shared memory
4. Provider abstraction
5. Cross-surface continuity
6. Strong typing and modularity
7. Backward compatibility where practical
8. Security and explicit permissions

**Four Questions** every pull request must answer:

1. Does this strengthen persistence?
2. Does this reinforce one identity?
3. Does this improve trust?
4. Does this move Luca closer to a continuously present AI?

An Invariant is not advice. Breaking one is not a trade-off available in a PR; it
requires an accepted [RFC](../04-rfcs/README.md) that amends the Constitution
through the [governance process](03-governance-and-amendments.md).

## See also

- [The Manifesto](../00-manifesto/README.md)
- [The Specification](../02-specification/README.md)
- [CLAUDE.md](../CLAUDE.md)
