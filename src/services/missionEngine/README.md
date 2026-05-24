# MissionEngine scaffold

This directory provides a minimal runtime contract scaffold aligned with `docs/runtime/MISSION_ENGINE_SPEC.md`:

- Lifecycle: create → plan → execute → verify → recover → record
- Atomic step schema via `MissionStep`
- Checkpoint/rollback interface via `MissionCheckpoint` + `createCheckpoint`
- Verifier/recovery interfaces for deterministic checks and recovery lanes
- Mission tape recording interface via `MissionTapeRecorder`
- Guard hook interface for risk/approval gating

This scaffold is intentionally additive and not deeply wired into production runtime yet.
