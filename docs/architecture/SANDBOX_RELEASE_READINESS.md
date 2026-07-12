# Sandbox Release Readiness

`src/config/sandboxReleaseMatrix.ts` is the shipping policy. Docker, rootless
Podman, WSL2, and Windows Sandbox target v1 stable support. Firecracker, Hyper-V,
and Apple Virtualization remain preview until their native asset and real-host
certification gates pass. Missing evidence always blocks readiness.

`SandboxAssetDeliveryService` accepts only unexpired Ed25519-signed manifests,
HTTPS assets, bounded sizes, resumable range responses, and exact SHA-256
digests. Installation is committed only after full verification.
