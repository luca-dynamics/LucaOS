# ADR-0017: Shared wire modules, per-edge clients

## Status

Accepted

## Context

[ADR-0003](0003-provider-abstraction-over-vendor-lockin.md) established that
Adapters are the only code allowed to know a vendor's format. It did not say what
happens when **two processes** each need one.

LucaOS has two. The renderer talks to vendors through
`src/services/llm/*Adapter.ts`; the Node core and its Cortex-side services talk to
them from `cortex/server/`. Before [RFC-0006](../04-rfcs/0006-core-resident-turn-loop.md)
Stage 2, the answer was duplication — and not the harmless kind:

- `cortex/server/services/tradingDebateService.js` — a **feature** service, well
  above any adapter — imported `@google/genai` and `@anthropic-ai/sdk`, resolved
  its own credentials, and branched on vendor inline. That is the literal shape
  Invariant 4 forbids.
- The renderer's own adapters carried each vendor mapping **twice**: once in
  `chat`, once in `chatStream`. `AnthropicAdapter` held two copies of a ~55-line
  message mapper; `GeminiAdapter` held two copies of a ~50-line `contents` builder
  and four copies of the thought-part scan.

A duplicated wire format is a slow-motion Invariant 4 breach. The copies do not
stay equal. Two copies of a vendor mapping that have drifted are precisely the
"Luca answers differently depending on which surface asked" failure ADR-0003
exists to prevent — arriving by neglect rather than by a vendor branch.

RFC-0006 makes this urgent rather than merely untidy. Stage 3 moves the turn loop
into the core, so the core will have to speak every vendor the renderer speaks.
Copying the renderer's adapters across the process boundary would double the wire
surface at the exact moment it stops being renderer-only.

One constraint shapes the whole decision: **the two processes do not run the same
SDKs.** `@anthropic-ai/sdk` (0.71.2) is shared. Gemini is not — the core uses
`@google/genai` 1.42.0, the renderer `@google/generative-ai` 0.24.1. Their request
shape is identical; their response extraction is not. Migrating one to the other
would mean swapping the SDK under Luca's **default brain**, which was considered
and deliberately kept out of this change.

## Decision

**Shared modules describe a vendor's wire format. Clients are constructed at each
edge.**

`src/shared/llm/` holds pure functions that map Luca's internal representation to
and from a vendor's request/response JSON — `openaiWire.js`, `anthropicWire.js`,
`geminiWire.js`. They import **no vendor SDK**, read **no ambient environment**
(`process.env`, `import.meta.env`), touch no credentials, and open no sockets.
They are plain `.js` with a hand-authored `.d.ts` beside each one, so a TypeScript
renderer and a plain-JavaScript Node core import the same file with no build step
between them.

Everything a wire format does *not* determine stays at the edge: client
construction, API keys, endpoint resolution, retries, streaming plumbing, and any
process-local state (`BRAIN_CONFIG` in the renderer, the Secure Vault in the
core). Each vendor SDK is imported in **exactly one file per process** — an
adapter — and nothing above that adapter branches on vendor.

**How much of the round trip is shared is decided per vendor, by whether both
edges run the same SDK.** This asymmetry is deliberate, not an unfinished
migration:

| Vendor | Shared | Kept at the edge | Why |
|---|---|---|---|
| OpenAI-compatible | request + response + endpoint table | client, key | one SDK, one shape |
| Anthropic | request + response + stream accumulation | client, key, base URL | one SDK version in both processes |
| Gemini | request (`contents`) + thought/signature scan | text and tool-call extraction | two SDKs; `result.text` vs `result.response.text()` |

Gemini's extraction stays at the edge for a specific reason: deriving text from
`candidates[0].content.parts` instead of the SDK's own `text()` would change
behaviour on safety-blocked and empty responses — on the default brain, on every
turn. Tidiness is not worth that.

The seam is machine-checkable, and is checked. `vendorSdkBoundary.test.ts` reads
`src/shared/llm/` and the core's `llm/` directory **from disk** and asserts an
exact map from SDK specifier to the single file allowed to import it, so a new
file in either directory is covered the moment it lands.

## Consequences

### Positive

- **One definition per wire format.** A mapping bug is fixed once and every
  surface gets the fix. The two-copies-per-adapter drift risk is gone: the
  renderer's `chat` and `chatStream` now call the same function.
