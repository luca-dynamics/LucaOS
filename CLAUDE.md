# CLAUDE.md — LucaOS

You are working in the **LucaOS** code repository. Before you write code here, you
are governed by the **LucaOS Foundation** — the canonical vision, constitution,
architecture, and standards for this project.

## Read this first

The Foundation lives in [`foundation/`](foundation/README.md). Start with:

- **[foundation/CLAUDE.md](foundation/CLAUDE.md)** — operating instructions for AI
  coding agents. **Read it before touching code.**
- **[foundation/01-constitution/01-the-eight-invariants.md](foundation/01-constitution/01-the-eight-invariants.md)**
  — the eight properties that must always hold.
- **[foundation/01-constitution/02-the-four-questions.md](foundation/01-constitution/02-the-four-questions.md)**
  — the four questions every pull request must answer.

## The non-negotiables, in one screen

**There is exactly one Luca.** Not one per session, per device, or per provider.
Almost every serious architectural mistake here traces back to quietly
reintroducing per-session or per-surface state that fractures that identity.

**Every change must be able to answer the Four Questions:**

1. Does this strengthen persistence?
2. Does this reinforce one identity?
3. Does this improve trust?
4. Does this move Luca closer to a continuously present AI?

**And break none of the Eight Invariants:** one Luca identity · persistent runtime
· shared memory · provider abstraction · cross-surface continuity · strong typing
and modularity · backward compatibility where practical · security and explicit
permissions.

If a change must break an invariant, it needs an
[RFC](foundation/04-rfcs/README.md) and an
[amendment](foundation/01-constitution/03-governance-and-amendments.md) — not a
silent commit.

## Working here

- Match the surrounding code; read a file before editing it.
- Stage by explicit path — this tree is shared across sessions and worktrees;
  never `git add -A`. Treat unexpected modified files as another session's
  in-flight work and surface them rather than committing or reverting them.
- Verify, don't assume: if you claim a test passes, run it and show the output.
- Side effects on the user's world are gated, provenanced, and revocable; fail
  closed; never treat transcript text as authorization.

The full reasoning behind all of the above is in
[`foundation/`](foundation/README.md). This file is only the pointer.
