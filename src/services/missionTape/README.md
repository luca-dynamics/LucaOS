# Mission Tape Recorder

In-process append-only mission tape used by computer-use when
`LucaSettings.computerUse.enableMissionTapeSink` is on (via
`createMissionTapeRecorderExternalSink`).

## What this provides
- Typed `MissionTapeRecord` with steps / guard / verification / recovery tracks
- `MissionTapeRecorderService`: createTape, append*, finalizeTape, getTape, listTapes
- Default in-memory storage adapter
- Types shared with `missionEngine/types` (MissionTape contracts)

## Related
- Real wiring: `browserRuntime/createRealSandboxComputerUseStack` + settings flag
- MissionEngine **class** removed; keep using MissionControl + computer-use for execution
