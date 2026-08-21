# ADR-0015: The session transcript is server-side and append-only

## Status

Accepted

## Context

Luca's conversation is what Luca did. It is the record of which tools ran, on
whose instruction, and what came back — the ground truth a later turn reasons
from and the thing continuity across a restart actually means. Before this
decision, that record was written **three times, in three places that disagreed**:

| Store | What it held | How it lied |
|---|---|---|
| React state mirrored to `localStorage["LUCA_CHAT_HISTORY_V1"]` | UI messages, last 50, images stripped | Flat text. The UI's `Message` type has **no field for a tool call**, so a tool-using turn cannot be represented in it at all. |
| `lucaService.localHistory` | The real provider-shaped history, tool structure intact | **Never persisted.** It died with the renderer process. |
| The Chroma vector index, via `conversationService` | `{text, sender}` embeddings | Unordered, untyped, lossy — an excellent retrieval index and a poor transcript. |

On restart, chat initialization rebuilt the model's history from the **third** of
those. Four things were wrong with that path, and each of them was a separate way
for Luca to be confidently wrong about its own past:

1. **Capped at twenty messages.** Anything older was gone, silently.
2. **Tool structure destroyed.** The reconstruction kept only `role` and
   `content`; `toolCalls`, `toolCallId`, and the tool's name were dropped. Luca
   could not see what it had actually _done_ — only that it had said something
   about it.
3. **Every role coerced to `user` or `model`.** A tool result came back as though
   the user had typed it. This is not merely lossy: the provider layer's contract
   is that a tool result is a distinct role, and text attributed to the user is
   text Luca has reason to trust differently.
4. **Not in chronological order.** The fallback sorted newest-first and handed the
   slice back as "history."

Two further defects fell out of the same reconstruction. Changing device type
replaced a live, mid-conversation history with those twenty flattened rows; and
any settings or persona change routed the live history back through the
flattening map. So the problem was not "persistence is missing from a working
store." **The store could not structurally represent a turn.**

Three constraints shaped where the fix could live.

**A renderer-local store degrades silently.** The turn loop runs in the renderer,
and `vite.config.ts` aliases `node:sqlite` to `src/mocks/browser_node_sqlite.ts`,
which throws by design. Callers wrap that construction in `try/catch` and fall
back to an in-memory mock: `CheckpointManager.ts` catches the throw and installs
a store whose `run()` returns `{changes: 0}` — a store that accepts every write
and keeps none. That is the exact failure
[ADR-0004](0004-node-sqlite-over-better-sqlite3.md) was written to eliminate,
still live in the renderer.

**A per-surface store fractures the one Luca.** A transcript in renderer
IndexedDB is state that exists once per surface. Two surfaces would hold two
divergent accounts of the same conversation, and no third party could reconcile
them. Session identity was already drifting this way: a renderer-minted
`session_${Date.now()}` string means every reload begins a new "session" that
nothing else can join.

**[RFC-0004](../04-rfcs/0004-cross-surface-continuity-protocol.md) makes two
things non-optional for durable state**, and each costs one column: persisted
shapes carry an explicit **version**, because they evolve additively and this
repository has no migration framework beyond `CREATE TABLE IF NOT EXISTS`; and
every state change carries **provenance** — which surface wrote it, on whose
authority. The same RFC draws a line this decision respects: a _checkpoint_ is
enough to resume a turn loop, and is explicitly "not a transcript to replay from
zero." This is the transcript, not the checkpoint.

## Decision

**We record the conversation as a single append-only entry log in the core
server's `node:sqlite` database, and make it the only source Luca's history is
rebuilt from.**

Concretely:

- **The store lives in the core server**
  (`cortex/server/services/sessionEntryStore.js`), on the same durable substrate
  as Memory, reached over four `/api/session` routes. The renderer holds no
  database.
- **Entries are typed and complete.** An entry carries its role
  (`user`/`model`/`tool`/`system`/`summary`), content, thought, tool name, tool
  call id, and the model's tool calls. Nothing about a turn is flattened away on
  the way to disk.
