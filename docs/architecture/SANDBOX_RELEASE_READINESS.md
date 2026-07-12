# Sandbox Release Readiness

`src/config/sandboxReleaseMatrix.ts` is the shipping policy. Docker, rootless
Podman, WSL2, and Windows Sandbox target v1 stable support. Firecracker, Hyper-V,
and Apple Virtualization remain preview until their native asset and real-host
certification gates pass. Missing evidence always blocks readiness.

`SandboxAssetDeliveryService` accepts only unexpired Ed25519-signed manifests,
HTTPS assets, bounded sizes, resumable range responses, and exact SHA-256
digests. Installation is committed only after full verification.

`SandboxBackendSetupService` converts the release matrix and live host evidence
into user-facing readiness, missing-asset, missing-feature, certification, and
preview blockers. It never weakens placement or enables host fallback.

`SandboxRuntimeSettingsPanel` is mounted in advanced Autonomy settings and reads
only the narrow Electron sandbox bridge. It exposes status, sessions, snapshots,
expiry cleanup, and emergency destruction without renderer command authority.

Electron owns the production security executors: `sandboxSecurityServices.cjs`
uses OS-backed encryption for scoped one-use secret leases and invokes ClamAV on
0600 temporary files that are removed after every result. Failure is not clean.

Hardware promotion uses `certify-sandbox-backend.cjs` on an explicitly labelled
self-hosted runner. It requires seven live assertions and produces Ed25519-signed
host/image evidence; repository-hosted contract CI cannot substitute for it.

`SandboxReleaseGate` is the final authority for shipping status. Stable tier,
verified assets, live host features, scanner availability, fresh signed hardware
evidence, and all seven assertions are mandatory. Preview backends cannot be
promoted by configuration alone, and host fallback remains false.
