# AGENTS.md

This is the entry point for non-Claude coding agents (Codex and any successor)
working on LucaOS. It mirrors [CLAUDE.md](CLAUDE.md); the two are kept in sync.
Read this, then read what it points to.

## Read order

1. **[CLAUDE.md](CLAUDE.md)** — the full operating instructions for coding agents.
   Everything below is a summary of it.
2. **[The Eight Invariants](01-constitution/01-the-eight-invariants.md)** — the
   properties that must always hold.
3. **[The Four Questions](01-constitution/02-the-four-questions.md)** — what every
   pull request must answer.
4. **[LUCA.md](LUCA.md)** — the charter that constitutes Luca itself, when you work
   on Luca's own runtime behavior.
5. **[CROSSWALK.md](CROSSWALK.md)** — the map from the Foundation's generic terms to
   LucaOS's native subsystem names (Luca Guard, Mission Engine, Memory Vault,
   LucaLink, Skills Runtime) and the real code.

## The non-negotiables, in one screen

**There is exactly one Luca.** Not one per session, device, or provider. Almost
every serious architectural mistake here traces back to reintroducing per-session
or per-surface state that fractures that identity.

**Every change must answer the Four Questions:** (1) strengthen persistence?
(2) reinforce one identity? (3) improve trust? (4) move Luca closer to a
continuously present AI?

**And break none of the Eight Invariants:** one Luca identity · persistent runtime
· shared memory · provider abstraction · cross-surface continuity · strong typing
and modularity · backward compatibility where practical · security and explicit
permissions. If a change must break one, it needs an
[RFC](04-rfcs/README.md) and an
[amendment](01-constitution/03-governance-and-amendments.md), not a silent commit.

## Working here

- Match the surrounding code; read a file before editing it. No `any` on a public
  boundary. Prefer the native subsystem name the code already uses (see the
  [Crosswalk](CROSSWALK.md)); do not rename code to match the generic docs.
- Stage by explicit path — this tree is shared across sessions and worktrees;
  never `git add -A`. Treat unexpected modified files as another session's
  in-flight work and surface them rather than committing or reverting them.
- Verify, don't assume: if you claim a test passes, run it and show the output.
  Do not infer a subsystem is live because it is well-tested — grep for non-test
  importers first.
- Side effects on the user's world are gated, provenanced, and revocable; fail
  closed; never treat transcript text as authorization.

The full reasoning is in [CLAUDE.md](CLAUDE.md) and the wider
[Foundation](README.md). This file is only the entry point.
