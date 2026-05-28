# PR #109 runtime continuity foundation

This implementation turns the Hermes/OpenClaw reconnaissance into a safe LucaOS
foundation without copying external code and without enabling active autonomous
execution.

## Bundled domains

- Always-on runtime continuity snapshot storage and diagnostics-safe resume state.
- Scheduler/provenance gate primitives with deterministic action-instance digests.
- Persistent skill registry continuity with governed lifecycle states.
- Memory governance records layered on top of existing memory/RAG behavior.
- Runtime diagnostics summaries for normal, tactical, and origin audiences.

## Safety contract

1. No always-on risky action without provenance.
2. No scheduled tool, shell, or network execution without explicit approval.
3. No approval reuse across different action-instance digests.
4. No untrusted memory, skill, or schedule can silently trigger a later risky action.
5. Quarantined items cannot run.
6. Revoked provenance invalidates dependent actions.
7. Normal users should never see raw internals or secrets.
8. No raw provider keys in diagnostics.
9. Existing memories, settings, skills, and runtime state are not destructively migrated.
10. All new execution-like flows are dry-run/no-op unless explicitly safe.

## Tier direction

Normal users get friendly safe summaries. Tactical users get compact runtime,
scheduler, skill, provenance, and memory-governance counts. Origin users get full
foundation diagnostics for future runtime control-center work. Resource tiers are
modeled as low-resource, standard, high-resource, and cloud-powered so LucaOS can
later unlock stronger local/cloud continuity while degrading gracefully.
