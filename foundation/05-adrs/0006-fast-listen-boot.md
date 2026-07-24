# ADR-0006: Fast-listen boot

## Status

Accepted

## Context

[Presence](../GLOSSARY.md) requires that Luca exist before, during, and after any
interaction, and [Invariant 2](../01-constitution/01-the-eight-invariants.md#invariant-2--persistent-runtime)
adds a specific demand: "fast, bounded time-to-presence on start; the user should
not watch Luca boot." A [Runtime](../02-specification/01-persistent-runtime.md)
that takes a long time to become reachable is not merely slow — under the wrong
handling it silently damages continuity.

Here is how. When the Electron app launches, the renderer needs to reach the Node
core server (`server.js`). The core server's full startup is not cheap: it builds a
heavy route graph, wires up [Memory](../02-specification/03-memory-architecture.md),
the [tool registry](../02-specification/05-capability-and-tool-layer.md), cognition,
and Provider [Adapters](../GLOSSARY.md). The cold start was long enough that the
renderer's health check could **time out before the port ever bound**. When that
happened, the UI concluded the backend was unavailable and **degraded to a
stateless mode** — a Luca with no live Runtime behind it, no shared Memory, no
continuity. The user was shown something that looked like Luca but had lost the
"before."

This is the failure Invariant 2 names directly: "a boot sequence long enough that
the system 'degrades' to a stateless mode and silently loses continuity." The
degraded mode was meant as resilience; in practice it converted a slow boot into a
continuity break. The root cause was ordering: the port did not accept connections,
and `/api/health` did not answer, until _after_ the entire heavy route graph had
loaded. Health was gated behind everything expensive.

## Decision

**Bind the listening socket and serve `/api/health` before the heavy route graph
loads,** so the port is reachable and health answers within roughly a second of
spawn. The expensive subsystems then continue initializing behind that already-open
port.

```mermaid
sequenceDiagram
  participant R as Renderer
  participant S as Core server
  S->>S: bind socket + mount /api/health  (~1s)
  R->>S: GET /api/health
  S-->>R: 200 (reachable early)
  S->>S: load route graph, Memory, tools, adapters
  Note over R,S: UI stays in the live path; no stateless fallback
```

- **Listen first.** The server opens its socket and mounts a minimal health
  endpoint as one of the first things it does, before constructing the full route
  graph.
- **Health answers early.** The renderer's health check succeeds quickly, so it
  stays on the live, stateful path and never trips the stateless-degradation
  fallback on account of a slow-but-fine boot.
- **Heavy initialization proceeds behind the open port.** Memory, tools, cognition,
  and Adapters load after the socket is listening. Endpoints that depend on a
  subsystem still-loading report honestly (not-ready) rather than causing the whole
  Runtime to be judged absent.

The design separates "is the Runtime reachable?" from "is every subsystem warm?" so
that a normal cold start is never mistaken for an unavailable backend.

## Consequences

### Positive

- **Time-to-presence is fast and bounded.** The port binds and health answers in
  about a second, satisfying Invariant 2's explicit requirement and keeping the
  user out of a blank or degraded Luca during a normal boot.
- **The stateless-degradation trap is avoided for slow boots.** Because reachability
  no longer waits on the heavy route graph, an ordinary cold start does not get
  misclassified as "backend down," so the UI stays in the live path and continuity
  is preserved.
- **Clear separation of concerns.** "Reachable" and "fully warm" become distinct,
  observable states, which is better for
  [observability](../02-specification/11-observability-and-provenance.md) and for
  reasoning about startup than a single all-or-nothing readiness flag.

### Negative

- **A window of partial readiness now exists and must be handled.** Between socket-
  bind and full warm-up, some subsystems are not ready. Endpoints and the renderer
  must handle "reachable but this subsystem is still loading" explicitly, rather
  than assuming that a bound port implies a fully functional server.
- **Health can be shallow.** A liveness endpoint that answers before subsystems load
  says "reachable," not "healthy." If it is treated as a full readiness signal, it
  can mask a subsystem that failed to initialize. The health surface must
  distinguish liveness from readiness to avoid a new blind spot.
- **More careful ordering to maintain.** Contributors must preserve the property
  that nothing expensive sneaks in front of the listen/health step, or the original
  regression returns. This is an ordering discipline that must be kept in future
  changes to `server.js` startup.

## Alternatives considered

- **Just make the whole boot faster.** Optimize the route-graph and subsystem
  construction so the full server comes up within the health timeout. Rejected as
  the primary fix: worthwhile but insufficient and fragile. Cold-start cost grows as
  the system grows; a design that keeps reachability independent of total warm-up
  cost is durable, whereas an optimization race against the timeout is not. (Boot
  performance work continues on the [Roadmap](../06-roadmap/README.md), but it is
  not what guarantees presence.)
- **Raise the renderer's health-check timeout.** Give the boot more time before the
  UI concludes the backend is down. Rejected: it trades a fast wrong answer for a
  slow one — the user waits longer staring at a not-yet-present Luca — and it still
  breaks whenever a boot exceeds the (now longer) timeout. It treats the symptom,
  not the ordering cause.
- **Remove the stateless-degradation fallback entirely.** If it causes continuity
  breaks, delete it. Rejected: a genuine backend outage still needs a defined,
  honest behavior; the problem was not that a fallback exists but that a healthy
  slow boot triggered it. Fixing the trigger (serve health early) is the right cut.
- **Do nothing.** Rejected: silently degrading to a stateless Luca on a normal cold
  start is a direct Invariant 2 failure and a visible break in Presence.

## Related

- [Invariant 2 — Persistent Runtime](../01-constitution/01-the-eight-invariants.md#invariant-2--persistent-runtime)
- [Persistent Runtime](../02-specification/01-persistent-runtime.md)
- [Presence Is the Product](../00-manifesto/03-presence-is-the-product.md)
- [Observability and Provenance](../02-specification/11-observability-and-provenance.md)
- [ADR-0005: Ephemeral ports and a single-instance lock](0005-ephemeral-ports-and-single-instance.md)
