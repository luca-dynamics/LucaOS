# Personal Intelligence

Pure domain contracts + settings/product bridges for identity, memory approval,
mission advisory, skills dry-run/sandbox, and runtime authority.

## Product wiring (live)

| Area | Path |
|------|------|
| Live memory write pilot | `adapters/` + `services/personalIntelligence/liveMemoryAdapterDependency` |
| Memory approval | `approval/` + Settings pilot panels |
| Mission advisory snapshots | `missionRuntime/` + `missionSnapshotBridge` |
| Skills registry / dry-run / sandbox | `skills/`, `skillDryRun/`, `skillSandbox/`, `skillPermissions/` |
| Runtime authority | `runtimeAuthority/` (Settings + Operation Center) |
| Runtime traces | `runtime/` + Settings trace panel |
| Identity | `identity/` + Personality dashboard |
| Persistence proposals | `persistence/` (preview / proposal only) |

## Removed pure-model cluster

Hard-deleted after reference audit (exported only via barrel; no Settings/App imports):

- `memoryGraph/`
- `continuity/`
- `memoryControls/`
- `dashboard/`
- `reviewWorkflow/`
- `persistenceBoundary/`

These were layered pure types/helpers composing each other with fixtures/tests only.
Reintroduce only when a product surface needs them.
