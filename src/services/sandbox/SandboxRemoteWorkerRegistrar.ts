import type { SandboxFleetBackend, SandboxRemoteWorkerDescriptor } from "../../types/sandboxFleet";
import type { SandboxFleetRegistry } from "./SandboxFleetRegistry";

export class SandboxRemoteWorkerRegistrar {
  constructor(private readonly registry: SandboxFleetRegistry) {}

  register(descriptor: SandboxRemoteWorkerDescriptor): SandboxFleetBackend {
    const workerId = descriptor.workerId.trim();
    if (!workerId) throw new Error("Sandbox remote worker id is required.");
    if (descriptor.capacity <= 0) throw new Error("Sandbox remote worker capacity must be positive.");
    if (descriptor.trust === "unverified") throw new Error("Unverified sandbox workers cannot be registered.");
    if (descriptor.guestOs.includes("macos") && !descriptor.appleHardware) {
      throw new Error("macOS sandbox workers must attest Apple hardware.");
    }
    if (descriptor.images.some((image) => image.guestOs === "macos") && descriptor.hostPlatform !== "macos") {
      throw new Error("macOS sandbox images must run on a macOS host platform.");
    }

    const backend: SandboxFleetBackend = {
      backendId: `worker:${workerId}`,
      kind: "remote",
      hostId: descriptor.hostId,
      hostPlatform: descriptor.hostPlatform,
      locality: descriptor.locality,
      isolationTier: descriptor.isolationTier,
      guestOs: [...descriptor.guestOs],
      images: descriptor.images.map((image) => ({ ...image })),
      capabilities: [...descriptor.capabilities],
      available: true,
      capacity: descriptor.capacity,
      activeSessions: 0,
      appleHardware: descriptor.appleHardware,
      trust: descriptor.trust,
    };

    this.registry.register(backend);
    return structuredClone(backend);
  }
}

