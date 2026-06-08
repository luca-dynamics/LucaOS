# Dashboard Operation Permission Center

## Purpose

The Dashboard right panel is the global **read-only governance summary** for operational readiness signals. PR #220 introduced the original Permission Center and its in-memory skill permission gate counts. This consolidation keeps that view intact and adds an Operation Center section that normalizes safe summaries from prior Personal Intelligence and LucaLink governance models.

The bridge represents memory approvals, runtime traces, learning proposals, mission alignment, skill sandbox plans, skill permission gates, adapter sandbox plans, display intents, companion approval notifications, read-only sensor snapshots, transport permission decisions, and adapter file/install permission decisions as common operation items.

## Informational, not authoritative

Operation Center status is not runtime authority. A `ready_for_review`, `granted_for_review`, `model_only`, or `read_only` item does not authorize any action.

The Operation Center does not:

- execute skills, adapters, workflows, tools, generated code, or browser automation;
- send LucaLink or other transport messages;
- approve requests or mutate approval queues;
- write memory, files, packages, or persistent audit records;
- install packages;
- collect live sensor data or open/cast displays;
- persist Operation Center state;
- access secrets, credentials, raw prompts, raw memory, or raw files; or
- call model providers, model routers, MCP, network, socket, or runtime services.

Every normalized item fixes `sideEffectsPerformed`, `executionEnabled`, `canExecute`, and `readyForExecution` to `false`. Aggregate readiness additionally fixes live send, write, install, and live collection capabilities to `false`.

## Data model and bridge

`src/operation-center/` contains pure normalization and summarization helpers. The current Dashboard uses fixture-backed summaries for governance systems that do not expose a safe read-only event source, while current in-memory skill permission gates are converted directly. Conversion helpers copy arrays and construct new operation items; they do not mutate source objects.

Adapter file/install cards are sourced from the real PR #221 read-only fixture decisions in `src/services/lucaLink/adapterFileInstallPermissions`. These cards remain informational only: they do not write files, install packages, execute adapters, run shell commands or package managers, send transport messages, or mutate host, pairing, transport, or runtime state.

The source groups are:

- `personal_intelligence`
- `lucalink`
- `runtime`
- `system`

The right panel groups cards by source and displays status, risk, required reviews, blocked actions, and the explicit no-side-effects invariant. It intentionally provides no execute, send, approve, write, install, or live-collection controls.

## Future work requires separate review

- Connect a real read-only runtime event bus only after a separate architecture and safety review.
- Add a persistent audit trail only after a separate privacy, retention, rollback, and storage review.
- Add controlled execution only after an isolated runtime, explicit authority boundary, verification gates, and rollback are approved.
