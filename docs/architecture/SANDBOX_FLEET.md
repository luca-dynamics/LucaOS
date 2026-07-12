# LucaOS Sandbox Fleet

## Decision

LucaOS is multi-platform. Its sandbox system must therefore be a fleet of
local and remote isolation backends, not one hard-coded container or Ubuntu
environment.

The host operating system, sandbox backend, and guest operating system are
separate properties and must be represented truthfully in runtime state and
audit records. For example, a Linux VM on a Mac is a Linux sandbox, not a
macOS sandbox.

## Safety invariant

Luca may reason, browse, build, and test in one or more sandboxes. A sandbox
may reach another sandbox, the embodied host, or a LucaLink device only through
an explicit, scoped, auditable transfer or capability grant. Backend failure
never falls back to direct host execution.

## Platform matrix

| LucaOS host | Preferred local backends | Remote backends |
| --- | --- | --- |
| Windows | WSL2 Linux, Docker Linux, Windows Sandbox or Hyper-V | Linux, Windows, macOS |
| macOS | Apple Virtualization Framework Linux VM, Docker or OrbStack | Linux, Windows, macOS on Apple hardware |
| Linux | Rootless Podman or Docker, namespaces/cgroups, Firecracker or Cloud Hypervisor | Linux, Windows, macOS |
| Browser or mobile | No direct local VM authority | Paired LucaOS host or governed cloud sandbox |

A genuine macOS sandbox must execute on Apple hardware. LucaOS must not claim
that a Linux container hosted by macOS is a macOS environment.

## Fleet session identity

Every session must record at least:

- `sessionId` and owning `missionId`;
- host platform and host identity;
- backend kind and isolation tier;
- guest OS, distribution/image, architecture, and image digest;
- granted capabilities and network policy;
- resource limits;
- persistence mode and expiry;
- lifecycle and audit state;
- whether the session is local, paired, or remote;
- `hostFallbackAllowed: false`.

## Placement

The fleet scheduler selects a backend from an explicit mission requirement. It
must not silently substitute an incompatible guest OS.

Example requirements:

- `guest: linux`, `distribution: ubuntu`, `architecture: x64`;
- `guest: windows`, `version: windows-11`;
- `guest: macos`, `version: 15`, `requiresAppleHardware: true`;
- `isolationTier: container | vm | microvm | remote_vm`;
- `locality: local | paired_host | remote | any`.

If no backend satisfies every hard requirement, placement is blocked. Luca may
offer alternatives, but changing guest OS, isolation tier, region, persistence,
or host authority requires a new plan and any applicable approval.

## Concurrent and sequential use

Luca may own multiple sessions at the same time and may switch between them.
The active session is always explicit; commands are routed by `sessionId`, not
by a mutable global default.

A cross-platform workflow should use governed artifact handoffs:

1. Build and test in an Ubuntu sandbox.
2. Export an immutable artifact plus digest and provenance record.
3. Scan and approve the transfer.
4. Import into a Windows sandbox for Windows packaging/tests.
5. Import approved source or artifacts into a macOS sandbox for Apple-specific
   build, signing, and testing.
6. Persist or destroy each session independently.

Sandboxes do not share unrestricted filesystems, credentials, clipboard state,
browser profiles, or device authority. Transfers are allowlisted, content
addressed, size limited, scanned, and recorded in the mission audit trail.

## Required services

### SandboxFleetRegistry

Discovers local, paired, and remote backends; records health, supported guest
images, isolation tier, capacity, cost, and trust posture.

### SandboxFleetScheduler

Matches mission requirements to backend capabilities and returns a placement
decision with reasons. Scheduling must be deterministic and fail closed.

### SandboxSessionBroker

Creates, executes, suspends, resumes, snapshots, persists, expires, and destroys
sessions. It routes all operations by session identity.

The foundation is implemented as `SandboxFleetSessionBroker`: it creates
placement-backed sessions through registered runtime adapters, tracks active
sessions per mission, requires explicit `sessionId` command routing, updates
backend capacity, and keeps host fallback disabled.

### SandboxArtifactBridge

Exports and imports immutable artifacts between sessions. It owns hashing,
malware/content scanning, provenance, approval, and policy enforcement.

The foundation is implemented as `SandboxArtifactBridge`: it exports immutable
content-addressed records from a source session, records guest/image/backend
provenance, blocks unsafe paths and oversized payloads, requires scan and
approval gates before import, and records each target session that receives the
artifact.

### HostCapabilityBridge

Provides the only route from sandboxed work to real files, UI input, displays,
microphones, cameras, credentials, signing keys, or LucaLink devices.

## Delivery sequence

1. Current local Docker and disposable WSL2 backends.
2. Fleet types, registry, explicit placement requirements, and multi-session
   routing. **Implemented:** deterministic scheduler plus
   `SandboxFleetSessionBroker` for concurrent session ownership, explicit
   switching, lifecycle, execution routing, and capacity accounting.
3. Governed artifact bridge and sequential Ubuntu-to-Windows workflow.
   **Implemented:** `SandboxArtifactBridge` for scanned, approved,
   content-addressed handoffs across Linux, Windows, and macOS sessions.
4. Linux Podman/microVM adapter and macOS Virtualization Framework adapter.
5. Windows Sandbox or Hyper-V adapter.
6. Paired-host and remote placement, including Apple-hardware macOS workers.
7. Fleet UI for capacity, active sessions, switching, persistence, audit, and
   emergency destruction.

## Non-goals

- Pretending host process execution is a sandbox.
- Treating an iframe or Electron webview as an OS sandbox.
- Relabeling a Linux guest according to its Windows or macOS host.
- Sharing master credentials or unrestricted host directories with guests.
- Automatically weakening isolation to make a mission succeed.
