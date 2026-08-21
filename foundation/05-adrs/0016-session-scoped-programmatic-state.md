# ADR-0016: A script's durable state is core-owned, session-keyed JSON

## Status

Accepted

## Context

`execute_script` lets Luca write a short program instead of a tool call —
`await luca.tools.<name>({…})` in a loop, with the results correlated locally
rather than round-tripped through the model. It is deny-by-default
(`programmaticToolExecutor.ts`: a `TOOL_CONFIGS` miss is a refusal, `level <=
LEVEL_1` is the ceiling, `execute_script` and `invokeAnyTool` are denylisted
against recursion and laundering, 30 s deadline, 50-call cap, 15 shadowed
globals). It also had **no `FunctionDeclaration`**, so it was never registered and
never offered: the machinery was well-tested and had never once executed.

Making it reachable exposes the question this record answers. **A script that
computes something expensive has nowhere to put it.** Its environment was
`{ tools, env }`; both die when the function returns. The only way to carry a
value into the next turn was to *return* it — into the transcript.

Three places state could live, and what each actually offers:

| Where | Survives the call | Survives compaction | Survives a restart | Costs context |
|---|---|---|---|---|
| The script's closure, or `luca.env` | no | — | no | no |
| The transcript, by returning the value | yes | **no** | yes | **every turn, forever** |
| The interpreter namespace in `sandboxService.js` | yes | yes | **no** | no |

The middle row is the trap. Returning a 10 000-row intermediate result puts those
rows in the request payload on every subsequent turn until compaction removes
them — and then removes them for good. Compaction is not a bug to work around
here: summarising old turns is what the context compactor is *for*, and
[ADR-0015](0015-server-side-session-transcript.md) makes the transcript
append-only, with hydration beginning at the newest summary. So the transcript is
simultaneously the most expensive place to keep working data and the place
guaranteed to eventually drop it.

The third row is the promise the repository was already making and could not
keep. `runPythonScript`'s description advertised that *"variables, functions, and
imports you define in one call will remain available in memory for subsequent
calls"* — true of a live sidecar process, false the moment it restarts, and
before Part 1 of this change it was one namespace shared by every session, so it
was also a place one conversation could read another's variables.

Four constraints then decide where the durable half can live.

**Working data is not memory, and must not be filed as memory.**
[ADR-0002](0002-memory-belongs-to-luca.md) and
[Memory Architecture](../02-specification/03-memory-architecture.md) make memory
Luca's curated understanding of the user and the world, capacity-bounded at the
write and gated by consent where it concerns the user. A script's `rows` array is
none of that. Routing scratch values into the memory graph would either bypass
that consent gate or prompt on every loop iteration, and would pollute the one
store whose value depends on being curated. It needs a different home, explicitly
labelled as not-memory.

**A renderer-local store fractures the one Luca.** The full argument is
[ADR-0015](0015-server-side-session-transcript.md)'s and is not restated: state
that exists once per surface means two surfaces holding two irreconcilable
answers, and `vite.config.ts` aliases `node:sqlite` in the renderer to a module
that throws, whose established handling in this codebase is a mock store that
accepts every write and keeps none.

**[Data and Storage](../02-specification/10-data-and-storage.md) forbids the
comfortable failure.** A store that cannot reach its backend must say so. An
in-memory fallback that answers reads and drops writes is the specific defect
[ADR-0004](0004-node-sqlite-over-better-sqlite3.md) exists to keep out.

**A persisted namespace is a persisted authority.** The obvious richer design —
keep the *source* a script defined, and re-evaluate it at the top of every later
script, or snapshot the interpreter namespace with `dill` — makes code written
under one turn's approval execute under every later turn's. The approval gate is
per call ([ADR-0009](0009-unconditional-permission-gate.md)); a stored prelude
outlives the thing that authorised it, and transcript text is attacker-reachable
input ([Safety and Permissions](../02-specification/07-safety-and-permissions.md)).

## Decision

**We give an approved script exactly one durable place to leave data —
`luca.state` — owned by the core, keyed by session, holding JSON only, bounded at
the write, and never reported as persisted when it was not.**

Concretely:

