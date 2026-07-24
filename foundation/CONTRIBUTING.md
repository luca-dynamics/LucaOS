# Contributing to LucaOS

This document defines the engineering standards and contribution workflow for
LucaOS. It applies to human engineers and AI coding agents alike. Agents should
also read [CLAUDE.md](CLAUDE.md).

Contribution to LucaOS is governed by one principle above all: **coherence**. A
large system built by many contributors (many of them AI) survives only if every
contribution shares the same model of what is being built. That model is the
[Constitution](01-constitution/README.md).

---

## Before you write

1. Read the relevant [Specification](02-specification/README.md) chapter and any
   [ADRs](05-adrs/README.md) for the subsystem.
2. Confirm your change can answer [The Four Questions](01-constitution/02-the-four-questions.md).
3. Confirm it breaks none of [The Eight Invariants](01-constitution/01-the-eight-invariants.md).
   If it must, stop and open an [RFC](04-rfcs/README.md).

## Engineering standards

### Types
- Subsystem boundaries are strongly typed. No `any` on a module's public surface.
- Persisted shapes and cross-Surface protocol messages are versioned types; they
  evolve additively (see Invariant 7).
- Illustrative interface sketches in docs need not compile; production types must.

### Modularity
- No god-modules. A file that mixes routing, business logic, and I/O is a refactor
  waiting to happen; do not add to it — carve out a typed seam.
- The provider abstraction boundary is inviolable. Vendor-specific code lives only
  in Adapters. See [Provider Abstraction](02-specification/04-provider-abstraction.md).

### Safety
- Side-effectful Tools are gated and provenanced. Coverage is enforced by category
  floors, not per-tool memory. See
  [Safety and Permissions](02-specification/07-safety-and-permissions.md).
- Fail closed. If a gate cannot be reached, refuse.
- Never treat transcript text as authorization.

### Tests
- Test **real behavior**, not source text where behavior is testable. A test that
  asserts a substring of a file proves little; a test that exercises the code
  proves something.
- Do not infer liveness from coverage. Grep for non-test importers before
  trusting a module.
- If you claim it passes, run it and show the output.

### Persistence and continuity
- Anything the user would expect to survive a restart must be durable, not
  in-memory-only. A silent in-memory fallback that pretends to persist is a
  correctness bug, not a graceful degradation.
- Cross-Surface state changes must propagate; a change on one Surface that a
  second Surface cannot see is a Continuity violation.

## Git workflow

- Branch from the default branch; never commit directly to it.
- **Stage by explicit path.** Multiple sessions and worktrees may share one
  working tree. `git add -A` is forbidden here; it sweeps up other sessions' work.
- Treat unexpected modified files as another session's in-flight work — surface
  them, do not commit or revert them.
- Commit messages state what changed and what was verified. End with the
  co-authorship trailer if written by an agent.
- Confirm before irreversible or outward-facing actions (push to shared branches,
  force-push, publish) unless durably authorized.

## Pull request checklist

A PR is ready when:

- [ ] It answers [The Four Questions](01-constitution/02-the-four-questions.md).
- [ ] It breaks none of the Eight Invariants (or links an accepted RFC that
      amends one).
- [ ] Boundaries are typed; no `any` on public surfaces.
- [ ] Side effects are gated, provenanced, and revocable.
- [ ] Tests exercise real behavior and were run; output is shown.
- [ ] Docs and ADRs are updated to match reality.
- [ ] The commit is honest about what was and was not verified.

## Documentation contributions

Changes to this repository follow the [Style Guide](STYLE-GUIDE.md). Substantive
changes to the Constitution follow the
[Amendment process](01-constitution/03-governance-and-amendments.md); everything
else is an ordinary reviewed PR.

## See also

- [CLAUDE.md](CLAUDE.md) — agent operating instructions
- [The Constitution](01-constitution/README.md)
- [The Specification](02-specification/README.md)
