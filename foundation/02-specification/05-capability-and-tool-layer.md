# Capability and Tool Layer

> How Luca acts on and observes the world through Tools, how those Tools are
> declared, dispatched, and secured, and how higher-level Skills sit above them.
> Tools are tools, not destinations.

This chapter specifies the capability layer: the central Tool registry, the
function-call dispatch loop that executes model-requested Tools during a turn,
the distinction between primitive [Tools](../GLOSSARY.md) and learned
[Skills](../GLOSSARY.md), MCP client integration, and where Computer-Use fits. It
depends on [Provider Abstraction](04-provider-abstraction.md) upstream (Tool
calls arrive as internal `ToolCall`s) and feeds
[Safety and Permissions](07-safety-and-permissions.md) downstream (every gated
Tool passes the permission gate before it runs). It is honest about the gap
between how many Tools are _declared_ and how many are actually _live_.

## Tools are tools, not destinations

The manifesto's organizing claim is that
[applications are tools, not destinations](../00-manifesto/02-what-luca-is-and-is-not.md):
the user interacts with Luca, and Luca reaches for an application when a task
needs it. The capability layer is where that claim becomes architecture. A Tool
is a capability Luca can invoke — web search, file I/O, a shell command, browser
control, a message send, a Provider's function. The user does not "open" a Tool.
Luca calls it on the user's behalf, under the permissions the
[Constitution](../01-constitution/04-trust-and-permissions.md) demands, and folds
the result back into a single continuous turn.

This framing has a direct consequence for design: no Tool is allowed to become a
place the user lives. Computer-Use, discussed below, is the sharpest test of that
rule.

## The Tool registry

LucaOS declares roughly **302 Tools** as Google GenAI `FunctionDeclaration`
schemas, organized by category under `src/tools/definitions/` — files such as
`crypto.tools.ts`, `hacking.tools.ts`, `trading.tools.ts`, `communication.tools.ts`,
`network.tools.ts`, `system.tools.ts`, `vision.tools.ts`, and more. A
`FunctionDeclaration` is the vendor-neutral schema — a name, a description, and a
typed parameter shape — that the [Adapter](04-provider-abstraction.md) renders
into each Provider's native function-calling format. Declaring Tools in this one
schema is what keeps the Tool layer above the provider boundary: a Tool is
described once and works through every Adapter.

All declarations register through a central `toolRegistry`
(`src/services/toolRegistry.ts`). Each registered entry is a `ToolEntry`:

```typescript
// Illustrative — the real type lives in src/services/toolRegistry.ts
export interface ToolEntry {
  category: ToolCategory;          // CORE, FILES, NETWORK, HACKING, CRYPTO, ...
  tool: FunctionDeclaration;       // the vendor-neutral schema
  keywords: string[];              // for capability search / JIT selection
  securityLevel: SecurityLevel;    // 0 none → 3 dual  (see chapter 07)
  missionScope: MissionScope;      // FILE / FINANCE / SOCIAL / SYSTEM / ...
  isConcurrencySafe: boolean;      // may this run in a parallel wave?
  skillSets?: string[];            // capability bundles this Tool belongs to
  handler?: (args: unknown, context: unknown) => Promise<string>;
}
```

