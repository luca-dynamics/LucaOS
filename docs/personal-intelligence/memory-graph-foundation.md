# Personal Intelligence Memory Graph Foundation

## Why this foundation exists

Personal Intelligence needs a structured way to represent what Luca may know about a user over time without turning memory into hidden capture, persistence, synchronization, planning, or execution authority. The memory graph is a typed, in-memory description of memory nodes and their relationships. It gives future continuity and approval experiences a common contract while preserving the existing governed persistence and approval boundaries.

The graph is additive to the existing flat `MemoryItem` and governed persistence proposal types. This foundation does not migrate stored data, call the memory adapter, write files, approve proposals, or grant Personal Intelligence any runtime capability.

## Memory categories

Nodes use one of these categories:

- `identity`: user-confirmed identity and profile context.
- `preference`: communication, workflow, or presentation preferences.
- `project`: active or historical project context.
- `goal`: desired outcomes that may relate to projects or tasks.
- `routine`: recurring, user-visible patterns.
- `relationship`: people or organizations relevant to the user.
- `device`: governed device context, not device access authority.
- `skill`: skills associated with a user or project, not permission to invoke them.
- `active_task`: work that may need future continuity.
- `temporary_context`: short-lived context that must carry an expiration time while active.
- `sensitive_fact`: facts requiring stronger privacy and approval treatment.
- `system_observation`: transparent system-originated observations that remain reviewable.

## Sensitivity and privacy

Sensitivity is represented independently from the existing Personal Intelligence privacy zones:

1. `public`
2. `personal`
3. `private`
4. `sensitive`
5. `secret`

A node may also retain an existing `PrivacyZone` for alignment with current policy and persistence proposal types. Declarative privacy controls state whether a node is local-only, whether it has been explicitly marked as sync-eligible, and whether summary values must be redacted. These flags do not perform disclosure or synchronization.

Sensitive and secret nodes are never sync-eligible through the default helper. Absence of an explicit sync allowance is deny-by-default, and `localOnly` always blocks eligibility. This PR does not connect the eligibility helper to LucaLink or any transport.

## Source, confidence, lifecycle, and staleness

Every node identifies its source as `user_stated`, `user_confirmed`, `assistant_inferred`, `system_observed`, `imported`, `device_observed`, or `project_context`. Evidence entries add a short reason and may include a source identifier, source type, and observation time. Fixtures use only fictional, harmless evidence.

Confidence is categorical: `low`, `medium`, `high`, or `confirmed`. Confidence does not bypass approval or privacy policy.

Lifecycle is explicit: `active`, `draft`, `pending_approval`, `archived`, `forgotten`, or `expired`. Forgotten and expired memories are omitted from active filters and reviewable summary counts. Active temporary context must include `expiresAt`.

Staleness is derived without mutation from the most recent `lastUsedAt`, `updatedAt`, or `createdAt` timestamp. Category-specific review windows produce `fresh`, `aging`, or `stale`; lifecycle or timestamp expiration produces `expired`. Staleness recommends review only and never silently deletes data.

## Approval rules

Approval states are `not_required`, `pending`, `approved`, `denied`, and `requires_review`.

The pure approval helper requires review when:

- the node is explicitly pending or marked `requires_review`;
- its lifecycle is `pending_approval`;
- it is secret and has not already received an explicit decision; or
- a sensitive/sensitive-fact node came from an assistant inference, system observation, device observation, or import.

An approval state remains data, not authority. Approval in this graph does not write memory, invoke an adapter, execute a skill, plan a tool call, or alter the existing memory approval pilot.

## Relationships

Typed edges describe `supports_goal`, `belongs_to_project`, `depends_on`, `related_to`, `owned_by_user`, `observed_on_device`, `uses_skill`, `conflicts_with`, and `supersedes` relationships. Relationship helpers only filter and summarize graph data. Explicit `conflicts_with` edges make contradictory memories reviewable without choosing a winner automatically.

## Basic, Pro, and Creator display principles

The graph exports pure Experience Mode disclosure helpers, not UI components:

- **Basic** surfaces only active, approved-or-not-required public/personal memories. It omits private, sensitive, secret, pending-review, forgotten, and expired nodes.
- **Pro** may surface active private or sensitive context only when it does not require approval; secret memory remains omitted.
- **Creator** may surface non-forgotten, non-expired review records and audit metadata such as source, confidence, and staleness. Sensitive values and pending-review details remain redacted.

All modes respect explicit redaction controls. Creator is an audit view, not a privacy bypass or runtime-authority grant.

## Implemented in this PR

- Typed memory nodes, graph edges, graph containers, evidence, privacy controls, and summary types.
- Category, sensitivity, source, confidence, lifecycle, approval, staleness, and relationship vocabularies.
- Pure helpers for activity, expiration, approval, sync eligibility, Experience Mode disclosure, staleness, filtering, relationships, conflicts, summaries, and graph invariants.
- Safe fictional fixtures covering identity, preferences, project, goal, device, temporary context, pending sensitive review, and a preference conflict.
- Focused unit tests for governance defaults and summary disclosure.

## Deferred

This foundation intentionally does not implement:

- memory persistence or migration;
- hidden or automatic memory capture;
- memory approval, correction, inspection, or forget UI;
- a continuity engine;
- model-routing integration;
- tool-planning integration;
- LucaLink cross-device memory sync;
- runtime execution authority; or
- broad Operation Center changes.

Future work must connect these types through the existing governed proposal, approval, audit, privacy, rollback, and runtime-authority boundaries rather than treating the graph as permission to act.