- **The store is a `session_scratchpad` table** in the core server's
  `node:sqlite` database (`cortex/server/services/sessionEntryStore.js`), beside
  the transcript and the leases: `(session_id, key)` primary key, `value` as JSON
  text, `bytes`, `surface`, `updated_at`.
- **It is deliberately not append-only** — the one thing here that is not. A
  script overwrites `rows` on every run, and recording each overwrite as a new
  immutable row would grow without bound to preserve versions nobody asked for.
  The transcript records *that* a value was stored; this table holds the value.
  The audit property lives in the log, where it is cheap; the value lives here,
  where it is mutable.
- **Bounded at the write, never truncated at the read**: 256 KiB per key, 1 MiB
  per session, 64 keys, 256 characters per key. Over budget is a refusal with the
  projected numbers attached (`SCRATCHPAD_FULL` → HTTP 413) and **nothing is
  written** — the same write-time discipline as
  [ADR-0007](0007-write-time-memory-capacity.md). A read that quietly returned a
  shortened value would be the same lie as an in-memory fallback. The limits are
  returned with every read, so a caller never has to guess them.
- **JSON only.** No stored source, no closures, no live handles. Data is what
  makes the compaction argument work, and data is all that can be handed to a
  different process — or the same process after a restart — without also handing
  it authority.
- **`luca.state` is a plain mutable object**, loaded before the script body is
  compiled and flushed exactly once after it settles. Not a `Proxy`: a proxy would
  let a script observe or intercept the flush and would disguise a network round
  trip as a property read. No async accessors inside the script, so the body
  cannot make its own calls to the store mid-execution.
- **The flush also runs on the failure path.** What is expensive about a script
  that dies at step 9 is usually what it stored at step 3. The flush reads
  `luca.state` off the environment at flush time rather than from a captured
  reference, because a script may assign `luca.state = {…}` outright; and it skips
  the write entirely when the JSON is byte-identical to what the load produced.
- **Every outcome is stated in the tool's output.** `[STATE PERSISTED]` with the
  key count and byte total, `[STATE PARTIALLY PERSISTED]`, `[STATE NOT PERSISTED]
  <reason> — values set in luca.state are lost when this call ends.`, or
  `[STATE NOT LOADED] <reason>` when the read failed. Within-call mutation keeps
  working and the script still returns its result; only the *claim* of persistence
  is withheld. There is no in-memory fallback.
- **A deletion needs a baseline.** The client (`src/services/session/sessionScratchpad.ts`)
  asks for a full replace only when the session it is saving to is the session a
  **successful** load established. Otherwise the write is a merge. A script cannot
  delete a key it was never shown, so a failed read degrades to "adds nothing"
  rather than "erases everything". A successful save deliberately does not set the
  baseline — only a successful read earns the right to delete.