The registry is the single place that knows a Tool's schema, its security
posture, whether it can run concurrently, and — if one exists — the handler that
actually performs it. Registration also derives a `securityLevel` and
`missionScope` for every Tool by a fixed precedence: an explicit per-Tool config
wins; otherwise a **category security floor** applies; otherwise the Tool
defaults to the lowest level. That precedence is the subject of
[Safety and Permissions](07-safety-and-permissions.md#category-security-floors)
and is only summarized here.

### The honest reality: declared is not live

The `handler` field is optional, and that optionality is load-bearing honesty. A
large number of the ~302 declared Tools are **schemas without live handlers** —
Luca can describe the capability to a model, but no code yet performs it end to
end. This is the [two-generation](../06-roadmap/README.md) shape the
[CLAUDE.md operating instructions](../CLAUDE.md) warn about: never infer that a
capability works from the fact that it is declared, or that a module works from
the fact that it is well-tested. Before trusting a Tool, confirm it has a handler
and that a live path invokes it.

The Foundation states the target — a Tool declared is a Tool that works, gated
and provenanced — while the codebase is honest that many declarations are ahead
of their handlers. Closing that gap, category by category, is roadmap work, not a
thing to paper over in prose.

## The function-call dispatch loop

A turn is driven by the [Runtime's](01-persistent-runtime.md) turn loop
(`src/services/turns/TurnRunner.ts`), which exists in a streaming and a
non-streaming variant. Both follow the same shape: stream from the active
Provider, collect any Tool calls the model emits during the segment, execute them
after the segment in concurrency-safe batches, feed the results back into the
conversation, and repeat until the model stops calling Tools — bounded by a
shared cap.

```mermaid
flowchart TD
  Start(["Turn begins"]) --> Stream["Stream a segment from<br/>the active Provider"]
  Stream --> Calls{"toolCalls in<br/>this segment?"}
  Calls -->|no| Done(["Append final model<br/>message · end turn"])
  Calls -->|yes| Batch["executeBatch(toolCalls)"]
  Batch --> Feed["Append each result as a<br/>tool message to history"]
  Feed --> Cap{"tool rounds<br/>≥ MAX_TOOL_ROUNDS?"}
  Cap -->|yes| Stop(["Append 'reached tool limit'<br/>notice · end turn"])
  Cap -->|no| Stream
```

Two properties of this loop matter.

**It is bounded.** Both variants share a `MAX_TOOL_ROUNDS` cap (10). When the cap
is reached, the turn does not loop forever chewing through Tool calls; it appends
an explicit notice ("reached the tool limit for a single turn") and closes the
turn with a model message so history never ends on a dangling tool result that
the next turn would resume mid-exchange. An uncapped agentic loop is a known
failure class — a model that keeps calling Tools indefinitely — and the cap is
the backstop against it.

**Execution is concurrency-safe by construction.** The executor
(`streamingToolExecutor.ts`) does not simply fire every Tool call in parallel. It
groups the batch into waves using each Tool's `isConcurrencySafe` flag:

- Tools marked concurrency-safe run together in a concurrent wave
  (`Promise.all`).
- A Tool that is _not_ concurrency-safe runs alone, sequentially, so it cannot
  interleave with another side-effecting operation.

```mermaid
flowchart LR
  In["toolCalls[]"] --> Split{"isConcurrencySafe?"}
  Split -->|safe| Wave["Concurrent wave<br/>Promise.all(...)"]
  Split -->|not safe| Seq["Sequential — one at a time"]
  Wave --> Out["ToolResult[]"]
  Seq --> Out
```

This is what "execute in concurrency-safe batches" means concretely: read-only
searches can fan out and finish fast, while a write to the filesystem or a shell
command is serialized so two side effects never race. The default when a Tool is
not explicitly marked is _not_ safe — omission fails toward serialization, the
conservative direction.

## Tools versus Skills

The Glossary draws the line: **Tools are primitive verbs; Skills are learned
competencies.** A Tool does one bounded thing — read a file, send a message,
fetch a URL. A [Skill](../GLOSSARY.md) is a higher-level, reusable procedure Luca
can acquire, improve, and invoke — a competence composed from Tools and judgment,
not a single call.

In the current implementation the seam between the two appears as **skill sets**:
registration tags each Tool into capability bundles (`skillSets` on `ToolEntry`,
derived by an `inferSkillSets` step) such as `FINANCE`, `CORE_FILES`,
`SYSTEM_ADMIN`, `COMMUNICATION`, and `AGENCY_EVOLUTION`. These bundles are how
Luca selects a relevant slice of the ~302 Tools for a given task rather than
presenting all of them to the model at once — just-in-time capability selection.
The bundles are the scaffolding on which richer, learned Skills are meant to sit;
the full Skill lifecycle (acquire, evaluate, improve) is a target the
[Roadmap](../06-roadmap/README.md) carries, and the Foundation should not
describe it as finished. What is real today is the registry, the categories, and
the skill-set tagging that groups Tools into competencies.

## MCP client integration

LucaOS is a functional **Model Context Protocol client**
(`src/services/mcpClientManager.js`), which means external MCP servers can expose
their own Tools into Luca's registry. Two transports are supported, matching the
MCP SDK:

- **stdio** — a local server launched as a subprocess, spoken to over standard
  in/out. Used for tools that run on the same machine.
- **SSE** — a server reached over HTTP with server-sent events. Used for remote
  or networked MCP servers; an `http://` or `https://` identifier is treated as
  SSE.

An MCP-provided Tool is not a privileged special case. Once discovered, it flows
through the same registry, the same dispatch loop, and — critically — the same
security model as a built-in Tool. An external server cannot smuggle in an
ungated capability, because gating is applied at registration by category floor
and per-Tool config, not by trusting the source.

## Computer-Use is one Tool among many

[Computer-Use](../GLOSSARY.md) — operating a graphical computer as a human would,
through screen, mouse, and keyboard — is present in LucaOS (via the computer and
native-control services) as **one interchangeable Tool among many, not the
product.** This is a deliberate stance. It would be easy to let a capability this
visible become the thing Luca _is_ — a screen-driving robot the user watches. The
manifesto's test forbids it: anything that turns Luca into a destination the user
opens is drifting away from Presence.

So Computer-Use registers like any other Tool, carries a security level and
mission scope like any other Tool, and is dispatched through the same loop like
any other Tool. Luca reaches for it when a task genuinely requires driving a GUI,
and reaches for a narrower, safer Tool when one exists. It is a verb in Luca's
vocabulary, not Luca's identity.

## The security model, in brief

Every Tool carries a `SecurityLevel` (0 none → 3 dual) and a `MissionScope`, and
dangerous categories carry a **security floor** so that a Tool cannot register
ungated merely because someone forgot a config entry. That floor-plus-scope model
is the whole subject of [Safety and Permissions](07-safety-and-permissions.md);
here it is enough to state the boundary: the Tool layer _declares and dispatches_
capabilities, and the safety layer _decides whether each dispatch is allowed to
proceed_. The dispatch loop does not run a gated Tool until the gate resolves,
and the gate resolves on an operator decision, never on anything in the
transcript.

## See also

- [Safety and Permissions](07-safety-and-permissions.md) — the gate every side-effecting Tool passes
- [Provider Abstraction](04-provider-abstraction.md) — where `ToolCall`s come from and go back
- [Persistent Runtime](01-persistent-runtime.md) — the turn loop that hosts the dispatch loop
- [What Luca Is and Is Not](../00-manifesto/02-what-luca-is-and-is-not.md) — tools, not destinations
- [Invariant 6 — Strong Typing and Modularity](../01-constitution/01-the-eight-invariants.md#invariant-6--strong-typing-and-modularity) — why the dispatch loop must not become a god-module
- [Roadmap](../06-roadmap/README.md) — closing the declared-vs-live Tool gap and the Skill lifecycle
