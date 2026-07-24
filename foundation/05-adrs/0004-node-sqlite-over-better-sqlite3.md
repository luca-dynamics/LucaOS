# ADR-0004: `node:sqlite` over `better-sqlite3`

## Status

Accepted

## Context

[Memory](../02-specification/03-memory-architecture.md) is backed by SQLite in the
Node "core" server (`src/services/db.js`), with FTS5 full-text search and an
entities/relationships knowledge graph. Because
[memory belongs to Luca](0002-memory-belongs-to-luca.md), the durability of these
writes is not a storage nicety — it is the difference between Luca having a
continuous self and only appearing to.

The original backend was `better-sqlite3`, a native Node addon. Native addons are
compiled against a specific V8/Node **ABI** (application binary interface). LucaOS
runs in an unusual topology: an [Electron](../02-specification/01-persistent-runtime.md)
desktop app spawns a Node core server, and Electron ships its _own_ Node/V8 with
its _own_ ABI, distinct from the system Node the server may run under. A native
module built for Electron's ABI does not load under system Node, and vice versa.

The failure this produced was the worst kind: silent. When the native module
failed to load because of the ABI mismatch, the database layer **fell back to a
mock store**. Writes appeared to succeed and were discarded. This is precisely the
failure mode Invariant 3 singles out — "a silent in-memory fallback that accepts
writes and discards them… a correctness bug masquerading as graceful degradation."
Luca reported remembering things it had thrown away. No error surfaced; Memory
simply did not persist.

The conventional fix is to rebuild the native module for the right ABI
(`electron-rebuild`) and keep it rebuilt across every Electron and Node upgrade.
That keeps the ABI hazard alive as a permanent maintenance obligation: any drift
between the runtime a module was built for and the runtime it loads into
reintroduces the same silent-fallback bug.

## Decision

**Replace `better-sqlite3` with the runtime's built-in `node:sqlite`.** Memory,
the knowledge graph, FTS5 search, and the checkpoint store all run on
`node:sqlite`.

`node:sqlite` is part of the runtime itself, not a separately compiled addon.
Therefore:

- **No native binary** ships with LucaOS's dependency tree for the database layer.
- **No `electron-rebuild` step** is required on install or upgrade.
- **No ABI to mismatch.** Because the SQLite binding is the runtime's own, it
  cannot be "built for the wrong runtime" — the class of bug is removed, not merely
  patched.

With the ABI failure impossible, the mock-store fallback that masked it is no
longer reachable in the way it was, and the write path can be made to surface real
failures rather than pretend success, honoring
[ADR-0002](0002-memory-belongs-to-luca.md)'s "durable by default" commitment.

## Consequences

### Positive

- **A whole class of bug disappears.** The ABI mismatch — and the silent write-loss
  it caused — cannot occur, because there is no separately compiled binary to
  mismatch. This is the central win and it directly strengthens
  [Invariant 3](../01-constitution/01-the-eight-invariants.md#invariant-3--shared-memory).
- **Simpler builds and installs.** No native compilation, no `electron-rebuild`, no
  per-platform prebuilt binaries to source or fail to source. The topology of an
  Electron app spawning a Node server under a possibly-different runtime stops being
  a hazard for the database.
- **Fewer moving parts across upgrades.** Electron and Node version bumps no longer
  risk desynchronizing a compiled dependency from the runtime that loads it.

### Negative

- **`node:sqlite` is younger and has a smaller feature surface** than the mature
  `better-sqlite3`. Some conveniences and extension points of the older library are
  not available, and workarounds are occasionally needed.
- **It requires a modern runtime.** `node:sqlite` exists only in recent runtime
  versions, so LucaOS commits to a minimum runtime floor and cannot run on older
  ones. That constraint must be held across the Electron/Node matrix the app ships.
- **Its API and stability guarantees are still settling.** As a newer built-in, its
  surface may change between runtime versions; LucaOS must track those changes
  rather than pinning a third-party library at a known-good version.
- **Migration effort.** Existing code written against `better-sqlite3`'s API had to
  be ported to `node:sqlite`'s, including FTS5 usage and the knowledge-graph
  queries, with care that persisted data continued to read correctly
  ([Invariant 7](../01-constitution/01-the-eight-invariants.md#invariant-7--backward-compatibility-where-practical)).

## Alternatives considered

- **Keep `better-sqlite3` with a stricter rebuild discipline.** Enforce
  `electron-rebuild` on every install and CI run, and gate startup on a successful
  native load. Rejected: it keeps the ABI hazard permanently alive as a maintenance
  tax and a latent silent-failure risk. A structural removal of the failure class is
  preferable to a procedure that must never be forgotten. It also does not, by
  itself, eliminate the mock-fallback path — it only makes the path less likely to
  be hit.
- **Keep the native module but make the fallback loud.** Detect the failed native
  load and refuse to start (fail closed) rather than falling back to a mock.
  Rejected as insufficient on its own: it converts silent data loss into a hard
  startup failure, which is better but still leaves users unable to run LucaOS
  whenever the ABI drifts. Removing the native dependency fixes the cause, not just
  the symptom. (The fail-closed principle is retained regardless, per
  [ADR-0002](0002-memory-belongs-to-luca.md).)
- **Move to a different embedded database** (e.g. a pure-JS store, or a client/
  server database). Rejected: SQLite's single-file embedded model, FTS5, and SQL
  are a good fit for a local-first, single-instance
  ([ADR-0005](0005-ephemeral-ports-and-single-instance.md)) Runtime, and a pure-JS
  store would sacrifice performance and FTS5. Switching database engines is a far
  larger change than switching SQLite bindings, for no additional benefit against
  the actual problem.
- **Do nothing.** Rejected: silent write-loss in Memory is a direct violation of
  Invariant 3 and corrodes the trust the Constitution requires. It is not a
  tolerable steady state.

## Related

- [Invariant 3 — Shared Memory](../01-constitution/01-the-eight-invariants.md#invariant-3--shared-memory)
- [Invariant 7 — Backward Compatibility Where Practical](../01-constitution/01-the-eight-invariants.md#invariant-7--backward-compatibility-where-practical)
- [Memory Architecture](../02-specification/03-memory-architecture.md)
- [Data and Storage](../02-specification/10-data-and-storage.md)
- [ADR-0002: Memory belongs to Luca](0002-memory-belongs-to-luca.md)
- [ADR-0005: Ephemeral ports and a single-instance lock](0005-ephemeral-ports-and-single-instance.md)
