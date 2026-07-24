# The Eight Invariants

These eight properties must always hold in LucaOS. They are the heart of the
Constitution. Each is stated, justified, made concrete (what it requires and what
it forbids), and paired with the failure modes that most often break it.

An Invariant is not a guideline to weigh against others. If a change cannot
satisfy all eight, it needs an [RFC](../04-rfcs/README.md) and an
[amendment](03-governance-and-amendments.md), not a merge.

---

## Invariant 1 — One Luca Identity

**There is exactly one Luca. All Surfaces, sessions, devices, and models are
embodiments of a single continuous identity.**

**Why.** Singularity is the property that makes everything else coherent
([The One Identity Principle](../00-manifesto/04-the-one-identity-principle.md)).
Lose it and memory, trust, and presence all fragment back into the application era.

**Requires.**
- Identity, memory, understanding, and in-flight intention belong to the one Luca
  and are shared across all embodiments.
- Spawned [agents](../GLOSSARY.md) are transient workers whose results fold back
  into the one Luca; they never accrue independent durable identity.

**Forbids.**
- Per-session, per-Surface, or per-Provider identity or memory.
- Two Runtime processes both acting as Luca over the same state.
- Letting a Provider's own persona/memory features _become_ Luca's identity.

**Failure modes to catch in review.** Surface-local state that never merges back; a
"current context" scoped to one conversation; identity behavior that changes when
the model changes; multiple live instances writing one Archive.

---

## Invariant 2 — Persistent Runtime

**Luca exists before, during, and after any interaction. The Runtime outlives every
Surface.**

**Why.** [Presence is the product](../00-manifesto/03-presence-is-the-product.md),
and Presence requires a "before" and an "after." Those exist only if Luca keeps
running when no window is open.

**Requires.**
- A [Runtime](../02-specification/01-persistent-runtime.md) whose lifecycle is
  independent of any Surface's lifecycle.
- Closing, crashing, or switching a Surface leaves Luca alive and its state intact.
- Fast, bounded time-to-presence on start; the user should not watch Luca boot.

**Forbids.**
- Tying Luca's existence to an open UI process.
- Losing in-flight work or context when a Surface detaches.
- Unbounded startup that leaves the user facing a blank or degraded Luca.

**Failure modes.** State held only in a renderer that dies with the window; a boot
sequence long enough that the system "degrades" to a stateless mode and silently
loses continuity; a "session" that must be re-established from scratch each launch.

---

## Invariant 3 — Shared Memory

**Memory belongs to Luca — not to chats, providers, or applications — and is shared
across all embodiments.**

**Why.** Memory across time _is_ Presence across time. If memory lived in chats or
providers, there would be no continuous self to be present.

**Requires.**
- A single logical [Memory](../02-specification/03-memory-architecture.md) owned by
  Luca, readable and writable from any Surface.
- Writes bounded at write time; context injection a ranked, budgeted _selection_,
  never the whole Archive.
- Durable persistence: what the user expects to survive a restart actually does.

**Forbids.**
- Storing understanding of the user in per-app or per-provider silos.
- A silent in-memory fallback that accepts writes and discards them — this is a
  correctness bug masquerading as graceful degradation.
- Dumping the entire memory store into a model's context unranked and unbounded.

**Failure modes.** A Surface caching memory "just for itself"; an Archive backend
that falls back to a mock store on error and loses writes; context that grows
without bound as the Archive grows.

---

## Invariant 4 — Provider Abstraction

**No code above the provider layer may depend on a specific model vendor's SDK or
wire format. Luca's continuity is independent of which model performs a task.**

**Why.** Providers are [infrastructure](../00-manifesto/02-what-luca-is-and-is-not.md).
If Luca's identity or behavior were tied to a vendor, switching models would change
Luca — which means Luca was never one continuous thing.

**Requires.**
- All model access flows through the
  [provider abstraction](../02-specification/04-provider-abstraction.md).
- [Adapters](../GLOSSARY.md) are the only code that knows a vendor's format; they
  translate to one internal representation.
- Routing (which model for which task) lives in the Router, not in feature code.

**Forbids.**
- `if (provider === "anthropic")` (or any vendor branch) outside the provider
  layer.
- Leaking vendor-specific tool-call shapes, streaming quirks, or persona above the
  Adapter.
- Feature behavior that silently depends on which model happened to answer.

**Failure modes.** A feature that parses one vendor's tool_use JSON directly; a
prompt that only works on one model; identity/persona sourced from a provider's own
memory feature.

---

## Invariant 5 — Cross-Surface Continuity