- **Order is the server's to assign.** Each entry gets a contiguous per-session
  `seq`; a caller-supplied `client_id` is unique per session, so a retried batch
  inserts nothing new instead of double-writing.
- **Append-only means append-only.** No method rewrites an entry's content and
  none deletes one. A context compaction is recorded as a **new**
  `role='summary'` entry; the rows it summarizes stay on disk. Hydration begins
  at the newest summary in range.
- **Every row carries `schema_version` and `surface`** — RFC-0004's versioning
  and provenance, one column each. `parent_seq` is in the schema from day one
  (`seq - 1` today) because the seam for rewind and branching cannot be added
  later without an `ALTER TABLE` this repository has no mechanism for.
- **The renderer talks to it through one typed client**
  (`src/services/session/sessionTranscript.ts`) that holds two properties above
  all others: it **never interferes with a turn** (appends are synchronous from
  the caller's view, queued, flushed one request at a time in order, retried with
  backoff, and never thrown into a turn), and it **never pretends a write
  succeeded** — once entries are backing up it says so loudly, and it reports a
  degraded server store rather than inferring health from a missing key.
- **Chat initialization hydrates from this log**, and the flattening
  reconstruction is deleted rather than bypassed. The hydrated history is
  budgeted to what compaction would keep and trimmed **forward** to a
  provider-legal boundary, using the same predicate compaction uses — a history
  may never _open_ on a tool result, and that rule now has exactly one
  definition.
- **The core owns session identity.** The id the transcript resolves is the id
  the memory graph's execution chain and Chroma's metadata also stamp. One Luca,
  one answer to "which session is this."

Chroma stays. It is genuinely good at retrieval, which is a different question
from "what happened, in order."

## Consequences

### Positive

