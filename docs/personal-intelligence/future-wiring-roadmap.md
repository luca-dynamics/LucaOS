
# Personal Intelligence Future Wiring Roadmap

## Current state

- PR #205 introduced the Personal Intelligence Core contracts.
- PR #206 defines preview-oriented integration boundaries and readiness evaluation.
- PR #207 adds read-only preview UI into existing Settings tabs.

PR #207 does **not** add persistence, execution, model routing, LucaLink transfer, or live Personal Intelligence wiring. Existing Settings, provider, runtime, VisualCore, Device Center, model-router, memory, and MCP behavior remains unchanged.

## Required gates before live integration

### Identity and personality

A future adapter may accept explicitly reviewed Identity Core fields. It must reuse the existing personality architecture, exclude hidden/system prompt material, preserve user edits, and provide a clear save/apply boundary.

### Memory and knowledge persistence

A future proposal may connect serialization output to governed persistence only after privacy-zone authorization, validation, explicit user confirmation, atomic-write design, rollback behavior, and audit evidence are reviewed. Serialization alone must never imply a write.

### Learning

Learning events may become durable only through a bounded proposal/review flow. They must not silently update memory, skills, prompts, model preferences, or routing.

### Model preferences

`preferredModels` may eventually inform the existing model governance layer, but it must not bypass compatibility checks, privacy policy, provider availability, cost policy, or user approval. The Settings preview never mutates the router.

### Skills

A future skill lifecycle adapter must validate provenance, permissions, memory policy, tests, sandbox requirements, and approval state before registration or execution. A manifest preview must not load an entrypoint.

### Runtime traces

A future trace display may consume evidence from existing governed runtime systems. Doctrine stages are descriptive and must not become an alternate execution path.

### LucaLink bounded handoff

PR #212 is required before a bounded Personal Intelligence handoff preview can be considered. Any design must be redacted, scoped, expiring, approval-gated, and preview-first. Raw memory databases, hidden prompts, private reasoning, credentials, and files remain forbidden transfer material.

## Invariants

1. Reuse existing Settings tabs and services rather than creating parallel architecture.
2. Separate preview, proposal, approval, persistence, and execution into independently reviewable boundaries.
3. Default sensitive Privacy Zones to blocked.
4. Keep provider, model-router, VisualCore, Device Center, and LucaLink behavior unchanged until an explicit future integration PR.
5. Preserve source-safety tests as preview components evolve.

# Future Personal Intelligence Wiring Roadmap

PR #206 defines readiness contracts; it does not authorize these changes.

1. **PR #207 — Wire Identity Core into onboarding/settings preview UI.** Render and validate state without applying it.
2. **PR #208 — Add governed local Memory persistence adapter.** Require privacy checks, explicit writes, auditability, and migration/recovery design.
3. **PR #209 — Add Skill Registry UI and manifest loading without execution.** List and validate declarative manifests only.
4. **PR #210 — Add Execution Trace and Learning Log runtime event recording.** Record bounded evidence with approval provenance and retention controls.
5. **PR #211 — Connect Mission Profile to mission runtime in advisory/collaborative mode.** Keep tool execution unavailable.
6. **PR #212 — Personal Intelligence + LucaLink bounded handoff preview.** Transfer only explicitly approved, minimal preview fields.
7. **PR #213 — Governed Personal Intelligence persistence + audit trail.** Add policy enforcement, retention, deletion, and operator-visible audit evidence.
8. **PR #214 — Skill runtime sandbox planning, still no unsupervised execution.** Specify isolation, permission grants, approval gates, and verification before implementation.

