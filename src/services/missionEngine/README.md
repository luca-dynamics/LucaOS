# Mission engine package

## What lives here

| Piece | Role |
| --- | --- |
| `types.ts` | Shared mission lifecycle types (Guard, tape, status) |
| `AtomicOperationUnit.ts` | Strict step contract (MISSION_ENGINE_SPEC fields) |
| `preStepVerificationGate.ts` | Pre-step GSD verification (representation) |
| `MissionCheckpointStore.ts` | Checkpoint / restore plan index |
| `MissionEngineScaffold.ts` | **Absorb pilot only** — stub execute for tests/discipline demos |

## What is *not* the product mission engine

There is **no** single production class named `MissionEngine` that owns all work.
An old unused `MissionEngine` was deleted (never wired).

## Real product paths (use these)

| Path | Role |
| --- | --- |
| `MissionControlService` | Product missions (Electron/SQLite). **Complete via** `completeMissionWithVerification` (archives only if tape verification allows). |
| `completeProductMission` | Shared product completion helper (tape + GSD gates + optional archive). |
| Computer-use `ComputerUseMissionRunner` | When `missionTapeCompletion` is set, `runSteps` finalizes tape via `completeProductMission`. |
| `MissionTapeRecorderService` + `finalizeMissionTapeWithVerification` | Tape + completion criteria |
| `createMissionTapeRecorderExternalSink.completeMission` | CU external sink completion |

## Scaffold vs real

- **Scaffold** = prove plan → verify → gated complete without host/tool mutation.
- **Real wire** = MissionControl archive + CU runner completion call the same completion helper.
- **UI** = `UnifiedMissionCenterPanel` (settings) — control surface for active mission + gated complete. PI Mission Profile panel remains read-only advisory.

Do not treat `MissionEngineScaffold` as a second product orchestrator.
