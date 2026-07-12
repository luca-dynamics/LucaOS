import type { SandboxFleetBackend } from "../types/sandboxFleet";

export type SandboxReleaseTier = "stable" | "preview";
export interface SandboxBackendReleasePolicy { kind: SandboxFleetBackend["kind"]; hosts: Array<"windows" | "linux" | "macos">; tier: SandboxReleaseTier; requiredAssets: string[]; requiredFeatures: string[]; }

export const SANDBOX_RELEASE_MATRIX: SandboxBackendReleasePolicy[] = [
  { kind: "docker", hosts: ["windows", "linux", "macos"], tier: "stable", requiredAssets: [], requiredFeatures: ["docker-daemon"] },
  { kind: "podman", hosts: ["linux"], tier: "stable", requiredAssets: [], requiredFeatures: ["rootless-podman"] },
  { kind: "wsl2", hosts: ["windows"], tier: "stable", requiredAssets: ["wsl2-rootfs"], requiredFeatures: ["wsl2"] },
  { kind: "windows_sandbox", hosts: ["windows"], tier: "stable", requiredAssets: [], requiredFeatures: ["windows-sandbox"] },
  { kind: "firecracker", hosts: ["linux"], tier: "preview", requiredAssets: ["firecracker-kernel", "firecracker-rootfs"], requiredFeatures: ["kvm", "firecracker"] },
  { kind: "hyperv", hosts: ["windows"], tier: "preview", requiredAssets: ["hyperv-vhdx"], requiredFeatures: ["hyper-v"] },
  { kind: "apple_virtualization", hosts: ["macos"], tier: "preview", requiredAssets: ["apple-helper", "apple-guest-image"], requiredFeatures: ["virtualization-framework", "signed-helper"] },
];

export function sandboxBackendReleasePolicy(kind: SandboxFleetBackend["kind"]): SandboxBackendReleasePolicy | undefined { return SANDBOX_RELEASE_MATRIX.find((entry) => entry.kind === kind); }
export function canShipSandboxBackend(kind: SandboxFleetBackend["kind"], certified: boolean): boolean { const policy = sandboxBackendReleasePolicy(kind); return Boolean(policy && policy.tier === "stable" && certified); }