- **Provenance on every row.** `surface` records which embodiment wrote the value,
  per [Invariant 8](../01-constitution/01-the-eight-invariants.md#invariant-8--security-and-explicit-permissions).
- **The interpreter namespace stays ephemeral.** `sandboxService.js` keeps
  per-session namespaces in process memory and loses them on restart; `luca.state`
  is the durable half. Two different promises, and the tool descriptions now state
  which is which instead of promising the stronger one for both.
- **The gate is untouched.** `execute_script` gets its declaration and a
  `CORE_WHITELIST` entry so the model is actually offered it; the explicit
  `TOOL_CONFIGS` row still resolves to LEVEL_1 in `register`, and `invokeAnyTool`
  still refuses LEVEL_1 targets, so the meta-tool cannot route around the
  challenge.

The state itself never enters the model's context. A script reads it, works with
it, and returns a summary; the transcript carries *"stored 10 000 rows in
luca.state.rows"*, and the rows are on disk under a session id that already
survives reloads and surface switches.

## Consequences

### Positive

- **Compaction can no longer destroy working data.** This is the point. The
  expensive result lives outside the conversation, so summarising the conversation
  costs nothing, and the payload carries a sentence instead of a dataset.
- **Working data survives a restart**, which the interpreter namespace never did
  and never will. [Invariant 2](../01-constitution/01-the-eight-invariants.md#invariant-2--persistent-runtime)
  applied to what Luca is in the middle of doing, not only to what it has said.
- **A deny-by-default execution path finally runs.** The gating, the denylist and
  the level ceiling stop being untested-in-production theory. The reachability fix
  is one line and the gate it lands behind is the one already in `TOOL_CONFIGS`.
- **Failure is legible.** Four distinct notices mean the model can tell "I stored
  it" from "I could not store it" and act differently, instead of both looking
  like success.
- **One runaway loop cannot fill the database that holds the transcript.** The
  caps are enforced before the transaction, with the numbers in the refusal.
- **A failed read is not destructive.** The baseline rule makes the worst case of
  an unreachable core "this call adds nothing", never "this call deleted the
  session's state".
- **Memory stays curated.** The store that is supposed to hold Luca's
  understanding of the user does not accumulate a script's scratch rows, and the
  consent gate on memory is not routed around at machine speed.

### Negative

- **This table has no `schema_version`.** `session_entries` carries one;
  `session_scratchpad` does not. The honest reason is that the versionable shape
  here is the *script's* JSON, not ours, and a column would version the container
  while telling a reader nothing about the content. The cost is real: if the
  container ever needs a column, this repository still has no migration runner
  beyond `CREATE TABLE IF NOT EXISTS`, and unlike the transcript there is not even
  a marker to branch on.
- **No retention and no eviction.** Rows live until a script clears them or the
  session goes away. A full scratchpad is a wall, not a queue: the cap refuses the
  new write rather than dropping the oldest key, and the operator has no way to
  see or clear what is stored. Deliberate — silently evicting a value a script was
  told was persisted would undo the honesty this record is built on — but it means
  a long session can wedge itself and only a script can unwedge it.
- **No compartmentalisation inside a session.** Every approved script in a session
  reads all of that session's state. A script approved to summarise a document
  sees whatever a script approved to read a mailbox left behind. The boundary this
  decision draws is per session, not per purpose.
- **The tool costs payload on every turn.** `execute_script` sits in
  `CORE_WHITELIST`, so its description rides in every request for every persona
  whether or not a script is ever run. That is the price of the model knowing the
  capability exists at all: `activeTools` is built from `ToolRegistry.getCore()`
  alone, and the one discovery path refuses LEVEL_1 tools and tells the model to
  call them directly.
- **JSON only means real losses.** A DataFrame, an open socket, a compiled regex,
  a class instance, a partially-applied function — none survive. A script that
  wants those must rebuild them from data on each call, which is more code and
  more time than a namespace snapshot would have cost.
- **A timed-out script is abandoned, not stopped.** `Promise.race` cannot cancel
  the body. The flush on the failure path saves the snapshot as of the deadline,
  which is the most that can be promised, while the runaway body keeps running and
  may mutate `luca.state` afterwards — those later mutations are lost, and the
  notice cannot describe them.
- **Two more HTTP round trips per script call**, one to load and one to flush,
  both on the tool path. A script also cannot checkpoint mid-run: there is exactly
  one flush, at the end.
- **One more store the core must be reachable for.** When it is not, scripts still
  execute — they simply cannot carry anything forward, and say so.

## Alternatives considered

- **Return everything through the transcript and raise the compaction budget.**
  No new table, no new routes. Rejected: it makes the payload grow with the size
  of the data rather than the length of the conversation, and it only postpones
  the loss — compaction exists precisely to drop old turns, so the working data is
  destroyed on a schedule. Raising the budget trades one guaranteed failure for a
  more expensive guaranteed failure.
- **A `dill` snapshot of the Python namespace** (prime-agent's revival path), or
  `v8.serialize` of the Node context. Rejected: it persists live objects, which
  means it persists code, which means the authority that approved that code
  outlives the turn it was granted for. It also pins the state to one interpreter
  version and one process, so it cannot be read by the memory graph, another
  surface, or a restarted core — the state would be durable in exactly one
  direction.
- **A persisted source prelude** — keep the functions a script defined and
  re-evaluate them at the top of every later script. Rejected for the same reason,
  more sharply: a standing re-execution of stored text, in a system whose
  transcript is full of attacker-reachable content, is a code-injection surface
  with no expiry.
- **Store scratch values in the memory graph.** It already exists, is already
  durable, and is already session-aware. Rejected: memory is curated and
  consent-gated by design, and a script writing at loop speed would either train
  the operator to wave the memory gate through or bypass it. It would also make
  "what Luca knows about you" and "what a script left in a variable" the same
  query.
- **Renderer IndexedDB or `localStorage`.** Rejected on
  [Invariant 5](../01-constitution/01-the-eight-invariants.md#invariant-5--cross-surface-continuity)
  and on the same reasoning as
  [ADR-0015](0015-server-side-session-transcript.md): a per-surface store is a
  second answer to a question that must have one, and it is unreadable by the core
  and Cortex.
- **Key the state to Luca globally rather than to a session.** Simpler, and
  arguably more in the spirit of one identity. Rejected: an unscoped scratchpad is
  the defect Part 1 removed from `sandboxService.js`, where a single shared
  namespace let one conversation read another's variables. Identity is one; a
  half-finished computation is not identity, and the thing that makes it safe to
  keep is knowing which conversation it belongs to. Anything genuinely about the
  user belongs in memory, which is global on purpose.
- **A `Proxy` for `luca.state` that persists on assignment.** Ergonomically
  nicer — no flush to reason about. Rejected: it turns a property write into a
  network call, makes the timing observable to the script, and multiplies round
  trips by the number of assignments in a loop. One flush at the end is
  predictable and cheap.
- **Truncate at the read instead of refusing at the write.** Rejected: it converts
  a refusal the script can handle into silent corruption it cannot detect, which
  is the failure mode [ADR-0007](0007-write-time-memory-capacity.md) already
  settled for memory.
- **Do nothing** — leave `execute_script` undeclared and unreachable. Rejected: it
  leaves the repository with two half-executors, one that persists but is
  ungatable process memory and one that is gated but cannot remember anything, and
  it leaves every expensive intermediate result on a path where compaction will
  eventually delete it. It also leaves a tested, gated code path that has never
  run, which is the specific hazard [`foundation/CLAUDE.md`](../CLAUDE.md) §4 warns
  about.

## Related

- [Invariant 2 — Persistent Runtime](../01-constitution/01-the-eight-invariants.md#invariant-2--persistent-runtime)
- [Invariant 3 — Shared Memory](../01-constitution/01-the-eight-invariants.md#invariant-3--shared-memory)
  — respected by *not* putting scratch data in it.
- [Invariant 5 — Cross-Surface Continuity](../01-constitution/01-the-eight-invariants.md#invariant-5--cross-surface-continuity)
- [Invariant 7 — Backward Compatibility Where Practical](../01-constitution/01-the-eight-invariants.md#invariant-7--backward-compatibility-where-practical)
  — additive table, additive request fields, nothing on the transcript's path
  changed.
- [Invariant 8 — Security and Explicit Permissions](../01-constitution/01-the-eight-invariants.md#invariant-8--security-and-explicit-permissions)
- [Data and Storage](../02-specification/10-data-and-storage.md) — the no-silent-fallback
  rule the honesty notices implement.
- [Memory Architecture](../02-specification/03-memory-architecture.md) — the
  write-time capacity discipline, and the line this store stays on the far side of.
- [Safety and Permissions](../02-specification/07-safety-and-permissions.md) — why
  a persisted prelude is a standing authority.
- [Observability and Provenance](../02-specification/11-observability-and-provenance.md)
- [RFC-0004: Cross-Surface Continuity Protocol](../04-rfcs/0004-cross-surface-continuity-protocol.md)
  — the versioning and provenance requirements, one of which this table meets and
  one of which it consciously does not.
- [ADR-0002: Memory belongs to Luca](0002-memory-belongs-to-luca.md)
- [ADR-0007: Write-time memory capacity](0007-write-time-memory-capacity.md) — the
  same bounded-at-the-write reasoning, applied to a different store.
- [ADR-0009: Unconditional permission gate](0009-unconditional-permission-gate.md)
  — the per-call approval a stored prelude would have outlived.
- [ADR-0015: The session transcript is server-side and append-only](0015-server-side-session-transcript.md)
  — the session id this state is keyed by, and the append-only rule this table is
  the deliberate exception to.
