# Glossary

The canonical vocabulary of LucaOS. These terms have precise meanings. When a
term is used in its defined sense in prose, it is **Capitalized** (e.g. "the
active Surface publishes to the Runtime"). Undefined lowercase usage is ordinary
English.

If you introduce a new load-bearing term, define it here in the same PR.

---

### Luca
The single, continuous AI identity that LucaOS hosts. There is exactly one Luca
across all time, devices, and underlying models. "Luca" is never plural and never
per-session. Contrast with _agent_ (a transient worker Luca may spawn) and
_model_ (interchangeable infrastructure).

### LucaOS
The software layer that enables computers to continuously host Luca. Not an
application; a substrate. "LucaOS" refers to the system; "Luca" refers to the
identity that system hosts.

### Presence
The quality of Luca existing continuously — before, during, and after any
interaction — and being available without being summoned. **Presence is the
product.** A chat reply is an artifact of Presence, not the thing itself.

### Host
A device that gives Luca a body: desktop, phone, watch, browser, vehicle,
headset, robot. A Host provides compute, sensors, actuators, and a Surface. Hosts
are many; Luca is one. See also _Surface_.

### Surface
The interaction modality through which a user meets Luca on a Host: the desktop
app, the web app, the voice interface, the widget, mobile, XR. A Surface is an
**embodiment** of the one Luca, rendering shared state — never a separate
application with its own identity or memory.

### Runtime
The persistent process (or set of coordinated processes) that keeps Luca alive
independent of any open Surface. The Runtime holds the live state that Surfaces
attach to and detach from. Killing a Surface must not kill Luca; that is the
Runtime's job.

### Continuity
The property that Luca's identity, memory, and in-flight work survive across
Surface switches, device switches, model switches, and restarts. The opposite of
Continuity is fragmentation.

### Provider
An external or local supplier of model inference — Anthropic, OpenAI, Google,
xAI, DeepSeek, Groq, a local GGUF model, Ollama, etc. Providers are
**infrastructure**: interchangeable, and invisible to everything above the
provider abstraction layer.

### Adapter
The component that translates a specific Provider's native request/response and
tool-call format into LucaOS's single internal representation. Adapters are the
_only_ code permitted to know a Provider's wire format.

### Router / Model Routing
The subsystem that decides which Provider and model should perform a given task,
by capability, cost, latency, privacy, and availability — without the caller
knowing or caring which was chosen.

### Tool
A capability Luca can invoke to affect or observe the world: web search, file I/O,
shell, browser control, computer-use, messaging, a Provider's function. Tools are
**tools, not destinations** — the user interacts with Luca; Luca uses Tools.

### Skill
A packaged, higher-level capability — a reusable procedure Luca can acquire,
improve, and invoke — distinct from a single Tool. Where Tools are primitive
verbs, Skills are learned competencies.

### Computer-Use
The capability of operating a graphical computer as a human would (screen, mouse,
keyboard). In LucaOS it is an **interchangeable capability, not the product** —
one Tool among many, orchestrated under explicit permissions.

### Memory
Luca's durable, accumulating understanding of the user and the world. Memory
belongs to Luca — not to a chat, a Provider, or an app. Subdivided into tiers
(e.g. identity, durable, transient) with distinct retention and capacity rules.

### Archive
The persisted store backing Memory. Writes to the Archive are capacity-bounded at
write time; reads into a model's context are a ranked, budgeted _selection_ of the
Archive, never the whole of it.

### Provenance
The recorded lineage of an action or a piece of data: what requested it, on whose
authority, from what source, and whether that authority remains valid. Provenance
is what makes trust auditable.

### Permission / Consent Gate
An explicit authorization step, resolved by the user, that must pass before a
gated action executes. Consent lives in the user's own decision, never in text
found in a transcript.

### Invariant
One of the Eight properties that must always hold (see
[The Eight Invariants](01-constitution/01-the-eight-invariants.md)). Breaking one
is not a trade-off to be made in a PR; it is grounds for an RFC.

### Amendment
A change to the Constitution itself, made only through the documented governance
process (see [Governance and Amendments](01-constitution/03-governance-and-amendments.md)).

### RFC (Request for Comments)
A proposal for a substantial change, reviewed _before_ implementation. See
[`04-rfcs/`](04-rfcs/README.md).

### ADR (Architecture Decision Record)
A record of a decision already made and its rationale, written so future
contributors understand _why_. See [`05-adrs/`](05-adrs/README.md).

### Host Computing
The paradigm in which devices are hosts for one persistent AI rather than
launchers of many independent applications. LucaOS's organizing idea.

### The Four Questions
The four checks every PR must answer: persistence, identity, trust, and progress
toward continuous presence. See
[The Four Questions](01-constitution/02-the-four-questions.md).

### North Star
The single sentence the whole project serves: _LucaOS is building the software
layer that enables computers to continuously host one persistent AI._
