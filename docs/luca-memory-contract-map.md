# Luca memory contract map

## Current systems (unchanged runtime behavior)
- Frontend memory service: `src/services/memoryService.ts` (hybrid local/delegated/standalone modes using localStorage cache + API sync).
- Backend memory store: `src/services/memoryStore.js` (SQLite-backed memory persistence and reconciliation/search).
- Agent memory service: `src/services/agent/AgentMemory.ts` (task-scoped localStorage + in-memory session map).
- Workflow memory: `src/services/agent/cognitive/WorkflowMemory.ts` (offline stub; no LightRAG persistence enabled).
- Mission traces/tapes: `src/services/agent/LucaTracing.ts` and `src/services/missionTape/MissionTapeRecorder.ts`.

## Canonical tiers
- `session`: short-horizon session/task memory.
- `profile`: user/profile/persona memory.
- `operational`: workflow/task execution memory.
- `skill`: skill/tool-capability memory.
- `trace`: mission traces, tapes, telemetry artifacts.
- `system`: platform/internal system memory.

## Adapter strategy (opt-in)
- Add contracts + pure tier mapping helpers in `src/services/memory/*`.
- Add lightweight adapters for frontend/backend/agent/workflow memory layers.
- Adapters are metadata-first and explicitly `adapterOnly` to avoid changing production call paths.

## What remains unchanged in this phase
- No data migration.
- No persistence backend replacement.
- No runtime memory routing changes.
- No production read/write redirection.

## Next phase
- Unify trace + mission tape ingestion into canonical trace tier entries with stable linking IDs.
