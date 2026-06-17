# Personal Intelligence Continuity Engine — Phase 1

## Purpose

The Phase 1 Continuity Engine is a pure, deterministic projection over a supplied Personal Intelligence Memory Graph. It answers what work was active, which project and tasks are relevant, what decisions were recently recorded, what is blocked, what context can be restored, and which advisory next steps rank highest.

The engine does not retrieve memory on its own. Its caller supplies a complete `PersonalMemoryGraph`, an optional Luca Experience Mode, an optional clock, and an optional item limit. Supplying `now` makes scoring, staleness, and generated timestamps reproducible in tests and future governed integrations.

## Inputs

`createContinuitySnapshot(graph, options)` accepts:

- `graph`: a typed Personal Intelligence Memory Graph;
- `mode`: `basic`, `pro`, or `creator` (default: `basic`);
- `now`: the clock used for lifecycle, expiration, recency, and staleness decisions; and
- `maxItems`: a positive item limit for task, decision, warning, blocker, and recommendation lists.

The engine reuses Memory Graph policy helpers for active lifecycle checks, expiration, approval requirements, staleness, conflict discovery, mode disclosure, and relationship evidence. It does not bypass those policies.

## Outputs

`PersonalContinuitySnapshot` contains:

- the selected active project;
- visible open tasks;
- recent decisions represented by explicitly tagged graph nodes;
- blockers derived from blocked task tags, unresolved `depends_on` edges, and `conflicts_with` edges;
- deterministically ranked next actions;
- a friendly handoff summary and visible temporary context to restore;
- stale-context and privacy-review warnings;
- the deterministic `generatedAt` timestamp; and
- `sideEffectsPerformed: false`.

All output is read-only and advisory. A recommendation is not approval or execution authority.

## Deterministic scoring

Continuity relevance uses small, explicit weights rather than machine learning. The score combines:

- category relevance (projects, active tasks, goals, and temporary context rank above incidental context);
- active lifecycle state;
- recency;
- confidence;
- Memory Graph staleness;
- useful project, goal, and dependency relationships; and
- an approval-required penalty.

Scores are sorted deterministically, with update time and node ID as tie-breakers. Blocked tasks receive an additional recommendation-order penalty so actionable open work is suggested first. There are no embeddings, vector searches, model calls, or generated summaries.

## Experience Mode disclosure

### Basic

Basic presents the active project, up to three visible open tasks, a simple next action, and a friendly handoff. It uses only active public/personal memories that already pass Basic Memory Graph disclosure. Blocker diagnostics, stale warnings, privacy warnings, source details, confidence, staleness metadata, and edge evidence are omitted.

### Pro

Pro presents visible project/task structure, blockers, stale-context warnings, generic privacy-review warnings, and more detailed recommendation rationales. Private context may appear only when the Memory Graph Pro policy permits it. Source/confidence internals, related sensitive memory IDs, and relationship audit evidence remain omitted.

### Creator

Creator adds safe audit metadata: source, confidence, staleness, relationship edge type/IDs, related node IDs, and graph-derived reasoning flags. Creator remains an audit view, not a privacy bypass. It never includes values, titles, summaries, or edge reasons from protected pending memories in continuity output.

## Privacy rules

- Memories requiring approval are excluded from project, task, decision, and restored-context summaries.
- Sensitive or secret content and nodes marked for summary redaction use protected placeholder text when they are otherwise eligible for a summary.
- Privacy warnings are generic and do not reproduce protected titles, summaries, values, or evidence.
- Pro privacy warnings do not expose the protected node ID.
- Creator may identify the review record and show safe policy metadata, but protected content remains redacted.
- Forgotten, denied, and expired data does not become active continuity context.
- Conflict detection never chooses a winner or silently changes memory.

## Fictional fixtures

The continuity fixtures contain only fictional LucaOS-style project data. They cover an active project, an open task, a recent decision, a blocked task, temporary handoff context, a stale preference, a pending sensitive memory, and a conflicting preference. A sentinel fixture value verifies that protected data is absent from serialized snapshots.

## Deferred runtime integration

This phase intentionally defines architecture and deterministic behavior only.

**This PR does not persist continuity snapshots.**

**This PR does not modify memory.**

**This PR does not call AI models.**

**This PR does not execute tools.**

**This PR does not sync across devices.**

It also does not implement memory retrieval, vector search, reminders, task execution, notifications, onboarding, dashboard UI, LucaLink changes, or Model Router changes. Future runtime and dashboard work must consume this snapshot through existing approval, privacy, persistence, and runtime-authority boundaries.