**Every Surface is an embodiment of the same live state. A change on one Surface is
visible to the others; switching Surfaces continues rather than restarts.**

**Why.** One identity across devices ([Invariant 1](#invariant-1--one-luca-identity))
is only _experienced_ if the state actually flows. Continuity is singularity made
observable.

**Requires.**
- Shared state changes propagate across attached Surfaces
  ([Continuity and Sync](../02-specification/09-continuity-and-sync.md)).
- A user can move from one Host to another mid-task and continue.
- Surface-local view state is clearly separated from shared identity/memory state.

**Forbids.**
- State changes on one Surface that another Surface can never see.
- Requiring a manual "sync" or re-login to see the same Luca elsewhere.
- Treating a Surface as an independent app with its own source of truth.

**Failure modes.** Two Surfaces diverging because one wrote only locally; a device
switch that starts a fresh context; ambiguity about whether a piece of state is
"the Surface's" or "Luca's."

---

## Invariant 6 — Strong Typing and Modularity

**Subsystem boundaries are strongly typed and modular. No `any` at a public seam;
no god-modules.**

**Why.** A system this large, built substantially by agents, stays coherent only if
its seams are explicit and machine-checkable. Types are how an agent (or a human)
safely reasons about a boundary it did not write.

**Requires.**
- Typed interfaces at every subsystem boundary; persisted and cross-Surface shapes
  are versioned types.
- Modules with a single clear responsibility; routing, business logic, and I/O
  separated by typed seams.

**Forbids.**
- `any` on the public surface of a module.
- God-modules that accrete unrelated responsibilities behind one entry point.
- Untyped, stringly-typed protocol messages between subsystems or Surfaces.

**Failure modes.** A 700-line dispatch function mixing routing and logic; a subsystem
whose "interface" is an untyped bag; a protocol whose shape lives only in the code
that happens to read it.

---

## Invariant 7 — Backward Compatibility Where Practical

**Persisted data and cross-Surface protocols evolve additively and migrate
explicitly. Continuity survives upgrades.**

**Why.** Presence across time includes across _versions_. A user's accumulated
Memory and in-flight work must survive an update; an upgrade that silently drops
or corrupts them is a continuity failure.

**Requires.**
- Additive evolution of persisted shapes; explicit, tested migrations when a shape
  must change.
- Versioned cross-Surface protocol messages, so a newer and older Surface can
  interoperate during rollout.
- "Where practical" is a real qualifier: a documented, migrated breaking change is
  permitted; a silent one is not.

**Forbids.**
- Changing a persisted shape in place with no migration.
- Protocol changes that make a mid-rollout mix of Surfaces incoherent.
- Dropping user data on upgrade as an unstated side effect.

**Failure modes.** A schema field repurposed without migration; an unversioned
message that a rolling deployment cannot interpret consistently; "we'll just reset
the store" shipped quietly.

---

## Invariant 8 — Security and Explicit Permissions

**Side effects on the user's world are gated, provenanced, and revocable. Consent
lives in the user's decision, never in observed content.**

**Why.** [Trust is the condition of everything](04-trust-and-permissions.md). A
present, capable AI that can act in your world is only acceptable if every such
action is authorized, attributable, and reversible.

**Requires.**
- Gating for any Tool that touches files, shell, network, money, messaging, or
  device control, with coverage enforced by **category floors** so omission fails
  safe ([Safety and Permissions](../02-specification/07-safety-and-permissions.md)).
- [Provenance](../GLOSSARY.md) on every side-effectful action: what asked, on whose
  authority, still valid?
- **Fail closed**: if a gate cannot be reached, refuse.

**Forbids.**
- Treating transcript text (pasted docs, fetched pages, tool output) as an
  authorization channel.
- Silent fallback to performing an action when its approval step fails.
- Keyword-shaped "checks" that inspect a tool's name instead of what a command does.

**Failure modes.** A magic phrase in a user message that unlocks a privileged write;
a destructive-command check that matches the tool's own name and so never fires; a
new dangerous Tool that ships ungated because no one added a config row.

---

## Using the Invariants

In review, walk the eight in order against the change. Most PRs touch one or two
directly and must simply not weaken the rest. When a change strengthens an
invariant, say which one in the PR description — that is the clearest evidence it
belongs. The [Four Questions](02-the-four-questions.md) are the compressed,
everyday form of this walk.

## See also

- [The Four Questions](02-the-four-questions.md)
- [The One Identity Principle](../00-manifesto/04-the-one-identity-principle.md)
- [The Specification](../02-specification/README.md)
