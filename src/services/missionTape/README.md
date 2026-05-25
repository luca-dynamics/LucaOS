# Mission Tape Recorder scaffold

Minimal additive mission tape recording service for LucaOS.

## What this provides
- A typed `MissionTapeRecord` model with append-only tracks for:
  - step records
  - guard decisions
  - verification records
  - recovery records
- `MissionTapeRecorderService` with lifecycle methods:
  - `createTape`, `appendStep`, `appendGuardDecision`, `appendVerification`, `appendRecovery`, `finalizeTape`, `getTape`, `listTapes`
- Dependency-injected storage adapter with default in-memory adapter.
- Compatibility with Mission Engine `MissionTapeRecorder` via `recordMissionTape()`.

## Scope
This is a scaffold only and is intentionally not deeply integrated into production runtime yet.
