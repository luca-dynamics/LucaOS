# Personal Intelligence Integration Boundaries

The `src/personal-intelligence/integration` package is an anti-corruption layer between passive Personal Intelligence contracts and possible future LucaOS adapters. It only creates defensive objects, validates metadata, describes mappings, evaluates readiness, and composes previews.

## Boundaries

- **Identity:** maps onboarding/settings proposals into an `IdentityCore` preview.
- **Mission:** maps mission form state into planning context without activating a mission.
- **Memory:** creates and serializes `MemoryItem` previews while preserving privacy zone and confidence.
- **Learning:** describes feedback/failure evidence without changing memory, skills, or routing.
- **Skills:** creates and validates manifests without resolving or loading entrypoints.
- **Execution trace:** records proposed evidence with approval and act-stage safeguards.
- **Readiness:** converts runtime, persistence, network, execution, and sensitive-zone requirements into explicit blockers.
- **Composer:** combines previews and warnings without applying them.

## Forbidden behavior

This bundle must not:

- write files, databases, browser storage, or other persistence;
- call `fetch`, sockets, transports, LucaLink, relay, WebRTC, VPN, or network adapters;
- invoke providers, models, tools, skill entrypoints, generated code, Electron execution IPC, or child processes;
- mutate App boot, providers, runtime services, Device Center, VisualCore, Luca Screen, or approval state;
- grant approval merely because an `approve` trace exists;
- treat an `act` trace as an instruction to execute; or
- transfer raw memory, hidden prompts, private reasoning, credentials, secrets, or files.

Every future adapter must live behind a separately reviewed boundary and should consume the minimum metadata needed for its task.