- **A tool-using turn survives a restart intact.** This is the whole point.
  Luca can see what it did, not only what it said about it, which is
  [Invariant 3](../01-constitution/01-the-eight-invariants.md#invariant-3--shared-memory)
  applied to the conversation itself.
- **The silent-loss path is gone from the history write.** Nothing in the
  renderer opens a database, so nothing in the renderer can fall back to a mock
  that accepts writes and discards them. Failures surface as failures.
- **Three disagreeing accounts become one authority.** The remaining two stores
  are demoted to what they are good at: a UI mirror and a retrieval index.
  Neither is consulted for "what happened."
- **Session identity stops being per-surface.**
  [Invariants 1 and 5](../01-constitution/01-the-eight-invariants.md#invariant-1--one-luca-identity)
  strengthen: the id is core-assigned, so a second surface joins the same
  conversation instead of starting a parallel one.
- **Provenance and versioning are present before they are needed**, so the first
  cross-surface consumer does not have to retrofit them into rows already on
  disk.
- **Append-only makes the record auditable.** No code path can quietly revise
  history, which is the property that makes the log worth trusting as evidence of
  what Luca did.

### Negative

- **Writing history now depends on the core server being reachable.** When it is
  not, entries queue in memory and are reported as unpersisted; if the renderer
  dies before the core comes back, those entries are lost. The guarantee bought
  here is _never pretend a write succeeded_ — not _never lose a write_. A
  write-ahead spool on the renderer side would close that window and is not part
  of this decision.
- **Every append is now an HTTP round trip**, batched per tool round rather than
  per entry. That is more moving parts than a local `push`, and one more place a
  turn could be slowed by something unrelated to the model.
- **The log grows without bound.** Nothing prunes it, and compaction
  deliberately does not shrink it — the summary is an addition, not a
  replacement. Retention is deferred, and a long-lived database will need it.
- **Compaction's coverage is implicit.** Because a summary entry does not record
  which rows it covers, hydration can only start _at_ the newest summary. That
  keeps the renderer's indices decoupled from server `seq` values, at the cost of
  not being able to ask "what did this summary replace."
- **The UI still keeps its own mirror.** `localStorage` remains the source for
  what the user sees, so two representations persist until the UI's message type
  grows tool fields. Until then the transcript is authoritative for the model and
  not yet for the screen.
- **One more schema this repository cannot migrate.** `schema_version` records
  which shape a row is, but there is still no migration runner to act on it. The
  column makes the eventual migration possible; it does not make it exist.

## Alternatives considered

- **Renderer IndexedDB.** Available in the renderer, no server dependency, no
  round trip. Rejected on
  [Invariant 5](../01-constitution/01-the-eight-invariants.md#invariant-5--cross-surface-continuity):
  a store that exists once per surface means two surfaces holding two
  irreconcilable accounts of one conversation, which is precisely the per-surface
  state that fractures the one Luca. It also puts the transcript somewhere the
  memory graph and Cortex cannot read.
- **`node:sqlite` directly from the renderer.** Rejected: the vite alias makes
  the module throw, and the established response to that throw in this codebase
  is a mock store that discards writes (`CheckpointManager.ts`). Choosing this
  would mean either reproducing that hazard or special-casing the build to defeat
  a shim that exists for a reason.
- **Keep rebuilding history from the Chroma index, with the cap raised and the
  mapping fixed.** Rejected: no amount of raising the cap gives a vector index an
  order or a tool-result role. Embeddings are keyed by similarity; a transcript
  is keyed by time. Fixing the mapper would mean building an ordered log inside
  something that is not one.
- **Make `localStorage` the durable store and grow the UI's message type.** It
  would have been less code. Rejected: a 5 MB origin-scoped quota, no
  transactions, no query, and the same per-surface fracture as IndexedDB — plus
  the transcript would then be shaped by what the UI needs to render rather than
  by what the provider layer needs to replay.
- **A mutable transcript that compaction rewrites in place** (replacing
  summarized rows, or marking them `superseded_by`). Rejected: it makes the
  record revisable, which forfeits the audit property that is half the reason to
  keep it, and it would couple the renderer's history indices to server `seq`
  values for no gain. An addition is strictly cheaper than a rewrite and strictly
  more honest.
- **Move the turn loop into the core server**, so history is written where it
  lives and never crosses a boundary. Rejected as out of scope, not as wrong: it
  touches
  [Invariants 2 and 5](../01-constitution/01-the-eight-invariants.md#invariant-2--persistent-runtime)
  and needs a per-session lease and an RFC of its own. This decision is a
  prerequisite for it either way.
- **Do nothing.** Rejected: a Luca that cannot recall what it did last session,
  and reads its own tool results as though the user had said them, does not have
  the continuous identity the Constitution requires. It is not a tolerable steady
  state.

## Related

- [Invariant 2 — Persistent Runtime](../01-constitution/01-the-eight-invariants.md#invariant-2--persistent-runtime)
- [Invariant 3 — Shared Memory](../01-constitution/01-the-eight-invariants.md#invariant-3--shared-memory)
- [Invariant 5 — Cross-Surface Continuity](../01-constitution/01-the-eight-invariants.md#invariant-5--cross-surface-continuity)
- [Invariant 7 — Backward Compatibility Where Practical](../01-constitution/01-the-eight-invariants.md#invariant-7--backward-compatibility-where-practical)
- [Invariant 8 — Security and Explicit Permissions](../01-constitution/01-the-eight-invariants.md#invariant-8--security-and-explicit-permissions)
- [Data and Storage](../02-specification/10-data-and-storage.md)
- [Continuity and Sync](../02-specification/09-continuity-and-sync.md)
- [Memory Architecture](../02-specification/03-memory-architecture.md)
- [Observability and Provenance](../02-specification/11-observability-and-provenance.md)
- [RFC-0004: Cross-Surface Continuity Protocol](../04-rfcs/0004-cross-surface-continuity-protocol.md)
  — the versioning and provenance requirements this schema satisfies, and the
  checkpoint/transcript distinction it draws.
- [ADR-0002: Memory belongs to Luca](0002-memory-belongs-to-luca.md)
- [ADR-0004: `node:sqlite` over `better-sqlite3`](0004-node-sqlite-over-better-sqlite3.md)
  — the silent-fallback failure this decision keeps out of the renderer.
