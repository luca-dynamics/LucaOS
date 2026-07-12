# LucaOS Sandbox Host

> Cross-platform backend placement, concurrent sessions, sequential guest-OS
> switching, and governed artifact handoffs are specified in
> [SANDBOX_FLEET.md](./SANDBOX_FLEET.md).

## Safety invariant

Luca plans, browses, downloads, and executes untrusted work inside an isolated
sandbox. Access to the embodied host or a LucaLink device is a separate,
explicit capability grant. A missing or unhealthy sandbox never falls back to
direct host execution.

## Trust boundaries

1. **Agent and mission loop** request capabilities; they do not receive process
   or device authority directly.
2. **LucaGuard** evaluates risk, trust, approvals, and whether isolation is
   mandatory.
3. **Sandbox Host** owns disposable or persistent isolated compute sessions.
4. **Host Capability Bridge** is the only route from a sandbox to real files,
   input, displays, microphones, cameras, credentials, or LucaLink devices.

## Initial backend order

- Docker provides the first portable Linux backend.
- WSL2 is the Windows-native Linux fallback.
- Windows Sandbox provides disposable Windows sessions where supported.
- A remote backend can provide stronger isolation or long-running sessions.

Every backend must prove that it is available and isolated, declare supported
capabilities, enforce resource/network/workspace scope, and implement destroy.

## Delivery slices

1. Contract, backend probes, session planning, and fail-closed tests.
2. Electron main-process broker plus Docker lifecycle adapter. **Implemented:**
   hardened create/probe/destroy lifecycle and narrow renderer IPC. A live
   session remains blocked when Docker is not installed or its daemon is down.
3. WSL2 adapter and per-session workspace mounting. **Implemented:** disposable
   per-session distro import/unregister lifecycle, managed-rootfs requirement,
   per-command private-network requirement, and automatic Docker-to-WSL2
   backend selection, plus adapter-level artifact export/import through
   controlled `/workspace` paths. The rootfs artifact is not bundled yet, so
   this backend remains fail-closed.
4. Playwright browser inside the sandbox with observation/action policies.
5. Narrow host capability bridge and LucaLink embodiment grants.
6. Resource limits, secret injection, persistence controls, audit UI, and
   recovery/cleanup.

The first slice is represented by `SandboxHostService`; it deliberately has no
default adapters, so the product reports a blocked plan until a real backend is
connected.

## Governed command channel

The Electron broker accepts an executable plus an argument array, never a shell
command string. It validates session state and terminal authority, caps argument
sizes and execution time, and routes only to the backend that owns the session.
Docker commands execute in `/workspace`. Network-disabled WSL2 commands must run
inside a new user and network namespace via `unshare`; failure to create that
namespace fails the command rather than exposing the default WSL network.

The managed WSL rootfs is reproducible from `sandbox/rootfs/Dockerfile` using
`npm run sandbox:build-rootfs`. The build emits a tar archive and SHA-256 file;
the archive is a release artifact and should not be committed as source.
The WSL2 adapter verifies that SHA-256 before reporting itself available or
importing any session; a missing, malformed, or mismatched digest fails closed.
Release packaging is also explicit: `npm run sandbox:prepare-release` verifies
the built artifact again and stages the rootfs, checksum, and versioned manifest
under `build/sandbox`. Electron Builder maps that directory to the production
`resources/sandbox` bundle consumed by the main-process adapter.

Rootless Podman is available as a Linux-native container backend. It reports
availability only when `podman info` confirms rootless execution, then launches
containers with no-new-privileges, read-only root, resource limits, scoped
workspace mounting, and explicit network posture.

Windows Sandbox is available as a Windows GUI/workspace backend when
`WindowsSandbox.exe` exists. It launches a generated `.wsb` file with networking
and vGPU disabled and a scoped mapped workspace folder. It does not expose the
terminal capability and cannot be selected for command execution.