- **Feature code stops knowing vendors exist.** `tradingDebateService.js` went
  from four vendor/credential imports and an inline vendor `switch` to a single
  `llmGateway.completeText({ modelId, prompt, maxTokens })`.
- **The core can speak every vendor without importing renderer code.** Stage 3's
  turn loop inherits a wire layer that already works, rather than needing its own.
- **The invariant is enforced by a test, not by vigilance.** An exact
  specifier-to-filename map fails loudly when a second importer appears, including
  in files nobody thought to check.

### Negative

- **Types are hand-maintained, not derived.** The shared modules are `.js` with
  hand-written `.d.ts`. A change to the implementation that is not mirrored in the
  declaration type-checks clean and fails at runtime. Accepted because the
  alternative is a build step between two processes that currently need none — but
  it is a real weakening of Invariant 6 at this seam, and the `.d.ts` must be
  treated as part of the implementation, not documentation.
- **Sharing is asymmetric by vendor.** A reader cannot assume the three wire
  modules expose parallel functions; Gemini's response extraction remains
  duplicated at the two edges by design. The table above is the map, and it will
  need updating when the SDKs converge.
- **Two Gemini SDKs remain.** One request mapping is validated against two client
  versions, and a divergence between them surfaces as a runtime error, not a type
  error. `@google/genai` is also declared as `*` in `package.json` — a floating
  major on a live provider path.
- **De-duplication concentrates risk.** `toGeminiContents` now runs on every
  default-brain turn in the renderer. The copies used to isolate a regression to
  one method; a bug here is an outage of Luca's primary path. That is the price of
  a single definition, and it is why these modules carry the densest tests in the
  provider layer.
- **Invariant 4 is not yet fully satisfied, and this ADR does not claim it is.**
  `cortex/agent/lifeLoop.js` still imports `@google/genai` directly and inspects
  `functionCall` parts itself. The boundary holds for `cortex/server/` and the
  renderer; one file in `cortex/agent/` is outstanding and is the next change.

## Alternatives considered

- **Share the Adapters themselves, not just the mapping.** Rejected: an adapter
  holds a client instance, credentials, endpoint resolution, and process-local
  state. Sharing the class would either drag renderer concerns into the core or
  force both processes onto one SDK version — and the Gemini SDKs are the reason
  that is not free.
- **Migrate the renderer to `@google/genai` so the whole Gemini round trip could
  be shared.** Rejected for this change: the migration sits under Luca's default
  brain, and a wire-sharing change is the wrong place to also swap the SDK beneath
  it. It deserves its own change and its own live verification.
- **Publish the wire as an internal package (npm workspace).** Rejected for now:
  it adds a build-and-link step to reach the same result a relative import already
  achieves across these two processes. Worth revisiting if a third consumer
  appears.
- **Write the shared layer in TypeScript and compile it for the core.** Rejected:
  it needs a build step and a dev watch mode, and the core would run generated
  output. `.js` + `.d.ts` gives the renderer its types and the core a file it can
  run directly, at the cost recorded above.
- **Have the renderer call the core for every model call, leaving one adapter in
  one process.** Not rejected — that is RFC-0006 Stage 3/4's destination. It needs
  the core-resident turn loop, attach/interject, and tool callbacks first. This
  decision is what makes that arrival cheap: by then both edges already agree on
  the wire, so retiring one of them removes code instead of reconciling it.
- **Leave the duplication and enforce equality by review.** Rejected: the
  duplication had already drifted into four copies of one part-scan before anyone
  noticed. A rule that depends on nobody forgetting is not a rule.

## Related

- [Invariant 4 — Provider Abstraction](../01-constitution/01-the-eight-invariants.md#invariant-4--provider-abstraction)
- [Invariant 6 — Strong Typing and Modularity](../01-constitution/01-the-eight-invariants.md#invariant-6--strong-typing-and-modularity)
  (the hand-written `.d.ts` caveat)
- [Provider Abstraction](../02-specification/04-provider-abstraction.md)
- [ADR-0003: Provider abstraction over vendor lock-in](0003-provider-abstraction-over-vendor-lockin.md)
- [RFC-0006: Core-resident turn loop](../04-rfcs/0006-core-resident-turn-loop.md)
  (Stage 2 is the work this ADR records)
