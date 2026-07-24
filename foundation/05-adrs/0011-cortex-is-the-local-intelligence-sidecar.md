# ADR-0011: "Cortex" names the local-intelligence sidecar, not the reasoning brain

## Status

Accepted

## Context

The word **Cortex** carries two incompatible meanings across LucaOS's
documentation, and the collision is load-bearing enough to mislead anyone reading
across the two doc sets or reading the code.

The older established documentation — `docs/foundation/GLOSSARY.md` — defines Cortex
as **the reasoning/planning/routing brain**: the top of the layer map, the seat of
Luca's cognition. Under that reading, "the Cortex decides" means "Luca thinks."

The code, and the newer Foundation, use the word for something else entirely. In the
shipped topology the Cortex is the **optional Python local-intelligence sidecar**: a
FastAPI/uvicorn process the [Host](../GLOSSARY.md) spawns alongside the Node core,
owning local GGUF inference, LightRAG retrieval, Whisper speech-to-text, Piper/Kokoro
text-to-speech, vision, and a set of privilege-gated OSINT/pentest tools. It lives at
`cortex/python/`, is reached over an ephemeral localhost HTTP boundary, and is
explicitly **not** where identity or the [Archive](../GLOSSARY.md) live — those belong
to the core. The [Cortex chapter](../02-specification/08-cortex-and-local-intelligence.md)
specifies this sense, and the [Crosswalk](../CROSSWALK.md) records the collision as
one of four terms that mean different things across the two doc sets.

Both meanings cannot stand. A contributor who reads "Cortex" as the reasoning brain
will look for Luca's cognition inside a Python process that is, by design, an
_optional_ and _absent-tolerant_ accelerator — and will draw exactly the wrong
conclusions about where reasoning happens, what must never live in the sidecar, and
what degrades when the sidecar is gone. The turn loop and the mental-state model that
actually drive Luca's thinking live in the Node core
([Persistent Runtime](../02-specification/01-persistent-runtime.md)), not in the
Cortex. Calling the sidecar "the brain" invites someone to move brain-like
responsibilities into it, which would violate
[Invariant 1](../01-constitution/01-the-eight-invariants.md#invariant-1--one-luca-identity)
(one identity, owned by the Runtime) and
[Invariant 3](../01-constitution/01-the-eight-invariants.md#invariant-3--shared-memory)
(one owner of durable memory).

## Decision

**"Cortex" canonically means the optional Python local-intelligence sidecar.** This
matches the code and the Foundation specification. The older
`docs/foundation/GLOSSARY.md` meaning — "Cortex = the reasoning brain" — is
**superseded**. It is not adopted into the Foundation, and where the old glossary is
stubbed toward the Foundation it will carry the corrected definition.

Concretely:

- The canonical definition of Cortex is the one in the
  [Cortex chapter](../02-specification/08-cortex-and-local-intelligence.md): a
  discovered, optional, absence-tolerant capabilities process reached over an HTTP
  boundary, holding no identity and owning no durable memory.
- Luca's reasoning, turn loop, and mental state are described as living in the
  **Runtime / core**, never "in the Cortex."
- Documents that need a word for the cognitive tier use "the Runtime," "the turn
  loop," or "reasoning," not "Cortex."

## Consequences

### Positive

- **The word matches the code.** A contributor grepping for `cortex/` finds the
  Python sidecar, and the docs now describe that same thing. The single most confusing
  term in the crosswalk stops sending readers to the wrong process.
- **A dangerous refactor is discouraged by vocabulary.** Because "Cortex" no longer
  means "brain," no one is nudged toward relocating identity, memory, or the turn
  loop into the optional sidecar — a move that would break singularity and the
  single-owner-of-memory invariant. The naming now defends the architecture.
- **Degradation reasoning becomes coherent.** The Cortex is allowed to be absent; the
  chapter's graceful-degradation contract only makes sense if "Cortex" is a
  capability accelerator, not the seat of cognition. Fixing the name makes the
  degradation story internally consistent.

### Negative

- **Historical links break their intent.** Any older document, comment, issue, or
  commit that says "Cortex" meaning "the reasoning brain" is now using a superseded
  sense. Those references are not automatically corrected; a reader of old material
  must know the term was redefined. This ADR and the [Crosswalk](../CROSSWALK.md) are
  the record that lets them recover the original intent.
- **A term is spent.** LucaOS no longer has a short, evocative single word for the
  cognitive tier — "Cortex" is taken by the sidecar. Prose must use the plainer
  "Runtime / reasoning / turn loop." That is a small loss of rhetorical convenience,
  accepted in exchange for matching the code.

## Alternatives considered

- **Keep "Cortex = the reasoning brain" and rename the Python sidecar.** Rejected: the
  code, the process name, the directory (`cortex/python/`), and the running system all
  call the sidecar "Cortex." Renaming shipped code and its topology to free up a word
  for the docs inverts the cost — the docs should track the code, not the reverse.
  This is the same principle as the [Crosswalk](../CROSSWALK.md) naming policy: prefer
  the name the code already uses.
- **Let both meanings coexist, disambiguated by context.** Rejected: the two senses
  sit at opposite ends of the architecture (optional peripheral vs. central
  cognition). A term whose meaning flips depending on which document you are in is
  precisely the failure this reconciliation exists to remove.
- **Do nothing.** Rejected: the collision is already documented as high-risk in the
  [Reconciliation map](../RECONCILIATION.md); leaving it unresolved keeps a live trap
  for every future contributor and every agent reading the canon.

## Related

- [Cortex and Local Intelligence](../02-specification/08-cortex-and-local-intelligence.md) — the canonical definition
- [Persistent Runtime](../02-specification/01-persistent-runtime.md) — where reasoning actually lives
- [Crosswalk](../CROSSWALK.md) — the four term-collision resolutions
- [Naming reconciliation map](../RECONCILIATION.md) — section A, term collisions
- [Invariant 1 — One Luca Identity](../01-constitution/01-the-eight-invariants.md#invariant-1--one-luca-identity)
- [Invariant 3 — Shared Memory](../01-constitution/01-the-eight-invariants.md#invariant-3--shared-memory)
- [ADR-0014: Generic names bridged by a crosswalk](0014-generic-names-with-crosswalk.md)
