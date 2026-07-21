# Mission Engine types (contract only)

This package holds **shared mission lifecycle types** used by:

- `src/services/lucaGuard` (Mission / MissionStep types)
- `src/services/missionTape` (MissionTape / MissionTapeRecorder contracts)

## Removed

`MissionEngine` class was hard-deleted after a reference audit: it was only
constructed in its own unit test and never wired into production runtime.

## Live execution paths

| Path | Role |
|------|------|
| `MissionControlService` | Product missions (Electron/SQLite) |
| `src/services/computerUse` + `createRealSandboxComputerUseStack` | Computer-use plan/execute/verify with optional MissionTape sink |
| `MissionTapeRecorderService` | In-process append-only tape (used by computer-use when enabled) |

A future PR can reintroduce a single execution engine that implements these types
and drives computer-use / tools under LucaGuard — without duplicating the old
unused scaffold class.
